import { existsSync } from 'node:fs';
import path from 'node:path';
import { repoRoot, toRepoRelative } from './common.mjs';

export function parseFrontmatter(source) {
	const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
	if (!match) {
		throw new Error('Missing YAML frontmatter.');
	}
	return {
		frontmatter: match[1],
		body: source.slice(match[0].length),
	};
}

export function parseSimpleYaml(source) {
	const result = {};
	const lines = source.split(/\r?\n/);
	let currentArrayKey = '';

	for (const line of lines) {
		if (!line.trim()) continue;
		const arrayMatch = line.match(/^\s*-\s+(.+)$/);
		if (arrayMatch && currentArrayKey) {
			result[currentArrayKey].push(unquoteYaml(arrayMatch[1].trim()));
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
		return inner.split(',').map((item) => unquoteYaml(item.trim()));
	}
	return unquoteYaml(value);
}

function unquoteYaml(value) {
	const trimmed = value.trim();
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
}

export function readArticle(sourcePath, raw) {
	const parsed = parseFrontmatter(raw);
	return {
		sourcePath,
		sourceRelPath: toRepoRelative(sourcePath),
		sourceDir: path.dirname(sourcePath),
		frontmatter: parsed.frontmatter,
		data: parseSimpleYaml(parsed.frontmatter),
		body: parsed.body,
		raw,
	};
}

export function asArray(value) {
	if (Array.isArray(value)) return value;
	if (value === undefined || value === null || value === '') return [];
	return [value];
}

export function findMarkdownImageRefs(source) {
	return scanMarkdownOutsideFences(source, (line) => {
		const refs = [];
		const imagePattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+['"][^'"]*['"])?\)/g;
		let match;
		while ((match = imagePattern.exec(line))) {
			refs.push({ alt: match[1], url: match[2] });
		}
		return refs;
	}).flat();
}

export function findMarkdownLinks(source) {
	return scanMarkdownOutsideFences(source, (line) => {
		const refs = [];
		const linkPattern = /(?<!!)\[([^\]]+)\]\(([^)\s]+)(?:\s+['"][^'"]*['"])?\)/g;
		let match;
		while ((match = linkPattern.exec(line))) {
			refs.push({ label: match[1], url: match[2] });
		}
		return refs;
	}).flat();
}

function scanMarkdownOutsideFences(source, callback) {
	const output = [];
	let inFence = false;
	for (const line of source.split(/\r?\n/)) {
		if (/^\s*(```|~~~)/.test(line)) {
			inFence = !inFence;
			continue;
		}
		if (!inFence) output.push(callback(line));
	}
	return output;
}

export function isLocalRef(value) {
	return value && !/^(?:https?:)?\/\//i.test(value) && !/^(?:data|mailto|tel):/i.test(value);
}

export function isLocalImageRef(value) {
	return isLocalRef(value);
}

export function resolveLocalRef(article, rawUrl) {
	const withoutHash = rawUrl.split('#')[0].split('?')[0];
	if (withoutHash.startsWith('/')) {
		return path.resolve(repoRoot, 'public', decodeURIComponent(withoutHash.slice(1)));
	}
	return path.resolve(article.sourceDir, decodeURIComponent(withoutHash));
}

export function validateLocalImageFiles(article, imageRefs) {
	const blockers = [];
	for (const ref of imageRefs) {
		if (!isLocalImageRef(ref.url)) continue;
		const localPath = resolveLocalRef(article, ref.url);
		if (!existsSync(localPath)) {
			blockers.push(`${article.sourceRelPath}: image not found: ${ref.url} resolved to ${localPath}`);
		}
	}
	return blockers;
}

export function cleanModelOutput(text) {
	let cleaned = text.trim();
	const fenced = cleaned.match(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/i);
	if (fenced) cleaned = fenced[1].trim();

	const warnings = [];
	const lines = [];
	for (const line of cleaned.split(/\r?\n/)) {
		if (isPollutionLine(line)) {
			warnings.push(`Removed model pollution line: ${line.slice(0, 120)}`);
			continue;
		}
		lines.push(line);
	}
	return { markdown: lines.join('\n').trimEnd() + '\n', warnings };
}

function isPollutionLine(line) {
	const trimmed = line.trim();
	return /^Here(?:'s| is) the translation[:：]?$/i.test(trimmed) ||
		/^I(?:'ll| will) translate\b/i.test(trimmed) ||
		/^Let me\b/i.test(trimmed) ||
		/^<tool_call>/i.test(trimmed) ||
		/^<\/?[^>]+>$/.test(trimmed) ||
		/^\{"(?:file_path|path|command)":/.test(trimmed) ||
		/^\/Users\/.+\.(?:md|txt|json|ya?ml|png|jpe?g|svg)$/.test(trimmed);
}

export function hasCjk(text) {
	return /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(text);
}

export function stripCodeFences(source) {
	let inFence = false;
	const lines = [];
	for (const line of source.split(/\r?\n/)) {
		if (/^\s*(```|~~~)/.test(line)) {
			inFence = !inFence;
			continue;
		}
		if (!inFence) lines.push(line);
	}
	return lines.join('\n');
}
