// @ts-check

import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import rehypeArticleMedia from './src/content/blog/plugins/rehype-article-media.ts';

// https://astro.build/config
export default defineConfig({
	site: 'https://blog.lienjack.com',
	i18n: {
		defaultLocale: 'zh',
		locales: ['zh', 'en', 'ja'],
		routing: {
			prefixDefaultLocale: false,
		},
	},
	integrations: [
		mdx(),
		react(),
		sitemap({
			serialize(item) {
				const url = new URL(item.url);
				if (url.pathname !== '/') {
					url.pathname = url.pathname.replace(/\/$/, '');
					item.url = url.href;
				}
				item.priority =
					url.pathname === '/blog' ||
					url.pathname === '/blog/AI' ||
					url.pathname.startsWith('/blog/AI/')
						? 0.8
						: 0.6;
				return item;
			},
		}),
	],
	markdown: {
		syntaxHighlight: {
			type: 'shiki',
			excludeLangs: ['math'],
		},
		shikiConfig: {
			langAlias: {
				redis: 'shellscript',
				conf: 'ini',
			},
		},
		rehypePlugins: [rehypeArticleMedia],
	},
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Atkinson',
			cssVariable: '--font-atkinson',
			fallbacks: ['sans-serif'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/atkinson-regular.woff'],
						weight: 400,
						style: 'normal',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/atkinson-bold.woff'],
						weight: 700,
						style: 'normal',
						display: 'swap',
					},
				],
			},
		},
	],
});
