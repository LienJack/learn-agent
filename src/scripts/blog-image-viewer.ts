import Panzoom from '@panzoom/panzoom';
import type { PanzoomObject, PanzoomOptions } from '@panzoom/panzoom';

type MediaMode = 'auto' | 'inline' | 'preview';

const PANZOOM_EXCLUDE_CLASS = 'article-media-viewer-control';
const PANZOOM_MAX_SCALE = 5;
const PANZOOM_STEP = 0.4;
const PANZOOM_MIN_SCALE_EPSILON = 0.01;

type ViewerState = {
	cleanupHandlers: Array<() => void>;
	panzoom: PanzoomObject | null;
	panzoomHost: HTMLElement | null;
	wheelHandler: ((event: WheelEvent) => void) | null;
};

function parsePositiveNumber(value: string | null): number | null {
	const parsed = Number.parseFloat(value ?? '');
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getNaturalDimensions(media: Element): { width: number; height: number } | null {
	if (media instanceof HTMLImageElement) {
		const declaredWidth = parsePositiveNumber(media.getAttribute('width'));
		const declaredHeight = parsePositiveNumber(media.getAttribute('height'));
		if (declaredWidth && declaredHeight) {
			return { width: declaredWidth, height: declaredHeight };
		}

		if (media.naturalWidth > 0 && media.naturalHeight > 0) {
			return { width: media.naturalWidth, height: media.naturalHeight };
		}

		const renderedWidth = media.getBoundingClientRect().width;
		const renderedHeight = media.getBoundingClientRect().height;
		if (renderedWidth > 0 && renderedHeight > 0) {
			return { width: renderedWidth, height: renderedHeight };
		}

		return null;
	}

	if (media instanceof SVGSVGElement) {
		const viewBox = media.viewBox.baseVal;
		if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
			return { width: viewBox.width, height: viewBox.height };
		}

		const width = parsePositiveNumber(media.getAttribute('width'));
		const height = parsePositiveNumber(media.getAttribute('height'));
		if (width !== null && height !== null) {
			return { width, height };
		}
	}

	return null;
}

function getViewerFitScale(viewport: HTMLElement, content: HTMLElement): number {
	const viewportRect = viewport.getBoundingClientRect();
	const contentRect = content.getBoundingClientRect();

	const viewportWidth = Math.max(viewportRect.width, 1);
	const viewportHeight = Math.max(viewportRect.height, 1);
	const contentWidth = Math.max(contentRect.width, 1);
	const contentHeight = Math.max(contentRect.height, 1);

	return Math.min(viewportWidth / contentWidth, viewportHeight / contentHeight, 1);
}

function syncPreviewMode(root: HTMLElement): void {
	const declaredMode = (root.dataset.mediaMode ?? 'auto') as MediaMode;
	if (declaredMode !== 'auto') {
		root.dataset.mediaResolvedMode = declaredMode;
		root.classList.toggle('is-preview', declaredMode === 'preview');
		return;
	}

	root.dataset.mediaResolvedMode = 'inline';
	root.classList.remove('is-preview');
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

function resetViewerState(viewerState: ViewerState): void {
	for (const cleanupHandler of viewerState.cleanupHandlers) {
		cleanupHandler();
	}

	if (viewerState.wheelHandler && viewerState.panzoomHost) {
		viewerState.panzoomHost.removeEventListener('wheel', viewerState.wheelHandler);
	}

	if (viewerState.panzoom) {
		viewerState.panzoom.destroy();
		viewerState.panzoom.resetStyle();
	}

	viewerState.panzoom = null;
	viewerState.panzoomHost = null;
	viewerState.wheelHandler = null;
	viewerState.cleanupHandlers = [];
}

function createPanzoom(viewer: HTMLElement, viewport: HTMLElement, content: HTMLElement): ViewerState {
	const mediaElement = content.querySelector<HTMLElement>('img, svg');
	if (!mediaElement) {
		return { cleanupHandlers: [], panzoom: null, panzoomHost: null, wheelHandler: null };
	}

	const fitScale = getViewerFitScale(viewport, content);
	const options: PanzoomOptions = {
		animate: true,
		canvas: true,
		cursor: 'grab',
		excludeClass: PANZOOM_EXCLUDE_CLASS,
		maxScale: PANZOOM_MAX_SCALE,
		minScale: fitScale,
		panOnlyWhenZoomed: true,
		startScale: fitScale,
		step: PANZOOM_STEP,
		touchAction: 'none',
	};

	const panzoom = Panzoom(content, options);
	const wheelHandler = (event: WheelEvent) => {
		if (!viewer.contains(event.target as Node)) {
			return;
		}

		event.preventDefault();
		panzoom.zoomWithWheel(event);
	};

	const host = viewport;
	host.addEventListener('wheel', wheelHandler, { passive: false });

	const setDragging = (active: boolean) => {
		content.classList.toggle('is-dragging', active);
	};

	const handlePanzoomStart = () => setDragging(true);
	const handlePanzoomEnd = () => setDragging(false);
	const handlePanzoomChange = () => {
		const scale = panzoom.getScale();
		content.dataset.panzoomScale = scale.toFixed(3);
	};

	content.addEventListener('panzoomstart', handlePanzoomStart);
	content.addEventListener('panzoomend', handlePanzoomEnd);
	content.addEventListener('panzoomchange', handlePanzoomChange);

	requestAnimationFrame(() => {
		panzoom.reset({ animate: false });
		content.dataset.panzoomScale = fitScale.toFixed(3);
	});

	return {
		cleanupHandlers: [
			() => content.removeEventListener('panzoomstart', handlePanzoomStart),
			() => content.removeEventListener('panzoomend', handlePanzoomEnd),
			() => content.removeEventListener('panzoomchange', handlePanzoomChange),
		],
		panzoom,
		panzoomHost: host,
		wheelHandler,
	};
}

function nudgePanzoomToFit(panzoom: PanzoomObject, fitScale: number): void {
	panzoom.reset({ animate: true, force: true, startScale: fitScale, startX: 0, startY: 0 });
}

function setupArticleMediaViewer() {
	const viewer = document.querySelector<HTMLElement>('[data-article-media-viewer]');
	if (!viewer) {
		return;
	}

	const panel = viewer.querySelector<HTMLElement>('[data-article-media-panel]');
	const closeButton = viewer.querySelector<HTMLButtonElement>('[data-article-media-close]');
	const zoomInButton = viewer.querySelector<HTMLButtonElement>('[data-article-media-zoom-in]');
	const zoomOutButton = viewer.querySelector<HTMLButtonElement>('[data-article-media-zoom-out]');
	const viewport = viewer.querySelector<HTMLElement>('[data-article-media-viewport]');
	if (!panel || !closeButton || !zoomInButton || !zoomOutButton || !viewport) {
		return;
	}

	const openLabel = viewer.dataset.openLabel ?? 'View image';
	let activeRoot: HTMLElement | null = null;
	let lastScrollY = 0;
	const viewerState: ViewerState = {
		cleanupHandlers: [],
		panzoom: null,
		panzoomHost: null,
		wheelHandler: null,
	};

	const closeViewer = () => {
		if (!viewer.classList.contains('is-open')) {
			return;
		}

		resetViewerState(viewerState);
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
		resetViewerState(viewerState);

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

		try {
			const nextState = createPanzoom(viewer, viewport, clone);
			viewerState.cleanupHandlers = nextState.cleanupHandlers;
			viewerState.panzoom = nextState.panzoom;
			viewerState.panzoomHost = nextState.panzoomHost;
			viewerState.wheelHandler = nextState.wheelHandler;
			clone.classList.toggle('is-panzoom-active', Boolean(viewerState.panzoom));
		} catch (error) {
			console.warn('Panzoom failed to initialize for article media viewer.', error);
		}

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

	zoomInButton.addEventListener('click', () => viewerState.panzoom?.zoomIn());
	zoomOutButton.addEventListener('click', () => {
		const panzoom = viewerState.panzoom;
		const content = viewport.querySelector<HTMLElement>('.article-media-viewer-content');
		if (!panzoom || !content) {
			return;
		}

		panzoom.zoomOut();

		requestAnimationFrame(() => {
			const fitScale = getViewerFitScale(viewport, content);
			if (panzoom.getScale() <= fitScale + PANZOOM_MIN_SCALE_EPSILON) {
				nudgePanzoomToFit(panzoom, fitScale);
			}
		});
	});

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
