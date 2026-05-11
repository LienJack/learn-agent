import { existsSync } from 'node:fs';
import {
	contentTypeFor,
	copyFileWithDirs,
	fileSizeBytes,
	hashFile,
	imageExtensionFor,
	relativeMarkdownPath,
	resolveRepoPath,
	toRepoRelative,
} from './common.mjs';
import { mergeManifestAssets, readWorkspaceManifest, writeWorkspaceManifest } from './workspace.mjs';

export function hasImageProviderConfig() {
	return Boolean(process.env.OPENAI_API_KEY || process.env.OPENAI_IMAGE_BASE_URL || process.env.OPENAI_BASE_URL);
}

export function importGeneratedImage({ article, workspace, promptId, sourceFile }) {
	if (!promptId) throw new Error('--prompt-id is required when importing an image.');
	if (!sourceFile) throw new Error('--import <file> is required.');
	if (!existsSync(sourceFile)) {
		return { status: 'failed', blocker: `${toRepoRelative(sourceFile)}: import source missing.` };
	}
	const manifest = readWorkspaceManifest(article, workspace);
	const asset = (manifest.assets || []).find((entry) => entry.id === promptId && ['cover', 'photo'].includes(entry.kind));
	if (!asset) {
		return { status: 'failed', blocker: `${promptId}: image prompt not found in ${workspace.manifestRelPath}.` };
	}

	const ext = imageExtensionFor(sourceFile);
	const targetPath = resolveRepoPath(asset.targetPath).replace(/\.[^.]+$/, ext);
	copyFileWithDirs(sourceFile, targetPath);
	const imported = {
		...asset,
		status: 'imported',
		targetPath: toRepoRelative(targetPath),
		markdownRef: relativeMarkdownPath(article.sourceDir, targetPath),
		contentType: contentTypeFor(targetPath),
		bytes: fileSizeBytes(targetPath),
		sha256: hashFile(targetPath),
		importedFrom: toRepoRelative(sourceFile),
		importedAt: new Date().toISOString(),
	};
	writeWorkspaceManifest(workspace, mergeManifestAssets(manifest, [imported]));
	return { status: 'imported', asset: imported };
}
