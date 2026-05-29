1. 图解类型
分层架构图，因为这张图要解释 CLI、Runtime、Provider Contract、Provider Adapter 和真实模型 API 之间的责任边界。

2. 画面元素清单
5 个主要节点：CLI、Runtime、Provider Contract、Provider Adapter、Model API。Provider Contract 用淡黄色高亮，表示它是隔离 provider 细节的承重层。Provider Adapter 旁边放小翻译器图标，Model API 旁边放云端接口图标。背景可以有很淡的工程电路线。

3. 正向图片提示词
画一张文章内技术解释图，主题是“第一次模型调用中的 Provider Contract 边界”。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：分层架构图，从左到右或从上到下展示 5 个节点。① CLI：终端窗口和光标，表示用户输入。② Runtime：小控制台和齿轮，表示组装 ChatRequest。③ Provider Contract：协议卡片和桥梁，用淡黄色高亮，标签短写“统一契约”。④ Provider Adapter：翻译器、小插头或转换箭头，表示把统一请求翻译成某家 API。⑤ Model API：云端接口和模型芯片，表示真实大模型服务。

高亮：用淡黄色强调 Provider Contract，以及 Runtime 到 Provider Contract 的箭头。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：节点标签短；底部留出一行手写金句位置：“Provider 翻译能力，Core 推进任务”。如果中文文字不稳定，则只留空白区域给后期添加。

整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。元素清晰，层次明确，箭头关系明确。

4. 负向提示词
不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 6 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
