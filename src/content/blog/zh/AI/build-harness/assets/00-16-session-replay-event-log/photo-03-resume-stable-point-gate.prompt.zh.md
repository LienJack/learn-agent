1. 图解类型

state sequence，因为这张图要展示长任务恢复时从 intent、permission、execution、observation 到 stable point 的状态序列，以及哪些位置需要保守检查。

2. 画面元素清单

6 个主节点：Intent、Permission、Tool Running、Tool Finished、Observation、Stable Point。旁边有 Resume Gate 和 User Confirm 两个辅助节点。Stable Point 和 Resume Gate 用淡黄色高亮。图标使用行动卡片、盾牌、齿轮、勾选终端、眼睛、旗帜、闸门、用户头像。

3. 正向图片提示词

画一张文章内技术解释图，主题是 Agent 长任务恢复前必须找到最后一个稳定点。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：状态序列图。从左到右排列 6 张状态卡：Intent 行动卡片、Permission 盾牌、Tool Running 齿轮、Tool Finished 终端勾选、Observation 眼睛、Stable Point 小旗帜。Stable Point 使用淡黄色高亮。Tool Running 下方画一个虚线警告分支，连接到 Resume Gate 闸门，Resume Gate 使用淡黄色高亮，再连接 User Confirm 用户确认节点，表示如果停在半执行状态需要保守检查和人工确认。主线最后从 Stable Point 指向 Next Model Turn 小箭头。

背景有很淡的电路线、节点连线和工程草图辅助线，但不要抢主体。每个节点只放短标签。底部留出一行手写中文金句位置：“恢复不是继续 while loop，而是重新确认边界”。整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。

4. 负向提示词

不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
