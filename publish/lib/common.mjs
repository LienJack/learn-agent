import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

export const repoRoot = path.resolve(import.meta.dirname, '..', '..');
export const publishRoot = path.join(repoRoot, 'publish');
export const artifactsRoot = path.join(publishRoot, 'artifacts');
export const runsRoot = path.join(publishRoot, 'runs');

export function loadDotEnv(filePath = path.join(repoRoot, '.env')) {
	if (!existsSync(filePath)) return;
	const source = readFileSync(filePath, 'utf8');
	for (const line of source.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
		if (!match || process.env[match[1]] !== undefined) continue;
		process.env[match[1]] = unquoteEnv(match[2].trim());
	}
}

function unquoteEnv(value) {
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'")) ||
		(value.startsWith('“') && value.endsWith('”')) ||
		(value.startsWith('‘') && value.endsWith('’'))
	) {
		return value.slice(1, -1);
	}
	return value;
}

export function parseArgs(argv) {
	const options = {
		dryRun: false,
		yes: false,
		published: false,
		private: true,
		tweet: false,
		itemId: '',
		platforms: [],
	};
	const files = [];

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--dry-run' || arg === '--check') {
			options.dryRun = true;
		} else if (arg === '--yes') {
			options.yes = true;
		} else if (arg === '--published') {
			options.published = true;
		} else if (arg === '--draft') {
			options.published = false;
		} else if (arg === '--public') {
			options.private = false;
		} else if (arg === '--private') {
			options.private = true;
		} else if (arg === '--tweet') {
			options.tweet = true;
		} else if (arg === '--no-tweet') {
			options.tweet = false;
		} else if (arg === '--item-id') {
			const value = argv[index + 1];
			if (!value) throw new Error('--item-id requires a value.');
			options.itemId = value;
			index += 1;
		} else if (arg.startsWith('--item-id=')) {
			options.itemId = arg.slice('--item-id='.length);
		} else if (arg === '--platform') {
			const value = argv[index + 1];
			if (!value) throw new Error('--platform requires a value.');
			options.platforms.push(value);
			index += 1;
		} else if (arg.startsWith('--platform=')) {
			options.platforms.push(arg.slice('--platform='.length));
		} else if (arg === '-h' || arg === '--help' || arg === 'help') {
			options.help = true;
		} else if (arg.startsWith('-')) {
			throw new Error(`Unknown option: ${arg}`);
		} else {
			files.push(arg);
		}
	}

	return { options, files };
}

export function requireArticleFiles(files) {
	if (files.length === 0) {
		throw new Error('Missing markdown file path.');
	}
	return files.map((file) => {
		const sourcePath = path.resolve(repoRoot, file);
		if (!existsSync(sourcePath)) {
			throw new Error(`File not found: ${file}`);
		}
		return sourcePath;
	});
}

export function readArticle(sourcePath) {
	const raw = readFileSync(sourcePath, 'utf8');
	const parsed = parseFrontmatter(raw);
	return {
		sourcePath,
		sourceRelPath: path.relative(repoRoot, sourcePath),
		sourceDir: path.dirname(sourcePath),
		frontmatter: parsed.frontmatter,
		data: parseSimpleYaml(parsed.frontmatter),
		body: parsed.body,
		raw,
	};
}

export function parseFrontmatter(source) {
	const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
	if (!match) {
		throw new Error('Missing YAML frontmatter.');
	}
	return {
		frontmatter: match[1],
		body: source.slice(match[0].length),
	};
}

export function parseSimpleYaml(source) {
	const result = {};
	const lines = source.split(/\r?\n/);
	let currentArrayKey = '';

	for (const line of lines) {
		if (!line.trim()) continue;
		const arrayMatch = line.match(/^\s*-\s+(.+)$/);
		if (arrayMatch && currentArrayKey) {
			result[currentArrayKey].push(unquoteYaml(arrayMatch[1].trim()));
			continue;
		}

		currentArrayKey = '';
		const pair = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
		if (!pair) continue;

		const key = pair[1];
		const rawValue = pair[2] ?? '';
		if (rawValue.trim() === '') {
			result[key] = [];
			currentArrayKey = key;
			continue;
		}
		result[key] = parseScalar(rawValue.trim());
	}

	return result;
}

function parseScalar(value) {
	if (value === 'true') return true;
	if (value === 'false') return false;
	if (/^\[(.*)\]$/.test(value)) {
		const inner = value.slice(1, -1).trim();
		if (!inner) return [];
		return inner.split(',').map((item) => unquoteYaml(item.trim()));
	}
	return unquoteYaml(value);
}

function unquoteYaml(value) {
	const trimmed = value.trim();
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
}

export function validateRequiredFields(article, fields = ['title', 'description']) {
	const blockers = [];
	for (const field of fields) {
		if (!article.data[field]) {
			blockers.push(`${article.sourceRelPath}: missing frontmatter ${field}.`);
		}
	}
	return blockers;
}

export function normalizedTags(article) {
	return asArray(article.data.tags).map((tag) => String(tag).trim()).filter(Boolean);
}

export function asArray(value) {
	if (Array.isArray(value)) return value;
	if (value === undefined || value === null || value === '') return [];
	return [value];
}

export function findMarkdownImageRefs(source) {
	const refs = [];
	let inFence = false;

	for (const line of source.split(/\r?\n/)) {
		if (/^\s*(```|~~~)/.test(line)) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;

		const imagePattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+['"][^'"]*['"])?\)/g;
		let match;
		while ((match = imagePattern.exec(line))) {
			refs.push({ alt: match[1], url: match[2] });
		}
	}

	return refs;
}

export function isLocalImageRef(value) {
	return value && !/^(?:https?:)?\/\//i.test(value) && !/^(?:data|mailto):/i.test(value);
}

export function resolveLocalImage(article, rawUrl) {
	const withoutHash = rawUrl.split('#')[0].split('?')[0];
	if (withoutHash.startsWith('/')) {
		return path.resolve(repoRoot, 'public', decodeURIComponent(withoutHash.slice(1)));
	}
	return path.resolve(article.sourceDir, decodeURIComponent(withoutHash));
}

export function validateLocalImageFiles(article, imageRefs) {
	const blockers = [];
	for (const ref of imageRefs) {
		if (!isLocalImageRef(ref.url)) continue;
		const localPath = resolveLocalImage(article, ref.url);
		if (!existsSync(localPath)) {
			blockers.push(`${article.sourceRelPath}: image not found: ${ref.url} resolved to ${localPath}`);
		}
	}
	return blockers;
}

export function createRun({ language, platforms, articles }) {
	ensurePublishDirs();
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const slug = safeSlug(
		articles.length === 1
			? path.basename(articles[0].sourcePath, path.extname(articles[0].sourcePath))
			: `${language}-${articles.length}-articles`,
	);
	const runId = `${timestamp}-${language}-${slug}`;
	const runDir = path.join(runsRoot, runId);
	const artifactDir = path.join(artifactsRoot, runId);
	mkdirSync(runDir, { recursive: true });
	mkdirSync(artifactDir, { recursive: true });
	const recordPath = path.join(runDir, 'record.json');
	const record = {
		id: runId,
		language,
		platforms,
		status: 'started',
		startedAt: new Date().toISOString(),
		articles: articles.map((article) => ({
			source: article.sourceRelPath,
			title: article.data.title || '',
			status: 'pending',
			artifacts: [],
			blockers: [],
			results: [],
		})),
		artifactDir: path.relative(repoRoot, artifactDir),
		confirmation: null,
		notes: [],
	};
	writeRunRecord(recordPath, record);
	return { runId, runDir, artifactDir, recordPath, record };
}

export function writeRunRecord(recordPath, record) {
	const safeRecord = scrubSecrets(record);
	writeFileSync(recordPath, `${JSON.stringify(safeRecord, null, 2)}\n`);
}

function scrubSecrets(value) {
	if (Array.isArray(value)) return value.map(scrubSecrets);
	if (value && typeof value === 'object') {
		const output = {};
		for (const [key, child] of Object.entries(value)) {
			if (/token|cookie|secret|authorization|api[_-]?key/i.test(key)) {
				output[key] = '[redacted]';
			} else {
				output[key] = scrubSecrets(child);
			}
		}
		return output;
	}
	if (typeof value === 'string' && /(Bearer\s+[A-Za-z0-9._-]+|api[_-]?key=|cookie:)/i.test(value)) {
		return '[redacted]';
	}
	return value;
}

export function ensurePublishDirs() {
	mkdirSync(artifactsRoot, { recursive: true });
	mkdirSync(runsRoot, { recursive: true });
}

export function printSummary(title, lines) {
	console.log(`\n${title}`);
	console.log('='.repeat(title.length));
	for (const line of lines) {
		console.log(line);
	}
	console.log('');
}

export function requireConfirmation(options, message) {
	if (options.yes) return true;
	console.log(message);
	console.log('Re-run with --yes after reviewing the summary to continue.');
	return false;
}

export function safeSlug(value) {
	return String(value)
		.normalize('NFKD')
		.toLowerCase()
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^0-9a-z_-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60) || `article-${Date.now()}`;
}

export function safeAssetName(value) {
	return String(value)
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^0-9A-Za-z._-]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'image';
}

export function yamlString(value) {
	return JSON.stringify(String(value));
}

export function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function contentTypeFor(filePath) {
	const ext = path.extname(filePath).toLowerCase();
	if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
	if (ext === '.png') return 'image/png';
	if (ext === '.gif') return 'image/gif';
	if (ext === '.webp') return 'image/webp';
	if (ext === '.svg') return 'image/svg+xml';
	return 'application/octet-stream';
}

export function hashFile(filePath) {
	return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

export function writeJson(filePath, value) {
	mkdirSync(path.dirname(filePath), { recursive: true });
	writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function readJson(filePath, fallback) {
	if (!existsSync(filePath)) return fallback;
	return JSON.parse(readFileSync(filePath, 'utf8'));
}

export function copyFileWithDirs(from, to) {
	mkdirSync(path.dirname(to), { recursive: true });
	copyFileSync(from, to);
}

export function gitSummary(cwd) {
	try {
		return execFileSync('git', ['status', '--short'], {
			cwd,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		}).trim();
	} catch (error) {
		return `Unable to read git status: ${error.message}`;
	}
}

export function gitCommitAndPush(cwd, files, message) {
	execFileSync('git', ['add', ...files], { cwd, stdio: 'inherit' });
	execFileSync('git', ['commit', '-m', message], { cwd, stdio: 'inherit' });
	execFileSync('git', ['push'], { cwd, stdio: 'inherit' });
}

export function fileSizeBytes(filePath) {
	return statSync(filePath).size;
}

export function defaultCachePath(name) {
	return path.join(homedir(), '.cache', 'learn-agent-publish', name);
}

export function atomicWriteFile(filePath, contents) {
	mkdirSync(path.dirname(filePath), { recursive: true });
	const tmpPath = `${filePath}.${process.pid}.tmp`;
	writeFileSync(tmpPath, contents);
	renameSync(tmpPath, filePath);
}
