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

export type HomeStatCopy = {
	label: string;
	value: string;
	detail: string;
};

export type HomeLaneCopy = {
	eyebrow: string;
	title: string;
	body: string;
	items: string[];
};

export type HomeCopy = {
	eyebrow: string;
	lead: string;
	note: string;
	primaryCta: string;
	secondaryCta: string;
	actionsLabel: string;
	routesLabel: string;
	heroImageAlt: string;
	panelEyebrow: string;
	panelTitle: string;
	panelBody: string;
	featuredEyebrow: string;
	featuredHeading: string;
	featuredTitle: string;
	featuredBody: string;
	featuredCta: string;
	harnessEyebrow: string;
	harnessTitle: string;
	harnessBody: string;
	harnessCta: string;
	cards: [HomeCardCopy, HomeCardCopy];
	threadsEyebrow: string;
	threadsTitle: string;
	threads: string[];
	lanesLabel: string;
	stackTitle: string;
	stackCta: string;
	stackLabel: string;
	signal: string;
	stats: HomeStatCopy[];
	lanes: HomeLaneCopy[];
	stack: string[];
	marquee: string[];
};

export type AboutSectionCopy = {
	title: string;
	paragraphs: string[];
};

export type AboutLinkCopy = {
	label: string;
	href: string;
};

export type AboutStatCopy = {
	label: string;
	value: string;
	detail: string;
};

export type AboutCapabilityCopy = {
	eyebrow: string;
	title: string;
	body: string;
	items: string[];
};

export type AboutTimelineCopy = {
	period: string;
	title: string;
	body: string;
};

export type AboutBrandCopy = {
	name: string;
	detail: string;
	logo?: string;
	mark?: string;
};

export type AboutExperienceGroupCopy = {
	eyebrow: string;
	title: string;
	items: AboutBrandCopy[];
};

export type AboutTechStackCopy = {
	eyebrow: string;
	title: string;
	items: AboutBrandCopy[];
};

export type AboutProjectCopy = {
	name: string;
	detail: string;
	mark: string;
	tags: string[];
};

export type AboutProjectGroupCopy = {
	eyebrow: string;
	title: string;
	items: AboutProjectCopy[];
};

export type AboutCopy = {
	eyebrow: string;
	title: string;
	role: string;
	location: string;
	lead: string;
	intro: string[];
	proofEyebrow: string;
	proofTitle: string;
	proofHeading: string;
	proofLead: string;
	featuredLabel: string;
	impactLabel: string;
	impactItems: AboutBrandCopy[];
	trustedLabel: string;
	liveStatus: string;
	liveStageLabel: string;
	liveErrorLabel: string;
	links: AboutLinkCopy[];
	experienceGroups: AboutExperienceGroupCopy[];
	projectGroup: AboutProjectGroupCopy;
	techStack: AboutTechStackCopy;
	stats: AboutStatCopy[];
	capabilities: AboutCapabilityCopy[];
	sections: AboutSectionCopy[];
	focus: string[];
	timeline: AboutTimelineCopy[];
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
		githubLabel: string;
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
		browseByLanguage: string;
	};
	article: {
		updatedAt: string;
		backToBlog: string;
		prevPost: string;
		nextPost: string;
		onThisPage: string;
		readingProgress: string;
	};
	home: HomeCopy;
	about: AboutCopy;
};

const messages: Record<Locale, LocaleMessages> = {
	zh: {
		site: {
			title: 'Learn- Agent',
			description: '记录 AI 学习、Agent 实践与工作流方法论的中文笔记站。',
			tagline: 'AI 学习 / Agent 实践 / 工作流笔记',
		},
		meta: {
			homeTitle: 'learn-agent',
			aboutTitle: '关于 Lien Jack',
			aboutDescription:
				'Lien Jack 的个人介绍：东京的全栈工程师与 Agent Builder，关注产品系统、AI 原生工作流和工程体验。',
			blogTitle: '文章',
			blogDescription:
				'这里收纳关于 AI 学习、Agent 实践与工作流方法论的中文记录。内容以可回看、可复用为先，不急着把每件事都写成结论。',
		},
		header: {
			ariaLabel: '主导航',
			home: '首页',
			blog: '文章',
			about: '关于我',
			rss: 'RSS',
			githubLabel: '在 GitHub 上查看 learn-agent',
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
			browseByLanguage: '按语言查看文章',
		},
		article: {
			updatedAt: '更新于',
			backToBlog: '返回文章列表',
			prevPost: '上一篇文章',
			nextPost: '下一篇文章',
			onThisPage: '本页目录',
			readingProgress: '阅读进度',
		},
		home: {
			eyebrow: 'Agent Learning System',
			lead: '学习 Agent、Claude Code 和全栈工程的前沿技术站。',
			note: '这里不只写概念，而是把 Claude Code 的运行时、Agent Harness、工具调用、SQL、Redis 与全栈工程拆成可复用的学习路径。',
			primaryCta: '进入学习路线',
			secondaryCta: '查看推荐系列',
			actionsLabel: '首页操作',
			routesLabel: '核心学习路线',
			heroImageAlt: '手绘宇航员站在星球上的太空学习场景',
			panelEyebrow: '阅读入口',
			panelTitle: '先从 Claude Code 源码解析读起',
			panelBody:
				'这组文章最能代表这个站的写法：不只讲工具体验，而是把一个编程 Agent 如何组织上下文、调用工具、管理权限和拆分任务讲清楚。',
			featuredEyebrow: '推荐阅读',
			featuredHeading: '先读这两条主路线',
			featuredTitle: 'Claude Code 源码解析',
			featuredBody:
				'从工程架构、上下文、工具系统、MCP、Skill 到多 Agent 协作，顺着一个编程 Agent 的运行时主线读下去。',
			featuredCta: '进入系列',
			harnessEyebrow: '系统路线',
			harnessTitle: 'Build Harness',
			harnessBody:
				'从 Agent 的受控执行、权限边界、会话恢复、观测日志到验证标准，理解模型外面的工程控制系统。',
			harnessCta: '进入 Harness',
			cards: [
				{
					eyebrow: '第一段',
					title: '主循环与上下文',
					body: '从 ReAct、Prompt 编写和 Context 管理开始，先理解模型每一轮到底看见了什么、为什么能连续推进任务。',
				},
				{
					eyebrow: '第二段',
					title: '工具、扩展与协作',
					body: '再看文件工具、终端工具、MCP、Skill 和多 Agent 协作，理解 Claude Code 怎么从聊天变成运行时。',
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
			lanesLabel: '学习方向',
			stackTitle: '我们围绕这些技术构建与验证',
			stackCta: '查看全部资源',
			stackLabel: '技术栈',
			signal: 'AI Agent / Claude Code / SQL / Redis / Full Stack',
			stats: [
				{
					label: '核心路线',
					value: 'Agent',
					detail: '从提示词到受控执行系统',
				},
				{
					label: '前沿入口',
					value: 'Claude Code',
					detail: '源码、工具、MCP、Skill 与协作',
				},
				{
					label: '工程底盘',
					value: 'Full Stack',
					detail: 'SQL、Redis、服务架构与前端体验',
				},
			],
			lanes: [
				{
					eyebrow: 'AI Native',
					title: 'Agent 不是聊天框，是工程运行时',
					body: '从 ReAct、上下文治理、工具调用、权限边界、会话恢复到多 Agent 协作，理解一个能干活的系统如何被设计出来。',
					items: ['Agent Harness', 'Tool Runtime', 'MCP / Skill', 'Claude Code'],
				},
				{
					eyebrow: 'Full Stack Core',
					title: '把数据库、缓存和服务边界学扎实',
					body: 'SQL、Redis、API、任务队列和前端状态都不是孤立知识点，而是一条从数据到体验的完整链路。',
					items: ['SQL Modeling', 'Redis Cache', 'API Design', 'Frontend Systems'],
				},
				{
					eyebrow: 'Product Craft',
					title: '让技术最后长成能被使用的产品',
					body: '用界面结构、交互动效和长期写作，把复杂技术讲成可学习、可复盘、可迁移的方法。',
					items: ['UX Flow', 'Three.js', 'Framer Motion', 'Technical Writing'],
				},
			],
			stack: ['Agent', 'Claude Code', 'MCP', 'Skill', 'SQL', 'Redis', 'React', 'Astro', 'Three.js'],
			marquee: ['Claude Code 源码解析', 'Agent Harness', 'SQL 数据建模', 'Redis 缓存策略', '全栈工程实践'],
		},
		about: {
			eyebrow: '关于 Lien Jack',
				title: 'Lien Jack',
				role: '全栈工程师 / Agent Builder',
				location: '东京 · 远程',
				lead: '一名用全栈能力和 Agent 实践经验服务真实产品与工程工作流的工程师。',
				intro: [
					'我在东京做全栈工程和 Agent 工作流，曾在 NetEase、ByteDance、Ethereum Community Fund 工作，也参与过 Lark、CapCut、Ulike 等面向真实用户的产品。',
				],
				proofEyebrow: '经验证明',
				proofTitle: '经验索引',
				proofHeading: 'Experience OS / 经验索引',
				proofLead: '从产品系统到 AI 原生工作流。',
				featuredLabel: '精选',
				impactLabel: '交付能力',
				impactItems: [
					{
						name: '前端工程',
						detail: '产品 UI / 体验打磨',
						logo: '/brand-icons/capability-frontend.svg',
						mark: 'FE',
					},
					{
						name: '全栈交付',
						detail: '服务边界 / 数据链路',
						logo: '/brand-icons/capability-fullstack.svg',
						mark: 'FS',
					},
					{
						name: 'Agent 工作流',
						detail: '工具链 / 执行闭环',
						logo: '/brand-icons/capability-agent.svg',
						mark: 'AG',
					},
				],
				trustedLabel: '产品信任',
				liveStatus: 'Live2D 在线',
				liveStageLabel: 'Hiyori Momose Live2D 舞台。',
				liveErrorLabel: 'Hiyori Momose Live2D 加载失败。',
				links: [
				{
					label: '阅读文章',
					href: '/blog',
				},
				{
					label: 'GitHub',
					href: 'https://github.com/LienJack',
				},
				{
					label: '个人博客',
					href: 'https://blog.lienjack.com',
				},
			],
			experienceGroups: [
				{
					eyebrow: '公司经历',
					title: '过去所在公司',
					items: [
						{
							name: 'NetEase',
							detail: '前端',
							logo: 'https://www.google.com/s2/favicons?domain=163.com&sz=128',
							mark: 'NE',
						},
						{
							name: 'ByteDance',
							detail: '全栈',
							logo: 'https://cdn.simpleicons.org/bytedance/3C8CFF',
							mark: 'BD',
						},
						{
							name: 'Ethereum Community Fund',
							detail: 'Web3 + 全栈 + Agent',
							logo: 'https://cdn.simpleicons.org/ethereum/1b365d',
							mark: 'ECF',
						},
					],
				},
				{
					eyebrow: '产品经历',
					title: '参与过的产品',
					items: [
						{
							name: 'Lark',
							detail: '协作产品 / 工作流',
							logo: 'https://www.google.com/s2/favicons?domain=larksuite.com&sz=128',
							mark: 'LK',
						},
						{
							name: 'CapCut',
							detail: '创作工具 / 消费级体验',
							logo: 'https://www.google.com/s2/favicons?domain=capcut.com&sz=128',
							mark: 'CC',
						},
						{
								name: 'Ulike',
								detail: '增长产品 / 商业化体验',
								logo: '/brand-icons/ulike-icon.jpg',
								mark: 'UL',
							},
					],
				},
			],
			projectGroup: {
				eyebrow: '项目经历',
				title: '项目经验',
				items: [
					{
						name: 'Lark / CapCut',
						detail: '协作与创作产品中的前端工程、体验打磨和业务模块交付。',
						mark: 'LC',
						tags: ['Product UI', 'Workflow', 'Creator Tools'],
					},
					{
						name: '前端微服务',
						detail: '大量业务模块拆分、独立部署、跨团队协作和工程治理经验。',
						mark: 'MF',
						tags: ['Micro Frontend', 'Delivery'],
					},
					{
						name: '云应用',
						detail: '围绕云端工作台、在线协作和服务化能力建设产品入口。',
						mark: 'CL',
						tags: ['Cloud App', 'SaaS'],
					},
					{
						name: 'Text2SQL',
						detail: '把自然语言、数据模型和查询结果组织成可解释的分析流程。',
						mark: 'SQL',
						tags: ['AI Product', 'Data UX'],
					},
					{
						name: 'Harness',
						detail: 'Agent 工具链、上下文、权限、任务执行和可恢复工作流的工程经验。',
						mark: 'HX',
						tags: ['Agent Runtime', 'Control Plane'],
					},
					{
						name: '音视频处理',
						detail: '前端侧媒体处理、编辑链路、预览交互和性能优化。',
						mark: 'AV',
						tags: ['Media Pipeline', 'Editor'],
					},
					{
						name: '无限画布',
						detail: '面向复杂对象编辑、拖拽缩放、空间组织和高密度交互的画布系统。',
						mark: 'CNV',
						tags: ['Canvas', 'Interaction'],
					},
				],
			},
			techStack: {
				eyebrow: '技术栈',
				title: '常用技术栈',
				items: [
					{ name: 'TS', detail: 'TypeScript', logo: 'https://cdn.simpleicons.org/typescript/1b365d', mark: 'TS' },
					{ name: 'Go', detail: 'Backend services', logo: 'https://cdn.simpleicons.org/go/1b365d', mark: 'GO' },
					{ name: 'Node.js', detail: 'Service runtime', logo: 'https://cdn.simpleicons.org/nodedotjs/1b365d', mark: 'ND' },
					{ name: 'React', detail: 'Product UI', logo: 'https://cdn.simpleicons.org/react/1b365d', mark: 'R' },
					{ name: 'Next', detail: 'React framework', logo: 'https://cdn.simpleicons.org/nextdotjs/1b365d', mark: 'NX' },
					{ name: 'Nest', detail: 'Node framework', logo: 'https://cdn.simpleicons.org/nestjs/1b365d', mark: 'NS' },
					{ name: 'PostgreSQL', detail: 'Relational data', logo: 'https://cdn.simpleicons.org/postgresql/1b365d', mark: 'PG' },
					{ name: 'Redis', detail: 'Cache / queues', logo: 'https://cdn.simpleicons.org/redis/1b365d', mark: 'RD' },
					{ name: 'Docker', detail: 'Delivery runtime', logo: 'https://cdn.simpleicons.org/docker/1b365d', mark: 'DK' },
					{ name: 'K8s', detail: 'Kubernetes ops', logo: 'https://cdn.simpleicons.org/kubernetes/1b365d', mark: 'K8' },
				],
			},
			stats: [
				{
					label: 'Current base',
					value: 'Tokyo',
					detail: '远程协作，面向全球产品节奏',
				},
				{
					label: 'Core lane',
					value: 'Agent',
					detail: '工作流、工具调用、AI 原生开发模式',
				},
				{
					label: 'Product range',
					value: 'Full stack',
					detail: '从界面动线到服务架构一起收拢',
				},
			],
			capabilities: [
				{
					eyebrow: 'Frontend Craft',
					title: '把界面做得顺手，也做得有记忆点',
					body: '关注产品 UI、交互动效、设计系统和可维护组件，让界面不是静态截图，而是能陪用户完成动作的工具。',
					items: ['Product UI', 'Design Systems', 'Interaction Rhythm'],
				},
				{
					eyebrow: 'Backend Logic',
					title: '让想法背后有清晰、耐久的运行结构',
					body: '设计 API 层、服务边界和 Agent workflow，把快速迭代和长期稳定放到同一个架构里考虑。',
					items: ['API Design', 'Automation', 'Service Architecture'],
				},
				{
					eyebrow: 'Data & Infra',
					title: '给产品留下能扩展、能恢复的底座',
					body: '处理存储、缓存、容器和工程基础设施，让系统在增长和变更里保持可解释。',
					items: ['Storage', 'Caching', 'Containers'],
				},
			],
			sections: [
				{
					title: '我看重的产品状态',
					paragraphs: [
						'顺滑、稳定、细节有记忆点。一个系统最好既能快速试错，也能在需求变多之后继续保持清楚的边界。',
					],
				},
				{
					title: '我喜欢的工作方式',
					paragraphs: [
						'先把问题拆成能验证的路径，再把体验、工程和自动化串起来。遇到复杂系统时，我会优先寻找能让团队少猜、少重复、少返工的结构。',
					],
				},
				{
					title: '为什么持续写作',
					paragraphs: [
						'AI 和 Agent 的理解很容易散在聊天记录和一次性实验里。写下来，是为了把判断保留下来，也让下一次实现更快抵达关键处。',
					],
				},
			],
			focus: [
				'设计可落地的 Agent workflow 和开发者工具',
				'把产品体验和工程基础放在同一张图里打磨',
				'构建稳定、可扩展的前后端系统',
				'沉淀真实可复用的 AI-native 开发模式',
			],
			timeline: [
				{
					period: 'Former',
					title: 'NetEase / ByteDance / Ethereum Community Fund',
					body: '在高速产品和工程环境里积累面向真实用户的系统交付经验。',
				},
				{
					period: 'Shipped around',
					title: 'Lark / CapCut / Ulike',
					body: '参与协作、创作和消费级产品相关工程，把体验与可靠性一起推进。',
				},
				{
					period: 'Now',
					title: 'Agent Builder in Tokyo',
					body: '聚焦 Agent 工具链、AI 原生工作流和能被团队长期使用的产品系统。',
				},
			],
			closing: [
				'如果你也在把 AI、Agent 和产品工程往真实世界里推，这里会持续记录那些能复用的判断、实现细节和方法。',
			],
		},
	},
	en: {
		site: {
			title: 'learn-agent',
			description: 'A notebook on AI learning, agent practice, and workflow thinking.',
			tagline: 'AI learning / agent practice / workflow notes',
		},
		meta: {
			homeTitle: 'learn-agent',
			aboutTitle: 'About Lien Jack',
			aboutDescription:
				'About Lien Jack, a Tokyo-based full stack engineer and agent builder focused on product systems and AI-native workflows.',
			blogTitle: 'Articles',
			blogDescription:
				'The archive focuses on AI learning, agent practice, and workflow thinking with reusable notes rather than polished hot takes.',
		},
		header: {
			ariaLabel: 'Primary navigation',
			home: 'Home',
			blog: 'Articles',
			about: 'About',
			rss: 'RSS',
			githubLabel: 'View learn-agent on GitHub',
			languageSwitcherLabel: 'Switch language',
		},
		footer: {
			description: 'A notebook on AI learning, agent practice, and workflow thinking.',
			blog: 'Articles',
			about: 'About',
			rss: 'RSS',
			copyrightLabel: 'A long-form notebook, not a launch log.',
		},
		blog: {
			eyebrow: 'Archive',
			title: 'Articles',
			lead: 'This archive collects the articles published for learn-agent. It focuses on AI learning, agent practice, and workflow thinking in a reusable long-form format.',
			browseByLanguage: 'Browse the archive by language',
		},
		article: {
			updatedAt: 'Updated',
			backToBlog: 'Back to archive',
			prevPost: 'Previous article',
			nextPost: 'Next article',
			onThisPage: 'On this page',
			readingProgress: 'Reading progress',
		},
		home: {
			eyebrow: 'Agent Learning System',
			lead: 'A learning site for agent systems, Claude Code, and full stack engineering.',
			note: 'The archive turns Claude Code runtime, agent harnesses, tool use, SQL, Redis, and product engineering into reusable learning paths.',
			primaryCta: 'Start learning',
			secondaryCta: 'Open the series',
			actionsLabel: 'Home actions',
			routesLabel: 'Core learning routes',
			heroImageAlt: 'Hand-drawn astronaut on a small planet in a space learning scene',
			panelEyebrow: 'Reading entry',
			panelTitle: 'Start with the Claude Code source series',
			panelBody:
				'This series best represents the site: it looks past tool impressions and follows how a coding agent organizes context, invokes tools, handles permissions, and breaks down work.',
			featuredEyebrow: 'Recommended',
			featuredHeading: 'Start with these two routes',
			featuredTitle: 'Claude Code source reading',
			featuredBody:
				'Start with the series that follows Claude Code through architecture, context, tools, MCP, skills, and multi-agent collaboration.',
			featuredCta: 'Open the series',
			harnessEyebrow: 'System route',
			harnessTitle: 'Build Harness',
			harnessBody:
				'Learn the control system around agents: execution, permissions, session recovery, observation logs, and verification criteria.',
			harnessCta: 'Open Harness',
			cards: [
				{
					eyebrow: 'Part one',
					title: 'Loop and context',
					body: 'Begin with ReAct, prompt assembly, and context management to see what the model receives each turn and how long tasks keep moving.',
				},
				{
					eyebrow: 'Part two',
					title: 'Tools and collaboration',
					body: 'Then read through file tools, terminal tools, MCP, skills, and multi-agent coordination to see how the runtime does real engineering work.',
				},
			],
			threadsEyebrow: 'Next Threads',
			threadsTitle: 'What this notebook keeps building toward',
			threads: [
				'Turn scattered prompts, experiments, and notes into reusable article series',
				'Document concrete agent workflow cases instead of stopping at definitions',
				'Keep refining the site language, typography, and components until the whole place feels intentional',
				'Build a steady long-form writing rhythm around technical thinking',
			],
			lanesLabel: 'Learning lanes',
			stackTitle: 'Built and verified around this stack',
			stackCta: 'View all resources',
			stackLabel: 'Technology stack',
			signal: 'AI Agent / Claude Code / SQL / Redis / Full Stack',
			stats: [
				{
					label: 'Core route',
					value: 'Agent',
					detail: 'From prompt loops to controlled execution',
				},
				{
					label: 'Frontier entry',
					value: 'Claude Code',
					detail: 'Source, tools, MCP, skills, collaboration',
				},
				{
					label: 'Engineering base',
					value: 'Full Stack',
					detail: 'SQL, Redis, services, and interfaces',
				},
			],
			lanes: [
				{
					eyebrow: 'AI Native',
					title: 'An agent is a runtime, not just a chat box',
					body: 'Follow ReAct, context governance, tool calls, permission boundaries, session recovery, and multi-agent collaboration.',
					items: ['Agent Harness', 'Tool Runtime', 'MCP / Skill', 'Claude Code'],
				},
				{
					eyebrow: 'Full Stack Core',
					title: 'Learn the database, cache, and service base',
					body: 'SQL, Redis, APIs, queues, and frontend state become one path from data to user experience.',
					items: ['SQL Modeling', 'Redis Cache', 'API Design', 'Frontend Systems'],
				},
				{
					eyebrow: 'Product Craft',
					title: 'Turn hard technology into usable product work',
					body: 'Interface structure, motion, and long-form writing make complex engineering learnable and reusable.',
					items: ['UX Flow', 'Three.js', 'Framer Motion', 'Technical Writing'],
				},
			],
			stack: ['Agent', 'Claude Code', 'MCP', 'Skill', 'SQL', 'Redis', 'React', 'Astro', 'Three.js'],
			marquee: ['Claude Code source reading', 'Agent Harness', 'SQL modeling', 'Redis strategy', 'Full stack practice'],
		},
		about: {
			eyebrow: 'About Lien Jack',
			title: 'Lien Jack',
			role: 'Full Stack Engineer / Agent Builder',
			location: 'Tokyo · Remote',
				lead: 'An engineer brand for turning agent workflows, product systems, and interface rhythm into shippable experiences.',
					intro: [
						'I am a Tokyo-based full stack engineer and agent builder. I previously worked at NetEase, ByteDance, and Ethereum Community Fund, with product engineering experience across Lark, CapCut, and Ulike.',
				],
				proofEyebrow: 'Experience Proof',
				proofTitle: 'Experience index',
				proofHeading: 'Experience OS / Experience index',
				proofLead: 'From product systems to AI-native workflow.',
				featuredLabel: 'Featured',
				impactLabel: 'Delivery Capabilities',
				impactItems: [
					{
						name: 'Frontend Engineering',
						detail: 'Product UI / interaction polish',
						logo: '/brand-icons/capability-frontend.svg',
						mark: 'FE',
					},
					{
						name: 'Full Stack Delivery',
						detail: 'Service boundaries / data flow',
						logo: '/brand-icons/capability-fullstack.svg',
						mark: 'FS',
					},
					{
						name: 'Agent Workflow',
						detail: 'Toolchain / execution loop',
						logo: '/brand-icons/capability-agent.svg',
						mark: 'AG',
					},
				],
				trustedLabel: 'Trusted in Products',
				liveStatus: 'Live2D Online',
				liveStageLabel: 'Hiyori Momose Live2D stage.',
				liveErrorLabel: 'Hiyori Momose Live2D failed to load.',
				links: [
					{
						label: 'Read articles',
						href: '/en/blog',
				},
				{
					label: 'GitHub',
					href: 'https://github.com/LienJack',
				},
				{
					label: 'Personal blog',
						href: 'https://blog.lienjack.com',
					},
				],
				experienceGroups: [
					{
						eyebrow: 'Company Experience',
						title: 'Former companies',
						items: [
							{
								name: 'NetEase',
								detail: 'Frontend',
								logo: 'https://www.google.com/s2/favicons?domain=163.com&sz=128',
								mark: 'NE',
							},
							{
								name: 'ByteDance',
								detail: 'Full stack',
								logo: 'https://cdn.simpleicons.org/bytedance/3C8CFF',
								mark: 'BD',
							},
							{
								name: 'Ethereum Community Fund',
								detail: 'Web3 + full stack + agent',
								logo: 'https://cdn.simpleicons.org/ethereum/1b365d',
								mark: 'ECF',
							},
						],
					},
					{
						eyebrow: 'Product Experience',
						title: 'Products shipped around',
						items: [
							{
								name: 'Lark',
								detail: 'Collaboration / workflow',
								logo: 'https://www.google.com/s2/favicons?domain=larksuite.com&sz=128',
								mark: 'LK',
							},
							{
								name: 'CapCut',
								detail: 'Creator tools / consumer UX',
								logo: 'https://www.google.com/s2/favicons?domain=capcut.com&sz=128',
								mark: 'CC',
							},
							{
									name: 'Ulike',
									detail: 'Growth product / commerce UX',
									logo: '/brand-icons/ulike-icon.jpg',
									mark: 'UL',
								},
						],
					},
				],
				projectGroup: {
					eyebrow: 'Project Experience',
					title: 'Project range',
					items: [
						{
							name: 'Lark / CapCut',
							detail: 'Frontend engineering, interaction polish, and business-module delivery across collaboration and creator products.',
							mark: 'LC',
							tags: ['Product UI', 'Workflow', 'Creator Tools'],
						},
						{
						name: 'Micro-frontends',
						detail: 'Domain modules, independent delivery, cross-team contracts, and frontend engineering governance.',
						mark: 'MF',
						tags: ['Micro Frontend', 'Delivery'],
					},
					{
						name: 'Cloud applications',
						detail: 'Cloud workspaces, online collaboration surfaces, and service-oriented product entries.',
						mark: 'CL',
						tags: ['Cloud App', 'SaaS'],
					},
					{
						name: 'Text2SQL',
						detail: 'Natural-language querying shaped into explainable data-model and result workflows.',
						mark: 'SQL',
						tags: ['AI Product', 'Data UX'],
					},
					{
						name: 'Harness',
						detail: 'Agent toolchains, context, permissions, task execution, and recoverable workflow runtime.',
						mark: 'HX',
						tags: ['Agent Runtime', 'Control Plane'],
					},
					{
						name: 'Media processing',
						detail: 'Frontend media handling, editing flows, previews, and performance-sensitive interactions.',
						mark: 'AV',
						tags: ['Media Pipeline', 'Editor'],
					},
					{
						name: 'Infinite canvas',
						detail: 'Canvas systems for complex object editing, pan/zoom, spatial organization, and dense interactions.',
						mark: 'CNV',
						tags: ['Canvas', 'Interaction'],
					},
					],
				},
				techStack: {
					eyebrow: 'Technical Stack',
					title: 'Daily stack',
					items: [
						{ name: 'TS', detail: 'TypeScript', logo: 'https://cdn.simpleicons.org/typescript/1b365d', mark: 'TS' },
						{ name: 'Go', detail: 'Backend services', logo: 'https://cdn.simpleicons.org/go/1b365d', mark: 'GO' },
						{ name: 'Node.js', detail: 'Service runtime', logo: 'https://cdn.simpleicons.org/nodedotjs/1b365d', mark: 'ND' },
						{ name: 'React', detail: 'Product UI', logo: 'https://cdn.simpleicons.org/react/1b365d', mark: 'R' },
						{ name: 'Next', detail: 'React framework', logo: 'https://cdn.simpleicons.org/nextdotjs/1b365d', mark: 'NX' },
						{ name: 'Nest', detail: 'Node framework', logo: 'https://cdn.simpleicons.org/nestjs/1b365d', mark: 'NS' },
						{ name: 'PostgreSQL', detail: 'Relational data', logo: 'https://cdn.simpleicons.org/postgresql/1b365d', mark: 'PG' },
						{ name: 'Redis', detail: 'Cache / queues', logo: 'https://cdn.simpleicons.org/redis/1b365d', mark: 'RD' },
						{ name: 'Docker', detail: 'Delivery runtime', logo: 'https://cdn.simpleicons.org/docker/1b365d', mark: 'DK' },
						{ name: 'K8s', detail: 'Kubernetes ops', logo: 'https://cdn.simpleicons.org/kubernetes/1b365d', mark: 'K8' },
					],
				},
				stats: [
					{
						label: 'Current base',
					value: 'Tokyo',
					detail: 'Remote collaboration, global product cadence',
				},
				{
					label: 'Core lane',
					value: 'Agent',
					detail: 'Workflows, tool calls, AI-native development',
				},
				{
					label: 'Product range',
					value: 'Full stack',
					detail: 'Interface flow through service architecture',
				},
			],
			capabilities: [
				{
					eyebrow: 'Frontend Craft',
					title: 'Interfaces that feel smooth and stay memorable',
					body: 'Product UI, interaction rhythm, design systems, and maintainable components built as tools for real user action.',
					items: ['Product UI', 'Design Systems', 'Interaction Rhythm'],
				},
				{
					eyebrow: 'Backend Logic',
					title: 'Clear runtime structure behind fast product ideas',
					body: 'API layers, service boundaries, and agent workflows that keep fast iteration and long-term stability in the same frame.',
					items: ['API Design', 'Automation', 'Service Architecture'],
				},
				{
					eyebrow: 'Data & Infra',
					title: 'A durable base for growth, recovery, and change',
					body: 'Storage, caching, containers, and engineering foundations that keep systems legible as they expand.',
					items: ['Storage', 'Caching', 'Containers'],
				},
			],
			sections: [
				{
					title: 'The product state I care about',
					paragraphs: [
						'Smooth to use, stable to maintain, and memorable in the details. A good system should move quickly without losing its boundaries as requirements grow.',
					],
				},
				{
					title: 'How I prefer to work',
					paragraphs: [
						'I break problems into paths that can be verified, then connect experience, engineering, and automation. In complex systems, I look for structures that reduce guessing, repetition, and rework.',
					],
				},
				{
					title: 'Why the writing continues',
					paragraphs: [
						'AI and agent knowledge often gets trapped in chat logs and one-off experiments. Writing keeps the judgment visible and makes the next implementation faster to aim.',
					],
				},
			],
			focus: [
				'Design practical agent workflows and developer tooling',
				'Craft product experiences with strong engineering foundations',
				'Build stable, extensible frontend and backend systems',
				'Document reusable AI-native development patterns',
			],
			timeline: [
				{
					period: 'Former',
					title: 'NetEase / ByteDance / Ethereum Community Fund',
					body: 'Product and engineering work inside fast-moving environments with real user pressure.',
				},
				{
					period: 'Shipped around',
					title: 'Lark / CapCut / Ulike',
					body: 'Collaboration, creation, and consumer product surfaces where experience and reliability both matter.',
				},
				{
					period: 'Now',
					title: 'Agent Builder in Tokyo',
					body: 'Agent toolchains, AI-native workflows, and product systems teams can keep using.',
				},
			],
			closing: [
				'If you are also pushing AI, agents, and product engineering into real use, this site will keep collecting the judgments, implementation details, and methods worth reusing.',
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
			aboutTitle: 'Lien Jack について',
			aboutDescription:
				'東京を拠点にする Full Stack Engineer / Agent Builder、Lien Jack の紹介ページです。',
			blogTitle: '記事',
			blogDescription:
				'AI 学習、Agent 実践、ワークフロー設計を長く参照できる形で残すための記事アーカイブです。',
		},
		header: {
			ariaLabel: 'サイトナビゲーション',
			home: 'トップ',
			blog: '記事',
			about: '紹介',
			rss: 'RSS',
			githubLabel: 'GitHub で learn-agent を見る',
			languageSwitcherLabel: '言語切替',
		},
		footer: {
			description: 'AI 学習、Agent 実践、ワークフロー設計を記録するための日本語入口です。',
			blog: '記事',
			about: '紹介',
			rss: 'RSS',
			copyrightLabel: '途中の判断も残すためのノートサイトです。',
		},
		blog: {
			eyebrow: 'Archive',
			title: '記事',
			lead: 'このアーカイブには learn-agent の記事をまとめています。AI 学習、Agent 実践、ワークフロー設計をあとから再利用できる形で残すための記録です。',
			browseByLanguage: '言語別に記事を見る',
		},
		article: {
			updatedAt: '更新',
			backToBlog: 'アーカイブへ戻る',
			prevPost: '前の記事',
			nextPost: '次の記事',
			onThisPage: 'このページ',
			readingProgress: '読書進捗',
		},
		home: {
			eyebrow: 'Agent Learning System',
			lead: 'Agent、Claude Code、Full Stack Engineering を学ぶための入口です。',
			note: 'Claude Code runtime、Agent Harness、tool use、SQL、Redis、product engineering を再利用できる学習経路として整理します。',
			primaryCta: '学習を始める',
			secondaryCta: 'シリーズを見る',
			actionsLabel: 'トップページの操作',
			routesLabel: '主要な学習ルート',
			heroImageAlt: '小さな惑星に立つ宇宙飛行士の手描き学習シーン',
			panelEyebrow: 'Reading entry',
			panelTitle: 'Claude Code ソース解析から読む',
			panelBody:
				'このシリーズは、ツールの印象ではなく、Coding Agent がコンテキスト、ツール、権限、タスク分解をどう扱うかを追う入口です。',
			featuredEyebrow: 'おすすめ',
			featuredHeading: 'まず読む二つのルート',
			featuredTitle: 'Claude Code ソース解析',
			featuredBody:
				'Claude Code のアーキテクチャ、コンテキスト、ツール、MCP、Skill、Agent 協作を順に追います。',
			featuredCta: 'シリーズを開く',
			harnessEyebrow: 'System route',
			harnessTitle: 'Build Harness',
			harnessBody:
				'Agent の controlled execution、permission boundary、session recovery、observation log、verification criteria を学びます。',
			harnessCta: 'Harness を開く',
			cards: [
				{
					eyebrow: 'Part one',
					title: 'ループとコンテキスト',
					body: 'ReAct、Prompt 編成、Context 管理から読み、モデルが各ターンで何を見て長い作業を進めるのかを掴みます。',
				},
				{
					eyebrow: 'Part two',
					title: 'ツールと協作',
					body: 'ファイル操作、ターミナル、MCP、Skill、multi-agent 協作へ進み、実行環境としての設計を見ます。',
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
			lanesLabel: '学習レーン',
			stackTitle: 'この技術群を軸に構築し検証する',
			stackCta: 'すべてのリソースを見る',
			stackLabel: '技術スタック',
			signal: 'AI Agent / Claude Code / SQL / Redis / Full Stack',
			stats: [
				{
					label: 'Core route',
					value: 'Agent',
					detail: 'Prompt loop から controlled execution へ',
				},
				{
					label: 'Frontier entry',
					value: 'Claude Code',
					detail: 'Source、tools、MCP、skills、collaboration',
				},
				{
					label: 'Engineering base',
					value: 'Full Stack',
					detail: 'SQL、Redis、service、interface',
				},
			],
			lanes: [
				{
					eyebrow: 'AI Native',
					title: 'Agent は chat box ではなく runtime',
					body: 'ReAct、context governance、tool calls、permission boundary、session recovery、multi-agent collaboration を追います。',
					items: ['Agent Harness', 'Tool Runtime', 'MCP / Skill', 'Claude Code'],
				},
				{
					eyebrow: 'Full Stack Core',
					title: 'Database、cache、service boundary を固める',
					body: 'SQL、Redis、API、queue、frontend state を、data から experience までの一本の経路として学びます。',
					items: ['SQL Modeling', 'Redis Cache', 'API Design', 'Frontend Systems'],
				},
				{
					eyebrow: 'Product Craft',
					title: '技術を使える product work にする',
					body: 'Interface structure、motion、long-form writing によって、複雑な技術を学びやすく再利用しやすい形へ変えます。',
					items: ['UX Flow', 'Three.js', 'Framer Motion', 'Technical Writing'],
				},
			],
			stack: ['Agent', 'Claude Code', 'MCP', 'Skill', 'SQL', 'Redis', 'React', 'Astro', 'Three.js'],
			marquee: ['Claude Code source reading', 'Agent Harness', 'SQL modeling', 'Redis strategy', 'Full stack practice'],
		},
		about: {
			eyebrow: 'Lien Jack について',
			title: 'Lien Jack',
			role: 'フルスタックエンジニア / Agent Builder',
			location: '東京 · リモート',
				lead: 'Agent workflow、product system、interface rhythm を、使える体験へ変える engineer brand。',
					intro: [
						'東京を拠点にする Full Stack Engineer / Agent Builder です。NetEase、ByteDance、Ethereum Community Fund を経て、Lark、CapCut、Ulike などのプロダクト領域に関わってきました。',
				],
				proofEyebrow: '経験の証明',
				proofTitle: '経験インデックス',
				proofHeading: 'Experience OS / 経験インデックス',
				proofLead: 'プロダクトシステムから AI-native workflow まで。',
				featuredLabel: '注目',
					impactLabel: '納品できる領域',
					impactItems: [
						{
							name: 'Frontend engineering',
							detail: 'Product UI / interaction polish',
							logo: '/brand-icons/capability-frontend.svg',
							mark: 'FE',
						},
						{
							name: 'Full stack delivery',
							detail: 'Service boundary / data flow',
							logo: '/brand-icons/capability-fullstack.svg',
							mark: 'FS',
						},
						{
							name: 'Agent workflow',
							detail: 'Toolchain / execution loop',
							logo: '/brand-icons/capability-agent.svg',
							mark: 'AG',
						},
					],
					trustedLabel: '関わったプロダクト',
				liveStatus: 'Live2D オンライン',
				liveStageLabel: 'Hiyori Momose Live2D ステージ。',
				liveErrorLabel: 'Hiyori Momose Live2D の読み込みに失敗しました。',
				links: [
					{
						label: '記事を読む',
						href: '/ja/blog',
				},
				{
					label: 'GitHub',
					href: 'https://github.com/LienJack',
				},
					{
						label: '個人ブログ',
						href: 'https://blog.lienjack.com',
					},
				],
				experienceGroups: [
					{
						eyebrow: '企業経験',
						title: '過去の所属企業',
						items: [
							{
								name: 'NetEase',
								detail: 'フロントエンド',
								logo: 'https://www.google.com/s2/favicons?domain=163.com&sz=128',
								mark: 'NE',
							},
							{
								name: 'ByteDance',
								detail: 'フルスタック',
								logo: 'https://cdn.simpleicons.org/bytedance/3C8CFF',
								mark: 'BD',
							},
							{
								name: 'Ethereum Community Fund',
								detail: 'Web3 + フルスタック + Agent',
								logo: 'https://cdn.simpleicons.org/ethereum/1b365d',
								mark: 'ECF',
							},
						],
					},
					{
						eyebrow: 'プロダクト経験',
						title: '関わったプロダクト',
						items: [
							{
								name: 'Lark',
								detail: '協作プロダクト / workflow',
								logo: 'https://www.google.com/s2/favicons?domain=larksuite.com&sz=128',
								mark: 'LK',
							},
							{
								name: 'CapCut',
								detail: 'クリエイターツール / consumer UX',
								logo: 'https://www.google.com/s2/favicons?domain=capcut.com&sz=128',
								mark: 'CC',
							},
								{
									name: 'Ulike',
									detail: 'グロースプロダクト / commerce UX',
									logo: '/brand-icons/ulike-icon.jpg',
									mark: 'UL',
								},
						],
					},
				],
				projectGroup: {
					eyebrow: 'プロジェクト経験',
					title: 'プロジェクト経験',
					items: [
							{
								name: 'Lark / CapCut',
								detail: 'Collaboration product / creator product における frontend engineering、interaction polish、業務モジュール delivery の経験。',
								mark: 'LC',
								tags: ['Product UI', 'Workflow', 'Creator Tools'],
							},
							{
								name: 'Micro-frontends',
								detail: 'Domain module の分割、独立 delivery、チーム間 contract、frontend governance の経験。',
								mark: 'MF',
								tags: ['Micro Frontend', 'Delivery'],
							},
							{
								name: 'Cloud applications',
								detail: 'Cloud workspace、online collaboration surface、product entry のサービス設計と実装。',
								mark: 'CL',
								tags: ['Cloud App', 'SaaS'],
							},
							{
								name: 'Text2SQL',
								detail: 'Natural-language query を data model と result workflow に接続し、説明可能な分析体験へ落とし込む設計。',
								mark: 'SQL',
								tags: ['AI Product', 'Data UX'],
							},
							{
								name: 'Harness',
								detail: 'Agent toolchain、context、permission、task execution、復元可能な workflow runtime の設計経験。',
								mark: 'HX',
								tags: ['Agent Runtime', 'Control Plane'],
							},
							{
								name: 'Media processing',
								detail: 'Frontend media handling、editing flow、preview interaction、performance optimization を含む実装経験。',
								mark: 'AV',
								tags: ['Media Pipeline', 'Editor'],
							},
							{
								name: 'Infinite canvas',
								detail: 'Complex object editing、pan/zoom、spatial organization、高密度 interaction を支える canvas system。',
								mark: 'CNV',
								tags: ['Canvas', 'Interaction'],
							},
					],
				},
				techStack: {
					eyebrow: '技術スタック',
					title: '主な技術スタック',
					items: [
						{ name: 'TS', detail: 'TypeScript', logo: 'https://cdn.simpleicons.org/typescript/1b365d', mark: 'TS' },
						{ name: 'Go', detail: 'Backend service', logo: 'https://cdn.simpleicons.org/go/1b365d', mark: 'GO' },
						{ name: 'Node.js', detail: 'Service runtime', logo: 'https://cdn.simpleicons.org/nodedotjs/1b365d', mark: 'ND' },
						{ name: 'React', detail: 'Product UI', logo: 'https://cdn.simpleicons.org/react/1b365d', mark: 'R' },
						{ name: 'Next', detail: 'React framework', logo: 'https://cdn.simpleicons.org/nextdotjs/1b365d', mark: 'NX' },
						{ name: 'Nest', detail: 'Node framework', logo: 'https://cdn.simpleicons.org/nestjs/1b365d', mark: 'NS' },
						{ name: 'PostgreSQL', detail: 'Relational data', logo: 'https://cdn.simpleicons.org/postgresql/1b365d', mark: 'PG' },
						{ name: 'Redis', detail: 'Cache / queue', logo: 'https://cdn.simpleicons.org/redis/1b365d', mark: 'RD' },
						{ name: 'Docker', detail: 'Delivery runtime', logo: 'https://cdn.simpleicons.org/docker/1b365d', mark: 'DK' },
						{ name: 'K8s', detail: 'Kubernetes ops', logo: 'https://cdn.simpleicons.org/kubernetes/1b365d', mark: 'K8' },
					],
				},
				stats: [
					{
						label: 'Current base',
					value: 'Tokyo',
					detail: 'リモート協業とグローバルな開発リズム',
				},
				{
					label: 'Core lane',
					value: 'Agent',
					detail: 'Workflow、tool call、AI-native development',
				},
				{
					label: 'Product range',
					value: 'Full stack',
					detail: 'UI の流れからサービス設計まで',
				},
			],
			capabilities: [
				{
					eyebrow: 'Frontend Craft',
					title: '手触りがよく、記憶に残るインターフェース',
					body: 'Product UI、interaction rhythm、design system、保守しやすい component を、実際の行動を支える道具として組み立てます。',
					items: ['Product UI', 'Design Systems', 'Interaction Rhythm'],
				},
				{
					eyebrow: 'Backend Logic',
					title: '速いアイデアを支える明快な実行構造',
					body: 'API layer、service boundary、agent workflow を設計し、速い反復と長期安定性を同じ枠で扱います。',
					items: ['API Design', 'Automation', 'Service Architecture'],
				},
				{
					eyebrow: 'Data & Infra',
					title: '成長と変更に耐えるプロダクトの土台',
					body: 'Storage、caching、containers、engineering foundation を整え、システムが広がっても読み解ける状態を保ちます。',
					items: ['Storage', 'Caching', 'Containers'],
				},
			],
			sections: [
				{
					title: '大事にしたいプロダクト状態',
					paragraphs: [
						'使っていて滑らかで、保守していて安定し、細部が記憶に残ること。良いシステムは速く進みながら、要件が増えても境界を失いません。',
					],
				},
				{
					title: '好きな仕事の進め方',
					paragraphs: [
						'問題を検証できる経路へ分け、体験、実装、自動化をつなげていきます。複雑なシステムでは、推測や手戻りを減らす構造を優先します。',
					],
				},
				{
					title: '書き続ける理由',
					paragraphs: [
						'AI や Agent の判断は、チャットログや一度きりの実験に散らばりがちです。書くことで判断を残し、次の実装をより早く核心へ近づけます。',
					],
				},
			],
			focus: [
				'実用的な Agent workflow と開発者ツールを設計すること',
				'プロダクト体験と強い工程基盤を同時に磨くこと',
				'拡張しやすい frontend / backend system を組むこと',
				'再利用できる AI-native development pattern を記録すること',
			],
			timeline: [
				{
					period: 'Former',
					title: 'NetEase / ByteDance / Ethereum Community Fund',
					body: '速度のある環境で、実ユーザーに届くプロダクトと工程の経験を積みました。',
				},
				{
					period: 'Shipped around',
					title: 'Lark / CapCut / Ulike',
					body: '協業、創作、コンシューマープロダクトの周辺で、体験と信頼性を同時に進めました。',
				},
				{
					period: 'Now',
					title: 'Agent Builder in Tokyo',
					body: 'Agent toolchain、AI-native workflow、チームが使い続けられる product system に集中しています。',
				},
			],
			closing: [
				'AI、Agent、プロダクトエンジニアリングを現実の利用へ近づけている人に向けて、再利用できる判断と実装の細部をここに残していきます。',
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
