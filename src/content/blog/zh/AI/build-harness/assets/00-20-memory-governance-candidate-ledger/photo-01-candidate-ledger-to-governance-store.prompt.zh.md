1. 图解类型
横向管线图，因为重点是候选记忆从 session evidence 进入 candidate ledger，再经过治理检查进入 governance store 的顺序链路。

2. 画面元素清单
画面从左到右 6 个节点：Session 事件、候选提取、Candidate Ledger、治理检查、Review Gate、Governance Store。Session 事件用事件日志图标，候选提取用漏斗图标，Candidate Ledger 用账本图标，治理检查用盾牌和放大镜，Review Gate 用闸门图标，Governance Store 用带标签的数据库。淡黄色高亮 Candidate Ledger 和 Governance Store。底部留一句金句位置。

3. 正向图片提示词
画一张文章内技术解释图，主题是 Agent 长期记忆从 candidate ledger 到 governance store 的写入治理链路。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：横向管线图。从左到右画 6 个关键节点，并用手绘箭头连接。① Session 事件：事件日志纸带图标，表示用户消息、工具观察、验证结果。② 候选提取：漏斗和小标签图标，表示只提取可能复用的记忆候选。③ Candidate Ledger：打开的账本图标，使用淡黄色高亮，表示 pending candidates。④ 治理检查：盾牌 + 放大镜，表示来源、置信度、范围、TTL 和冲突检查。⑤ Review Gate：小闸门和审批勾选，表示人工或策略复核。⑥ Governance Store：带版本标签的数据库，使用淡黄色高亮，表示可审计长期记忆。

高亮：用淡黄色强调 Candidate Ledger、Governance Store，以及从治理检查到 Review Gate 的箭头。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：节点标签短；底部可留出一行手写金句位置：“候选不是事实，批准后才是记忆”。如果中文文字不稳定，则只留空白区域给后期添加。

整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。元素清晰，层次明确，箭头关系明确。

4. 负向提示词
不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
