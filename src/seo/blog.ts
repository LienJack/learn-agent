import type { CollectionEntry } from 'astro:content';
import {
	getBlogGroupPageData,
	getBlogSeriesPageData,
	type BlogGroupCard,
	type BlogGroupPageData,
	type BlogSeriesPageData,
} from '../components/blog/blog-index';
import {
	getPostFilePathSegments,
	getPostSlug,
	type BlogEntry,
} from '../content/blog/utils';
import { type Locale } from '../i18n/config';
import { getMessages } from '../i18n/messages';
import { localizePath } from '../i18n/utils';
import {
	buildArticleJsonLd,
	buildBreadcrumbJsonLd,
	buildCollectionJsonLd,
	buildSelfAlternate,
	type BreadcrumbItem,
	type JsonLdObject,
	type SeoImage,
} from './metadata';

type BlogSeoData = {
	canonicalPath: string;
	alternates: ReturnType<typeof buildSelfAlternate>;
	structuredData: JsonLdObject[];
};

function getBlogLabel(locale: Locale): string {
	return getMessages(locale).header.blog;
}

function localizeBlogPath(locale: Locale, pathname: string): string {
	return localizePath(locale, pathname);
}

export async function buildBlogPostSeoData({
	post,
	allPosts,
	locale,
	site,
}: {
	post: BlogEntry;
	allPosts: CollectionEntry<'blog'>[];
	locale: Locale;
	site?: string | URL;
}): Promise<BlogSeoData> {
	const canonicalPath = localizeBlogPath(locale, `/blog/${getPostSlug(post)}`);
	const postSegments = getPostFilePathSegments(post);
	const groupSlug = postSegments[1];
	const seriesSlug = postSegments[2];
	const breadcrumbs: BreadcrumbItem[] = [
		{ name: getBlogLabel(locale), path: localizeBlogPath(locale, '/blog') },
	];

	if (groupSlug) {
		const group = await getBlogGroupPageData(allPosts, locale, groupSlug);
		if (group) {
			breadcrumbs.push({
				name: group.title,
				path: localizeBlogPath(locale, `/blog/${group.path}`),
			});
		}
	}

	if (groupSlug && seriesSlug) {
		const series = await getBlogSeriesPageData(allPosts, locale, groupSlug, seriesSlug);
		if (series) {
			breadcrumbs.push({
				name: series.title,
				path: localizeBlogPath(locale, `/blog/${series.path}`),
			});
		}
	}

	breadcrumbs.push({ name: post.data.title, path: canonicalPath });

	return {
		canonicalPath,
		alternates: buildSelfAlternate(locale, canonicalPath, site),
		structuredData: [
			buildArticleJsonLd(
				{
					title: post.data.title,
					description: post.data.description,
					path: canonicalPath,
					locale,
					image: post.data.heroImage,
					pubDate: post.data.pubDate,
					updatedDate: post.data.updatedDate,
					author: post.data.author,
				},
				site,
			),
			buildBreadcrumbJsonLd(breadcrumbs, site),
		],
	};
}

export function buildBlogCollectionSeoData({
	title,
	description,
	path,
	locale,
	site,
	image,
	group,
	series,
	items,
}: {
	title: string;
	description: string;
	path: string;
	locale: Locale;
	site?: string | URL;
	image?: SeoImage;
	group?: BlogGroupCard | BlogGroupPageData | null;
	series?: BlogSeriesPageData | null;
	items?: Array<{ name: string; path: string; description?: string }>;
}): BlogSeoData {
	const canonicalPath = localizeBlogPath(locale, path);
	const breadcrumbs: BreadcrumbItem[] = [
		{ name: getBlogLabel(locale), path: localizeBlogPath(locale, '/blog') },
	];

	if (group) {
		breadcrumbs.push({
			name: group.title,
			path: localizeBlogPath(locale, `/blog/${group.path}`),
		});
	}

	if (series) {
		breadcrumbs.push({
			name: series.title,
			path: localizeBlogPath(locale, `/blog/${series.path}`),
		});
	}

	return {
		canonicalPath,
		alternates: buildSelfAlternate(locale, canonicalPath, site),
		structuredData: [
			buildCollectionJsonLd(
				{
					title,
					description,
					path: canonicalPath,
					locale,
					image,
					items,
				},
				site,
			),
			buildBreadcrumbJsonLd(breadcrumbs, site),
		],
	};
}
