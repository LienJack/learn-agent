# photo-07: RAG 不是什么

Article: src/content/blog/zh/AI/1.概念介绍/02.如何让LLM更聪明.md
Section: RAG 不是什么
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/02-llm/photo-07-rag.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

这里一定要把几个特别容易混淆的点讲清楚。

`RAG` 不是：

- 重新训练模型

- 微调模型（Fine-tuning，在预训练好的模型基础上用领域数据继续训练以适应特定任务）

- 让模型永久学会新知识

- 简单的关键词搜索

它更像一种运行时补资料机制。

也就是说，RAG 的核心不是"把知识写进模型脑子里"，而是"在模型回答前，把相关知识临时拿给它看"。

所以如果你问：

"RAG 是不是重新训练模型？"

答案是：

**不是。RAG 更像临时开卷，不是重新上学。**
