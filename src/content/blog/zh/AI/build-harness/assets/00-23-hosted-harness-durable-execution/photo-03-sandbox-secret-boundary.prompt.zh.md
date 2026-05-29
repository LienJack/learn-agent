1. 图解类型

Decision path，因为这张图要展示密钥是否进入模型、sandbox、日志和 observation 的边界判断，重点是 secret 只能通过受控工具短暂使用。

2. 画面元素清单

画面左侧是 Model，右侧是 Sandbox，中间是 Harness 和 Tool Runtime。上方放 Vault，使用锁和保险柜图标并淡黄色高亮。流程节点包括 Model Intent、Harness Policy、Vault、Tool Runtime、Sandbox、Logs、Observation。用红叉或禁止符号表示 Vault 不直接进入 Model 和 Sandbox；用淡黄色高亮 Tool Runtime，表示受控使用 secret。背景有轻微工程草图线。底部留一句金句位置：“密钥是能力，不是上下文”。

3. 正向图片提示词

画一张文章内技术解释图，主题是 Hosted Harness 中 secret boundary 如何防止密钥进入模型上下文和 sandbox 日志。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：决策路径图。左侧是 Model，用对话气泡图标表示“提出意图”；中间是 Harness Policy，用盾牌和检查勾表示“校验”；中间偏右是 Tool Runtime，用扳手和小钥匙孔表示“受控使用”，用淡黄色高亮；上方是 Vault，用保险柜和锁图标表示“密钥事实源”，也用淡黄色高亮；右侧是 Sandbox，用有边界的容器盒子表示“最小注入”；下方依次是 Logs 和 Observation，用日志纸张和摘要卡片表示“脱敏输出”和“无密钥投影”。

用清晰箭头表示：Model Intent 进入 Harness Policy，Policy 让 Tool Runtime 临时访问 Vault，Tool Runtime 只把最小能力带入 Sandbox，Sandbox 输出先进入脱敏 Logs，再生成 Observation。用两条虚线加禁止符号表示：Vault 不进入 Model，Vault 不直接暴露给 Sandbox。节点标签短，底部留出一行手写中文金句位置：“密钥是能力，不是上下文”。整体感觉像技术博客中的手绘机制图，不是产品 UI，不是安全海报。

4. 负向提示词

不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
