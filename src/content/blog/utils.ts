import type { CollectionEntry } from 'astro:content';
import { DEFAULT_LOCALE, type Locale } from '../../i18n/config';
import { isLocale } from '../../i18n/utils';

export type BlogEntry = CollectionEntry<'blog'>;

export function getPostLocale(post: BlogEntry): Locale {
	if (post.data.locale) {
		return post.data.locale;
	}

	const [segment] = post.id.split('/');
	return isLocale(segment) ? segment : DEFAULT_LOCALE;
}

export function getPostSlug(post: BlogEntry): string {
	const filePathSegments = getPostFilePathSegments(post);
	const [, ...filePathSlugSegments] = filePathSegments;
	if (filePathSlugSegments.length > 0) {
		return filePathSlugSegments.join('/');
	}

	const segments = post.id.split('/');
	const [, ...slugSegments] = segments;

	if (slugSegments.length === 0) {
		return post.id;
	}

	return slugSegments.join('/');
}

export function getPostSlugSegments(post: BlogEntry): string[] {
	return getPostSlug(post)
		.split('/')
		.map((segment) => segment.trim())
		.filter(Boolean);
}

export function getPostFilePathSegments(post: BlogEntry): string[] {
	const filePath = post.filePath;
	if (!filePath) {
		return [];
	}

	const normalized = filePath.replace(/^src\/content\/blog\//, '').replace(/\.(md|mdx)$/, '');
	return normalized
		.split('/')
		.map((segment) => segment.trim())
		.filter(Boolean);
}

export function getLocalizedPosts(posts: BlogEntry[], locale: Locale): BlogEntry[] {
	return posts.filter((post) => getPostLocale(post) === locale);
}

export function sortPostsChronologically(posts: BlogEntry[]): BlogEntry[] {
	return [...posts].sort((a, b) => {
		const dateDelta = a.data.pubDate.valueOf() - b.data.pubDate.valueOf();
		return dateDelta !== 0 ? dateDelta : a.id.localeCompare(b.id);
	});
}

export function sortPostsReverseChronologically(posts: BlogEntry[]): BlogEntry[] {
	return [...sortPostsChronologically(posts)].reverse();
}

type AdjacentBlogPosts = {
	prevPost: BlogEntry | null;
	nextPost: BlogEntry | null;
};

function getPostSeriesKey(post: BlogEntry): string | null {
	const segments = getPostFilePathSegments(post);
	if (segments.length < 4 || segments.includes('assets')) {
		return null;
	}

	return segments.slice(0, 3).join('/');
}

export function getAdjacentPostsInSameSeries(
	posts: BlogEntry[],
	post: BlogEntry,
	locale: Locale,
): AdjacentBlogPosts {
	const seriesKey = getPostSeriesKey(post);
	const localizedPosts = getLocalizedPosts(posts, locale);
	const candidatePosts = seriesKey
		? localizedPosts.filter((entry) => getPostSeriesKey(entry) === seriesKey)
		: localizedPosts;
	const orderedPosts = sortPostsChronologically(candidatePosts);
	const currentIndex = orderedPosts.findIndex((entry) => entry.id === post.id);

	return {
		prevPost: currentIndex > 0 ? orderedPosts[currentIndex - 1] : null,
		nextPost: currentIndex >= 0 ? orderedPosts[currentIndex + 1] ?? null : null,
	};
}
