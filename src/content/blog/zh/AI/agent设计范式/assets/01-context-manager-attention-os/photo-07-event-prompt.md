# photo-07: Event：事实源

Article: src/content/blog/zh/AI/agent设计范式/01-context-manager-attention-os.md
Section: Event：事实源
Asset target: src/content/blog/zh/AI/agent设计范式/assets/01-context-manager-attention-os/photo-07-event.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

`event` 是最容易被低估的对象。

成熟 Agent 不应该只保存 message log，而应该保存 append-only event log。


为什么 event 比 message 更底层？

因为很多关键事实根本不是 message。

上下文构建时选了哪些片段，不是 message。

哪次工具调用被权限拒绝，不一定是 message。

某个文件被修改、某个 diff 被应用、某次验证失败、某次压缩触发，这些都应该是事件。

如果它们不进 event log，后面做 replay、trace、eval、audit 都会失去事实基础。
