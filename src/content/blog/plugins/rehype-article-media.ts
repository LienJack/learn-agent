import type { Element, ElementContent, Parent, Root, RootContent } from 'hast';
import { visitParents } from 'unist-util-visit-parents';
import type { Plugin } from 'unified';

const ZH_BLOG_SEGMENT = '/src/content/blog/zh/';
const IMAGE_OVERRIDE_PATTERN = /^media:(preview|inline)$/i;

type MediaMode = 'preview' | 'inline' | 'auto';

type MediaKind = 'image';

type MediaCandidate = {
	parent: Parent;
	node: Element;
	replacement: Element;
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

function isWrappedByArticleMedia(ancestors: Element[]): boolean {
	return ancestors.some(
		(ancestor) => ancestor.tagName === 'figure' && hasClassName(ancestor, 'article-media'),
	);
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
		});

		for (const candidate of candidates) {
			replaceNode(candidate.parent, candidate.node, candidate.replacement);
		}
	};
};

export default rehypeArticleMedia;
