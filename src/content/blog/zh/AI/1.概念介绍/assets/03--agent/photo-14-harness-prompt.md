# photo-14: 十一、今天为什么会继续走向 Harness

Article: src/content/blog/zh/AI/1.概念介绍/03.从对话到干活-Agent.md
Section: 十一、今天为什么会继续走向 Harness
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/03--agent/photo-14-harness.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

如果只看到 Agent Loop，我们会以为问题已经解决了：

模型会想，工具会做，循环会推进。

但真正做过复杂任务后，会发现新的问题马上出现：

- 工具越来越多，怎么选才不乱？

- 上下文越来越长，怎么压缩才不丢任务？

- 权限越来越复杂，怎么既安全又不频繁打断？

- 多个 Agent 并行时，怎么分工和合并结果？

- 执行失败后，怎么恢复、重试、回滚？

- 用户怎么知道 Agent 现在卡在哪里？

这些问题已经不只是"有没有 Agent"了，而是：

**怎样给 Agent 提供一个可靠、可控、可观察的执行环境。**

这就会引出下一层概念：`Harness（Agent 运行底座，把模型、工具、权限、上下文、任务状态、日志、执行环境组织在一起的完整运行时框架）`。

你可以先把 Harness 粗略理解成：

**把模型、工具、权限、上下文、任务状态、日志、执行环境组织在一起的 Agent 运行底座。**

如果说 Agent 是"会干活的循环"，那 Harness 更像"让这个循环在真实工程里稳定工作的车间"。

这也是为什么今天很多讨论会从 Agent 继续走向：

- Tool Harness

- Agent Runtime

- Context Engineering

- Permission System

- Observability

- Multi-agent Orchestration

因为真正难的不是让模型偶尔调一次工具，而是让它在复杂任务里持续、稳定、有边界地做事。
