# photo-05: 四、Agent 为什么会出现：因为真实任务不是一次问答，而是一串循环

Article: src/content/blog/zh/AI/1.概念介绍/03.从对话到干活-Agent.md
Section: 四、Agent 为什么会出现：因为真实任务不是一次问答，而是一串循环
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/03--agent/photo-05-agent.jpg

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

`Agent（智能体，能自主决策并调用外部工具完成多步骤任务的 AI 系统）` 最容易被神化，但从工程角度看，它可以先粗暴理解成：

**模型外面那层负责循环、状态、工具、权限和上下文的执行壳。**

它解决的是第三个问题：

**一次工具调用不够，真实任务需要系统持续判断、持续行动、持续观察结果。**

普通聊天像这样：


带工具的一次调用像这样：


而 Agent 更像这样：


这就是很多 Agent 系统的核心循环，也常被叫作 `Agent Loop（Agent 执行循环，模型反复进行"思考→行动→观察"直到任务完成或终止）`。
