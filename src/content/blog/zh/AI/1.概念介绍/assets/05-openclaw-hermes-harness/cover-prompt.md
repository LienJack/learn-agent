# cover: OpenClaw、Hermes 和 Harness：它们到底是什么关系

Article: src/content/blog/zh/AI/1.概念介绍/05.OpenClaw、Hermes和Harness关系.md
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/05-openclaw-hermes-harness/cover-openclaw-hermes-harness.png

Use the imagegen skill to create a blog article cover image.

## Article metadata

Title: OpenClaw、Hermes 和 Harness：它们到底是什么关系
Description: 梳理 OpenClaw、Hermes Agent 与 Harness 在 Agent 体系中的分层、定位与关系。
Tags: AI, Agent, OpenClaw, Hermes, Harness, HarnessEngineering

## Article excerpt

# OpenClaw、Hermes 和 Harness：它们到底是什么关系 很多人第一次看到 `OpenClaw`、`Hermes Agent`、`Harness` 这几个名字，会有一种很自然的混乱： 它们是不是同一种东西？ 是不是谁比谁更高级？ 是不是 OpenClaw 和 Hermes 都是在做 Harness？ 那 Harness 到底是一个产品，还是一种架构思想？ 如果上来直接给定义，反而会越讲越绕。更好的方式是先回到 Agent 真正遇到的问题。 **当大模型从"会聊天"变成"能替你做事"以后，最难的已经不是回答问题，而是把它放进什么样的运行环境里。** 这是理解三者关系的入口： 先说明一个小细节：`Hermes Agent` 和 `Harness` 只差几个字母，但说的不是同一个东西。前者是一个具体系统，后者在这里主要指 Agent 外层运行系统这类架构思想。 为了让这篇文章不飘，我们固定一个例子： 这件事看起来像一句"让 AI 帮我自动化"。但拆开以后，你会发现它至少包含三层不同问题： - 它怎么从 Telegram、飞书、Slack 或网页入口被叫起来？ - 它怎么记住我的偏好、历史任务和常用处理方式？ - 它怎么在企业工程流程里安全执行、审计、审批和回滚？ OpenClaw、Hermes Agent、Harness.io 的差别，就藏在这三层问题里。 ## 一、故事要从"Agent 已经能动起来"开始 前文已经讲过：[[03.从对话到干活-Agent#四、Agent 为什么会出现：因为真实任务不是一次问答，而是一串循环|Agent]] 不是模型突然长出了手脚，而是模型外面接了一套工具、状态和执行循环。 一个最小 Agent 大概长这样： 这一步解决的是"模型怎么从说话变成做事"。 但一旦 Agent 真的能做事，新的问题马上出现： **它在哪里做事？谁能叫醒它？记不记得以前做过什么？能不能碰文件、浏览器、终端、密钥和生产环境？出了事谁负责？** 这时就不能只说"模型 + 工具"了。 真实 Agent 系统需要的是一整套外壳： - 入口：消息从哪里来 -

## Output requirements

Return a ready-to-use image prompt and negative prompt.

Preferred visual direction:
- Article hero / cover image, not an in-body diagram.
- Wide landscape composition suitable for blog cards and article header.
- Editorial technical illustration style.
- Strong first-glance signal of the article topic.
- Avoid dense text, UI screenshots, tiny labels, photorealism, dark backgrounds, neon colors, and clutter.
- If text rendering is uncertain, leave clean negative space for the title instead of generating long Chinese text.
