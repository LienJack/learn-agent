'use client';

import { useEffect, useRef } from 'react';
import type { Material } from 'three';

type ThreeModule = typeof import('three');

const THREE_CDN_URL = 'https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js';

export default function AboutTechCanvas() {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}
		const canvasElement = canvas;
		if (window.matchMedia('(max-width: 900px)').matches) {
			return;
		}

		let disposed = false;
		let teardown = () => {};

		async function setup() {
			const {
				AmbientLight,
				BufferAttribute,
				BufferGeometry,
				Color,
				DirectionalLight,
				EllipseCurve,
				Group,
				IcosahedronGeometry,
				LineBasicMaterial,
				LineLoop,
				LineSegments,
				Mesh,
				MeshPhysicalMaterial,
				MeshStandardMaterial,
				PerspectiveCamera,
				PointLight,
				Points,
				PointsMaterial,
				Scene,
				SphereGeometry,
				Vector3,
				WebGLRenderer,
				WireframeGeometry,
			} = (await import(/* @vite-ignore */ THREE_CDN_URL)) as ThreeModule;

			if (disposed) {
				return;
			}

			const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			const scene = new Scene();
			const camera = new PerspectiveCamera(38, 1, 0.1, 100);
			camera.position.set(0, 0.62, 8.8);

			const renderer = new WebGLRenderer({
				canvas: canvasElement,
				alpha: true,
				antialias: true,
				preserveDrawingBuffer: true,
				powerPreference: 'high-performance',
			});
			renderer.setClearColor(0x000000, 0);
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));

			const root = new Group();
			root.scale.setScalar(0.76);
			scene.add(root);

			const ink = new Color('#1b365d');
			const paper = new Color('#f5f4ed');
			const lineMaterial = new LineBasicMaterial({
				color: ink,
				transparent: true,
				opacity: 0.28,
			});

			const coreGeometry = new IcosahedronGeometry(0.92, 2);
			const coreMaterial = new MeshPhysicalMaterial({
				color: 0xfaf9f5,
				roughness: 0.38,
				metalness: 0.06,
				transmission: 0.08,
				transparent: true,
				opacity: 0.74,
				clearcoat: 0.45,
				clearcoatRoughness: 0.48,
			});
			const core = new Mesh(coreGeometry, coreMaterial);
			root.add(core);

			const wire = new LineSegments(
				new WireframeGeometry(coreGeometry),
				new LineBasicMaterial({ color: 0x1b365d, transparent: true, opacity: 0.22 }),
			);
			root.add(wire);

			const ringGroup = new Group();
			root.add(ringGroup);

			const nodeGeometry = new SphereGeometry(0.095, 24, 16);
			const nodeMaterial = new MeshStandardMaterial({
				color: 0x1b365d,
				roughness: 0.42,
				metalness: 0.18,
			});

			for (let index = 0; index < 6; index += 1) {
				const angle = (index / 6) * Math.PI * 2;
				const node = new Mesh(nodeGeometry, nodeMaterial);
				node.position.set(Math.cos(angle) * 2.05, Math.sin(angle) * 0.68, Math.sin(angle) * 1.08);
				ringGroup.add(node);
			}

			const orbitGeometries: Array<InstanceType<typeof BufferGeometry>> = [];
			for (let index = 0; index < 3; index += 1) {
				const curve = new EllipseCurve(0, 0, 2.05 + index * 0.26, 0.78 + index * 0.1);
				const points = curve.getPoints(120).map((point) => new Vector3(point.x, point.y, 0));
				const geometry = new BufferGeometry().setFromPoints(points);
				const line = new LineLoop(geometry, lineMaterial);
				line.rotation.x = index * 0.48 + 0.42;
				line.rotation.y = index * 0.28;
				ringGroup.add(line);
				orbitGeometries.push(geometry);
			}

			const particleCount = 220;
			const particlePositions = new Float32Array(particleCount * 3);
			for (let index = 0; index < particleCount; index += 1) {
				const radius = 1.9 + Math.random() * 2.05;
				const angle = Math.random() * Math.PI * 2;
				particlePositions[index * 3] = Math.cos(angle) * radius;
				particlePositions[index * 3 + 1] = (Math.random() - 0.5) * 3.2;
				particlePositions[index * 3 + 2] = Math.sin(angle) * radius;
			}
			const particleGeometry = new BufferGeometry();
			particleGeometry.setAttribute('position', new BufferAttribute(particlePositions, 3));
			const particles = new Points(
				particleGeometry,
				new PointsMaterial({
					color: 0x1b365d,
					size: 0.026,
					transparent: true,
					opacity: 0.38,
				}),
			);
			root.add(particles);

			const ambient = new AmbientLight(paper, 1.2);
			const key = new DirectionalLight(0xffffff, 1.9);
			key.position.set(2.6, 3.2, 4.4);
			const rim = new PointLight(0x9db0c9, 2.2, 10);
			rim.position.set(-2.8, -1.6, 2.2);
			scene.add(ambient, key, rim);

			let frameId = 0;

			function resize() {
				if (!canvasElement.parentElement) {
					return;
				}
				const { width, height } = canvasElement.parentElement.getBoundingClientRect();
				const safeWidth = Math.max(1, width);
				const safeHeight = Math.max(1, height);
				renderer.setSize(safeWidth, safeHeight, false);
				camera.aspect = safeWidth / safeHeight;
				camera.updateProjectionMatrix();
			}

			const resizeObserver = new ResizeObserver(resize);
			if (canvasElement.parentElement) {
				resizeObserver.observe(canvasElement.parentElement);
			}
			resize();

			const startTime = performance.now();
			function animate() {
				if (disposed) {
					return;
				}

				const elapsed = (performance.now() - startTime) / 1000;
				core.rotation.x = elapsed * 0.22;
				core.rotation.y = elapsed * 0.34;
				wire.rotation.copy(core.rotation);
				ringGroup.rotation.y = elapsed * 0.18;
				ringGroup.rotation.z = Math.sin(elapsed * 0.52) * 0.08;
				particles.rotation.y = elapsed * 0.045;
				renderer.render(scene, camera);

				if (!prefersReducedMotion) {
					frameId = window.requestAnimationFrame(animate);
				}
			}
			animate();

			teardown = () => {
				window.cancelAnimationFrame(frameId);
				resizeObserver.disconnect();
				coreGeometry.dispose();
				coreMaterial.dispose();
				wire.geometry.dispose();
				(wire.material as Material).dispose();
				nodeGeometry.dispose();
				nodeMaterial.dispose();
				lineMaterial.dispose();
				for (const geometry of orbitGeometries) {
					geometry.dispose();
				}
				particleGeometry.dispose();
				(particles.material as Material).dispose();
				renderer.dispose();
			};
		}

		void setup();

		return () => {
			disposed = true;
			teardown();
		};
	}, []);

	return <canvas className="about-tech-canvas" ref={canvasRef} aria-hidden="true" />;
}
