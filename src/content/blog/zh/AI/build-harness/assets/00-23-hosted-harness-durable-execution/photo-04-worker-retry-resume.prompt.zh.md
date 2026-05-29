1. 图解类型

State sequence，因为这张图要展示 worker 崩溃不是任务消失，系统可以通过队列重派、session replay、artifact 校验和 sandbox 重建继续推进。

2. 画面元素清单

画面采用从左到右的状态序列，包含 7 个节点：Job Queue、Worker A、Crash、Session Replay、Artifact Check、Worker B、Resume。Job Queue 用队列和 lease 卡片图标；Worker A 用小服务器；Crash 用断电闪电；Session Replay 用事件日志回放图标并淡黄色高亮；Artifact Check 用文件夹和校验勾；Worker B 用另一台小服务器；Resume 用播放按钮和向前箭头并淡黄色高亮。背景使用虚线 checkpoint 和淡电路线。底部留一句金句位置：“worker 可以死，事实不能丢”。

3. 正向图片提示词

画一张文章内技术解释图，主题是 Hosted Harness 如何在 remote worker 崩溃后通过 session 和 artifact 恢复 Agent 长任务。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：状态序列图，从左到右排列 7 个节点，并用手绘箭头连接：① Job Queue：队列线和 lease 卡片，表示任务可重派。② Worker A：小服务器，表示第一次执行者。③ Crash：断电闪电和断开的线，表示 worker 崩溃。④ Session Replay：事件日志本和回放箭头，表示从事实源恢复，用淡黄色高亮。⑤ Artifact Check：文件夹加校验勾，表示检查日志、patch、测试结果证据。⑥ Worker B：另一台小服务器，表示新 worker 接手。⑦ Resume：播放按钮和向前箭头，表示继续长任务，用淡黄色高亮。

箭头要表达：worker 崩溃后 job 回到队列，新 worker 不是从头重跑，而是 replay session、校验 artifact、重建 sandbox 后继续。节点标签短，底部留出一行手写中文金句位置：“worker 可以死，事实不能丢”。整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式故障拓扑图。

4. 负向提示词

不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
