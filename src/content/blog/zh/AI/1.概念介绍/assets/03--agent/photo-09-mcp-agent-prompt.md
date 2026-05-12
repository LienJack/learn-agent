# photo-09: MCP 和 Agent 怎么结合

Article: src/content/blog/zh/AI/1.概念介绍/03.从对话到干活-Agent.md
Section: MCP 和 Agent 怎么结合
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/03--agent/photo-09-mcp-agent.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

在一个 Agent 系统里，MCP 通常不会单独工作。它会嵌在 Agent Loop 里。

大概流程是：


比如你让 Agent：


它可能会经历：


这里 GitHub 能力不是写死在 Agent 里面，而是通过 MCP 接进来的。

这就是 MCP 的价值：

**它让 Agent 的能力扩展从"每个工具单独硬接"变成"按协议接入一组外部能力"。**

（MCP 本身不会提升模型智力。它提升的是外部能力接入的标准化程度。如果没有好的工具设计和权限控制，接了 MCP 也可能只是让 Agent 多了一堆乱用的工具。）
