import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

// Deprecated compatibility script. Current Mermaid asset entrypoints live under
// translate/skills/translate-assets/SKILL.md and translate/bin/translate-assets.

const OBSIDIAN_DIR =
	'/Users/lienli/Library/Mobile Documents/iCloud~md~obsidian/Documents/tech/techBlog/blog/4 Cluade Code源码解析/终稿';
const TARGET_ASSETS_DIR =
	'/Users/lienli/Documents/GitHub/learn-agent/src/content/blog/en/AI/Claude code/assets';
const MERMAID_CLI_PACKAGE = '@mermaid-js/mermaid-cli';
const CLAUDE_MODEL = 'sonnet';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const TRANSLATION_SYSTEM_PROMPT = `You are a translation engine, not an agent.
Translate Mermaid diagram labels, subgraph titles, participant aliases, state transition labels, and other human-readable Chinese text into natural English for native technical readers.
Preserve Mermaid syntax exactly: diagram type keywords, node ids, arrows, indentation, HTML tags such as <br/>, punctuation needed by Mermaid, and any code identifiers that are already English.
Do not add commentary. Do not wrap the result in code fences. Output only the final Mermaid source.`;

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
		outputs: [
			{ block: 1, file: '03-prompt-construction-mermaid-01.png' },
			{ block: 3, file: '03-prompt-construction-mermaid-03.png' },
			{ block: 4, file: '03-prompt-construction-mermaid-04.png' },
			{ block: 5, file: '03-prompt-construction-mermaid-05.png' },
		],
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
		outputs: [
			{ block: 1, file: '06-mcp-mermaid-01.png' },
			{ block: 2, file: '06-mcp-mermaid-02.png' },
			{ block: 3, file: '06-mcp-mermaid-03.png' },
			{ block: 4, file: '06-mcp-mermaid-04.png' },
			{ block: 6, file: '06-mcp-mermaid-06.png' },
			{ block: 8, file: '06-mcp-mermaid-08.png' },
			{ block: 9, file: '06-mcp-mermaid-09.png' },
		],
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
	return cleaned;
}

async function translateMermaidBlock(block) {
	const prompt = [
		'Translate this Mermaid diagram into natural English.',
		'Only translate human-readable Chinese text inside labels and annotations.',
		'Output Mermaid source only.',
		'',
		block,
	].join('\n');

	const { stdout } = await run(
		'claude',
		[
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
		],
	);

	return cleanClaudeOutput(stdout);
}

async function renderMermaid({ mermaidSource, outputPath, tempDir, puppeteerConfigPath }) {
	const stem = path.basename(outputPath, '.png');
	const inputPath = path.join(tempDir, `${stem}.mmd`);
	const rawOutputPath = path.join(tempDir, `${stem}.raw.png`);

	await fs.writeFile(inputPath, `${mermaidSource}\n`, 'utf8');

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

async function main() {
	if (!(await fileExists(CHROME_PATH))) {
		throw new Error(`Chrome not found at ${CHROME_PATH}`);
	}

	await ensureDir(TARGET_ASSETS_DIR);

	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-code-mermaid-en-'));
	const debugDir = path.join(tempDir, 'translated');
	await ensureDir(debugDir);

	const puppeteerConfigPath = path.join(tempDir, 'puppeteer-config.json');
	await fs.writeFile(
		puppeteerConfigPath,
		`${JSON.stringify({ executablePath: CHROME_PATH }, null, 2)}\n`,
		'utf8',
	);

	try {
		let total = 0;

		for (const mapping of FILE_MAPPINGS) {
			const sourcePath = path.join(OBSIDIAN_DIR, mapping.source);
			const markdown = await fs.readFile(sourcePath, 'utf8');
			const blocks = extractMermaidBlocks(markdown);

			for (const output of mapping.outputs) {
				const block = blocks[output.block - 1];
				if (!block) {
					throw new Error(
						`Missing Mermaid block ${output.block} in ${mapping.source}`,
					);
				}

				const translated = await translateMermaidBlock(block);
				await fs.writeFile(
					path.join(debugDir, output.file.replace(/\.png$/, '.mmd')),
					`${translated}\n`,
					'utf8',
				);
				await renderMermaid({
					mermaidSource: translated,
					outputPath: path.join(TARGET_ASSETS_DIR, output.file),
					tempDir,
					puppeteerConfigPath,
				});

				total += 1;
				console.log(
					`Rendered ${mapping.source} block ${output.block} -> ${output.file}`,
				);
			}
		}

		console.log(`\nDone. Rendered ${total} English Mermaid PNG files.`);
		console.log(`Translated Mermaid source saved under: ${debugDir}`);
	} finally {
		// Keep tempDir for inspection only on failure by commenting this out when debugging.
		await fs.rm(tempDir, { recursive: true, force: true });
	}
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
