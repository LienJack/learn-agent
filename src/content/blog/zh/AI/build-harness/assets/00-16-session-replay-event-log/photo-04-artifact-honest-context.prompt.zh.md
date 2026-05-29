1. 图解类型

input-process-output，因为这张图要解释原始工具结果和文件证据先进入 Artifact Store，再由 Projection 生成可追溯的模型上下文。

2. 画面元素清单

7 个主节点：Tool Output、File Diff、Model Input Snapshot、Artifact Store、Event Ref、Projection、Model Context。Artifact Store 和 Projection 用淡黄色高亮。图标使用终端日志、diff 文件、信封快照、档案盒、链接链条、投影灯、模型工作台。底部留 caption：上下文可以变短，证据不能断线。

3. 正向图片提示词

画一张文章内技术解释图，主题是 Artifact Store 如何让 Agent 的上下文投影保持诚实。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：input-process-output。左侧竖排三个输入节点：Tool Output 终端日志、File Diff 文件差异、Model Input Snapshot 信封快照。它们用箭头进入中间的大 Artifact Store 档案盒，Artifact Store 使用淡黄色高亮。Artifact Store 旁边连接 Event Ref 链条图标，表示事件日志只保存稳定引用。右侧画 Projection 投影灯，使用淡黄色高亮，把证据摘要投影成 Model Context 工作台。用一条虚线从 Model Context 反向指回 Event Ref，表示摘要可追溯到原始证据。

背景有很淡的电路线、节点连线和工程草图辅助线，但不要抢主体。节点标签短，箭头清楚。底部留出一行手写中文金句位置：“上下文可以变短，证据不能断线”。整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。

4. 负向提示词

不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
