# photo-01: 一、故事要从一个"只能说话"的模型开始

Article: src/content/blog/zh/AI/1.概念介绍/03.从对话到干活-Agent.md
Section: 一、故事要从一个"只能说话"的模型开始
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/03--agent/photo-01-item-1c39eebc.jpg

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

先沿用前文的结论：LLM 最基础的能力，是根据上下文生成后续内容。它能解释、能总结、能写代码，也能按 Prompt 组织答案。

但这里有一个非常现实的边界：

**会说，不等于会做。**

你问它：


它可以回答：

- 可能是 token 没保存

- 可能是路由守卫拦截

- 可能是 cookie 跨域问题

- 可能是登录成功后的 redirect 参数丢了

这些回答可能很有帮助，但它仍然停留在"建议"层面。

真正修 bug 需要的是另一组动作：

- 读取项目文件

- 搜索登录相关代码

- 打开路由配置

- 修改源码

- 运行测试

- 根据报错继续调整

这些动作都发生在模型外部。模型本身不能直接读你的硬盘，不能直接敲命令，也不能直接改文件。

于是，第一个问题出现了：

**如果模型只能生成文字，它怎么才能对真实世界产生影响？**

最直接的答案是：

**给它工具。**
