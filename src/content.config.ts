import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { LOCALES } from './i18n/config';

const blog = defineCollection({
	// Load Markdown and MDX files in locale-specific directories under `src/content/blog/`.
	loader: glob({
		base: './src/content/blog',
		pattern: ['**/*.{md,mdx}', '!**/assets/**/*.{md,mdx}', '!**/*_old/**/*.{md,mdx}'],
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			author: z.string().optional(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			locale: z.enum(LOCALES).optional(),
			tags: z.array(z.string()).optional(),
			aliases: z.array(z.string()).optional(),
			shortTitle: z.string().optional(),
		}),
});

export const collections = { blog };
