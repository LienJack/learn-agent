# photo-06: Self-attention 的直觉

Article: src/content/blog/zh/AI/1.概念介绍/01.LLM的原理.md
Section: Self-attention 的直觉
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/01-llm/photo-06-self-attention.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

句子里的每个 token，在理解自己时，都可以去"看一眼"上下文里的所有其他 token，并给它们分配不同权重。

处理"苹果"这个词时，如果前文是"吃"、"甜"、"水果"，attention 权重就会偏向水果义。如果前文是"市值"、"股价"、"蒂姆库克"，权重就会偏向公司义。这个"看谁更重要"的机制，就是 self-attention（自注意力机制，序列中每个位置通过计算与其他位置的关联权重来聚合上下文信息）。
