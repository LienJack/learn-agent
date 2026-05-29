1. 图解类型

decision path，因为这张图要解释 replay 和 resume 的分叉：replay 默认只读重建状态，只有通过 Resume Gate 才能进入新的行动循环。

2. 画面元素清单

7 个主节点：Event Log、Replay Reducer、Rebuilt State、Trace View、Pending Action、Resume Gate、New Agent Loop。Replay Reducer 和 Resume Gate 用淡黄色高亮。图标使用日志卷轴、回放按钮、状态卡、放大镜、待办卡、闸门、循环箭头。右下角画一个被禁止的“重复执行工具”小标记。

3. 正向图片提示词

画一张文章内技术解释图，主题是 Session Replay 不是重新跑真实世界，而是只读重建可解释状态。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：决策路径图。左侧画 Event Log 日志卷轴，箭头进入 Replay Reducer 回放按钮和漏斗组合，Replay Reducer 使用淡黄色高亮。中间输出 Rebuilt State 状态卡片，并分出两个只读视图：Trace View 放大镜、Pending Action 待办卡。Pending Action 再进入 Resume Gate 闸门，Resume Gate 使用淡黄色高亮。闸门右侧才连接 New Agent Loop 循环箭头，表示恢复后新的行动必须重新经过控制边界。画面右下角画一个小的工具扳手加禁止符号，标注“not rerun”，表示 replay 不重复执行旧工具。

背景有很淡的电路线、节点连线和工程草图辅助线，但不要抢主体。节点标签短，箭头清楚。底部留出一行手写中文金句位置：“Replay 重建解释，Resume 才继续行动”。整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。

4. 负向提示词

不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
