1. 图解类型
横向流水线图，因为这张图要展示 provider 原始 stream 如何被 adapter 归一化为 Runtime 能消费的 ModelEvent。

2. 画面元素清单
6 个主要节点：用户输入、ChatRequest、Raw Stream、Adapter Normalize、ModelEvent、CLI Output / Session Record。Raw Stream 用碎片 token 点表示，ModelEvent 用淡黄色高亮，CLI Output 和 Session Record 形成一个小分叉。

3. 正向图片提示词
画一张文章内技术解释图，主题是“Streaming 不是直接打印 raw chunk，而是归一化成 ModelEvent”。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：从左到右的横向流水线。① 用户输入：终端窗口里有短光标。② ChatRequest：一张协议表单卡片。③ Raw Stream：云端流出一串碎片 token 点和小事件块，表示 provider 私有事件。④ Adapter Normalize：漏斗或转换器，把碎片事件整理成统一形状。⑤ ModelEvent：事件卡片堆，用淡黄色高亮，短标签包括 text_delta、message_stop、error。⑥ 输出分叉：上方是 CLI Output 终端打印文字，下方是 Session Record 日志本。

高亮：用淡黄色强调 ModelEvent 节点，以及 Adapter Normalize 到 ModelEvent 的箭头。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：节点标签短；底部留出一行手写金句位置：“CLI 展示文本，Runtime 消费事件”。如果中文文字不稳定，则只留空白区域给后期添加。

整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。元素清晰，层次明确，箭头关系明确。

4. 负向提示词
不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 7 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
