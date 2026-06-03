# photo-12: 七、Compaction：语义蒸馏，不是文本缩短

Article: src/content/blog/zh/AI/agent设计范式/01-context-manager-attention-os.md
Section: 七、Compaction：语义蒸馏，不是文本缩短
Asset target: src/content/blog/zh/AI/agent设计范式/assets/01-context-manager-attention-os/photo-12-compaction.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

长任务一定会遇到上下文窗口。

压缩不是：


压缩应该是：


一次好的 compaction 至少应该产出三类东西：


不要把这三者混成一坨自然语言 summary。

最危险的压缩设计是：


这会把系统事实源从可检查事件变成一段 lossy 自然语言。

更稳的设计要分两层：


也可以把它理解成一条有审计边界的语义蒸馏链：

![Context Manager 新范式：Agent 的注意力操作系统 flow 4](./assets/01-context-manager-attention-os/mermaid-04.png)

原则很简单：


一个合格 compaction record 至少应该有这些字段：


压缩之后还应该跑轻量检查：


几个硬规则可以直接写成测试：


Compaction 的目标不是“让上下文变短”。

它的目标是让上下文变短之后，Agent 仍然知道自己是谁、在做什么、做过什么、下一步该往哪走。
