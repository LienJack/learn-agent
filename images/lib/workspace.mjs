import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { readJson, safeSlug, toRepoRelative, writeJson } from './common.mjs';

export function planArticleWorkspaces(articles) {
	const baseCounts = new Map();
	for (const article of articles) {
		const base = baseWorkspaceSlug(article);
		baseCounts.set(base, (baseCounts.get(base) || 0) + 1);
	}
	return articles.map((article) => {
		const base = baseWorkspaceSlug(article);
		const slug = baseCounts.get(base) > 1 ? `${base}-${shortHash(article.sourceRelPath)}` : base;
		return planArticleWorkspace(article, slug);
	});
}

export function planArticleWorkspace(article, slug = baseWorkspaceSlug(article)) {
	const workspaceDir = path.join(article.sourceDir, 'assets', slug);
	return {
		article: article.sourceRelPath,
		slug,
		workspaceDir,
		workspaceRelPath: toRepoRelative(workspaceDir),
		manifestPath: path.join(workspaceDir, 'manifest.json'),
		manifestRelPath: toRepoRelative(path.join(workspaceDir, 'manifest.json')),
	};
}

export function baseWorkspaceSlug(article) {
	return safeSlug(article.data.slug || path.basename(article.sourcePath, path.extname(article.sourcePath)));
}

function shortHash(value) {
	let hash = 0;
	for (const char of value) {
		hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
	}
	return Math.abs(hash).toString(36).slice(0, 6);
}

export function ensureWorkspace(workspace) {
	mkdirSync(workspace.workspaceDir, { recursive: true });
}

export function emptyWorkspaceManifest(article, workspace) {
	return {
		version: 1,
		article: article.sourceRelPath,
		workspace: workspace.workspaceRelPath,
		updatedAt: new Date().toISOString(),
		assets: [],
		warnings: [],
		blockers: [],
	};
}

export function readWorkspaceManifest(article, workspace) {
	return readJson(workspace.manifestPath, emptyWorkspaceManifest(article, workspace));
}

export function writeWorkspaceManifest(workspace, manifest) {
	writeJson(workspace.manifestPath, {
		...manifest,
		updatedAt: new Date().toISOString(),
		assets: sortAssets(mergeAssets(manifest.assets || [])),
	});
}

export function mergeManifestAssets(manifest, assets) {
	return {
		...manifest,
		assets: sortAssets(mergeAssets([...(manifest.assets || []), ...assets])),
	};
}

function mergeAssets(assets) {
	const byId = new Map();
	for (const asset of assets) {
		byId.set(asset.id, { ...(byId.get(asset.id) || {}), ...asset });
	}
	return [...byId.values()];
}

function sortAssets(assets) {
	return [...assets].sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

export function manifestExists(workspace) {
	return existsSync(workspace.manifestPath);
}
