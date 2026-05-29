1. 图解类型
分层架构图，因为这张图要解释真实大模型 provider 被接入 core，但执行、状态和事件日志仍由 runtime 控制。

2. 画面元素清单
6 个主节点：CLI、Runtime Facade、Core Kernel、Provider Adapter、真实大模型、Tool Runtime。Core Kernel 内部用 3 个小标签表示 contracts、event bus、state。高亮 Core Kernel 和 ToolIntent 边界。图标使用终端、控制台、芯片、云端接口、工具箱、日志本。

3. 正向图片提示词
画一张文章内技术解释图，主题是“M0 Core Kernel 把真实大模型接进系统，而不是让模型接管系统”。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：分层架构图。左侧是 CLI 终端图标，箭头进入中间的 Runtime Facade 控制台。中心画一个较大的 Core Kernel 面板，面板里有 3 个短标签：contracts、event bus、state。右侧上方是 Provider Adapter 和真实大模型云端接口，箭头只返回 ModelEvent 和 ToolIntent。右侧下方是 Tool Runtime 工具箱，但用虚线表示后续章节执行层。画一条清晰边界线，说明 provider 不能越过 core 直接执行工具。

高亮：用淡黄色强调 Core Kernel 面板，以及 Provider Adapter 返回 ToolIntent 到 Core Kernel 的箭头。

背景有很淡的电路线、节点连线和工程草图辅助线，但不要抢主体。每个节点只放很短的中文或英文标签。底部留一行空白金句位置，后期添加文字。整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。

4. 负向提示词
不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 6 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
