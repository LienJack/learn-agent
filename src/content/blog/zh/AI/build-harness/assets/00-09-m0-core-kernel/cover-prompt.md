# cover: M0 Core Kernel：把真实大模型接进系统，而不是接管系统

Asset target: docs/zh/assets/00-09-m0-core-kernel/cover.png

使用 imagegen 生成一张技术博客封面图。

## Prompt

画一张技术博客封面图，主题是“M0 Core Kernel 用 contracts、registry、event bus、conversation state、runtime facade 接住真实模型，而不让 provider 接管系统边界”。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘内核架构图，清晰、克制、有工程草图感。

构图：宽幅横向博客封面。中心是一个小而稳定的 Core Kernel 方块，内部有五个短标签模块：Contracts、Registry、Events、State、Facade。左侧是 Provider 输入，右侧是 Runtime 输出。Provider 的复杂事件通过一层 adapter 进入 Core，而不是直接穿透。整体像一张最小内核蓝图。

高亮：用淡黄色强调 Core Kernel 方块和 Contracts 模块。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：只允许短英文标签，不生成中文长标题。上方保留干净留白，方便页面叠加文章标题。

负向提示词：不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点。
