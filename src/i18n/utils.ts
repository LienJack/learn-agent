import { DEFAULT_LOCALE, LOCALES, type Locale } from './config';

const SHELL_PATHS = new Set(['/', '/about', '/blog', '/lien-jack']);

export function isLocale(value: string | undefined): value is Locale {
	return typeof value === 'string' && LOCALES.includes(value as Locale);
}

export function normalizePath(pathname: string): string {
	if (!pathname || pathname === '/') {
		return '/';
	}

	const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
	return withLeadingSlash.replace(/\/+$/, '') || '/';
}

export function getLocaleFromPathname(pathname: string): Locale {
	const normalizedPath = normalizePath(pathname);
	const [, maybeLocale] = normalizedPath.split('/');

	return isLocale(maybeLocale) ? maybeLocale : DEFAULT_LOCALE;
}

export function stripLocaleFromPathname(pathname: string): string {
	const normalizedPath = normalizePath(pathname);
	const segments = normalizedPath.split('/').filter(Boolean);

	if (segments.length === 0) {
		return '/';
	}

	if (isLocale(segments[0])) {
		const remainingPath = `/${segments.slice(1).join('/')}`;
		return normalizePath(remainingPath);
	}

	return normalizedPath;
}

export function localizePath(locale: Locale, pathname: string): string {
	const normalizedPath = stripLocaleFromPathname(pathname);

	if (locale === DEFAULT_LOCALE) {
		return normalizedPath;
	}

	if (normalizedPath === '/') {
		return `/${locale}`;
	}

	return `/${locale}${normalizedPath}`;
}

export function getSwitchLocalePath(locale: Locale, pathname: string): string {
	const normalizedPath = stripLocaleFromPathname(pathname);
	const targetPath = SHELL_PATHS.has(normalizedPath) ? normalizedPath : '/';
	return localizePath(locale, targetPath);
}

export function isShellPath(pathname: string): boolean {
	return SHELL_PATHS.has(stripLocaleFromPathname(pathname));
}
