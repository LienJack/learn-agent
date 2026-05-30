# photo-03: 工具不是魔法，而是宿主程序开放的能力

Article: src/content/blog/zh/AI/1.概念介绍/03.从对话到干活-Agent.md
Section: 工具不是魔法，而是宿主程序开放的能力
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/03--agent/photo-03-item-02e9c305.jpg

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

这里要特别注意一件事：

**工具不是模型自己变出来的能力，而是宿主程序提前提供给模型的能力。**

所谓宿主程序，可以理解成包住模型的那个应用，比如：

- ChatGPT

- Claude Code

- Cursor

- Codex

- 一个你自己写的 Agent 框架

宿主程序告诉模型：


模型要做的是判断"现在要不要用工具、用哪个工具、传什么参数"。

真正执行动作的，是外层程序。

所以工具系统解决的是：

**让模型有机会把语言判断转化成外部动作。**

但这马上带来了第二个问题：

**模型怎么稳定地告诉程序：我要调用哪个工具、参数是什么？**

如果模型只是输出一句自然语言：


程序很难稳定解析。它要猜：

- 这是普通回答，还是工具请求？

- 工具名是什么？

- 文件路径是哪一段？

- 参数有没有缺失？

于是，单纯有工具还不够。我们还需要一种结构化的调用格式。

这就引出了 `Function Calling`。
