# cover: LLM Provider 接入：让 CLI 完成第一次模型调用

Asset target: docs/zh/assets/00-07-llm-provider-cli-first-call/cover.png

使用 imagegen 生成一张技术博客封面图。

## Prompt

画一张技术博客封面图，主题是“把真实大模型接入 CLI，但让 provider 停留在模型能力适配层，不污染 Agent core”。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘架构草图，清晰、克制、有工程草图感。

构图：宽幅横向博客封面。左侧是一个简洁 CLI 终端输入框，中间是 Provider Adapter 边界层，右侧是 Model API 云端节点。下方有一个被保护的 Core 方框，箭头显示 provider 事件只能通过 adapter 进入 core contract。整体强调“第一次模型调用”和“边界隔离”。

高亮：用淡黄色强调 Provider Adapter 边界和从 CLI 到 Model 的第一条流式输出线。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：只允许短英文标签，不生成中文长标题。右上方保留干净留白，方便页面叠加文章标题。

负向提示词：不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点。
