1. 图解类型

Horizontal pipeline。重点是展示一次本地工具调用如何从模型提议，经过权限决策和真实执行，最后形成 observation 与 audit event。

2. 画面元素清单

横向五节点：Tool Intent、Permission Decision、Execution、Observation、Audit Trail；每个节点用不同图标；高亮 Permission Decision 和 Audit Trail；下方有一条小型回路把 Observation 指回模型。

3. 正向图片提示词

画一张文章内技术解释图，主题是本地工具调用的权限、执行、观察和审计事实链。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：横向 pipeline。左到右 5 个关键节点：① Tool Intent：对话气泡 + JSON 卡片，表示模型提议；② Permission：盾牌 + 分叉小门，表示 allow/ask/deny，用淡黄色高亮；③ Execution：扳手 + 文件夹 + 终端，表示受控执行；④ Observation：眼睛 + 摘要卡片，表示事实回填；⑤ Audit Trail：时间线 + 印章，表示可追踪记录，用淡黄色高亮。节点之间用粗细不均的手绘箭头连接。下方画一条细箭头从 Observation 回到左侧模型小头像，表示下一轮推理。

高亮：用淡黄色强调 Permission 和 Audit Trail。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：节点标签短；底部留出一行手写金句位置：“记录提议、决策和实际发生”。如果中文文字不稳定，则只留空白区域给后期添加。

整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。元素清晰，层次明确，箭头关系明确。

4. 负向提示词

不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
