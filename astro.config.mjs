// @ts-check

import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import rehypeMermaid from 'rehype-mermaid';

// https://astro.build/config
export default defineConfig({
	site: 'https://example.com',
	i18n: {
		defaultLocale: 'zh',
		locales: ['zh', 'en', 'ja'],
		routing: {
			prefixDefaultLocale: false,
		},
	},
	integrations: [mdx(), react(), sitemap()],
	markdown: {
		syntaxHighlight: {
			type: 'shiki',
			excludeLangs: ['mermaid', 'math'],
		},
		rehypePlugins: [[rehypeMermaid, { strategy: 'pre-mermaid' }]],
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
