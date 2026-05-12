# photo-04: 三、Function Calling 为什么会出现：因为"想用工具"必须说成机器听得懂的话

Article: src/content/blog/zh/AI/1.概念介绍/03.从对话到干活-Agent.md
Section: 三、Function Calling 为什么会出现：因为"想用工具"必须说成机器听得懂的话
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/03--agent/photo-04-function-calling.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

`Function Calling（函数调用，LLM 生成结构化参数请求外部工具的标准格式）` 解决的是第二个问题：

**模型不能只用自然语言表达"我想干什么"，它需要按约定输出一个可解析的工具调用请求。**

直白地说就是：

模型不能只说：


它最好能说成：


这样外层程序就不用猜了。它可以很明确地知道：

- 模型想调用 `read_file`

- 参数是 `path`

- 路径是 `src/auth.ts`

这就是 Function Calling 的核心价值。

它不是让模型"真的在内部执行函数"，而是让模型生成一个结构化请求。真正的函数执行，仍然发生在应用程序这一侧。
