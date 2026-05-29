1. 图解类型

decision path，因为这张图要说明 Agent Loop 每一轮继续前都要经过停止条件检查。

2. 画面元素清单

左侧入口是 Loop Tick；中间分支包括 aborted、maxTurns、budget、model final、invalid intent、execute tool；右侧分别通向 Finished、Stopped、Continue；高亮 maxTurns 和 budget 两个保护门。

3. 正向图片提示词

画一张文章内技术解释图，主题是最小 Agent Loop 的停止条件如何保护系统不无限循环。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：决策路径图。左侧是 Loop Tick 入口，用循环箭头和小钟表表示新一轮开始。中间画 6 个菱形或小门节点，并用手绘箭头连接：① Abort?：停止按钮，表示用户中断。② Max Turns?：计数器门，用淡黄色高亮，表示轮次上限。③ Budget?：电量表或钱包，用淡黄色高亮，表示 token、时间、费用预算。④ Model Final?：小旗，表示自然完成。⑤ Valid Intent?：结构化卡片 + 放大镜，表示工具意图校验。⑥ Execute Tool：扳手 + 终端，表示继续行动。右侧有三个出口：Finished、Stopped、Continue。

高亮：用淡黄色强调 Max Turns、Budget，以及通往 Stopped 的保护箭头。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：节点标签短；底部可留出一行手写金句位置：“Loop 的专业性，藏在怎么停”。如果中文文字不稳定，则只留空白区域给后期添加。

整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。元素清晰，层次明确，箭头关系明确。

4. 负向提示词

不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
