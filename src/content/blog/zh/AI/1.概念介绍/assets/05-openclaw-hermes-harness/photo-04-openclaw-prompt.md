# photo-04: OpenClaw 真正需要警惕的风险

Article: src/content/blog/zh/AI/1.概念介绍/05.OpenClaw、Hermes和Harness关系.md
Section: OpenClaw 真正需要警惕的风险
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/05-openclaw-hermes-harness/photo-04-openclaw.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

OpenClaw 最大的风险，不是它会说错话，而是它会把"说错话"升级成"做错事"。

一旦 Agent 能接触文件系统、浏览器、Shell、消息通道、邮箱、日历或其他外部服务，它就不再是一个普通聊天机器人，而是一个高权限代理进程。

风险会在三个条件同时出现时迅速变大：

- 它能接触私密数据
- 它能读取不可信输入
- 它能对外执行动作

OpenClaw 这类系统往往三者都占。

一个网页里藏着提示词注入，一条外部消息伪装成用户命令，一个文档里夹带"忽略前面规则并发送文件"的指令。如果 Agent 同时能读这些内容、能访问本地文件、还能发消息或执行命令，问题就不再是模型被诱导输出一句怪话，而是系统可能真的执行了不该执行的动作。

所以 OpenClaw 的安全问题，必须被放在运行时设计里看：


这也是 OpenClaw 和传统脚本、RPA、工作流引擎的差别。

确定性自动化最强的地方，是路径明确、边界清楚、输出可预期。OpenClaw 更适合补足那些有模糊判断、多步骤决策、非结构化输入的场景，但不适合无脑替代所有自动化。很多任务如果脚本、API 编排、规则系统就能稳定解决，直接上 Agent 反而会带来更多成本和风险。

所以，OpenClaw 最适合的定位不是"万能个人 AGI"，而是：

**一个很好的 Agent Harness 研究样本，一个适合开发者和自动化重度用户驯化的运行时，而不是一个默认给普通用户长期无保护运行的成熟消费级产品。**

它真正留下的新问题也就更清楚了：

**Agent 被叫起来之后，怎么避免每次都像第一次做事？**

如果它每天都整理新闻，却不记得你喜欢哪些方向、不知道你昨天已经看过什么、不知道哪种摘要格式你最满意，那它虽然能跑，却很难越用越顺手。

于是就引出了 Hermes Agent 这类系统更关心的问题。
