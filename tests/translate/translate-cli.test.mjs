import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from '../../translate/lib/common.mjs';
import { inspectTranslatedArticle } from '../../translate/lib/checks.mjs';
import { loadPipeline } from '../../translate/lib/pipelines.mjs';

test('translate-en dry-run writes a run record and plan artifact', () => {
	const stdout = execFileSync('node', [
		'translate/bin/translate-en',
		'--dry-run',
		'src/content/blog/zh/AI/3.ClaudeCode源码解析/00.系列导读.md',
	], { cwd: repoRoot, encoding: 'utf8' });
	const recordPath = stdout.match(/Run: (translate\/runs\/[^ \n]+\/record\.json)/)?.[1];
	assert.ok(recordPath);
	const record = JSON.parse(readFileSync(path.join(repoRoot, recordPath), 'utf8'));

	assert.equal(record.status, 'planned');
	assert.equal(record.language, 'en');
	assert.equal(record.inputs[0].target.endsWith('00-series-guide.md'), true);
	assert.equal(existsSync(path.join(repoRoot, record.artifacts[0])), true);
});

test('CLI reports missing file without creating an empty record', () => {
	const result = spawnSync('node', ['translate/bin/translate-en', '--dry-run', 'missing.md'], {
		cwd: repoRoot,
		encoding: 'utf8',
	});

	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /File not found: missing\.md/);
});

test('translate-assets dry-run writes an asset plan', () => {
	const result = spawnSync('node', [
		'translate/bin/translate-assets',
		'--dry-run',
		'--language',
		'en',
		'--stage',
		'mermaid',
		'--only',
		'01-engineering-architecture-mermaid-01.png',
	], { cwd: repoRoot, encoding: 'utf8' });
	assert.equal(result.status, 1);
	const stdout = result.stdout;
	const recordPath = stdout.match(/Run: (translate\/runs\/[^ \n]+\/record\.json)/)?.[1];
	const record = JSON.parse(readFileSync(path.join(repoRoot, recordPath), 'utf8'));

	assert.equal(record.status, 'blocked');
	assert.equal(record.artifacts.length, 2);
	assert.ok(record.artifacts.some((artifact) => artifact.endsWith('-assets-review.json')));
});

test('translated article check passes target locale and local assets', async () => {
	const pipeline = loadPipeline('claude-code-series');
	const report = inspectTranslatedArticle(
		path.join(repoRoot, 'src/content/blog/en/AI/Claude code/00-series-guide.md'),
		{ pipeline, language: 'en' },
	);

	assert.equal(report.status, 'passed');
	assert.equal(report.blockers.length, 0);
});
