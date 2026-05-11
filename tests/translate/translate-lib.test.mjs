import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadDotEnv, repoRoot } from '../../translate/lib/common.mjs';
import { findMarkdownImageRefs, readArticle, cleanModelOutput } from '../../translate/lib/markdown.mjs';
import { createRun, writeRunRecord } from '../../translate/lib/records.mjs';
import { loadPipeline, resolvePipelineFiles } from '../../translate/lib/pipelines.mjs';
import { planTranslations } from '../../translate/lib/translation.mjs';

const fixtureDir = path.join(repoRoot, 'tmp', 'translate-tests');

test.beforeEach(() => {
	rmSync(fixtureDir, { recursive: true, force: true });
	mkdirSync(fixtureDir, { recursive: true });
});

test('dotenv loading does not override shell-provided values', () => {
	const envPath = path.join(fixtureDir, '.env');
	const previous = process.env.TRANSLATE_TEST_VALUE;
	process.env.TRANSLATE_TEST_VALUE = 'from-shell';
	writeFileSync(envPath, 'TRANSLATE_TEST_VALUE=from-env\nTRANSLATE_TEST_NEW=from-env\n');

	loadDotEnv(envPath);

	assert.equal(process.env.TRANSLATE_TEST_VALUE, 'from-shell');
	assert.equal(process.env.TRANSLATE_TEST_NEW, 'from-env');
	restoreEnv('TRANSLATE_TEST_VALUE', previous);
	delete process.env.TRANSLATE_TEST_NEW;
});

test('markdown parser reads frontmatter and ignores image refs inside code fences', () => {
	const articlePath = writeFixture('article.md', `---
title: Test
description: Desc
locale: zh
heroImage: ./assets/cover.png
---

![Real](./assets/real.png)

\`\`\`md
![Ignored](./assets/missing.png)
\`\`\`
`);
	const article = readArticle(articlePath, readFileSync(articlePath, 'utf8'));

	assert.equal(article.data.title, 'Test');
	assert.equal(article.data.locale, 'zh');
	assert.deepEqual(findMarkdownImageRefs(article.raw), [{ alt: 'Real', url: './assets/real.png' }]);
});

test('run records scrub sensitive fields', () => {
	const run = createRun({ command: 'translate-en', language: 'en', pipeline: 'fixture', inputs: ['a.md'] });
	run.record.apiKey = 'secret-value';
	run.record.headers = { authorization: 'Bearer abc.def' };
	writeRunRecord(run.recordPath, run.record);

	const saved = JSON.parse(readFileSync(run.recordPath, 'utf8'));
	assert.equal(saved.apiKey, '[redacted]');
	assert.equal(saved.headers.authorization, '[redacted]');
});

test('pipeline dry-run plan rewrites local article links and preserves asset refs', () => {
	const pipeline = loadPipeline('claude-code-series');
	const source = path.join(repoRoot, pipeline.sourceDir, '00.系列导读.md');
	const plans = resolvePipelineFiles(pipeline, 'en', [source]);
	const planned = planTranslations({ pipeline, language: 'en', plans })[0];

	assert.equal(planned.frontmatter.locale, 'en');
	assert.equal(planned.targetRelPath.endsWith('00-series-guide.md'), true);
	assert.ok(planned.linkRewrites.some((rewrite) => rewrite.to === './01-engineering-architecture'));
	assert.ok(planned.assetRewrites.some((rewrite) => rewrite.from.includes('./assets/')));
});

test('model output cleaning removes chatter and tool fragments', () => {
	const cleaned = cleanModelOutput(`Here is the translation:
Real body
<tool_call>
{"file_path": "/tmp/nope.md"}
`);

	assert.equal(cleaned.markdown, 'Real body\n');
	assert.equal(cleaned.warnings.length, 3);
});

function writeFixture(name, contents) {
	const filePath = path.join(fixtureDir, name);
	mkdirSync(path.dirname(filePath), { recursive: true });
	mkdirSync(path.join(fixtureDir, 'assets'), { recursive: true });
	writeFileSync(path.join(fixtureDir, 'assets', 'cover.png'), tinyPng());
	writeFileSync(path.join(fixtureDir, 'assets', 'real.png'), tinyPng());
	writeFileSync(filePath, contents);
	return filePath;
}

function tinyPng() {
	return Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lY7aLgAAAABJRU5ErkJggg==',
		'base64',
	);
}

function restoreEnv(key, value) {
	if (value === undefined) {
		delete process.env[key];
	} else {
		process.env[key] = value;
	}
}
