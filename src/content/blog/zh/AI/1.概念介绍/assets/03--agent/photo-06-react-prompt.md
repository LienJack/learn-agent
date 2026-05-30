# photo-06: ReAct 范式：边想边做，边做边看

Article: src/content/blog/zh/AI/1.概念介绍/03.从对话到干活-Agent.md
Section: ReAct 范式：边想边做，边做边看
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/03--agent/photo-06-react.jpg

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

很多 Agent 入门资料会提到 `ReAct（Reason + Act，推理与行动交替的 Agent 工作范式）`。有时也会被写成 `Reason + Act`，也就是"推理 + 行动"。

它解决的其实正是这个循环问题：

**模型不能只在脑子里推理，也不能只盲目行动；它需要在推理和行动之间交替。**

一个经典的 ReAct 轨迹大概是：


它的关键不是格式本身，而是三件事：

- `Thought`：模型维护当前计划和判断

- `Action`：模型发起外部动作

- `Observation`：工具结果回到模型，影响下一步判断

所以 ReAct 可以看成一种最朴素的 Agent 工作方式：

**想一下，做一步，看结果，再想下一步。**

这听起来很简单，但非常重要。因为真实世界的任务充满不确定性。你不知道搜索会搜到什么，不知道测试会报什么错，也不知道第一次修改是否正确。

Agent 之所以有用，就是因为它不是一次性把完整答案猜完，而是允许模型在执行过程中不断修正。
