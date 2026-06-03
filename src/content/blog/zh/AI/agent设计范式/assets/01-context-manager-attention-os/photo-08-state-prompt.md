# photo-08: State：当前现场

Article: src/content/blog/zh/AI/agent设计范式/01-context-manager-attention-os.md
Section: State：当前现场
Asset target: src/content/blog/zh/AI/agent设计范式/assets/01-context-manager-attention-os/photo-08-state.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

`state` 是从 event log 投影出来的当前工作态。

它不等于历史消息。


`state` 是压缩后仍能继续工作的核心。

即使早期自然语言对话被压成 summary，下面这些东西也不能糊：


如果这些只藏在旧 messages 里，compaction 之后 Agent 就会失忆。

如果它们进入 state projection，context 可以随时重建。
