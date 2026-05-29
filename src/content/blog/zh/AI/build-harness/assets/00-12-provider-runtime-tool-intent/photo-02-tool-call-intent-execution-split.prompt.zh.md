1. 图解类型
layered architecture，因为这张图要把 Tool Call、Tool Intent、Tool Execution 放在三层不同责任域里，帮助读者理解同一个“工具调用”在 Harness 中必须拆成三个对象。

2. 画面元素清单
三层结构：Provider 协议层、Core 语义层、Tool Runtime 执行层；每层 2 个节点，总计 6 个节点；上层是 Tool Call 和 Tool Delta，中层是 ToolIntent 和 Event Log，下层是 Validate/Permission 和 Execution/Observation；淡黄色高亮 ToolIntent 和 Execution；背景用轻微分层网格。

3. 正向图片提示词
画一张文章内技术解释图，主题是 Tool Call、Tool Intent、Tool Execution 的三层责任分离。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘分层架构图，清晰、克制、有工程草图感。

构图：分层架构图，纵向三层。最上层是“Provider 层”，画 2 个节点：① Tool Call：云端消息卡片图标，表示供应商原始工具调用。② Tool Delta：碎片拼图图标，表示流式参数分片。中间层是“Core 层”，画 2 个节点：③ ToolIntent：带问号的工具卡片图标，表示统一行动提议，用淡黄色高亮。④ Event Log：账本图标，表示事实记录。最下层是“Runtime 层”，画 2 个节点：⑤ Validate/Permission：盾牌和检查勾图标，表示校验和审批。⑥ Execution/Observation：扳手和回执单图标，表示真实执行和观察结果，用淡黄色高亮。

用箭头从上层 Tool Call / Tool Delta 指向中层 ToolIntent，再从 ToolIntent 指向 Event Log 和 Runtime 层。三层之间留出清晰边界线，边界线旁边可以画小锁图标，表示责任隔离。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：节点标签短；底部可留出一行手写金句位置：“工具调用不是工具执行”。如果中文文字不稳定，则只留空白区域给后期添加。

整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。元素清晰，层次明确，箭头关系明确。

4. 负向提示词
不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
