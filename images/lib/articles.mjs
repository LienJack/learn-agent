import { existsSync } from 'node:fs';
import path from 'node:path';
import { readText, repoRoot, toRepoRelative } from './common.mjs';

export function readArticle(sourcePath) {
	const raw = readText(sourcePath);
	const parsed = parseFrontmatter(raw);
	return {
		sourcePath,
		sourceRelPath: toRepoRelative(sourcePath),
		sourceDir: path.dirname(sourcePath),
		frontmatter: parsed.frontmatter,
		data: parseSimpleYaml(parsed.frontmatter),
		body: parsed.body,
		bodyOffset: parsed.bodyOffset,
		raw,
	};
}

export function parseFrontmatter(source) {
	const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
	if (!match) {
		throw new Error('Missing YAML frontmatter.');
	}
	return {
		frontmatter: match[1],
		body: source.slice(match[0].length),
		bodyOffset: match[0].length,
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

export function articleTitle(article) {
	return article.data.title || path.basename(article.sourcePath, path.extname(article.sourcePath));
}

export function findMarkdownImageRefs(source) {
	const refs = [];
	let inFence = false;
	let offset = 0;

	for (const line of source.split(/\r?\n/)) {
		if (/^\s*(```|~~~)/.test(line)) {
			inFence = !inFence;
			offset += line.length + 1;
			continue;
		}
		if (inFence) {
			offset += line.length + 1;
			continue;
		}

		const imagePattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+['"][^'"]*['"])?\)/g;
		let match;
		while ((match = imagePattern.exec(line))) {
			refs.push({ alt: match[1], url: match[2], raw: match[0], start: offset + match.index, end: offset + match.index + match[0].length });
		}
		offset += line.length + 1;
	}

	return refs;
}

export function isLocalRef(value) {
	return value && !/^(?:https?:)?\/\//i.test(value) && !/^(?:data|mailto|tel):/i.test(value);
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
		if (!isLocalRef(ref.url)) continue;
		const localPath = resolveLocalRef(article, ref.url);
		if (!existsSync(localPath)) {
			blockers.push(`${article.sourceRelPath}: image not found: ${ref.url}`);
		}
	}
	return blockers;
}
