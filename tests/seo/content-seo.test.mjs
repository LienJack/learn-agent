import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PERSONAL_IDENTITY } from '../../src/seo/identity.ts';

const targetMetaFiles = [
	'src/content/blog/zh/AI/3.ClaudeCode源码解析/_meta.json',
	'src/content/blog/zh/AI/build-harness/_meta.json',
	'src/content/blog/zh/AI/2.Rag/_meta.json',
];

const targetArticleFiles = [
	'src/content/blog/zh/AI/3.ClaudeCode源码解析/00.系列导读.md',
	'src/content/blog/zh/AI/build-harness/build-harness.md',
	'src/content/blog/zh/AI/2.Rag/01.整体步骤.md',
	'src/content/blog/zh/AI/2.Rag/06.索引优化.md',
];

async function readText(path) {
	return readFile(path, 'utf8');
}

function parseFrontmatter(markdown, path) {
	const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
	assert.ok(match, `${path} should include frontmatter`);

	const fields = {};
	for (const line of match[1].split('\n')) {
		const fieldMatch = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
		if (fieldMatch) {
			fields[fieldMatch[1]] = fieldMatch[2].replace(/^["']|["']$/g, '');
		}
	}

	return fields;
}

function assertNaturalDescription(description, path) {
	assert.ok(description, `${path} should include description`);
	assert.ok(description.length >= 35, `${path} description should be specific enough`);
	assert.ok(description.length <= 220, `${path} description should stay summary-sized`);

	for (const keyword of ['RAG', 'Agent', 'Claude Code', 'Harness']) {
		const count = description.match(new RegExp(keyword.replace(' ', '\\s+'), 'gi'))?.length ?? 0;
		assert.ok(count <= 3, `${path} should not repeat "${keyword}" like keyword stuffing`);
	}
}

test('target series metadata has search-intent descriptions without keyword stuffing', async () => {
	for (const path of targetMetaFiles) {
		const meta = JSON.parse(await readText(path));
		assertNaturalDescription(meta.description, path);
		assert.ok(meta.alias || meta.title, `${path} should expose a readable series name`);
		assert.ok(meta.cover, `${path} should expose a stable cover`);
	}
});

test('target articles keep title, description, locale, and natural technical summaries', async () => {
	for (const path of targetArticleFiles) {
		const fields = parseFrontmatter(await readText(path), path);
		assert.ok(fields.title, `${path} should include title`);
		assert.equal(fields.locale, 'zh', `${path} should remain a zh article`);
		assertNaturalDescription(fields.description, path);
	}
});

test('target content lines include verifiable same-topic internal links', async () => {
	const claudeGuide = await readText('src/content/blog/zh/AI/3.ClaudeCode源码解析/00.系列导读.md');
	const harnessGuide = await readText('src/content/blog/zh/AI/build-harness/build-harness.md');
	const ragOverview = await readText('src/content/blog/zh/AI/2.Rag/01.整体步骤.md');
	const ragIndex = await readText('src/content/blog/zh/AI/2.Rag/06.索引优化.md');

	assert.match(claudeGuide, /\]\(\/blog\/AI\/3\.ClaudeCode源码解析\)/);
	assert.match(claudeGuide, /\]\(\/blog\/AI\/build-harness\)/);
	assert.match(harnessGuide, /\]\(\/blog\/AI\/build-harness\)/);
	assert.match(harnessGuide, /\]\(\/blog\/AI\/3\.ClaudeCode源码解析\/00\.系列导读\)/);
	assert.match(ragOverview, /\]\(\/blog\/AI\/2\.Rag\)/);
	assert.match(ragOverview, /\]\(\.\/06\.索引优化\)/);
	assert.match(ragIndex, /\]\(\/blog\/AI\/2\.Rag\)/);
	assert.match(ragIndex, /\]\(\.\/01\.整体步骤\)/);
	assert.match(ragIndex, /\]\(\.\/05\.检索前置处理\)/);
});

test('localized about metadata keeps the same public identity and career signal', async () => {
	const messages = await readText('src/i18n/messages.ts');

	assert.match(messages, /aboutTitle: '关于 Lien Jack'/);
	assert.match(messages, /aboutTitle: 'About Lien Jack'/);
	assert.match(messages, /aboutTitle: 'Lien Jack について'/);
	assert.match(messages, /title: 'Lien Jack'/);
	assert.match(messages, /role: '全栈工程师 \/ Agent Builder'/);
	assert.match(messages, /role: 'Full Stack Engineer \/ Agent Builder'/);
	assert.match(messages, /role: 'フルスタックエンジニア \/ Agent Builder'/);
	assert.match(messages, new RegExp(`href: '${PERSONAL_IDENTITY.githubUrl}'`));
});

test('llms.txt describes identity boundaries without leaking local source paths', async () => {
	const llms = await readText('public/llms.txt');

	assert.match(llms, /Public name: Lien Jack/);
	assert.match(llms, /Technical\/account alias: LienJack/);
	assert.match(llms, /Official profile: https:\/\/blog\.lienjack\.com\/about/);
	assert.match(llms, /GitHub identity anchor: https:\/\/github\.com\/LienJack/);
	assert.match(llms, /contact channels, but they are not used here as same-person identity proof/);
	assert.doesNotMatch(llms, /\/Users|Photos Library|photoslibrary|file:\/\//i);
});
