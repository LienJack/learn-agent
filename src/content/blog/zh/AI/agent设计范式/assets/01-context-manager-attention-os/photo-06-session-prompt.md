# photo-06: Session：工作身份和生命周期

Article: src/content/blog/zh/AI/agent设计范式/01-context-manager-attention-os.md
Section: Session：工作身份和生命周期
Asset target: src/content/blog/zh/AI/agent设计范式/assets/01-context-manager-attention-os/photo-06-session.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

`session` 管的是这次 Agent 工作的身份、边界和分支关系。

最小字段可以先这样设计：


这里的重点不是字段多。

重点是 `session_id` 不只代表“一段聊天”。它还挂住工作目录、模型配置、权限配置、context budget、branch 关系和恢复位置。

如果没有这些信息，所谓 resume 就只能恢复一段聊天，而不能恢复一个工作现场。
