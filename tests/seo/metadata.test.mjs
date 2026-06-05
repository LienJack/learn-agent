import test from 'node:test';
import assert from 'node:assert/strict';
import {
	DEFAULT_SHARE_IMAGE,
	DEFAULT_SHARE_IMAGE_ALT,
	buildAbsoluteUrl,
	buildArticleJsonLd,
	buildBreadcrumbJsonLd,
	buildCanonicalUrl,
	buildCollectionJsonLd,
	buildLocalizedShellAlternates,
	buildPersonId,
	buildPersonJsonLd,
	buildSelfAlternate,
	resolveImageUrl,
	serializeJsonLd,
} from '../../src/seo/metadata.ts';

test('builds canonical URLs, fallback images, and BlogPosting JSON-LD for an article', () => {
	const article = buildArticleJsonLd({
		title: 'RAG 索引优化',
		description: '系统梳理 RAG 索引优化如何提升召回与上下文质量。',
		path: '/blog/AI/2.Rag/06.索引优化',
		locale: 'zh',
		pubDate: '2026-05-04',
		updatedDate: '2026-05-05',
		author: 'LienJack',
	});

	assert.equal(
		buildCanonicalUrl('/blog/AI/2.Rag/06.索引优化'),
		'https://blog.lienjack.com/blog/AI/2.Rag/06.%E7%B4%A2%E5%BC%95%E4%BC%98%E5%8C%96',
	);
	assert.equal(DEFAULT_SHARE_IMAGE, '/social/lien-jack-share.jpg');
	assert.equal(DEFAULT_SHARE_IMAGE_ALT, 'Lien Jack share image');
	assert.equal(resolveImageUrl(undefined), 'https://blog.lienjack.com/social/lien-jack-share.jpg');
	assert.equal(article['@type'], 'BlogPosting');
	assert.equal(article.headline, 'RAG 索引优化');
	assert.deepEqual(article.image, ['https://blog.lienjack.com/social/lien-jack-share.jpg']);
	assert.equal(article.mainEntityOfPage['@id'], buildAbsoluteUrl('/blog/AI/2.Rag/06.索引优化'));
	assert.equal(article.author['@id'], 'https://blog.lienjack.com/about#lien-jack');
	assert.equal(article.author.name, 'Lien Jack');
	assert.deepEqual(article.author.alternateName, ['LienJack']);
	assert.deepEqual(article.author.sameAs, ['https://github.com/LienJack']);
	assert.doesNotMatch(serializeJsonLd(article), /undefined/);
});

test('builds Person JSON-LD from the centralized personal identity facts', () => {
	const person = buildPersonJsonLd({ locale: 'zh' });

	assert.equal(buildPersonId(), 'https://blog.lienjack.com/about#lien-jack');
	assert.equal(person['@type'], 'Person');
	assert.equal(person['@id'], 'https://blog.lienjack.com/about#lien-jack');
	assert.equal(person.name, 'Lien Jack');
	assert.deepEqual(person.alternateName, ['LienJack']);
	assert.deepEqual(person.sameAs, ['https://github.com/LienJack']);
	assert.equal(person.url, 'https://blog.lienjack.com/about');
	assert.equal(person.image, 'https://blog.lienjack.com/social/lien-jack-share.jpg');
	assert.match(person.description, /Agent Builder/);
	assert.match(person.description, /全栈/);
	assert.ok(person.knowsAbout.includes('Agent Harness'));
	assert.ok(person.subjectOf.some((item) => item.url === 'https://blog.lienjack.com/blog/AI/build-harness'));
	assert.doesNotMatch(serializeJsonLd(person), /undefined|\/Users|Photos Library|photoslibrary/i);
});

test('builds self-referencing and shell alternates without mixing canonical and hreflang', () => {
	assert.deepEqual(buildSelfAlternate('ja', '/ja/blog/AI/build-harness'), [
		{
			locale: 'ja',
			hreflang: 'ja',
			href: 'https://blog.lienjack.com/ja/blog/AI/build-harness',
		},
	]);

	const alternates = buildLocalizedShellAlternates('/en/blog');
	assert.deepEqual(
		alternates.map((item) => item.hreflang),
		['zh-CN', 'en', 'ja', 'x-default'],
	);
	assert.equal(alternates[0].href, 'https://blog.lienjack.com/blog');
	assert.equal(alternates[1].href, 'https://blog.lienjack.com/en/blog');
	assert.equal(alternates[2].href, 'https://blog.lienjack.com/ja/blog');
	assert.equal(alternates[3].href, 'https://blog.lienjack.com/blog');
});

test('builds collection and breadcrumb JSON-LD from directory metadata inputs', () => {
	const collection = buildCollectionJsonLd({
		title: 'Build Harness',
		description: '从简单 CLI 助手开始，逐步构建 Agent Harness。',
		path: '/blog/AI/build-harness',
		locale: 'zh',
		image: '/blog-covers/build-harness.svg',
		items: [
			{
				name: '从 0 到 1 构建 Agent 与 Harness',
				path: '/blog/AI/build-harness/build-harness',
				description: 'Agent Harness 教程导读。',
			},
		],
	});
	const breadcrumb = buildBreadcrumbJsonLd([
		{ name: '文章', path: '/blog' },
		{ name: 'AI Agent', path: '/blog/AI' },
		{ name: 'Build Harness', path: '/blog/AI/build-harness' },
	]);

	assert.equal(collection['@type'], 'CollectionPage');
	assert.equal(collection.mainEntity.itemListElement[0].url, 'https://blog.lienjack.com/blog/AI/build-harness/build-harness');
	assert.equal(collection.image, 'https://blog.lienjack.com/blog-covers/build-harness.svg');
	assert.equal(breadcrumb['@type'], 'BreadcrumbList');
	assert.equal(breadcrumb.itemListElement.at(-1).name, 'Build Harness');
	assert.doesNotMatch(serializeJsonLd([collection, breadcrumb]), /undefined/);
});
