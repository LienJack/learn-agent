1. 图解类型

决策路径图，因为重点是解释多 provider 场景下，CLI 先根据 profile 和能力需求选择 provider，再把不同 provider 输出归一化成统一 ModelEvent，避免细节穿透用户体验。

2. 画面元素清单

左侧输入：Model Request。中间决策节点：Capability Need、Profile Preference、Provider Resolver。右侧两条分支：Provider A、Provider B fallback。分支汇入统一 ModelEvent，再进入 Core Runtime 和 Stable UX。用淡黄色高亮 Provider Resolver 和 ModelEvent。图标隐喻：请求卡片、拼图能力块、路由分叉、两朵云、统一事件卡片、终端小窗口。

3. 正向图片提示词

画一张文章内技术解释图，主题是 multi-provider 如何通过 resolver 保持 Agent CLI 用户体验稳定。

画风：米白色纸张背景，黑色手绘签字笔线稿，线条粗细略不均，少量淡黄色高亮，editorial technical illustration，技术博客手绘流程图，清晰、克制、有工程草图感。

构图：从左到右的决策路径图。左侧是“Model Request”请求卡片，箭头进入“Capability Need”拼图块，再进入“Profile Preference”配置便签，然后进入中央分叉节点“Provider Resolver”。Resolver 右侧分成上下两条路径：上方是“Provider A”云端接口，下方是“Provider B fallback”云端接口和回退箭头。两条路径最终汇入同一个“ModelEvent”事件卡片，再进入“Core Runtime”和“Stable UX”终端窗口。

节点：① Model Request：请求卡片，表示内部模型请求。② Capability Need：拼图块，表示 streaming、tool-intent、large-context 等能力需求。③ Profile Preference：便签和滑杆，表示 profile 的模型偏好。④ Provider Resolver：分叉路标，表示选择主 provider 或 fallback。⑤ Provider A / Provider B：两朵云端接口，表示不同供应商。⑥ ModelEvent：统一事件卡片，表示归一化输出。⑦ Stable UX：终端小窗口，表示用户体验不随 provider 变化。

高亮：用淡黄色强调 Provider Resolver 和 ModelEvent，表达 provider 差异要停在 resolver/adapter 内部。

背景：很淡的电路线、节点连线和工程草图辅助线，不要抢主体。

文字：节点标签短；底部可留一行手写金句位置：“Provider 可以换，控制语义不能换”。如果中文文字不稳定，则只留空白区域给后期添加。

整体感觉像技术博客中的手绘机制图，不是产品 UI，不是正式架构图。元素清晰，层次明确，箭头关系明确。

4. 负向提示词

不要照片写实，不要 3D，不要复杂 UI 截图，不要大量代码，不要密集小字，不要复杂表格，不要赛博朋克，不要霓虹色，不要深色背景，不要彩色卡通，不要复杂阴影，不要过多装饰，不要超过 8 个主节点，不要让背景电路线比主体更明显，不要生成长段中文文字。
