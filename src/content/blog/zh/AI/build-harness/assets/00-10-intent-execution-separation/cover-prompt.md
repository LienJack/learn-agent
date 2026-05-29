# cover: Intent / Execution 分离：模型提议，系统执行

Asset target: docs/zh/assets/00-10-intent-execution-separation/cover.png

使用 imagegen 生成一张技术博客封面图。

## Prompt

画一张技术博客封面图，主题是“模型只能提出结构化 Intent，系统必须经过 Validation、Permission、Execution、Observation 才能改变外部世界”。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘管线图，清晰、克制、有工程草图感。

构图：宽幅横向博客封面。画面是一条从左到右的受控执行管线：Model Proposal -> Intent -> Validate -> Permission -> Execute -> Observation。Intent 和 Execute 之间有明显的闸门和检查点；Execute 连接一个小文件系统和终端图标；Observation 回流到 Model Proposal。整体强调“提议不是授权，执行必须受控”。

高亮：用淡黄色强调 Intent/Execution 之间的 Permission 闸门，以及 Observation 回流箭头。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：只允许短英文标签，不生成中文长标题。右上方保留干净留白，方便页面叠加文章标题。

负向提示词：不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点。
