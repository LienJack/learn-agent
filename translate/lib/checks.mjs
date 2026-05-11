import { existsSync, readFileSync } from 'node:fs';
import { toRepoRelative } from './common.mjs';
import {
	findMarkdownImageRefs,
	findMarkdownLinks,
	hasCjk,
	isLocalImageRef,
	isLocalRef,
	readArticle,
	resolveLocalRef,
	stripCodeFences,
} from './markdown.mjs';
import { languageConfig, targetFiles } from './pipelines.mjs';

export function inspectTranslatedArticle(articlePath, { pipeline, language }) {
	const target = languageConfig(pipeline, language);
	const blockers = [];
	const warnings = [];
	const checks = [];

	if (!existsSync(articlePath)) {
		return {
			source: toRepoRelative(articlePath),
			status: 'blocked',
			blockers: [`${toRepoRelative(articlePath)}: target markdown missing.`],
			warnings,
			checks,
		};
	}

	const article = readArticle(articlePath, readFileSync(articlePath, 'utf8'));
	if (!article.data.title) blockers.push(`${article.sourceRelPath}: missing frontmatter title.`);
	if (!article.data.description) blockers.push(`${article.sourceRelPath}: missing frontmatter description.`);
	if (article.data.locale !== target.locale) {
		blockers.push(`${article.sourceRelPath}: locale must be ${target.locale}, got ${article.data.locale || 'empty'}.`);
	}
	checks.push({ name: 'frontmatter', status: blockers.length ? 'blocked' : 'passed' });

	const imageRefs = findMarkdownImageRefs(article.raw);
	for (const ref of imageRefs) {
		if (!isLocalImageRef(ref.url)) continue;
		const localPath = resolveLocalRef(article, ref.url);
		if (!existsSync(localPath)) {
			blockers.push(`${article.sourceRelPath}: image missing: ${ref.url}`);
		}
	}
	if (article.data.heroImage && isLocalImageRef(article.data.heroImage)) {
		const heroPath = resolveLocalRef(article, article.data.heroImage);
		if (!existsSync(heroPath)) {
			blockers.push(`${article.sourceRelPath}: heroImage missing: ${article.data.heroImage}`);
		}
	}
	checks.push({ name: 'local-images', status: blockers.some((item) => item.includes('image')) ? 'blocked' : 'passed' });

	for (const link of findMarkdownLinks(article.raw)) {
		if (!isLocalRef(link.url) || !link.url.startsWith('./')) continue;
		const linked = resolveLocalRef(article, `${link.url}.md`);
		const linkedWithoutExt = resolveLocalRef(article, link.url);
		if (!existsSync(linked) && !existsSync(linkedWithoutExt)) {
			warnings.push(`${article.sourceRelPath}: local article link may be unresolved: ${link.url}`);
		}
	}

	const bodyWithoutCode = stripCodeFences(article.body);
	if (/<tool_call>|<\/tool_call>|\{"(?:file_path|command|path)":/i.test(bodyWithoutCode)) {
		blockers.push(`${article.sourceRelPath}: model/tool-call pollution detected.`);
	}
	if (/Here(?:'s| is) the translation|I(?:'ll| will) translate|Let me translate/i.test(bodyWithoutCode)) {
		blockers.push(`${article.sourceRelPath}: translation process chatter detected.`);
	}
	if (language === 'en' && hasCjk(bodyWithoutCode)) {
		warnings.push(`${article.sourceRelPath}: CJK characters remain outside code fences; review manually.`);
	}
	if (language === 'ja' && /[\u3400-\u9fff]/.test(bodyWithoutCode)) {
		warnings.push(`${article.sourceRelPath}: Chinese Han characters may remain outside code fences; review manually.`);
	}
	checks.push({ name: 'pollution-and-residue', status: blockers.some((item) => item.includes('pollution') || item.includes('chatter')) ? 'blocked' : 'passed' });

	return {
		source: article.sourceRelPath,
		status: blockers.length ? 'blocked' : 'passed',
		title: article.data.title || '',
		blockers,
		warnings,
		checks,
		imageRefs: imageRefs.length,
		heroImage: article.data.heroImage || '',
	};
}

export function inspectTranslatedSet({ pipeline, language, requestedFiles = [] }) {
	const files = requestedFiles.length ? requestedFiles : targetFiles(pipeline, language);
	const articles = files.map((file) => inspectTranslatedArticle(file, { pipeline, language }));
	return {
		language,
		pipeline: pipeline.id,
		articles,
		blockers: articles.flatMap((article) => article.blockers),
		warnings: articles.flatMap((article) => article.warnings),
	};
}
