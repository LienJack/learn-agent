import type { Locale } from '../i18n/config.ts';

type LocalizedText = Record<Locale, string>;

export type RepresentativeContent = {
	name: string;
	path: string;
	description: LocalizedText;
};

export const PERSONAL_IDENTITY = {
	name: 'Lien Jack',
	alternateNames: ['LienJack'],
	role: 'Agent Builder + Full-stack/Product Engineer',
	githubUrl: 'https://github.com/LienJack',
	shareImagePath: '/social/lien-jack-share.jpg',
	shareImageAlt: 'Lien Jack share image',
	officialPathByLocale: {
		zh: '/lien-jack',
		en: '/en/lien-jack',
		ja: '/ja/lien-jack',
	},
	jobTitleByLocale: {
		zh: 'Agent Builder / 全栈与产品工程师',
		en: 'Agent Builder / Full-stack and Product Engineer',
		ja: 'Agent Builder / Full-stack and Product Engineer',
	},
	descriptionByLocale: {
		zh: 'Lien Jack 是东京的 Agent Builder 与全栈/产品工程师，关注 Agent、LLM 工程、AI 原生工作流、产品系统和工程体验。',
		en: 'Lien Jack is a Tokyo-based Agent Builder and full-stack/product engineer focused on agents, LLM engineering, AI-native workflows, product systems, and developer experience.',
		ja: 'Lien Jack は東京を拠点にする Agent Builder / full-stack product engineer で、Agent、LLM engineering、AI-native workflow、product system、developer experience に取り組んでいます。',
	},
	knowsAbout: [
		'Agent engineering',
		'LLM engineering',
		'Claude Code',
		'Agent Harness',
		'RAG',
		'AI-native workflows',
		'Full-stack engineering',
		'Product systems',
		'Developer experience',
	],
	representativeContent: [
		{
			name: 'Claude Code source analysis',
			path: '/blog/AI/3.ClaudeCode源码解析',
			description: {
				zh: 'Claude Code 运行时、上下文、工具、协作和规划机制的源码解析系列。',
				en: 'A source-level series on Claude Code runtime, context, tools, collaboration, and planning.',
				ja: 'Claude Code の runtime、context、tools、collaboration、planning をソースレベルで読むシリーズ。',
			},
		},
		{
			name: 'Agent Harness',
			path: '/blog/AI/build-harness',
			description: {
				zh: '从最小 Agent 循环走向 Harness、工具运行时、记忆治理和托管执行的工程路径。',
				en: 'An engineering path from a minimal agent loop to harnesses, tool runtime, memory governance, and hosted execution.',
				ja: 'Minimal agent loop から harness、tool runtime、memory governance、hosted execution へ進む工学的な道筋。',
			},
		},
		{
			name: 'RAG engineering',
			path: '/blog/AI/2.Rag',
			description: {
				zh: '围绕检索、索引、切分、重排和上下文质量的 RAG 工程笔记。',
				en: 'RAG engineering notes on retrieval, indexing, chunking, reranking, and context quality.',
				ja: 'Retrieval、indexing、chunking、reranking、context quality に関する RAG engineering notes。',
			},
		},
	] satisfies RepresentativeContent[],
} as const;

export function getIdentityPath(locale: Locale): string {
	return PERSONAL_IDENTITY.officialPathByLocale[locale];
}

export function getIdentityDescription(locale: Locale): string {
	return PERSONAL_IDENTITY.descriptionByLocale[locale];
}

export function getIdentityJobTitle(locale: Locale): string {
	return PERSONAL_IDENTITY.jobTitleByLocale[locale];
}

export function isPersonalIdentityAlias(value: string | undefined): boolean {
	if (!value) {
		return false;
	}

	const normalizedValue = value.toLowerCase().replace(/\s+/g, '');
	const identityNames = [
		PERSONAL_IDENTITY.name,
		...PERSONAL_IDENTITY.alternateNames,
	].map((name) => name.toLowerCase().replace(/\s+/g, ''));

	return identityNames.includes(normalizedValue);
}

export function getCanonicalAuthorName(author: string | undefined): string {
	if (!author || isPersonalIdentityAlias(author)) {
		return PERSONAL_IDENTITY.name;
	}

	return author;
}
