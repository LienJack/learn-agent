1. 图解类型

horizontal pipeline，因为这张图要展示工具原始结果如何被整理、预算、摘要，并分别进入模型上下文和事件日志。

2. 画面元素清单

从左到右 6 个节点：Raw Result、Normalize、Budget、Observation、Prompt Context、Event Log；高亮 Observation 和 Prompt Context；Raw Result 用终端日志纸，Event Log 用账本，Prompt Context 用投影光束。

3. 正向图片提示词

画一张文章内技术解释图，主题是工具结果如何变成下一轮模型可用的 observation。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：从左到右的横向管线图。画面包含 6 个关键节点，并用手绘箭头连接：① Raw Result：终端日志纸和失败测试叉号，表示原始 stdout、文件内容或错误。② Normalize：漏斗 + 字段卡，表示结构化整理。③ Budget：剪刀 + 计量表，表示截断大结果。④ Observation：摘要卡 + 眼睛，用淡黄色高亮，表示摘要和关键证据。⑤ Prompt Context：投影光束 + 模型芯片，用淡黄色高亮，表示下一轮模型可见。⑥ Event Log：账本 + 时间戳，表示系统事实记录。

高亮：用淡黄色强调 Observation 和 Prompt Context，以及 Observation 分流到 Event Log 的细箭头。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：节点标签短；底部可留出一行手写金句位置：“工具结果不是日志，是下一轮事实”。如果中文文字不稳定，则只留空白区域给后期添加。

整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。元素清晰，层次明确，箭头关系明确。

4. 负向提示词

不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
