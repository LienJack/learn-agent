#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceAssets = join(repoRoot, 'src/content/blog/zh/AI/build-harness/assets');
const targets = {
	en: {
		assets: join(repoRoot, 'src/content/blog/en/AI/build-harness/assets'),
		docsAssets: '/Users/lienli/Documents/GitHub/build-harness/docs/en/assets',
		translateTo: 'en',
		title: 'Build Harness',
		subtitle: 'Agent runtime, control, tools, memory, and durable execution',
		font: 'Comic Sans MS, Bradley Hand, Marker Felt, Trebuchet MS, Arial, sans-serif',
	},
	ja: {
		assets: join(repoRoot, 'src/content/blog/ja/AI/build-harness/assets'),
		docsAssets: '/Users/lienli/Documents/GitHub/build-harness/docs/ja/assets',
		translateTo: 'ja',
		title: 'Build Harness',
		subtitle: 'Agent 実行基盤、制御、ツール、メモリ、永続実行',
		font: 'Hiragino Sans, Yu Gothic, Noto Sans CJK JP, Arial, sans-serif',
	},
};
const cachePath = join(repoRoot, 'translate/artifacts/build-harness-asset-translation-cache.json');
const cache = readJson(cachePath, {});
const pendingTranslations = new Map();

const args = new Set(process.argv.slice(2));
const languages = [...args].filter((arg) => arg === 'en' || arg === 'ja');
const selectedLanguages = languages.length ? languages : ['en', 'ja'];
const skipRender = args.has('--skip-render');
const skipOrdinary = args.has('--skip-ordinary');
const skipTranslate = args.has('--skip-translate');
const skipSync = args.has('--skip-sync');

const PUPPETEER_CONFIG = join(repoRoot, 'tmp/build-harness-puppeteer.json');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

main().catch((error) => {
	console.error(error instanceof Error ? error.stack : String(error));
	process.exit(1);
});

async function main() {
	mkdirSync(dirname(cachePath), { recursive: true });
	mkdirSync(dirname(PUPPETEER_CONFIG), { recursive: true });
	writeFileSync(PUPPETEER_CONFIG, `${JSON.stringify({ executablePath: CHROME, args: ['--no-sandbox'] }, null, 2)}\n`);

	const summary = {};
	for (const language of selectedLanguages) {
		const config = targets[language];
		summary[language] = { translatedMmd: 0, renderedMermaid: 0, renderFailed: [], ordinaryImages: 0, synced: 0 };
		if (!skipTranslate) summary[language].translatedMmd = await translateMermaidTree(language, config);
		if (!skipRender) {
			const rendered = renderMermaidTree(config.assets);
			summary[language].renderedMermaid = rendered.ok;
			summary[language].renderFailed = rendered.failed;
		}
		if (!skipOrdinary) summary[language].ordinaryImages = await drawOrdinaryImages(language, config);
		if (!skipSync) summary[language].synced = syncAssets(config.assets, config.docsAssets);
	}
	writeJson(cachePath, cache);
	console.log(JSON.stringify(summary, null, 2));
}

async function translateMermaidTree(language, config) {
	let count = 0;
	for (const sourceFile of walk(sourceAssets).filter((file) => file.endsWith('.mmd'))) {
		const targetFile = join(config.assets, relative(sourceAssets, sourceFile));
		const source = readFileSync(sourceFile, 'utf8');
		const translated = await translateMermaidSource(source, config.translateTo);
		if (readIfExists(targetFile) !== translated) {
			mkdirSync(dirname(targetFile), { recursive: true });
			writeFileSync(targetFile, translated);
			count += 1;
		}
	}
	return count;
}

async function translateMermaidSource(source, targetLanguage) {
	let output = source;
	output = await replaceAsync(output, /"([^"]*[\p{Script=Han}][^"]*)"/gu, async (match, text) => {
		return `"${escapeMermaidLabel(await translateLabel(text, targetLanguage))}"`;
	});
	output = await replaceAsync(output, /^(\s*participant\s+\S+\s+as\s+)(.+)$/gmu, async (match, prefix, label) => {
		if (!hasHan(label)) return match;
		return `${prefix}${await translateLabel(label, targetLanguage)}`;
	});
	output = await replaceAsync(output, /\|([^|\n]*[\p{Script=Han}][^|\n]*)\|/gu, async (match, label) => {
		return `|${await translateLabel(label, targetLanguage)}|`;
	});
	output = await replaceAsync(output, /(--\s*)([^-\n>]*[\p{Script=Han}][^-\n>]*)(\s*--?>)/gu, async (match, before, label, after) => {
		return `${before}${await translateLabel(label.trim(), targetLanguage)}${after}`;
	});
	output = await replaceAsync(output, /(-\.\s*)([^.\n]*[\p{Script=Han}][^.\n]*)(\s*\.-)/gu, async (match, before, label, after) => {
		return `${before}${await translateLabel(label.trim(), targetLanguage)}${after}`;
	});
	if (targetLanguage === 'en') {
		output = await replaceAsync(output, /[\p{Script=Han}][\p{Script=Han}A-Za-z0-9_ /+.\-、，：；？?（）()&]*[\p{Script=Han}]?/gu, async (match) => {
			return translateLabel(match, targetLanguage);
		});
	}
	return output;
}

async function translateLabel(label, targetLanguage) {
	const normalized = label.replace(/\\n/g, '\n').replace(/\s+/g, ' ').trim();
	if (!normalized || !hasHan(normalized)) return label;
	const key = `${targetLanguage}:${normalized}`;
	if (!cache[key]) {
		if (!pendingTranslations.has(key)) {
			pendingTranslations.set(key, googleTranslate(normalized, targetLanguage)
				.then((translated) => {
					cache[key] = translated;
					writeJson(cachePath, cache);
					pendingTranslations.delete(key);
					return translated;
				})
				.catch((error) => {
					pendingTranslations.delete(key);
					throw error;
				}));
		}
		cache[key] = await pendingTranslations.get(key);
	}
	const translated = cache[key].replace(/\s+([,.:;?!])/g, '$1');
	return label.includes('\\n') ? translated.replace(/\s*;\s*/g, '\\n').replace(/\s+-\s+/g, '\\n') : translated;
}

async function googleTranslate(text, targetLanguage) {
	const params = new URLSearchParams({ client: 'gtx', sl: 'zh-CN', tl: targetLanguage, dt: 't', q: text });
	let lastError;
	for (let attempt = 0; attempt < 5; attempt += 1) {
		try {
			const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`);
			if (!response.ok) throw new Error(`Translate failed ${response.status}: ${text}`);
			const data = await response.json();
			return data?.[0]?.map((part) => part?.[0] || '').join('')?.trim() || text;
		} catch (error) {
			lastError = error;
			await sleep(250 * (attempt + 1));
		}
	}
	throw lastError;
}

function renderMermaidTree(root) {
	let ok = 0;
	const failed = [];
	for (const mmd of walk(root).filter((file) => file.endsWith('.mmd'))) {
		const png = mmd.replace(/\.mmd$/, '.png');
		const result = spawnSync('npx', ['-y', '@mermaid-js/mermaid-cli', '-i', mmd, '-o', png, '-p', PUPPETEER_CONFIG], {
			cwd: repoRoot,
			encoding: 'utf8',
			maxBuffer: 1024 * 1024 * 20,
		});
		if (result.status === 0) {
			ok += 1;
		} else {
			failed.push({ file: relative(repoRoot, mmd), error: `${result.stderr || result.stdout}`.slice(0, 1000) });
		}
	}
	return { ok, failed };
}

async function drawOrdinaryImages(language, config) {
	let count = 0;
	for (const sourceFile of walk(sourceAssets).filter(isOrdinaryPng)) {
		const rel = relative(sourceAssets, sourceFile);
		const targetFile = join(config.assets, rel);
		const metadata = await sharp(sourceFile).metadata();
		const prompt = findPromptForImage(targetFile, language);
		const labels = extractLabels(prompt, language, rel);
		const title = extractTitle(prompt, rel, language);
		const svg = drawTechnicalSvg({
			width: metadata.width || 1600,
			height: metadata.height || 900,
			title,
			labels,
			language,
			font: config.font,
			rel,
			cover: rel === 'cover.png' || rel.endsWith('/cover.png'),
			subtitle: rel === 'cover.png' ? config.subtitle : '',
		});
		mkdirSync(dirname(targetFile), { recursive: true });
		await sharp(Buffer.from(svg)).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(targetFile);
		count += 1;
	}
	return count;
}

function isOrdinaryPng(file) {
	if (!/\.png$/i.test(file)) return false;
	return !/\/mermaid-\d+\.png$/i.test(file);
}

function findPromptForImage(imagePath, language) {
	const dir = dirname(imagePath);
	const stem = imagePath.replace(/\.png$/i, '');
	const direct = `${stem}.prompt.${language}.md`;
	if (existsSync(direct)) return readFileSync(direct, 'utf8');
	const cover = join(dir, 'cover-prompt.md');
	if (existsSync(cover)) return readFileSync(cover, 'utf8');
	return '';
}

function extractLabels(prompt, language, rel) {
	const fallback = language === 'ja'
		? ['モデル', 'ループ', 'ツール', '状態', '制御', '観測', '検証']
		: ['Model', 'Loop', 'Tools', 'State', 'Control', 'Observe', 'Verify'];
	const match = language === 'ja'
		? prompt.match(/(?:文字|ラベル).*?[：:]\s*([^。\n]+)/s)
		: prompt.match(/(?:Text|Labels?|Nodes).*?(?:labels?|Nodes?):\s*([^.\n]+)/is);
	const raw = match?.[1] || '';
	const labels = raw
		.split(/[、,，]/)
		.map((item) => item.replace(/["'`。]/g, '').trim())
		.filter((item) => item && item.length <= 28)
		.slice(0, 9);
	if (labels.length >= 3) return labels;
	if (rel.includes('cover')) return language === 'ja'
		? ['Harness', 'Agent', 'Runtime', 'Tool', 'Memory', 'Policy']
		: ['Harness', 'Agent', 'Runtime', 'Tools', 'Memory', 'Policy'];
	return fallback;
}

function extractTitle(prompt, rel, language) {
	const quoted = prompt.match(/[“"]([^”"]{6,90})[”"]/);
	if (quoted) return quoted[1];
	const name = rel.split('/').at(-2) || rel.replace(/\.png$/, '');
	return language === 'ja' ? titleCase(name).replace(/-/g, ' ') : titleCase(name);
}

function drawTechnicalSvg({ width, height, title, labels, language, font, rel, cover, subtitle }) {
	const ink = '#181715';
	const paper = '#f8f1e4';
	const yellow = '#f3dc8a';
	const blue = '#c8dceb';
	const green = '#cfe3d1';
	const pink = '#ead2d8';
	const muted = '#5f5a50';
	const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
	const wrap = (text, max) => {
		const chars = String(text).split(language === 'ja' ? '' : /\s+/);
		const lines = [];
		let current = '';
		for (const char of chars) {
			const next = language === 'ja' ? current + char : current ? `${current} ${char}` : char;
			if (next.length <= max) current = next;
			else {
				if (current) lines.push(current);
				current = char;
			}
		}
		if (current) lines.push(current);
		return lines.slice(0, 3);
	};
	const text = (value, x, y, size = 28, max = 20, color = ink, weight = 700) => wrap(value, max)
		.map((line, index) => `<text x="${x}" y="${y + index * size * 1.18}" text-anchor="middle" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(line)}</text>`)
		.join('\n');
	const card = (x, y, w, h, fill = '#fffaf0', hl = false) => `${hl ? `<rect x="${x + 8}" y="${y + 8}" width="${w}" height="${h}" rx="22" fill="${yellow}" opacity="0.55"/>` : ''}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="${fill}" stroke="${ink}" stroke-width="4"/><rect x="${x + 8}" y="${y + 8}" width="${w - 16}" height="${h - 16}" rx="16" fill="none" stroke="${ink}" opacity="0.35" stroke-width="1.5"/>`;
	const arrow = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} C${x1 + 55} ${y1}, ${x2 - 55} ${y2}, ${x2} ${y2}" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round" marker-end="url(#arrow)"/>`;
	const icon = (x, y, kind) => {
		const common = `stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
		if (kind % 5 === 0) return `<g transform="translate(${x} ${y})"><circle r="28" ${common}/><path d="M-16 0 H16 M0 -16 V16" ${common}/></g>`;
		if (kind % 5 === 1) return `<g transform="translate(${x} ${y})"><rect x="-34" y="-24" width="68" height="48" rx="10" ${common}/><path d="M-18 -2 l12 10 -12 10 M2 18 H20" ${common}/></g>`;
		if (kind % 5 === 2) return `<g transform="translate(${x} ${y})"><path d="M0 -34 C16 -23 28 -25 36 -22 C33 12 22 28 0 39 C-22 28 -33 12 -36 -22 C-28 -25 -16 -23 0 -34 Z" ${common}/></g>`;
		if (kind % 5 === 3) return `<g transform="translate(${x} ${y})"><path d="M-28 -20 H10 L30 0 V34 H-28 Z" ${common}/><path d="M10 -20 V0 H30" ${common}/></g>`;
		return `<g transform="translate(${x} ${y})"><path d="M-30 -2 C-25 -32 22 -34 34 -6" ${common}/><path d="M31 9 C22 35 -24 35 -35 7" ${common}/></g>`;
	};
	let body = '';
	if (cover) {
		body += `<g>${text('Build Harness', width / 2, height * 0.25, Math.min(86, width / 18), 24)}${text(subtitle || title, width / 2, height * 0.25 + 88, Math.min(34, width / 46), 50, muted, 500)}</g>`;
		const xs = labels.slice(0, 6).map((_, i) => width * (0.17 + i * 0.132));
		xs.forEach((x, i) => {
			const y = height * (0.58 + (i % 2) * 0.08);
			body += card(x - 100, y - 64, 200, 128, [yellow, blue, green, pink, '#fffaf0'][i % 5], i === 0 || i === 3);
			body += icon(x, y - 18, i);
			body += text(labels[i], x, y + 40, 25, 14);
			if (i < xs.length - 1) body += arrow(x + 105, y, xs[i + 1] - 105, height * (0.58 + ((i + 1) % 2) * 0.08));
		});
	} else if (/loop|cycle|flywheel|ループ|循环|回环/i.test(promptless(rel, title))) {
		const cx = width / 2;
		const cy = height * 0.55;
		const r = Math.min(width, height) * 0.26;
		body += text(title, cx, height * 0.13, Math.min(46, width / 30), 42);
		labels.slice(0, 6).forEach((label, i, arr) => {
			const a = -Math.PI / 2 + i * Math.PI * 2 / arr.length;
			const x = cx + Math.cos(a) * r;
			const y = cy + Math.sin(a) * r;
			body += card(x - 100, y - 56, 200, 112, i % 2 ? '#fffaf0' : '#fff4d2', i === 0);
			body += icon(x, y - 12, i);
			body += text(label, x, y + 40, 24, 13);
		});
		body += `<circle cx="${cx}" cy="${cy}" r="${r * 0.48}" fill="${yellow}" opacity="0.45" stroke="${ink}" stroke-width="4"/>${text('Agent', cx, cy + 12, 40, 14)}`;
	} else {
		body += text(title, width / 2, height * 0.12, Math.min(44, width / 32), 44);
		const n = Math.min(labels.length, 8);
		const y = height * 0.55;
		const startX = width * 0.12;
		const gap = (width * 0.76) / Math.max(1, n - 1);
		labels.slice(0, n).forEach((label, i) => {
			const x = startX + gap * i;
			const yy = y + (i % 2 ? 46 : -28);
			body += card(x - 92, yy - 58, 184, 116, i % 3 === 0 ? '#fff4d2' : i % 3 === 1 ? '#eef7f1' : '#edf5fb', i === 0 || i === n - 1);
			body += icon(x, yy - 15, i);
			body += text(label, x, yy + 40, 23, 12);
			if (i < n - 1) body += arrow(x + 96, yy, startX + gap * (i + 1) - 96, y + ((i + 1) % 2 ? 46 : -28));
		});
	}
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
<marker id="arrow" markerWidth="14" markerHeight="14" refX="11" refY="7" orient="auto"><path d="M2 2 L12 7 L2 12" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></marker>
<pattern id="dots" x="0" y="0" width="78" height="78" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="1.5" fill="#ccbfa5" opacity="0.38"/></pattern>
<filter id="rough"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="8" result="noise"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.045"/></feComponentTransfer><feBlend in="SourceGraphic" in2="noise" mode="multiply"/></filter>
</defs>
<rect width="${width}" height="${height}" fill="${paper}" filter="url(#rough)"/>
<rect width="${width}" height="${height}" fill="url(#dots)" opacity="0.32"/>
<path d="M40 ${height * 0.22} C${width * 0.2} ${height * 0.14},${width * 0.35} ${height * 0.28},${width * 0.48} ${height * 0.18} M${width * 0.58} ${height * 0.82} C${width * 0.7} ${height * 0.72},${width * 0.82} ${height * 0.9},${width - 50} ${height * 0.78}" fill="none" stroke="#c7b99d" stroke-width="2" opacity="0.45" stroke-dasharray="8 12"/>
${body}
</svg>`;
}

function promptless(rel, title) {
	return `${rel} ${title}`;
}

function syncAssets(sourceDir, targetDir) {
	let count = 0;
	for (const file of walk(sourceDir).filter((item) => /\.(png|jpe?g|webp|mmd|md|json)$/i.test(item))) {
		const target = join(targetDir, relative(sourceDir, file));
		mkdirSync(dirname(target), { recursive: true });
		copyFileSync(file, target);
		count += 1;
	}
	return count;
}

function walk(root) {
	const files = [];
	if (!existsSync(root)) return files;
	for (const entry of readdirSync(root, { withFileTypes: true })) {
		const file = join(root, entry.name);
		if (entry.isDirectory()) files.push(...walk(file));
		else files.push(file);
	}
	return files;
}

function readIfExists(file) {
	return existsSync(file) ? readFileSync(file, 'utf8') : '';
}

function readJson(file, fallback) {
	try {
		return JSON.parse(readFileSync(file, 'utf8'));
	} catch {
		return fallback;
	}
}

function writeJson(file, value) {
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function titleCase(value) {
	return String(value)
		.replace(/\.[^.]+$/, '')
		.split(/[-_]/)
		.filter(Boolean)
		.map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
		.join(' ');
}

function hasHan(value) {
	return /\p{Script=Han}/u.test(value);
}

function escapeMermaidLabel(value) {
	return value.replace(/\n/g, '\\n').replace(/"/g, "'");
}

async function replaceAsync(source, regex, replacer) {
	const replacements = [];
	let lastIndex = 0;
	for (const match of source.matchAll(regex)) {
		replacements.push({
			start: match.index,
			end: match.index + match[0].length,
			match: [...match],
		});
		lastIndex = match.index + match[0].length;
	}
	const resolved = await mapLimit(replacements, 8, async (item) => ({ ...item, value: await replacer(...item.match) }));
	const parts = [];
	lastIndex = 0;
	for (const item of resolved) {
		parts.push(source.slice(lastIndex, item.start));
		parts.push(item.value);
		lastIndex = item.end;
	}
	parts.push(source.slice(lastIndex));
	return parts.join('');
}

async function mapLimit(items, limit, mapper) {
	const results = new Array(items.length);
	let cursor = 0;
	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (cursor < items.length) {
			const index = cursor;
			cursor += 1;
			results[index] = await mapper(items[index], index);
		}
	});
	await Promise.all(workers);
	return results;
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
