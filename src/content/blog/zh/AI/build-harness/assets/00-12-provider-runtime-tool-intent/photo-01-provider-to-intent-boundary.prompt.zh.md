1. 图解类型
horizontal pipeline，因为这张图要解释用户目标经过 Core、Provider Runtime、ModelEvent、ToolIntent、Tool Pipeline 的责任边界，重点是 provider 只能翻译，不能执行。

2. 画面元素清单
6 个主节点：用户目标、Core Runtime、Provider Runtime、ModelEvent、ToolIntent、Tool Pipeline；Provider Runtime 与 Tool Pipeline 之间画一条被红叉阻断的虚线，表示不能直接执行；淡黄色高亮 ToolIntent 和 Tool Pipeline；背景用轻微电路线和工程草图辅助线；底部留一句短 caption。

3. 正向图片提示词
画一张文章内技术解释图，主题是 Provider Runtime 只能把模型输出翻译为 ToolIntent，不能直接执行工具。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：横向流水线。画面从左到右包含 6 个关键节点，并用手绘箭头连接：① 用户目标：小终端窗口图标，标签“修复测试”。② Core Runtime：控制台仪表盘图标，标签“Core”。③ Provider Runtime：云端接口和插头图标，标签“Provider”。④ ModelEvent：流动的小 token 点和文档图标，标签“事件”。⑤ ToolIntent：带问号的小工具卡片图标，标签“意图”。⑥ Tool Pipeline：扳手、盾牌和队列组合图标，标签“执行管线”。

在 Provider Runtime 和 Tool Pipeline 之间画一条细虚线箭头，并用一个明显但克制的叉号阻断，表达“不能直接执行”。主流程必须从 Provider Runtime 到 ModelEvent / ToolIntent，再回到 Core，最后进入 Tool Pipeline。用淡黄色高亮 ToolIntent 节点和 Tool Pipeline 节点。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：节点标签短；底部可留出一行手写金句位置：“provider 是翻译官，不是执行官”。如果中文文字不稳定，则只留空白区域给后期添加。

整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。元素清晰，层次明确，箭头关系明确。

4. 负向提示词
不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
