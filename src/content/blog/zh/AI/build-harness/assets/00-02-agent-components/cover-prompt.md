# cover: Agent 组成模型：Model、Loop、Tools、State

Asset target: docs/zh/assets/00-02-agent-components/cover.png

使用 imagegen 生成一张技术博客封面图。

## Prompt

画一张技术博客封面图，主题是“Agent 的最小四件套：Model、Loop、Tools、State 是四条责任边界，而不是术语列表”。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：宽幅横向博客封面。画面中心是一个闭环运行图，四个主节点围成一圈：Model、Loop、Tools、State。Model 像一个判断节点，Loop 像循环箭头，Tools 像扳手和终端，State 像记录本或时间线。闭环外侧加一个很轻的 Runtime 边界框，暗示后续 Harness。

高亮：用淡黄色强调 Loop 的循环箭头和 State 的记录线。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：只允许短英文标签，不生成中文长标题。左上方保留干净留白，方便页面叠加文章标题。

负向提示词：不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点。
