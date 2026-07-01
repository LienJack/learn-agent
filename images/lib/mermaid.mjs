import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { findMarkdownImageRefs, isLocalRef } from './articles.mjs';
import { hashString, relativeMarkdownPath, resolveRepoPath, safeSlug, toRepoRelative } from './common.mjs';

export function extractMermaidBlocks(markdown) {
	const blocks = [];
	const pattern = /^```mermaid[^\n]*\n([\s\S]*?)\n```/gm;
	let match;
	while ((match = pattern.exec(markdown))) {
		blocks.push({
			index: blocks.length + 1,
			source: match[1],
			raw: match[0],
			start: match.index,
			end: pattern.lastIndex,
		});
	}
	return blocks;
}

export function cleanMermaidOutput(text) {
	let cleaned = text.trim();
	const fenced = cleaned.match(/^```(?:mermaid)?\n([\s\S]*?)\n```$/i);
	if (fenced) cleaned = fenced[1].trim();
	return `${cleaned.trim()}\n`;
}

export function planMermaidAssets(article, workspace, options = {}) {
	const blocks = extractMermaidBlocks(article.raw);
	const ext = mermaidOutputExtension(options);
	const renderScale = mermaidRenderScale(options);
	return blocks.map((block) => {
		const id = `mermaid-${String(block.index).padStart(2, '0')}`;
		const mmdPath = path.join(workspace.workspaceDir, `${id}.mmd`);
		const targetPath = path.join(workspace.workspaceDir, `${id}${ext}`);
		return {
			id,
			kind: 'mermaid',
			block: block.index,
			status: 'planned',
			sourcePath: toRepoRelative(mmdPath),
			targetPath: toRepoRelative(targetPath),
			markdownRef: relativeMarkdownPath(article.sourceDir, targetPath),
			alt: `${article.data.title || path.basename(article.sourcePath, path.extname(article.sourcePath))} flow ${block.index}`,
			renderer: '@mermaid-js/mermaid-cli',
			renderScale,
			source: block.source,
			raw: block.raw,
		};
	});
}

export function planSvgMermaidAssets(article, workspace, { obsidianRoot = '', outputFormat = '', mermaidScale = '' } = {}) {
	const refs = findMarkdownImageRefs(article.raw)
		.filter((ref) => isLocalRef(ref.url) && /\.svg(?:[?#].*)?$/i.test(ref.url) && /mermaid/i.test(ref.url));
	if (!refs.length) return { items: [], warnings: [], blockers: [] };

	const warnings = [];
	const blockers = [];
	const sourceMatch = findObsidianArticleSource(article, obsidianRoot);
	if (!sourceMatch) {
		return {
			items: [],
			warnings,
			blockers: [`${article.sourceRelPath}: found Mermaid SVG references but no matching Obsidian source under ${obsidianRoot || '(unset)'}.`],
		};
	}

	const sourceBlocks = extractMermaidBlocks(readFileSync(sourceMatch.path, 'utf8'));
	if (!sourceBlocks.length) {
		return {
			items: [],
			warnings,
			blockers: [`${article.sourceRelPath}: matched Obsidian source has no Mermaid blocks: ${sourceMatch.path}.`],
		};
	}

	const items = refs.map((ref, index) => {
		const ext = mermaidOutputExtension({ outputFormat });
		const renderScale = mermaidRenderScale({ mermaidScale });
		const blockIndex = mermaidIndexFromRef(ref.url) || index + 1;
		const block = sourceBlocks[blockIndex - 1];
		const id = `svg-mermaid-${String(blockIndex).padStart(2, '0')}`;
		const baseName = safeSlug(path.basename(ref.url.split(/[?#]/)[0], '.svg')) || id;
		const mmdPath = path.join(workspace.workspaceDir, `${baseName}.mmd`);
		const targetPath = path.join(workspace.workspaceDir, `${baseName}${ext}`);
		if (!block) {
			blockers.push(`${article.sourceRelPath}: ${ref.url} maps to Mermaid block ${blockIndex}, but ${sourceMatch.relPath} only has ${sourceBlocks.length}.`);
		}
		return {
			id,
			kind: 'svg-mermaid',
			block: blockIndex,
			status: block ? 'planned' : 'failed',
			sourcePath: toRepoRelative(mmdPath),
			targetPath: toRepoRelative(targetPath),
			markdownRef: relativeMarkdownPath(article.sourceDir, targetPath),
			alt: ref.alt || `${article.data.title || path.basename(article.sourcePath, path.extname(article.sourcePath))} flow ${blockIndex}`,
			renderer: '@mermaid-js/mermaid-cli',
			renderScale,
			source: block?.source || '',
			raw: ref.raw,
			start: ref.start,
			end: ref.end,
			originalRef: ref.url,
			obsidianSource: sourceMatch.relPath,
		};
	});

	if (sourceMatch.candidates.length > 1) {
		warnings.push(`${article.sourceRelPath}: multiple Obsidian source candidates; using ${sourceMatch.relPath}.`);
	}
	return { items, warnings, blockers };
}

export function mermaidRenderScale({ mermaidScale = '' } = {}) {
	const scale = Number.parseFloat(String(mermaidScale || '2'));
	if (!Number.isFinite(scale) || scale <= 0) {
		throw new Error(`Mermaid render scale must be a positive number, got: ${mermaidScale}`);
	}
	return scale;
}

function mermaidOutputExtension({ outputFormat = '' } = {}) {
	const format = String(outputFormat || 'png').toLowerCase();
	if (format === 'png') return '.png';
	if (format === 'webp') return '.webp';
	throw new Error(`Mermaid output format must be png or webp, got: ${format}`);
}

export function writeMermaidSources(assets) {
	for (const asset of assets) {
		if (!['mermaid', 'svg-mermaid'].includes(asset.kind)) continue;
		const sourcePath = resolveRepoPath(asset.sourcePath);
		mkdirSync(path.dirname(sourcePath), { recursive: true });
		writeFileSync(sourcePath, cleanMermaidOutput(asset.source));
	}
}

function mermaidIndexFromRef(url) {
	const decoded = decodeURIComponent(url.split(/[?#]/)[0]);
	const match = decoded.match(/mermaid[-_\s]*(\d+)/i);
	return match ? Number.parseInt(match[1], 10) : 0;
}

function findObsidianArticleSource(article, obsidianRoot) {
	if (!obsidianRoot || !existsSync(obsidianRoot)) return null;
	const title = String(article.data.title || path.basename(article.sourcePath, path.extname(article.sourcePath)));
	const normalizedTitle = normalizeTitle(title);
	const basenameTitle = normalizeTitle(path.basename(article.sourcePath, path.extname(article.sourcePath)));
	const titleHash = hashString(normalizedTitle).slice(0, 16);
	const candidates = [];
	for (const filePath of walkMarkdownFiles(obsidianRoot)) {
		const source = readFileSync(filePath, 'utf8');
		const filename = normalizeTitle(path.basename(filePath, path.extname(filePath)));
		const frontmatterTitle = normalizeTitle((source.match(/^---\n[\s\S]*?\ntitle:\s*['"]?(.+?)['"]?\n[\s\S]*?\n---/m) || [])[1] || '');
		const headingTitle = normalizeTitle((source.match(/^#\s+(.+)$/m) || [])[1] || '');
		const haystack = [filename, frontmatterTitle, headingTitle].filter(Boolean);
		const score = Math.max(
			...haystack.map((candidate) => sourceScore(candidate, normalizedTitle, basenameTitle, titleHash)),
			0,
		);
		if (score > 0) {
			candidates.push({
				path: filePath,
				relPath: path.relative(obsidianRoot, filePath),
				score,
				mtimeMs: statSync(filePath).mtimeMs,
			});
		}
	}
	candidates.sort((a, b) => b.score - a.score || b.mtimeMs - a.mtimeMs);
	return candidates[0] ? { ...candidates[0], candidates } : null;
}

function sourceScore(candidate, title, basenameTitle, titleHash) {
	if (!candidate) return 0;
	if (candidate === title || candidate === basenameTitle) return 100;
	if (candidate.includes(title) || title.includes(candidate)) return 80;
	if (candidate.includes(basenameTitle) || basenameTitle.includes(candidate)) return 70;
	if (hashString(candidate).slice(0, 16) === titleHash) return 60;
	return 0;
}

function normalizeTitle(value) {
	return String(value || '')
		.toLowerCase()
		.replace(/\.(md|mdx)$/i, '')
		.replace(/^\d+[\s._-]*/, '')
		.replace(/[《》"'`#]/g, '')
		.replace(/\s+/g, '')
		.replace(/[._-]+/g, '');
}

function walkMarkdownFiles(root) {
	const files = [];
	const stack = [root];
	while (stack.length) {
		const dir = stack.pop();
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				stack.push(fullPath);
			} else if (entry.isFile() && /\.mdx?$/i.test(entry.name)) {
				files.push(fullPath);
			}
		}
	}
	return files;
}

export function renderMermaidAsset(asset, { dryRun = false } = {}) {
	if (dryRun) return { ...asset, renderStatus: 'planned' };
	const sourcePath = resolveRepoPath(asset.sourcePath);
	const targetPath = resolveRepoPath(asset.targetPath);
	const targetExt = path.extname(targetPath).toLowerCase();
	if (!existsSync(sourcePath)) {
		return { ...asset, status: 'failed', renderStatus: 'failed', error: `${asset.sourcePath}: Mermaid source missing.` };
	}
	if (!['.png', '.webp'].includes(targetExt)) {
		return { ...asset, status: 'failed', renderStatus: 'failed', error: `${asset.targetPath}: unsupported Mermaid output format.` };
	}
	const renderPath = targetExt === '.webp' ? `${targetPath}.${process.pid}.render.png` : targetPath;
	const renderScale = mermaidRenderScale({ mermaidScale: asset.renderScale });
	try {
		mkdirSync(path.dirname(targetPath), { recursive: true });
		const packageName = process.env.MERMAID_CLI_PACKAGE || '@mermaid-js/mermaid-cli';
		execFileSync('npx', ['-y', packageName, '-i', sourcePath, '-o', renderPath, '-b', 'transparent', '-s', String(renderScale)], {
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		if (targetExt === '.webp') {
			execFileSync(imageMagickCommand(), [
				renderPath,
				'-strip',
				'-define',
				'webp:lossless=true',
				'-define',
				'webp:method=6',
				targetPath,
			], {
				stdio: ['ignore', 'pipe', 'pipe'],
			});
			rmSync(renderPath, { force: true });
		}
		return { ...asset, status: 'generated', renderStatus: 'generated' };
	} catch (error) {
		return {
			...asset,
			status: 'failed',
			renderStatus: 'failed',
			error: error instanceof Error ? error.message : String(error),
		};
	} finally {
		if (targetExt === '.webp') rmSync(renderPath, { force: true });
	}
}

function imageMagickCommand() {
	return process.env.IMAGEMAGICK_BIN || 'magick';
}
