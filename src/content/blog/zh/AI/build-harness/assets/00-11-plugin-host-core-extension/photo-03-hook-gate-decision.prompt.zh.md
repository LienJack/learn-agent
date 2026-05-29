1. 图解类型
决策路径图，因为重点是 preToolUse hook 如何站在 intent 和 execution 之间，做 allow、ask、deny 或 amend 的受控决策。

2. 画面元素清单
从左到右：Tool Intent、Hook Gate、Policy Check、四个决策分支 allow/ask/deny/amend、Tool Runtime、Event Log。高亮 Hook Gate 和 Event Log。图标使用申请单、闸门、盾牌、分叉路标、扳手、日志纸。deny 和 ask 分支回到 blocked observation。

3. 正向图片提示词
画一张文章内技术解释图，主题是“Hook Kernel 是 intent 到 execution 之间的受控阻断点”。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘决策图，清晰、克制、有工程草图感。

构图：决策路径图。左侧画 Tool Intent 申请单，箭头进入中央淡黄色高亮的 Hook Gate 闸门。闸门后面连接 Policy Check 盾牌和分叉路标。分叉路标分出四条短路径：allow 通向 Tool Runtime 扳手；ask 通向 Human Confirm 小对话框；deny 通向 Blocked Observation 停止牌；amend 通向 Amended Intent 修改单。所有分支最终都连到右侧淡黄色高亮的 Event Log 日志纸，表示决策必须留下事实。

画面中用一条明显边界线隔开 Intent 区域和 Execution 区域，Tool Runtime 只能出现在 allow 分支之后。背景有很淡的电路线和工程草图辅助线。标签短小，底部留出一行空白金句位置。整体像技术博客中的手绘机制图，不是产品 UI。

4. 负向提示词
不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
