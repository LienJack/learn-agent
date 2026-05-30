'use client';

import { useEffect, useRef, useState } from 'react';

const CUBISM_CORE_URL = 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js';
const PIXI_URL = 'https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js';
const PIXI_LIVE2D_URL = 'https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/cubism4.min.js';
const HIYORI_MODEL_URL =
	'https://cdn.jsdelivr.net/gh/Live2D/CubismWebSamples@develop/Samples/Resources/Hiyori/Hiyori.model3.json';

type Live2DStatus = 'idle' | 'loading' | 'ready' | 'error';

type PixiRuntime = {
	Application: new (options: Record<string, unknown>) => {
		stage: {
			addChild: (child: unknown) => void;
		};
		destroy: (removeView?: boolean, stageOptions?: Record<string, unknown>) => void;
	};
	live2d?: {
		Live2DModel?: {
			from: (source: string, options?: Record<string, unknown>) => Promise<Live2DModel>;
		};
	};
};

type Live2DModel = {
	anchor?: {
		set: (x: number, y?: number) => void;
	};
	scale: {
		set: (x: number, y?: number) => void;
	};
	position: {
		set: (x: number, y?: number) => void;
	};
	width: number;
	height: number;
	interactive?: boolean;
	destroy?: (options?: Record<string, unknown>) => void;
};

declare global {
	interface Window {
		PIXI?: PixiRuntime;
	}
}

let runtimePromise: Promise<void> | null = null;

function loadScript(src: string) {
	const existingScript = Array.from(document.scripts).find((script) => script.src === src);
	if (existingScript?.dataset.loaded === 'true') {
		return Promise.resolve();
	}

	if (existingScript?.dataset.loading === 'true') {
		return new Promise<void>((resolve, reject) => {
			existingScript.addEventListener('load', () => resolve(), { once: true });
			existingScript.addEventListener('error', () => reject(new Error(`Unable to load ${src}`)), { once: true });
		});
	}

	return new Promise<void>((resolve, reject) => {
		const script = document.createElement('script');
		script.src = src;
		script.async = true;
		script.crossOrigin = 'anonymous';
		script.dataset.loading = 'true';

		script.addEventListener(
			'load',
			() => {
				script.dataset.loading = 'false';
				script.dataset.loaded = 'true';
				resolve();
			},
			{ once: true },
		);
		script.addEventListener('error', () => reject(new Error(`Unable to load ${src}`)), { once: true });

		document.head.appendChild(script);
	});
}

function loadLive2DRuntime() {
	if (!runtimePromise) {
		runtimePromise = (async () => {
			await loadScript(CUBISM_CORE_URL);
			await loadScript(PIXI_URL);
			await loadScript(PIXI_LIVE2D_URL);

			if (!window.PIXI?.live2d?.Live2DModel) {
				throw new Error('Live2D runtime did not register on PIXI.');
			}
		})();
	}

	return runtimePromise;
}

function deferUntilIdle(callback: () => void) {
	if (typeof window.requestIdleCallback === 'function') {
		const id = window.requestIdleCallback(callback, { timeout: 1800 });
		return () => window.cancelIdleCallback(id);
	}

	const id = window.setTimeout(callback, 220);
	return () => window.clearTimeout(id);
}

export default function AboutLive2D({
	stageLabel,
	errorLabel,
}: {
	stageLabel: string;
	errorLabel: string;
}) {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [status, setStatus] = useState<Live2DStatus>('idle');

	useEffect(() => {
		const host = hostRef.current;
		const canvas = canvasRef.current;
		if (!host || !canvas) {
			return;
		}
		const live2dHost = host;
		const live2dCanvas = canvas;

		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduceMotion) {
			setStatus('ready');
			return;
		}

		let disposed = false;
		let cancelIdle: (() => void) | null = null;
		let resizeObserver: ResizeObserver | null = null;
		let app: InstanceType<PixiRuntime['Application']> | null = null;
		let model: Live2DModel | null = null;

		function fitModel() {
			if (!model) {
				return;
			}

			const width = Math.max(live2dHost.clientWidth, 1);
			const height = Math.max(live2dHost.clientHeight, 1);
			model.scale.set(1);
			const scale = Math.min((width * 0.76) / model.width, (height * 0.96) / model.height);
			model.scale.set(Math.max(scale * 1.85, 0.01));
			model.position.set(width * 0.52, height * 0.84);
		}

		async function start() {
			try {
				setStatus('loading');
				await loadLive2DRuntime();
				if (disposed || !window.PIXI?.live2d?.Live2DModel) {
					return;
				}

				app = new window.PIXI.Application({
					view: live2dCanvas,
					autoStart: true,
					backgroundAlpha: 0,
					antialias: true,
					resolution: Math.min(window.devicePixelRatio, 2),
					resizeTo: live2dHost,
				});

				model = await window.PIXI.live2d.Live2DModel.from(HIYORI_MODEL_URL, {
					autoInteract: true,
				});
				if (disposed || !app) {
					model.destroy?.({ children: true, texture: false, baseTexture: false });
					return;
				}

				model.anchor?.set(0.5, 0.5);
				model.interactive = true;
				app.stage.addChild(model);
				fitModel();

				resizeObserver = new ResizeObserver(fitModel);
				resizeObserver.observe(live2dHost);
				setStatus('ready');
			} catch (error) {
				console.warn('Live2D failed to load.', error);
				if (!disposed) {
					setStatus('error');
				}
			}
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					observer.disconnect();
					cancelIdle = deferUntilIdle(start);
				}
			},
			{ rootMargin: '280px' },
		);
		observer.observe(live2dHost);

		return () => {
			disposed = true;
			observer.disconnect();
			cancelIdle?.();
			resizeObserver?.disconnect();
			if (app) {
				app.destroy(true, { children: true, texture: false, baseTexture: false });
			} else {
				model?.destroy?.({ children: true, texture: false, baseTexture: false });
			}
		};
	}, []);

	return (
		<div className={`about-live2d-stage about-live2d-stage-${status}`} ref={hostRef}>
			<canvas className="about-live2d-canvas" ref={canvasRef} aria-hidden="true" />
			<div className="about-live2d-loader" aria-hidden="true">
				<span />
			</div>
			<p className="sr-only" aria-live="polite">
				{status === 'error' ? errorLabel : stageLabel}
			</p>
		</div>
	);
}
