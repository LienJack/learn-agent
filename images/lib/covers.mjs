import path from 'node:path';
import { relativeMarkdownPath, safeSlug, toRepoRelative } from './common.mjs';

export function planCoverPrompt(article, workspace) {
	if (article.data.heroImage) return { items: [], warnings: [] };

	const titleSlug = safeSlug(article.data.title || path.basename(article.sourcePath, path.extname(article.sourcePath))).slice(0, 48);
	const targetPath = path.join(workspace.workspaceDir, `cover-${titleSlug}.png`);
	const promptPath = path.join(workspace.workspaceDir, 'cover-prompt.md');
	const promptJsonPath = path.join(workspace.workspaceDir, 'cover-prompt.json');
	return {
		items: [
			{
				id: 'cover',
				kind: 'cover',
				status: 'prompt-planned',
				promptPath: toRepoRelative(promptPath),
				promptJsonPath: toRepoRelative(promptJsonPath),
				targetPath: toRepoRelative(targetPath),
				markdownRef: relativeMarkdownPath(article.sourceDir, targetPath),
				alt: `${article.data.title || path.basename(article.sourcePath, path.extname(article.sourcePath))} - 封面图`,
				promptStatus: 'planned',
				title: article.data.title || '',
				description: article.data.description || '',
				tags: article.data.tags || [],
			},
		],
		warnings: [],
	};
}

export function buildCoverPromptRequest(article, item) {
	const tags = Array.isArray(article.data.tags) ? article.data.tags.join(', ') : '';
	const excerpt = article.body
		.replace(/```[\s\S]*?```/g, '')
		.replace(/!\[[^\]]*]\([^)]+\)/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 900);

	return `# cover: ${article.data.title || item.title || 'Article cover'}

Article: ${article.sourceRelPath}
Asset target: ${item.targetPath}

Use the imagegen skill to create a blog article cover image.

## Article metadata

Title: ${article.data.title || ''}
Description: ${article.data.description || ''}
Tags: ${tags}

## Article excerpt

${excerpt}

## Output requirements

Return a ready-to-use image prompt and negative prompt.

Preferred visual direction:
- Article hero / cover image, not an in-body diagram.
- Wide landscape composition suitable for blog cards and article header.
- Editorial technical illustration style.
- Strong first-glance signal of the article topic.
- Avoid dense text, UI screenshots, tiny labels, photorealism, dark backgrounds, neon colors, and clutter.
- If text rendering is uncertain, leave clean negative space for the title instead of generating long Chinese text.
`;
}
