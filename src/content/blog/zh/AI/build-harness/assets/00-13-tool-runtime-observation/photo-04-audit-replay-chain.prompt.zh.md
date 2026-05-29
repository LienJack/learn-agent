1. 图解类型
状态序列图，因为重点是一次工具调用从 intent 到 observation 会沉淀成可审计、可 replay 的事件链。

2. 画面元素清单
六个时间序列节点：Intent Event、Validation Event、Permission Event、Invocation Started、Observation Event、Replay View。每个节点是带时间戳的小纸条，用箭头串成时间线。Observation Event 和 Replay View 用淡黄色高亮。左上角有小 Model 图标，右下角有 Event Log 账本图标。底部留一句“重放事实，不重做副作用”的空白金句位置。

3. 正向图片提示词
画一张文章内技术解释图，主题是“Tool Runtime 如何把工具执行记录成可审计、可 replay 的事实链”。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：状态序列时间线图。画面从左到右是一条略微弯曲的时间线，包含 6 个小纸条节点：① Intent Event：模型申请单图标。② Validation Event：检查表图标。③ Permission Event：盾牌图标。④ Invocation Started：扳手和播放按钮。⑤ Observation Event：日志纸张，用淡黄色高亮。⑥ Replay View：回放按钮和账本，用淡黄色高亮。时间线下方放一个 Event Log 账本，表示这些事件都被写入事实源。左上角有一个小 Model 节点，箭头指向 Intent；右侧 Replay View 不连接真实工具，只连接旧 Observation，表示重放事实而不是重做副作用。

背景使用很淡的电路线、节点连线和工程草图辅助线。每个节点只放短标签。底部留出一行空白金句位置：“重放事实，不重做副作用”。整体像技术博客里的手绘机制图，不是产品 UI，不是复杂数据库图。

4. 负向提示词
不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
