1. 图解类型
横向管线图，因为这一张要把“小型 CLI Agent 修复测试失败”的插件化运行路径串起来。

2. 画面元素清单
七个主节点：用户目标、Runtime Loop、Provider 插件、Tool Intent、Hook Gate、Test Runner 插件、Observation/Event Log。高亮 Hook Gate 和 Event Log。图标使用小旗、循环箭头、云端接口、申请单、闸门、测试试管、日志纸。右侧 observation 用回环箭头回到 Runtime Loop。

3. 正向图片提示词
画一张文章内技术解释图，主题是“插件化能力如何参与 CLI Agent 修复测试失败，但仍然走 Harness 管线”。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：横向管线图，从左到右排列 7 个节点。① 用户目标：小旗和对话气泡，表示“修复测试失败”。② Runtime Loop：循环箭头和小核心芯片。③ Provider 插件：云端接口加拼图块，只返回模型事件。④ Tool Intent：申请单，写短标签 run_tests。⑤ Hook Gate：淡黄色高亮闸门，表示 preToolUse 权限判断。⑥ Test Runner 插件：测试试管和终端小框，表示执行测试工具。⑦ Observation/Event Log：淡黄色高亮日志纸和回环箭头，表示测试输出进入事实日志并回到下一轮。

在 Provider 插件和 Test Runner 插件上都画小拼图边缘，表示它们来自插件；但它们都接在同一条主线上，没有旁路。右侧从 Observation 画一条弧形箭头回到 Runtime Loop。背景有很淡的电路线和工程草图辅助线。每个节点只放短标签，底部留出一行空白金句位置。

4. 负向提示词
不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
