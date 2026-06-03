# photo-17: 十四、和前面几章的关系

Article: src/content/blog/zh/AI/agent设计范式/01-context-manager-attention-os.md
Section: 十四、和前面几章的关系
Asset target: src/content/blog/zh/AI/agent设计范式/assets/01-context-manager-attention-os/photo-17-item-cc93ad2b.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

这一章不是推翻前文，而是把前文重新放到一张更大的图里：

| 章节 | 在新范式里的位置 |
| --- | --- |
| 00-13 Tool Runtime | 工具副作用和 observation 的生产者 |
| 00-15 Context Policy | Context Builder 内部的投影策略 |
| 00-16 Session Replay | Event Log 和 State Projection 的恢复机制 |
| 00-19 Trace Analysis | 从 Event Log 投影出的诊断视图 |
| 00-20 Memory Governance | Memory 进入 Context Builder 前的写入治理 |
| 00-21 Scoped Retrieval | Retrieval 进入 Context Builder 前的证据治理 |
| 00-23 Hosted Harness | 把 session、event、artifact、sandbox 放进 durable runtime |

所以新的主线可以这样记：

![Context Manager 新范式：Agent 的注意力操作系统 flow 7](./assets/01-context-manager-attention-os/mermaid-07.png)

到这里，Context Manager 就不再是一个 prompt 工具函数。

它变成了 Agent Harness 的运行时中枢。

最后把这一章收成一句话：

**Context Manager 不是聊天历史管理器，而是 Agent 的注意力、记忆和行动边界的操作系统。**

一旦这个边界立住，Agent 的长期运行才有地基。

---

GitHub 地址: [01-context-manager-attention-os.md](https://github.com/LienJack/learn-agent/blob/main/src/content/blog/zh/AI/agent设计范式/01-context-manager-attention-os.md)
