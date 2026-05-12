#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('../../..', import.meta.url).pathname);
const outputRoot = path.join(repoRoot, 'output', 'article-local-images');
const articlePaths = process.argv.slice(2);

if (!articlePaths.length) {
	console.error('Usage: node local-technical-illustrations.mjs <article.md ...>');
	process.exit(1);
}

for (const articlePath of articlePaths) {
	const articleAbs = path.resolve(repoRoot, articlePath);
	const workspace = workspaceFor(articleAbs);
	const manifestPath = path.join(workspace, 'manifest.json');
	if (!existsSync(manifestPath)) throw new Error(`Missing manifest: ${manifestPath}`);
	const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
	const assets = manifest.assets.filter((asset) =>
		(asset.kind === 'cover' || asset.kind === 'photo') && asset.status !== 'imported',
	);
	for (const asset of assets) {
		const promptRequestPath = path.resolve(repoRoot, asset.promptPath);
		if (!existsSync(promptRequestPath)) throw new Error(`Missing prompt request: ${asset.promptPath}`);
		const request = readFileSync(promptRequestPath, 'utf8');
		const finalPrompt = buildFinalPrompt(asset, request);
		const finalPromptPath = promptRequestPath.replace(/-prompt\.md$/, '-final-prompt.md');
		writeFileSync(finalPromptPath, `${finalPrompt}\n`);

		const outDir = path.join(outputRoot, path.basename(workspace));
		mkdirSync(outDir, { recursive: true });
		const baseName = path.basename(asset.targetPath, path.extname(asset.targetPath));
		const svgPath = path.join(outDir, `${baseName}.svg`);
		const pngPath = path.join(outDir, `${baseName}.png`);
		writeFileSync(svgPath, renderSvg(asset, request, manifest));
		renderPng(svgPath, pngPath);
		importImage(articleAbs, asset.id, pngPath);
	}
}

function workspaceFor(articleAbs) {
	const dir = path.dirname(articleAbs);
	const assetsDir = path.join(dir, 'assets');
	const articleRel = toRepo(articleAbs);
	if (!existsSync(assetsDir)) throw new Error(`Missing assets dir: ${assetsDir}`);
	for (const entry of readdirSync(assetsDir)) {
		const entryPath = path.join(assetsDir, entry);
		const manifestPath = path.join(entryPath, 'manifest.json');
		if (!statSync(entryPath).isDirectory() || !existsSync(manifestPath)) continue;
		const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
		if (manifest.article === articleRel) return entryPath;
	}
	throw new Error(`Cannot find workspace for ${articleAbs}`);
}

function buildFinalPrompt(asset, request) {
	const topic = asset.kind === 'cover'
		? (asset.title || titleFromRequest(request) || '技术文章封面')
		: (asset.sectionHeading || titleFromRequest(request) || '技术机制图');
	const nodes = pickNodes(asset, request);
	const diagram = asset.kind === 'cover' ? '分层关系封面图' : chooseDiagram(request);
	return [
		`画一张${asset.kind === 'cover' ? '技术博客封面图' : '文章内技术解释图'}，主题是 ${topic}。`,
		'',
		'画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。',
		'',
		`构图：${diagram}。画面包含 ${nodes.length} 个关键节点，并用手绘箭头连接。`,
		'',
		'节点：',
		...nodes.map((node, index) => `${index + 1}. ${node}: 用简单线性图标表示。`),
		'',
		`高亮：用淡黄色强调 ${nodes.slice(0, 2).join(' 和 ')}。`,
		'背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。',
		'文字：节点标签短；中文文字保持大而少。如果文字不稳定，则只保留干净标签块。',
		'',
		'负向提示词：不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点。',
	].join('\n');
}

function renderSvg(asset, request, manifest) {
	const isCover = asset.kind === 'cover';
	const width = isCover ? 1536 : 1280;
	const height = isCover ? 864 : 820;
	const topic = cleanLabel(isCover ? (asset.title || manifest.article) : (asset.sectionHeading || titleFromRequest(request)), isCover ? 28 : 24);
	const subtitle = cleanLabel(isCover ? (asset.description || '技术体系关系图') : (oneSentence(request) || '机制拆解图'), isCover ? 44 : 36);
	const nodes = pickNodes(asset, request);
	const seed = hash(asset.targetPath);
	const palette = ['#f8d46b', '#b7d9f2', '#cfe8c9', '#f1b7a8', '#d7c7f4', '#bde0d7'];
	const xPad = 96;
	const cardW = isCover ? 270 : 220;
	const cardH = isCover ? 116 : 104;
	const y = isCover ? 400 : 390;
	const gap = (width - xPad * 2 - cardW * nodes.length) / Math.max(1, nodes.length - 1);
	const positions = nodes.map((_, index) => ({
		x: xPad + index * (cardW + gap),
		y: y + Math.sin((seed + index) * 1.7) * 28,
	}));
	const nodeCards = nodes.map((node, index) => {
		const pos = positions[index];
		const color = palette[(seed + index) % palette.length];
		const icon = iconFor(node, pos.x + 36, pos.y + 46, color);
		return `
			<g class="node">
				<rect x="${pos.x}" y="${pos.y}" width="${cardW}" height="${cardH}" rx="20" fill="#fffaf0" stroke="#1f2933" stroke-width="3"/>
				<rect x="${pos.x + 12}" y="${pos.y + 12}" width="62" height="62" rx="18" fill="${color}" opacity="0.72" stroke="#1f2933" stroke-width="2"/>
				${icon}
				<text x="${pos.x + 88}" y="${pos.y + 48}" class="label">${escapeXml(cleanLabel(node, 10))}</text>
				<text x="${pos.x + 88}" y="${pos.y + 78}" class="tiny">${escapeXml(nodeHint(node))}</text>
			</g>`;
	}).join('\n');
	const arrows = positions.slice(0, -1).map((pos, index) => {
		const next = positions[index + 1];
		const startX = pos.x + cardW + 8;
		const startY = pos.y + cardH / 2;
		const endX = next.x - 12;
		const endY = next.y + cardH / 2;
		return `<path d="M ${startX} ${startY} C ${startX + 45} ${startY}, ${endX - 45} ${endY}, ${endX} ${endY}" class="arrow"/>`;
	}).join('\n');
	const highlight = positions[0]
		? `<ellipse cx="${positions[0].x + cardW / 2}" cy="${positions[0].y + cardH / 2}" rx="${cardW / 2 + 26}" ry="${cardH / 2 + 24}" fill="#f8d46b" opacity="0.18"/>`
		: '';
	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
	<defs>
		<marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
			<path d="M2,2 L10,6 L2,10" fill="none" stroke="#1f2933" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
		</marker>
		<pattern id="paper" width="42" height="42" patternUnits="userSpaceOnUse">
			<rect width="42" height="42" fill="#fbf6e9"/>
			<circle cx="8" cy="11" r="1.2" fill="#eadfca" opacity="0.35"/>
			<circle cx="31" cy="26" r="0.9" fill="#d8c9ae" opacity="0.28"/>
		</pattern>
		<style>
			.title { font-family: sans-serif; font-size: ${isCover ? 54 : 42}px; font-weight: 800; fill: #1f2933; }
			.subtitle { font-family: sans-serif; font-size: ${isCover ? 28 : 22}px; font-weight: 500; fill: #4b5563; }
			.label { font-family: sans-serif; font-size: ${isCover ? 24 : 22}px; font-weight: 750; fill: #1f2933; }
			.tiny { font-family: sans-serif; font-size: 15px; fill: #5f6874; }
			.arrow { fill: none; stroke: #1f2933; stroke-width: 3.2; stroke-linecap: round; stroke-dasharray: 10 7; marker-end: url(#arrow); }
			.sketch { fill: none; stroke: #1f2933; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
		</style>
	</defs>
	<rect width="100%" height="100%" fill="url(#paper)"/>
	${backgroundLines(width, height, seed)}
	<text x="96" y="${isCover ? 135 : 108}" class="title">${escapeXml(topic)}</text>
	<text x="98" y="${isCover ? 184 : 148}" class="subtitle">${escapeXml(subtitle)}</text>
	${highlight}
	${arrows}
	${nodeCards}
	<path d="M96 ${height - 118} C350 ${height - 148}, 520 ${height - 86}, 760 ${height - 110} S1130 ${height - 152}, ${width - 104} ${height - 100}" fill="none" stroke="#d3b34c" stroke-width="9" opacity="0.22" stroke-linecap="round"/>
	<text x="98" y="${height - 62}" class="subtitle">${escapeXml(isCover ? '从模型能力到工程运行环境' : '把抽象概念拆成可执行链路')}</text>
</svg>`;
}

function renderPng(svgPath, pngPath) {
	const result = spawnSync('rsvg-convert', ['-f', 'png', '-o', pngPath, svgPath], { encoding: 'utf8' });
	if (result.status !== 0) {
		process.stderr.write(result.stderr);
		throw new Error(`rsvg-convert failed for ${svgPath}`);
	}
}

function importImage(articleAbs, promptId, pngPath) {
	const result = spawnSync(
		'images/bin/article-images',
		['--import', toRepo(pngPath), '--prompt-id', promptId, toRepo(articleAbs)],
		{ cwd: repoRoot, encoding: 'utf8' },
	);
	process.stdout.write(result.stdout);
	process.stderr.write(result.stderr);
	if (result.status !== 0) throw new Error(`Import failed: ${promptId} ${toRepo(articleAbs)}`);
}

function pickNodes(asset, request) {
	const source = `${asset.title || ''}\n${asset.description || ''}\n${asset.sectionHeading || ''}\n${request}`;
	const candidates = [
		['Prompt', /prompt|提示词|任务说明/iu],
		['Context', /context|上下文|材料/iu],
		['RAG', /rag|检索|知识库/iu],
		['Token', /token|切块|词片段/iu],
		['Embedding', /embedding|向量|地图/iu],
		['Pretrain', /pretrain|预训练|海量/iu],
		['Attention', /attention|注意力|q\/k\/v|transformer/iu],
		['Tools', /tools?|工具/iu],
		['Function', /function calling|函数调用/iu],
		['MCP', /mcp|协议|标准/iu],
		['Skill', /skill|技能|复用/iu],
		['Harness', /harness|监督|执行|验收|约束/iu],
		['Agent', /agent|循环|干活/iu],
		['OpenClaw', /openclaw/iu],
		['Hermes', /hermes/iu],
		['入口', /入口|telegram|飞书|slack|网页/iu],
		['记忆', /记忆|偏好|历史/iu],
		['审批', /审批|审计|回滚|安全/iu],
	].filter(([, pattern]) => pattern.test(source)).map(([label]) => label);
	const headingWords = cleanLabel(asset.sectionHeading || asset.title || titleFromRequest(request), 18)
		.split(/[、，：:｜| /]+/)
		.filter((word) => word && word.length <= 12);
	const fallback = asset.kind === 'cover'
		? ['问题', '模型', '工具', '运行环境', '治理']
		: ['输入', '处理', '状态', '工具', '结果'];
	return unique([...candidates, ...headingWords, ...fallback]).slice(0, asset.kind === 'cover' ? 5 : 6);
}

function chooseDiagram(request) {
	if (/循环|loop|反复|多步|执行链/iu.test(request)) return '环形执行链路';
	if (/层|包含关系|架构|体系|外壳/iu.test(request)) return '分层架构图';
	if (/不是|边界|区别|混淆/iu.test(request)) return '对比式分区图';
	return '从左到右的输入-处理-输出流程图';
}

function titleFromRequest(request) {
	return request.match(/^#\s+(.+)$/m)?.[1]?.replace(/^photo-\d+:\s*/, '').replace(/^cover:\s*/, '') || '';
}

function oneSentence(request) {
	const text = request.replace(/```[\s\S]*?```/g, '').replace(/[#>*`-]/g, '').replace(/\s+/g, ' ');
	return cleanLabel(text.split(/[。.!?]/).find((part) => part.trim().length > 18) || '', 42);
}

function cleanLabel(value = '', max = 16) {
	return String(value)
		.replace(/\[[^\]]+]\([^)]+\)/g, '')
		.replace(/\[\[|\]\]/g, '')
		.replace(/[`*_#]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, max);
}

function nodeHint(node) {
	if (/Prompt/i.test(node)) return '任务说明';
	if (/Context/i.test(node)) return '当前材料';
	if (/RAG/i.test(node)) return '运行时补资料';
	if (/MCP/i.test(node)) return '标准接入';
	if (/Harness/i.test(node)) return '监督执行';
	if (/Agent/i.test(node)) return '循环干活';
	if (/Tools/i.test(node)) return '外部能力';
	return '关键环节';
}

function iconFor(node, cx, cy) {
	if (/RAG|检索|Context|材料/i.test(node)) {
		return `<path class="sketch" d="M${cx - 14} ${cy + 8} l13 -13 l20 20 l-13 13 z"/><circle class="sketch" cx="${cx - 6}" cy="${cy}" r="13"/>`;
	}
	if (/Tools|Function|工具|Harness/i.test(node)) {
		return `<path class="sketch" d="M${cx - 20} ${cy + 16} l27 -27"/><path class="sketch" d="M${cx - 8} ${cy - 20} l18 18 l-11 11 l-18 -18 z"/>`;
	}
	if (/Agent|LLM|模型|Token|Attention/i.test(node)) {
		return `<circle class="sketch" cx="${cx}" cy="${cy}" r="20"/><path class="sketch" d="M${cx - 12} ${cy - 2} h24 M${cx - 8} ${cy + 9} h16 M${cx - 18} ${cy - 18} l-10 -10 M${cx + 18} ${cy - 18} l10 -10"/>`;
	}
	return `<rect class="sketch" x="${cx - 21}" y="${cy - 18}" width="42" height="36" rx="8"/><path class="sketch" d="M${cx - 13} ${cy - 3} h26 M${cx - 13} ${cy + 9} h18"/>`;
}

function backgroundLines(width, height, seed) {
	const lines = [];
	for (let i = 0; i < 16; i += 1) {
		const x1 = 70 + ((seed * 37 + i * 103) % (width - 140));
		const y1 = 210 + ((seed * 29 + i * 67) % (height - 340));
		const x2 = x1 + 45 + ((seed + i * 19) % 130);
		const y2 = y1 + (((seed + i) % 2) ? 28 : -28);
		lines.push(`<path d="M${x1} ${y1} L${x2} ${y1} L${x2} ${y2}" fill="none" stroke="#95a3b3" stroke-width="2" opacity="0.16"/>`);
		lines.push(`<circle cx="${x2}" cy="${y2}" r="4" fill="#95a3b3" opacity="0.18"/>`);
	}
	return lines.join('\n');
}

function unique(values) {
	return [...new Set(values.filter(Boolean))];
}

function hash(value) {
	return createHash('sha256').update(value).digest()[0];
}

function escapeXml(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function toRepo(absPath) {
	return path.relative(repoRoot, absPath);
}
