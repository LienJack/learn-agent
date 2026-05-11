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
export const translateRoot = path.join(repoRoot, 'translate');
export const artifactsRoot = path.join(translateRoot, 'artifacts');
export const runsRoot = path.join(translateRoot, 'runs');

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
		pipeline: 'claude-code-series',
		language: '',
		stage: '',
		only: [],
	};
	const files = [];

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--dry-run' || arg === '--check') {
			options.dryRun = true;
		} else if (arg === '--yes') {
			options.yes = true;
		} else if (arg === '--pipeline') {
			options.pipeline = requireOptionValue(argv, index, arg);
			index += 1;
		} else if (arg.startsWith('--pipeline=')) {
			options.pipeline = arg.slice('--pipeline='.length);
		} else if (arg === '--language') {
			options.language = requireOptionValue(argv, index, arg);
			index += 1;
		} else if (arg.startsWith('--language=')) {
			options.language = arg.slice('--language='.length);
		} else if (arg === '--stage') {
			options.stage = requireOptionValue(argv, index, arg);
			index += 1;
		} else if (arg.startsWith('--stage=')) {
			options.stage = arg.slice('--stage='.length);
		} else if (arg === '--only') {
			options.only.push(requireOptionValue(argv, index, arg));
			index += 1;
		} else if (arg.startsWith('--only=')) {
			options.only.push(arg.slice('--only='.length));
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
		const sourcePath = path.resolve(repoRoot, file);
		if (!existsSync(sourcePath)) {
			throw new Error(`File not found: ${toRepoRelative(sourcePath)}`);
		}
		return sourcePath;
	});
}

export function readText(filePath) {
	return readFileSync(filePath, 'utf8');
}

export function ensureTranslateDirs() {
	mkdirSync(artifactsRoot, { recursive: true });
	mkdirSync(runsRoot, { recursive: true });
}

export function toRepoRelative(filePath) {
	return path.relative(repoRoot, path.resolve(filePath));
}

export function resolveRepoPath(filePath) {
	return path.resolve(repoRoot, filePath);
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
	return String(value)
		.normalize('NFKD')
		.toLowerCase()
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^0-9a-z_-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80) || `run-${Date.now()}`;
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

export function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
