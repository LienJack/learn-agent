# photo-03: 6. 它可能出错后拉不回来

Article: src/content/blog/zh/AI/1.概念介绍/04.如何让Agent更好干活-Harness.md
Section: 6. 它可能出错后拉不回来
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/04-agent--harness/photo-03-6.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

真实环境里，失败不是例外，而是常态。

搜索可能不准，测试可能失败，API 可能超时，依赖可能缺失，工具返回可能太长，模型判断也可能错。

如果系统没有恢复机制，Agent 一旦走错，就会在错误路径上越补越多。最后你看到的不是一个清晰的失败，而是一团“它好像做了很多但不知道做到哪了”的中间态。

所以，Agent 的核心矛盾变成：

**我们已经让模型能动起来了，但还没有让它像一个稳定系统那样工作。**

这就是 Harness 要解决的问题。
