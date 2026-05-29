# photo-02: 二、OpenClaw 为什么会出现：因为 Agent 需要"入口"和"控制平面"

Article: src/content/blog/zh/AI/1.概念介绍/05.OpenClaw、Hermes和Harness关系.md
Section: 二、OpenClaw 为什么会出现：因为 Agent 需要"入口"和"控制平面"
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/05-openclaw-hermes-harness/photo-02-openclaw-agent.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

先看我们的例子。

如果你希望每天早上收到 AI 整理的摘要，第一件事不是模型聪不聪明，而是：

**这个任务从哪里进入系统？**

你可能希望在飞书里发一句：


也可能希望它每天早上自动触发。或者在 Telegram、Discord、Slack、WebChat、手机节点里都能叫它。

这就是 OpenClaw 最容易让人兴奋的地方。

OpenClaw 的核心价值不是"它有一个独家大模型"，而是把 Agent 放进了一个多入口、多通道、可持续运行的控制平面里。

你可以把它想成一个个人 Agent 总机：


它解决的是：

**怎样让 Agent 不只停在网页聊天框里，而是接到你已经在用的消息入口、设备入口和自动化入口上。**

OpenClaw 的强项通常在这些地方：

- 多渠道触发：从聊天工具、网页、移动端或设备节点唤起 Agent
- 长期运行：通过 gateway、session、heartbeat、cron 维持持续工作感
- 工具接入：浏览器、文件、命令、消息发送、节点能力等
- workspace：用本地文件承载身份、规则、工具说明和记忆
- skills / plugins：把任务套路和运行时扩展接入系统

换句话说，OpenClaw 就是那个"让 Agent 能从各种地方被叫醒"的基础设施。很多人第一次用的时候会觉得"终于不用只在网页里跟 AI 聊天了"，就是这个感觉。

回到刚才那个早报例子，OpenClaw 更像是在解决：


所以说 OpenClaw 更像 `Personal Agent Control Plane`，也就是个人 Agent 控制平面。

但这里要降一降温。

OpenClaw 能把 Agent 接进现实入口，不代表它已经是一个成熟、稳定、低成本的个人助理。更准确地说，它是一个很有研究价值的 Agent 运行时样本：能跑，能做事，能把很多未来 Agent 的问题提前暴露出来，但离"普通人装上就能长期放心使用"还有明显距离。
