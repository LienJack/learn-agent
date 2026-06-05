import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { atomicWriteFile, readText, repoRoot, toRepoRelative, writeJson } from './common.mjs';
import {
	cleanModelOutput,
	findMarkdownImageRefs,
	findMarkdownLinks,
	isLocalImageRef,
	isLocalRef,
	readArticle,
	validateLocalImageFiles,
} from './markdown.mjs';
import { languageConfig, sourceToTargetSlugMap } from './pipelines.mjs';
import { writeRunRecord } from './records.mjs';

const DEFAULT_CODEX_TIMEOUT_MS = 600_000;
const MAX_TRANSLATION_CHARS = 1_000;

export function planTranslations({ pipeline, language, plans }) {
	const slugMap = sourceToTargetSlugMap(pipeline, language);
	return plans.map((plan) => {
		if (!existsSync(plan.sourcePath)) {
			return {
				...plan,
				status: 'blocked',
				blockers: [`${plan.sourceRelPath}: source file is missing.`],
				warnings: [],
				linkRewrites: [],
				assetRewrites: [],
				targetExists: existsSync(plan.targetPath),
			};
		}

		const article = readArticle(plan.sourcePath, readFileSync(plan.sourcePath, 'utf8'));
		const imageRefs = findMarkdownImageRefs(article.raw);
		const linkRefs = findMarkdownLinks(article.raw);
		const blockers = validateLocalImageFiles(article, imageRefs);
		const warnings = [];
		const linkRewrites = planLinkRewrites(linkRefs, slugMap);
		const assetRewrites = planAssetRewrites(imageRefs, article.data.heroImage);

		if (!article.data.title) warnings.push(`${article.sourceRelPath}: source frontmatter title is empty.`);
		if (!article.data.description) warnings.push(`${article.sourceRelPath}: source frontmatter description is empty.`);
		if (!plan.frontmatter.title || !plan.frontmatter.description) {
			blockers.push(`${plan.sourceRelPath}: pipeline target frontmatter is incomplete for ${language}.`);
		}

		return {
			...plan,
			status: blockers.length ? 'blocked' : 'planned',
			blockers,
			warnings,
			sourceFrontmatter: {
				title: article.data.title || '',
				description: article.data.description || '',
				locale: article.data.locale || '',
				heroImage: article.data.heroImage || '',
			},
			linkRewrites,
			assetRewrites,
			targetExists: existsSync(plan.targetPath),
			targetDir: toRepoRelative(path.dirname(plan.targetPath)),
		};
	});
}

function planLinkRewrites(linkRefs, slugMap) {
	const rewrites = [];
	for (const ref of linkRefs) {
		if (!isLocalRef(ref.url) || !ref.url.startsWith('./')) continue;
		const cleanTarget = decodeURIComponent(ref.url.split('#')[0].split('?')[0]).replace(/^\.\//, '');
		const mapped = slugMap.get(cleanTarget) || slugMap.get(path.basename(cleanTarget, '.md'));
		if (mapped && mapped !== ref.url) {
			rewrites.push({ from: ref.url, to: mapped, label: ref.label });
		}
	}
	return rewrites;
}

function planAssetRewrites(imageRefs, heroImage = '') {
	const refs = imageRefs
		.filter((ref) => isLocalImageRef(ref.url) && ref.url.startsWith('./assets/'))
		.map((ref) => ({ from: ref.url, to: ref.url, alt: ref.alt, mode: 'preserve-local-assets-path' }));
	if (heroImage && isLocalImageRef(heroImage) && heroImage.startsWith('./assets/')) {
		refs.unshift({ from: heroImage, to: heroImage, alt: 'heroImage', mode: 'preserve-local-assets-path' });
	}
	return refs;
}

export function cleanTranslatedBody(text) {
	return cleanModelOutput(text);
}

export function assertCanRunRealTranslation(options) {
	if (options.dryRun) return;
	if (!options.yes) {
		throw new Error('真实翻译会调用模型并可能改写目标 Markdown。请先查看 dry-run 摘要，确认后加 --yes 运行。');
	}
}

export function translateArticlesWithCodex({ pipeline, language, plans, run }) {
	assertCanRunRealTranslation({ dryRun: false, yes: true });
	const results = [];
	const targetConfig = languageConfig(pipeline, language);
	const promptPath = path.join(repoRoot, targetConfig.prompt);
	const systemPrompt = readText(promptPath);
	const slugMap = sourceToTargetSlugMap(pipeline, language);

	for (const plan of plans) {
		const result = translateArticleWithCodex({ plan, systemPrompt, language, slugMap, targetConfig, run });
		results.push(result);
	}

	return results;
}

export function translateArticleWithCodex({ plan, systemPrompt, language, slugMap, targetConfig, run }) {
	const article = readArticle(plan.sourcePath, readFileSync(plan.sourcePath, 'utf8'));
	const chunks = splitMarkdownForTranslation(article.body);
	const translatedChunks = [];
	const warnings = [];
	const promptManifest = [];

	for (let index = 0; index < chunks.length; index += 1) {
		const chunk = chunks[index];
		if (!hasChineseText(chunk)) {
			translatedChunks.push(rewriteLocalLinks(chunk, slugMap));
			continue;
		}

		const protectedChunk = protectLocalLinks(chunk, slugMap);
		const prompt = buildCodexPrompt({
			systemPrompt,
			language,
			sourceRelPath: plan.sourceRelPath,
			chunk: protectedChunk.markdown,
			chunkIndex: index + 1,
			chunkCount: chunks.length,
		});
		const translated = runCodexTranslation(prompt);
		const cleaned = cleanModelOutput(translated);
		warnings.push(...cleaned.warnings);
		translatedChunks.push(restoreProtectedLinks(cleaned.markdown, protectedChunk.links).trimEnd());
		promptManifest.push({
			chunk: index + 1,
			sourceChars: chunk.length,
			outputChars: cleaned.markdown.length,
			linkPlaceholders: protectedChunk.links.length,
		});
	}

	const body = `${translatedChunks.map((chunk) => chunk.trimEnd()).filter(Boolean).join('\n\n')}\n`;
	const output = `${buildFrontmatter({ plan, sourceData: article.data, targetConfig })}\n${body}`;
	mkdirSync(path.dirname(plan.targetPath), { recursive: true });
	atomicWriteFile(plan.targetPath, output);

	const manifestPath = path.join(run.artifactDir, `${path.basename(plan.targetFile, '.md')}-codex-translation.json`);
	writeJson(manifestPath, {
		provider: 'gpt-codex',
		model: codexModel(),
		source: plan.sourceRelPath,
		target: plan.targetRelPath,
		chunks: promptManifest,
		warnings,
	});

	return {
		source: plan.sourceRelPath,
		target: plan.targetRelPath,
		status: 'translated',
		warnings,
		artifacts: [toRepoRelative(manifestPath)],
	};
}

export function updateRunWithTranslationResults(run, results) {
	for (const result of results) {
		const input = run.record.inputs.find((candidate) => candidate.source === result.source);
		if (!input) continue;
		input.status = result.status;
		input.target = result.target;
		input.warnings = [...(input.warnings || []), ...result.warnings];
		input.artifacts = [...(input.artifacts || []), ...result.artifacts];
	}
	run.record.artifacts.push(...results.flatMap((result) => result.artifacts));
	run.record.confirmation = {
		required: true,
		action: `Run real ${run.record.language} Markdown translation with GPT Codex`,
		confirmed: true,
	};
	run.record.notes.push(`Real Markdown translation executed with ${codexModel()} via codex exec.`);
	writeRunRecord(run.recordPath, run.record);
}

export function runCodexTranslation(prompt) {
	const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'translate-codex-'));
	const outputPath = path.join(tmpDir, 'last-message.md');
	const codexBin = process.env.TRANSLATE_CODEX_BIN || 'codex';
	const args = [
		'exec',
		'--ephemeral',
		'--ignore-rules',
		'--sandbox',
		'read-only',
		'--cd',
		repoRoot,
		'--output-last-message',
		outputPath,
		...codexModelArgs(),
		'-',
	];

	try {
		const result = spawnSync(codexBin, args, {
			cwd: repoRoot,
			input: prompt,
			encoding: 'utf8',
			timeout: codexTimeoutMs(),
			maxBuffer: 20 * 1024 * 1024,
			env: { ...process.env, NO_COLOR: '1' },
		});
		if (result.error) throw result.error;
		if (result.status !== 0) {
			throw new Error(`codex exec failed with status ${result.status}: ${result.stderr || result.stdout}`);
		}
		if (existsSync(outputPath)) return readFileSync(outputPath, 'utf8');
		return result.stdout;
	} finally {
		rmSync(tmpDir, { recursive: true, force: true });
	}
}

export function buildCodexPrompt({ systemPrompt, language, sourceRelPath, chunk, chunkIndex, chunkCount }) {
	return `${systemPrompt.trim()}

Provider: GPT Codex.
Target language: ${language}.
Source file: ${sourceRelPath}.
Chunk: ${chunkIndex}/${chunkCount}.

Return only the translated Markdown fragment. Do not edit files, inspect the repository, call tools, or explain your process.

Markdown fragment:

${chunk}`;
}

function codexModel() {
	return process.env.TRANSLATE_CODEX_MODEL || 'codex-default';
}

function codexModelArgs() {
	const model = process.env.TRANSLATE_CODEX_MODEL;
	return model ? ['--model', model] : [];
}

function codexTimeoutMs() {
	return Number(process.env.TRANSLATE_CODEX_TIMEOUT_MS || DEFAULT_CODEX_TIMEOUT_MS);
}

function splitMarkdownForTranslation(body, maxChars = MAX_TRANSLATION_CHARS) {
	const sections = splitMarkdownSections(body);
	return sections.flatMap((section) => splitLargeMarkdownSection(section, maxChars));
}

function splitMarkdownSections(body) {
	const sections = [];
	const current = [];
	let inFence = false;

	for (const line of body.split(/\r?\n/)) {
		if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
		if (!inFence && /^##\s+/.test(line) && current.length) {
			sections.push(current.join('\n').trimEnd());
			current.length = 0;
		}
		current.push(line);
	}
	if (current.length) sections.push(current.join('\n').trimEnd());
	return sections.filter(Boolean);
}

function splitLargeMarkdownSection(section, maxChars) {
	if (section.length <= maxChars) return [section];
	const chunks = [];
	const current = [];
	let inFence = false;

	for (const line of section.split(/\r?\n/)) {
		if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
		if (!inFence && current.join('\n').length + line.length > maxChars && line.trim() === '') {
			chunks.push(current.join('\n').trimEnd());
			current.length = 0;
			continue;
		}
		current.push(line);
	}
	if (current.length) chunks.push(current.join('\n').trimEnd());
	return chunks.filter(Boolean);
}

function hasChineseText(text) {
	return /[\u3400-\u9fff]/.test(text);
}

function protectLocalLinks(markdown, slugMap) {
	const links = [];
	const output = markdown.replace(/(?<!!)\[([^\]]+)\]\((\.\/[^)\s]+)([^)]*)\)/g, (match, label, url) => {
		const target = mapLocalTarget(url, slugMap);
		if (!target) return match;
		const placeholder = `__TRANSLATE_LOCAL_LINK_${links.length}__`;
		links.push({ placeholder, target });
		return `[${label}](${placeholder})`;
	});
	return { markdown: output, links };
}

function restoreProtectedLinks(markdown, links) {
	let output = markdown;
	for (const link of links) {
		output = output.replaceAll(link.placeholder, link.target);
	}
	return output;
}

function rewriteLocalLinks(markdown, slugMap) {
	return markdown.replace(/(?<!!)\[([^\]]+)\]\((\.\/[^)\s]+)([^)]*)\)/g, (match, label, url) => {
		const target = mapLocalTarget(url, slugMap);
		return target ? `[${label}](${target})` : match;
	});
}

function mapLocalTarget(url, slugMap) {
	if (!url.startsWith('./')) return '';
	const cleanTarget = decodeURIComponent(url.split('#')[0].split('?')[0]).replace(/^\.\//, '');
	const suffix = url.slice(url.split('#')[0].split('?')[0].length);
	const mapped = slugMap.get(cleanTarget) || slugMap.get(path.basename(cleanTarget, '.md'));
	return mapped ? `${mapped}${suffix}` : '';
}

function buildFrontmatter({ plan, sourceData, targetConfig }) {
	const fields = [
		['title', plan.frontmatter.title],
		['description', plan.frontmatter.description],
		['author', sourceData.author],
		['pubDate', sourceData.pubDate],
		['updatedDate', sourceData.updatedDate],
		['heroImage', sourceData.heroImage],
		['locale', plan.frontmatter.locale],
		['tags', translateTags(sourceData.tags, targetConfig)],
		['aliases', plan.frontmatter.aliases],
	];
	return `---\n${fields.map(([key, value]) => yamlField(key, value)).filter(Boolean).join('\n')}\n---`;
}

function translateTags(tags, targetConfig) {
	const tagMap = targetConfig.tags || {};
	return (Array.isArray(tags) ? tags : []).map((tag) => tagMap[tag] || tag);
}

function yamlField(key, value) {
	if (value === undefined || value === null || value === '') return '';
	if (Array.isArray(value)) {
		if (value.length === 0) return '';
		return `${key}:\n${value.map((item) => `  - ${yamlScalar(item)}`).join('\n')}`;
	}
	return `${key}: ${yamlScalar(value)}`;
}

function yamlScalar(value) {
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	return `'${String(value).replaceAll("'", "''")}'`;
}
