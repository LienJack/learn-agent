import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from '../../images/lib/common.mjs';
import { readArticle } from '../../images/lib/articles.mjs';
import { extractMermaidBlocks, mermaidRenderScale, planMermaidAssets, planSvgMermaidAssets, writeMermaidSources } from '../../images/lib/mermaid.mjs';
import { replaceMermaidBlocks } from '../../images/lib/markdown-updates.mjs';
import { planArticleWorkspaces } from '../../images/lib/workspace.mjs';

const fixtureDir = path.join(repoRoot, 'tmp', 'images-tests', 'mermaid');

test.beforeEach(() => {
	rmSync(fixtureDir, { recursive: true, force: true });
	mkdirSync(fixtureDir, { recursive: true });
});

test('extracts multiple Mermaid blocks from Markdown', () => {
	const blocks = extractMermaidBlocks(`Text
\`\`\`mermaid
flowchart TB
  A --> B
\`\`\`

\`\`\`js
const ignored = true
\`\`\`

\`\`\`mermaid
sequenceDiagram
  A->>B: hi
\`\`\`
`);

	assert.equal(blocks.length, 2);
	assert.equal(blocks[0].source, 'flowchart TB\n  A --> B');
	assert.equal(blocks[1].source, 'sequenceDiagram\n  A->>B: hi');
});

test('plans Mermaid .mmd and PNG targets in article workspace', () => {
	const article = readArticle(writeMermaidArticle());
	const [workspace] = planArticleWorkspaces([article]);
	const assets = planMermaidAssets(article, workspace);

	assert.equal(assets.length, 2);
	assert.equal(assets[0].sourcePath.endsWith('assets/mermaid-article/mermaid-01.mmd'), true);
	assert.equal(assets[0].targetPath.endsWith('assets/mermaid-article/mermaid-01.png'), true);
	assert.equal(assets[0].renderScale, 2);
});

test('plans Mermaid WebP targets when requested', () => {
	const article = readArticle(writeMermaidArticle());
	const [workspace] = planArticleWorkspaces([article]);
	const assets = planMermaidAssets(article, workspace, { outputFormat: 'webp' });

	assert.equal(assets.length, 2);
	assert.equal(assets[0].targetPath.endsWith('assets/mermaid-article/mermaid-01.webp'), true);
	assert.match(assets[0].markdownRef, /mermaid-01\.webp$/);
});

test('plans Mermaid assets with an explicit render scale', () => {
	const article = readArticle(writeMermaidArticle());
	const [workspace] = planArticleWorkspaces([article]);
	const assets = planMermaidAssets(article, workspace, { mermaidScale: '3' });

	assert.equal(assets[0].renderScale, 3);
	assert.equal(mermaidRenderScale({ mermaidScale: '2.5' }), 2.5);
});

test('writes Mermaid sources and replaces blocks idempotently', () => {
	const article = readArticle(writeMermaidArticle());
	const [workspace] = planArticleWorkspaces([article]);
	const assets = planMermaidAssets(article, workspace);
	writeMermaidSources(assets);
	const once = replaceMermaidBlocks(article.raw, assets);
	const twice = replaceMermaidBlocks(once, assets);

	assert.equal(readFileSync(path.join(workspace.workspaceDir, 'mermaid-01.mmd'), 'utf8'), 'flowchart TB\nA --> B\n');
	assert.match(once, /!\[Mermaid Article flow 1]\(\.\/assets\/mermaid-article\/mermaid-01\.png\)/);
	assert.equal(once, twice);
	assert.equal(/```mermaid/.test(once), false);
});

test('article without Mermaid has zero assets', () => {
	const filePath = path.join(fixtureDir, 'none.md');
	writeFileSync(filePath, `---\ntitle: None\ndescription: Desc\n---\n\nNo diagrams.\n`);
	const article = readArticle(filePath);
	const [workspace] = planArticleWorkspaces([article]);

	assert.deepEqual(planMermaidAssets(article, workspace), []);
});

test('plans Mermaid PNG replacements for SVG refs from matching Obsidian source', () => {
	const obsidianRoot = path.join(fixtureDir, 'obsidian');
	mkdirSync(obsidianRoot, { recursive: true });
	writeFileSync(path.join(obsidianRoot, '1 LLM的原理.md'), `# LLM 的原理

\`\`\`mermaid
flowchart TB
  Token --> Model
\`\`\`

\`\`\`mermaid
sequenceDiagram
  User->>LLM: prompt
\`\`\`
`);
	const articlePath = path.join(fixtureDir, '01.LLM的原理.md');
	writeFileSync(articlePath, `---\ntitle: LLM 的原理\ndescription: Desc\n---\n\n![LLM 图 2](./assets/01.LLM的原理-mermaid-02.svg)\n`);
	const article = readArticle(articlePath);
	const [workspace] = planArticleWorkspaces([article]);
	const plan = planSvgMermaidAssets(article, workspace, { obsidianRoot });

	assert.equal(plan.blockers.length, 0);
	assert.equal(plan.items.length, 1);
	assert.equal(plan.items[0].kind, 'svg-mermaid');
	assert.equal(plan.items[0].source, 'sequenceDiagram\n  User->>LLM: prompt');
	assert.match(plan.items[0].targetPath, /01-llm-.*mermaid-02\.png$/i);
});

test('plans WebP replacements for SVG refs from matching Obsidian source', () => {
	const obsidianRoot = path.join(fixtureDir, 'obsidian');
	mkdirSync(obsidianRoot, { recursive: true });
	writeFileSync(path.join(obsidianRoot, '1 LLM的原理.md'), `# LLM 的原理

\`\`\`mermaid
flowchart TB
  Token --> Model
\`\`\`
`);
	const articlePath = path.join(fixtureDir, '01.LLM的原理.md');
	writeFileSync(articlePath, `---\ntitle: LLM 的原理\ndescription: Desc\n---\n\n![LLM 图 1](./assets/01.LLM的原理-mermaid-01.svg)\n`);
	const article = readArticle(articlePath);
	const [workspace] = planArticleWorkspaces([article]);
	const plan = planSvgMermaidAssets(article, workspace, { obsidianRoot, outputFormat: 'webp' });

	assert.equal(plan.blockers.length, 0);
	assert.equal(plan.items.length, 1);
	assert.match(plan.items[0].targetPath, /01-llm-.*mermaid-01\.webp$/i);
});

function writeMermaidArticle() {
	const filePath = path.join(fixtureDir, 'mermaid-article.md');
	writeFileSync(filePath, `---\ntitle: Mermaid Article\ndescription: Desc\n---\n\nIntro\n\n\`\`\`mermaid\nflowchart TB\nA --> B\n\`\`\`\n\nMore\n\n\`\`\`mermaid\nsequenceDiagram\nA->>B: hi\n\`\`\`\n`);
	return filePath;
}
