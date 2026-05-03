import {
	DEFAULT_LOCALE,
	LOCALE_TO_HTML_LANG,
	LOCALE_TO_OG_LOCALE,
	type Locale,
} from './config';

export type HomeCardCopy = {
	eyebrow: string;
	title: string;
	body: string;
};

export type HomeCopy = {
	eyebrow: string;
	lead: string;
	note: string;
	primaryCta: string;
	secondaryCta: string;
	panelEyebrow: string;
	panelTitle: string;
	panelBody: string;
	cards: [HomeCardCopy, HomeCardCopy];
	threadsEyebrow: string;
	threadsTitle: string;
	threads: string[];
};

export type AboutSectionCopy = {
	title: string;
	paragraphs: string[];
};

export type AboutCopy = {
	eyebrow: string;
	title: string;
	lead: string;
	intro: string[];
	sections: AboutSectionCopy[];
	closing: string[];
};

export type LocaleMessages = {
	site: {
		title: string;
		description: string;
		tagline: string;
	};
	meta: {
		homeTitle: string;
		aboutTitle: string;
		aboutDescription: string;
		blogTitle: string;
		blogDescription: string;
	};
	header: {
		ariaLabel: string;
		home: string;
		blog: string;
		about: string;
		rss: string;
		languageSwitcherLabel: string;
	};
	footer: {
		description: string;
		blog: string;
		about: string;
		rss: string;
		copyrightLabel: string;
	};
	blog: {
		eyebrow: string;
		title: string;
		lead: string;
	};
	article: {
		updatedAt: string;
	};
	home: HomeCopy;
	about: AboutCopy;
};

const messages: Record<Locale, LocaleMessages> = {
	zh: {
		site: {
			title: 'learn-agent',
			description: '记录 AI 学习、Agent 实践与工作流方法论的中文笔记站。',
			tagline: 'AI 学习 / Agent 实践 / 工作流笔记',
		},
		meta: {
			homeTitle: 'learn-agent',
			aboutTitle: '关于这个站点',
			aboutDescription: '写下 AI 学习、Agent 实践与工作流观察的中文记录。',
			blogTitle: '文章',
			blogDescription:
				'这里收纳关于 AI 学习、Agent 实践与工作流方法论的中文记录。内容以可回看、可复用为先，不急着把每件事都写成结论。',
		},
		header: {
			ariaLabel: '主导航',
			home: '首页',
			blog: '文章',
			about: '关于',
			rss: 'RSS',
			languageSwitcherLabel: '切换语言',
		},
		footer: {
			description: '记录 AI 学习、Agent 实践与工作流方法论的中文笔记站。',
			blog: '文章',
			about: '关于',
			rss: 'RSS',
			copyrightLabel: '保留所有判断与修订痕迹。',
		},
		blog: {
			eyebrow: 'Archive',
			title: '文章',
			lead: '这里收纳关于 AI 学习、Agent 实践与工作流方法论的中文记录。内容以可回看、可复用为先，不急着把每件事都写成结论。',
		},
		article: {
			updatedAt: '更新于',
		},
		home: {
			eyebrow: 'Notes in Progress',
			lead: '记录 AI 学习、Agent 实践与工作流方法论的中文笔记站。',
			note: '这里不追求“快报式结论”，更关心把学习过程、判断依据和实践细节慢慢写清楚。',
			primaryCta: '查看文章',
			secondaryCta: '了解写作方向',
			panelEyebrow: 'What lives here',
			panelTitle: '把 AI 学习变成可以回看的长期记录',
			panelBody:
				'站点围绕 AI 学习、Agent 实践、工作流观察和方法论笔记展开。比起追热点，这里更适合放那些需要反复推敲、值得以后重新翻出来看的内容。',
			cards: [
				{
					eyebrow: 'Writing Focus',
					title: '内容方向',
					body: '记录从工具试用到流程落地之间的真实细节：哪里有效，哪里卡住，哪些判断值得保留。',
				},
				{
					eyebrow: 'Working Method',
					title: '写法偏好',
					body: '尽量用清晰的中文把实验背景、操作路径和结论拆开写，让文章既能快速扫读，也能长期回看。',
				},
			],
			threadsEyebrow: 'Next Threads',
			threadsTitle: '接下来会持续补上的内容',
			threads: [
				'把零散的实验、笔记和提示词整理成可复用的文章系列',
				'记录 Agent 工作流里的具体案例，而不只停留在概念层',
				'持续收敛站点的语言、排版与组件，让每次更新都更像同一个地方',
				'沉淀一套适合中文技术写作的长期写作节奏',
			],
		},
		about: {
			eyebrow: 'About This Site',
			title: '关于这个站点',
			lead: '写下 AI 学习、Agent 实践与工作流观察的中文记录。',
			intro: [
				'这个站点用来记录我在学习 AI、尝试 Agent 工作流、整理方法论时留下来的过程性笔记。它不追求把每一次尝试都包装成成熟结论，更希望把那些值得回看、值得复用的判断慢慢写清楚。',
			],
			sections: [
				{
					title: '会写什么',
					paragraphs: [
						'内容主要会落在四类：AI 工具和模型的学习笔记、Agent 实践里的真实案例、工作流设计里的取舍与复盘，以及写作过程中逐渐稳定下来的方法论。',
					],
				},
				{
					title: '为什么要单独写下来',
					paragraphs: [
						'很多关于 AI 的理解如果只停留在聊天记录、临时文档或一次性的实验里，很快就会散掉。把它们整理成文章，既是为了以后自己能重新理解当时的判断，也是为了慢慢长出一套更稳定的表达方式。',
					],
				},
				{
					title: '希望保持的写法',
					paragraphs: [
						'我更偏好中文长文阅读的节奏：信息要清楚，判断要有来路，装饰不要盖过内容。页面和文字都尽量克制一些，让读者先看到内容本身，再看到风格。',
					],
				},
			],
			closing: [
				'如果你也在做类似的事情，希望这里能逐渐成为一个能交换经验、复盘方法、校准判断的小站，而不只是一个套着模板的默认博客。',
			],
		},
	},
	en: {
		site: {
			title: 'learn-agent',
			description: 'A Chinese-first notebook on AI learning, agent practice, and workflow thinking.',
			tagline: 'AI learning / agent practice / workflow notes',
		},
		meta: {
			homeTitle: 'learn-agent',
			aboutTitle: 'About',
			aboutDescription: 'What this site documents, how it is written, and why it exists.',
			blogTitle: 'Chinese Notes',
			blogDescription:
				'The archive is currently published in Chinese. It focuses on AI learning, agent practice, and workflow thinking with reusable notes rather than polished hot takes.',
		},
		header: {
			ariaLabel: 'Primary navigation',
			home: 'Home',
			blog: 'Chinese Notes',
			about: 'About',
			rss: 'RSS',
			languageSwitcherLabel: 'Switch language',
		},
		footer: {
			description: 'A Chinese-first notebook on AI learning, agent practice, and workflow thinking.',
			blog: 'Chinese Notes',
			about: 'About',
			rss: 'RSS',
			copyrightLabel: 'A long-form notebook, not a launch log.',
		},
		blog: {
			eyebrow: 'Archive',
			title: 'Chinese Notes',
			lead: 'The archive is currently published in Chinese. It focuses on AI learning, agent practice, and workflow thinking with reusable notes rather than polished hot takes.',
		},
		article: {
			updatedAt: 'Updated',
		},
		home: {
			eyebrow: 'Chinese-First Notes',
			lead: 'A running notebook on AI learning, agent practice, and workflow thinking.',
			note: 'The site shell is localized, but the post archive still grows in Chinese first. The goal here is clarity, method, and real implementation detail over quick conclusions.',
			primaryCta: 'Read the Chinese archive',
			secondaryCta: 'See what this site is for',
			panelEyebrow: 'What lives here',
			panelTitle: 'Long-form notes for work that needs to be revisited',
			panelBody:
				'This project collects experiments, workflow decisions, agent case studies, and writing patterns that are worth returning to later. It is meant to stay usable after the hype cycle has moved on.',
			cards: [
				{
					eyebrow: 'Writing Focus',
					title: 'What gets documented',
					body: 'Tool evaluations, agent workflows, implementation tradeoffs, and the pieces of judgment that are worth preserving after the experiment ends.',
				},
				{
					eyebrow: 'Reading Experience',
					title: 'How it is written',
					body: 'The writing aims to separate context, procedure, and conclusion so the notes stay skimmable at first glance and reusable on a second read.',
				},
			],
			threadsEyebrow: 'Next Threads',
			threadsTitle: 'What this notebook keeps building toward',
			threads: [
				'Turn scattered prompts, experiments, and notes into reusable article series',
				'Document concrete agent workflow cases instead of stopping at definitions',
				'Keep refining the site language, typography, and components until the whole place feels intentional',
				'Build a steady long-form writing rhythm around Chinese technical thinking',
			],
		},
		about: {
			eyebrow: 'About This Site',
			title: 'About',
			lead: 'This site documents AI learning, agent practice, and workflow observations in a form that is meant to remain useful later.',
			intro: [
				'learn-agent is a Chinese-first notebook for work in progress. It exists to keep experiments, implementation details, and decisions from dissolving into chat logs or one-off scratch documents.',
			],
			sections: [
				{
					title: 'What is written here',
					paragraphs: [
						'Most posts sit somewhere between tool learning notes, real agent workflow cases, workflow design tradeoffs, and the methods that gradually become stable enough to repeat.',
					],
				},
				{
					title: 'Why write them down',
					paragraphs: [
						'Understanding around AI shifts quickly, and a lot of useful judgment disappears when it only lives inside temporary conversations. Turning it into articles makes it easier to revisit the original reasoning and tighten the writing over time.',
					],
				},
				{
					title: 'How the archive is staged',
					paragraphs: [
						'The current archive is still published mainly in Chinese. The English shell is here to make the site legible to overseas readers while the content layer remains honest about what is and is not localized yet.',
					],
				},
			],
			closing: [
				'If you are also building with AI and agents in a way that needs reflection rather than constant launch energy, this site is meant to become a calm place to compare notes.',
			],
		},
	},
	ja: {
		site: {
			title: 'learn-agent',
			description: 'AI 学習、Agent 実践、ワークフロー設計を記録するための日本語入口です。',
			tagline: 'AI 学習 / Agent 実践 / ワークフローノート',
		},
		meta: {
			homeTitle: 'learn-agent',
			aboutTitle: 'このサイトについて',
			aboutDescription: 'この場所が何を扱い、どのような姿勢で書かれているかをまとめた紹介ページです。',
			blogTitle: '中国語アーカイブ',
			blogDescription:
				'記事アーカイブは現在中国語を中心に更新しています。AI 学習、Agent 実践、ワークフロー設計を長く参照できる形で残すための記録です。',
		},
		header: {
			ariaLabel: 'サイトナビゲーション',
			home: 'トップ',
			blog: '中国語アーカイブ',
			about: '紹介',
			rss: 'RSS',
			languageSwitcherLabel: '言語切替',
		},
		footer: {
			description: 'AI 学習、Agent 実践、ワークフロー設計を記録するための日本語入口です。',
			blog: '中国語アーカイブ',
			about: '紹介',
			rss: 'RSS',
			copyrightLabel: '途中の判断も残すためのノートサイトです。',
		},
		blog: {
			eyebrow: 'Archive',
			title: '中国語アーカイブ',
			lead: '記事アーカイブは現在中国語を中心に更新しています。AI 学習、Agent 実践、ワークフロー設計を長く参照できる形で残すための記録です。',
		},
		article: {
			updatedAt: '更新',
		},
		home: {
			eyebrow: 'Japanese Entry',
			lead: 'AI と Agent の実践を、あとで読み返せる判断のかたちで残していくための入口です。',
			note: '現時点で記事本体は中国語中心です。日本語ページでは、このサイトが何を目指しているかと、どんな読み方を想定しているかを先に伝えます。',
			primaryCta: '中国語アーカイブを見る',
			secondaryCta: 'このサイトの考え方を見る',
			panelEyebrow: 'Reading Stance',
			panelTitle: '速い結論より、あとから効いてくる判断を残す',
			panelBody:
				'ここでは AI 学習メモ、Agent の実装事例、ワークフロー設計の選択理由を、派手な要約ではなく再利用できる記録として整えていきます。',
			cards: [
				{
					eyebrow: 'Scope',
					title: '扱うテーマ',
					body: 'モデルやツールの学習、Agent の導入実験、ワークフローの組み替え、そしてその途中で固まってきた方法論。',
				},
				{
					eyebrow: 'Current State',
					title: 'いまの公開状態',
					body: '日本語ページはブランド入口として先に整え、記事アーカイブは中国語中心のまま運用しています。内容層の多言語化は段階的に広げていく想定です。',
				},
			],
			threadsEyebrow: 'Ongoing Threads',
			threadsTitle: 'この先、蓄積していきたいこと',
			threads: [
				'散らばった実験ログやプロンプトを、再利用できる記事群へまとめること',
				'Agent 活用を概念説明で終わらせず、運用上の具体例として残すこと',
				'文章・レイアウト・部品の一貫性を高めて、更新のたびに場所性を強くすること',
				'長く付き合える技術メモの書き方を育てること',
			],
		},
		about: {
			eyebrow: 'About This Site',
			title: 'このサイトについて',
			lead: 'AI 学習と Agent 実践の途中で得られた判断を、後から再利用できる形で残すためのノートサイトです。',
			intro: [
				'このサイトは、試して終わりになりやすい AI 関連の学習や実装ログを、あとで参照し直せる記録に変えていくための場所です。',
			],
			sections: [
				{
					title: '何を残したいか',
					paragraphs: [
						'ツールの触り方だけではなく、なぜその手順を選んだのか、どこで詰まり、何を次に持ち越したのかまで含めて残したいと考えています。',
					],
				},
				{
					title: '日本語ページの役割',
					paragraphs: [
						'日本語ページは、全文翻訳済みのアーカイブを約束するものではありません。まずはこのサイトの輪郭と温度感を伝える入口として設計しています。',
					],
				},
				{
					title: 'いまの更新方針',
					paragraphs: [
						'記事本文は現在も中国語が中心です。公開の優先順位は、内容を先に残し、それを支える多言語導線をあとから丁寧に広げていく方針です。',
					],
				},
			],
			closing: [
				'同じように AI や Agent を「あとで効く知識」として整理したい人にとって、静かに比較と内省ができる場所になっていけばうれしいです。',
			],
		},
	},
};

export function getMessages(locale: Locale = DEFAULT_LOCALE): LocaleMessages {
	return messages[locale] ?? messages[DEFAULT_LOCALE];
}

export function getHtmlLang(locale: Locale = DEFAULT_LOCALE): string {
	return LOCALE_TO_HTML_LANG[locale];
}

export function getOgLocale(locale: Locale = DEFAULT_LOCALE): string {
	return LOCALE_TO_OG_LOCALE[locale];
}
