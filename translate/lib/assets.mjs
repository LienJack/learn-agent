import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { contentTypeFor, fileSizeBytes, hashFile, resolveRepoPath, toRepoRelative, writeJson } from './common.mjs';
import { hasImageProviderConfig } from './images.mjs';
import { isMermaidAssetName, languageConfig } from './pipelines.mjs';

const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg']);

export function reviewAssetPlan({ pipeline, language, stages, summary, execution = false }) {
	const target = languageConfig(pipeline, language);
	const checks = [];
	const blockers = [];
	const warnings = [];
	const reviewItems = [];
	const targetAssetsPrefix = toRepoRelative(resolveRepoPath(path.join(target.targetDir, 'assets')));
	const seenTargets = new Map();

	checks.push(checkResult('target-language', true, `${language} -> ${target.locale}`));

	for (const stageName of stages) {
		const stage = summary.stages[stageName];
		if (!stage) {
			blockers.push(`${stageName}: stage plan missing.`);
			checks.push(checkResult(`${stageName}-plan`, false, 'stage plan missing'));
			continue;
		}
		for (const blocker of stage.blockers || []) blockers.push(blocker);
		for (const warning of stage.warnings || []) warnings.push(warning);
		checks.push(checkResult(`${stageName}-blockers`, (stage.blockers || []).length === 0, `${stage.items?.length || 0} items`));

		for (const item of stage.items || []) {
			const itemReview = reviewAssetItem({ item, stageName, targetAssetsPrefix, seenTargets });
			reviewItems.push(itemReview);
			blockers.push(...itemReview.blockers);
			warnings.push(...itemReview.warnings);
		}
	}

	if (stages.includes('images')) {
		const providerConfigured = hasImageProviderConfig();
		checks.push(checkResult('image-provider-config', providerConfigured || !execution, providerConfigured ? 'configured' : 'missing'));
		if (!providerConfigured) {
			const message = 'Images: image provider config missing. Real generation requires OPENAI_API_KEY, OPENAI_IMAGE_BASE_URL or OPENAI_BASE_URL.';
			if (execution) blockers.push(message);
			else warnings.push(message);
		}
	}

	return {
		status: blockers.length ? 'blocked' : 'passed',
		reviewer: 'translate-asset-auto-review',
		execution,
		checks,
		blockers: unique(blockers),
		warnings: unique(warnings),
		items: reviewItems,
	};
}

function reviewAssetItem({ item, stageName, targetAssetsPrefix, seenTargets }) {
	const blockers = [];
	const warnings = [];
	const target = item.target || '';
	const source = item.source || '';

	if (!source) blockers.push(`${item.file || target}: source path missing from plan.`);
	if (!target) blockers.push(`${item.file || source}: target path missing from plan.`);
	if (target && !target.startsWith(`${targetAssetsPrefix}/`)) {
		blockers.push(`${target}: target is outside ${targetAssetsPrefix}.`);
	}
	if (target) {
		const previous = seenTargets.get(target);
		if (previous) blockers.push(`${target}: duplicate target also planned by ${previous}.`);
		seenTargets.set(target, item.file || `${stageName} item`);
	}
	if (stageName === 'mermaid' && target && !isMermaidAssetName(target)) {
		blockers.push(`${target}: Mermaid stage target must use the Mermaid asset naming pattern.`);
	}
	if (stageName === 'images' && target && isMermaidAssetName(target)) {
		blockers.push(`${target}: ordinary image stage must not process Mermaid assets.`);
	}
	if (stageName === 'images') {
		if (!Number.isFinite(item.width) || item.width <= 0 || !Number.isFinite(item.height) || item.height <= 0) {
			blockers.push(`${target}: ordinary image dimensions are missing.`);
		}
		if (!SUPPORTED_IMAGE_TYPES.has(item.contentType)) {
			blockers.push(`${target}: ordinary image content type must be PNG or JPEG, got ${item.contentType || 'empty'}.`);
		}
		if (!item.prompt_origin) warnings.push(`${target}: prompt origin missing.`);
	}

	return {
		stage: stageName,
		file: item.file || path.basename(target),
		source,
		target,
		status: blockers.length ? 'blocked' : 'reviewed',
		blockers,
		warnings,
	};
}

export async function writeImagePromptManifest({ artifactDir, language, imageStage }) {
	const manifest = {
		language,
		items: (imageStage?.items || []).map((item) => ({
			file: item.file,
			source: item.source,
			target: item.target,
			width: item.width,
			height: item.height,
			output_format: item.output_format,
			contentType: item.contentType,
			language: item.language,
			prompt_origin: item.prompt_origin,
			review_status: item.status === 'blocked' ? 'blocked' : 'pending-generation',
		})),
	};
	const manifestPath = path.join(artifactDir, `${language}-image-prompt-manifest.json`);
	writeJson(manifestPath, manifest);
	return { manifest, manifestPath };
}

export async function collectAssetExecution({ language, stages, summary, artifactDir }) {
	const results = [];
	const blockers = [];
	const warnings = [];
	if (stages.includes('images')) {
		const { manifestPath } = await writeImagePromptManifest({
			artifactDir,
			language,
			imageStage: summary.stages.images,
		});
		results.push({
			stage: 'images',
			status: 'manifest-written',
			artifact: toRepoRelative(manifestPath),
		});
	}

	for (const stageName of stages) {
		for (const item of summary.stages[stageName]?.items || []) {
			const result = await collectAssetItemExecution({ item, stageName });
			results.push(result);
			if (result.status === 'blocked' || result.status === 'failed') blockers.push(...(result.blockers || []));
			warnings.push(...(result.warnings || []));
		}
	}

	return {
		status: blockers.length ? 'blocked' : 'completed',
		blockers: unique(blockers),
		warnings: unique(warnings),
		results,
	};
}

async function collectAssetItemExecution({ item, stageName }) {
	const targetPath = resolveRepoPath(item.target);
	const sourcePath = item.source ? resolveRepoPath(item.source) : '';
	const base = {
		stage: stageName,
		assetType: stageName === 'mermaid' ? 'mermaid' : 'ordinary-image',
		file: item.file || path.basename(item.target || ''),
		source: item.source,
		target: item.target,
		prompt_origin: item.prompt_origin,
		reviewStatus: 'pending-automated-check',
		blockers: [],
		warnings: [],
	};

	if (!existsSync(targetPath)) {
		base.status = 'blocked';
		base.failureReason = `${item.target}: target asset missing after generation.`;
		base.blockers.push(base.failureReason);
		base.reviewStatus = 'blocked';
		return base;
	}

	const metadata = await readImageMetadata(targetPath);
	base.status = 'completed';
	base.deliveryMode = 'existing-target-accepted';
	base.contentType = contentTypeFor(targetPath);
	base.width = metadata.width;
	base.height = metadata.height;
	base.bytes = fileSizeBytes(targetPath);
	base.sha256 = hashFile(targetPath);
	base.reviewStatus = 'passed';

	if (stageName === 'images' && existsSync(sourcePath)) {
		if (metadata.width !== item.width || metadata.height !== item.height) {
			base.status = 'review_required';
			base.reviewStatus = 'manual-review';
			base.warnings.push(`${item.target}: target dimensions ${metadata.width}x${metadata.height} differ from source ${item.width}x${item.height}.`);
		}
		if (base.contentType !== item.contentType) {
			base.status = 'blocked';
			base.reviewStatus = 'blocked';
			base.blockers.push(`${item.target}: target format ${base.contentType} differs from source ${item.contentType}.`);
		}
	}

	return base;
}

export async function inspectPipelineAssets({ pipeline, language }) {
	const target = languageConfig(pipeline, language);
	const targetAssetsDir = resolveRepoPath(path.join(target.targetDir, 'assets'));
	const expected = expectedPipelineAssets(pipeline, language);
	const items = [];
	const blockers = [];
	const warnings = [];

	for (const item of expected) {
		const targetPath = resolveRepoPath(item.target);
		const sourcePath = resolveRepoPath(item.source);
		const result = {
			...item,
			status: 'passed',
			checks: [],
			blockers: [],
			warnings: [],
		};
		if (!item.target.startsWith(toRepoRelative(targetAssetsDir))) {
			result.blockers.push(`${item.target}: target is outside expected assets directory.`);
		}
		if (!existsSync(targetPath)) {
			result.status = 'blocked';
			result.blockers.push(`${item.target}: target asset missing.`);
		} else {
			const contentType = contentTypeFor(targetPath);
			result.contentType = contentType;
			if (item.assetType === 'ordinary-image') {
				if (!SUPPORTED_IMAGE_TYPES.has(contentType)) {
					result.blockers.push(`${item.target}: expected PNG or JPEG target, got ${contentType}.`);
				}
				if (existsSync(sourcePath)) {
					const [sourceMeta, targetMeta] = await Promise.all([readImageMetadata(sourcePath), readImageMetadata(targetPath)]);
					result.sourceWidth = sourceMeta.width;
					result.sourceHeight = sourceMeta.height;
					result.width = targetMeta.width;
					result.height = targetMeta.height;
					if (sourceMeta.width !== targetMeta.width || sourceMeta.height !== targetMeta.height) {
						result.warnings.push(`${item.target}: dimensions ${targetMeta.width}x${targetMeta.height} differ from source ${sourceMeta.width}x${sourceMeta.height}; review visual fidelity.`);
						result.reviewStatus = 'manual-review';
					}
				}
			}
		}
		if (result.blockers.length) result.status = 'blocked';
		blockers.push(...result.blockers);
		warnings.push(...result.warnings);
		items.push(result);
	}

	return {
		language,
		pipeline: pipeline.id,
		status: blockers.length ? 'blocked' : warnings.length ? 'review_required' : 'passed',
		items,
		blockers: unique(blockers),
		warnings: unique(warnings),
	};
}

export function expectedPipelineAssets(pipeline, language) {
	const target = languageConfig(pipeline, language);
	const sourceAssetsDir = path.join(pipeline.sourceDir, 'assets');
	const targetAssetsDir = path.join(target.targetDir, 'assets');
	const ordinary = (pipeline.ordinaryImages || [])
		.filter((file) => !isMermaidAssetName(file))
		.map((file) => ({
			assetType: 'ordinary-image',
			file,
			source: path.join(sourceAssetsDir, file),
			target: path.join(targetAssetsDir, file),
		}));
	const mermaid = (pipeline.mermaid || []).flatMap((group) => (group.blocks || []).map((block) => {
		const file = `${group.prefix}-${String(block).padStart(2, '0')}.png`;
		return {
			assetType: 'mermaid',
			file,
			source: path.join(pipeline.sourceDir, group.source),
			block,
			target: path.join(targetAssetsDir, file),
		};
	}));
	return [...mermaid, ...ordinary];
}

export function detectTextResidue(text, language) {
	if (language === 'en' && /[\u3400-\u9fff\u3040-\u30ff]/.test(text)) {
		return { status: 'blocked', reason: 'CJK characters remain in English text.' };
	}
	if (language === 'ja') {
		const highConfidenceChinese = /(?:[\u4e00-\u9fff]{2,}(?:的|了|在|和|是|这|为|与|从|到|里|对|把|被|给|让)[\u4e00-\u9fff]{1,})|(?:源码|机制|工具|文件|终端|任务|协作|上下文|核心|流程|管理|系列)/;
		if (highConfidenceChinese.test(text)) {
			return { status: 'blocked', reason: 'High-confidence Chinese residue remains in Japanese text.' };
		}
		if (/[\u4e00-\u9fff]{6,}/.test(text)) {
			return { status: 'review_required', reason: 'Long Han-character sequence should be reviewed for Japanese localization.' };
		}
	}
	return { status: 'passed', reason: '' };
}

async function readImageMetadata(filePath) {
	try {
		const metadata = await sharp(filePath).metadata();
		return { width: metadata.width || 0, height: metadata.height || 0 };
	} catch {
		return { width: 0, height: 0 };
	}
}

function checkResult(name, passed, detail) {
	return { name, status: passed ? 'passed' : 'blocked', detail };
}

function unique(items) {
	return [...new Set(items.filter(Boolean))];
}
