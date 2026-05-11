import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

// Deprecated compatibility script. Current Mermaid asset entrypoints live under
// translate/skills/translate-assets/SKILL.md and translate/bin/translate-assets.

const SOURCE_MARKDOWN_DIR =
	'/Users/lienli/Library/Mobile Documents/iCloud~md~obsidian/Documents/tech/techBlog/blog/4 Cluade Code源码解析/终稿';
const TARGET_ASSETS_DIR =
	'/Users/lienli/Documents/GitHub/learn-agent/src/content/blog/ja/AI/Claude Code/assets';
const DEBUG_DIR =
	'/Users/lienli/Documents/GitHub/learn-agent/tmp/claude-code-mermaid-ja';
const MERMAID_CLI_PACKAGE = '@mermaid-js/mermaid-cli';
const CLAUDE_MODEL = 'sonnet';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const TRANSLATION_SYSTEM_PROMPT = `You are a translation engine, not an agent.
Translate Mermaid diagram labels, subgraph titles, participant aliases, state labels, edge annotations, and other human-readable Chinese text into natural Japanese for Japanese software engineers.
Preserve Mermaid syntax exactly: diagram keywords, node ids, arrows, indentation, HTML tags such as <br/>, punctuation required by Mermaid, and technical identifiers already in English.
Prefer concise Japanese technical-blog wording. Keep widely recognized identifiers such as QueryEngine, Model API, Tools, MCP, LSP, AppStateStore, Agent, Task, and Skills in their original form when that reads better.
Do not add commentary. Do not wrap the result in code fences. Output only the final Mermaid source.`;

const MERMAID_INIT = `%%{init: {'theme':'base','themeVariables': {'fontFamily': 'Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, BIZ UDPGothic, Noto Sans CJK JP, sans-serif','primaryColor':'#f9f6d8','primaryBorderColor':'#bda92b','lineColor':'#444444','secondaryColor':'#ece9fb','secondaryBorderColor':'#8d7dff','tertiaryColor':'#ffffff','fontSize':'18px'}}}%%`;

function numberedOutputs(prefix, count) {
	return Array.from({ length: count }, (_, index) => ({
		block: index + 1,
		file: `${prefix}-${String(index + 1).padStart(2, '0')}.png`,
	}));
}

const FILE_MAPPINGS = [
	{
		source: '1.工程架构.md',
		outputs: numberedOutputs('01-engineering-architecture-mermaid', 3),
	},
	{
		source: '2.核心机制-ReAction.md',
		outputs: numberedOutputs('02-react-loop-mermaid', 3),
	},
	{
		source: '3.核心机制- Prompt编写.md',
		outputs: numberedOutputs('03-prompt-construction-mermaid', 5),
	},
	{
		source: '4.1核心机制- Context管理.md',
		outputs: numberedOutputs('04-1-context-management-mermaid', 2),
	},
	{
		source: '5.核心机制-Tools.md',
		outputs: numberedOutputs('05-0-tools-overview-mermaid', 12),
	},
	{
		source: '10.1Tool-file 文件管理.md',
		outputs: numberedOutputs('05-1-file-tools-mermaid', 4),
	},
	{
		source: '10.3Tool-终端类.md',
		outputs: numberedOutputs('05-2-terminal-tools-mermaid', 2),
	},
	{
		source: '10.2Tool-工作流类.md',
		outputs: numberedOutputs('05-3-task-management-mermaid', 1),
	},
	{
		source: '6.MCP.md',
		outputs: numberedOutputs('06-mcp-mermaid', 9),
	},
	{
		source: '7.Skill.md',
		outputs: numberedOutputs('07-skill-mermaid', 4),
	},
	{
		source: '8.1Agent协作.md',
		outputs: numberedOutputs('08-1-agent-collaboration-mermaid', 3),
	},
	{
		source: '8.2业界的agent协作（选修）.md',
		outputs: numberedOutputs('08-2-industry-agent-collaboration-elective-mermaid', 2),
	},
];

function parseArgs(argv) {
	const args = {
		only: [],
	};

	for (let index = 0; index < argv.length; index += 1) {
		const value = argv[index];
		if (value === '--only') {
			const next = argv[index + 1];
			if (!next) {
				throw new Error('--only requires a value');
			}
			args.only.push(next.toLowerCase());
			index += 1;
			continue;
		}

		throw new Error(`Unknown argument: ${value}`);
	}

	return args;
}

function run(command, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: ['ignore', 'pipe', 'pipe'],
			...options,
		});

		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (chunk) => {
			stdout += chunk.toString();
		});

		child.stderr.on('data', (chunk) => {
			stderr += chunk.toString();
		});

		child.on('error', reject);
		child.on('close', (code) => {
			if (code === 0) {
				resolve({ stdout, stderr });
				return;
			}

			reject(
				new Error(
					`Command failed (${code}): ${command} ${args.join(' ')}\n${stdout}${stderr}`.trim(),
				),
			);
		});
	});
}

async function ensureDir(dir) {
	await fs.mkdir(dir, { recursive: true });
}

async function fileExists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

function extractMermaidBlocks(markdown) {
	return [...markdown.matchAll(/^```mermaid\n([\s\S]*?)\n```/gm)].map((match) => match[1]);
}

function cleanClaudeOutput(text) {
	let cleaned = text.trim();
	const fenced = cleaned.match(/^```(?:mermaid)?\n([\s\S]*?)\n```$/);
	if (fenced) {
		cleaned = fenced[1].trim();
	}

	const diagramStart = cleaned.search(
		/(^|\n)(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram-v2|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|quadrantChart|requirementDiagram|c4Context|c4Container|c4Component|c4Dynamic|c4Deployment|block-beta|packet-beta|kanban)\b/m,
	);
	if (diagramStart > 0) {
		cleaned = cleaned.slice(diagramStart).trim();
	}

	return cleaned;
}

async function translateMermaidBlock(block) {
	const prompt = [
		'Translate this Mermaid diagram into natural Japanese.',
		'Only translate human-readable Chinese text inside labels and annotations.',
		'Preserve Mermaid syntax exactly.',
		'Output Mermaid source only.',
		'',
		block,
	].join('\n');

	const { stdout } = await run('claude', [
		'-p',
		'--tools',
		'',
		'--permission-mode',
		'bypassPermissions',
		'--model',
		CLAUDE_MODEL,
		'--append-system-prompt',
		TRANSLATION_SYSTEM_PROMPT,
		'--',
		prompt,
	]);

	return cleanClaudeOutput(stdout);
}

async function renderMermaid({ mermaidSource, outputPath, workDir }) {
	const stem = path.basename(outputPath, '.png');
	const inputPath = path.join(workDir, `${stem}.mmd`);
	const rawOutputPath = path.join(workDir, `${stem}.raw.png`);
	const puppeteerConfigPath = path.join(workDir, 'puppeteer-config.json');

	await fs.writeFile(
		puppeteerConfigPath,
		`${JSON.stringify({ executablePath: CHROME_PATH }, null, 2)}\n`,
		'utf8',
	);
	await fs.writeFile(inputPath, `${MERMAID_INIT}\n${mermaidSource}\n`, 'utf8');

	await run(
		'npx',
		[
			'-y',
			MERMAID_CLI_PACKAGE,
			'-i',
			inputPath,
			'-o',
			rawOutputPath,
			'-e',
			'png',
			'-b',
			'white',
			'-s',
			'2',
			'-p',
			puppeteerConfigPath,
			'-q',
		],
		{ cwd: TARGET_ASSETS_DIR },
	);

	if (await fileExists('/opt/homebrew/bin/magick')) {
		await run('/opt/homebrew/bin/magick', [
			rawOutputPath,
			'-strip',
			'-define',
			'png:compression-level=9',
			'-define',
			'png:compression-filter=5',
			outputPath,
		]);
	} else {
		await fs.copyFile(rawOutputPath, outputPath);
	}
}

function shouldInclude(fileName, filters) {
	if (filters.length === 0) {
		return true;
	}

	const haystack = fileName.toLowerCase();
	return filters.some((filter) => haystack.includes(filter));
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (!(await fileExists(CHROME_PATH))) {
		throw new Error(`Chrome not found at ${CHROME_PATH}`);
	}

	await ensureDir(TARGET_ASSETS_DIR);
	await ensureDir(DEBUG_DIR);

	const workDir = path.join(DEBUG_DIR, '.work');
	await fs.rm(workDir, { recursive: true, force: true });
	await ensureDir(workDir);

	let rendered = 0;

	for (const mapping of FILE_MAPPINGS) {
		const sourcePath = path.join(SOURCE_MARKDOWN_DIR, mapping.source);
		const markdown = await fs.readFile(sourcePath, 'utf8');
		const blocks = extractMermaidBlocks(markdown);

		for (const output of mapping.outputs) {
			if (!shouldInclude(output.file, args.only)) {
				continue;
			}

			const block = blocks[output.block - 1];
			if (!block) {
				throw new Error(`Missing Mermaid block ${output.block} in ${mapping.source}`);
			}

			const translated = await translateMermaidBlock(block);
			await fs.writeFile(
				path.join(DEBUG_DIR, output.file.replace(/\.png$/, '.mmd')),
				`${translated}\n`,
				'utf8',
			);
			await renderMermaid({
				mermaidSource: translated,
				outputPath: path.join(TARGET_ASSETS_DIR, output.file),
				workDir,
			});

			rendered += 1;
			console.log(`Rendered ${mapping.source} block ${output.block} -> ${output.file}`);
		}
	}

	console.log(`\nDone. Rendered ${rendered} Japanese Mermaid PNG files.`);
	console.log(`Translated Mermaid source saved under: ${DEBUG_DIR}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
