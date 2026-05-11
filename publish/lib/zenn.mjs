import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
	asArray,
	copyFileWithDirs,
	escapeRegExp,
	fileSizeBytes,
	findMarkdownImageRefs,
	isLocalImageRef,
	normalizedTags,
	repoRoot,
	resolveLocalImage,
	safeAssetName,
	safeSlug,
	validateLocalImageFiles,
	validateRequiredFields,
	yamlString,
} from './common.mjs';

const zennImageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const zennMaxImageBytes = 3 * 1024 * 1024;

export function inspectZennArticle(article) {
	const imageRefs = collectPublishImageRefs(article, includeHeroImage());
	const blockers = [
		...validateRequiredFields(article, ['title', 'description']),
		...validateLocalImageFiles(article, imageRefs),
		...validateZennImages(article, imageRefs),
	];
	if (zennTopics(article).length === 0) {
		blockers.push(`${article.sourceRelPath}: missing frontmatter tags or zenn_topics.`);
	}
	const zennRepo = zennRepoDir();
	if (!existsSync(zennRepo)) {
		blockers.push(`ZENN_REPO_DIR does not exist: ${zennRepo}`);
	}
	return {
		blockers,
		imageRefs,
		zennRepo,
		slug: articleSlug(article),
		topics: zennTopics(article),
	};
}

export function prepareZennArticle(article, { published }) {
	const zennRepo = zennRepoDir();
	if (!existsSync(zennRepo)) throw new Error(`ZENN_REPO_DIR does not exist: ${zennRepo}`);

	const slug = articleSlug(article);
	const articleDir = path.join(zennRepo, process.env.ZENN_ARTICLES_DIR || 'articles');
	const articlePath = path.join(articleDir, `${slug}.md`);
	const converted = convertBodyImagesForZenn(article, slug, zennRepo, includeHeroImage());
	const zennMarkdown = [
		'---',
		`title: ${yamlString(article.data.title)}`,
		`emoji: ${yamlString(String(article.data.zenn_emoji || process.env.ZENN_DEFAULT_EMOJI || 'memo'))}`,
		`type: ${yamlString(String(article.data.zenn_type || process.env.ZENN_DEFAULT_TYPE || 'tech'))}`,
		`topics: [${zennTopics(article).map(yamlString).join(', ')}]`,
		`published: ${published ? 'true' : 'false'}`,
		'---',
		'',
		converted.body.trimEnd(),
		'',
	].join('\n');

	mkdirSync(articleDir, { recursive: true });
	writeFileSync(articlePath, zennMarkdown);
	return {
		articlePath,
		copiedImages: converted.copiedImages,
		published,
		slug,
	};
}

export function zennRepoDir() {
	return path.resolve(repoRoot, process.env.ZENN_REPO_DIR || './zenn');
}

function collectPublishImageRefs(article, withHeroImage) {
	const refs = findMarkdownImageRefs(article.body);
	if (withHeroImage && article.data.heroImage && !refs.some((ref) => ref.url === article.data.heroImage)) {
		refs.unshift({ alt: article.data.title || 'cover', url: String(article.data.heroImage) });
	}
	return refs;
}

function validateZennImages(article, imageRefs) {
	const blockers = [];
	for (const ref of imageRefs) {
		if (!isLocalImageRef(ref.url)) continue;
		const localPath = resolveLocalImage(article, ref.url);
		if (!existsSync(localPath)) continue;
		const ext = path.extname(localPath).toLowerCase();
		if (!zennImageExtensions.has(ext)) {
			blockers.push(
				`${article.sourceRelPath}: Zenn GitHub images do not support ${ext || 'extensionless'} files: ${ref.url}.`,
			);
		}
		const size = fileSizeBytes(localPath);
		if (size > zennMaxImageBytes) {
			blockers.push(`${article.sourceRelPath}: Zenn image exceeds 3MB: ${ref.url} (${formatBytes(size)}).`);
		}
	}
	return blockers;
}

function convertBodyImagesForZenn(article, slug, zennRepo, withHeroImage) {
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

	return {
		body: replaceMarkdownImageUrls(body, imageMap),
		copiedImages: [...imageMap.entries()].map(([from, to]) => ({ from, to })),
	};
}

function copyZennImage(article, sourceRef, slug, zennRepo) {
	const localPath = resolveLocalImage(article, sourceRef);
	const file = readFileSync(localPath);
	const hash = createHashForBytes(file).slice(0, 12);
	const safeName = safeAssetName(path.basename(localPath));
	const targetRel = path.posix.join(process.env.ZENN_IMAGES_DIR || 'images', slug, `${hash}-${safeName}`);
	const targetPath = path.join(zennRepo, ...targetRel.split('/'));
	copyFileWithDirs(localPath, targetPath);
	return `/${targetRel}`;
}

function createHashForBytes(bytes) {
	return createHash('sha256').update(bytes).digest('hex');
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

export function zennTopics(article) {
	const values = asArray(article.data.zenn_topics).length > 0 ? asArray(article.data.zenn_topics) : normalizedTags(article);
	return values.map((tag) => String(tag).toLowerCase().replace(/[^0-9a-z]/g, '')).filter(Boolean).slice(0, 5);
}

function includeHeroImage() {
	return /^(1|true|yes)$/i.test(process.env.ZENN_INCLUDE_HERO_IMAGE || '');
}

function escapeMarkdownAlt(value) {
	return value.replace(/[\[\]]/g, '');
}

function formatBytes(bytes) {
	return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}
