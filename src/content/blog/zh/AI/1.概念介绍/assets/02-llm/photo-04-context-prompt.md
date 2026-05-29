# photo-04: 三、Context 为什么会出现：因为只有任务，没有材料，模型还是干不好活

Article: src/content/blog/zh/AI/1.概念介绍/02.如何让LLM更聪明.md
Section: 三、Context 为什么会出现：因为只有任务，没有材料，模型还是干不好活
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/02-llm/photo-04-context.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

`Context（上下文）` 这个词，本质上就是对第二个问题的回答：

**模型这一次回答之前，手里到底拿到了哪些材料？**

所以你可以把 Context 理解成：

**模型在这一次调用里，能看到的全部信息。**

注意，是"全部信息"，不只是你刚刚打进去的那一句任务要求。

继续用我们那个例子：


如果这是一个真正的 AI 系统，那模型在生成答案之前，可能看到的不只是这句用户提问，还可能包括：

- System Prompt（定义 LLM 角色和行为底线的全局指令，用户通常不可见）：你是一个技术助理，回答要准确、简洁

- 用户当前问题

- 之前几轮对话历史

- 公司知识库里被找出来的几段相关文档

- 某个工具返回的检索结果

- 一些代码片段或配置示例

这些东西加在一起，才构成这次调用的 `Context`。

到这里你就能看出它和 Prompt 的关系了：

- `Prompt` 更强调"你怎么提要求"

- `Context` 更强调"模型当前到底看到了什么"

换句话说，Prompt 更像题目要求，Context 更像题目加上你桌上摊开的全部参考材料。
