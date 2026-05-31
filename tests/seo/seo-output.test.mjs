import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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
	assertMeta(html, /<meta property="og:image" content="https:\/\/blog\.lienjack\.com\/blog-covers\/ai-reading-robot\.svg">/, 'fallback og:image');
	assertMeta(html, /"@type":"BlogPosting"/, 'BlogPosting JSON-LD');
	assertMeta(html, /"image":\["https:\/\/blog\.lienjack\.com\/blog-covers\/ai-reading-robot\.svg"\]/, 'fallback JSON-LD image');
	assert.doesNotMatch(html, /undefined/);
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
	assert.match(robots, /Sitemap: https:\/\/blog\.lienjack\.com\/sitemap-index\.xml/);
	assert.match(sitemapIndex, /https:\/\/blog\.lienjack\.com\/sitemap-0\.xml/);
	assert.match(sitemap, /https:\/\/blog\.lienjack\.com\/blog\/AI\/2\.Rag/);
	assert.match(sitemap, /https:\/\/blog\.lienjack\.com\/blog\/AI\/3\.ClaudeCode/);
	assert.match(sitemap, /https:\/\/blog\.lienjack\.com\/blog\/AI\/build-harness/);
	assert.doesNotMatch(sitemap, /localhost|127\.0\.0\.1|file:\/\//);
	assert.match(rss, /<link>https:\/\/blog\.lienjack\.com\/blog\/AI\/2\.Rag\/06.%E7%B4%A2%E5%BC%95%E4%BC%98%E5%8C%96<\/link>/);
});
