import type { Element, ElementContent, Parent, Root, RootContent } from 'hast';
import { visitParents } from 'unist-util-visit-parents';
import type { Plugin } from 'unified';

const ZH_BLOG_SEGMENT = '/src/content/blog/zh/';
const IMAGE_OVERRIDE_PATTERN = /^media:(preview|inline)$/i;

type MediaMode = 'preview' | 'inline' | 'auto';

type MediaKind = 'image' | 'mermaid';

type MediaCandidate = {
	parent: Parent;
	node: Element;
	replacement: Element;
};

type MermaidMetrics = {
	width: number;
	height: number;
};

function normalizePath(path: string | undefined): string {
	return (path ?? '').replaceAll('\\', '/');
}

function hasClassName(node: Element, className: string): boolean {
	const current = node.properties.className;
	if (typeof current === 'string') {
		return current.split(/\s+/).includes(className);
	}

	if (Array.isArray(current)) {
		return current.includes(className);
	}

	return false;
}

function isZhBlogFile(filePath: string | undefined): boolean {
	return normalizePath(filePath).includes(ZH_BLOG_SEGMENT);
}

function isWhitespaceText(node: RootContent | ElementContent): boolean {
	return node.type === 'text' && node.value.trim().length === 0;
}

function getSingleImageChild(node: Element): Element | null {
	if (node.tagName !== 'p') {
		return null;
	}

	const meaningfulChildren = node.children.filter((child) => !isWhitespaceText(child));
	if (meaningfulChildren.length !== 1) {
		return null;
	}

	const [child] = meaningfulChildren;
	if (child.type !== 'element' || child.tagName !== 'img') {
		return null;
	}

	return child;
}

function isMermaidSvg(node: Element): boolean {
	return node.tagName === 'svg' && typeof node.properties.id === 'string' && node.properties.id.startsWith('mermaid-');
}

function isMermaidFallback(node: Element): boolean {
	return node.tagName === 'pre' && hasClassName(node, 'mermaid');
}

function isWrappedByArticleMedia(ancestors: Element[]): boolean {
	return ancestors.some(
		(ancestor) => ancestor.tagName === 'figure' && hasClassName(ancestor, 'article-media'),
	);
}

function readNumericProperty(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === 'string') {
		const numeric = Number.parseFloat(value);
		if (Number.isFinite(numeric)) {
			return numeric;
		}
	}

	return null;
}

function getMermaidMetrics(node: Element): MermaidMetrics | null {
	const width = readNumericProperty(node.properties.width);
	const height = readNumericProperty(node.properties.height);
	if (width && height) {
		return { width, height };
	}

	if (typeof node.properties.viewBox === 'string') {
		const parts = node.properties.viewBox
			.trim()
			.split(/\s+/)
			.map((part) => Number.parseFloat(part));
		if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
			return {
				width: parts[2],
				height: parts[3],
			};
		}
	}

	return null;
}

function classifyMermaidMode(metrics: MermaidMetrics | null): MediaMode {
	if (!metrics) {
		return 'auto';
	}

	const width = Math.max(metrics.width, 1);
	const height = Math.max(metrics.height, 1);
	if (height / width >= 1.2) {
		return 'preview';
	}

	if (width / height >= 2.4 && width >= 960) {
		return 'preview';
	}

	if (height >= 820 || width >= 1400) {
		return 'preview';
	}

	return 'inline';
}

function consumeImageOverride(node: Element): MediaMode {
	if (typeof node.properties['data-media-mode'] === 'string') {
		const value = node.properties['data-media-mode'].toLowerCase();
		if (value === 'preview' || value === 'inline' || value === 'auto') {
			return value;
		}
	}

	if (typeof node.properties.title === 'string') {
		const match = node.properties.title.trim().match(IMAGE_OVERRIDE_PATTERN);
		if (match) {
			delete node.properties.title;
			return match[1].toLowerCase() as MediaMode;
		}
	}

	return 'auto';
}

function createFigureReplacement({
	node,
	mode,
	kind,
	expandable,
	errorState = false,
}: {
	node: Element;
	mode: MediaMode;
	kind: MediaKind;
	expandable: boolean;
	errorState?: boolean;
}): Element {
	const frame: Element = {
		type: 'element',
		tagName: 'div',
		properties: {
			className: ['article-media-frame'],
		},
		children: [node],
	};

	return {
		type: 'element',
		tagName: 'figure',
		properties: {
			className: ['article-media'],
			'data-media-kind': kind,
			'data-media-mode': mode,
			'data-media-expandable': expandable ? 'true' : 'false',
			...(errorState ? { 'data-media-state': 'error' } : {}),
		},
		children: [frame],
	};
}

function replaceNode(parent: Parent, previousNode: Element, nextNode: Element): void {
	const index = parent.children.indexOf(previousNode);
	if (index >= 0) {
		parent.children[index] = nextNode;
	}
}

export function createMermaidErrorFallback(element: Element, diagram: string): Element {
	void element;

	return {
		type: 'element',
		tagName: 'pre',
		properties: {
			className: ['mermaid'],
			'data-mermaid-error': 'true',
		},
		children: [
			{
				type: 'element',
				tagName: 'code',
				properties: {
					className: ['language-mermaid'],
				},
				children: [{ type: 'text', value: diagram }],
			},
		],
	};
}

const rehypeArticleMedia: Plugin<[], Root> = () => {
	return (tree, file) => {
		const sourcePath = file.path ?? file.history.at(0);
		if (!isZhBlogFile(sourcePath)) {
			return;
		}

		const candidates: MediaCandidate[] = [];

		visitParents(tree, 'element', (node, parents) => {
			const ancestors = parents.filter((parent): parent is Element => parent.type === 'element');
			if (isWrappedByArticleMedia(ancestors)) {
				return;
			}

			if (node.tagName === 'p') {
				const image = getSingleImageChild(node);
				if (!image) {
					return;
				}

				const parent = parents.at(-1);
				if (!parent || !('children' in parent)) {
					return;
				}

				candidates.push({
					parent,
					node,
					replacement: createFigureReplacement({
						node: image,
						mode: consumeImageOverride(image),
						kind: 'image',
						expandable: true,
					}),
				});
				return;
			}

			if (isMermaidSvg(node)) {
				const parent = parents.at(-1);
				if (!parent || !('children' in parent)) {
					return;
				}

				candidates.push({
					parent,
					node,
					replacement: createFigureReplacement({
						node,
						mode: classifyMermaidMode(getMermaidMetrics(node)),
						kind: 'mermaid',
						expandable: true,
					}),
				});
				return;
			}

			if (isMermaidFallback(node)) {
				const parent = parents.at(-1);
				if (!parent || !('children' in parent)) {
					return;
				}

				candidates.push({
					parent,
					node,
					replacement: createFigureReplacement({
						node,
						mode: 'inline',
						kind: 'mermaid',
						expandable: false,
						errorState: node.properties['data-mermaid-error'] === 'true',
					}),
				});
			}
		});

		for (const candidate of candidates) {
			replaceNode(candidate.parent, candidate.node, candidate.replacement);
		}
	};
};

export default rehypeArticleMedia;
