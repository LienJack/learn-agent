# cover: Agent 演化路径：Chat Agent -> Tool Agent -> Runtime Agent -> Managed Agent

Asset target: docs/zh/assets/00-05-agent-evolution-path/cover.png

使用 imagegen 生成一张技术博客封面图。

## Prompt

画一张技术博客封面图，主题是“Agent 从会回答、会行动、能稳定行动，到能被安全托管运行，逐步长出 Harness”。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：宽幅横向博客封面。画面是一条从左到右的四阶段演化路径：Chat Agent、Tool Agent、Runtime Agent、Managed Agent，最后汇入 Harness。每个阶段用一个简单图标表示能力增加：对话气泡、工具、运行日志、托管控制台。路径下方用越来越厚的底座表示现实风险压力增加。

高亮：用淡黄色强调 Runtime Agent、Managed Agent 和最终 Harness 节点。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：只允许短英文标签，不生成中文长标题。左上方保留干净留白，方便页面叠加文章标题。

负向提示词：不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点。
