import { existsSync } from 'node:fs';
import path from 'node:path';
import { readJson, repoRoot, resolveRepoPath, toRepoRelative } from './common.mjs';

export function loadPipeline(id = 'claude-code-series') {
	const filePath = path.join(repoRoot, 'translate', 'pipelines', `${id}.json`);
	if (!existsSync(filePath)) {
		throw new Error(`Pipeline not found: ${id}`);
	}
	const pipeline = readJson(filePath);
	return { ...pipeline, filePath };
}

export function languageConfig(pipeline, language) {
	const config = pipeline.targets?.[language];
	if (!config) {
		throw new Error(`Unsupported language for ${pipeline.id}: ${language}`);
	}
	return config;
}

export function resolvePipelineFiles(pipeline, language, requestedFiles = []) {
	const requested = new Set(requestedFiles.map((file) => toRepoRelative(file)));
	return pipeline.files
		.filter((entry) => {
			if (requested.size === 0) return true;
			const sourcePath = resolveRepoPath(path.join(pipeline.sourceDir, entry.source));
			return requested.has(toRepoRelative(sourcePath)) || requested.has(path.join(pipeline.sourceDir, entry.source));
		})
		.map((entry) => filePlan(pipeline, language, entry));
}

export function filePlan(pipeline, language, entry) {
	const targetConfig = languageConfig(pipeline, language);
	const localized = entry.targets[language];
	if (!localized) {
		throw new Error(`Missing ${language} target for ${entry.source}`);
	}
	const sourcePath = resolveRepoPath(path.join(pipeline.sourceDir, entry.source));
	const targetPath = resolveRepoPath(path.join(targetConfig.targetDir, localized.file));
	return {
		source: entry.source,
		sourcePath,
		sourceRelPath: toRepoRelative(sourcePath),
		targetFile: localized.file,
		targetPath,
		targetRelPath: toRepoRelative(targetPath),
		frontmatter: {
			locale: targetConfig.locale,
			title: localized.title,
			description: localized.description,
			aliases: localized.aliases || [],
		},
	};
}

export function sourceToTargetSlugMap(pipeline, language) {
	const output = new Map();
	for (const entry of pipeline.files) {
		const localized = entry.targets[language];
		if (!localized) continue;
		output.set(path.basename(entry.source, '.md'), `./${path.basename(localized.file, '.md')}`);
	}
	return output;
}

export function targetFiles(pipeline, language) {
	return pipeline.files.map((entry) => filePlan(pipeline, language, entry).targetPath);
}

export function isMermaidAssetName(name) {
	return /(?:^|-)mermaid-\d+\.(?:png|jpe?g|svg)$/i.test(path.basename(name));
}
