import { atomicWriteFile } from './common.mjs';
import { buildCoverPromptRequest } from './covers.mjs';
import { buildPromptRequest } from './photos.mjs';

export function replaceMermaidBlocks(markdown, mermaidAssets) {
	let output = markdown;
	for (const asset of [...mermaidAssets].sort((a, b) => (b.start ?? b.block ?? 0) - (a.start ?? a.block ?? 0))) {
		if (!asset.raw || !output.includes(asset.raw)) continue;
		const ref = imageMarkdown(asset);
		output = output.replace(asset.raw, ref);
	}
	return output;
}

export function insertPhotoReferences(markdown, photoAssets) {
	let output = markdown;
	for (const asset of photoAssets) {
		if (!asset.targetPath || !asset.anchor) continue;
		const ref = imageMarkdown(asset);
		if (output.includes(ref) || output.includes(`](${asset.markdownRef})`)) continue;
		const anchorIndex = output.indexOf(asset.anchor);
		if (anchorIndex === -1) continue;
		const insertAt = output.indexOf('\n', anchorIndex);
		const position = insertAt === -1 ? output.length : insertAt + 1;
		output = `${output.slice(0, position)}\n${ref}\n${output.slice(position)}`;
	}
	return output;
}

export function imageMarkdown(asset) {
	return `![${asset.alt}](${asset.markdownRef})`;
}

export function writePromptRequests(article, photoAssets) {
	for (const asset of photoAssets) {
		const request = asset.kind === 'cover' ? buildCoverPromptRequest(article, asset) : buildPromptRequest(article, asset);
		atomicWriteFile(asset.promptPath, request);
		atomicWriteFile(asset.promptJsonPath, `${JSON.stringify(asset, null, 2)}\n`);
	}
}

export function updateArticleMarkdown(article, { mermaidAssets = [], photoAssets = [], coverAssets = [] }) {
	let next = article.raw;
	next = replaceMermaidBlocks(next, mermaidAssets);
	next = insertPhotoReferences(next, photoAssets.filter((asset) => asset.status === 'generated' || asset.status === 'imported'));
	next = updateHeroImage(next, coverAssets.find((asset) => asset.status === 'imported'));
	return next;
}

export function updateHeroImage(markdown, coverAsset) {
	if (!coverAsset?.markdownRef) return markdown;
	const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
	if (!frontmatterMatch) return markdown;
	const frontmatter = frontmatterMatch[1];
	const quote = coverAsset.markdownRef.includes("'") ? '"' : "'";
	const line = `heroImage: ${quote}${coverAsset.markdownRef}${quote}`;
	const nextFrontmatter = /^heroImage:/m.test(frontmatter)
		? frontmatter.replace(/^heroImage:.*$/m, line)
		: `${frontmatter}\n${line}`;
	return `${markdown.slice(0, frontmatterMatch.index)}---\n${nextFrontmatter}\n---\n${markdown.slice(frontmatterMatch[0].length)}`;
}
