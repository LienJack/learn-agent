'use client';

import {
	motion,
	useMotionValue,
	useReducedMotion,
	useSpring,
	useTransform,
	type Variants,
} from 'framer-motion';
import type { CSSProperties, MouseEvent, PointerEvent, ReactNode } from 'react';
import type { HomeCopy } from '../../i18n/messages';

type HomePageProps = {
	siteTitle: string;
	copy: HomeCopy;
	blogHref: string;
	recommendedHref: string;
	harnessHref: string;
};

type IconName =
	| 'agent'
	| 'code'
	| 'compass'
	| 'database'
	| 'feather'
	| 'layers'
	| 'mcp'
	| 'redis'
	| 'spark'
	| 'stack'
	| 'thread'
	| 'window';

const entryContainer: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.07,
			delayChildren: 0.04,
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
			stiffness: 112,
			damping: 21,
		},
	},
};

function MagneticLink({
	href,
	children,
	className,
}: {
	href: string;
	children: ReactNode;
	className: string;
}) {
	const prefersReducedMotion = useReducedMotion();
	const rawX = useMotionValue(0);
	const rawY = useMotionValue(0);
	const x = useSpring(useTransform(rawX, [-80, 80], [-7, 7]), {
		stiffness: 180,
		damping: 18,
	});
	const y = useSpring(useTransform(rawY, [-44, 44], [-4, 4]), {
		stiffness: 180,
		damping: 18,
	});

	function handlePointerMove(event: MouseEvent<HTMLAnchorElement>) {
		if (prefersReducedMotion) {
			return;
		}

		const bounds = event.currentTarget.getBoundingClientRect();
		rawX.set(event.clientX - bounds.left - bounds.width / 2);
		rawY.set(event.clientY - bounds.top - bounds.height / 2);
	}

	function handlePointerLeave() {
		rawX.set(0);
		rawY.set(0);
	}

	return (
		<motion.a
			className={className}
			href={href}
			style={prefersReducedMotion ? undefined : { x, y }}
			onMouseMove={handlePointerMove}
			onMouseLeave={handlePointerLeave}
			whileTap={{ scale: 0.98, y: 1 }}
		>
			<span>{children}</span>
			<span className="learn-arrow" aria-hidden="true">
				-&gt;
			</span>
		</motion.a>
	);
}

function HomeIcon({ name }: { name: IconName }) {
	const paths: Record<IconName, ReactNode> = {
		agent: (
			<>
				<rect x="6" y="9" width="12" height="9" rx="3" />
				<path d="M9 9V6m6 3V6M8.5 14h.01M15.5 14h.01M10.5 18v2h3v-2" />
			</>
		),
		code: (
			<>
				<rect x="4" y="5" width="16" height="14" rx="2" />
				<path d="m10 9-3 3 3 3m4-6 3 3-3 3" />
			</>
		),
		compass: (
			<>
				<circle cx="12" cy="12" r="8" />
				<path d="m15.5 8.5-2.2 5-4.8 2 2.2-5z" />
			</>
		),
		database: (
			<>
				<ellipse cx="12" cy="6.5" rx="6" ry="3" />
				<path d="M6 6.5v11c0 1.7 2.7 3 6 3s6-1.3 6-3v-11M6 12c0 1.7 2.7 3 6 3s6-1.3 6-3" />
			</>
		),
		feather: (
			<>
				<path d="M19 5c-6.2.3-10.7 4.8-12 12l-2 2" />
				<path d="M8 16c5.4-.5 8.5-3.8 10-10" />
				<path d="M9 11h5M7 15h4" />
			</>
		),
		layers: (
			<>
				<path d="m12 3 8 4-8 4-8-4z" />
				<path d="m4 12 8 4 8-4M4 17l8 4 8-4" />
			</>
		),
		mcp: (
			<>
				<path d="m9 7 6 10M15 7 9 17" />
				<rect x="4" y="4" width="6" height="6" rx="1.5" />
				<rect x="14" y="14" width="6" height="6" rx="1.5" />
			</>
		),
		redis: (
			<>
				<path d="m12 4 8 4-8 4-8-4z" />
				<path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
			</>
		),
		spark: (
			<path d="M12 3c1.2 4 3 5.8 7 7-4 1.2-5.8 3-7 7-1.2-4-3-5.8-7-7 4-1.2 5.8-3 7-7Z" />
		),
		stack: (
			<>
				<path d="M4 8h16M4 12h16M4 16h16" />
				<path d="M7 5h10v14H7z" />
			</>
		),
		thread: (
			<>
				<path d="M6 5h12M6 12h12M6 19h12" />
				<circle cx="4" cy="5" r="1" />
				<circle cx="4" cy="12" r="1" />
				<circle cx="4" cy="19" r="1" />
			</>
		),
		window: (
			<>
				<rect x="4" y="5" width="16" height="14" rx="2" />
				<path d="M4 9h16M8 13h4M8 16h8" />
			</>
		),
	};

	return (
		<svg className="learn-icon" viewBox="0 0 24 24" aria-hidden="true">
			<g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.65">
				{paths[name]}
			</g>
		</svg>
	);
}

function HomeSketchIllustration({ alt }: { alt: string }) {
	const prefersReducedMotion = useReducedMotion();

	return (
		<motion.div
			className="learn-sketch-stage"
			variants={entryItem}
			animate={
				prefersReducedMotion
					? undefined
					: {
							y: [0, -8, 0],
							rotate: [0, -0.25, 0.2, 0],
						}
			}
			transition={{
				duration: 8,
				repeat: Infinity,
				type: 'spring',
				stiffness: 80,
				damping: 18,
			}}
		>
			<div className="learn-sketch-card">
				<img
					className="learn-sketch"
					src="/home-sketch-illustration.svg"
					alt={alt}
				/>
			</div>
			<div className="learn-orbit-chip learn-orbit-chip-agent">Agent Runtime</div>
			<div className="learn-orbit-chip learn-orbit-chip-sql">SQL + Redis</div>
			<div className="learn-orbit-chip learn-orbit-chip-code">Claude Code</div>
		</motion.div>
	);
}

function SourceCubeIllustration() {
	return (
		<img
			className="learn-feature-image"
			src="/home-source-cube-illustration.png"
			alt=""
			loading="lazy"
		/>
	);
}

function HarnessWindowIllustration() {
	return (
		<img
			className="learn-feature-image"
			src="/home-harness-window-illustration.png"
			alt=""
			loading="lazy"
		/>
	);
}

function setSpotlightPosition(event: PointerEvent<HTMLElement>) {
	const bounds = event.currentTarget.getBoundingClientRect();
	event.currentTarget.style.setProperty('--spotlight-x', `${event.clientX - bounds.left}px`);
	event.currentTarget.style.setProperty('--spotlight-y', `${event.clientY - bounds.top}px`);
}

export default function HomePage({
	siteTitle,
	copy,
	blogHref,
	recommendedHref,
	harnessHref,
}: HomePageProps) {
	const prefersReducedMotion = useReducedMotion();
	const displayTitle = siteTitle.replace(/-\s*/g, ' ');
	const statIcons: IconName[] = ['compass', 'code', 'layers'];
	const laneIcons: IconName[] = ['spark', 'database', 'feather'];
	const stackIcons: IconName[] = ['agent', 'spark', 'mcp', 'spark', 'database', 'redis', 'stack', 'window', 'compass'];

	function handleSpotlightPointerMove(event: PointerEvent<HTMLElement>) {
		if (!prefersReducedMotion) {
			setSpotlightPosition(event);
		}
	}

	const featuredItems = [
		{
			eyebrow: copy.featuredEyebrow,
			title: copy.featuredTitle,
			body: copy.featuredBody,
			cta: copy.featuredCta,
			href: recommendedHref,
			visual: <SourceCubeIllustration />,
			primary: true,
		},
		{
			eyebrow: copy.harnessEyebrow,
			title: copy.harnessTitle,
			body: copy.harnessBody,
			cta: copy.harnessCta,
			href: harnessHref,
			visual: <HarnessWindowIllustration />,
			primary: false,
		},
	];

	return (
		<motion.div
			className="home-shell learn-home"
			variants={entryContainer}
			initial={false}
			animate="visible"
		>
			<section className="learn-hero">
				<motion.div className="learn-hero-copy" variants={entryItem}>
					<p className="learn-eyebrow">{copy.eyebrow}</p>
					<h1>{displayTitle}</h1>
					<p className="learn-lead">{copy.lead}</p>
					<p className="learn-note">{copy.note}</p>
					<div className="learn-actions" aria-label={copy.actionsLabel}>
						<MagneticLink className="learn-action learn-action-primary" href={blogHref}>
							{copy.primaryCta}
						</MagneticLink>
						<MagneticLink className="learn-action" href={recommendedHref}>
							{copy.secondaryCta}
						</MagneticLink>
					</div>
					<div className="learn-route-strip" aria-label={copy.routesLabel}>
						{copy.stats.map((stat, index) => (
							<div
								className="learn-route-item learn-cascade-item"
								key={stat.label}
								style={{ '--index': index } as CSSProperties}
							>
								<HomeIcon name={statIcons[index] ?? 'spark'} />
								<span>{stat.label}</span>
								<strong>{stat.value}</strong>
								<small>{stat.detail}</small>
							</div>
						))}
					</div>
				</motion.div>
				<HomeSketchIllustration alt={copy.heroImageAlt} />
			</section>

			<section className="learn-featured" id="learning-routes" aria-labelledby="learn-featured-title">
				<div className="learn-section-heading">
					<h2 id="learn-featured-title">{copy.featuredHeading}</h2>
				</div>
				<div className="learn-featured-grid">
					{featuredItems.map((item) => (
						<motion.article
							className="learn-feature-card learn-spotlight-surface"
							key={item.href}
							variants={entryItem}
							onPointerMove={handleSpotlightPointerMove}
							whileHover={prefersReducedMotion ? undefined : { y: -5 }}
							transition={{ type: 'spring', stiffness: 150, damping: 19 }}
						>
							<div className="learn-feature-copy">
								<p className="learn-card-eyebrow">{item.eyebrow}</p>
								<h3>{item.title}</h3>
								<p>{item.body}</p>
								<a className={item.primary ? 'learn-small-action learn-small-action-primary' : 'learn-small-action'} href={item.href}>
									<span>{item.cta}</span>
									<span className="learn-arrow" aria-hidden="true">
										-&gt;
									</span>
								</a>
							</div>
							<div className="learn-feature-art" aria-hidden="true">
								{item.visual}
							</div>
						</motion.article>
					))}
				</div>
			</section>

			<section className="learn-lanes" aria-label={copy.lanesLabel}>
				{copy.lanes.map((lane, index) => (
					<motion.article
						className="learn-lane-card learn-spotlight-surface"
						key={lane.title}
						variants={entryItem}
						onPointerMove={handleSpotlightPointerMove}
						whileHover={prefersReducedMotion ? undefined : { y: -4 }}
						transition={{ type: 'spring', stiffness: 150, damping: 18 }}
					>
						<div className="learn-lane-icon">
							<HomeIcon name={laneIcons[index] ?? 'spark'} />
						</div>
						<p className="learn-card-eyebrow">{lane.eyebrow}</p>
						<h3>{lane.title}</h3>
						<p>{lane.body}</p>
						<ul>
							{lane.items.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					</motion.article>
				))}
			</section>

			<motion.section
				className="learn-stack-panel learn-spotlight-surface"
				id="tech-stack"
				aria-labelledby="learn-stack-title"
				variants={entryItem}
				onPointerMove={handleSpotlightPointerMove}
			>
				<div className="learn-stack-heading">
					<h2 id="learn-stack-title">{copy.stackTitle}</h2>
					<a href={blogHref}>
						<span>{copy.stackCta}</span>
						<span className="learn-arrow" aria-hidden="true">
							-&gt;
						</span>
					</a>
				</div>
				<div className="learn-stack-grid" aria-label={copy.stackLabel}>
					{copy.stack.map((item, index) => (
						<span className="learn-cascade-item" key={item} style={{ '--index': index } as CSSProperties}>
							<HomeIcon name={stackIcons[index] ?? 'spark'} />
							{item}
						</span>
					))}
				</div>
			</motion.section>

			<motion.section
				className="learn-thread-panel learn-spotlight-surface"
				aria-labelledby="learn-thread-title"
				variants={entryItem}
				onPointerMove={handleSpotlightPointerMove}
			>
				<div className="learn-section-heading">
					<h2 id="learn-thread-title">{copy.threadsTitle}</h2>
				</div>
				<ul className="learn-thread-list">
					{copy.threads.map((thread, index) => (
						<li className="learn-cascade-item" key={thread} style={{ '--index': index } as CSSProperties}>
							<span className="learn-thread-icon">
								<HomeIcon name={index === 0 ? 'thread' : index === 1 ? 'stack' : index === 2 ? 'layers' : 'feather'} />
							</span>
							<span>{thread}</span>
							<span className="learn-row-arrow" aria-hidden="true">
								-&gt;
							</span>
						</li>
					))}
				</ul>
			</motion.section>
		</motion.div>
	);
}
