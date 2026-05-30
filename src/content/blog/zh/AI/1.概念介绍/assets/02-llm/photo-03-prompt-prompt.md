# photo-03: Prompt 没解决的问题：模型还是可能“按要求胡说八道”

Article: src/content/blog/zh/AI/1.概念介绍/02.如何让LLM更聪明.md
Section: Prompt 没解决的问题：模型还是可能“按要求胡说八道”
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/02-llm/photo-03-prompt.jpg

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

这里有个边界一定要讲清楚。

`Prompt` 解决的是：

**模型该做什么、按什么方式做、做成什么样。**

但它没解决的是：

**模型凭什么知道这些事实。**

比如，你现在要求它：


这时候就算 Prompt 写得很漂亮，也只是把"要求"写清楚了。可如果模型根本没见过你们公司的知识库，它还是可能出现两种情况：

- 要么直接不知道

- 要么开始一本正经地乱猜

也就是说，Prompt 解决的是"怎么提需求"，不是"资料从哪来"。

这就引出了第二个概念：

**既然任务说明不等于资料本身，那模型在回答前到底看到了哪些材料？**

这个问题，引出了 `Context`。
