import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { resolveRepoPath, toRepoRelative } from './common.mjs';
import { languageConfig } from './pipelines.mjs';

export function extractMermaidBlocks(markdown) {
	return [...markdown.matchAll(/^```mermaid\n([\s\S]*?)\n```/gm)].map((match) => match[1]);
}

export function cleanMermaidOutput(text) {
	let cleaned = text.trim();
	const fenced = cleaned.match(/^```(?:mermaid)?\n([\s\S]*?)\n```$/i);
	if (fenced) cleaned = fenced[1].trim();
	return `${cleaned.trim()}\n`;
}

export function planMermaidAssets({ pipeline, language, only = [], artifactDir }) {
	const target = languageConfig(pipeline, language);
	const onlySet = new Set(only);
	const items = [];
	const blockers = [];
	const warnings = [];

	for (const group of pipeline.mermaid || []) {
		const sourcePath = resolveRepoPath(path.join(pipeline.sourceDir, group.source));
		if (!existsSync(sourcePath)) {
			blockers.push(`${toRepoRelative(sourcePath)}: source markdown missing.`);
			continue;
		}
		const blocks = extractMermaidBlocks(readFileSync(sourcePath, 'utf8'));
		for (const blockNumber of group.blocks) {
			const file = `${group.prefix}-${String(blockNumber).padStart(2, '0')}.png`;
			if (onlySet.size && !onlySet.has(file) && !onlySet.has(`${group.prefix}-${String(blockNumber).padStart(2, '0')}`)) continue;
			const block = blocks[blockNumber - 1];
			const targetPath = resolveRepoPath(path.join(target.targetDir, 'assets', file));
			const debugPath = path.join(artifactDir, 'mermaid', `${path.basename(file, '.png')}.mmd`);
			if (!block) {
				blockers.push(`${toRepoRelative(sourcePath)}: Mermaid block ${blockNumber} not found for ${file}.`);
			}
			items.push({
				source: toRepoRelative(sourcePath),
				block: blockNumber,
				target: toRepoRelative(targetPath),
				debugSource: toRepoRelative(debugPath),
				status: block ? 'planned' : 'blocked',
				renderer: '@mermaid-js/mermaid-cli',
			});
		}
	}

	if (onlySet.size && items.length === 0) {
		blockers.push(`No Mermaid asset matched --only ${[...onlySet].join(', ')}.`);
	}
	if (!process.env.TRANSLATE_MERMAID_RENDERER && !process.env.MERMAID_CLI_PACKAGE) {
		warnings.push('Mermaid renderer defaults to npx -y @mermaid-js/mermaid-cli; set MERMAID_CLI_PACKAGE to override.');
	}
	return { items, blockers, warnings };
}

export function writeDebugMermaidSource(filePath, source) {
	writeFileSync(filePath, cleanMermaidOutput(source));
}
