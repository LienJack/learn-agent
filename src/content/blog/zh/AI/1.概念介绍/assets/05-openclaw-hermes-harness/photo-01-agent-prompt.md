# photo-01: 一、故事要从"Agent 已经能动起来"开始

Article: src/content/blog/zh/AI/1.概念介绍/05.OpenClaw、Hermes和Harness关系.md
Section: 一、故事要从"Agent 已经能动起来"开始
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/05-openclaw-hermes-harness/photo-01-agent.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

前文已经讲过：[[03.从对话到干活-Agent#四、Agent 为什么会出现：因为真实任务不是一次问答，而是一串循环|Agent]] 不是模型突然长出了手脚，而是模型外面接了一套工具、状态和执行循环。

一个最小 Agent 大概长这样：


这一步解决的是"模型怎么从说话变成做事"。

但一旦 Agent 真的能做事，新的问题马上出现：

**它在哪里做事？谁能叫醒它？记不记得以前做过什么？能不能碰文件、浏览器、终端、密钥和生产环境？出了事谁负责？**

这时就不能只说"模型 + 工具"了。

真实 Agent 系统需要的是一整套外壳：

- 入口：消息从哪里来
- 上下文：模型每轮看到什么
- 工具：它能调用什么能力
- 状态：它做到哪一步
- 记忆：什么经验应该留下来
- 调度：它什么时候被唤醒
- 权限：哪些动作能直接做，哪些必须确认
- 审计：做过什么能不能追踪
- 验收：怎么判断真的完成

这套外壳，就是前文专门讲过的 [[04.如何让Agent更好干活-Harness#三、Harness 到底是什么|Agent Harness]]。这里可以直接沿用那个公式：


模型之外，所有让 Agent 能稳定、可控、可恢复、可审计地工作起来的工程系统，都可以放进 Harness 这个大框里理解。

接下来再看 OpenClaw、Hermes Agent 和 Harness.io，就清楚多了。
