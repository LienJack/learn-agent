# photo-02: 二、Tools 为什么会出现：因为模型需要"手"

Article: src/content/blog/zh/AI/1.概念介绍/03.从对话到干活-Agent.md
Section: 二、Tools 为什么会出现：因为模型需要"手"
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/03--agent/photo-02-tools.jpg

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

`Tools（工具，模型执行外部动作的能力接口）` 解决的是第一个缺口：

**模型会判断下一步该做什么，但它自己没有执行动作的能力。**

你可以把模型想成一个很聪明但坐在玻璃房里的人。他能看懂任务，也能提出方案，但他碰不到外面的文件、浏览器、数据库和命令行。

工具系统的作用，就是在玻璃房外面给他接几只手。

比如在编程 Agent 里，常见工具可能包括：

- `Read`：读取文件

- `Search`：搜索代码

- `Edit`：修改文件

- `Bash`：执行命令

- `Browser`：打开网页或操作浏览器

- `Test`：运行测试或构建

回到我们修登录 bug 的例子。模型如果只聊天，只能说：


但有了工具以后，它就可以发起一个动作请求：


外层程序执行这个读取动作，把文件内容拿回来，再塞回模型上下文。模型看到文件后，再决定下一步要不要继续搜索、修改或测试。

这时，LLM 就不再只是"回答问题"，而是开始参与一个任务执行流程。
