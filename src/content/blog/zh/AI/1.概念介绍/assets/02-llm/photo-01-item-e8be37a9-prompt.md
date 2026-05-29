# photo-01: 一、故事要从一个“只会接话”的模型开始

Article: src/content/blog/zh/AI/1.概念介绍/02.如何让LLM更聪明.md
Section: 一、故事要从一个“只会接话”的模型开始
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/02-llm/photo-01-item-e8be37a9.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

前文讲过，[[01.LLM的原理#一、先建立直觉：LLM 是什么|大语言模型最底层做的事]]，本质上是 next token prediction：根据前文预测下一个 token。你可以先把它理解成一个"特别会接话的续写机器"。

这个起点很重要，因为后面所有概念，几乎都是在给这个"只会接话的模型"补能力。

一开始，你让它干活时遇到的第一个问题是：

**它虽然很会说，但它不知道你到底想让它怎么说。**

比如你丢一句：


这句话对人来说都很模糊，更别说对模型了。它会卡在很多岔路口上：

- 你要它讲定义，还是讲解决方案？

- 你要它写给新人，还是写给架构师？

- 你要它短一点，还是讲透一点？

- 你想听通用知识，还是公司内部实践？

于是，人类为了让它不乱猜，做了第一件很自然的事：

**把任务说清楚。**

这一步，就是 `Prompt` 出现的原因。
