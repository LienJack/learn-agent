#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const checkOnly = args.includes('--check-only');
const [inputFile, outputFile] = args.filter((arg) => arg !== '--check-only');

if (!inputFile || (!outputFile && !checkOnly)) {
	console.error('Usage: scripts/prepare-crosspost-assets.mjs [--check-only] <input.md> <output.md>');
	process.exit(2);
}

const articlePath = path.resolve(inputFile);
const articleDir = path.dirname(articlePath);
const cachePath = process.env.PUBLISH_IMAGE_CACHE
	? path.resolve(process.env.PUBLISH_IMAGE_CACHE)
	: path.join(homedir(), '.cache', 'learn-agent-publish', 'devto-images.json');

const cache = readJson(cachePath, {});
const uploadCookie = process.env.DEVTO_IMAGE_UPLOAD_COOKIE || process.env.DEVTO_COOKIE || '';
const uploadCommand = process.env.PUBLISH_IMAGE_UPLOAD_COMMAND || '';
const baseUrl = process.env.PUBLISH_IMAGE_BASE_URL || '';
const mode = process.env.PUBLISH_IMAGE_MODE || (uploadCookie ? 'devto' : uploadCommand ? 'command' : baseUrl ? 'base-url' : 'off');

let markdown = readFileSync(articlePath, 'utf8');
const replacements = new Map();

for (const imageRef of findMarkdownImageRefs(markdown)) {
	if (!isLocalImageRef(imageRef.url)) continue;
	const localPath = resolveLocalImage(articleDir, imageRef.url);
	if (!existsSync(localPath)) {
		throw new Error(`Image not found: ${imageRef.url} resolved to ${localPath}`);
	}
	if (checkOnly) continue;
	replacements.set(imageRef.url, await publicUrlFor(localPath, imageRef.url));
}

const heroImage = findFrontmatterValue(markdown, 'heroImage');
const hasCoverImage = /^\s*cover_image\s*:/m.test(frontmatterBlock(markdown));
if (!checkOnly && heroImage && !hasCoverImage && isLocalImageRef(heroImage)) {
	const localPath = resolveLocalImage(articleDir, heroImage);
	if (existsSync(localPath)) {
		const coverUrl = await publicUrlFor(localPath, heroImage);
		markdown = addFrontmatterValue(markdown, 'cover_image', coverUrl, 'heroImage');
	}
}

for (const [from, to] of replacements) {
	markdown = replaceMarkdownImageUrl(markdown, from, to);
}

if (!checkOnly) {
	writeFileSync(outputFile, markdown);
	writeJson(cachePath, cache);
}

function findMarkdownImageRefs(source) {
	const refs = [];
	const imagePattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+['"][^'"]*['"])?\)/g;
	let match;
	while ((match = imagePattern.exec(source))) {
		refs.push({ alt: match[1], url: match[2] });
	}
	return refs;
}

function replaceMarkdownImageUrl(source, from, to) {
	const escaped = escapeRegExp(from);
	return source.replace(new RegExp(`(!\\[[^\\]]*\\]\\()${escaped}((?:\\s+['"][^'"]*['"])?\\))`, 'g'), `$1${to}$2`);
}

function isLocalImageRef(value) {
	return value && !/^(?:https?:)?\/\//i.test(value) && !/^(?:data|mailto):/i.test(value) && !value.startsWith('/');
}

function resolveLocalImage(baseDir, rawUrl) {
	const withoutHash = rawUrl.split('#')[0].split('?')[0];
	return path.resolve(baseDir, decodeURIComponent(withoutHash));
}

async function publicUrlFor(localPath, sourceRef) {
	const file = readFileSync(localPath);
	const hash = createHash('sha256').update(file).digest('hex');
	if (mode === 'off') {
		return failNoUploader(sourceRef);
	}

	const key = `${mode}:${uploaderFingerprint()}:${hash}:${path.basename(localPath)}`;
	if (cache[key]) {
		return cache[key];
	}

	const url =
		mode === 'devto' ? await uploadToDevTo(localPath)
		: mode === 'command' ? uploadWithCommand(localPath, hash, sourceRef)
		: mode === 'base-url' ? rewriteWithBaseUrl(sourceRef)
		: failNoUploader(sourceRef);

	cache[key] = url;
	return url;
}

function uploaderFingerprint() {
	if (mode === 'devto') return 'devto';
	if (mode === 'command') return createHash('sha256').update(uploadCommand).digest('hex').slice(0, 16);
	if (mode === 'base-url') return createHash('sha256').update(baseUrl).digest('hex').slice(0, 16);
	return 'none';
}

async function uploadToDevTo(localPath) {
	if (!uploadCookie) {
		throw new Error('DEVTO_IMAGE_UPLOAD_COOKIE is required for PUBLISH_IMAGE_MODE=devto.');
	}

	const csrfToken = process.env.DEVTO_IMAGE_UPLOAD_CSRF_TOKEN || await fetchDevToCsrfToken();
	const file = new File([readFileSync(localPath)], path.basename(localPath), { type: contentTypeFor(localPath) });
	const form = new FormData();
	form.set('authenticity_token', csrfToken);
	form.set('image', file);

	const response = await fetch('https://dev.to/image_uploads', {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			Cookie: uploadCookie,
			Origin: 'https://dev.to',
			Referer: 'https://dev.to/new',
			'X-CSRF-Token': csrfToken,
			'X-Requested-With': 'XMLHttpRequest',
		},
		body: form,
	});

	const body = await response.text();
	if (!response.ok) {
		throw new Error(`DEV image upload failed for ${localPath}: ${response.status} ${body}`);
	}

	const url = extractFirstUrl(body);
	if (!url) {
		throw new Error(`DEV image upload response did not include a URL for ${localPath}: ${body}`);
	}
	return url;
}

async function fetchDevToCsrfToken() {
	const baseData = await fetch('https://dev.to/async_info/base_data', {
		headers: {
			Cookie: uploadCookie,
			Accept: 'application/json',
		},
	});
	if (baseData.ok) {
		const payload = await baseData.json();
		if (payload?.token) return payload.token;
	}

	const response = await fetch('https://dev.to/new', {
		headers: {
			Cookie: uploadCookie,
			Accept: 'text/html',
		},
	});
	const html = await response.text();
	const token = html.match(/<meta\s+name=["']csrf-token["']\s+content=["']([^"']+)["']/i)?.[1];
	if (!token) {
		throw new Error('Could not discover DEV CSRF token. Set DEVTO_IMAGE_UPLOAD_CSRF_TOKEN explicitly.');
	}
	return token;
}

function uploadWithCommand(localPath, hash, sourceRef) {
	const output = execFileSync('/bin/sh', ['-c', uploadCommand], {
		encoding: 'utf8',
		env: {
			...process.env,
			PUBLISH_IMAGE_FILE: localPath,
			PUBLISH_IMAGE_HASH: hash,
			PUBLISH_IMAGE_SOURCE: sourceRef,
		},
		stdio: ['ignore', 'pipe', 'inherit'],
	}).trim();
	const url = output.split(/\r?\n/).find((line) => /^https?:\/\//.test(line.trim()))?.trim();
	if (!url) {
		throw new Error(`PUBLISH_IMAGE_UPLOAD_COMMAND did not print an image URL for ${localPath}.`);
	}
	return url;
}

function rewriteWithBaseUrl(sourceRef) {
	const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
	const cleanRef = sourceRef.replace(/^\.\//, '');
	return new URL(cleanRef.split('/').map(encodeURIComponent).join('/'), normalizedBase).toString();
}

function failNoUploader(sourceRef) {
	throw new Error(
		`Local image ${sourceRef} needs a public URL before cross-posting. ` +
		'Set DEVTO_IMAGE_UPLOAD_COOKIE for DEV uploads, PUBLISH_IMAGE_UPLOAD_COMMAND for a custom uploader, ' +
		'or PUBLISH_IMAGE_BASE_URL for an already-hosted asset directory.',
	);
}

function frontmatterBlock(source) {
	return source.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
}

function findFrontmatterValue(source, key) {
	const block = frontmatterBlock(source);
	const match = block.match(new RegExp(`^${escapeRegExp(key)}:\\s*['"]?([^'"\\n]+)['"]?\\s*$`, 'm'));
	return match?.[1]?.trim();
}

function addFrontmatterValue(source, key, value, afterKey) {
	const lines = source.split('\n');
	const end = lines.findIndex((line, index) => index > 0 && line === '---');
	if (end < 0 || lines.slice(1, end).some((line) => line.startsWith(`${key}:`))) {
		return source;
	}

	const afterIndex = lines.findIndex((line, index) => index > 0 && index < end && line.startsWith(`${afterKey}:`));
	const insertAt = afterIndex >= 0 ? afterIndex + 1 : end;
	lines.splice(insertAt, 0, `${key}: '${value.replace(/'/g, "''")}'`);
	return lines.join('\n');
}

function contentTypeFor(filePath) {
	const ext = path.extname(filePath).toLowerCase();
	if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
	if (ext === '.png') return 'image/png';
	if (ext === '.gif') return 'image/gif';
	if (ext === '.webp') return 'image/webp';
	if (ext === '.svg') return 'image/svg+xml';
	return 'application/octet-stream';
}

function extractFirstUrl(body) {
	try {
		const parsed = JSON.parse(body);
		const urls = [];
		collectUrls(parsed, urls);
		return urls[0];
	} catch {
		return body.match(/https:\/\/[^"'\s)]+/)?.[0];
	}
}

function collectUrls(value, urls) {
	if (typeof value === 'string' && /^https?:\/\//.test(value)) {
		urls.push(value);
		return;
	}
	if (Array.isArray(value)) {
		for (const item of value) collectUrls(item, urls);
		return;
	}
	if (value && typeof value === 'object') {
		for (const item of Object.values(value)) collectUrls(item, urls);
	}
}

function readJson(filePath, fallback) {
	try {
		return JSON.parse(readFileSync(filePath, 'utf8'));
	} catch {
		return fallback;
	}
}

function writeJson(filePath, value) {
	mkdirSync(path.dirname(filePath), { recursive: true });
	writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
