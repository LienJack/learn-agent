import type { ImageMetadata } from 'astro';
import {
	DEFAULT_LOCALE,
	LOCALES,
	LOCALE_TO_HTML_LANG,
	type Locale,
} from '../i18n/config.ts';

export const SITE_URL = 'https://blog.lienjack.com';
export const DEFAULT_SHARE_IMAGE = '/blog-covers/ai-reading-robot.svg';

export type SeoPageType = 'website' | 'article' | 'collection';

export type SeoImage = ImageMetadata | string | undefined;

export type AlternateLink = {
	locale: Locale | 'x-default';
	hreflang: string;
	href: string;
};

export type BreadcrumbItem = {
	name: string;
	path: string;
};

export type JsonLdObject = Record<string, unknown>;

export type ArticleJsonLdInput = {
	title: string;
	description: string;
	path: string;
	locale: Locale;
	image?: SeoImage;
	pubDate: Date | string;
	updatedDate?: Date | string;
	author?: string;
	breadcrumbs?: BreadcrumbItem[];
};

export type CollectionJsonLdInput = {
	title: string;
	description: string;
	path: string;
	locale: Locale;
	image?: SeoImage;
	items?: Array<{
		name: string;
		path: string;
		description?: string;
	}>;
	breadcrumbs?: BreadcrumbItem[];
};

function getSiteUrl(site: string | URL | undefined = SITE_URL): string {
	return site instanceof URL ? site.href : site;
}

function isLocaleSegment(value: string | undefined): value is Locale {
	return typeof value === 'string' && LOCALES.includes(value as Locale);
}

function normalizePath(pathname: string): string {
	if (!pathname || pathname === '/') {
		return '/';
	}

	const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
	return withLeadingSlash.replace(/\/+$/, '') || '/';
}

function stripLocaleFromPathname(pathname: string): string {
	const normalizedPath = normalizePath(pathname);
	const segments = normalizedPath.split('/').filter(Boolean);

	if (segments.length === 0) {
		return '/';
	}

	if (isLocaleSegment(segments[0])) {
		return normalizePath(`/${segments.slice(1).join('/')}`);
	}

	return normalizedPath;
}

function localizePath(locale: Locale, pathname: string): string {
	const normalizedPath = stripLocaleFromPathname(pathname);

	if (locale === DEFAULT_LOCALE) {
		return normalizedPath;
	}

	return normalizedPath === '/' ? `/${locale}` : `/${locale}${normalizedPath}`;
}

function normalizeUrlPath(pathname: string): string {
	const [pathOnly, hash = ''] = pathname.split('#');
	const normalized = normalizePath(pathOnly);
	return hash ? `${normalized}#${hash}` : normalized;
}

export function buildAbsoluteUrl(pathname: string, site?: string | URL): string {
	return new URL(encodeURI(normalizeUrlPath(pathname)), getSiteUrl(site)).href;
}

export function buildCanonicalUrl(pathname: string, site?: string | URL): string {
	return buildAbsoluteUrl(pathname, site);
}

export function resolveImageUrl(image: SeoImage, site?: string | URL): string {
	if (typeof image === 'string' && image.trim()) {
		return buildAbsoluteUrl(image, site);
	}

	if (image && typeof image === 'object' && 'src' in image && image.src) {
		return buildAbsoluteUrl(image.src, site);
	}

	return buildAbsoluteUrl(DEFAULT_SHARE_IMAGE, site);
}

export function buildSelfAlternate(
	locale: Locale,
	pathname: string,
	site?: string | URL,
): AlternateLink[] {
	return [
		{
			locale,
			hreflang: LOCALE_TO_HTML_LANG[locale],
			href: buildAbsoluteUrl(pathname, site),
		},
	];
}

export function buildLocalizedShellAlternates(pathname: string, site?: string | URL): AlternateLink[] {
	const basePath = stripLocaleFromPathname(pathname);
	const alternates = LOCALES.map((locale) => ({
		locale,
		hreflang: LOCALE_TO_HTML_LANG[locale],
		href: buildAbsoluteUrl(localizePath(locale, basePath), site),
	}));

	return [
		...alternates,
		{
			locale: 'x-default' as const,
			hreflang: 'x-default',
			href: buildAbsoluteUrl(localizePath(DEFAULT_LOCALE, basePath), site),
		},
	];
}

export function buildDefaultAlternates(
	locale: Locale,
	pathname: string,
	site?: string | URL,
): AlternateLink[] {
	const shellPaths = new Set(['/', '/about', '/blog']);
	const basePath = stripLocaleFromPathname(pathname);

	if (shellPaths.has(basePath)) {
		return buildLocalizedShellAlternates(pathname, site);
	}

	return buildSelfAlternate(locale, pathname, site);
}

export function buildBreadcrumbJsonLd(
	breadcrumbs: BreadcrumbItem[],
	site?: string | URL,
): JsonLdObject {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: breadcrumbs.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			item: buildAbsoluteUrl(item.path, site),
		})),
	};
}

export function buildArticleJsonLd(input: ArticleJsonLdInput, site?: string | URL): JsonLdObject {
	const canonicalUrl = buildCanonicalUrl(input.path, site);
	const imageUrl = resolveImageUrl(input.image, site);
	const authorName = input.author || 'Lien Jack';

	return {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		mainEntityOfPage: {
			'@type': 'WebPage',
			'@id': canonicalUrl,
		},
		headline: input.title,
		description: input.description,
		inLanguage: LOCALE_TO_HTML_LANG[input.locale],
		image: [imageUrl],
		datePublished: new Date(input.pubDate).toISOString(),
		dateModified: new Date(input.updatedDate ?? input.pubDate).toISOString(),
		author: {
			'@type': 'Person',
			name: authorName,
		},
		publisher: {
			'@type': 'Organization',
			name: 'Learn- Agent',
			logo: {
				'@type': 'ImageObject',
				url: buildAbsoluteUrl('/favicon.svg', site),
			},
		},
		url: canonicalUrl,
	};
}

export function buildCollectionJsonLd(input: CollectionJsonLdInput, site?: string | URL): JsonLdObject {
	const canonicalUrl = buildCanonicalUrl(input.path, site);

	return {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: input.title,
		description: input.description,
		inLanguage: LOCALE_TO_HTML_LANG[input.locale],
		image: resolveImageUrl(input.image, site),
		url: canonicalUrl,
		mainEntity: {
			'@type': 'ItemList',
			itemListElement: (input.items ?? []).map((item, index) => ({
				'@type': 'ListItem',
				position: index + 1,
				url: buildAbsoluteUrl(item.path, site),
				name: item.name,
				description: item.description,
			})),
		},
	};
}

export function compactJsonLd(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(compactJsonLd).filter((item) => item !== undefined);
	}

	if (!value || typeof value !== 'object') {
		return value;
	}

	return Object.fromEntries(
		Object.entries(value)
			.filter(([, item]) => item !== undefined)
			.map(([key, item]) => [key, compactJsonLd(item)]),
	);
}

export function serializeJsonLd(jsonLd: JsonLdObject | JsonLdObject[]): string {
	return JSON.stringify(compactJsonLd(jsonLd));
}
