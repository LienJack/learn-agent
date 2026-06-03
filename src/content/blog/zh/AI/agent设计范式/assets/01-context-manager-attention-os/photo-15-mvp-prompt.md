# photo-15: 十一、MVP 应该先做什么

Article: src/content/blog/zh/AI/agent设计范式/01-context-manager-attention-os.md
Section: 十一、MVP 应该先做什么
Asset target: src/content/blog/zh/AI/agent设计范式/assets/01-context-manager-attention-os/photo-15-mvp.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

不要一开始就做完所有模块。

本地 CLI Agent 的 MVP 可以先做这些：


暂时可以不做：


但 MVP 里最好一开始就保留几个能力：


这样即使系统还很小，边界也不会错。

第一版 `ContextManager` 可以只有这个接口：


复杂性藏进三个 pipeline：


这已经足够支撑一个可演进的 Harness。
