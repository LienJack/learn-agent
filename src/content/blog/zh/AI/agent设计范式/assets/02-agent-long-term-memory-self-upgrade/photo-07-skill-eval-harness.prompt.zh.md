1. 图解类型
input-process-output，因为这一节要说明 skill 证明有效时，需要把 prompt、trace、artifact 输入 eval harness，再输出是否 promote / rollback。

2. 画面元素清单
8 个主节点：输入包、Activation、Outcome、Process、Regression、Cost/Safety、Delta vs Baseline、决策出口；淡黄色高亮“Cost/Safety”和“Delta vs Baseline”。

3. 正向图片提示词
画一张文章内技术解释图，主题是 skill eval harness 如何证明一次自我升级有效。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘评估图，清晰、克制、有工程草图感。

构图：input-process-output。左侧是一组输入包，包含 Prompt、Trace、Artifact 三张叠放卡片。中间是一个大号 Eval Harness 测试台，测试台上摆 5 个检查模块，围绕一个“Delta vs Baseline”基线尺。右侧是决策出口，分成 Promote、Patch、Rollback 三个短分支。整体像工程测试台，不像产品界面。

节点：
① 输入包：Prompt、Trace、Artifact 三张叠放卡片。
② Activation：触发检查，表示该触发时触发。
③ Outcome：结果检查，表示输出质量。
④ Process：过程检查，表示是否按 procedure 执行。
⑤ Regression：回归检查，表示不污染旧任务。
⑥ Cost/Safety：计量表、盾牌和红线，用淡黄色高亮。
⑦ Delta vs Baseline：基线尺，用淡黄色高亮。
⑧ 决策出口：Promote、Patch、Rollback 三个短分支。

高亮：用淡黄色强调“Cost/Safety”和“Delta vs Baseline”，表达安全失败归零、效果必须超过旧基线。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：节点标签短；底部可留出一行手写金句位置：“评估不是可选项”。如果中文文字不稳定，则只留空白区域给后期添加。

整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。元素清晰，层次明确，箭头关系明确。

4. 负向提示词
不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
