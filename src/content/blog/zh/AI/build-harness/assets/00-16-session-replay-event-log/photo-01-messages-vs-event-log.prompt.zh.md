1. 图解类型

layered architecture，因为这张图要解释 Event Log、State、Messages 三层不是同一个东西，messages 只是从事实源投影出来的模型输入。

2. 画面元素清单

6 个主节点：Event Log、Artifact Store、State Reducer、Session State、Context Projection、Messages。Event Log 和 Context Projection 用淡黄色高亮。图标使用日志卷轴、文件盒、漏斗、状态卡片、投影灯、聊天气泡。底部留一句短 caption：事实留在事件里，模型看到的是投影。

3. 正向图片提示词

画一张文章内技术解释图，主题是 Session Replay 中 Event Log、State、Messages 的事实源关系。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：分层架构图。左侧底层画一个 Event Log 日志卷轴，使用淡黄色高亮，旁边连接 Artifact Store 文件盒，表示大块证据材料。中间画 State Reducer 漏斗，把事件折叠成 Session State 状态卡片。右侧画 Context Projection 投影灯，使用淡黄色高亮，投影到 Messages 聊天气泡。用清晰箭头表示 Event Log -> State Reducer -> Session State -> Context Projection -> Messages。另有虚线从 Event Log 指向 Audit、Trace、Replay 三个小标签，表示同一事实源可以生成不同视图。

背景有很淡的电路线、节点连线和工程草图辅助线，但不要抢主体。每个节点只放短中文或短英文标签。底部留出一行手写中文金句位置：“事实留在事件里，模型看到的是投影”。整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。

4. 负向提示词

不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
