# photo-09: Artifact：大对象和证据实体

Article: src/content/blog/zh/AI/agent设计范式/01-context-manager-attention-os.md
Section: Artifact：大对象和证据实体
Asset target: src/content/blog/zh/AI/agent设计范式/assets/01-context-manager-attention-os/photo-09-artifact.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

`Artifact` 保存完整证据，而不是把所有东西塞进 prompt。


正确模式是：


这对 coding agent 尤其重要。文件全文、测试日志、命令输出、截图、diff 都可能很大，不应该直接进入 message history。
