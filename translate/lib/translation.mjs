import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { toRepoRelative } from './common.mjs';
import {
	cleanModelOutput,
	findMarkdownImageRefs,
	findMarkdownLinks,
	isLocalImageRef,
	isLocalRef,
	readArticle,
	validateLocalImageFiles,
} from './markdown.mjs';
import { sourceToTargetSlugMap } from './pipelines.mjs';

export function planTranslations({ pipeline, language, plans }) {
	const slugMap = sourceToTargetSlugMap(pipeline, language);
	return plans.map((plan) => {
		if (!existsSync(plan.sourcePath)) {
			return {
				...plan,
				status: 'blocked',
				blockers: [`${plan.sourceRelPath}: source file is missing.`],
				warnings: [],
				linkRewrites: [],
				assetRewrites: [],
				targetExists: existsSync(plan.targetPath),
			};
		}

		const article = readArticle(plan.sourcePath, readFileSync(plan.sourcePath, 'utf8'));
		const imageRefs = findMarkdownImageRefs(article.raw);
		const linkRefs = findMarkdownLinks(article.raw);
		const blockers = validateLocalImageFiles(article, imageRefs);
		const warnings = [];
		const linkRewrites = planLinkRewrites(linkRefs, slugMap);
		const assetRewrites = planAssetRewrites(imageRefs, article.data.heroImage);

		if (!article.data.title) warnings.push(`${article.sourceRelPath}: source frontmatter title is empty.`);
		if (!article.data.description) warnings.push(`${article.sourceRelPath}: source frontmatter description is empty.`);
		if (!plan.frontmatter.title || !plan.frontmatter.description) {
			blockers.push(`${plan.sourceRelPath}: pipeline target frontmatter is incomplete for ${language}.`);
		}

		return {
			...plan,
			status: blockers.length ? 'blocked' : 'planned',
			blockers,
			warnings,
			sourceFrontmatter: {
				title: article.data.title || '',
				description: article.data.description || '',
				locale: article.data.locale || '',
				heroImage: article.data.heroImage || '',
			},
			linkRewrites,
			assetRewrites,
			targetExists: existsSync(plan.targetPath),
			targetDir: toRepoRelative(path.dirname(plan.targetPath)),
		};
	});
}

function planLinkRewrites(linkRefs, slugMap) {
	const rewrites = [];
	for (const ref of linkRefs) {
		if (!isLocalRef(ref.url) || !ref.url.startsWith('./')) continue;
		const cleanTarget = decodeURIComponent(ref.url.split('#')[0].split('?')[0]).replace(/^\.\//, '');
		const mapped = slugMap.get(cleanTarget) || slugMap.get(path.basename(cleanTarget, '.md'));
		if (mapped && mapped !== ref.url) {
			rewrites.push({ from: ref.url, to: mapped, label: ref.label });
		}
	}
	return rewrites;
}

function planAssetRewrites(imageRefs, heroImage = '') {
	const refs = imageRefs
		.filter((ref) => isLocalImageRef(ref.url) && ref.url.startsWith('./assets/'))
		.map((ref) => ({ from: ref.url, to: ref.url, alt: ref.alt, mode: 'preserve-local-assets-path' }));
	if (heroImage && isLocalImageRef(heroImage) && heroImage.startsWith('./assets/')) {
		refs.unshift({ from: heroImage, to: heroImage, alt: 'heroImage', mode: 'preserve-local-assets-path' });
	}
	return refs;
}

export function cleanTranslatedBody(text) {
	return cleanModelOutput(text);
}

export function assertCanRunRealTranslation(options) {
	if (options.dryRun) return;
	if (!options.yes) {
		throw new Error('真实翻译会调用模型并可能改写目标 Markdown。请先查看 dry-run 摘要，确认后加 --yes 运行。');
	}
	throw new Error('真实模型翻译执行器尚未接入。当前 V1 已提供 dry-run、配置化计划和验收检查；请通过 workflow 人工确认后再接入 provider。');
}
