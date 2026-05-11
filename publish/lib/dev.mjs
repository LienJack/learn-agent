import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
	asArray,
	contentTypeFor,
	defaultCachePath,
	escapeRegExp,
	findMarkdownImageRefs,
	hashFile,
	isLocalImageRef,
	readJson,
	resolveLocalImage,
	validateLocalImageFiles,
	validateRequiredFields,
	writeJson,
} from './common.mjs';

export function inspectDevArticle(article) {
	const imageRefs = findMarkdownImageRefs(article.raw);
	const tags = asArray(article.data.tags).map((tag) => String(tag).trim()).filter(Boolean);
	const localImageRefs = imageRefs.filter((ref) => isLocalImageRef(ref.url));
	const heroImageIsLocal = isLocalImageRef(article.data.heroImage || '');
	const blockers = [
		...validateRequiredFields(article, ['title', 'description']),
		...validateLocalImageFiles(article, imageRefs),
	];
	const warnings = [];
	if (!process.env.CRIER_DEVTO_API_KEY && !process.env.DEVTO_API_KEY) {
		blockers.push('Missing CRIER_DEVTO_API_KEY or DEVTO_API_KEY.');
	}
	if (localImageRefs.length > 0 || heroImageIsLocal) {
		const imageMode = imagePublishMode();
		if (imageMode === 'off') {
			blockers.push(
				'Local images need a public URL. Set DEVTO_IMAGE_UPLOAD_COOKIE, PUBLISH_IMAGE_UPLOAD_COMMAND, or PUBLISH_IMAGE_BASE_URL.',
			);
		}
	}
	if (tags.length === 0) {
		warnings.push(`${article.sourceRelPath}: tags are missing; DEV discovery is better with 1-4 tags.`);
	} else if (tags.length > 4) {
		warnings.push(`${article.sourceRelPath}: DEV effectively supports up to 4 core tags; keep the most important tags first.`);
	}
	if (!article.data.canonical_url && !article.data.canonicalUrl) {
		warnings.push(`${article.sourceRelPath}: canonical_url is recommended before public DEV publishing.`);
	}
	if (article.data.heroImage && heroImageIsLocal && !article.frontmatter.match(/^\s*cover_image\s*:/m)) {
		warnings.push(`${article.sourceRelPath}: local heroImage will be converted to cover_image in the DEV publish copy only.`);
	}
	return {
		blockers,
		warnings,
		imageRefs,
		localImageRefs,
		tags,
		canonicalUrl: article.data.canonical_url || article.data.canonicalUrl || '',
		imageMode: imagePublishMode(),
		needsRemoteImageWork: localImageRefs.length > 0 || heroImageIsLocal,
		commands: devCommandPlan(article),
		acceptance: {
			platform: 'dev',
			published: false,
			url: '',
			title: article.data.title || '',
			canonicalUrl: article.data.canonical_url || article.data.canonicalUrl || '',
			localImageCount: localImageRefs.length,
			imageUploadFailures: [],
			confirmedPublicPublishAfterUserApproval: false,
		},
	};
}

function devCommandPlan(article) {
	return {
		setup: ['uvx --from "crier==${CRIER_VERSION:-2.0.2}" crier doctor'],
		check: [`publish/bin/publish-en --dry-run ${JSON.stringify(article.sourceRelPath)}`],
		publish: [`publish/bin/publish-en --yes ${JSON.stringify(article.sourceRelPath)}`],
		status: ['uvx --from "crier==${CRIER_VERSION:-2.0.2}" crier status ' + JSON.stringify(article.sourceRelPath)],
		badImageRepair: [
			'Regenerate a DEV publish copy with public image URLs.',
			'Use DEV API PUT /api/articles/<article-id> with body_markdown from the prepared copy.',
			'Verify the updated article has no ./assets references and has expected dev-to-uploads image URLs.',
		],
	};
}

export async function prepareDevArticle(article, outputPath) {
	let markdown = article.raw;
	const replacements = new Map();

	for (const imageRef of findMarkdownImageRefs(markdown)) {
		if (!isLocalImageRef(imageRef.url)) continue;
		const localPath = resolveLocalImage(article, imageRef.url);
		if (!existsSync(localPath)) {
			throw new Error(`Image not found: ${imageRef.url} resolved to ${localPath}`);
		}
		replacements.set(imageRef.url, await publicUrlFor(localPath, imageRef.url));
	}

	const heroImage = article.data.heroImage;
	const hasCoverImage = /^\s*cover_image\s*:/m.test(article.frontmatter);
	if (heroImage && !hasCoverImage && isLocalImageRef(heroImage)) {
		const localPath = resolveLocalImage(article, heroImage);
		if (existsSync(localPath)) {
			const coverUrl = await publicUrlFor(localPath, heroImage);
			markdown = addFrontmatterValue(markdown, 'cover_image', coverUrl, 'heroImage');
		}
	}

	for (const [from, to] of replacements) {
		markdown = replaceMarkdownImageUrl(markdown, from, to);
	}

	writeFileSync(outputPath, markdown);
	return {
		path: outputPath,
		replacements: [...replacements.entries()].map(([from, to]) => ({ from, to })),
	};
}

export function publishDev(preparedPath) {
	const apiKey = process.env.CRIER_DEVTO_API_KEY || process.env.DEVTO_API_KEY;
	const crierVersion = process.env.CRIER_VERSION || '2.0.2';
	const env = { ...process.env, CRIER_DEVTO_API_KEY: apiKey };
	execFileSync('uvx', ['--from', `crier==${crierVersion}`, 'crier', 'publish', preparedPath, '--to', 'devto', '--no-check', '--yes'], {
		encoding: 'utf8',
		env,
		stdio: 'inherit',
	});
}

function replaceMarkdownImageUrl(source, from, to) {
	const escaped = escapeRegExp(from);
	return source.replace(new RegExp(`(!\\[[^\\]]*\\]\\()${escaped}((?:\\s+['"][^'"]*['"])?\\))`, 'g'), `$1${to}$2`);
}

function addFrontmatterValue(source, key, value, afterKey) {
	const lines = source.split('\n');
	const end = lines.findIndex((line, index) => index > 0 && line === '---');
	if (end < 0 || lines.slice(1, end).some((line) => line.startsWith(`${key}:`))) {
		return source;
	}

	const afterIndex = lines.findIndex((line, index) => index > 0 && index < end && line.startsWith(`${afterKey}:`));
	const insertAt = afterIndex >= 0 ? afterIndex + 1 : end;
	lines.splice(insertAt, 0, `${key}: '${String(value).replace(/'/g, "''")}'`);
	return lines.join('\n');
}

async function publicUrlFor(localPath, sourceRef) {
	const mode = imagePublishMode();
	if (mode === 'off') {
		throw new Error(`Local image ${sourceRef} needs a public URL before publishing to DEV.`);
	}

	const cachePath = process.env.PUBLISH_IMAGE_CACHE
		? path.resolve(process.env.PUBLISH_IMAGE_CACHE)
		: defaultCachePath('devto-images.json');
	const cache = readJson(cachePath, {});
	const key = `${mode}:${uploaderFingerprint(mode)}:${hashFile(localPath)}:${path.basename(localPath)}`;
	if (cache[key]) return cache[key];

	const url =
		mode === 'devto' ? await uploadToDevTo(localPath)
		: mode === 'command' ? uploadWithCommand(localPath, sourceRef)
		: rewriteWithBaseUrl(sourceRef);
	cache[key] = url;
	writeJson(cachePath, cache);
	return url;
}

function imagePublishMode() {
	if (process.env.PUBLISH_IMAGE_MODE) return process.env.PUBLISH_IMAGE_MODE;
	if (process.env.DEVTO_IMAGE_UPLOAD_COOKIE || process.env.DEVTO_COOKIE) return 'devto';
	if (process.env.PUBLISH_IMAGE_UPLOAD_COMMAND) return 'command';
	if (process.env.PUBLISH_IMAGE_BASE_URL) return 'base-url';
	return 'off';
}

function uploaderFingerprint(mode) {
	if (mode === 'devto') return 'devto';
	if (mode === 'command') return hashString(process.env.PUBLISH_IMAGE_UPLOAD_COMMAND || '').slice(0, 16);
	if (mode === 'base-url') return hashString(process.env.PUBLISH_IMAGE_BASE_URL || '').slice(0, 16);
	return 'none';
}

function hashString(value) {
	return createHash('sha256').update(value).digest('hex');
}

async function uploadToDevTo(localPath) {
	const uploadCookie = process.env.DEVTO_IMAGE_UPLOAD_COOKIE || process.env.DEVTO_COOKIE || '';
	if (!uploadCookie) {
		throw new Error('DEVTO_IMAGE_UPLOAD_COOKIE is required for PUBLISH_IMAGE_MODE=devto.');
	}

	const csrfToken = process.env.DEVTO_IMAGE_UPLOAD_CSRF_TOKEN || await fetchDevToCsrfToken(uploadCookie);
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

async function fetchDevToCsrfToken(uploadCookie) {
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

function uploadWithCommand(localPath, sourceRef) {
	const uploadCommand = process.env.PUBLISH_IMAGE_UPLOAD_COMMAND || '';
	const output = execFileSync('/bin/sh', ['-c', uploadCommand], {
		encoding: 'utf8',
		env: {
			...process.env,
			PUBLISH_IMAGE_FILE: localPath,
			PUBLISH_IMAGE_HASH: hashFile(localPath),
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
	const normalizedBase = process.env.PUBLISH_IMAGE_BASE_URL.endsWith('/') ? process.env.PUBLISH_IMAGE_BASE_URL : `${process.env.PUBLISH_IMAGE_BASE_URL}/`;
	const cleanRef = sourceRef.replace(/^\.\//, '');
	return new URL(cleanRef.split('/').map(encodeURIComponent).join('/'), normalizedBase).toString();
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
