# photo-08: Q/K/V 的工程解释

Article: src/content/blog/zh/AI/1.概念介绍/01.LLM的原理.md
Section: Q/K/V 的工程解释
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/01-llm/photo-08-q-k-v.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

![LLM 到底在做什么：从猜词到生成的完整链路 - Q/K/V 的工程解释](./assets/01-llm/photo-07-q-k-v.jpg)

Attention 的计算不是玄学。它用三组投影矩阵把输入向量映射到三个子空间：

- **Query（查询向量）**：当前 token 想找什么信息。

- **Key（键向量）**：其他 token 各自提供什么标签。

- **Value（值向量）**：其他 token 真正携带的内容。

你可以把它想象成查档案。Query 是你要查的问题，Key 是档案的标签，Value 是档案里的实际内容。你拿问题去跟所有标签比对，找到最相关的档案，然后提取里面的内容。

关键点：因果 mask（causal mask，在自回归生成中阻止模型看到未来 token 的三角掩码）。训练或推理时，生成第 t 个 token 不能看到 t+1 及以后的内容。这个 mask 让未来位置的权重变成 0。没有它，模型就等于提前看了答案。
