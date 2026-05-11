import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { repoRoot } from '../../translate/lib/common.mjs';
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
