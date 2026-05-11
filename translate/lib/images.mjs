import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { contentTypeFor, resolveRepoPath, toRepoRelative } from './common.mjs';
import { isMermaidAssetName, languageConfig } from './pipelines.mjs';

export async function planOrdinaryImages({ pipeline, language, only = [] }) {
	const target = languageConfig(pipeline, language);
	const sourceAssetsDir = resolveRepoPath(path.join(pipeline.sourceDir, 'assets'));
	const targetAssetsDir = resolveRepoPath(path.join(target.targetDir, 'assets'));
	const onlySet = new Set(only);
	const items = [];
	const blockers = [];
	const warnings = [];

	for (const filename of pipeline.ordinaryImages || []) {
		if (isMermaidAssetName(filename)) continue;
		if (onlySet.size && !onlySet.has(filename)) continue;
		const sourcePath = path.join(sourceAssetsDir, filename);
		const targetPath = path.join(targetAssetsDir, filename);
		if (!existsSync(sourcePath)) {
			blockers.push(`${toRepoRelative(sourcePath)}: source image missing.`);
			items.push({ file: filename, status: 'blocked', source: toRepoRelative(sourcePath), target: toRepoRelative(targetPath) });
			continue;
		}
		const dimensions = await sharp(sourcePath).metadata();
		const ext = path.extname(filename).toLowerCase();
		const outputFormat = ext === '.jpg' || ext === '.jpeg' ? 'jpeg' : ext.replace('.', '') || 'png';
		items.push({
			file: filename,
			status: 'planned',
			source: toRepoRelative(sourcePath),
			target: toRepoRelative(targetPath),
			width: dimensions.width,
			height: dimensions.height,
			contentType: contentTypeFor(sourcePath),
			output_format: outputFormat,
			language,
			prompt_origin: 'pipeline_image_localization_entry',
		});
	}

	if (onlySet.size && items.length === 0) {
		blockers.push(`No ordinary image matched --only ${[...onlySet].join(', ')}.`);
	}
	if (!hasImageProviderConfig()) {
		warnings.push('Dry-run only: image provider config not found. Real generation requires OPENAI_API_KEY or Codex auth provider config.');
	}
	return { items, blockers, warnings };
}

export function hasImageProviderConfig() {
	return Boolean(process.env.OPENAI_API_KEY || process.env.OPENAI_IMAGE_BASE_URL || process.env.OPENAI_BASE_URL);
}
