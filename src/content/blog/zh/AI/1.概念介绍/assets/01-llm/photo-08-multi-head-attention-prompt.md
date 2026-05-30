# photo-08: Multi-head Attention

Article: src/content/blog/zh/AI/1.概念介绍/01.LLM的原理.md
Section: Multi-head Attention
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/01-llm/photo-08-multi-head-attention.jpg

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

把向量切成多份，各自独立做 attention，最后拼接。例如 8 个 head，每个 head 的维度是 `d_model / 8`。

Multi-head attention（多头注意力机制，让模型从多个子空间并行学习不同关系模式）相当于让模型同时从多个角度审视关系。一个 head 学语法搭配，一个学长距离指代，一个学局部语义。多个 head 的结果拼接后再投影回原始维度，信息密度更高。
