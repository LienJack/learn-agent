1. 图解类型
横向流水线，因为这张图要解释事件事实源如何一步步折叠成 state，再投影成本轮模型输入。

2. 画面元素清单
5 个主节点：Event Log、State Reducer、Conversation State、Context Projection、ModelRequest。旁边附一个小 Trace / Replay 节点。高亮 Event Log 和 Context Projection。图标使用日志卷轴、漏斗、状态卡片、投影灯、信封请求、放大镜。

3. 正向图片提示词
画一张文章内技术解释图，主题是“Conversation State 是事实日志的投影，不是事实本身”。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：从左到右的横向流水线。① Event Log：一卷日志纸和时间刻度，表示事实源，使用淡黄色高亮。② State Reducer：漏斗和折叠箭头，表示从事件折叠当前现场。③ Conversation State：几张状态卡片，表示 pending intent、usage、status、messages。④ Context Projection：投影灯照向一张模型工作台，使用淡黄色高亮，表示只选择本轮需要看的信息。⑤ ModelRequest：信封或请求包，表示发给 provider 的 messages + tools。右下角画一个小的 Trace / Replay 放大镜，从 Event Log 拉出一条虚线。

背景有很淡的电路线、节点连线和工程草图辅助线，但不要抢主体。每个节点只放很短标签。底部留一行空白金句位置，后期添加文字。整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。

4. 负向提示词
不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 6 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
