import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
	createRun,
	readArticle,
	repoRoot,
	validateRequiredFields,
	writeRunRecord,
} from '../../publish/lib/common.mjs';
import { inspectChineseArticle } from '../../publish/lib/cn.mjs';
import { inspectDevArticle } from '../../publish/lib/dev.mjs';
import { inspectQiitaArticle, prepareQiitaArticle, qiitaTags } from '../../publish/lib/qiita.mjs';
import { inspectZennArticle, prepareZennArticle, zennTopics } from '../../publish/lib/zenn.mjs';

const fixtureDir = path.join(repoRoot, 'tmp', 'publish-tests');

test('run records scrub sensitive fields', () => {
	const articlePath = writeFixture('record.md', validArticle());
	const article = readArticle(articlePath);
	const run = createRun({ language: 'en', platforms: ['dev'], articles: [article] });
	run.record.apiKey = 'secret-value';
	run.record.cookie = 'private-cookie';
	writeRunRecord(run.recordPath, run.record);

	const saved = readJson(run.recordPath);
	assert.equal(saved.apiKey, '[redacted]');
	assert.equal(saved.cookie, '[redacted]');
});

test('required frontmatter validation reports missing fields', () => {
	const articlePath = writeFixture('missing.md', `---\ntitle: Missing Description\n---\n\nBody\n`);
	const article = readArticle(articlePath);

	assert.deepEqual(validateRequiredFields(article, ['title', 'description']), [
		'tmp/publish-tests/missing.md: missing frontmatter description.',
	]);
});

test('DEV inspection blocks missing API key without creating remote action', () => {
	const previous = process.env.CRIER_DEVTO_API_KEY;
	delete process.env.CRIER_DEVTO_API_KEY;
	delete process.env.DEVTO_API_KEY;
	const articlePath = writeFixture('dev.md', validArticle());
	const article = readArticle(articlePath);

	const inspection = inspectDevArticle(article);
	assert.match(inspection.blockers.join('\n'), /Missing CRIER_DEVTO_API_KEY/);

	restoreEnv('CRIER_DEVTO_API_KEY', previous);
});

test('DEV inspection records canonical, tags, image mode, and command plan', () => {
	const previous = process.env.CRIER_DEVTO_API_KEY;
	const previousBase = process.env.PUBLISH_IMAGE_BASE_URL;
	process.env.CRIER_DEVTO_API_KEY = 'test-key';
	process.env.PUBLISH_IMAGE_BASE_URL = 'https://example.com/assets/';
	const articlePath = writeFixture('dev-rich.md', validArticle({
		image: true,
		extraFrontmatter: 'canonical_url: https://blog.lienjack.com/en/example/\ntags: [Agent, Claude, Astro, Publish, Extra]\n',
	}));
	const article = readArticle(articlePath);

	const inspection = inspectDevArticle(article);
	assert.deepEqual(inspection.blockers, []);
	assert.equal(inspection.imageMode, 'base-url');
	assert.equal(inspection.localImageRefs.length, 1);
	assert.equal(inspection.canonicalUrl, 'https://blog.lienjack.com/en/example/');
	assert.match(inspection.warnings.join('\n'), /up to 4 core tags/);
	assert.match(inspection.commands.status[0], /crier status/);

	restoreEnv('CRIER_DEVTO_API_KEY', previous);
	restoreEnv('PUBLISH_IMAGE_BASE_URL', previousBase);
});

test('Zenn topics prefer zenn_topics and cap at five', () => {
	const articlePath = writeFixture('zenn-topics.md', validArticle({
		extraFrontmatter: 'zenn_topics: [Agent, ClaudeCode, Astro, Publish, Zenn, Extra]\n',
	}));
	const article = readArticle(articlePath);

	assert.deepEqual(zennTopics(article), ['agent', 'claudecode', 'astro', 'publish', 'zenn']);
});

test('Zenn preparation writes markdown and copies local images', () => {
	const zennRepo = path.join(fixtureDir, 'zenn-repo');
	mkdirSync(path.join(zennRepo, 'articles'), { recursive: true });
	mkdirSync(path.join(zennRepo, 'images'), { recursive: true });
	const previousRepo = process.env.ZENN_REPO_DIR;
	process.env.ZENN_REPO_DIR = path.relative(repoRoot, zennRepo);
	const articlePath = writeFixture('zenn-image.md', validArticle({ image: true }));
	const article = readArticle(articlePath);

	const inspection = inspectZennArticle(article);
	assert.deepEqual(inspection.blockers, []);
	const result = prepareZennArticle(article, { published: false });

	assert.equal(existsSync(result.articlePath), true);
	assert.equal(result.copiedImages.length, 1);
	assert.match(readFile(result.articlePath), /published: false/);

	restoreEnv('ZENN_REPO_DIR', previousRepo);
});

test('Qiita inspection requires token and tags', () => {
	const previous = process.env.QIITA_ACCESS_TOKEN;
	delete process.env.QIITA_ACCESS_TOKEN;
	delete process.env.QIITA_TOKEN;
	const articlePath = writeFixture('qiita-missing.md', validArticle({
		extraFrontmatter: 'tags: []\n',
	}));
	const article = readArticle(articlePath);

	const inspection = inspectQiitaArticle(article);
	assert.match(inspection.blockers.join('\n'), /Missing QIITA_ACCESS_TOKEN/);
	assert.match(inspection.blockers.join('\n'), /missing frontmatter tags or qiita_tags/);

	restoreEnv('QIITA_ACCESS_TOKEN', previous);
});

test('Qiita tags prefer qiita_tags and cap at five', () => {
	const articlePath = writeFixture('qiita-tags.md', validArticle({
		extraFrontmatter: 'qiita_tags: [Astro, Qiita, Agent]\n',
	}));
	const article = readArticle(articlePath);

	assert.deepEqual(qiitaTags(article), ['Astro', 'Qiita', 'Agent']);
});

test('Qiita preparation writes body and API payload with public image URLs', async () => {
	const previousToken = process.env.QIITA_ACCESS_TOKEN;
	const previousBase = process.env.QIITA_IMAGE_BASE_URL;
	process.env.QIITA_ACCESS_TOKEN = 'test-token';
	process.env.QIITA_IMAGE_BASE_URL = 'https://example.com/blog-assets/';
	const articlePath = writeFixture('qiita-image.md', validArticle({ image: true }));
	const article = readArticle(articlePath);

	const inspection = inspectQiitaArticle(article, { private: false, tweet: true });
	assert.deepEqual(inspection.blockers, []);
	assert.equal(inspection.imageMode, 'base-url');
	const result = await prepareQiitaArticle(article, fixtureDir, { private: false, tweet: true });
	const payload = readJson(result.payloadPath);

	assert.equal(payload.private, false);
	assert.equal(payload.tweet, true);
	assert.equal(payload.title, 'Test Article');
	assert.deepEqual(payload.tags, [
		{ name: 'Agent', versions: [] },
		{ name: 'Publish', versions: [] },
	]);
	assert.match(payload.body, /https:\/\/example\.com\/blog-assets\/assets\/diagram\.png/);

	restoreEnv('QIITA_ACCESS_TOKEN', previousToken);
	restoreEnv('QIITA_IMAGE_BASE_URL', previousBase);
});

test('Japanese platform dry run plans Zenn and public Qiita when published', () => {
	const zennRepo = path.join(fixtureDir, 'ja-zenn-repo');
	mkdirSync(path.join(zennRepo, 'articles'), { recursive: true });
	const articlePath = writeFixture('ja-platform.md', validArticle());

	const output = execFileSync(
		'node',
		['publish/bin/publish-ja', '--dry-run', '--published', articlePath],
		{
			cwd: repoRoot,
			encoding: 'utf8',
			env: {
				...process.env,
				ZENN_REPO_DIR: path.relative(repoRoot, zennRepo),
				QIITA_ACCESS_TOKEN: 'test-token',
			},
		},
	);

	assert.match(output, /Japanese publish summary/);
	assert.match(output, /Qiita visibility: public/);
	assert.match(output, /Qiita item: new item/);
});

test('Chinese inspection requires heroImage for draft readiness', () => {
	const articlePath = writeFixture('cn.md', validArticle({ omitHero: true }));
	const article = readArticle(articlePath);

	const inspection = inspectChineseArticle(article);
	assert.match(inspection.blockers.join('\n'), /heroImage is required/);
	assert.equal(inspection.platforms.length, 3);
});

test('Chinese inspection blocks long WeChat titles without a short title', () => {
	const articlePath = writeFixture('cn-long-title.md', validArticle({
		title: '这是一个明确超过三十二个字的微信公众号标题用来验证短标题阻塞逻辑不要盲目发布',
	}));
	const article = readArticle(articlePath);

	const inspection = inspectChineseArticle(article);
	assert.match(inspection.blockers.join('\n'), /longer than 32 characters/);
	assert.equal(inspection.commands.juejin.dryRun[0].includes('-p juejin'), true);
	assert.equal(inspection.commands.zhihu.dryRun[0].includes('-p zhihu'), true);
});

test('Chinese inspection records md2wechat autumn-warm chain with short title', () => {
	const articlePath = writeFixture('cn-short-title.md', validArticle({
		title: '这是一个明确超过三十二个字的微信公众号标题用来验证短标题通过逻辑不要盲目发布',
		extraFrontmatter: 'wechatTitle: 短标题\n',
		image: true,
	}));
	const article = readArticle(articlePath);

	const inspection = inspectChineseArticle(article);
	assert.deepEqual(inspection.blockers, []);
	assert.equal(inspection.titles.wechat, '短标题');
	assert.match(inspection.commands.wechat.convert[0], /--theme autumn-warm/);
	assert.equal(inspection.commands.wechat.uploadImages.length, 1);
	assert.equal(inspection.acceptance[0].confirmedNoOfficialPublish, true);
});

test('Chinese inspection includes WeChat code handling templates', () => {
	const articlePath = writeFixture('cn-code.md', `${validArticle()}
\`\`\`text
Step 1 -> inspect
Step 2 -> convert
\`\`\`

\`\`\`js
const value = "a long but real code line that should stay readable in the WeChat article output";
\`\`\`
`);
	const article = readArticle(articlePath);

	const inspection = inspectChineseArticle(article);
	assert.equal(inspection.codeBlocks.length, 2);
	assert.equal(inspection.codeHandling.summary.textNote, 1);
	assert.equal(inspection.codeHandling.templates.textNote, 'wechat-note-block');
	assert.equal(inspection.codeHandling.templates.codeShell, 'mdnice-hljs-code-shell');
	assert.match(inspection.commands.wechat.staticChecks[1], /mdnice编辑器|code class=\\"hljs\\"|note-block/);
});

test.beforeEach(() => {
	rmSync(fixtureDir, { recursive: true, force: true });
	mkdirSync(fixtureDir, { recursive: true });
});

function validArticle({ image = false, omitHero = false, extraFrontmatter = '', title = 'Test Article' } = {}) {
	const imageLine = image ? '![Diagram](./assets/diagram.png)\n' : '';
	const hero = omitHero ? '' : 'heroImage: ./assets/cover.png\n';
	return `---
title: ${title}
description: Test description
author: Tester
tags: [Agent, Publish]
${hero}${extraFrontmatter}---

${imageLine}Body
`;
}

function writeFixture(name, contents) {
	const filePath = path.join(fixtureDir, name);
	mkdirSync(path.dirname(filePath), { recursive: true });
	mkdirSync(path.join(fixtureDir, 'assets'), { recursive: true });
	writeFileSync(path.join(fixtureDir, 'assets', 'cover.png'), tinyPng());
	writeFileSync(path.join(fixtureDir, 'assets', 'diagram.png'), tinyPng());
	writeFileSync(filePath, contents);
	return filePath;
}

function tinyPng() {
	return Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lY7aLgAAAABJRU5ErkJggg==',
		'base64',
	);
}

function readJson(filePath) {
	return JSON.parse(readFile(filePath));
}

function readFile(filePath) {
	return readFileSync(filePath, 'utf8');
}

function restoreEnv(key, value) {
	if (value === undefined) {
		delete process.env[key];
	} else {
		process.env[key] = value;
	}
}
