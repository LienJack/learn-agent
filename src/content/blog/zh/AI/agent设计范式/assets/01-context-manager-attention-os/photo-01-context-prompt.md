# photo-01: 一、从第一性原理定义 Context

Article: src/content/blog/zh/AI/agent设计范式/01-context-manager-attention-os.md
Section: 一、从第一性原理定义 Context
Asset target: src/content/blog/zh/AI/agent设计范式/assets/01-context-manager-attention-os/photo-01-context.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

很多 Agent demo 会把上下文理解成一个不断追加的 `messages[]`：


这个模型能跑最小 demo，但它撑不起一个成熟 Agent。

因为成熟 Agent 的上下文不只是聊天记录。它还包含用户目标、当前任务状态、历史决策、工具调用证据、文件和环境状态、长期记忆、压缩摘要、分支会话、预算控制、权限边界和验证结果。

`messages[]` 只是其中一层，而且通常不是最可靠的一层。

更稳定的定义应该是：


也就是：

> **某一时刻的上下文，是 Agent 为了完成下一步判断、行动和表达所需的信息环境。**

这带来一个重要转变：


Context Manager 要持续回答这些问题：


这个抽象比较耐久。即使未来模型上下文窗口越来越大，Agent 仍然需要处理注意力噪音、证据溯源、权限隔离、记忆污染、状态恢复、分支探索、成本预算和可解释性问题。

这一章的新口径可以先压成一句话：

**不要把 Context Manager 设计成一个 `messages[]` 拼接器，而要把它设计成“事件溯源 + 状态投影 + 上下文编译 + 可审计压缩”的运行时系统。**

换句话说：


我们仍然沿用前文的例子：一个 CLI Agent 正在修复测试失败。它读文件、跑测试、改代码、再验证。任务一长，context 管理就从“拼 prompt”变成了“管理运行时现场”。
