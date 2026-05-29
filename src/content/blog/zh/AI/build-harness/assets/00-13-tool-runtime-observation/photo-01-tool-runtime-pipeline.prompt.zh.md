1. 图解类型
横向管线图，因为文章核心是从模型提交 tool intent 到 Runtime 产出 observation 的受控执行链路。

2. 画面元素清单
八个主节点：Intent、Registry、Validate、Permission、Scheduler、Sandbox、Normalize、Observation。Intent 使用申请单图标，Registry 使用目录卡片，Validate 使用放大镜检查表，Permission 使用盾牌闸门，Scheduler 使用队列，Sandbox 使用边界盒子，Normalize 使用漏斗，Observation 使用日志纸张和回环箭头。淡黄色高亮 Permission 和 Observation。右侧画一条回到模型的小弧形箭头。底部留一句金句空位。

3. 正向图片提示词
画一张文章内技术解释图，主题是“Tool Runtime 把模型的 tool intent 治理成 observation”。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：横向管线图，从左到右排列 8 个关键节点，并用手绘箭头连接。① Intent：申请单图标，表示模型提出工具申请。② Registry：工具目录卡片，表示查找工具定义。③ Validate：放大镜检查表，表示 schema 和 runtime 校验。④ Permission：盾牌闸门，用淡黄色高亮，表示 allow / ask / deny。⑤ Scheduler：小队列和时钟，表示串行、并发和超时。⑥ Sandbox：边界盒子和工作目录，表示受控执行环境。⑦ Normalize：漏斗和整理后的卡片，表示结果归一。⑧ Observation：日志纸张和回环箭头，用淡黄色高亮，表示事实投影回到下一轮模型。

背景有很淡的电路线和工程草图辅助线，但不要抢主体。每个节点只放短标签。右侧从 Observation 画一条弧形箭头回到一个小 Model 节点。底部留出一行空白金句位置。整体像技术博客里的手绘机制图，不是正式企业架构图。

4. 负向提示词
不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
