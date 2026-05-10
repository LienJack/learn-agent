import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const repoRoot = process.cwd();
const promptFile = path.join(repoRoot, 'src/content/blog/zh/AI/2.Rag/assets/rag-blog-to-photo-prompts.txt');
const articleDir = path.join(repoRoot, 'src/content/blog/zh/AI/2.Rag');
const assetDir = path.join(articleDir, 'assets');
const defaultOpenAIBaseUrl = 'https://api.openai.com';

const args = new Map(
	process.argv.slice(2).map((arg) => {
		const [key, ...value] = arg.replace(/^--/, '').split('=');
		return [key, value.length ? value.join('=') : 'true'];
	}),
);

const model = args.get('model') ?? 'gpt-image-2';
const size = args.get('size') ?? '1536x1024';
const quality = args.get('quality') ?? 'medium';
const delayMs = Number(args.get('delay-ms') ?? '13000');
const limit = args.has('limit') ? Number(args.get('limit')) : Number.POSITIVE_INFINITY;
const shouldGenerate = args.get('generate') !== 'false';
const shouldInsert = args.get('insert') !== 'false';
const force = args.get('force') === 'true';

function stripTomlComment(line) {
	let inQuote = false;
	let escaped = false;
	let result = '';

	for (const char of line) {
		if (escaped) {
			result += char;
			escaped = false;
			continue;
		}

		if (char === '\\' && inQuote) {
			result += char;
			escaped = true;
			continue;
		}

		if (char === '"') {
			inQuote = !inQuote;
		}

		if (char === '#' && !inQuote) {
			break;
		}

		result += char;
	}

	return result.trim();
}

function unquoteTomlString(value) {
	const match = value.trim().match(/^"((?:\\"|[^"])*)"$/);
	return match ? match[1].replace(/\\"/g, '"') : '';
}

function parseCodexProviderConfig(contents) {
	let selectedProvider = null;
	let currentProvider = null;
	const providers = new Map();

	for (const rawLine of contents.split(/\r?\n/)) {
		const line = stripTomlComment(rawLine);
		if (!line) continue;

		const sectionMatch = line.match(/^\[model_providers\.([^\]]+)\]$/);
		if (sectionMatch) {
			currentProvider = sectionMatch[1].replace(/^"|"$/g, '');
			if (!providers.has(currentProvider)) providers.set(currentProvider, {});
			continue;
		}

		const anySectionMatch = line.match(/^\[/);
		if (anySectionMatch) {
			currentProvider = null;
			continue;
		}

		const assignmentMatch = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
		if (!assignmentMatch) continue;

		const [, key, value] = assignmentMatch;
		if (!currentProvider && key === 'model_provider') {
			selectedProvider = unquoteTomlString(value);
			continue;
		}

		if (currentProvider && key === 'base_url') {
			providers.get(currentProvider).baseUrl = unquoteTomlString(value);
		}
	}

	return selectedProvider ? providers.get(selectedProvider) ?? {} : {};
}

async function loadCodexProviderConfig() {
	const codexHome = process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex');
	const configPath = args.get('codex-config') ?? process.env.CODEX_CONFIG ?? path.join(codexHome, 'config.toml');
	if (!existsSync(configPath)) return {};

	const contents = await readFile(configPath, 'utf8');
	return parseCodexProviderConfig(contents);
}

async function loadCodexAuth() {
	const codexHome = process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex');
	const authPath = args.get('codex-auth') ?? process.env.CODEX_AUTH ?? path.join(codexHome, 'auth.json');
	if (!existsSync(authPath)) return {};

	return JSON.parse(await readFile(authPath, 'utf8'));
}

function normalizeBaseUrl(baseUrl) {
	return baseUrl.replace(/\/+$/, '');
}

function imageGenerationUrl(baseUrl) {
	const normalized = normalizeBaseUrl(baseUrl);
	if (normalized.endsWith('/images/generations')) return normalized;
	if (normalized.endsWith('/v1')) return `${normalized}/images/generations`;
	return `${normalized}/v1/images/generations`;
}

function resolveApiUrl(providerConfig) {
	const explicitApiUrl = args.get('api-url') ?? process.env.OPENAI_IMAGE_API_URL;
	if (explicitApiUrl) return explicitApiUrl;

	const baseUrl =
		args.get('base-url') ??
		process.env.OPENAI_IMAGE_BASE_URL ??
		process.env.OPENAI_BASE_URL ??
		providerConfig.baseUrl ??
		defaultOpenAIBaseUrl;

	return imageGenerationUrl(baseUrl);
}

function loadEnvFile() {
	const envPath = path.join(repoRoot, '.env');
	if (!existsSync(envPath)) return;

	return readFile(envPath, 'utf8').then((contents) => {
		for (const line of contents.split(/\r?\n/)) {
			const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
			if (!match || process.env[match[1]]) continue;

			const value = match[2].replace(/^['"]|['"]$/g, '');
			process.env[match[1]] = value;
		}
	});
}

function parsePromptFile(contents) {
	const entries = [];
	const lines = contents.split(/\r?\n/);
	let article = '';
	let current = null;
	let articleIndex = 0;
	let readPrompt = false;

	for (const line of lines) {
		const articleMatch = line.match(/^## (.+\.md)$/);
		if (articleMatch) {
			article = articleMatch[1];
			articleIndex = 0;
			continue;
		}

		const imageMatch = line.match(/^### (.+\.png)$/);
		if (imageMatch) {
			articleIndex += 1;
			current = {
				article,
				articleIndex,
				filename: imageMatch[1],
				suggestion: '',
				prompt: '',
			};
			entries.push(current);
			readPrompt = false;
			continue;
		}

		if (!current) continue;

		if (line.startsWith('建议插入位置：')) {
			current.suggestion = line;
			continue;
		}

		if (line === '3. 正向图片提示词') {
			readPrompt = true;
			continue;
		}

		if (readPrompt && line.trim()) {
			current.prompt = line.trim();
			readPrompt = false;
		}
	}

	return entries.filter((entry) => entry.article && entry.filename && entry.prompt);
}

async function getApiKey() {
	if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
	const codexAuth = await loadCodexAuth();
	return codexAuth.OPENAI_API_KEY;
}

function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateImage(entry, apiKey, apiUrl) {
	const outputPath = path.join(assetDir, entry.filename);
	if (!force && existsSync(outputPath)) {
		console.log(`skip existing ${entry.filename}`);
		return false;
	}

	const prompt = [
		entry.prompt,
		'负向约束：不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。',
		'输出要求：PNG，横向技术博客配图，画面留白充足，节点标签尽量短。中文文字如果不稳定，只留空白标签区。',
	].join('\n\n');

	console.log(`generate ${entry.filename}`);
	const response = await fetch(apiUrl, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model,
			prompt,
			n: 1,
			size,
			quality,
			output_format: 'png',
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`OpenAI image generation failed for ${entry.filename}: ${response.status} ${errorText}`);
	}

	const data = await response.json();
	const b64 = data?.data?.[0]?.b64_json;
	if (!b64) {
		throw new Error(`OpenAI response did not include b64_json for ${entry.filename}`);
	}

	await writeFile(outputPath, Buffer.from(b64, 'base64'));
	return true;
}

function extractHeading(suggestion) {
	const match = suggestion.match(/`(## [^`]+)`/);
	return match?.[1] ?? '';
}

function altTextFor(entry) {
	const articleTitle = entry.article.replace(/^\d+\./, '').replace(/\.md$/, '');
	const topic = entry.filename
		.replace(/^\d+-photo-\d+-/, '')
		.replace(/\.png$/, '')
		.replace(/-/g, ' ');

	return `${articleTitle} 手绘图 ${entry.articleIndex}：${topic}`;
}

async function insertImages(entries) {
	const byArticle = Map.groupBy(entries, (entry) => entry.article);
	let changedArticles = 0;

	for (const [article, articleEntries] of byArticle) {
		const articlePath = path.join(articleDir, article);
		let markdown = await readFile(articlePath, 'utf8');
		let changed = false;

		for (const entry of articleEntries) {
			const imagePath = path.join(assetDir, entry.filename);
			if (!existsSync(imagePath)) {
				console.log(`skip insert missing ${entry.filename}`);
				continue;
			}

			if (markdown.includes(`./assets/${entry.filename}`)) {
				console.log(`skip inserted ${entry.filename}`);
				continue;
			}

			const heading = extractHeading(entry.suggestion);
			const imageMarkdown = `![${altTextFor(entry)}](./assets/${entry.filename})`;

			if (heading && markdown.includes(`${heading}\n`)) {
				markdown = markdown.replace(`${heading}\n`, `${heading}\n\n${imageMarkdown}\n`);
				changed = true;
				console.log(`insert ${entry.filename} after ${heading}`);
				continue;
			}

			const firstHeading = markdown.match(/^# .+$/m)?.[0];
			if (firstHeading) {
				markdown = markdown.replace(`${firstHeading}\n`, `${firstHeading}\n\n${imageMarkdown}\n`);
				changed = true;
				console.log(`insert ${entry.filename} after article title fallback`);
			}
		}

		if (changed) {
			await writeFile(articlePath, markdown);
			changedArticles += 1;
		}
	}

	return changedArticles;
}

await loadEnvFile();
const providerConfig = await loadCodexProviderConfig();
const apiUrl = resolveApiUrl(providerConfig);

const promptContents = await readFile(promptFile, 'utf8');
const entries = parsePromptFile(promptContents);
const selectedEntries = entries.slice(0, limit);

console.log(`loaded ${entries.length} prompts; selected ${selectedEntries.length}`);
console.log(`image generation endpoint: ${apiUrl}`);

if (shouldGenerate) {
	const apiKey = await getApiKey();
	if (!apiKey) {
		throw new Error('OPENAI_API_KEY is missing. Set it in the shell, .env, or ~/.codex/auth.json before generating images.');
	}

	let generated = 0;
	for (const [index, entry] of selectedEntries.entries()) {
		const didGenerate = await generateImage(entry, apiKey, apiUrl);
		if (didGenerate) generated += 1;
		if (index < selectedEntries.length - 1 && delayMs > 0) {
			await wait(delayMs);
		}
	}
	console.log(`generated ${generated} image(s)`);
}

if (shouldInsert) {
	const changedArticles = await insertImages(entries);
	console.log(`updated ${changedArticles} article(s)`);
}
