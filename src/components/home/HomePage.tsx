type HomePageProps = {
	siteTitle: string;
	copy: {
		eyebrow: string;
		lead: string;
		note: string;
		primaryCta: string;
		featuredEyebrow: string;
		featuredTitle: string;
		featuredBody: string;
		featuredCta: string;
	};
	blogHref: string;
	recommendedHref: string;
};

function HomeSketchIllustration() {
	return (
		<div className="home-sketch-card">
			<img
				className="home-sketch"
				src="/home-sketch-illustration.svg"
				alt="月亮、Gemini 星标、GPT 标志、宇航员和 DeepSeek 鲸鱼组成的手绘太空场景"
			/>
		</div>
	);
}

export default function HomePage({ siteTitle, copy, blogHref, recommendedHref }: HomePageProps) {
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
					</div>
				</div>
				<HomeSketchIllustration />
			</section>

			<section className="home-featured" aria-labelledby="home-featured-title">
				<img
					className="home-featured-illustration"
					src="/blog-covers/claude-code-typing.svg"
					alt=""
					aria-hidden="true"
				/>
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
