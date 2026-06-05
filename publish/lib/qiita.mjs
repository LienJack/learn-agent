import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
	asArray,
	contentTypeFor,
	defaultCachePath,
	escapeRegExp,
	findMarkdownImageRefs,
	hashFile,
	isLocalImageRef,
	publishRoot,
	readJson,
	resolveLocalImage,
	validateLocalImageFiles,
	validateRequiredFields,
	writeJson,
} from './common.mjs';

const qiitaIndexPath = path.join(publishRoot, 'qiita-items.json');

export function inspectQiitaArticle(article, options = {}) {
	const imageRefs = findMarkdownImageRefs(article.body);
	const localImageRefs = imageRefs.filter((ref) => isLocalImageRef(ref.url));
	const requestedTags = requestedQiitaTags(article);
	const tags = qiitaTags(article);
	const itemId = options.itemId || qiitaItemId(article);
	const blockers = [
		...validateRequiredFields(article, ['title', 'description']),
		...validateLocalImageFiles(article, imageRefs),
	];
	const warnings = [];

	if (!qiitaAccessToken()) {
		blockers.push('Missing QIITA_ACCESS_TOKEN or QIITA_TOKEN.');
	}
	if (!article.body.trim()) {
		blockers.push(`${article.sourceRelPath}: body is empty.`);
	}
	if (tags.length === 0) {
		blockers.push(`${article.sourceRelPath}: missing frontmatter tags or qiita_tags.`);
	}
	if (tags.length > 5) {
		blockers.push(`${article.sourceRelPath}: Qiita publish requires no more than 5 tags.`);
	}
	if (localImageRefs.length > 0 && qiitaImagePublishMode() === 'off') {
		blockers.push(
			'Local images need public URLs. Set QIITA_IMAGE_BASE_URL, PUBLISH_IMAGE_BASE_URL, or PUBLISH_IMAGE_UPLOAD_COMMAND.',
		);
	}
	if (!itemId) {
		warnings.push(`${article.sourceRelPath}: no qiita_id found; publish will create a new Qiita item.`);
	}
	const normalizedTagPairs = requestedTags
		.map((tag, index) => [tag, tags[index]])
		.filter(([requested, normalized]) => requested && normalized && requested !== normalized);
	if (normalizedTagPairs.length > 0) {
		const summary = normalizedTagPairs.map(([requested, normalized]) => `${JSON.stringify(requested)} -> ${JSON.stringify(normalized)}`).join(', ');
		warnings.push(`${article.sourceRelPath}: normalized Qiita tags for API safety: ${summary}.`);
	}

	return {
		blockers,
		warnings,
		imageRefs,
		localImageRefs,
		tags,
		itemId,
		imageMode: qiitaImagePublishMode(),
		needsRemoteImageWork: localImageRefs.length > 0,
		visibility: options.private === false ? 'public' : 'private',
		commands: qiitaCommandPlan(article),
		acceptance: {
			platform: 'qiita',
			published: false,
			url: '',
			itemId: itemId || '',
			private: options.private !== false,
			title: article.data.title || '',
			localImageCount: localImageRefs.length,
			imageUploadFailures: [],
			confirmedPublishAfterUserApproval: false,
		},
	};
}

export async function prepareQiitaArticle(article, outputDir, options = {}) {
	let body = article.body.trimEnd();
	const replacements = new Map();

	for (const imageRef of findMarkdownImageRefs(body)) {
		if (!isLocalImageRef(imageRef.url)) continue;
		const localPath = resolveLocalImage(article, imageRef.url);
		if (!existsSync(localPath)) {
			throw new Error(`Image not found: ${imageRef.url} resolved to ${localPath}`);
		}
		replacements.set(imageRef.url, await publicUrlFor(localPath, imageRef.url));
	}

	for (const [from, to] of replacements) {
		body = replaceMarkdownImageUrl(body, from, to);
	}

	const baseName = path.basename(article.sourcePath, path.extname(article.sourcePath));
	const bodyPath = path.join(outputDir, `${baseName}.qiita.md`);
	const payloadPath = path.join(outputDir, `${baseName}.qiita.json`);
	const payload = qiitaPayload(article, body, options);

	writeFileSync(bodyPath, `${body}\n`);
	writeJson(payloadPath, payload);
	return {
		bodyPath,
		payloadPath,
		payload,
		replacements: [...replacements.entries()].map(([from, to]) => ({ from, to })),
	};
}

export async function publishQiita(payload, itemId = '') {
	const method = itemId ? 'PATCH' : 'POST';
	const endpoint = itemId ? `/api/v2/items/${encodeURIComponent(itemId)}` : '/api/v2/items';
	const response = await fetch(`${qiitaApiBase()}${endpoint}`, {
		method,
		headers: {
			Authorization: `Bearer ${qiitaAccessToken()}`,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: JSON.stringify(payload),
	});
	const text = await response.text();
	let body;
	try {
		body = text ? JSON.parse(text) : {};
	} catch {
		body = { message: text };
	}
	if (!response.ok) {
		const message = body?.message || text || response.statusText;
		throw new Error(`Qiita API ${method} ${endpoint} failed: ${response.status} ${message}`);
	}
	return body;
}

export function updateQiitaIndex(article, result) {
	if (!result?.id) return;
	const index = readJson(qiitaIndexPath, {});
	index[article.sourceRelPath] = {
		id: result.id,
		url: result.url || '',
		title: result.title || article.data.title || '',
		updatedAt: new Date().toISOString(),
	};
	writeJson(qiitaIndexPath, index);
}

export function qiitaItemId(article) {
	return (
		article.data.qiita_id ||
		article.data.qiitaItemId ||
		readJson(qiitaIndexPath, {})[article.sourceRelPath]?.id ||
		''
	);
}

export function qiitaTags(article) {
	const normalized = requestedQiitaTags(article)
		.map((tag) => normalizeQiitaTag(tag))
		.filter(Boolean);
	return [...new Set(normalized)];
}

function qiitaPayload(article, body, options) {
	const payload = {
		body,
		private: options.private !== false,
		tags: qiitaTags(article).map((name) => ({ name, versions: [] })),
		title: String(article.data.qiita_title || article.data.title),
		tweet: Boolean(options.tweet || article.data.qiita_tweet),
	};

	addOptionalPayloadValue(payload, 'coediting', article.data.qiita_coediting);
	addOptionalPayloadValue(payload, 'group_url_name', article.data.qiita_group_url_name || process.env.QIITA_GROUP_URL_NAME);
	addOptionalPayloadValue(
		payload,
		'organization_url_name',
		article.data.qiita_organization_url_name || process.env.QIITA_ORGANIZATION_URL_NAME,
	);
	addOptionalPayloadValue(payload, 'slide', article.data.qiita_slide);
	return payload;
}

function addOptionalPayloadValue(payload, key, value) {
	if (value === undefined || value === '') return;
	payload[key] = value;
}

function qiitaCommandPlan(article) {
	return {
		check: [`publish/bin/publish-qiita --dry-run ${JSON.stringify(article.sourceRelPath)}`],
		publishPrivate: [`publish/bin/publish-qiita --yes ${JSON.stringify(article.sourceRelPath)}`],
		publishPublic: [`publish/bin/publish-qiita --public --yes ${JSON.stringify(article.sourceRelPath)}`],
		update: [`publish/bin/publish-qiita --item-id <qiita_item_id> --yes ${JSON.stringify(article.sourceRelPath)}`],
	};
}

function requestedQiitaTags(article) {
	return (asArray(article.data.qiita_tags).length > 0 ? asArray(article.data.qiita_tags) : asArray(article.data.tags))
		.map((tag) => String(tag).trim())
		.filter(Boolean);
}

function normalizeQiitaTag(tag) {
	return String(tag).trim().replace(/[\s\u3000]+/g, '');
}

async function publicUrlFor(localPath, sourceRef) {
	const mode = qiitaImagePublishMode();
	if (mode === 'off') {
		throw new Error(`Local image ${sourceRef} needs a public URL before publishing to Qiita.`);
	}

	const cachePath = process.env.PUBLISH_IMAGE_CACHE
		? path.resolve(process.env.PUBLISH_IMAGE_CACHE)
		: defaultCachePath('qiita-images.json');
	const cache = readJson(cachePath, {});
	const key = `${mode}:${uploaderFingerprint(mode)}:${hashFile(localPath)}:${path.basename(localPath)}`;
	if (cache[key]) return cache[key];

	const url = mode === 'command' ? uploadWithCommand(localPath, sourceRef) : rewriteWithBaseUrl(sourceRef);
	cache[key] = url;
	writeJson(cachePath, cache);
	return url;
}

function replaceMarkdownImageUrl(source, from, to) {
	const escaped = escapeRegExp(from);
	return source.replace(new RegExp(`(!\\[[^\\]]*\\]\\()${escaped}((?:\\s+['"][^'"]*['"])?\\))`, 'g'), `$1${to}$2`);
}

function uploadWithCommand(localPath, sourceRef) {
	const output = execFileSync('/bin/sh', ['-c', process.env.PUBLISH_IMAGE_UPLOAD_COMMAND], {
		encoding: 'utf8',
		env: {
			...process.env,
			PUBLISH_IMAGE_FILE: localPath,
			PUBLISH_IMAGE_HASH: hashFile(localPath),
			PUBLISH_IMAGE_SOURCE: sourceRef,
			PUBLISH_IMAGE_CONTENT_TYPE: contentTypeFor(localPath),
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
	const base = process.env.QIITA_IMAGE_BASE_URL || process.env.PUBLISH_IMAGE_BASE_URL;
	const normalizedBase = base.endsWith('/') ? base : `${base}/`;
	const cleanRef = sourceRef.replace(/^\.\//, '');
	return new URL(cleanRef.split('/').map(encodeURIComponent).join('/'), normalizedBase).toString();
}

function qiitaImagePublishMode() {
	if (process.env.QIITA_IMAGE_BASE_URL || process.env.PUBLISH_IMAGE_BASE_URL) return 'base-url';
	if (process.env.PUBLISH_IMAGE_UPLOAD_COMMAND) return 'command';
	return 'off';
}

function uploaderFingerprint(mode) {
	if (mode === 'command') return hashString(process.env.PUBLISH_IMAGE_UPLOAD_COMMAND || '').slice(0, 16);
	if (mode === 'base-url') return hashString(process.env.QIITA_IMAGE_BASE_URL || process.env.PUBLISH_IMAGE_BASE_URL || '').slice(0, 16);
	return 'none';
}

function hashString(value) {
	return createHash('sha256').update(value).digest('hex');
}

function qiitaAccessToken() {
	return process.env.QIITA_ACCESS_TOKEN || process.env.QIITA_TOKEN || '';
}

function qiitaApiBase() {
	return process.env.QIITA_API_BASE_URL || 'https://qiita.com';
}
