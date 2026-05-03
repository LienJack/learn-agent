import test from 'node:test';
import assert from 'node:assert/strict';
import { rehype } from 'rehype';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import rehypeMermaid from 'rehype-mermaid';

import rehypeArticleMedia, {
	createMermaidErrorFallback,
} from '../../src/content/blog/plugins/rehype-article-media.ts';

async function renderHtml(input, { path, mermaid = false } = {}) {
	const processor = rehype().data('settings', { fragment: true }).use(rehypeParse, { fragment: true });

	if (mermaid) {
		processor.use(rehypeMermaid, {
			strategy: 'inline-svg',
			errorFallback: createMermaidErrorFallback,
		});
	}

	processor.use(rehypeArticleMedia).use(rehypeStringify);

	const file = await processor.process({
		path,
		value: input,
	});

	return String(file);
}

test('wraps Mermaid output as inline SVG media for zh blog content', async () => {
	const html = await renderHtml('<pre><code class="language-mermaid">flowchart TD\nA-->B\n</code></pre>', {
		path: '/Users/lienli/Documents/GitHub/learn-agent/src/content/blog/zh/test/test.md',
		mermaid: true,
	});

	assert.match(html, /<figure class="article-media" data-media-kind="mermaid"/);
	assert.doesNotMatch(html, /<pre class="mermaid"/);
	assert.match(html, /<svg[^>]+id="mermaid-/);
});

test('wraps markdown images without hiding the image itself', async () => {
	const html = await renderHtml('<p><img src="./diagram.svg" alt="流程图"></p>', {
		path: '/Users/lienli/Documents/GitHub/learn-agent/src/content/blog/zh/test/test.md',
	});

	assert.match(html, /<figure class="article-media" data-media-kind="image"/);
	assert.match(html, /<img src="\.\/diagram\.svg" alt="流程图">/);
});

test('marks tall Mermaid diagrams as preview candidates', async () => {
	const html = await renderHtml(
		'<svg id="mermaid-1" viewBox="0 0 320 960" xmlns="http://www.w3.org/2000/svg"></svg>',
		{
			path: '/Users/lienli/Documents/GitHub/learn-agent/src/content/blog/zh/test/test.md',
		},
	);

	assert.match(html, /data-media-kind="mermaid"/);
	assert.match(html, /data-media-mode="preview"/);
});

test('does not apply zh article media wrappers outside zh blog content', async () => {
	const html = await renderHtml('<p><img src="./diagram.svg" alt="flow"></p>', {
		path: '/Users/lienli/Documents/GitHub/learn-agent/src/content/blog/en/welcome.md',
	});

	assert.doesNotMatch(html, /article-media/);
	assert.match(html, /<p><img src="\.\/diagram\.svg" alt="flow"><\/p>/);
});

test('keeps a diagnosable fallback when Mermaid rendering fails', async () => {
	const html = await renderHtml(
		'<pre><code class="language-mermaid">flowchart TD\nA-->\n</code></pre>',
		{
			path: '/Users/lienli/Documents/GitHub/learn-agent/src/content/blog/zh/test/test.md',
			mermaid: true,
		},
	);

	assert.match(html, /data-media-state="error"/);
	assert.match(html, /data-mermaid-error="true"/);
	assert.match(html, /<code class="language-mermaid">flowchart TD/);
});
