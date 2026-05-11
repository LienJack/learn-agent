import { existsSync } from 'node:fs';
import {
	findMarkdownImageRefs,
	isLocalImageRef,
	repoRoot,
	resolveLocalImage,
	validateRequiredFields,
} from './common.mjs';

export function inspectChineseArticle(article) {
	const imageRefs = findMarkdownImageRefs(article.body);
	const codeBlocks = findFencedCodeBlocks(article.body);
	const blockers = validateRequiredFields(article, ['title', 'description']);
	const warnings = [];
	const title = String(article.data.title || '');
	const wechatTitle = chineseShortTitle(article);
	const cover = coverPath(article);

	if (!article.data.author) {
		warnings.push(`${article.sourceRelPath}: author frontmatter is missing; WeChat draft metadata may need manual input.`);
	}
	if (!cover.raw) {
		blockers.push(`${article.sourceRelPath}: heroImage is required before Chinese platform draft creation.`);
	} else if (!cover.exists) {
		blockers.push(`${article.sourceRelPath}: heroImage not found: ${cover.raw} resolved to ${cover.absolute}`);
	}
	if (title.length > 32 && !wechatTitle) {
		blockers.push(`${article.sourceRelPath}: title is longer than 32 characters; add wechatTitle, shortTitle, or wechat_title before WeChat draft creation.`);
	} else if (title.length > 32) {
		warnings.push(`${article.sourceRelPath}: using short WeChat title "${wechatTitle}" because original title is longer than 32 characters.`);
	}

	const localImages = imageRefs.filter((ref) => isLocalImageRef(ref.url));
	for (const ref of localImages) {
		const localPath = resolveLocalImage(article, ref.url);
		if (!existsSync(localPath)) {
			blockers.push(`${article.sourceRelPath}: image not found: ${ref.url} resolved to ${localPath}`);
		}
	}
	for (const block of codeBlocks) {
		if (block.kind === 'text-note') {
			warnings.push(`${article.sourceRelPath}: text fence #${block.index} should render as a WeChat note block, not a horizontal code scroller.`);
		}
		if (block.longestLineLength > 88 && block.kind === 'code') {
			warnings.push(`${article.sourceRelPath}: code fence #${block.index} has long lines; verify WeChat preserves readable wrapping or use the line-preserved template.`);
		}
	}

	return {
		blockers,
		warnings,
		imageRefs,
		localImages,
		codeBlocks,
		codeHandling: codeHandlingPlan(codeBlocks),
		cover,
		titles: {
			original: title,
			wechat: wechatTitle || title,
			juejin: title,
			zhihu: title,
		},
		acceptance: acceptanceChecklist({ imageCount: localImages.length, cover, titles: { wechat: wechatTitle || title, juejin: title, zhihu: title } }),
		commands: commandPlan(article, {
			cover,
			localImages,
			titles: {
				wechat: wechatTitle || title,
				juejin: title,
				zhihu: title,
			},
		}),
		platforms: [
			wechatStatus({ imageCount: localImages.length }),
			wechatsyncStatus('juejin', { imageCount: localImages.length }),
			wechatsyncStatus('zhihu', { imageCount: localImages.length }),
		],
	};
}

function chineseShortTitle(article) {
	return article.data.wechatTitle || article.data.shortTitle || article.data.wechat_title || '';
}

function coverPath(article) {
	const raw = article.data.heroImage ? String(article.data.heroImage) : '';
	if (!raw) return { raw: '', absolute: '', exists: false };
	if (!isLocalImageRef(raw)) return { raw, absolute: raw, exists: true };
	const absolute = resolveLocalImage(article, raw);
	return { raw, absolute, exists: existsSync(absolute) };
}

function commandPlan(article, { cover, localImages, titles }) {
	const articleArg = quote(article.sourceRelPath);
	const coverArg = cover.absolute ? quote(relativeForCommand(cover.absolute)) : '<missing-cover>';
	const htmlPath = `publish/artifacts/<run-id>/${articleSlug(article)}-wechat.html`;
	const imageUploadCommands = localImages.map((ref) => {
		const localPath = resolveLocalImage(article, ref.url);
		return `md2wechat upload_image ${quote(relativeForCommand(localPath))} --json`;
	});

	return {
		wechat: {
			discovery: [
				'md2wechat version --json',
				'md2wechat capabilities --json',
				'md2wechat themes list --json',
				'md2wechat themes show autumn-warm --json',
				'md2wechat config validate',
			],
			inspect: [`md2wechat inspect ${articleArg}`],
			convert: [
				`md2wechat convert ${articleArg} --mode ai --theme autumn-warm --title ${quote(titles.wechat)} -o ${quote(htmlPath)}`,
			],
			staticChecks: [
				`rg -n "(\\.\\./assets|\\./assets|file://|/Users/|%2Fassets)" ${quote(htmlPath)}`,
				`rg -n "mdnice编辑器|pre class=\\"custom\\"|code class=\\"hljs\\"|&nbsp;|overflow-x:auto|note-block" ${quote(htmlPath)}`,
			],
			codeHandling: codeHandlingPlan([]),
			uploadImages: imageUploadCommands,
			draft: [`md2wechat test-draft ${quote(htmlPath)} ${coverArg} --json`],
			never: ['Do not use wechatsync -p weixin for the final WeChat draft.'],
		},
		juejin: wechatsyncCommands('juejin', article.sourceRelPath, titles.juejin, cover),
		zhihu: wechatsyncCommands('zhihu', article.sourceRelPath, titles.zhihu, cover),
	};
}

function findFencedCodeBlocks(source) {
	const blocks = [];
	const lines = source.split(/\r?\n/);
	let current = null;

	for (const line of lines) {
		const fence = line.match(/^\s*(```|~~~)\s*([A-Za-z0-9_-]*)\s*$/);
		if (fence) {
			if (current) {
				const content = current.lines.join('\n');
				blocks.push({
					index: blocks.length + 1,
					language: current.language,
					kind: codeBlockKind(current.language, content),
					lineCount: current.lines.length,
					longestLineLength: Math.max(0, ...current.lines.map((item) => item.length)),
				});
				current = null;
			} else {
				current = { language: fence[2] || '', lines: [] };
			}
			continue;
		}
		if (current) current.lines.push(line);
	}

	return blocks;
}

function codeBlockKind(language, content) {
	const normalized = language.toLowerCase();
	if (normalized === 'text' || normalized === 'txt') {
		return /->|=>|：|:|\n/.test(content) ? 'text-note' : 'plain-text';
	}
	return 'code';
}

function codeHandlingPlan(codeBlocks) {
	return {
		summary: {
			total: codeBlocks.length,
			code: codeBlocks.filter((block) => block.kind === 'code').length,
			textNote: codeBlocks.filter((block) => block.kind === 'text-note').length,
			longLine: codeBlocks.filter((block) => block.longestLineLength > 88).length,
		},
		templates: {
			textNote: 'wechat-note-block',
			codeShell: 'mdnice-hljs-code-shell',
			linePreservedFallback: 'mdnice-hljs-nbsp-code',
		},
		rules: [
			'text fences that describe flows, ledgers, or key points become note blocks with preserved line breaks.',
			'real code blocks keep language labels, indentation, and readable long-line behavior.',
			'if WeChat compresses pre/code whitespace, use line-preserved HTML with nbsp indentation.',
		],
	};
}

function wechatsyncCommands(platform, articlePath, title, cover) {
	const command = `WECHATSYNC_TOKEN=<from-env> wechatsync sync ${quote(articlePath)} -p ${platform} --title ${quote(title)} --cover ${cover.absolute ? quote(relativeForCommand(cover.absolute)) : '<missing-cover>'}`;
	return {
		dryRun: [`${command} --dry-run`],
		draft: [command],
		note: 'Run Juejin and Zhihu as separate single-platform syncs when local images are present.',
	};
}

function acceptanceChecklist({ imageCount, cover, titles }) {
	return [
		{ platform: 'weixin', draftSuccess: false, draftLink: '', title: titles.wechat, cover: cover.absolute, imageUploadCount: imageCount, imageUploadFailures: [], confirmedNoOfficialPublish: true },
		{ platform: 'juejin', draftSuccess: false, draftLink: '', title: titles.juejin, cover: cover.absolute, imageUploadCount: imageCount, imageUploadFailures: [], confirmedNoOfficialPublish: true },
		{ platform: 'zhihu', draftSuccess: false, draftLink: '', title: titles.zhihu, cover: cover.absolute, imageUploadCount: imageCount, imageUploadFailures: [], confirmedNoOfficialPublish: true },
	];
}

function wechatStatus({ imageCount }) {
	const hasMd2Wechat = Boolean(process.env.MD2WECHAT_BIN || process.env.MD2WECHAT_CONFIG);
	return {
		platform: 'wechat',
		mode: 'draft',
		automation: hasMd2Wechat ? 'md2wechat autumn-warm HTML draft chain' : 'requires md2wechat discovery/inspect before draft creation',
		imageUploadCount: imageCount,
		noOfficialPublish: true,
	};
}

function wechatsyncStatus(platform, { imageCount }) {
	const hasToken = Boolean(process.env.WECHATSYNC_TOKEN);
	return {
		platform,
		mode: 'draft',
		automation: hasToken ? 'single-platform Wechatsync draft command' : 'requires WECHATSYNC_TOKEN and Chrome extension login state',
		imageUploadCount: imageCount,
		noOfficialPublish: true,
	};
}

function articleSlug(article) {
	return article.sourceRelPath.replace(/\.mdx?$/i, '').replace(/[^0-9A-Za-z_-]+/g, '-').replace(/^-+|-+$/g, '') || 'article';
}

function relativeForCommand(filePath) {
	if (!filePath || !filePath.startsWith(repoRoot)) return filePath;
	return filePath.slice(repoRoot.length + 1);
}

function quote(value) {
	return JSON.stringify(String(value));
}
