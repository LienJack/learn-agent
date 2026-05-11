import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from '../../images/lib/common.mjs';

const fixtureDir = path.join(repoRoot, 'tmp', 'images-tests', 'cli');

test.beforeEach(() => {
	rmSync(fixtureDir, { recursive: true, force: true });
	mkdirSync(fixtureDir, { recursive: true });
});

test('article-images dry-run writes a batch record and plan artifact for multiple articles', () => {
	const first = writeArticle('one.md', 'One');
	const second = writeArticle('two.md', 'Two');
	const stdout = execFileSync('node', [
		'images/bin/article-images',
		'--dry-run',
		path.relative(repoRoot, first),
		path.relative(repoRoot, second),
	], { cwd: repoRoot, encoding: 'utf8' });
	const recordPath = stdout.match(/Run: (images\/runs\/[^ \n]+\/record\.json)/)?.[1];
	assert.ok(recordPath);
	const record = JSON.parse(readFileSync(path.join(repoRoot, recordPath), 'utf8'));

	assert.equal(record.status, 'planned');
	assert.equal(record.inputs.length, 2);
	assert.equal(record.inputs[0].workspace.includes('assets/one'), true);
	assert.equal(existsSync(path.join(repoRoot, record.artifacts[0])), true);
	rmSync(path.dirname(path.join(repoRoot, recordPath)), { recursive: true, force: true });
	rmSync(path.join(repoRoot, record.artifactDir), { recursive: true, force: true });
});

test('article-images reports missing input without creating an empty run', () => {
	const result = spawnSync('node', ['images/bin/article-images', '--dry-run'], {
		cwd: repoRoot,
		encoding: 'utf8',
	});

	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /Missing markdown file path/);
});

test('article-image-check reports missing referenced image', () => {
	const article = path.join(fixtureDir, 'missing-image.md');
	writeFileSync(article, `---\ntitle: Missing\ndescription: Desc\n---\n\n![Nope](./assets/nope.png)\n`);
	const result = spawnSync('node', ['images/bin/article-image-check', path.relative(repoRoot, article)], {
		cwd: repoRoot,
		encoding: 'utf8',
	});

	assert.notEqual(result.status, 0);
	assert.match(result.stdout, /image not found/);
});

test('article-photo-fallback blocks when provider config is missing', () => {
	const result = spawnSync('node', ['images/bin/article-photo-fallback', 'prompt.md'], {
		cwd: repoRoot,
		encoding: 'utf8',
		env: {
			...process.env,
			OPENAI_API_KEY: '',
			OPENAI_IMAGE_BASE_URL: '',
			OPENAI_BASE_URL: '',
		},
	});

	assert.notEqual(result.status, 0);
	assert.match(result.stdout, /image provider config not found/);
});

test('stage-specific real runs preserve existing manifest assets', () => {
	const article = writeArticle('preserve.md', 'Preserve', { sectionCount: 3 });
	const articleRel = path.relative(repoRoot, article);
	execFileSync('node', ['images/bin/article-images', '--yes', '--stage', 'photos', articleRel], {
		cwd: repoRoot,
		encoding: 'utf8',
	});
	execFileSync('node', ['images/bin/article-images', '--yes', '--stage', 'covers', articleRel], {
		cwd: repoRoot,
		encoding: 'utf8',
	});
	const manifest = JSON.parse(readFileSync(path.join(fixtureDir, 'assets', 'preserve', 'manifest.json'), 'utf8'));

	assert.equal(manifest.assets.some((asset) => asset.kind === 'photo'), true);
	assert.equal(manifest.assets.some((asset) => asset.kind === 'cover'), true);
});

test('compress stage updates existing manifest assets', () => {
	const article = writeArticle('compress.md', 'Compress');
	const workspaceDir = path.join(fixtureDir, 'assets', 'compress');
	mkdirSync(workspaceDir, { recursive: true });
	const pngPath = path.join(workspaceDir, 'diagram.png');
	execFileSync('magick', ['-size', '8x8', 'xc:red', pngPath], { cwd: repoRoot });
	writeFileSync(path.join(workspaceDir, 'manifest.json'), `${JSON.stringify({
		version: 1,
		article: path.relative(repoRoot, article),
		workspace: path.relative(repoRoot, workspaceDir),
		updatedAt: new Date().toISOString(),
		assets: [{
			id: 'manual-01',
			kind: 'photo',
			status: 'imported',
			targetPath: path.relative(repoRoot, pngPath),
			markdownRef: './assets/compress/diagram.png',
		}],
		warnings: [],
		blockers: [],
	}, null, 2)}\n`);

	execFileSync('node', ['images/bin/article-images', '--yes', '--stage', 'compress', path.relative(repoRoot, article)], {
		cwd: repoRoot,
		encoding: 'utf8',
	});
	const manifest = JSON.parse(readFileSync(path.join(workspaceDir, 'manifest.json'), 'utf8'));

	assert.equal(manifest.assets[0].compressionStatus === 'compressed' || manifest.assets[0].compressionStatus === 'unchanged', true);
	assert.equal(typeof manifest.assets[0].bytes, 'number');
});

function writeArticle(name, title, { sectionCount = 1 } = {}) {
	const filePath = path.join(fixtureDir, name);
	const sections = Array.from({ length: sectionCount }, (_, index) => `## 机制 ${index + 1}\n\n这个章节解释 agent workflow 的机制、流程、状态变化、API 调用和 context 管理。这个说明足够长，适合生成图解。这个段落继续补充模型、prompt、context、tool 和状态生命周期之间的关系。\n\n- 输入\n- 处理\n- 输出\n`).join('\n');
	writeFileSync(filePath, `---\ntitle: ${title}\ndescription: Desc\n---\n\n${sections}\n\n\`\`\`mermaid\nflowchart TB\nA --> B\n\`\`\`\n`);
	return filePath;
}
