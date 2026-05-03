export const LOCALES = ['zh', 'en', 'ja'] as const;
export const DEFAULT_LOCALE = 'zh';

export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
	zh: '中文',
	en: 'English',
	ja: '日本語',
};

export const LOCALE_TO_HTML_LANG: Record<Locale, string> = {
	zh: 'zh-CN',
	en: 'en',
	ja: 'ja',
};

export const LOCALE_TO_OG_LOCALE: Record<Locale, string> = {
	zh: 'zh_CN',
	en: 'en_US',
	ja: 'ja_JP',
};
