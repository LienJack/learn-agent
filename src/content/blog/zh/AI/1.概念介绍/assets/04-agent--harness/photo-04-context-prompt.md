# photo-04: Context 解决的是信息问题

Article: src/content/blog/zh/AI/1.概念介绍/04.如何让Agent更好干活-Harness.md
Section: Context 解决的是信息问题
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/04-agent--harness/photo-04-context.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

比如你让模型分析一份公司内部需求文档，结合历史评审意见找风险，再写一版发给产品经理的反馈稿。

这时光靠提示词没用。它至少要拿到：

- 当前需求文档
- 历史评审记录
- 团队规范
- 项目背景
- 当前任务目标
- 输出对象是谁
- 语气应该正式还是直接

这就是 [[02.如何让LLM更聪明#三、Context 为什么会出现：因为只有任务，没有材料，模型还是干不好活|Context]] Engineering 的问题：

**系统必须在合适的时机，把正确的信息送进模型上下文。**

这里的 context 不只是几段背景材料，而是所有影响模型当前决策的信息总和：

- 用户输入
- 历史对话
- 检索结果
- 工具返回
- 当前任务状态
- 中间产物
- 系统规则
- 安全约束
- 其他 Agent 传来的结构化结果

所以 [[02.如何让LLM更聪明#四、RAG 为什么会出现：因为当前上下文里没有答案时，系统得学会去外面找|RAG]]、记忆、检索、重排、压缩、[[03.从对话到干活-Agent#七、Skill 为什么会出现：因为 Agent 还需要"做事方法"|Skill]] 的渐进式披露，其实都可以放进 Context Engineering 里理解。

它解决的是：

**模型有没有拿到足够且正确的信息。**

但即使信息给对了，问题也没有结束。

因为 Agent 开始进入真实环境后，系统面对的已经不是“一次回答对不对”，而是“整条任务链路能不能跑通”。
