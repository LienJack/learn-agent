import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readArticle } from '../../images/lib/articles.mjs';
import { planCoverPrompt } from '../../images/lib/covers.mjs';
import { importGeneratedImage } from '../../images/lib/generation.mjs';
import { updateArticleMarkdown, writePromptRequests } from '../../images/lib/markdown-updates.mjs';
import { repoRoot } from '../../images/lib/common.mjs';
import { emptyWorkspaceManifest, mergeManifestAssets, planArticleWorkspaces, readWorkspaceManifest, writeWorkspaceManifest } from '../../images/lib/workspace.mjs';

const fixtureDir = path.join(repoRoot, 'tmp', 'images-tests', 'covers');

test.beforeEach(() => {
	rmSync(fixtureDir, { recursive: true, force: true });
	mkdirSync(fixtureDir, { recursive: true });
});

test('plans a cover prompt for articles without heroImage', () => {
	const article = readArticle(writeArticle({ heroImage: '' }));
	const [workspace] = planArticleWorkspaces([article]);
	const plan = planCoverPrompt(article, workspace);

	assert.equal(plan.items.length, 1);
	assert.equal(plan.items[0].id, 'cover');
	assert.equal(plan.items[0].kind, 'cover');
	assert.match(plan.items[0].promptPath, /cover-prompt\.md$/);
	assert.match(plan.items[0].targetPath, /cover-.+\.png$/);
});

test('skips cover prompt when article already has heroImage', () => {
	const article = readArticle(writeArticle({ heroImage: "heroImage: './assets/existing.png'" }));
	const [workspace] = planArticleWorkspaces([article]);

	assert.equal(planCoverPrompt(article, workspace).items.length, 0);
});

test('writes cover prompt, imports cover, and updates heroImage', () => {
	const article = readArticle(writeArticle({ heroImage: '' }));
	const [workspace] = planArticleWorkspaces([article]);
	const [cover] = planCoverPrompt(article, workspace).items;
	writeWorkspaceManifest(workspace, mergeManifestAssets(emptyWorkspaceManifest(article, workspace), [cover]));
	writePromptRequests(article, [cover]);
	const generated = path.join(fixtureDir, 'generated-cover.png');
	writeFileSync(generated, tinyPng());

	const result = importGeneratedImage({ article, workspace, promptId: 'cover', sourceFile: generated });
	const manifest = readWorkspaceManifest(article, workspace);
	const markdown = updateArticleMarkdown(article, {
		coverAssets: manifest.assets.filter((asset) => asset.kind === 'cover'),
	});

	assert.equal(result.status, 'imported');
	assert.equal(existsSync(result.asset.targetPath), true);
	assert.equal(existsSync(cover.promptPath), true);
	assert.match(readFileSync(cover.promptPath, 'utf8'), /blog article cover image/);
	assert.match(markdown, /heroImage: '\.\/assets\/cover-article\/cover-cover-article\.png'/);
});

function writeArticle({ heroImage }) {
	const filePath = path.join(fixtureDir, 'cover-article.md');
	writeFileSync(filePath, `---\ntitle: Cover Article\ndescription: Desc\n${heroImage ? `${heroImage}\n` : ''}tags:\n  - AI\n---\n\n## 机制\n\n这个章节解释 LLM、token、embedding、pretrain 和 agent workflow 的整体机制。\n`);
	return filePath;
}

function tinyPng() {
	return Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lY7aLgAAAABJRU5ErkJggg==',
		'base64',
	);
}
