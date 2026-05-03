type HomePageProps = {
	siteTitle: string;
	copy: {
		eyebrow: string;
		lead: string;
		note: string;
		primaryCta: string;
		secondaryCta: string;
		featuredEyebrow: string;
		featuredTitle: string;
		featuredBody: string;
		featuredCta: string;
	};
	blogHref: string;
	aboutHref: string;
	recommendedHref: string;
};

function HomeSketchIllustration() {
	return (
		<div className="home-sketch-card">
			<svg
				className="home-sketch"
				viewBox="0 0 650 650"
				role="img"
				aria-labelledby="home-sketch-title"
				xmlns="http://www.w3.org/2000/svg"
			>
				<title id="home-sketch-title">月亮、Gemini 星标、GPT 标志、宇航员和 DeepSeek 鲸鱼组成的手绘太空场景</title>
				<g className="scene-root" fill="none" stroke="#151515" strokeLinecap="round" strokeLinejoin="round">
					<g className="scene-orbits scene-orbits-back" strokeWidth="2.3">
						<path id="orbit-burst-path" d="M196 252c-8-76 82-105 196-87 125 20 210 91 177 169-28 67-164 83-272 36-76-33-112-75-101-118Z" />
						<path id="orbit-gpt-path" d="M300 254c80-86 250-103 275-45 23 54-37 128-141 157-96 27-214 11-239-38-19-39 25-39 105-74Z" />
						<path id="orbit-gemini-path" d="M205 360c-25-48 35-104 121-129 110-32 229-8 252 52 20 53-48 94-150 95-103 2-194-30-223-18Z" />
						<path d="M200 374c-34 4-4-42 5-61" />
						<path d="M522 382c60 31 75-21 64-42" />
					</g>

					<g className="scene-moon" transform="translate(-22 -8) scale(1.04)" strokeWidth="3.1">
						<path
							fill="#fffefd"
							d="M155 42c-45 2-83 30-102 75-24 58-6 112 35 136 24 14 55 13 83-1-21-6-39-20-50-42-15-30-16-70-2-104 14-35 41-58 75-66-11-2-24-1-39 2Z"
						/>
						<path
							fill="#fffefd"
							d="M125 69c34-29 94-27 131 9 1 8-5 13-18 13-36-2-75-1-110 10-11 2-16-1-13-9 2-8 5-15 10-23Z"
						/>
						<path
							fill="#fffefd"
							d="M139 126c37-6 75-3 115 7 8 4 8 22 0 29-43-8-84-10-123-5-10-8-6-25 8-31Z"
						/>
						<path
							fill="#fffefd"
							d="M139 181c34 1 66 7 97 19 8 9 6 25-5 31-35-13-68-21-101-23-12-10-8-25 9-27Z"
						/>
						<path d="M155 42c-34 7-66 31-82 68-22 50-13 101 20 128" opacity="0.85" />
						<path d="M61 101c-12 44-2 96 38 127" opacity="0.62" />
						<path d="M78 87c34-20 76-29 118-25" opacity="0.72" />
						<path d="M69 129c50-24 116-34 174-24" opacity="0.62" />
						<path d="M67 168c43-7 98-7 160 8" opacity="0.62" />
						<path d="M82 211c25 10 54 14 86 12" opacity="0.55" />
						<path d="M139 54c-14 47-14 93 2 141" opacity="0.45" />
						<path d="M178 48c-26 36-38 83-34 137" opacity="0.42" />
						<path d="M211 56c-17 30-27 63-31 97" opacity="0.34" />
						<path d="M67 118c8 6 18 9 31 10" strokeWidth="1.4" opacity="0.45" />
						<path d="M75 178c9 8 22 12 37 12" strokeWidth="1.4" opacity="0.45" />
						<path d="M97 73c18-13 39-20 62-23" strokeWidth="1.6" opacity="0.8" />
						<path d="M122 97c21-10 45-17 72-20" strokeWidth="1.4" opacity="0.48" />
						<path d="M146 122c11-7 24-11 39-14" strokeWidth="1.3" opacity="0.42" />
						<path d="M151 163c28-3 57 0 88 7" strokeWidth="1.3" opacity="0.45" />
						<path d="M151 212c23 4 45 10 66 18" strokeWidth="1.3" opacity="0.45" />
						<path d="M165 112c3 9 6 18 9 27M179 110c3 10 6 21 8 32M194 110c3 11 6 23 7 35M209 112c3 11 5 23 6 34M224 116c3 10 5 20 6 30" strokeWidth="1.6" />
						<path d="M158 167c2 9 4 18 7 27M172 168c2 10 4 20 7 30M188 170c2 10 4 20 7 31M204 174c2 10 4 20 6 31" strokeWidth="1.6" />
						<path d="M147 212c2 9 5 19 9 29M163 216c2 9 5 18 10 26M180 221c3 8 7 16 12 23" strokeWidth="1.6" />
						<path d="M58 111c-8 27-9 55-2 81M56 203c7 21 20 38 38 50" strokeWidth="2.1" opacity="0.78" />
						<path d="M76 82c-12 10-21 22-27 37M47 132c-4 16-5 32-3 48M50 197c6 23 20 41 42 54" strokeWidth="2" opacity="0.6" />
						<path d="M243 130c16 4 25 9 28 17M236 198c10 4 18 9 24 16" strokeWidth="1.8" opacity="0.5" />
					</g>

					<g className="scene-stars" strokeWidth="2.8">
						<path className="twinkle twinkle-large twinkle-delay-1" d="M86 414c5 15 11 21 23 24-13 3-19 10-23 24-5-14-11-21-24-24 13-3 19-9 24-24Z" />
						<path className="twinkle twinkle-large twinkle-delay-2" d="M559 70c4 13 9 18 19 20-10 3-15 8-19 21-4-13-9-18-20-21 11-2 16-7 20-20Z" />
						<g className="scene-atom-motion scene-atom-motion-burst">
							<animateMotion dur="8s" repeatCount="indefinite" rotate="0" calcMode="linear">
								<mpath href="#orbit-burst-path" />
							</animateMotion>
							<path className="twinkle twinkle-burst" d="M0-28v57M-28 0h57M-20-20l40 40M20-20l-40 40" strokeWidth="4" />
						</g>
						<g strokeWidth="2.2">
							<circle className="twinkle twinkle-dot twinkle-delay-3" cx="228" cy="124" r="3" />
							<circle className="twinkle twinkle-dot twinkle-delay-1" cx="80" cy="288" r="4" />
							<circle className="twinkle twinkle-dot twinkle-delay-2" cx="146" cy="407" r="3" />
							<circle className="twinkle twinkle-dot twinkle-delay-4" cx="562" cy="511" r="3" />
							<circle className="twinkle twinkle-dot twinkle-delay-2" cx="607" cy="117" r="2" />
							<circle className="twinkle twinkle-dot twinkle-delay-3" cx="644" cy="236" r="3" />
							<path className="twinkle twinkle-cross twinkle-delay-1" d="M613 429v12M607 435h12" />
							<path className="twinkle twinkle-cross twinkle-delay-4" d="M200 533v15M193 541h14" />
						</g>
					</g>

					<g className="scene-atom-motion scene-atom-motion-gemini">
						<animateMotion dur="7s" repeatCount="indefinite" rotate="0" calcMode="linear">
							<mpath href="#orbit-gemini-path" />
						</animateMotion>
						<g className="scene-gemini" strokeWidth="3">
							<path className="twinkle twinkle-gemini" d="M0-34c8 23 17 30 35 34-19 4-27 15-35 35-7-20-16-30-34-35 18-5 28-13 34-34Z" />
						</g>
					</g>

					<g className="scene-atom-motion scene-atom-motion-gpt">
						<animateMotion dur="10s" repeatCount="indefinite" rotate="0" calcMode="linear">
							<mpath href="#orbit-gpt-path" />
						</animateMotion>
						<g className="scene-gpt" strokeWidth="5.2">
							<path d="M0-32 23-19c8 5 9 15 1 21L9 11" />
							<path d="M0-32 23-19c8 5 9 15 1 21L9 11" transform="rotate(60)" />
							<path d="M0-32 23-19c8 5 9 15 1 21L9 11" transform="rotate(120)" />
							<path d="M0-32 23-19c8 5 9 15 1 21L9 11" transform="rotate(180)" />
							<path d="M0-32 23-19c8 5 9 15 1 21L9 11" transform="rotate(240)" />
							<path d="M0-32 23-19c8 5 9 15 1 21L9 11" transform="rotate(300)" />
							<path d="M-14-8 0-17 14-8v16L0 17-14 8Z" strokeWidth="4" />
						</g>
					</g>

					<g className="scene-deepseek" transform="translate(-30 -24) scale(1.12)" strokeWidth="3.6">
						<path
							fill="#fffefd"
							d="M253 486c8-59 72-83 146-65 39 10 68 28 87 51 8 10 10 19 5 26-13 25-39 43-75 52-56 15-125 6-154-27-8-9-11-22-9-37Z"
						/>
						<g className="deepseek-tail">
							<path
								fill="#fffefd"
								d="M486 472c15-19 28-45 38-25 11 20 31 24 49 8-9 34-43 58-82 43-6-7-8-16-5-26Z"
							/>
							<path d="M492 493c-14-17 5-53 30-54M518 458c16 19 34 18 55-3" opacity="0.92" />
							<path d="M491 491c28 12 60-4 80-34" opacity="0.52" />
						</g>
						<path
							d="M255 486c12-51 69-76 136-63 37 8 69 23 95 49"
							opacity="0.72"
						/>
						<path d="M261 501c39-1 78 16 113 50" />
						<path d="M278 493c34 4 67 20 96 47" opacity="0.5" />
						<path d="M318 524c-31-16-48-7-50 11" />
						<path d="M373 546c35 8 81 0 111-24" />
						<path d="M414 545c17 4 36 2 57-7" opacity="0.48" />
						<path d="M281 440c17-21 45-25 69-14" />
						<path d="M292 432c14-8 31-9 49-3" opacity="0.48" />
						<path d="M431 525c23-8 41-24 53-45" />
						<path d="M253 489c-6 39 21 69 70 82" opacity="0.48" />
						<path d="M260 475c-10 43 15 82 67 97" opacity="0.38" />
						<circle cx="297" cy="450" r="2.4" fill="#151515" stroke="none" />
					</g>

					<g className="scene-astronaut" transform="translate(-42 2) rotate(8 380 360) scale(1.04)" strokeWidth="3.2">
						<g className="astronaut-arm-left">
							<path
								fill="#fffefd"
								d="M328 323c-17-6-35-19-50-39 2-9 9-16 19-18 13 17 28 30 46 39-2 10-7 16-15 18Z"
							/>
							<path d="M288 289c8 9 18 17 29 23M298 271c10 15 25 27 42 35" opacity="0.56" />
							<path d="M308 303c-5 5-12 7-19 7" strokeWidth="2.2" />
							<path
								fill="#fffefd"
								d="M280 277c-10-1-19-8-23-18-3-8 1-16 8-18 3-10 13-12 19-5 8-7 18-2 19 9 9 4 10 17 2 25-6 6-14 9-25 7Z"
							/>
							<path d="M260 254c4-6 9-10 15-10M271 243c3-8 11-11 17-5M285 241c8-3 15 3 16 13M299 252c8 5 7 15 1 21" strokeWidth="2" />
							<path d="M266 263c4 4 9 8 16 13" strokeWidth="2" />
							<path d="M303 320c-14-6-28-18-41-35" strokeWidth="1.45" opacity="0.5" />
						</g>

						<g className="astronaut-backpack">
							<path fill="#fffefd" d="M431 303l23 16 2 62-21-8Z" />
							<path d="M442 316l1 54" opacity="0.56" />
						</g>

						<g className="astronaut-legs">
							<path
								fill="#fffefd"
								d="M322 382c-28 0-56 14-80 41 8 10 25 12 43 5 17-7 32-20 53-34-2-8-8-12-16-12Z"
							/>
							<path d="M247 423c13 10 31 11 48 3" />
							<path d="M286 410c13-7 27-13 42-18" strokeWidth="1.7" opacity="0.55" />
							<ellipse cx="259" cy="432" rx="17" ry="10" transform="rotate(10 259 432)" fill="#fffefd" />
							<path
								fill="#fffefd"
								d="M348 380c28 6 49 21 60 44 7 23 1 48-15 65-16 6-34-1-40-14 16-15 20-36 11-56-12-15-22-31-16-39Z"
							/>
							<path d="M361 415c12 17 13 36 3 56" />
							<path d="M358 476c10 9 26 10 39 1" />
							<ellipse cx="377" cy="488" rx="24" ry="13" transform="rotate(-14 377 488)" fill="#fffefd" />
							<path d="M335 393c18 13 41 19 67 17" opacity="0.56" />
							<path d="M343 398c-14 17-25 36-33 57" strokeWidth="1.5" opacity="0.44" />
							<path d="M380 427c-9 15-12 30-8 45" strokeWidth="1.6" opacity="0.45" />
							<path d="M352 382c-6 7-7 16-2 25" strokeWidth="1.45" opacity="0.42" />
							<path d="M308 389c-8 9-15 19-21 31M317 388c-8 8-15 18-22 29M327 390c-8 7-15 16-21 25" strokeWidth="1.25" opacity="0.5" />
							<path d="M354 401c9 7 15 16 18 26M362 404c8 8 13 18 15 29" strokeWidth="1.25" opacity="0.48" />
						</g>

						<g className="astronaut-body">
							<path
								fill="#fffefd"
								d="M316 304c25 17 87 20 120 4 24 20 32 56 18 88-31 19-105 12-138-12-13-30-14-59 0-80Z"
							/>
							<path d="M316 304c20 24 90 28 120 4" />
							<path d="M318 318c-8 22-8 46 0 68M440 322c10 24 11 48 2 70" opacity="0.76" />
							<path d="M329 396c34 11 82 12 111-3" opacity="0.62" />
							<rect x="344" y="337" width="41" height="36" rx="4" fill="#fffefd" />
							<path d="M356 349h15M356 361h9" strokeWidth="2.1" />
							<circle cx="376" cy="360" r="2" fill="#151515" stroke="none" />
							<rect x="419" y="326" width="16" height="16" transform="rotate(2 427 334)" fill="#fffefd" />
							<path d="M329 322c5 8 12 14 22 17M429 352c9 11 14 24 16 37" strokeWidth="1.55" opacity="0.45" />
						</g>

						<g className="astronaut-arm-right">
							<path
								fill="#fffefd"
								d="M438 337c23 11 35 31 32 57-5 12-18 18-29 10 4-23 0-43-13-59 1-7 5-10 10-8Z"
							/>
							<path d="M450 357c4 14 4 30-1 45" opacity="0.56" />
							<path
								fill="#fffefd"
								d="M441 397c2 14 16 22 28 14 8-7 7-21-2-29-10 7-19 11-26 15Z"
							/>
							<path d="M450 400c-1 7 3 12 10 15M457 392c3 8 8 14 15 17" strokeWidth="2" />
						</g>

						<g className="astronaut-helmet">
							<circle cx="374" cy="262" r="65" fill="#fffefd" />
							<circle cx="374" cy="262" r="50" />
							<path d="M331 293c16 20 70 23 90 2" />
							<path d="M328 255c5-33 31-55 64-53M424 236c11 19 12 42 1 64" strokeWidth="1.5" opacity="0.55" />
							<path d="M340 227c6-4 13-7 21-9M413 225c5 5 8 10 10 17" strokeWidth="1.4" opacity="0.55" />
							<path
								fill="#fffefd"
								d="M351 264c4-18 18-30 35-31 12 2 21 10 24 23 11 4 15 17 10 29-7 14-25 21-43 17-18-4-29-17-26-38Z"
							/>
							<path d="M354 265c4-11 13-18 24-19 4-11 19-10 24 1 9 2 15 9 17 18" opacity="0.86" />
							<path d="M361 260c10 3 20-4 23-16 7 14 18 21 31 20" opacity="0.74" />
							<path d="M405 258c9 9 9 26-1 35" opacity="0.65" />
							<path d="M350 290c10 9 24 14 39 13 13-1 23-5 30-13" strokeWidth="1.6" opacity="0.5" />
							<circle cx="366" cy="274" r="2.3" fill="#151515" stroke="none" />
							<circle cx="391" cy="274" r="2.3" fill="#151515" stroke="none" />
							<path d="M376 280c-5 5-4 9 2 11M366 290c5 8 18 8 24 1" strokeWidth="2" />
							<circle cx="337" cy="241" r="2" />
							<circle cx="348" cy="224" r="2" />
							<circle cx="416" cy="239" r="2" />
							<path d="M425 278c-2 8-5 15-10 21" strokeWidth="1.5" opacity="0.5" />
						</g>
					</g>

					<g className="scene-orbits scene-orbits-front" strokeWidth="2.2">
						<path d="M205 374c-34 4-4-42 5-61" />
						<path d="M522 382c60 31 75-21 64-42" />
					</g>
				</g>
			</svg>
		</div>
	);
}

export default function HomePage({ siteTitle, copy, blogHref, aboutHref, recommendedHref }: HomePageProps) {
	return (
		<div className="home-shell">
			<section className="home-hero">
				<div className="home-hero-copy">
					<p className="page-eyebrow">{copy.eyebrow}</p>
					<h1>{siteTitle}</h1>
					<p className="home-lead">{copy.lead}</p>
					<p className="home-note">{copy.note}</p>
					<div className="home-actions">
						<a className="home-action home-action-primary" href={blogHref}>
							{copy.primaryCta}
						</a>
						<a className="home-action home-action-secondary" href={aboutHref}>
							{copy.secondaryCta}
						</a>
					</div>
				</div>
				<HomeSketchIllustration />
			</section>

			<section className="home-featured" aria-labelledby="home-featured-title">
				<div className="home-featured-copy">
					<p className="page-eyebrow">{copy.featuredEyebrow}</p>
					<h2 id="home-featured-title">{copy.featuredTitle}</h2>
					<p>{copy.featuredBody}</p>
				</div>
				<a className="home-featured-link" href={recommendedHref}>
					<span>{copy.featuredCta}</span>
				</a>
			</section>

		</div>
	);
}
