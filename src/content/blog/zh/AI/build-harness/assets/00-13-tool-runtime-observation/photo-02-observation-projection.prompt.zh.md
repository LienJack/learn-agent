1. 图解类型
输入-处理-输出图，因为重点是 raw result 不能直接进入模型，而要经过 Normalizer 投影成多种视图。

2. 画面元素清单
左侧一个 Raw Result 节点，包含 stdout、stderr、diff、file bytes 的小标签。中间是 Normalizer 漏斗，用淡黄色高亮。右侧分出四个输出：Model View、User View、Session Fact、Artifact Ref。Model View 使用脑形芯片卡片，User View 使用小终端窗口，Session Fact 使用账本，Artifact Ref 使用文件夹。底部留一句“Observation 是事实投影，不是原始输出”的空白金句位置。

3. 正向图片提示词
画一张文章内技术解释图，主题是“原始工具结果如何被投影成 observation”。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：输入-处理-输出图。左侧是一个 Raw Result 大卡片，里面用很短标签表示 stdout、stderr、diff、file bytes。中间是一个漏斗状 Normalizer，用淡黄色高亮，表示分类、清洗、结构化和截断。右侧分成 4 个输出卡片，并用箭头从漏斗连接：① Model View：脑形芯片和下一步箭头，表示模型下一轮可消费事实。② User View：小终端窗口和眼睛图标，表示用户可理解展示。③ Session Fact：账本和时间戳，表示可审计事件。④ Artifact Ref：文件夹和链条图标，表示完整输出引用。

背景使用很淡的电路线和工程草图辅助线。每个节点只放短标签。底部留出一行空白金句位置：“Observation 不是 stdout”。整体像技术博客中的手绘机制图，不是产品 UI，不是数据大屏。

4. 负向提示词
不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 6 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
