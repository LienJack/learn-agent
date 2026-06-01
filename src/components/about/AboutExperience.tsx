'use client';

import {
	motion,
	useReducedMotion,
	type Variants,
} from 'framer-motion';
import { memo, useEffect, useState, type CSSProperties, type PointerEvent } from 'react';
import type { AboutBrandCopy, AboutCopy, AboutProjectCopy } from '../../i18n/messages';
import AboutLive2D from './AboutLive2D';
import AboutTechCanvas from './AboutTechCanvas';

type Props = {
	copy: AboutCopy;
};

const entryContainer: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.06,
			delayChildren: 0.08,
		},
	},
};

const entryItem: Variants = {
	hidden: { opacity: 0, y: 16 },
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			type: 'spring',
			stiffness: 110,
			damping: 22,
		},
	},
};

const SCRAMBLE_CHARACTERS = 'AGENTFLOWUX0123456789';

function handleSpotlightPointerMove(event: PointerEvent<HTMLElement>) {
	const bounds = event.currentTarget.getBoundingClientRect();
	event.currentTarget.style.setProperty('--spotlight-x', `${event.clientX - bounds.left}px`);
	event.currentTarget.style.setProperty('--spotlight-y', `${event.clientY - bounds.top}px`);
}

function ScrambleText({ text }: { text: string }) {
	const [display, setDisplay] = useState(text);
	const prefersReducedMotion = useReducedMotion();

	useEffect(() => {
		if (prefersReducedMotion) {
			setDisplay(text);
			return;
		}

		let frame = 0;
		const totalFrames = 18;
		const interval = window.setInterval(() => {
			frame += 1;
			setDisplay(
				text
					.split('')
					.map((character, index) => {
						if (character === ' ' || frame > index * 2 + 7) {
							return character;
						}

						return SCRAMBLE_CHARACTERS[(frame + index * 5) % SCRAMBLE_CHARACTERS.length] ?? character;
					})
					.join(''),
			);

			if (frame >= totalFrames) {
				window.clearInterval(interval);
				setDisplay(text);
			}
		}, 42);

		return () => window.clearInterval(interval);
	}, [prefersReducedMotion, text]);

	return (
		<span className="about-scramble-text" aria-label={text}>
			{display}
		</span>
	);
}

function BrandLogo({ item, compact = false }: { item: AboutBrandCopy; compact?: boolean }) {
	const [logoFailed, setLogoFailed] = useState(false);
	const showLogo = Boolean(item.logo && !logoFailed);

	return (
		<span className={compact ? 'about-proof-logo about-proof-logo-compact' : 'about-proof-logo'}>
			<span className="about-proof-logo-mark" aria-hidden="true">
				{showLogo ? (
					<img
						src={item.logo}
						alt=""
						loading="lazy"
						onError={(event) => {
							event.currentTarget.style.display = 'none';
							setLogoFailed(true);
						}}
					/>
				) : null}
				{showLogo ? null : <span>{item.mark ?? item.name.slice(0, 2)}</span>}
			</span>
			<span className="about-proof-logo-copy">
				<strong>{item.name}</strong>
				<small>{item.detail}</small>
			</span>
		</span>
	);
}

const ProductTile = memo(function ProductTile({ item, index = 0 }: { item: AboutBrandCopy; index?: number }) {
	const prefersReducedMotion = useReducedMotion();

	return (
		<motion.span
			className="about-product-tile"
			aria-label={item.name}
			style={{ '--tile-index': index } as CSSProperties}
			animate={
				prefersReducedMotion
					? undefined
					: {
							y: [0, -6, 0],
							rotate: index % 2 === 0 ? [-7, -3, -7] : [7, 3, 7],
						}
			}
			transition={{
				duration: 5.8,
				repeat: Infinity,
				delay: index * 0.35,
				type: 'spring',
				stiffness: 95,
				damping: 20,
			}}
		>
			{item.logo ? (
				<img
					src={item.logo}
					alt=""
					loading="lazy"
					onError={(event) => {
						event.currentTarget.style.display = 'none';
					}}
				/>
			) : null}
			<span>{item.mark ?? item.name.slice(0, 2)}</span>
		</motion.span>
	);
});

function ProjectIcon({ mark }: { mark: string }) {
	const normalizedMark = mark.toLowerCase();

	if (normalizedMark === 'mf') {
		return (
			<svg viewBox="0 0 48 48" role="img" aria-label="Micro frontend">
				<path d="M24 5 39 13.5V30.5L24 39 9 30.5V13.5L24 5Z" fill="#46aaf7" />
				<path d="M24 5 39 13.5 24 22 9 13.5 24 5Z" fill="#79c7ff" />
				<path d="M24 22 39 13.5V30.5L24 39V22Z" fill="#2078d4" />
				<path d="M9 13.5 24 22V39L9 30.5V13.5Z" fill="#2d98ed" />
			</svg>
		);
	}

	if (normalizedMark === 'cl') {
		return (
			<svg viewBox="0 0 48 48" role="img" aria-label="Cloud app">
				<path
					d="M15.8 33.8h19.1c4.6 0 8.1-3.1 8.1-7.1 0-3.8-3.1-6.8-7.1-7.1C34.5 13.7 29.7 9.8 24 9.8c-5.2 0-9.7 3.5-11.2 8.5C8.4 19.1 5 22.4 5 26.4c0 4.2 3.6 7.4 10.8 7.4Z"
					fill="#7fa8cc"
				/>
				<path
					d="M15.8 33.8h19.1c4.6 0 8.1-3.1 8.1-7.1 0-3.8-3.1-6.8-7.1-7.1C34.5 13.7 29.7 9.8 24 9.8c-5.2 0-9.7 3.5-11.2 8.5C8.4 19.1 5 22.4 5 26.4c0 4.2 3.6 7.4 10.8 7.4Z"
					fill="url(#about-cloud-icon-gradient)"
				/>
				<defs>
					<linearGradient id="about-cloud-icon-gradient" x1="9" x2="39" y1="12" y2="34">
						<stop stopColor="#d7ecfb" />
						<stop offset="1" stopColor="#5d84ad" />
					</linearGradient>
				</defs>
			</svg>
		);
	}

	if (normalizedMark === 'sql') {
		return (
			<svg viewBox="0 0 48 48" role="img" aria-label="Text2SQL">
				<ellipse cx="24" cy="11" rx="13.5" ry="6" fill="#6f90ad" />
				<path d="M10.5 11v23c0 3.3 6 6 13.5 6s13.5-2.7 13.5-6V11c0 3.3-6 6-13.5 6s-13.5-2.7-13.5-6Z" fill="#c7d7e5" />
				<path d="M10.5 19.2c0 3.3 6 6 13.5 6s13.5-2.7 13.5-6" fill="none" stroke="#6f90ad" strokeWidth="2.2" />
				<path d="M10.5 27.1c0 3.3 6 6 13.5 6s13.5-2.7 13.5-6" fill="none" stroke="#6f90ad" strokeWidth="2.2" />
				<ellipse cx="24" cy="11" rx="13.5" ry="6" fill="none" stroke="#365878" strokeWidth="2.2" />
			</svg>
		);
	}

	if (normalizedMark === 'hx') {
		return (
			<svg viewBox="0 0 48 48" role="img" aria-label="Harness">
				<path d="M24 6 38 14V30L24 38 10 30V14L24 6Z" fill="#72b8ff" />
				<path d="M24 6 38 14 24 22 10 14 24 6Z" fill="#a8d6ff" />
				<path d="M24 22 38 14V30L24 38V22Z" fill="#357ee9" />
				<path d="M24 22 10 14V30L24 38V22Z" fill="#66a8ff" />
				<path d="M18 18.6 24 22l6-3.4" fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
			</svg>
		);
	}

	if (normalizedMark === 'av') {
		return (
			<svg viewBox="0 0 48 48" role="img" aria-label="Media pipeline">
				<circle cx="24" cy="24" r="18" fill="#173757" />
				<circle cx="24" cy="24" r="16" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="2" />
				<path d="M20 15.8 33 24 20 32.2V15.8Z" fill="#ffffff" />
			</svg>
		);
	}

	if (normalizedMark === 'cnv') {
		return (
			<svg viewBox="0 0 48 48" role="img" aria-label="Infinite canvas">
				{[11, 24, 37].map((x) =>
					[11, 24, 37].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3.3" fill="#102947" />),
				)}
			</svg>
		);
	}

	return <span>{mark}</span>;
}

function ProjectCard({ item, index }: { item: AboutProjectCopy; index: number }) {
	return (
		<motion.article
			className="about-project-card about-spotlight-surface"
			variants={entryItem}
			style={{ '--project-index': index } as CSSProperties}
			onPointerMove={handleSpotlightPointerMove}
			whileHover={{ y: -3 }}
			transition={{ type: 'spring', stiffness: 130, damping: 22 }}
		>
			<span className="about-project-mark" aria-hidden="true">
				<ProjectIcon mark={item.mark} />
			</span>
			<div className="about-project-copy">
				<h4>{item.name}</h4>
				<p>{item.detail}</p>
				<div className="about-project-tags">
					{item.tags.map((tag) => (
						<span key={tag}>{tag}</span>
					))}
				</div>
			</div>
		</motion.article>
	);
}

function HeroInstrument({ copy }: Props) {
	const prefersReducedMotion = useReducedMotion();

	return (
		<motion.aside
			className="about-live2d-scene"
			aria-label={`${copy.title} Live2D`}
			variants={entryItem}
			animate={
				prefersReducedMotion
					? undefined
					: {
							y: [0, -8, 0],
						}
			}
			transition={{
				duration: 7,
				repeat: Infinity,
				ease: 'easeInOut',
			}}
			>
			<div className="about-live2d-status">
				<span aria-hidden="true" />
				{copy.liveStatus}
			</div>
			<div className="about-live2d-orbits" aria-hidden="true">
				<span />
				<span />
				<span />
				<i style={{ '--node-index': 0 } as CSSProperties} />
				<i style={{ '--node-index': 1 } as CSSProperties} />
				<i style={{ '--node-index': 2 } as CSSProperties} />
				<i style={{ '--node-index': 3 } as CSSProperties} />
			</div>
			<AboutLive2D stageLabel={copy.liveStageLabel} errorLabel={copy.liveErrorLabel} />
		</motion.aside>
	);
}

function ExperienceBoard({ copy }: Props) {
	const [companyGroup, productGroup] = copy.experienceGroups;
	const featuredProject = copy.projectGroup.items[0];
	const projectItems = copy.projectGroup.items.slice(1);
	const productItems = productGroup?.items ?? [];

	return (
		<motion.section
			className="about-proof-board"
			aria-label={copy.proofEyebrow}
			variants={entryContainer}
			initial="hidden"
			whileInView="visible"
			viewport={{ once: true, margin: '-120px' }}
			onPointerMove={handleSpotlightPointerMove}
		>
			<motion.aside className="about-proof-sidebar" variants={entryItem}>
				<p className="page-eyebrow">{copy.proofEyebrow}</p>
				<h2>{copy.proofHeading}</h2>
				<p>{copy.proofLead}</p>

				{companyGroup ? (
					<div className="about-proof-group">
						<p className="about-proof-label">{companyGroup.eyebrow}</p>
						<div className="about-proof-list">
							{companyGroup.items.map((item) => (
								<BrandLogo key={item.name} item={item} />
							))}
						</div>
					</div>
				) : null}

				{productGroup ? (
					<div className="about-proof-group">
						<p className="about-proof-label">{productGroup.eyebrow}</p>
						<div className="about-product-mini-row">
							{productGroup.items.map((item) => (
								<BrandLogo key={item.name} item={item} compact />
							))}
						</div>
					</div>
				) : null}

				<div className="about-proof-group">
					<p className="about-proof-label">{copy.techStack.eyebrow}</p>
					<div className="about-tech-stack-list">
						{copy.techStack.items.map((item) => (
							<BrandLogo key={item.name} item={item} compact />
						))}
					</div>
				</div>
			</motion.aside>

			<motion.div className="about-proof-main" variants={entryItem}>
				{featuredProject ? (
					<article className="about-feature-project about-spotlight-surface" onPointerMove={handleSpotlightPointerMove}>
						<div className="about-feature-art" aria-hidden="true">
							<div className="about-feature-orbit" />
							{productItems.slice(0, 2).map((item, index) => (
								<ProductTile key={item.name} item={item} index={index} />
							))}
						</div>
						<div className="about-feature-copy">
							<p className="about-feature-kicker">{copy.featuredLabel}</p>
							<h3>{featuredProject.name}</h3>
							<p>{featuredProject.detail}</p>
							<div className="about-project-tags">
								{featuredProject.tags.map((tag) => (
									<span key={tag}>{tag}</span>
								))}
							</div>
						</div>
					</article>
				) : null}

				<div className="about-project-list">
					{projectItems.map((item, index) => (
						<ProjectCard key={item.name} item={item} index={index} />
					))}
				</div>
			</motion.div>

			<motion.aside className="about-proof-impact" variants={entryItem}>
				{copy.impactItems.length > 0 ? (
					<div className="about-proof-group">
						<p className="about-proof-label">{copy.impactLabel}</p>
						<div className="about-proof-list">
							{copy.impactItems.map((item) => (
								<BrandLogo key={item.name} item={item} />
							))}
						</div>
					</div>
				) : null}

				<div className="about-impact-visual" aria-hidden="true">
					<AboutTechCanvas />
				</div>

				{productGroup ? (
					<div className="about-proof-group">
						<p className="about-proof-label">{copy.trustedLabel}</p>
						<div className="about-product-trust-row">
							{productGroup.items.map((item) => (
								<ProductTile key={item.name} item={item} />
							))}
						</div>
					</div>
				) : null}
			</motion.aside>
		</motion.section>
	);
}

function ContactSection({ copy }: Props) {
	return (
		<motion.section
			className="about-contact-section"
			aria-labelledby="about-contact-heading"
			variants={entryContainer}
			initial="hidden"
			whileInView="visible"
			viewport={{ once: true, margin: '-120px' }}
		>
			<motion.div className="about-contact-copy" variants={entryItem}>
				<p className="page-eyebrow">{copy.contact.eyebrow}</p>
				<h2 id="about-contact-heading">{copy.contact.heading}</h2>
				<p>
					{copy.contact.lead}
				</p>
			</motion.div>

			<motion.div className="about-contact-links" variants={entryItem}>
				{copy.contact.links.map((item) => (
					<a key={item.label} href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel={item.href.startsWith('http') ? 'noreferrer' : undefined}>
						<span>{item.label}</span>
						<strong>{item.value}</strong>
					</a>
				))}
			</motion.div>

			<motion.div className="about-social-grid" variants={entryContainer}>
				{copy.contact.socials.map((item, index) => (
					<motion.article
						key={item.name}
						className={`about-social-card about-spotlight-surface ${item.className}`}
						variants={entryItem}
						style={{ '--social-index': index } as CSSProperties}
						onPointerMove={handleSpotlightPointerMove}
						whileHover={{ y: -4, rotate: index === 0 ? -0.6 : 0.6 }}
						transition={{ type: 'spring', stiffness: 130, damping: 22 }}
					>
						<div className="about-social-card-copy">
							<span>{item.name}</span>
							<small>{item.detail}</small>
						</div>
						<img src={item.image} alt={item.alt} loading="lazy" />
					</motion.article>
				))}
			</motion.div>
		</motion.section>
	);
}

export default function AboutExperience({ copy }: Props) {
	return (
		<motion.div
			className="about-shell about-kinetic"
			variants={entryContainer}
			initial="hidden"
			animate="visible"
		>
			<section className="about-hero">
				<motion.div className="about-hero-copy" variants={entryItem}>
					<p className="page-eyebrow">{copy.eyebrow}</p>
					<h1>
						<ScrambleText text={copy.title} />
					</h1>
					<div className="about-identity-line">
						<span>{copy.role}</span>
						<span>{copy.location}</span>
					</div>
					<p className="page-lead">{copy.lead}</p>
					<div className="about-intro">
						{copy.intro.map((paragraph) => (
							<p key={paragraph}>{paragraph}</p>
						))}
					</div>
				</motion.div>
				<HeroInstrument copy={copy} />
			</section>

			<ExperienceBoard copy={copy} />
			<ContactSection copy={copy} />
		</motion.div>
	);
}
