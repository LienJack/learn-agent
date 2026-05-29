1. 图解类型
输入-处理-输出图，因为这张图要解释 CLI 只调用 runtime facade，runtime 再读取 registry、调用 provider，并输出稳定事件。

2. 画面元素清单
6 个主节点：User Input、Runtime Facade、Registry、Provider Adapter、Event Bus、Runtime Output。高亮 Runtime Facade 和 Registry。图标使用键盘输入、控制台门面、工具目录卡片、云接口、日志本、终端输出。

3. 正向图片提示词
画一张文章内技术解释图，主题是“Runtime Facade 让 CLI 启动 run，而不直接接管 provider 和工具细节”。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：输入-处理-输出图。左侧是 User Input 键盘和一句短命令“修复测试”。箭头进入中央偏左的 Runtime Facade 控制台门面，使用淡黄色高亮。Runtime Facade 向上读取 Registry 工具目录卡片，Registry 也用淡黄色轻微高亮；向右调用 Provider Adapter 云接口；向下写入 Event Bus 日志本；最右侧输出 Runtime Output 终端，包含 text delta 和 tool intent 两个小标签。用虚线表示 CLI 不直接连接 Provider Adapter，也不直接连接 Registry 内部执行。

背景有很淡的电路线、节点连线和工程草图辅助线，但不要抢主体。每个节点只放短标签。底部留一行空白金句位置，后期添加文字。整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。

4. 负向提示词
不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 6 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
