# photo-03: 三、新范式：Context 是编译产物，不是事实源

Article: src/content/blog/zh/AI/agent设计范式/01-context-manager-attention-os.md
Section: 三、新范式：Context 是编译产物，不是事实源
Asset target: src/content/blog/zh/AI/agent设计范式/assets/01-context-manager-attention-os/photo-03-context.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

错误范式是：


这种设计早期快，但后期会遇到一堆问题：


更稳的分层是这样：


这四层里，只有最后一层会真正发送给模型。

前面三层都属于 Harness 的运行时控制面。

可以用一张表固定边界：

| 层 | 回答的问题 | 是否事实源 | 是否可以压缩 |
| --- | --- | --- | --- |
| Raw Event Log | 实际发生过什么？ | 是 | 不应该被摘要覆盖 |
| State Projection | 当前现场是什么？ | 否，是投影 | 可以重建 |
| Context Builder | 这一轮模型该看什么？ | 否，是编译器 | 每轮重算 |
| Model Request | 模型实际收到什么？ | 否，是快照 | 可以保存引用 |

这就是新范式里最重要的一步：

**LLM context 是运行时编译产物，不是系统事实源。**

更完整地说：


可以画成：

![Context Manager 新范式：Agent 的注意力操作系统 flow 1](./assets/01-context-manager-attention-os/mermaid-01.png)

所以，**发给模型的上下文只是一次临时视图**。它可以被压缩、裁剪、重排、脱敏、适配不同模型协议，但不能成为系统唯一事实来源。

一句话：

> **Context 是编译产物，不是数据库。**

只要接受这件事，很多设计会自然清楚。

原始历史尽量不丢。

模型上下文可以丢、可以压缩、可以重建。

summary 是派生物，不是源数据。

推理链路保存可审计证据，不依赖隐藏 chain-of-thought。

会话是树，不只是线性数组。

Context budget 是资源分配，不是简单截断。
