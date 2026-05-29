1. 图解类型

Layered architecture，因为这张图要帮助读者理解 Hosted Harness 不是一个远程 CLI 进程，而是围绕长任务生命周期分层的控制系统。

2. 画面元素清单

画面使用自上而下的分层结构，包含 6 个主要节点：Automation、Harness、Session、Sandbox、Deployment、Notification。Automation 在最上方像一个日历时钟，表示触发任务；Harness 在中间用控制台面板表示，作为淡黄色高亮；Session 用事件账本图标表示，作为第二个淡黄色高亮；Sandbox 用带边框的容器盒子表示；Deployment 用云端基础设施和队列图标表示；Notification 用消息气泡表示。箭头从 Automation 流向 Harness，再连接 Session、Sandbox 和 Notification，Deployment 作为底座支撑所有层。背景有很淡的电路线和工程草图辅助线。底部留一句金句位置：“Hosted 的核心是托管生命周期”。

3. 正向图片提示词

画一张文章内技术解释图，主题是 Hosted Harness 的五层边界：Automation、Harness、Session、Sandbox、Deployment 如何共同托管远程 Agent 长任务。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：分层架构图。画面自上而下分成 5 层，最上层是 Automation，用日历加小时钟图标表示“定时触发”；第二层是 Harness，用控制台面板和旋钮表示“控制循环”，用淡黄色高亮；第三层是 Session，用打开的事件账本表示“事实源”，也用淡黄色高亮；第四层是 Sandbox，用带边界线的容器盒子表示“受控执行”；最底层是 Deployment，用云端、队列、worker、vault、artifact store 的简笔图标表示“基础设施支撑”。右侧放一个 Notification 消息气泡，与 Harness 和 Session 相连，表示通知也是生命周期事件。

节点标签短：Automation、Harness、Session、Sandbox、Deployment、Notify。箭头清楚展示：Automation 创建任务，Harness 推进循环，Session 记录事实，Sandbox 执行动作，Deployment 提供队列、worker、vault 和 artifact。底部留出一行手写中文金句位置：“Hosted 的核心是托管生命周期”。整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式云架构图。

4. 负向提示词

不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
