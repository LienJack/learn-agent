import test from 'node:test';
import assert from 'node:assert/strict';
import { rehype } from 'rehype';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import rehypeArticleMedia from '../../src/content/blog/plugins/rehype-article-media.ts';

async function renderHtml(input, { path } = {}) {
	const processor = rehype()
		.data('settings', { fragment: true })
		.use(rehypeParse, { fragment: true })
		.use(rehypeArticleMedia)
		.use(rehypeStringify);

	const file = await processor.process({
		path,
		value: input,
	});

	return String(file);
}

test('wraps markdown images without hiding the image itself', async () => {
	const html = await renderHtml('<p><img src="./diagram.svg" alt="流程图"></p>', {
		path: '/Users/lienli/Documents/GitHub/learn-agent/src/content/blog/zh/test/test.md',
	});

	assert.match(html, /<figure class="article-media" data-media-kind="image"/);
	assert.match(html, /<img src="\.\/diagram\.svg" alt="流程图">/);
});

test('does not apply zh article media wrappers outside zh blog content', async () => {
	const html = await renderHtml('<p><img src="./diagram.svg" alt="flow"></p>', {
		path: '/Users/lienli/Documents/GitHub/learn-agent/src/content/blog/en/welcome.md',
	});

	assert.doesNotMatch(html, /article-media/);
	assert.match(html, /<p><img src="\.\/diagram\.svg" alt="flow"><\/p>/);
});
