1. 图解类型
决策路径图，因为重点是 permission allow 之后，工具仍要经过调度、并发判断、长任务处理和 sandbox 才能执行。

2. 画面元素清单
七个主节点：Permission Allow、Concurrency、Resource Key、Queue、Long Task、Sandbox、Execute。Permission Allow 是入口，Concurrency 和 Long Task 是分叉菱形，Sandbox 使用边界盒子并淡黄色高亮，Queue 使用队列图标，Execute 使用扳手和终端窗口。淡黄色同时强调 Scheduler 决策和 Sandbox 边界。底部留一句“允许执行，不等于立刻执行”的空白金句位置。

3. 正向图片提示词
画一张文章内技术解释图，主题是“Tool Runtime 在权限允许之后如何调度和隔离工具执行”。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：决策路径图，从左到右并带少量上下分叉。入口节点是 Permission Allow，使用盾牌小图标。接着进入 Concurrency 决策菱形，旁边有并发箭头图标；分支到 Parallel Queue 和 Serial Queue 两个小队列节点。再进入 Resource Key 小节点，表示按文件路径或 shell session 锁定资源。随后进入 Long Task 决策，带时钟图标；一条分支是 Foreground，另一条是 Background。最后所有路径汇入 Sandbox 边界盒子，用淡黄色高亮，里面放一个小终端和工作目录图标，再连接到 Execute 节点。

背景有很淡的电路线和工程草图辅助线。节点标签保持短。底部留出一行空白金句位置：“允许执行，不等于立刻执行”。整体感觉像技术博客中的手绘机制图，不是正式 BPMN 图。

4. 负向提示词
不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
