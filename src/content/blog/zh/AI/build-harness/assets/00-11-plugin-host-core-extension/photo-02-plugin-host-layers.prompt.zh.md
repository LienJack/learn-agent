1. 图解类型
分层架构图，因为文章这一节需要展示外部插件、Plugin Host、Core Kernel 三层之间的责任边界。

2. 画面元素清单
三个横向分层：外部插件层、Plugin Host 层、Core Kernel 层。主节点包括 Manifest、Loader、Lifecycle、Registry、Hook Kernel、Contracts、Runtime、Event Log。高亮 Registry 和 Hook Kernel。图标使用说明书、漏斗、时钟、登记册、闸门、契约纸、循环箭头、日志卷轴。

3. 正向图片提示词
画一张文章内技术解释图，主题是“Plugin Host 的五个核心部件如何隔开外部插件和 Core Kernel”。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：三层横向分层架构。最上层标题“外部插件”，放两个拼图块：Manifest 说明书、Implementation 小齿轮。中间层标题“Plugin Host”，放五个模块并用箭头连接：Loader 漏斗、Lifecycle 时钟、Registry 登记册、Hook Kernel 闸门、Error Isolation 隔离盒。Registry 和 Hook Kernel 使用淡黄色高亮。最下层标题“Core Kernel”，放三个稳定模块：Contracts 契约纸、Runtime 循环箭头、Event Log 日志卷轴。

箭头只能从上层进入中层，再由中层进入下层；不要画外部插件直连 core。背景有很淡的电路线、节点连线和工程草图辅助线。每个节点只放短标签，底部留一行空白金句位置。整体感觉像手绘工程分层图，强调责任边界和受控入口。

4. 负向提示词
不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
