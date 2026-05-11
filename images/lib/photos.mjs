import path from 'node:path';
import { relativeMarkdownPath, safeSlug, toRepoRelative } from './common.mjs';

const MIN_PHOTOS = 3;
const LONG_ARTICLE_EXTRA_EVERY = 1400;

export function parseMarkdownSections(markdown) {
	const sections = [];
	let inFence = false;
	let current = null;
	let offset = 0;

	for (const line of markdown.split(/(?<=\n)/)) {
		const cleanLine = line.replace(/\r?\n$/, '');
		if (/^\s*(```|~~~)/.test(cleanLine)) {
			inFence = !inFence;
		}
		const heading = !inFence ? cleanLine.match(/^(#{2,4})\s+(.+?)\s*#*\s*$/) : null;
		if (heading) {
			if (current) {
				current.end = offset;
				current.body = markdown.slice(current.bodyStart, current.end).trim();
				sections.push(current);
			}
			current = {
				level: heading[1].length,
				heading: heading[2].trim(),
				anchor: cleanLine,
				start: offset,
				bodyStart: offset + line.length,
				end: markdown.length,
				body: '',
			};
		}
		offset += line.length;
	}
	if (current) {
		current.end = markdown.length;
		current.body = markdown.slice(current.bodyStart, current.end).trim();
		sections.push(current);
	}
	return sections;
}

export function scoreSection(section) {
	const text = stripCodeFences(section.body);
	const lengthScore = Math.min(5, Math.floor(text.length / 220));
	const listScore = (text.match(/^\s*[-*]\s+/gm) || []).length >= 2 ? 1 : 0;
	const processScore = /(流程|步骤|机制|架构|链路|状态|生命周期|pipeline|workflow|architecture|state|loop|flow|process)/i.test(text) ? 2 : 0;
	const technicalScore = /(API|CLI|SDK|token|cache|prompt|context|agent|model|数据库|索引|事务|缓存|渲染|生成|翻译)/i.test(text) ? 1 : 0;
	const imagePenalty = /!\[[^\]]*]\([^)]+\)/.test(text) ? -3 : 0;
	return lengthScore + listScore + processScore + technicalScore + imagePenalty;
}

function stripCodeFences(source) {
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

export function planPhotoPrompts(article, workspace, { minPhotos = MIN_PHOTOS } = {}) {
	const sections = parseMarkdownSections(article.body);
	const scored = sections.map((section, index) => ({
		...section,
		index,
		score: scoreSection(section),
	}));
	const eligible = scored.filter((section) => section.body.length >= 120 && section.score > 0);
	const targetCount = Math.max(minPhotos, Math.min(eligible.length, minPhotos + Math.floor(article.body.length / LONG_ARTICLE_EXTRA_EVERY)));
	const selected = eligible
		.sort((a, b) => b.score - a.score || a.index - b.index)
		.slice(0, targetCount)
		.sort((a, b) => a.index - b.index);

	const warnings = [];
	if (eligible.length < minPhotos) {
		warnings.push(`${article.sourceRelPath}: only ${eligible.length} eligible photo sections found; minimum target is ${minPhotos}.`);
	}

	const items = selected.map((section, index) => {
		const number = String(index + 1).padStart(2, '0');
		const headingSlug = safeSlug(section.heading).slice(0, 40) || `section-${number}`;
		const id = `photo-${number}`;
		const promptPath = path.join(workspace.workspaceDir, `${id}-${headingSlug}-prompt.md`);
		const promptJsonPath = path.join(workspace.workspaceDir, `${id}-${headingSlug}-prompt.json`);
		const targetPath = path.join(workspace.workspaceDir, `${id}-${headingSlug}.png`);
		return {
			id,
			kind: 'photo',
			status: 'prompt-planned',
			sectionHeading: section.heading,
			sectionScore: section.score,
			anchor: section.anchor,
			sectionExcerpt: stripCodeFences(section.body).slice(0, 1200).trim(),
			promptPath: toRepoRelative(promptPath),
			promptJsonPath: toRepoRelative(promptJsonPath),
			targetPath: toRepoRelative(targetPath),
			markdownRef: relativeMarkdownPath(article.sourceDir, targetPath),
			alt: `${article.data.title || path.basename(article.sourcePath, path.extname(article.sourcePath))} - ${section.heading}`,
			promptStatus: 'planned',
		};
	});

	return { items, warnings, sections: scored };
}

export function buildPromptRequest(article, item) {
	return `# ${item.id}: ${item.sectionHeading}

Article: ${article.sourceRelPath}
Section: ${item.sectionHeading}
Asset target: ${item.targetPath}

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

${item.sectionExcerpt}
`;
}
