1. 图解类型

分层架构图，因为重点是说明 profile 不是表层偏好，而是把策略、工具、上下文、模型偏好和输出协议组合成一个运行身份。

2. 画面元素清单

中心节点：Profile 运行身份。五个环绕层：Policy、Tool Bundle、Context Source、Provider Preference、Output Contract。底部是 Harness Runtime，表示 profile 只声明身份，真正执行仍回到 runtime。用淡黄色高亮 Profile 和 Harness Runtime。图标隐喻：盾牌表示 policy，工具箱表示 tool bundle，文件夹表示 context source，云端接口表示 provider preference，事件流卡片表示 output contract，底座表示 runtime。

3. 正向图片提示词

画一张文章内技术解释图，主题是 Agent CLI 的 profile 如何定义运行身份。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘机制图，清晰、克制、有工程草图感。

构图：分层架构图。画面中央上方是一个较大的手绘卡片，标签为“Profile”，旁边写短标签“运行身份”。Profile 下方分出五个小模块，横向排列并用细箭头汇入底部的 Harness Runtime 底座。

五个模块分别是：① Policy：盾牌图标，表示权限和风险边界。② Tool Bundle：工具箱图标，表示默认工具组合。③ Context Source：文件夹和便签图标，表示项目指令、Skill、记忆来源。④ Provider Preference：云端接口和切换箭头，表示模型偏好和 fallback。⑤ Output Contract：事件流卡片图标，表示 TTY、JSONL、Workbench 输出协议。

高亮：用淡黄色强调中央 Profile 卡片和底部 Harness Runtime 底座，表达 profile 只声明身份，runtime 执行身份。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：节点标签短；底部可留一行手写金句位置：“Profile 是运行身份，不是主题皮肤”。如果中文文字不稳定，则只留空白区域给后期添加。

整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。元素清晰，层次明确，箭头关系明确。

4. 负向提示词

不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
