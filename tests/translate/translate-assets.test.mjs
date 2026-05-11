import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { repoRoot } from '../../translate/lib/common.mjs';
import { detectTextResidue, expectedPipelineAssets, reviewAssetPlan } from '../../translate/lib/assets.mjs';
import { cleanMermaidOutput, extractMermaidBlocks, planMermaidAssets } from '../../translate/lib/mermaid.mjs';
import { planOrdinaryImages } from '../../translate/lib/images.mjs';
import { loadPipeline } from '../../translate/lib/pipelines.mjs';

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

	assert.deepEqual(blocks, ['flowchart TB\n  A --> B', 'sequenceDiagram\n  A->>B: hi']);
});

test('cleans fenced Mermaid output to pure source', () => {
	assert.equal(cleanMermaidOutput('```mermaid\nflowchart TB\nA-->B\n```'), 'flowchart TB\nA-->B\n');
});

test('plans Mermaid assets with only filter', () => {
	const pipeline = loadPipeline('claude-code-series');
	const plan = planMermaidAssets({
		pipeline,
		language: 'en',
		only: ['01-engineering-architecture-mermaid-01.png'],
		artifactDir: path.join(repoRoot, 'tmp', 'translate-tests', 'artifacts'),
	});

	assert.equal(plan.items.length, 1);
	assert.equal(plan.items[0].block, 1);
	assert.equal(plan.items[0].target.endsWith('01-engineering-architecture-mermaid-01.png'), true);
	assert.match(plan.blockers.join('\n'), /Mermaid block 1 not found/);
});

test('ordinary image planning excludes Mermaid assets and preserves format', async () => {
	const pipeline = loadPipeline('claude-code-series');
	const plan = await planOrdinaryImages({
		pipeline,
		language: 'en',
		only: ['00-cover-claude-code-runtime.jpg'],
	});

	assert.equal(plan.items.length, 1);
	assert.equal(plan.items[0].output_format, 'jpeg');
	assert.equal(plan.items[0].width > 0, true);
	assert.equal(plan.items[0].target.includes('src/content/blog/en/AI/Claude code/assets'), true);
});

test('asset plan review blocks ordinary images in the Mermaid stage', () => {
	const pipeline = loadPipeline('claude-code-series');
	const summary = {
		stages: {
			mermaid: {
				items: [{
					file: 'cover.png',
					source: 'src/content/blog/zh/AI/3.ClaudeCode源码解析/assets/cover.png',
					target: 'src/content/blog/en/AI/Claude code/assets/cover.png',
				}],
				blockers: [],
				warnings: [],
			},
		},
	};
	const review = reviewAssetPlan({
		pipeline,
		language: 'en',
		stages: ['mermaid'],
		summary,
	});

	assert.equal(review.status, 'blocked');
	assert.match(review.blockers.join('\n'), /Mermaid stage target/);
});

test('asset plan review blocks real image execution without provider config', async () => {
	const pipeline = loadPipeline('claude-code-series');
	const previousApiKey = process.env.OPENAI_API_KEY;
	const previousImageBaseUrl = process.env.OPENAI_IMAGE_BASE_URL;
	const previousBaseUrl = process.env.OPENAI_BASE_URL;
	delete process.env.OPENAI_API_KEY;
	delete process.env.OPENAI_IMAGE_BASE_URL;
	delete process.env.OPENAI_BASE_URL;
	const imagePlan = await planOrdinaryImages({
		pipeline,
		language: 'en',
		only: ['00-cover-claude-code-runtime.jpg'],
	});
	const review = reviewAssetPlan({
		pipeline,
		language: 'en',
		stages: ['images'],
		summary: { stages: { images: imagePlan } },
		execution: true,
	});

	assert.equal(review.status, 'blocked');
	assert.match(review.blockers.join('\n'), /image provider config missing/i);
	restoreEnv('OPENAI_API_KEY', previousApiKey);
	restoreEnv('OPENAI_IMAGE_BASE_URL', previousImageBaseUrl);
	restoreEnv('OPENAI_BASE_URL', previousBaseUrl);
});

test('expected pipeline assets include both Mermaid and ordinary image assets', () => {
	const pipeline = loadPipeline('claude-code-series');
	const assets = expectedPipelineAssets(pipeline, 'ja');

	assert.ok(assets.some((asset) => asset.assetType === 'mermaid' && asset.file === '01-engineering-architecture-mermaid-01.png'));
	assert.ok(assets.some((asset) => asset.assetType === 'ordinary-image' && asset.file === '00-cover-claude-code-runtime.jpg'));
});

test('text residue detection separates blockers and manual review', () => {
	assert.equal(detectTextResidue('This still has 中文 text', 'en').status, 'blocked');
	assert.equal(detectTextResidue('これは自然な日本語です。', 'ja').status, 'passed');
	assert.equal(detectTextResidue('这是需要复核的中文残留', 'ja').status, 'blocked');
	assert.equal(detectTextResidue('漢字漢字漢字', 'ja').status, 'review_required');
});

function restoreEnv(key, value) {
	if (value === undefined) {
		delete process.env[key];
	} else {
		process.env[key] = value;
	}
}
