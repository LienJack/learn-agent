1. 图解类型
state sequence，因为这一节讲 skill 不能直接上线，而是要经过 draft、candidate、canary、active、deprecated、archived 等可审计状态。

2. 画面元素清单
6 个状态卡：draft、candidate、canary、active、deprecated、archived；上方有 Eval Gate 和 Human Review；下方有 Rollback 和 Release Diff；淡黄色高亮“Canary”和“Rollback”。

3. 正向图片提示词
画一张文章内技术解释图，主题是 skill 发布与回滚的治理状态机。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘状态图，清晰、克制、有工程草图感。

构图：横向状态序列。画面中间从左到右排列 6 张状态卡，并用手绘箭头连接：draft、candidate、canary、active、deprecated、archived。状态序列上方画两个治理检查点：Eval Gate 和 Human Review；状态序列下方画 Release Diff 记录纸和 Rollback 回退箭头。canary 到 active 的箭头比较醒目，active 到 rollback 的回退箭头也清楚可见。

节点：
① Draft：草稿纸，表示不可默认调用。
② Candidate：候选卡，表示可进入 eval。
③ Canary：小范围标签，用淡黄色高亮。
④ Active：可检索工具书，表示默认可用。
⑤ Deprecated：灰色兼容卡，表示不再默认使用。
⑥ Archived：档案盒，表示停用保留审计。
⑦ Eval Gate：测试闸门，表示发布前检查。
⑧ Rollback：回退箭头和版本标签，用淡黄色高亮。

高亮：用淡黄色强调“Canary”和“Rollback”，表达小范围发布和可逆演化。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：节点标签短；底部可留出一行手写金句位置：“自我升级必须可回滚”。如果中文文字不稳定，则只留空白区域给后期添加。

整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。元素清晰，层次明确，箭头关系明确。

4. 负向提示词
不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
