import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const OBSIDIAN_DIR =
	'/Users/lienli/Library/Mobile Documents/iCloud~md~obsidian/Documents/tech/techBlog/blog/4 Cluade Code源码解析/终稿';
const TARGET_ASSETS_DIR =
	'/Users/lienli/Documents/GitHub/learn-agent/src/content/blog/zh/AI/3.ClaudeCode源码解析/assets';
const MERMAID_CLI_PACKAGE = '@mermaid-js/mermaid-cli';
const PUPPETEER_CONFIG = {
	executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
};

const FILE_MAPPINGS = [
	{ source: '1.工程架构.md', targetPrefix: '01.工程架构-mermaid' },
	{ source: '2.核心机制-ReAction.md', targetPrefix: '02.核心机制-ReAct-mermaid' },
	{ source: '3.核心机制- Prompt编写.md', targetPrefix: '03.核心机制-Prompt编写-mermaid' },
	{ source: '4.1核心机制- Context管理.md', targetPrefix: '04.1核心机制-Context管理-mermaid' },
	{ source: '5.核心机制-Tools.md', targetPrefix: '05.0核心机制-Tools-mermaid' },
	{ source: '10.1Tool-file 文件管理.md', targetPrefix: '05.1文件工具-文件管理-mermaid' },
	{ source: '10.3Tool-终端类.md', targetPrefix: '05.2终端工具-命令执行-mermaid' },
	{ source: '10.2Tool-工作流类.md', targetPrefix: '05.3工作流工具-任务管理-mermaid' },
	{ source: '6.MCP.md', targetPrefix: '06.MCP-mermaid' },
	{ source: '7.Skill.md', targetPrefix: '07.Skill-mermaid' },
	{ source: '8.1Agent协作.md', targetPrefix: '08.1Agent协作-mermaid' },
	{ source: '8.2业界的agent协作（选修）.md', targetPrefix: '08.2业界的Agent协作（选修）-mermaid' },
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

function extractMermaidBlocks(markdown) {
	return [...markdown.matchAll(/^```mermaid\n([\s\S]*?)\n```/gm)].map((match) => match[1]);
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

async function exportOneBlock({
	block,
	index,
	outputPrefix,
	tempDir,
	puppeteerConfigPath,
}) {
	const paddedIndex = String(index).padStart(2, '0');
	const inputPath = path.join(tempDir, `${outputPrefix}-${paddedIndex}.mmd`);
	const outputPath = path.join(TARGET_ASSETS_DIR, `${outputPrefix}-${paddedIndex}.png`);

	await fs.writeFile(inputPath, `${block}\n`, 'utf8');

	await run(
		'pnpm',
		[
			'dlx',
			MERMAID_CLI_PACKAGE,
			'-i',
			inputPath,
			'-o',
			outputPath,
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

	return outputPath;
}

async function main() {
	if (!(await fileExists(PUPPETEER_CONFIG.executablePath))) {
		throw new Error(`Chrome not found at ${PUPPETEER_CONFIG.executablePath}`);
	}

	await ensureDir(TARGET_ASSETS_DIR);

	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-code-mermaid-'));
	const puppeteerConfigPath = path.join(tempDir, 'puppeteer-config.json');
	await fs.writeFile(
		puppeteerConfigPath,
		`${JSON.stringify(PUPPETEER_CONFIG, null, 2)}\n`,
		'utf8',
	);

	try {
		let total = 0;

		for (const mapping of FILE_MAPPINGS) {
			const sourcePath = path.join(OBSIDIAN_DIR, mapping.source);
			const markdown = await fs.readFile(sourcePath, 'utf8');
			const blocks = extractMermaidBlocks(markdown);

			if (blocks.length === 0) {
				console.log(`Skip ${mapping.source}: no mermaid blocks found`);
				continue;
			}

			for (const [blockIndex, block] of blocks.entries()) {
				const outputPath = await exportOneBlock({
					block,
					index: blockIndex + 1,
					outputPrefix: mapping.targetPrefix,
					tempDir,
					puppeteerConfigPath,
				});

				total += 1;
				console.log(
					`Exported ${mapping.source}#${blockIndex + 1} -> ${path.basename(outputPath)}`,
				);
			}
		}

		console.log(`\nDone. Exported ${total} Mermaid charts to PNG.`);
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true });
	}
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
