import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stat } from 'node:fs/promises';

async function readDist(path) {
	return readFile(`dist/${path}`, 'utf8');
}

function assertMeta(html, pattern, label) {
	assert.match(html, pattern, `missing ${label}`);
}

test('built Claude Code article exposes article SEO and JSON-LD', async () => {
	const html = await readDist('blog/AI/3.ClaudeCode源码解析/00.系列导读/index.html');

	assertMeta(html, /<link rel="canonical" href="https:\/\/blog\.lienjack\.com\/blog\/AI\/3\.ClaudeCode/, 'canonical');
	assertMeta(html, /<meta property="og:type" content="article">/, 'article og:type');
	assertMeta(html, /<meta property="og:image" content="https:\/\/blog\.lienjack\.com\/_astro\/00-cover-claude-code-runtime/, 'article image');
	assertMeta(html, /"@type":"BlogPosting"/, 'BlogPosting JSON-LD');
	assertMeta(html, /"@type":"BreadcrumbList"/, 'breadcrumb JSON-LD');
	assertMeta(html, /"name":"Claude code 源码解析"/, 'series breadcrumb');
	assert.doesNotMatch(html, /undefined/);
});

test('built RAG article without a hero image uses stable fallback sharing image', async () => {
	const html = await readDist('blog/AI/2.Rag/06.索引优化/index.html');

	assertMeta(html, /<meta property="og:type" content="article">/, 'article og:type');
	assertMeta(html, /<meta property="og:image" content="https:\/\/blog\.lienjack\.com\/social\/lien-jack-share\.jpg">/, 'fallback og:image');
	assertMeta(html, /<meta property="twitter:image" content="https:\/\/blog\.lienjack\.com\/social\/lien-jack-share\.jpg">/, 'fallback twitter:image');
	assertMeta(html, /<meta property="og:image:alt" content="Lien Jack share image">/, 'fallback og:image:alt');
	assertMeta(html, /"@type":"BlogPosting"/, 'BlogPosting JSON-LD');
	assertMeta(html, /"image":\["https:\/\/blog\.lienjack\.com\/social\/lien-jack-share\.jpg"\]/, 'fallback JSON-LD image');
	assertMeta(html, /"author":\{"@type":"Person","@id":"https:\/\/blog\.lienjack\.com\/lien-jack#lien-jack","name":"Lien Jack","alternateName":\["LienJack"\],"url":"https:\/\/blog\.lienjack\.com\/lien-jack","sameAs":\["https:\/\/github\.com\/LienJack"\]\}/, 'normalized author JSON-LD');
	assert.doesNotMatch(html, /undefined/);
});

test('built home and about pages expose personal identity and social sharing metadata', async () => {
	const home = await readDist('index.html');
	const about = await readDist('about/index.html');
	const identity = await readDist('lien-jack/index.html');
	const enAbout = await readDist('en/about/index.html');
	const enIdentity = await readDist('en/lien-jack/index.html');
	const jaAbout = await readDist('ja/about/index.html');
	const jaIdentity = await readDist('ja/lien-jack/index.html');
	const combined = `${home}\n${about}\n${identity}\n${enAbout}\n${enIdentity}\n${jaAbout}\n${jaIdentity}`;

	for (const html of [home, about, identity, enAbout, enIdentity, jaAbout, jaIdentity]) {
		assertMeta(html, /<meta property="og:image" content="https:\/\/blog\.lienjack\.com\/social\/lien-jack-share\.jpg">/, 'default og:image');
		assertMeta(html, /<meta property="twitter:image" content="https:\/\/blog\.lienjack\.com\/social\/lien-jack-share\.jpg">/, 'default twitter:image');
		assertMeta(html, /<meta property="og:image:alt" content="Lien Jack share image">/, 'default og:image:alt');
		assertMeta(html, /<link rel="alternate" type="text\/markdown" href="\/llms\.txt" title="LLM summary for Learn Agent">/, 'llms.txt discovery link');
	}

	assertMeta(home, /<title>Lien Jack 的 Learn Agent · Learn- Agent<\/title>/, 'home title includes Lien Jack');
	assertMeta(home, /<meta name="description" content="Lien Jack 的 AI Agent/, 'home description includes Lien Jack');
	assertMeta(home, /href="\/lien-jack">\s*Lien Jack\s*<\/a>/, 'home header links to identity page');
	assertMeta(home, /"@id":"https:\/\/blog\.lienjack\.com\/lien-jack#lien-jack"/, 'home Person id');
	assertMeta(about, /"@type":"Person"/, 'about Person JSON-LD');
	assertMeta(about, /"@id":"https:\/\/blog\.lienjack\.com\/lien-jack#lien-jack"/, 'person id');
	assertMeta(about, /"mainEntityOfPage":\{"@type":"WebPage","@id":"https:\/\/blog\.lienjack\.com\/about"\}/, 'about entity page');
	assertMeta(identity, /<link rel="canonical" href="https:\/\/blog\.lienjack\.com\/lien-jack">/, 'identity canonical');
	assertMeta(identity, /<title>Lien Jack - Agent Builder \/ 全栈与产品工程师 · Learn- Agent<\/title>/, 'identity title');
	assertMeta(about, /"name":"Lien Jack"/, 'person name');
	assertMeta(about, /"alternateName":\["LienJack"\]/, 'person alias');
	assertMeta(about, /"sameAs":\["https:\/\/github\.com\/LienJack"\]/, 'GitHub sameAs');
	assertMeta(about, /"subjectOf":\[/, 'representative content');
	assertMeta(enAbout, /"mainEntityOfPage":\{"@type":"WebPage","@id":"https:\/\/blog\.lienjack\.com\/en\/about"\}/, 'English about entity page');
	assertMeta(enIdentity, /<link rel="canonical" href="https:\/\/blog\.lienjack\.com\/en\/lien-jack">/, 'English identity canonical');
	assertMeta(jaAbout, /"mainEntityOfPage":\{"@type":"WebPage","@id":"https:\/\/blog\.lienjack\.com\/ja\/about"\}/, 'Japanese about entity page');
	assertMeta(jaIdentity, /<link rel="canonical" href="https:\/\/blog\.lienjack\.com\/ja\/lien-jack">/, 'Japanese identity canonical');
	assert.doesNotMatch(combined, /undefined|\/Users|Photos Library|photoslibrary|file:\/\//i);
});

test('built series pages expose collection SEO and core article links', async () => {
	const harness = await readDist('blog/AI/build-harness/index.html');
	const rag = await readDist('blog/AI/2.Rag/index.html');

	assertMeta(harness, /"@type":"CollectionPage"/, 'Build Harness CollectionPage');
	assertMeta(harness, /"@type":"BreadcrumbList"/, 'Build Harness breadcrumb');
	assertMeta(harness, /href="\/blog\/AI\/build-harness\/00-01-agent-not-a-prompt"/, 'Build Harness start link');
	assertMeta(rag, /"@type":"CollectionPage"/, 'RAG CollectionPage');
	assertMeta(rag, /href="\/blog\/AI\/2\.Rag\/06\.索引优化"/, 'RAG index optimization link');
	assert.doesNotMatch(harness + rag, /undefined/);
});

test('robots, sitemap, and RSS expose canonical discovery URLs', async () => {
	const robots = await readDist('robots.txt');
	const sitemapIndex = await readDist('sitemap-index.xml');
	const sitemap = await readDist('sitemap-0.xml');
	const rss = await readDist('rss.xml');

	assert.match(robots, /User-agent: \*/);
	assert.match(robots, /User-agent: OAI-SearchBot\nAllow: \//);
	assert.match(robots, /User-agent: Googlebot\nAllow: \//);
	assert.doesNotMatch(robots, /Disallow:\s*\//);
	assert.match(robots, /Sitemap: https:\/\/blog\.lienjack\.com\/sitemap-index\.xml/);
	assert.match(sitemapIndex, /https:\/\/blog\.lienjack\.com\/sitemap-0\.xml/);
	assert.match(sitemap, /https:\/\/blog\.lienjack\.com\/lien-jack/);
	assert.match(sitemap, /https:\/\/blog\.lienjack\.com\/blog\/AI\/2\.Rag/);
	assert.match(sitemap, /https:\/\/blog\.lienjack\.com\/blog\/AI\/3\.ClaudeCode/);
	assert.match(sitemap, /https:\/\/blog\.lienjack\.com\/blog\/AI\/build-harness/);
	assert.match(sitemap, /<lastmod>\d{4}-\d{2}-\d{2}T/);
	assert.doesNotMatch(sitemap, /localhost|127\.0\.0\.1|file:\/\//);
	assert.match(rss, /<link>https:\/\/blog\.lienjack\.com\/blog\/AI\/2\.Rag\/06.%E7%B4%A2%E5%BC%95%E4%BC%98%E5%8C%96<\/link>/);
});

test('llms.txt and default sharing image are published without local source paths', async () => {
	const llms = await readDist('llms.txt');
	const shareImage = await stat('dist/social/lien-jack-share.jpg');

	assert.match(llms, /# Learn Agent/);
	assert.match(llms, /Public name: Lien Jack/);
	assert.match(llms, /Technical\/account alias: LienJack/);
	assert.match(llms, /Official profile: https:\/\/blog\.lienjack\.com\/lien-jack/);
	assert.match(llms, /GitHub identity anchor: https:\/\/github\.com\/LienJack/);
	assert.match(llms, /Claude Code source analysis/);
	assert.match(llms, /Agent Harness engineering notes/);
	assert.match(llms, /RAG engineering notes/);
	assert.doesNotMatch(llms, /\/Users|Photos Library|photoslibrary|file:\/\//i);
	assert.ok(shareImage.size > 0, 'share image should be emitted');
	assert.ok(shareImage.size < 150_000, 'share image should stay compressed');
});
