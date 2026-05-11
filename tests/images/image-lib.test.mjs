import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadDotEnv, repoRoot } from '../../images/lib/common.mjs';
import { readArticle } from '../../images/lib/articles.mjs';
import { createRun, writeRunRecord } from '../../images/lib/records.mjs';
import { planArticleWorkspaces } from '../../images/lib/workspace.mjs';

const fixtureDir = path.join(repoRoot, 'tmp', 'images-tests', 'lib');

test.beforeEach(() => {
	rmSync(fixtureDir, { recursive: true, force: true });
	mkdirSync(fixtureDir, { recursive: true });
});

test('dotenv loading does not override shell-provided values', () => {
	const envPath = path.join(fixtureDir, '.env');
	const previous = process.env.IMAGE_TEST_VALUE;
	process.env.IMAGE_TEST_VALUE = 'from-shell';
	writeFileSync(envPath, 'IMAGE_TEST_VALUE=from-env\nIMAGE_TEST_NEW=from-env\n');

	loadDotEnv(envPath);

	assert.equal(process.env.IMAGE_TEST_VALUE, 'from-shell');
	assert.equal(process.env.IMAGE_TEST_NEW, 'from-env');
	restoreEnv('IMAGE_TEST_VALUE', previous);
	delete process.env.IMAGE_TEST_NEW;
});

test('plans deterministic distinct article workspaces for similar slugs', () => {
	const first = writeArticle('My Article.md', 'First');
	const second = writeArticle('my-article.md', 'Second');
	const articles = [readArticle(first), readArticle(second)];
	const workspaces = planArticleWorkspaces(articles);

	assert.equal(workspaces.length, 2);
	assert.notEqual(workspaces[0].workspaceRelPath, workspaces[1].workspaceRelPath);
	assert.match(workspaces[0].workspaceRelPath, /assets\/my-article/);
});

test('run records scrub sensitive fields', () => {
	const run = createRun({ command: 'article-images', stage: 'all', inputs: ['a.md'] });
	run.record.apiKey = 'secret-value';
	run.record.headers = { authorization: 'Bearer abc.def' };
	writeRunRecord(run.recordPath, run.record);

	const saved = JSON.parse(readFileSync(run.recordPath, 'utf8'));
	assert.equal(saved.apiKey, '[redacted]');
	assert.equal(saved.headers.authorization, '[redacted]');
	rmSync(run.runDir, { recursive: true, force: true });
	rmSync(run.artifactDir, { recursive: true, force: true });
});

function writeArticle(name, title) {
	const filePath = path.join(fixtureDir, name);
	writeFileSync(filePath, `---\ntitle: ${title}\ndescription: Desc\n---\n\nBody\n`);
	return filePath;
}

function restoreEnv(key, value) {
	if (value === undefined) {
		delete process.env[key];
	} else {
		process.env[key] = value;
	}
}
