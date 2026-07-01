import { createHash } from 'node:crypto';
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import path from 'node:path';

export const repoRoot = path.resolve(import.meta.dirname, '..', '..');
export const imagesRoot = path.join(repoRoot, 'images');
export const artifactsRoot = path.join(imagesRoot, 'artifacts');
export const runsRoot = path.join(imagesRoot, 'runs');

export function loadDotEnv(filePath = path.join(repoRoot, '.env'), { override = false } = {}) {
	if (!existsSync(filePath)) return;
	const source = readFileSync(filePath, 'utf8');
	for (const line of source.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
		if (!match || (!override && process.env[match[1]] !== undefined)) continue;
		process.env[match[1]] = unquoteEnv(match[2].trim());
	}
}

function unquoteEnv(value) {
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		return value.slice(1, -1);
	}
	return value;
}

export function parseArgs(argv) {
	const options = {
		dryRun: false,
		yes: false,
		stage: 'all',
		importFile: '',
		promptId: '',
		force: false,
		json: false,
		obsidianRoot: process.env.ARTICLE_IMAGES_OBSIDIAN_ROOT || '/Users/lienli/Library/Mobile Documents/iCloud~md~obsidian/Documents/tech/techBlog/blog',
		noCompress: false,
		mermaidScale: process.env.MERMAID_RENDER_SCALE || '2',
	};
	const files = [];

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--dry-run' || arg === '--check') {
			options.dryRun = true;
		} else if (arg === '--yes') {
			options.yes = true;
		} else if (arg === '--force') {
			options.force = true;
		} else if (arg === '--json') {
			options.json = true;
		} else if (arg === '--no-compress') {
			options.noCompress = true;
		} else if (arg === '--import-generated') {
			options.importGenerated = true;
		} else if (arg === '--stage') {
			options.stage = requireOptionValue(argv, index, arg);
			index += 1;
		} else if (arg.startsWith('--stage=')) {
			options.stage = arg.slice('--stage='.length);
		} else if (arg === '--import') {
			options.importFile = requireOptionValue(argv, index, arg);
			index += 1;
		} else if (arg.startsWith('--import=')) {
			options.importFile = arg.slice('--import='.length);
		} else if (arg === '--prompt-id') {
			options.promptId = requireOptionValue(argv, index, arg);
			index += 1;
		} else if (arg.startsWith('--prompt-id=')) {
			options.promptId = arg.slice('--prompt-id='.length);
		} else if (arg === '--prompts') {
			options.prompts = requireOptionValue(argv, index, arg);
			index += 1;
		} else if (arg.startsWith('--prompts=')) {
			options.prompts = arg.slice('--prompts='.length);
		} else if (arg === '--model') {
			options.model = requireOptionValue(argv, index, arg);
			index += 1;
		} else if (arg.startsWith('--model=')) {
			options.model = arg.slice('--model='.length);
		} else if (arg === '--base-url') {
			options.baseUrl = requireOptionValue(argv, index, arg);
			index += 1;
		} else if (arg.startsWith('--base-url=')) {
			options.baseUrl = arg.slice('--base-url='.length);
		} else if (arg === '--size') {
			options.size = requireOptionValue(argv, index, arg);
			index += 1;
		} else if (arg.startsWith('--size=')) {
			options.size = arg.slice('--size='.length);
		} else if (arg === '--quality') {
			options.quality = requireOptionValue(argv, index, arg);
			index += 1;
		} else if (arg.startsWith('--quality=')) {
			options.quality = arg.slice('--quality='.length);
		} else if (arg === '--output-format') {
			options.outputFormat = requireOptionValue(argv, index, arg);
			index += 1;
		} else if (arg.startsWith('--output-format=')) {
			options.outputFormat = arg.slice('--output-format='.length);
		} else if (arg === '--mermaid-scale') {
			options.mermaidScale = requireOptionValue(argv, index, arg);
			index += 1;
		} else if (arg.startsWith('--mermaid-scale=')) {
			options.mermaidScale = arg.slice('--mermaid-scale='.length);
		} else if (arg === '--background') {
			options.background = requireOptionValue(argv, index, arg);
			index += 1;
		} else if (arg.startsWith('--background=')) {
			options.background = arg.slice('--background='.length);
		} else if (arg === '--out-dir') {
			options.outDir = requireOptionValue(argv, index, arg);
			index += 1;
		} else if (arg.startsWith('--out-dir=')) {
			options.outDir = arg.slice('--out-dir='.length);
		} else if (arg === '--obsidian-root') {
			options.obsidianRoot = requireOptionValue(argv, index, arg);
			index += 1;
		} else if (arg.startsWith('--obsidian-root=')) {
			options.obsidianRoot = arg.slice('--obsidian-root='.length);
		} else if (arg === '-h' || arg === '--help' || arg === 'help') {
			options.help = true;
		} else if (arg.startsWith('-')) {
			throw new Error(`Unknown option: ${arg}`);
		} else {
			files.push(arg);
		}
	}

	if (!['all', 'covers', 'mermaid', 'photos', 'svg-mermaid', 'compress'].includes(options.stage)) {
		throw new Error('--stage must be all, covers, mermaid, photos, svg-mermaid, or compress.');
	}
	return { options, files };
}

function requireOptionValue(argv, index, option) {
	const value = argv[index + 1];
	if (!value || value.startsWith('-')) {
		throw new Error(`${option} requires a value.`);
	}
	return value;
}

export function requireExistingFiles(files, { allowEmpty = false, label = 'markdown file path' } = {}) {
	if (!allowEmpty && files.length === 0) {
		throw new Error(`Missing ${label}.`);
	}
	return files.map((file) => {
		const sourcePath = resolveRepoPath(file);
		if (!existsSync(sourcePath)) {
			throw new Error(`File not found: ${toRepoRelative(sourcePath)}`);
		}
		return sourcePath;
	});
}

export function ensureImageDirs() {
	mkdirSync(artifactsRoot, { recursive: true });
	mkdirSync(runsRoot, { recursive: true });
}

export function readText(filePath) {
	return readFileSync(filePath, 'utf8');
}

export function resolveRepoPath(filePath) {
	return path.resolve(repoRoot, filePath);
}

export function toRepoRelative(filePath) {
	return path.relative(repoRoot, path.resolve(filePath));
}

export function toPosixPath(value) {
	return value.split(path.sep).join('/');
}

export function relativeMarkdownPath(fromDir, targetPath) {
	let rel = toPosixPath(path.relative(fromDir, targetPath));
	if (!rel.startsWith('.')) rel = `./${rel}`;
	return encodeURI(rel).replace(/%2F/g, '/');
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
	console.log('确认后请加 --yes 重新运行真实动作。');
	return false;
}

export function safeSlug(value) {
	const input = String(value);
	const slug = input
		.normalize('NFKD')
		.toLowerCase()
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^0-9a-z_-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
	return slug || `item-${hashString(input).slice(0, 8)}`;
}

export function hashString(value) {
	return createHash('sha256').update(String(value)).digest('hex');
}

export function safeAssetName(value) {
	return String(value)
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^0-9A-Za-z._-]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'asset';
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

export function fileSizeBytes(filePath) {
	return statSync(filePath).size;
}

export function hashFile(filePath) {
	return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

export function atomicWriteFile(filePath, contents) {
	mkdirSync(path.dirname(filePath), { recursive: true });
	const tmpPath = `${filePath}.${process.pid}.tmp`;
	writeFileSync(tmpPath, contents);
	renameSync(tmpPath, filePath);
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

export function imageExtensionFor(filePath, fallback = '.png') {
	const ext = path.extname(filePath).toLowerCase();
	if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) return ext === '.jpeg' ? '.jpg' : ext;
	return fallback;
}

export function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
