1. 图解类型
分层架构图，因为 State、Context、Memory、Session log 是不同持久性和投影关系的层。

2. 画面元素清单
4 层：Session log、State、Context、Memory。用箭头表现 State 从 Session log 聚合而来，Context 是 State 给模型的一次投影，Memory 是可复用的长期知识。高亮 Context 投影和 Session log 事实源。

3. 正向图片提示词
画一张文章内技术解释图，主题是“State、Context、Memory、Session log 的边界关系”。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：分层架构图。底层画 Session log：一串按时间排列的小事件卡片，表示事实源，使用淡黄色高亮。中层画 State：几张汇总卡片，表示当前任务现场。右侧画 Memory：小书架或资料盒，表示跨任务可复用知识。上层画 Context：一个漏斗把 State 和 Memory 的一部分投影到模型窗口，Context 节点使用淡黄色高亮。箭头从 Session log 到 State，从 State 和 Memory 到 Context，再从 Context 指向小模型窗口。

背景用很淡的电路线和工程辅助线。标签短，不要解释长句。底部留空白金句区域。整体像手绘系统分层图。

4. 负向提示词
不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 6 个主节点，不要生成长段中文文字。
