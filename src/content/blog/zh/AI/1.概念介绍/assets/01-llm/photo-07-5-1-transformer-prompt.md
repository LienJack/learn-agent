# photo-07: 5.1 Transformer：为什么它能担此大任

Article: src/content/blog/zh/AI/1.概念介绍/01.LLM的原理.md
Section: 5.1 Transformer：为什么它能担此大任
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/01-llm/photo-07-5-1-transformer.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

![LLM 到底在做什么：从猜词到生成的完整链路 - 5.1 Transformer：为什么它能担此大任](./assets/01-llm/photo-05-5-1-transformer.jpg)

进入 Transformer（基于自注意力机制、摒弃循环结构的神经网络架构）后，数据流经多层相同的 block。每个 block 只做两件事：注意力计算和前馈网络。

它之所以重要，是因为它解决了两个老问题：

- 比 RNN/LSTM（带循环结构的序列神经网络，擅长时序建模但训练难以并行）更容易并行训练。

- 更容易处理长距离依赖。
