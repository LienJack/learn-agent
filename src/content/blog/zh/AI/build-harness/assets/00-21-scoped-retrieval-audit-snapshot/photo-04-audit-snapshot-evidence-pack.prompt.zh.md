1. 图解类型
Input-process-output，因为这张图要说明 audit snapshot 如何把 scope、query plan 和候选处理过程变成可复盘的证据包，再供 model input、replay 和 trace 使用。

2. 画面元素清单
左侧输入：Scope、Query Plan、Candidates。中间处理：Selected Items、Rejected Reasons、Visible Projection、Citation Map。右侧输出：Model Input、Replay、Trace Audit。淡黄色高亮 Audit Snapshot 证据盒和 Citation Map。图标使用边界框、计划清单、纸片堆、证据盒、引用标签、回放按钮、放大镜。

3. 正向图片提示词
画一张文章内技术解释图，主题是 audit snapshot 不是缓存，而是检索证据包。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：input-process-output 三段式。左侧输入区画 3 个小卡片：① Scope：边界框图标，表示项目、权限、时间边界。② Query Plan：清单和分支箭头，表示多种子查询。③ Candidates：纸片堆和放大镜，表示召回候选。中间画一个大的“Audit Snapshot”证据盒，用淡黄色高亮，盒子内放 4 个短标签：Selected、Rejected、Projection、Citation Map，其中 Citation Map 用引用标签图标并轻微高亮。右侧输出区画 3 个去向：Model Input 工作台、Replay 回放按钮、Trace Audit 放大镜账本。用手绘箭头表示同一份 snapshot 同时服务模型输入、回放和失败归因。

高亮：用淡黄色强调“Audit Snapshot”证据盒和“Citation Map”。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：节点标签短；底部可留出一行手写金句位置：“缓存为速度，快照为事实”。如果中文文字不稳定，则只留空白区域给后期添加。

整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。元素清晰，层次明确，箭头关系明确。

4. 负向提示词
不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
