#!/usr/bin/env node
import { createHash } from 'node:crypto';
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const command = process.argv[2] || 'help';
const files = process.argv.slice(3);
const zennImageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const zennMaxImageBytes = 3 * 1024 * 1024;

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

function main() {
	if (command === 'help' || command === '-h' || command === '--help') {
		usage();
		return;
	}

	requireFiles(files);

	switch (command) {
		case 'check':
			for (const file of files) checkArticle(file);
			break;
		case 'draft':
		case 'zenn-draft':
			for (const file of files) syncZenn(file, false);
			break;
		case 'publish':
		case 'zenn-publish':
			for (const file of files) syncZenn(file, true);
			break;
		default:
			throw new Error(`Unknown command: ${command}\nRun scripts/publish-zenn.sh help for usage.`);
	}
}

function usage() {
	console.log(`Usage:
  scripts/publish-zenn.sh check <article.md> [article-2.md ...]
  scripts/publish-zenn.sh draft <article.md> [article-2.md ...]
  scripts/publish-zenn.sh publish <article.md> [article-2.md ...]

Environment:
  ZENN_REPO_DIR                 Local Zenn GitHub-linked repository, default ./zenn
  ZENN_ARTICLES_DIR             Optional, default articles
  ZENN_IMAGES_DIR               Optional, default images
  ZENN_DEFAULT_TYPE             Optional, tech or idea, default tech
  ZENN_DEFAULT_EMOJI            Optional, default memo emoji
  ZENN_INCLUDE_HERO_IMAGE       Optional 1/true to insert heroImage at top of the generated Zenn body

Notes:
  - Zenn has no public write API. This writes Markdown and images into ZENN_REPO_DIR.
  - Publishing happens after you review, commit, and push the Zenn GitHub-linked repository.
  - Source Markdown files are never modified.`);
}

function requireFiles(inputFiles) {
	if (inputFiles.length === 0) {
		throw new Error('Missing markdown file path.');
	}
	for (const file of inputFiles) {
		if (!existsSync(path.resolve(repoRoot, file))) {
			throw new Error(`File not found: ${file}`);
		}
	}
}

function checkArticle(file) {
	const article = readArticle(file);
	const imageRefs = collectPublishImageRefs(article, includeHeroImage());
	validateRequiredFields(article);
	validateLocalImageFiles(article, imageRefs);
	validateZennImages(article, imageRefs);
	console.log(`OK: ${file}`);
}

function readArticle(file) {
	const sourcePath = path.resolve(repoRoot, file);
	const raw = readFileSync(sourcePath, 'utf8');
	const parsed = parseFrontmatter(raw);
	return {
		sourcePath,
		sourceRelPath: path.relative(repoRoot, sourcePath),
		sourceDir: path.dirname(sourcePath),
		body: parsed.body,
		data: parseSimpleYaml(parsed.frontmatter),
	};
}

function parseFrontmatter(source) {
	const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
	if (!match) {
		throw new Error('Missing YAML frontmatter.');
	}
	return {
		frontmatter: match[1],
		body: source.slice(match[0].length),
	};
}

function parseSimpleYaml(source) {
	const result = {};
	const lines = source.split(/\r?\n/);
	let currentArrayKey = '';

	for (const line of lines) {
		if (!line.trim()) continue;
		const arrayMatch = line.match(/^\s*-\s+(.+)$/);
		if (arrayMatch && currentArrayKey) {
			result[currentArrayKey].push(unquote(arrayMatch[1].trim()));
			continue;
		}

		currentArrayKey = '';
		const pair = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
		if (!pair) continue;

		const key = pair[1];
		const rawValue = pair[2] ?? '';
		if (rawValue.trim() === '') {
			result[key] = [];
			currentArrayKey = key;
			continue;
		}
		result[key] = parseScalar(rawValue.trim());
	}

	return result;
}

function parseScalar(value) {
	if (value === 'true') return true;
	if (value === 'false') return false;
	if (/^\[(.*)\]$/.test(value)) {
		const inner = value.slice(1, -1).trim();
		if (!inner) return [];
		return inner.split(',').map((item) => unquote(item.trim()));
	}
	return unquote(value);
}

function unquote(value) {
	const trimmed = value.trim();
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
}

function validateRequiredFields(article) {
	if (!article.data.title) throw new Error(`${article.sourceRelPath}: missing frontmatter title.`);
	if (!article.data.description) throw new Error(`${article.sourceRelPath}: missing frontmatter description.`);
	if (normalizedTags(article).length === 0) throw new Error(`${article.sourceRelPath}: missing frontmatter tags.`);
}

function collectPublishImageRefs(article, withHeroImage) {
	const refs = findMarkdownImageRefs(article.body);
	if (withHeroImage && article.data.heroImage && !refs.some((ref) => ref.url === article.data.heroImage)) {
		refs.unshift({ alt: article.data.title || 'cover', url: String(article.data.heroImage) });
	}
	return refs;
}

function findMarkdownImageRefs(source) {
	const refs = [];
	let inFence = false;

	for (const line of source.split(/\r?\n/)) {
		if (/^\s*(```|~~~)/.test(line)) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;

		const imagePattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+['"][^'"]*['"])?\)/g;
		let match;
		while ((match = imagePattern.exec(line))) {
			refs.push({ alt: match[1], url: match[2] });
		}
	}

	return refs;
}

function validateLocalImageFiles(article, imageRefs) {
	for (const ref of imageRefs) {
		if (!isLocalImageRef(ref.url)) continue;
		const localPath = resolveLocalImage(article, ref.url);
		if (!existsSync(localPath)) {
			throw new Error(`${article.sourceRelPath}: image not found: ${ref.url} resolved to ${localPath}`);
		}
	}
}

function validateZennImages(article, imageRefs) {
	for (const ref of imageRefs) {
		if (!isLocalImageRef(ref.url)) continue;
		const localPath = resolveLocalImage(article, ref.url);
		validateZennImageFile(article, ref.url, localPath);
	}
}

function syncZenn(file, published) {
	const article = readArticle(file);
	validateRequiredFields(article);

	const zennRepo = path.resolve(repoRoot, process.env.ZENN_REPO_DIR || './zenn');
	if (!existsSync(zennRepo)) throw new Error(`ZENN_REPO_DIR does not exist: ${zennRepo}`);

	const slug = articleSlug(article);
	const articleDir = path.join(zennRepo, process.env.ZENN_ARTICLES_DIR || 'articles');
	const articlePath = path.join(articleDir, `${slug}.md`);
	const convertedBody = convertBodyImagesForZenn(article, slug, zennRepo, includeHeroImage());
	const zennMarkdown = [
		'---',
		`title: ${yamlString(article.data.title)}`,
		`emoji: ${yamlString(String(article.data.zenn_emoji || process.env.ZENN_DEFAULT_EMOJI || '\uD83D\uDCDD'))}`,
		`type: ${yamlString(String(article.data.zenn_type || process.env.ZENN_DEFAULT_TYPE || 'tech'))}`,
		`topics: [${zennTopics(article).map(yamlString).join(', ')}]`,
		`published: ${published ? 'true' : 'false'}`,
		'---',
		'',
		convertedBody.trimEnd(),
		'',
	].join('\n');

	mkdirSync(articleDir, { recursive: true });
	writeFileSync(articlePath, zennMarkdown);
	console.log(`Zenn ${published ? 'publish-ready' : 'draft'}: ${articlePath}`);
}

function convertBodyImagesForZenn(article, slug, zennRepo, withHeroImage) {
	const imageRefs = collectPublishImageRefs(article, withHeroImage);
	validateLocalImageFiles(article, imageRefs);
	validateZennImages(article, imageRefs);

	const imageMap = new Map();
	let body = article.body;

	if (withHeroImage && article.data.heroImage) {
		body = prependHeroImage(body, article.data.heroImage, article.data.title || 'cover');
	}

	for (const ref of findMarkdownImageRefs(body)) {
		if (!isLocalImageRef(ref.url)) continue;
		if (!imageMap.has(ref.url)) {
			imageMap.set(ref.url, copyZennImage(article, ref.url, slug, zennRepo));
		}
	}

	return replaceMarkdownImageUrls(body, imageMap);
}

function copyZennImage(article, sourceRef, slug, zennRepo) {
	const localPath = resolveLocalImage(article, sourceRef);
	validateZennImageFile(article, sourceRef, localPath);
	const file = readFileSync(localPath);
	const hash = createHash('sha256').update(file).digest('hex').slice(0, 12);
	const safeName = safeAssetName(path.basename(localPath));
	const targetRel = path.posix.join(process.env.ZENN_IMAGES_DIR || 'images', slug, `${hash}-${safeName}`);
	const targetPath = path.join(zennRepo, ...targetRel.split('/'));
	mkdirSync(path.dirname(targetPath), { recursive: true });
	copyFileSync(localPath, targetPath);
	return `/${targetRel}`;
}

function validateZennImageFile(article, sourceRef, localPath) {
	const ext = path.extname(localPath).toLowerCase();
	if (!zennImageExtensions.has(ext)) {
		throw new Error(
			`${article.sourceRelPath}: Zenn GitHub images do not support ${ext || 'extensionless'} files: ${sourceRef}. ` +
			'Use .png, .jpg, .jpeg, .gif, or .webp, or replace the image with a public URL.',
		);
	}
	const size = statSync(localPath).size;
	if (size > zennMaxImageBytes) {
		throw new Error(
			`${article.sourceRelPath}: Zenn image exceeds 3MB: ${sourceRef} (${formatBytes(size)}). ` +
			'Compress it before syncing to Zenn.',
		);
	}
}

function prependHeroImage(body, heroImage, title) {
	const heroLine = `![${escapeMarkdownAlt(String(title))}](${heroImage})`;
	if (body.includes(`](${heroImage})`)) return body;
	return `${heroLine}\n\n${body}`;
}

function replaceMarkdownImageUrls(source, imageMap) {
	let output = source;
	for (const [from, to] of imageMap) {
		const escaped = escapeRegExp(from);
		output = output.replace(
			new RegExp(`(!\\[[^\\]]*\\]\\()${escaped}((?:\\s+['"][^'"]*['"])?\\))`, 'g'),
			`$1${to}$2`,
		);
	}
	return output;
}

function articleSlug(article) {
	const explicit = article.data.zenn_slug || article.data.slug;
	const base = explicit || path.basename(article.sourcePath, path.extname(article.sourcePath));
	return safeSlug(String(base));
}

function zennTopics(article) {
	const values = asArray(article.data.zenn_topics).length > 0 ? asArray(article.data.zenn_topics) : normalizedTags(article);
	return values.map((tag) => String(tag).toLowerCase().replace(/[^0-9a-z]/g, '')).filter(Boolean).slice(0, 5);
}

function normalizedTags(article) {
	return asArray(article.data.tags).map((tag) => String(tag).trim()).filter(Boolean);
}

function asArray(value) {
	if (Array.isArray(value)) return value;
	if (value === undefined || value === null || value === '') return [];
	return [value];
}

function includeHeroImage() {
	return /^(1|true|yes)$/i.test(process.env.ZENN_INCLUDE_HERO_IMAGE || '');
}

function isLocalImageRef(value) {
	return value && !/^(?:https?:)?\/\//i.test(value) && !/^(?:data|mailto):/i.test(value);
}

function resolveLocalImage(article, rawUrl) {
	const withoutHash = rawUrl.split('#')[0].split('?')[0];
	if (withoutHash.startsWith('/')) {
		return path.resolve(repoRoot, 'public', decodeURIComponent(withoutHash.slice(1)));
	}
	return path.resolve(article.sourceDir, decodeURIComponent(withoutHash));
}

function safeSlug(value) {
	return value
		.normalize('NFKD')
		.toLowerCase()
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^0-9a-z_-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 50) || `article-${Date.now()}`;
}

function safeAssetName(value) {
	return value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^0-9A-Za-z._-]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'image';
}

function yamlString(value) {
	return JSON.stringify(String(value));
}

function escapeMarkdownAlt(value) {
	return value.replace(/[\[\]]/g, '');
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatBytes(bytes) {
	return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}
