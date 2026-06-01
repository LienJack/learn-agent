---
title: "第 6 章：从 Bigram 到神经语言模型"
description: "这一章只解决一个问题：为什么语言模型不能停在计数表，必须走向可学习表示？"
author: LienJack
pubDate: 2026-06-01
locale: zh
tags:
  - LLM 学习
  - LLM
  - AI
---
# 第 6 章：从 Bigram 到神经语言模型

## 核心问题

这一章只解决一个问题：为什么语言模型不能停在计数表，必须走向可学习表示？

如果语言模型只是预测下一个 token，最自然的想法就是直接数频率。例如在训练语料里，“违约金”后面经常出现“过高”“约定”“条款”，那我们用一张表记录 `count(违约金, 下一个词)` 不就够了吗？

这个想法非常重要，因为它揭示了语言模型的第一层本质：

```text
语言模型不是先“懂语言”，而是先学 P(next_token | context)。
```

Bigram 是这条路线上最诚实的起点。它把上下文简化成“前一个 token”，用计数估计概率。但真实语言里的依赖往往不止一个 token：

```text
合同 约定 如果 乙方 逾期 付款 ， 甲方 可以 解除 合同
```

预测“解除”时，模型不只需要看前一个 token“可以”，还需要看更早的“逾期付款”“甲方”。Bigram 看不到这些长距离信息。神经语言模型的出现，就是为了解决两个问题：

- 上下文不应该只是一格历史，而应该是一段可学习的表示。
- 相似上下文之间应该能共享经验，而不是每个词对都重新计数。

本章沿着一条主线往前走：

```text
计数表 -> 条件概率 -> 平滑 -> embedding -> context window -> MLP -> perplexity -> generate
```

## 前置知识

- 已理解 next-token objective。
- 会使用 embedding lookup。
- 能实现最小训练循环和 loss 计算。
- 知道 logits、softmax、cross entropy 的关系。
- 能读懂基本 shape，例如 `[B,T]`、`[B,T,C]`、`[B,V]`。

## 本章新增能力

你会实现 bigram baseline、embedding + MLP neural LM、context window、perplexity 和 generate loop，看到上下文表示如何从查表变成可学习函数。

学完后，你应该能回答：

- Bigram 为什么是一个好 baseline？
- 为什么训练集上频率很高，不代表测试集能泛化？
- embedding 如何让“合同”“协议”“条款”这类相近 token 共享统计经验？
- context window 为什么让模型从 `P(x_t | x_{t-1})` 走向 `P(x_t | x_{t-n:t-1})`？
- perplexity 为什么比“看起来像不像”更适合作为最小量化指标？

## 从计数表到可学习函数

先从最朴素的问题开始：给定一句训练文本，怎样预测下一个 token？

```text
合同 违约金 过高
合同 违约金 应 调整
医学 指南 建议 复诊
```

第一版方案是 unigram：完全不看上下文，只统计哪个 token 常出现。

```text
P(next = 合同) = count(合同) / total_tokens
```

它的问题很明显：无论前文是“违约金”还是“医学指南”，都输出同一套概率。

第二版方案是 bigram：只看前一个 token。

```text
P(next = 过高 | current = 违约金)
```

这已经比 unigram 强，因为它能记住局部搭配。但它仍然有三个硬伤：

- 稀疏：没见过的词对概率为 0。
- 短视：只看一个 token，无法处理长依赖。
- 不共享：`合同 违约金` 和 `协议 违约金` 在表里是两行，除非训练集中都出现过。

第三版方案是 neural LM：把上下文 token 查成 embedding，再交给可学习函数。

```text
context ids -> embedding vectors -> MLP -> logits -> next token distribution
```

这一步的本质变化是：模型不再只记住“某个词后面出现过什么”，而是学习“某类上下文通常导向什么”。

## 最小推导或最小代码

Bigram 估计：

```text
P(next=B | current=A) = count(A,B) / count(A,*)
```

如果训练集中有：

```text
违约金 -> 过高: 3 次
违约金 -> 应:   1 次
违约金 -> 条款: 1 次
```

那么：

```text
P(过高 | 违约金) = 3 / 5 = 0.6
P(应   | 违约金) = 1 / 5 = 0.2
P(条款 | 违约金) = 1 / 5 = 0.2
```

如果测试时出现：

```text
违约金 -> 明显
```

而训练集中从未见过，朴素 bigram 会给 0 概率。0 概率在交叉熵里非常危险，因为：

```text
-log(0) -> infinity
```

所以统计语言模型通常需要平滑。例如 add-one smoothing：

```text
P(next=B | current=A) = (count(A,B) + 1) / (count(A,*) + vocab_size)
```

add-one smoothing 主要用于教学。大词表下它会把太多概率质量分给未见 token；真实统计 LM 还会使用 backoff、interpolation、Kneser-Ney 等方法。本课程只需要它解决 0 概率问题。

一个完整的 count-based bigram baseline 至少要能 fit、算 next 概率、算 NLL、生成：

```python
class BigramLM:
    def __init__(self, vocab_size, smoothing=1.0):
        self.vocab_size = vocab_size
        self.smoothing = smoothing
        self.counts = torch.full((vocab_size, vocab_size), smoothing)

    def fit(self, ids):
        self.counts = torch.full_like(self.counts, self.smoothing)
        for current_id, next_id in zip(ids[:-1], ids[1:]):
            self.counts[current_id, next_id] += 1
        return self

    def next_probs(self, prev_id):
        row = self.counts[prev_id]
        return row / row.sum()

    def nll(self, ids):
        losses = []
        for current_id, next_id in zip(ids[:-1], ids[1:]):
            p = self.next_probs(current_id)[next_id].clamp_min(1e-12)
            losses.append(-p.log())
        return torch.stack(losses).mean()

    def generate(self, start_id, max_new_tokens, eos_id=None):
        ids = [start_id]
        for _ in range(max_new_tokens):
            probs = self.next_probs(ids[-1])
            next_id = torch.multinomial(probs, num_samples=1).item()
            ids.append(next_id)
            if eos_id is not None and next_id == eos_id:
                break
        return ids
```

仓库实现可对应到 `src/models/bigram_lm.py` 里的 `CountBigramLM`。注意 `max_new_tokens` 是必需边界，避免生成循环失控。

神经语言模型则换一种思路：不直接为每个 pair 存概率，而是学习一个函数。

```python
x = embedding(context_ids)          # [B,T,C]
h = mlp(x.reshape(B, T * C))
logits = lm_head(h)                 # [B,V]
next_id = sample(logits)
```

本章的神经 LM 是 fixed-window next-token classifier：

```text
context_ids: [B,T]
target_ids:  [B]
logits:      [B,V]
```

它一次用固定窗口预测一个 next token。第 9 章 MiniGPT 会换成 token-level causal LM：`input_ids: [B,T] -> logits: [B,T,V]`，每个位置都预测自己的下一个 token，所以 labels 也会是 `[B,T]`。这两个目标都属于 next-token learning，但 shape 不同。

其中：

- `B` 是 batch size。
- `T` 是上下文窗口长度。
- `C` 是 embedding 维度。
- `V` 是词表大小。

bigram 记住局部统计，neural LM 学会把多个 token 的上下文压成 hidden 表示。

## 核心概念深讲

### 1. Bigram baseline：最小可解释基线

Bigram 假设下一个 token 只依赖当前 token：

```text
P(x_t | x_1, ..., x_{t-1}) ≈ P(x_t | x_{t-1})
```

这不是因为真实语言真的这么简单，而是为了建立一个最小可运行基线。

例子 1：法律短语。

```text
current = 违约金
next candidates = 过高 / 条款 / 责任 / 支付
```

Bigram 可以学到“违约金”后面经常出现“过高”或“条款”。

这里别推过头。如果句子是：

```text
患者 无 发热 但 咳嗽 加重
```

预测“加重”时，只看“咳嗽”不够，因为“无发热”“但”改变了语义方向。Bigram 无法稳定表达否定、转折和跨短语依赖。

### 2. Embedding：让相似上下文共享参数

Bigram 的表是离散的。`合同 -> 解除` 和 `协议 -> 解除` 是两行独立记录。神经模型会先把 token id 映射成向量：

```text
合同 -> [0.2, 0.7, -0.1]
协议 -> [0.3, 0.6, -0.2]
医学 -> [-0.5, 0.1, 0.8]
```

如果“合同”和“协议”在训练中经常出现在相似上下文里，它们的 embedding 可能逐渐靠近。这样模型在“协议 违约金”上学到的模式，可以部分迁移到“合同 违约金”。

Bigram 的行之间互不相通；embedding 则让 token 先进入同一个连续空间，后面的 MLP 可以在相似向量上共享参数。

### 3. Context window：从一个 token 到一段历史

当上下文窗口长度为 1 时，模型近似 bigram：

```text
P(x_t | x_{t-1})
```

当窗口长度为 4 时，目标变成：

```text
P(x_t | x_{t-4}, x_{t-3}, x_{t-2}, x_{t-1})
```

这让模型能利用更多局部信息。例如：

```text
如果 乙方 逾期 付款
```

只看“付款”时，下一个 token 可能很多；看完整窗口时，下一个 token 更可能和“违约责任”“解除合同”“滞纳金”有关。

但窗口也不是越大越好。MLP 把 `[B,T,C]` flatten 成 `[B,T*C]`，窗口越长，输入维度越大，参数和训练难度都会上升。后面的 attention 会用更灵活的方式处理长上下文。

## 最小实验说明

可以在 tiny corpus 上同时训练 bigram 和 neural LM：

```python
def make_examples(ids, block_size):
    xs, ys = [], []
    for i in range(len(ids) - block_size):
        xs.append(ids[i:i + block_size])
        ys.append(ids[i + block_size])
    return torch.tensor(xs), torch.tensor(ys)
```

实验建议：

- 固定同一份训练集和验证集。
- bigram 计算计数表，neural LM 训练 200 到 1000 step。
- 同时记录 train loss、valid loss、perplexity。
- 用相同 prompt 生成 20 个 token，比较局部搭配和重复模式。

perplexity 由交叉熵得到：

```text
perplexity = exp(cross_entropy)
```

如果交叉熵是 2.0，那么困惑度约为 7.39，直观意思是模型平均每步像是在 7.39 个候选里犹豫。它不是完美指标，但比“我觉得生成得像”更稳定。

只有在相同 tokenizer、相同 eval set、相同 BOS/EOS 处理、相同 loss mask 和相同平均方式下，bigram 与 neural LM 的 perplexity 才有可比性。PPL 报告至少要写清这些条件。

固定窗口 generate 还要明确边界：

```text
prompt 长于 block_size：保留最后 block_size 个 token。
prompt 短于 block_size：左侧补 BOS 或 PAD，并确保 PAD 不作为真实语义。
生成必须设置 max_new_tokens，遇到 eos 停止。
```

## 常见错误

| 常见错误 | 为什么会出问题 | 正确认识 |
| --- | --- | --- |
| 只看生成文本是否像样，不看 perplexity | 小样本生成很容易被随机性误导 | 至少同时看 train/valid loss 和 perplexity |
| generate 没有 `max_new_tokens` | 可能无限生成或测试卡死 | 生成函数必须有长度上限 |
| 忘记处理 `eos_token` | 已结束文本还会继续乱生成 | 采样到 eos 后应停止或标记结束 |
| 把训练上下文窗口和推理可用上下文混淆 | 训练只见过短窗口，推理给超长窗口未必有效 | 推理时要按模型支持的 context length 裁剪 |
| bigram valid loss 比 neural LM 低就继续堆模型 | 可能是数据太小或神经模型没调好 | 先检查学习率、batch、初始化和数据切分 |
| 未见 bigram 给 0 概率 | loss 可能爆炸 | 需要平滑或回退策略 |

## 测试验收

- 本章最低产物：跑通 `CountBigramLM` 和 fixed-window neural LM，并用同一 tokenizer/eval split 对比 loss 与 PPL。
- bigram baseline 和 neural LM 都能训练并生成。
- loss 能下降，perplexity 可计算。
- generate 支持 `max_new_tokens`、temperature 和 `eos_token`。
- 能解释 neural LM 相比 bigram 多了什么表示能力。
- 能用一个未见词对说明 bigram 的稀疏问题。
- 能打印每一步 shape，并解释 `[B,T,C] -> [B,T*C] -> [B,V]`。

## FAQ

1. Bigram 已经过时了，为什么还要学？

   因为它是最小可解释 baseline。任何复杂模型都应该先超过简单统计，否则优先怀疑数据、label、split 或训练循环。

2. Neural LM 是不是一定比 bigram 好？

   不一定。在极小数据、极短上下文、训练不稳定时，bigram 可能更稳。神经模型的优势来自表示学习和泛化，但需要足够数据和正确优化。

3. Embedding 一开始就有语义吗？

   没有。随机初始化的 embedding 没有稳定语义，语义来自训练目标对参数的持续更新。

4. Context window 越长越好吗？

   不一定。更长窗口提供更多信息，也带来更多参数、更多计算和更多噪声。MLP LM 尤其不擅长长窗口。

5. Perplexity 降低是否代表模型一定更安全？

   不是。Perplexity 衡量 next-token 预测，不衡量事实性、合规性、拒答能力或医学安全边界。

## 自测题

1. 写出 bigram 的最大似然估计公式。
2. 为什么未见过的 bigram 会导致测试 loss 出问题？
3. `context_ids: [B,T]` 经过 embedding 后 shape 是什么？
4. MLP neural LM 为什么能利用多个历史 token？
5. Perplexity 和 cross entropy 的关系是什么？
6. 举一个 bigram 失败但 context window 有帮助的法律或医学例子。

答案要点：

- `count(A,B) / count(A,*)`。
- 概率为 0 时 `-log p` 发散，需要平滑或神经泛化。
- `[B,T,C]`。
- 它把多个 token embedding 拼接或聚合后输入可学习函数。
- `perplexity = exp(cross_entropy)`。
- 例如“无 发热 但 咳嗽 加重”需要否定和转折上下文；“如果 乙方 逾期 付款”需要条件结构。

## 想继续深挖

继续深挖时，只盯住一个转变：神经语言模型把“查表概率”改成“可学习函数”。

```text
h = f(embedding(context_ids))
logits = h @ W_vocab
P(next | context) = softmax(logits)
```

这样模型不再只依赖某个 exact bigram 是否出现过，而是可以通过 embedding 和 MLP 在相似上下文之间共享统计强度。06 章的带走判断就是：从 `count` 到 `parameterized function`，从离散表格到连续表示空间。

## 和领域项目的关系

领域小模型不会靠 bigram 完成任务，但 bigram 是最好的基线提醒：如果复杂模型连简单统计都没超过，要先检查数据、label 和评测，而不是继续堆参数。

在法律项目里，bigram 可以暴露数据分布是否异常。例如“违约金”后面总是接“过高”，可能说明语料过窄，模型会把所有违约金都判成风险。在医学项目里，如果“发热”后面总是接“抗生素”，说明数据可能存在危险偏差，不能直接用于建议生成。

神经语言模型让我们开始处理更丰富的上下文，但它仍然只是后续 Transformer 的前置台阶。下一章 attention 会回答：当上下文变长时，模型怎样动态选择最相关的历史 token，而不是把固定窗口粗暴压扁。
