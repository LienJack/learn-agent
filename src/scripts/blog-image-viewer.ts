type MediaMode = 'auto' | 'inline' | 'preview';

const PREVIEW_RATIO_THRESHOLD = 1.2;
const WIDE_RATIO_THRESHOLD = 2.4;
const LARGE_HEIGHT_THRESHOLD = 820;
const LARGE_WIDTH_THRESHOLD = 1400;

function isPreviewCandidate(width: number, height: number): boolean {
	const safeWidth = Math.max(width, 1);
	const safeHeight = Math.max(height, 1);

	if (safeHeight / safeWidth >= PREVIEW_RATIO_THRESHOLD) {
		return true;
	}

	if (safeWidth / safeHeight >= WIDE_RATIO_THRESHOLD && safeWidth >= 960) {
		return true;
	}

	return safeHeight >= LARGE_HEIGHT_THRESHOLD || safeWidth >= LARGE_WIDTH_THRESHOLD;
}

function getNaturalDimensions(media: Element): { width: number; height: number } | null {
	if (media instanceof HTMLImageElement) {
		if (media.naturalWidth > 0 && media.naturalHeight > 0) {
			return { width: media.naturalWidth, height: media.naturalHeight };
		}

		return null;
	}

	if (media instanceof SVGSVGElement) {
		const viewBox = media.viewBox.baseVal;
		if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
			return { width: viewBox.width, height: viewBox.height };
		}

		const width = Number.parseFloat(media.getAttribute('width') ?? '');
		const height = Number.parseFloat(media.getAttribute('height') ?? '');
		if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
			return { width, height };
		}
	}

	return null;
}

function syncPreviewMode(root: HTMLElement): void {
	const declaredMode = (root.dataset.mediaMode ?? 'auto') as MediaMode;
	if (declaredMode !== 'auto') {
		root.dataset.mediaResolvedMode = declaredMode;
		root.classList.toggle('is-preview', declaredMode === 'preview');
		return;
	}

	const media = root.querySelector('img, svg');
	if (!media) {
		root.dataset.mediaResolvedMode = 'inline';
		root.classList.remove('is-preview');
		return;
	}

	const dimensions = getNaturalDimensions(media);
	if (!dimensions) {
		root.dataset.mediaResolvedMode = 'inline';
		root.classList.remove('is-preview');
		return;
	}

	const preview = isPreviewCandidate(dimensions.width, dimensions.height);
	root.dataset.mediaResolvedMode = preview ? 'preview' : 'inline';
	root.classList.toggle('is-preview', preview);
}

function cloneMediaContent(root: HTMLElement): HTMLElement | null {
	const frame = root.querySelector<HTMLElement>('.article-media-frame');
	if (!frame) {
		return null;
	}

	const clone = frame.cloneNode(true);
	if (!(clone instanceof HTMLElement)) {
		return null;
	}

	clone.classList.add('article-media-viewer-content');
	clone.querySelectorAll('.article-media-toggle').forEach((button) => button.remove());

	const sourceMedia = root.querySelector('img, svg');
	const dimensions = sourceMedia ? getNaturalDimensions(sourceMedia) : null;
	if (dimensions) {
		clone.style.width = `${dimensions.width}px`;
		clone.style.maxWidth = '100%';
	}

	return clone;
}

function ensureToggleButton(root: HTMLElement, label: string): HTMLButtonElement | null {
	if (root.dataset.mediaExpandable !== 'true') {
		return null;
	}

	const frame = root.querySelector<HTMLElement>('.article-media-frame');
	if (!frame) {
		return null;
	}

	const existing = root.querySelector<HTMLButtonElement>('.article-media-toggle');
	if (existing) {
		return existing;
	}

	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'article-media-toggle';
	button.setAttribute('aria-haspopup', 'dialog');
	button.textContent = label;
	frame.append(button);
	return button;
}

function setBodyScrollLock(locked: boolean): void {
	document.body.classList.toggle('article-media-viewer-open', locked);
}

function setupArticleMediaViewer() {
	const viewer = document.querySelector<HTMLElement>('[data-article-media-viewer]');
	if (!viewer) {
		return;
	}

	const panel = viewer.querySelector<HTMLElement>('[data-article-media-panel]');
	const closeButton = viewer.querySelector<HTMLButtonElement>('[data-article-media-close]');
	const viewport = viewer.querySelector<HTMLElement>('[data-article-media-viewport]');
	if (!panel || !closeButton || !viewport) {
		return;
	}

	const openLabel = viewer.dataset.openLabel ?? 'View image';
	let activeRoot: HTMLElement | null = null;
	let lastScrollY = 0;

	const closeViewer = () => {
		if (!viewer.classList.contains('is-open')) {
			return;
		}

		viewer.classList.remove('is-open');
		viewer.setAttribute('aria-hidden', 'true');
		setBodyScrollLock(false);
		viewport.replaceChildren();

		if (activeRoot) {
			activeRoot.classList.remove('is-viewing');
			activeRoot.querySelector<HTMLButtonElement>('.article-media-toggle')?.focus({
				preventScroll: true,
			});
		}

		window.scrollTo(0, lastScrollY);
		activeRoot = null;
	};

	const openViewer = (root: HTMLElement) => {
		const clone = cloneMediaContent(root);
		if (!clone) {
			return;
		}

		activeRoot = root;
		lastScrollY = window.scrollY;
		root.classList.add('is-viewing');
		viewport.replaceChildren(clone);
		viewer.classList.add('is-open');
		viewer.setAttribute('aria-hidden', 'false');
		setBodyScrollLock(true);
		closeButton.focus({ preventScroll: true });
	};

	const mediaRoots = Array.from(document.querySelectorAll<HTMLElement>('.article-media'));
	for (const root of mediaRoots) {
		syncPreviewMode(root);
		const button = ensureToggleButton(root, openLabel);
		if (!button) {
			continue;
		}

		button.addEventListener('click', () => openViewer(root));
	}

	const pendingImages = mediaRoots
		.filter((root) => (root.dataset.mediaMode ?? 'auto') === 'auto')
		.flatMap((root) => Array.from(root.querySelectorAll<HTMLImageElement>('img')))
		.filter((image) => !image.complete);

	for (const image of pendingImages) {
		image.addEventListener(
			'load',
			() => {
				const root = image.closest<HTMLElement>('.article-media');
				if (root) {
					syncPreviewMode(root);
				}
			},
			{ once: true },
		);
	}

	closeButton.addEventListener('click', closeViewer);
	viewer.addEventListener('click', (event) => {
		if (event.target === viewer || event.target === panel) {
			closeViewer();
		}
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') {
			closeViewer();
		}
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', setupArticleMediaViewer, { once: true });
} else {
	setupArticleMediaViewer();
}
