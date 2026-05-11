import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from '../../images/lib/common.mjs';
import { readArticle } from '../../images/lib/articles.mjs';
import { importGeneratedImage } from '../../images/lib/generation.mjs';
import { insertPhotoReferences, writePromptRequests } from '../../images/lib/markdown-updates.mjs';
import { parseMarkdownSections, planPhotoPrompts } from '../../images/lib/photos.mjs';
import { mergeManifestAssets, planArticleWorkspaces, writeWorkspaceManifest, emptyWorkspaceManifest } from '../../images/lib/workspace.mjs';

const fixtureDir = path.join(repoRoot, 'tmp', 'images-tests', 'photos');

test.beforeEach(() => {
	rmSync(fixtureDir, { recursive: true, force: true });
	mkdirSync(fixtureDir, { recursive: true });
});

test('parses sections and plans at least three photo prompts', () => {
	const article = readArticle(writePhotoArticle(5));
	const [workspace] = planArticleWorkspaces([article]);
	const plan = planPhotoPrompts(article, workspace);

	assert.equal(parseMarkdownSections(article.body).length, 5);
	assert.equal(plan.items.length >= 3, true);
	assert.equal(plan.items[0].kind, 'photo');
	assert.match(plan.items[0].promptPath, /photo-01-.+-prompt\.md$/);
});

test('long article can plan more than three photos', () => {
	const article = readArticle(writePhotoArticle(8, 700));
	const [workspace] = planArticleWorkspaces([article]);
	const plan = planPhotoPrompts(article, workspace);

	assert.equal(plan.items.length > 3, true);
});

test('short article records shortfall warning', () => {
	const article = readArticle(writePhotoArticle(1, 130));
	const [workspace] = planArticleWorkspaces([article]);
	const plan = planPhotoPrompts(article, workspace);

	assert.equal(plan.warnings.length, 1);
	assert.match(plan.warnings[0], /only 1 eligible/);
});

test('writes prompt requests and imports generated image into workspace manifest', () => {
	const article = readArticle(writePhotoArticle(3));
	const [workspace] = planArticleWorkspaces([article]);
	const photoPlan = planPhotoPrompts(article, workspace);
	const manifest = mergeManifestAssets(emptyWorkspaceManifest(article, workspace), photoPlan.items);
	writeWorkspaceManifest(workspace, manifest);
	writePromptRequests(article, photoPlan.items);
	const generated = path.join(fixtureDir, 'generated.png');
	writeFileSync(generated, tinyPng());

	const result = importGeneratedImage({ article, workspace, promptId: photoPlan.items[0].id, sourceFile: generated });

	assert.equal(result.status, 'imported');
	assert.equal(existsSync(result.asset.targetPath), true);
	assert.equal(existsSync(photoPlan.items[0].promptPath), true);
	const saved = JSON.parse(readFileSync(workspace.manifestPath, 'utf8'));
	assert.equal(saved.assets.find((asset) => asset.id === photoPlan.items[0].id).status, 'imported');
});

test('photo insertion is idempotent near planned heading', () => {
	const article = readArticle(writePhotoArticle(3));
	const [workspace] = planArticleWorkspaces([article]);
	const [asset] = planPhotoPrompts(article, workspace).items;
	const imported = { ...asset, status: 'imported' };
	const once = insertPhotoReferences(article.raw, [imported]);
	const twice = insertPhotoReferences(once, [imported]);

	assert.match(once, new RegExp(`!\\[${escapeRegExp(imported.alt)}\\]\\(`));
	assert.equal(once, twice);
});

test('missing import source records prompt-level failure', () => {
	const article = readArticle(writePhotoArticle(3));
	const [workspace] = planArticleWorkspaces([article]);
	const photoPlan = planPhotoPrompts(article, workspace);
	writeWorkspaceManifest(workspace, mergeManifestAssets(emptyWorkspaceManifest(article, workspace), photoPlan.items));

	const result = importGeneratedImage({
		article,
		workspace,
		promptId: photoPlan.items[0].id,
		sourceFile: path.join(fixtureDir, 'missing.png'),
	});

	assert.equal(result.status, 'failed');
	assert.match(result.blocker, /import source missing/);
});

function writePhotoArticle(count, bodyLength = 360) {
	const filePath = path.join(fixtureDir, `photo-${count}-${bodyLength}.md`);
	const sections = Array.from({ length: count }, (_, index) => {
		const body = '这个章节解释一个 agent workflow 的机制、流程、状态变化、API 调用和 context 管理。'.repeat(Math.ceil(bodyLength / 42));
		return `## 章节 ${index + 1}\n\n${body}\n\n- 输入\n- 处理\n- 输出\n`;
	}).join('\n');
	writeFileSync(filePath, `---\ntitle: Photo Article\ndescription: Desc\n---\n\n${sections}\n`);
	return filePath;
}

function tinyPng() {
	return Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lY7aLgAAAABJRU5ErkJggg==',
		'base64',
	);
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
