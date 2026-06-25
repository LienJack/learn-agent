import type { ImageMetadata } from 'astro';
import type { CollectionEntry } from 'astro:content';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import fallbackCover1 from '../../assets/blog-placeholder-1.jpg';
import fallbackCover2 from '../../assets/blog-placeholder-2.jpg';
import fallbackCover3 from '../../assets/blog-placeholder-3.jpg';
import fallbackCover4 from '../../assets/blog-placeholder-4.jpg';
import fallbackCover5 from '../../assets/blog-placeholder-5.jpg';
import fallbackCover6 from '../../assets/blog-placeholder-about.jpg';
import {
	getLocalizedPosts,
	getPostFilePathSegments,
	sortPostsChronologically,
	type BlogEntry,
} from '../../content/blog/utils';
import type { Locale } from '../../i18n/config';

export type BlogCover = ImageMetadata | string;

type DirectoryMeta = {
	title?: string;
	alias?: string;
	description?: string;
	cover?: string;
	order?: number;
	hidden?: boolean;
};

export type BlogSeriesCard = {
	slug: string;
	path: string;
	title: string;
	alias?: string;
	description: string;
	cover: BlogCover;
	postCount: number;
	featuredPost?: BlogEntry;
	order: number;
};

export type BlogGroupCard = {
	slug: string;
	path: string;
	title: string;
	alias?: string;
	description: string;
	cover: BlogCover;
	postCount: number;
	series: BlogSeriesCard[];
	order: number;
};

export type BlogSeriesPageData = BlogSeriesCard & {
	group: BlogGroupCard;
	posts: BlogEntry[];
};

export type BlogGroupPageData = BlogGroupCard & {
	posts: BlogEntry[];
};

const CONTENT_ROOT = path.resolve('src/content/blog');
const FALLBACK_COVERS = [
	fallbackCover1,
	fallbackCover2,
	fallbackCover3,
	fallbackCover4,
	fallbackCover5,
	fallbackCover6,
];

function isVisibleDirectoryName(name: string): boolean {
	return !name.startsWith('.') && !name.startsWith('_') && !name.endsWith('_old');
}

function normalizeTitleFromSlug(slug: string): string {
	const cleaned = slug.replace(/^\d+(?:\.\d+)*[._ -]*/, '').trim();
	return cleaned || slug;
}

function resolveDirectoryTitle(meta: DirectoryMeta, slug: string): string {
	return meta.title ?? meta.alias ?? normalizeTitleFromSlug(slug);
}

function getDefaultOrder(slug: string): number {
	const matched = slug.match(/^(\d+(?:\.\d+)*)/);
	if (!matched) {
		return Number.POSITIVE_INFINITY;
	}

	return Number.parseFloat(matched[1]);
}

function getLocaleGroupDescription(locale: Locale, title: string): string {
	if (locale === 'en') {
		return `${title} series organized as a topic shelf.`;
	}

	if (locale === 'ja') {
		return `${title} に関するシリーズをまとめた棚です。`;
	}

	return `${title} 相关内容会按系列整理在这里。`;
}

function getLocaleSeriesDescription(locale: Locale, title: string): string {
	if (locale === 'en') {
		return `${title} notes and articles will continue to grow here.`;
	}

	if (locale === 'ja') {
		return `${title} に関する記事をこのシリーズに継続して追加します。`;
	}

	return `${title} 这一组内容会继续在这里补充。`;
}

function getFallbackCover(key: string): ImageMetadata {
	const hash = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
	return FALLBACK_COVERS[hash % FALLBACK_COVERS.length];
}

function compareByOrderThenSlug<T extends { order: number; slug: string }>(a: T, b: T): number {
	if (a.order !== b.order) {
		return a.order - b.order;
	}

	return a.slug.localeCompare(b.slug, 'zh-Hans-CN-u-co-pinyin');
}

function getGroupSlug(post: BlogEntry): string | null {
	return getPostFilePathSegments(post)[1] ?? null;
}

function getSeriesSlug(post: BlogEntry): string | null {
	return getPostFilePathSegments(post)[2] ?? null;
}

function isGuidePost(post: BlogEntry): boolean {
	const articleSlug = getPostFilePathSegments(post).at(-1);
	return articleSlug?.startsWith('00.') ?? false;
}

function getSeriesGuidePost(posts: BlogEntry[]): BlogEntry | undefined {
	const orderedPosts = sortPostsChronologically(posts);
	return orderedPosts.find((post) => !isGuidePost(post)) ?? orderedPosts[0];
}

async function listChildDirectories(dirPath: string): Promise<string[]> {
	try {
		const entries = await readdir(dirPath, { withFileTypes: true });
		return entries
			.filter((entry) => entry.isDirectory() && isVisibleDirectoryName(entry.name))
			.map((entry) => entry.name);
	} catch {
		return [];
	}
}

async function readDirectoryMeta(dirPath: string): Promise<DirectoryMeta> {
	try {
		const raw = await readFile(path.join(dirPath, '_meta.json'), 'utf8');
		const parsed = JSON.parse(raw) as DirectoryMeta;
		return parsed ?? {};
	} catch {
		return {};
	}
}

function pickCover(
	explicitCover: string | undefined,
	guidePost: BlogEntry | undefined,
	posts: BlogEntry[],
	fallbackKey: string,
): BlogCover {
	if (explicitCover) {
		return explicitCover;
	}

	if (guidePost?.data.heroImage) {
		return guidePost.data.heroImage;
	}

	const firstWithHero = posts.find((post) => post.data.heroImage);
	if (firstWithHero?.data.heroImage) {
		return firstWithHero.data.heroImage;
	}

	return getFallbackCover(fallbackKey);
}

async function discoverBlogGroupCards(
	posts: CollectionEntry<'blog'>[],
	locale: Locale,
): Promise<BlogGroupCard[]> {
	const localizedPosts = getLocalizedPosts(posts, locale);
	const localeRoot = path.join(CONTENT_ROOT, locale);
	const groupSlugs = await listChildDirectories(localeRoot);

	const groupResults = await Promise.all(
		groupSlugs.map(async (groupSlug): Promise<BlogGroupCard | null> => {
			const groupDir = path.join(localeRoot, groupSlug);
			const groupMeta = await readDirectoryMeta(groupDir);
			if (groupMeta.hidden) {
				return null;
			}

			const seriesSlugs = await listChildDirectories(groupDir);

			const groupPosts = localizedPosts.filter((post) => getGroupSlug(post) === groupSlug);
			const seriesResults = await Promise.all(
				seriesSlugs.map(async (seriesSlug): Promise<BlogSeriesCard | null> => {
					const seriesDir = path.join(groupDir, seriesSlug);
					const seriesMeta = await readDirectoryMeta(seriesDir);
					if (seriesMeta.hidden) {
						return null;
					}

					const seriesPosts = groupPosts.filter((post) => getSeriesSlug(post) === seriesSlug);
					const guidePost = getSeriesGuidePost(seriesPosts);
					const title = resolveDirectoryTitle(seriesMeta, seriesSlug);
					const description =
						seriesMeta.description ??
						guidePost?.data.description ??
						seriesPosts[0]?.data.description ??
						getLocaleSeriesDescription(locale, title);

					return {
						slug: seriesSlug,
						path: `${groupSlug}/${seriesSlug}`,
						title,
						alias: seriesMeta.alias,
						description,
						cover: pickCover(seriesMeta.cover, guidePost, seriesPosts, `${groupSlug}/${seriesSlug}`),
						postCount: seriesPosts.length,
						featuredPost: guidePost,
						order: seriesMeta.order ?? getDefaultOrder(seriesSlug),
					};
				}),
			);

			const series: BlogSeriesCard[] = seriesResults
				.filter((item): item is BlogSeriesCard => item !== null)
				.sort(compareByOrderThenSlug);

			const title = resolveDirectoryTitle(groupMeta, groupSlug);
			const groupCover = groupMeta.cover ?? series[0]?.cover ?? getFallbackCover(groupSlug);

			return {
				slug: groupSlug,
				path: groupSlug,
				title,
				alias: groupMeta.alias,
				description: groupMeta.description ?? getLocaleGroupDescription(locale, title),
				cover: groupCover,
				postCount: series.reduce((sum, item) => sum + item.postCount, 0),
				series,
				order: groupMeta.order ?? getDefaultOrder(groupSlug),
			} satisfies BlogGroupCard;
		}),
	);

	return groupResults
		.filter((item): item is BlogGroupCard => item !== null)
		.sort(compareByOrderThenSlug);
}

export async function buildBlogGroupCards(
	posts: CollectionEntry<'blog'>[],
	locale: Locale,
): Promise<BlogGroupCard[]> {
	return discoverBlogGroupCards(posts, locale);
}

export async function hasStructuredBlogGroups(
	posts: CollectionEntry<'blog'>[],
	locale: Locale,
): Promise<boolean> {
	const groups = await buildBlogGroupCards(posts, locale);
	return groups.length > 0;
}

export async function getStructuredBlogStaticPaths(
	posts: CollectionEntry<'blog'>[],
	locale: Locale,
): Promise<string[][]> {
	const groups = await buildBlogGroupCards(posts, locale);
	return groups.flatMap((group) => [
		[group.slug],
		...group.series.map((series) => [group.slug, series.slug]),
	]);
}

export async function getBlogGroupPageData(
	posts: CollectionEntry<'blog'>[],
	locale: Locale,
	slug: string,
): Promise<BlogGroupPageData | null> {
	const groups = await buildBlogGroupCards(posts, locale);
	const group = groups.find((item) => item.slug === slug);
	if (!group) {
		return null;
	}

	const localizedPosts = getLocalizedPosts(posts, locale);
	const groupPosts = localizedPosts.filter((post) => getGroupSlug(post) === slug);

	return {
		...group,
		posts: groupPosts,
	};
}

export async function getBlogSeriesPageData(
	posts: CollectionEntry<'blog'>[],
	locale: Locale,
	groupSlug: string,
	seriesSlug: string,
): Promise<BlogSeriesPageData | null> {
	const group = await getBlogGroupPageData(posts, locale, groupSlug);
	if (!group) {
		return null;
	}

	const series = group.series.find((item) => item.slug === seriesSlug);
	if (!series) {
		return null;
	}

	const seriesPosts = group.posts.filter((post) => {
		return getGroupSlug(post) === groupSlug && getSeriesSlug(post) === seriesSlug;
	});

	return {
		...series,
		group,
		posts: sortPostsChronologically(seriesPosts),
	};
}
