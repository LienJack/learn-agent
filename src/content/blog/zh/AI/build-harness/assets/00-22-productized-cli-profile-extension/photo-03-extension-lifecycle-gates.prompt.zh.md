1. 图解类型

水平管线图，因为重点是解释 extension 从安装到真正执行之间要经过多道门：verify、trust、load、catalog、discovery、permission、tool runtime。

2. 画面元素清单

一条从左到右的 extension 生命周期管线。节点：Install、Verify、Trust、Manifest、Catalog、Visible Set、Permission Gate、Tool Runtime。用淡黄色高亮 Trust 和 Permission Gate。图标隐喻：下载盒、校验章、锁和盾牌、清单纸、目录抽屉、聚光灯、闸门、扳手。

3. 正向图片提示词

画一张文章内技术解释图，主题是 Agent CLI 的 extension 从安装到受控执行的生命周期。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：水平管线图。画面从左到右排列 8 个节点，用手绘箭头连接。每个节点像一张小卡片或小圆角标签，但保持手绘线稿感。管线下方有一条很细的辅助线，表示 extension 必须逐步进入 Harness 纪律。

节点：① Install：下载盒图标，表示文件落地。② Verify：校验章图标，表示版本、来源、checksum。③ Trust：锁和盾牌图标，表示用户或组织策略信任。④ Manifest：清单纸图标，表示声明 provider、tool、skill、hook。⑤ Catalog：目录抽屉图标，表示候选能力目录。⑥ Visible Set：聚光灯图标，表示本轮可见能力。⑦ Permission Gate：闸门图标，表示参数、风险和审批。⑧ Tool Runtime：扳手图标，表示受控执行和 observation。

高亮：用淡黄色强调 Trust 和 Permission Gate，表达安装不是启用，可见不是可执行。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：节点标签短；底部可留一行手写金句位置：“安装不是启用，可见不是可执行”。如果中文文字不稳定，则只留空白区域给后期添加。

整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。元素清晰，层次明确，箭头关系明确。

4. 负向提示词

不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
