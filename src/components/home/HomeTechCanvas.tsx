'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function HomeTechCanvas() {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		const parent = canvas?.parentElement;

		if (!canvas || !parent) {
			return;
		}

		const container = parent;
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
		camera.position.set(0, 0.4, 7.2);

		const renderer = new THREE.WebGLRenderer({
			canvas,
			alpha: true,
			antialias: true,
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.outputColorSpace = THREE.SRGBColorSpace;

		const accentMaterial = new THREE.MeshStandardMaterial({
			color: 0x1b365d,
			metalness: 0.42,
			roughness: 0.28,
			transparent: true,
			opacity: 0.82,
		});
		const lineMaterial = new THREE.LineBasicMaterial({
			color: 0xb8794f,
			transparent: true,
			opacity: 0.42,
		});
		const nodeMaterial = new THREE.MeshStandardMaterial({
			color: 0xf7f5ef,
			metalness: 0.18,
			roughness: 0.38,
		});
		const particleMaterial = new THREE.PointsMaterial({
			color: 0x1b365d,
			size: 0.025,
			transparent: true,
			opacity: 0.38,
		});

		const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 1), accentMaterial);
		const wire = new THREE.LineSegments(
			new THREE.WireframeGeometry(core.geometry),
			new THREE.LineBasicMaterial({
				color: 0xf7f5ef,
				transparent: true,
				opacity: 0.52,
			}),
		);
		core.add(wire);
		scene.add(core);

		const rings: THREE.Line[] = [];
		for (let index = 0; index < 3; index += 1) {
			const curve = new THREE.EllipseCurve(0, 0, 2.2 + index * 0.46, 0.9 + index * 0.22);
			const points = curve.getPoints(120).map((point) => new THREE.Vector3(point.x, point.y, 0));
			const geometry = new THREE.BufferGeometry().setFromPoints(points);
			const ring = new THREE.Line(geometry, lineMaterial.clone());
			ring.rotation.x = 0.7 + index * 0.28;
			ring.rotation.y = index * 0.62;
			rings.push(ring);
			scene.add(ring);
		}

		const nodes: THREE.Mesh[] = [];
		for (let index = 0; index < 7; index += 1) {
			const node = new THREE.Mesh(new THREE.SphereGeometry(0.095, 18, 18), nodeMaterial);
			nodes.push(node);
			scene.add(node);
		}

		const particlePositions = new Float32Array(180 * 3);
		for (let index = 0; index < particlePositions.length; index += 3) {
			const radius = 2.8 + Math.random() * 2.3;
			const angle = Math.random() * Math.PI * 2;
			particlePositions[index] = Math.cos(angle) * radius;
			particlePositions[index + 1] = (Math.random() - 0.5) * 3.2;
			particlePositions[index + 2] = Math.sin(angle) * radius * 0.32;
		}
		const particleGeometry = new THREE.BufferGeometry();
		particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
		const particles = new THREE.Points(particleGeometry, particleMaterial);
		scene.add(particles);

		scene.add(new THREE.AmbientLight(0xffffff, 1.2));
		const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
		keyLight.position.set(2.4, 3.2, 4);
		scene.add(keyLight);
		const accentLight = new THREE.PointLight(0xb8794f, 7, 8);
		accentLight.position.set(-2.2, -1.3, 2.4);
		scene.add(accentLight);

		let frameId = 0;

		function resize() {
			const bounds = container.getBoundingClientRect();
			const width = Math.max(1, Math.floor(bounds.width));
			const height = Math.max(1, Math.floor(bounds.height));
			renderer.setSize(width, height, false);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
		}

		function render(time = 0) {
			const seconds = time * 0.001;
			core.rotation.x = seconds * 0.18;
			core.rotation.y = seconds * 0.34;
			particles.rotation.y = seconds * 0.035;

			rings.forEach((ring, index) => {
				ring.rotation.z = seconds * (0.16 + index * 0.045);
			});

			nodes.forEach((node, index) => {
				const angle = seconds * (0.46 + index * 0.035) + index * 0.9;
				node.position.set(Math.cos(angle) * 2.45, Math.sin(angle * 1.18) * 1.08, Math.sin(angle) * 0.72);
			});

			renderer.render(scene, camera);

			if (!prefersReducedMotion) {
				frameId = requestAnimationFrame(render);
			}
		}

		const resizeObserver = new ResizeObserver(() => {
			resize();
			render();
		});
		resizeObserver.observe(container);
		resize();
		render();

		return () => {
			cancelAnimationFrame(frameId);
			resizeObserver.disconnect();
			core.geometry.dispose();
			wire.geometry.dispose();
			(wire.material as THREE.Material).dispose();
			rings.forEach((ring) => {
				ring.geometry.dispose();
				(ring.material as THREE.Material).dispose();
			});
			nodes.forEach((node) => node.geometry.dispose());
			particleGeometry.dispose();
			accentMaterial.dispose();
			lineMaterial.dispose();
			nodeMaterial.dispose();
			particleMaterial.dispose();
			renderer.dispose();
		};
	}, []);

	return <canvas className="home-tech-canvas" ref={canvasRef} aria-hidden="true" />;
}
