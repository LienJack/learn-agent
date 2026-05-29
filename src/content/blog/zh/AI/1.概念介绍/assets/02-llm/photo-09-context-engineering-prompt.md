# photo-09: 七、为什么现在大家更常说 Context Engineering

Article: src/content/blog/zh/AI/1.概念介绍/02.如何让LLM更聪明.md
Section: 七、为什么现在大家更常说 Context Engineering
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/02-llm/photo-09-context-engineering.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

当你把前面三部分都串起来后，就会自然理解为什么今天很多工程讨论里，开始更常出现另一个词：

`Context Engineering（上下文工程）`

这个词你不用现在就背得很重。对入门来说，只要先抓住它想强调的一件事：

**真正让系统好用的，往往不是"有没有 Prompt"或"有没有 RAG"，而是你怎么组织整张资料桌。**

也就是：

- 哪些信息该进来

- 哪些信息不该进来

- 哪些要排前面

- 哪些要压缩

- 哪些要丢掉

- 哪些该从外部检索后再补进来

你会发现，这已经不是单点技巧了，而是一整套"信息喂养工程"。

还是拿我们的例子说。

如果用户问的是 Redis 缓存雪崩，你当然可以暴力把整个 Redis 知识库全塞进模型。但这通常不是最优方案。更好的方案往往是：

1. 先把问题表达清楚

2. 再检索出最相关的几段

3. 把真正关键的处理办法放进上下文

4. 把无关内容压掉

5. 最后再让模型生成一版面向新人的解释

这就是为什么现代系统越来越强调的，不只是"模型够不够强"，而是"上下文组织得够不够好"。

换句话说，今天很多看起来像"模型更聪明了"的效果，其实背后是：

**任务说明更清楚了，资料桌更干净了，补资料的机制也更顺了。**
