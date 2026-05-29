1. 图解类型

输入-处理-输出图，因为重点是说明 Runtime 只产生稳定事实事件，TTY、JSONL、Workbench、CI 和 Trace 都是对同一事件流的不同投影。

2. 画面元素清单

左侧输入：Runtime Events。中间处理：CLI Event Stream。右侧五个输出：TTY Renderer、JSONL、Workbench、CI Log、Trace Store。用淡黄色高亮 CLI Event Stream 和 Trace Store。图标隐喻：事件卡片、总线、终端窗口、花括号文档、工作台时间线、构建日志、数据库。

3. 正向图片提示词

画一张文章内技术解释图，主题是 Productized CLI 的稳定输出协议。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘机制图，清晰、克制、有工程草图感。

构图：输入-处理-输出结构。左侧是一组“Runtime Events”事件卡片，箭头进入中间较粗的“CLI Event Stream”总线。总线向右分出五条箭头，分别连接五个输出端：TTY Renderer、JSONL、Workbench、CI Log、Trace Store。右侧输出端排成扇形或两列，保持清晰留白。

节点：① Runtime Events：多张小事件卡片，表示 session、provider、tool、diagnostic 事实事件。② CLI Event Stream：总线图标，表示稳定 schema。③ TTY Renderer：终端窗口图标，表示人类可读渲染。④ JSONL：花括号文档图标，表示机器消费。⑤ Workbench：时间线面板图标，表示 host 可视化。⑥ CI Log：构建日志图标，表示自动化系统。⑦ Trace Store：小数据库图标，表示回放和分析。

高亮：用淡黄色强调 CLI Event Stream 和 Trace Store，表达事实源是事件，不是漂亮终端文字。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：节点标签短；底部可留一行手写金句位置：“终端渲染只是事件的一种投影”。如果中文文字不稳定，则只留空白区域给后期添加。

整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。元素清晰，层次明确，箭头关系明确。

4. 负向提示词

不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
