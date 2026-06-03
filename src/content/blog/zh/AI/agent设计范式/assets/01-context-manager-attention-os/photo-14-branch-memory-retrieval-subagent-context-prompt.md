# photo-14: 九、Branch、Memory、Retrieval 与 Subagent 都不能绕过 Context Manager

Article: src/content/blog/zh/AI/agent设计范式/01-context-manager-attention-os.md
Section: 九、Branch、Memory、Retrieval 与 Subagent 都不能绕过 Context Manager
Asset target: src/content/blog/zh/AI/agent设计范式/assets/01-context-manager-attention-os/photo-14-branch-memory-retrieval-subagent-context.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

很多上下文系统后期失控，是因为外部能力绕开了 Context Manager。

长期记忆一旦可以直接进入 prompt，就会把未验证经验变成当前事实。

检索结果一旦可以直接进入 prompt，就会把相似文本变成证据。

子 Agent 一旦可以直接把长报告塞回主上下文，就会把隔离上下文重新污染回来。

所以这三类能力都应该按同一条路进入模型输入：


Memory 要有 scope、confidence、TTL、source refs。

Retrieval 要有 query plan、citation、permission boundary、audit snapshot。

Subagent 要返回 summary、evidence refs、artifacts、risks 和 next steps，而不是只返回一段“我完成了”。

这就是为什么前面的 Memory Governance、Scoped Retrieval、Delegation Runtime 不是额外专题，而是 Context Manager 的外围血管。

它们最终都要回到同一个问题：


复杂任务也天然不是线性的。Agent 经常会：


所以 session 应该天然支持树结构：

![Context Manager 新范式：Agent 的注意力操作系统 flow 5](./assets/01-context-manager-attention-os/mermaid-05.png)

推荐抽象：


一句话：

> **分支是探索隔离，subagent 是上下文隔离。**
