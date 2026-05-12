# photo-02: 1.2 它能做什么，不能做什么

Article: src/content/blog/zh/AI/1.概念介绍/01.LLM的原理.md
Section: 1.2 它能做什么，不能做什么
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/01-llm/photo-02-1-2.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

![LLM 到底在做什么：从猜词到生成的完整链路 - 1.2 它能做什么，不能做什么](./assets/01-llm/photo-01-1-2.png)

最容易误解的一点是：它"看起来懂"，不等于它"像人一样真的懂"。

它没有生活经验、情绪、自我意识，也没有一个稳定不变的"世界模型"藏在脑子里。它更像一个极其强大的语言模式压缩器（compressor，把大量文本规律压进模型参数的信息处理机制）。

正因如此，它有时会说得头头是道，却把事实说错。这就是幻觉（hallucination，LLM 编造看似合理但实际虚假的内容）。

模型的目标是"生成一个看起来合理、语言上顺滑、上下文接得住的话"，不是"像数据库那样只返回经过校验的真相"。所以当问题超出它的把握、资料缺失、或者你的提示不够清楚时，它可能"硬着头皮编一个像样的答案"。

对使用者来说，最实用的认知是这三句：

1. LLM 本质上是一个超级强的语言预测器。

2. 因为训练数据特别大，它表现得像会很多通用技能。

3. 它很强，但不可靠到可以盲信。事实、数字、最新信息、严肃决策，一律要校验。
