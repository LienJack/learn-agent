---
title: "第 3 章：概率、Softmax、交叉熵与 next-token"
description: "模型不是在分类图片，而是在继续写一句话。它到底怎么训练？"
author: LienJack
pubDate: 2026-06-01
locale: zh
tags:
  - LLM 学习
  - LLM
  - AI
---
# 第 3 章：概率、Softmax、交叉熵与 next-token

## 本章核心困惑

模型不是在分类图片，而是在继续写一句话。它到底怎么训练？

很多人第一次学语言模型时，会以为模型是在“理解一句话后直接生成答案”。但从训练目标看，语言模型做的是一件非常朴素的事：

```text
给定前面的 token，预测下一个 token 的概率分布。
```

比如输入：

```text
我 喜欢 学 大模
```

模型不是一次性“想出”完整回答，而是在当前上下文后面预测：

```text
型: 0.72
块: 0.08
...
```

然后选出或采样一个 token，接到上下文后面，再预测下一个。

这就是大模型看起来一个字一个字往外蹦的根本原因。

本章要回答一串关键问题：

```text
logits 是什么？
Softmax 为什么能把分数变成概率？
交叉熵为什么是 next-token training 的 loss？
labels 为什么要右移？
temperature、top-k、top-p 又在改什么？
```

如果这章学透，后面你会更容易理解 SFT、蒸馏、困惑度、采样失控、格式训练和无依据幻觉。

## 前置知识

- 会看 `[B,T,V]` logits 和 `[B,T]` labels。
- 知道概率分布表示“每个候选答案的可能性”。
- 已能跑最小 PyTorch 训练循环。
- 理解 token id 只是编号，还不是语义向量。

## 本章新增能力

学完本章，你应该能做到：

- 解释语言模型为什么是条件概率模型。
- 手算一个小词表上的 Softmax。
- 手算正确答案概率对应的交叉熵。
- 解释 label shift 为什么不能错。
- 区分训练时 teacher forcing 和推理时 autoregressive generation。
- 解释 greedy、temperature、top-k、top-p 和 perplexity。

一句话记忆：

> 语言模型训练是在最大化“正确下一个 token”的概率；生成是在不断从“下一个 token 概率分布”里选 token。

本章的问题演化链是：

```text
语言有不确定性
  -> 模型需要输出概率分布
    -> logits 先给未归一化分数
      -> Softmax 把分数变概率
        -> 交叉熵惩罚正确 token 概率低
          -> 最大似然解释为什么要这样训练
            -> label shift 决定每个位置预测谁
              -> 采样策略决定推理时如何选下一个 token
```

## 1. 概率先解决什么问题：不确定性

真实语言不是一条确定规则。

输入：

```text
请分析这段合同的
```

后面可能是：

```text
风险
条款
违约责任
法律后果
```

这些候选并不是非黑即白，而是都有可能。模型需要表达这种不确定性，所以它输出的不是一个答案，而是一整个概率分布。

概率分布至少满足两个条件：

```text
每个概率 >= 0
所有概率加起来 = 1
```

例如小词表：

```text
["风险", "条款", "猫"]
```

模型可能输出：

```text
风险: 0.70
条款: 0.25
猫:   0.05
```

这不是说模型真的“知道法律”，只是说在当前上下文下，它认为“风险”是更可能的下一个 token。

## 2. 条件概率：语言模型预测的是 `P(next | context)`

语言模型的核心形式可以写成：

```text
P(token_t | token_1, token_2, ..., token_{t-1})
```

读作：

> 在已经看到前面这些 token 的条件下，第 t 个 token 是什么的概率。

一句话的概率可以拆成很多个条件概率相乘：

```text
P("我 喜欢 学 模型")
= P(我)
* P(喜欢 | 我)
* P(学 | 我, 喜欢)
* P(模型 | 我, 喜欢, 学)
```

这叫链式分解。

语言模型训练并不是直接给整句话打一个玄学分数，而是在每个位置都训练：

```text
看到前文 -> 预测下一个 token
```

这就是 next-token prediction。

## 3. logits：模型先输出分数，不直接输出概率

模型最后一层通常输出 logits：

```text
logits: [B,T,V]
```

对某个位置来说，logits 是长度为 `V` 的一排分数：

```text
风险: 2.0
条款: 0.5
猫:  -1.0
```

这些分数还不是概率，因为：

- 可以是负数。
- 不一定小于 1。
- 加起来不等于 1。

为什么模型不直接输出概率？因为分数空间更自由，训练更稳定。我们用 Softmax 把 logits 转成概率：

```text
prob_i = exp(logit_i) / sum(exp(logit_j))
```

## 4. Softmax 手算：把分数变成概率

假设 logits 是：

```text
风险: 2.0
条款: 1.0
猫:  0.0
```

先取指数：

```text
exp(2.0) ≈ 7.39
exp(1.0) ≈ 2.72
exp(0.0) = 1.00
```

总和：

```text
7.39 + 2.72 + 1.00 = 11.11
```

概率：

```text
风险: 7.39 / 11.11 ≈ 0.665
条款: 2.72 / 11.11 ≈ 0.245
猫:  1.00 / 11.11 ≈ 0.090
```

Softmax 的直观效果：

- 分数大的 token 概率更高。
- 所有 token 都保留非零概率。
- 分数差距会被指数函数放大。

数值稳定技巧：真实代码不会直接 `exp(logits)`，因为 logits 很大时会溢出。通常会先减去最大值：

```python
shifted = logits - logits.max(dim=-1, keepdim=True).values
probs = shifted.exp() / shifted.exp().sum(dim=-1, keepdim=True)
```

减去同一个常数不会改变 Softmax 结果，但能避免 `exp(1000)` 这种溢出。

## 5. 交叉熵：惩罚模型不相信正确答案

训练时我们知道正确答案是什么。比如当前上下文后面的正确 token 是：

```text
风险
```

模型给出的概率是：

```text
风险: 0.665
条款: 0.245
猫:  0.090
```

交叉熵对单个样本可以理解成：

```text
loss = -log(正确答案的概率)
```

所以：

```text
loss = -log(0.665) ≈ 0.408
```

如果模型只给正确答案 0.1：

```text
loss = -log(0.1) ≈ 2.303
```

如果模型给正确答案 0.01：

```text
loss = -log(0.01) ≈ 4.605
```

直观感受：

- 正确答案概率越高，loss 越小。
- 正确答案概率越低，loss 增长很快。
- 交叉熵不关心模型说得像不像人，只关心正确 token 的概率。

这点非常重要。一个模型可以把训练集 token 概率学得很好，但在法律/医学任务中仍然可能没有证据、没有边界、没有安全意识。所以后面必须引入 RAG、SFT、评测和安全治理。

## 6. 最大似然：训练到底在最大化什么

如果一句话有很多 token，模型希望每个正确 next token 的概率都尽量高。

最大似然可以写成：

```text
maximize P(token_1, token_2, ..., token_T)
```

用链式分解：

```text
maximize ∏ P(token_t | tokens_<t)
```

乘很多小概率很容易数值下溢，所以实际会取 log：

```text
maximize Σ log P(token_t | tokens_<t)
```

训练框架通常最小化 loss，所以变成：

```text
minimize -Σ log P(token_t | tokens_<t)
```

这就是交叉熵 loss 的来源。

一句话记忆：

> 最大似然是“让训练文本中真实出现的下一个 token 变得更可能”；交叉熵是它的可优化 loss 形式。

## 7. label shift：为什么 labels 要右移

语言模型不是预测当前 token，而是预测下一个 token。

给定序列：

```text
[A, B, C, D]
```

输入和标签应该对齐成：

```text
input_ids = [A, B, C]
labels    = [B, C, D]
```

如果保留同样长度，也可以写成：

```text
input_ids = [A, B, C, D]
labels    = [B, C, D, EOS]
```

意思是：

```text
看到 A，预测 B
看到 A B，预测 C
看到 A B C，预测 D
看到 A B C D，预测 EOS
```

本课程在第 3、4 章的 tiny 代码里采用一个简单约定：dataset 预先右移 labels，模型和 `language_modeling_loss` 不再二次 shift。

```text
dataset 输出:
input_ids = [A, B, C, D]
labels    = [B, C, D, EOS]

loss 计算:
logits: [B,T,V] 直接对齐 labels: [B,T]
```

很多 Hugging Face causal LM API 采用另一种常见约定：dataset 输出同长度 `input_ids` 和 `labels`，`labels` 复制 `input_ids` 并把不训练位置设为 `-100`，模型或 loss 内部再使用 `logits[:, :-1]` 对齐 `labels[:, 1:]`。两种约定都对，但一个项目里只能选一种。最危险的是 dataset 已经右移，模型里又右移一次，或者两边都没右移。

最常见错误是 labels 没有右移：

```text
input_ids = [A, B, C, D]
labels    = [A, B, C, D]
```

这样模型学到的是复制当前 token，而不是预测下一个 token。训练 loss 可能看起来下降，但生成时会出怪现象。

## 8. Teacher forcing：训练时并行，推理时循环

训练时，模型可以一次性看到完整输入序列，并在每个位置预测下一个 token：

```text
logits: [B,T,V]
labels: [B,T]
```

这叫 teacher forcing：训练时把真实历史 token 喂给模型。

并行训练不等于看未来。decoder-only LM 必须配合 causal mask，保证第 `t` 个位置只能使用 `t` 及之前的 token 表示；如果没有 causal mask，模型可能偷看未来 token，loss 会虚低。

推理时不一样。模型不知道未来 token，只能循环：

```text
prompt
-> predict next token
-> append token
-> predict next token
-> append token
```

这就是 autoregressive generation。

训练和推理的差异解释了很多现象：

- 训练可以并行，推理通常按 token 逐步生成。
- 训练 loss 低，不代表长文本生成稳定。
- 一旦前面采样错了，后续上下文也会被污染。

## 9. temperature：改变概率分布的尖锐程度

生成时常用 temperature 调整 logits：

```text
logits = logits / temperature
```

这个公式要求 `temperature > 0`。很多推理 API 里的 `temperature=0` 是工程特殊约定，通常表示 greedy 或 deterministic decoding，不是实际执行 `logits / 0`。

如果 temperature 小于 1：

- 大 logits 更突出。
- 分布更尖。
- 输出更稳定，但可能更保守。

如果 temperature 大于 1：

- 分布更平。
- 更多 token 有机会被采样。
- 输出更多样，但也更容易跑偏。

极端情况：

```text
temperature -> 0：接近总选最高分
temperature 很大：接近随机
```

法律和医学场景通常更偏向低 temperature，因为安全、可追溯和稳定比“有创意”更重要。

## 10. top-k 与 top-p：限制采样候选

如果直接从整个词表采样，尾部低概率 token 也可能被抽中。top-k 和 top-p 是两种常见限制。

top-k：

```text
只保留概率最高的 k 个 token
```

例如 `k=3`，只从前三名里采样。

top-p，也叫 nucleus sampling：

```text
按概率从高到低排序，保留累计概率达到 p 的最小集合
```

例如 `p=0.9`，保留能覆盖 90% 概率质量的候选。

两者差异：

| 方法 | 固定什么 | 适合直觉 |
| --- | --- | --- |
| top-k | 候选数量 | 每次只看前 k 个 |
| top-p | 概率质量 | 根据分布尖锐程度动态调整候选 |

高风险领域里，采样策略不能替代安全机制。即使 temperature 很低，模型仍然可能在无证据时编造。采样只是生成控制，不是事实保证。

## 11. perplexity：平均有多困惑

困惑度 perplexity 通常定义为：

```text
perplexity = exp(average_cross_entropy)
```

如果平均交叉熵是 0.69：

```text
perplexity ≈ exp(0.69) ≈ 2
```

可以粗略理解为：模型平均每一步像是在两个差不多的候选里犹豫。

如果平均交叉熵是 2.30：

```text
perplexity ≈ exp(2.30) ≈ 10
```

模型平均更困惑。

但 perplexity 也有边界：

- 它适合衡量语言建模拟合程度。
- 它只适合在相同 tokenizer、相同 eval set、相同 loss mask 规则下比较。
- 不直接等于任务正确率。
- 不保证引用真实。
- 不保证安全拒答。

一个医学助手 perplexity 低，不代表它不会给危险建议。后面评测章节会把格式、事实、引用、拒答、安全切片分开测。

## 12. 最小 PyTorch 代码

训练 loss 的核心形式：

```python
import torch
import torch.nn.functional as F

B, T, V = 2, 4, 10
sequence = torch.randint(0, V, (B, T + 1))
input_ids = sequence[:, :-1]
labels = sequence[:, 1:]  # dataset 预右移：每个位置预测下一个 token
logits = torch.randn(B, T, V)

loss = F.cross_entropy(
    logits.reshape(-1, V),
    labels.reshape(-1),
    ignore_index=-100,
)
```

为什么要 reshape？

`F.cross_entropy` 常见输入是：

```text
logits: [N,V]
labels: [N]
```

语言模型的每个 batch、每个位置都是一个分类样本，所以：

```text
[B,T,V] -> [B*T,V]
[B,T]   -> [B*T]
```

这不是改变语义，而是把所有位置摊平成一批分类任务。

如果采用 Hugging Face 风格的“同长度 labels + 内部 shift”，核心会变成：

```python
shift_logits = logits[:, :-1, :].contiguous()
shift_labels = labels[:, 1:].contiguous()

loss = F.cross_entropy(
    shift_logits.view(-1, V),
    shift_labels.view(-1),
    ignore_index=-100,
)
```

这会跳过对应位置的 loss。无论采用哪种约定，`ignore_index=-100` 都只属于 labels，不是 tokenizer 的合法 token id。

## 13. 最小梯度推导：为什么 `prob - one_hot` 会出现

很多教材会直接说“交叉熵配合 Softmax 很方便”，但不解释方便在哪里。看一个单位置、三分类的最小推导。

设 logits 为：

```text
z = [2.0, 1.0, 0.0]
```

Softmax 后概率约为：

```text
p = [0.665, 0.245, 0.090]
```

如果正确类别是第 0 个，one-hot 标签是：

```text
y = [1, 0, 0]
```

交叉熵：

```text
L = -log(p0)
```

对每个 logit 的梯度可以化简为：

```text
dL / dz_i = p_i - y_i
```

所以：

```text
第 0 类: 0.665 - 1 = -0.335
第 1 类: 0.245 - 0 =  0.245
第 2 类: 0.090 - 0 =  0.090
```

梯度下降更新 logits 背后的参数时，会推动正确类别 logit 变大，错误类别 logit 变小。这个结果非常直观：

- 模型给正确 token 的概率还不够高，所以正确类梯度是负的，更新会抬高它。
- 模型给错误 token 分了一些概率，所以错误类梯度是正的，更新会压低它。
- 错误 token 概率越高，被压低得越多。

这也是为什么语言模型可以从海量 next-token 位置中学习：每个位置都给出一个“把概率从错误 token 挪向正确 token”的训练信号。

## 14. 两个例子、一个反例：概率目标的能力和边界

例子 1：法律回答的下一个 token。

上下文：

```text
该条款可能存在
```

合理后续可能是：

```text
风险、争议、无效、问题
```

训练数据如果总是写“可能存在风险，需要人工复核”，模型会提高这些 token 在类似上下文下的概率。SFT 本质上仍然是在塑造 next-token 分布，让边界表达更可能出现。

例子 2：医学红旗症状分流。

上下文：

```text
胸痛伴呼吸困难持续 30 分钟，建议
```

安全数据应该让“立即就医”“联系急救”等 token 概率升高，而不是让“先观察”“自行服药”等 token 概率升高。这里的安全性来自数据和评测约束，不来自 Softmax 本身。

反例：流畅概率不等于事实正确。

如果训练语料里经常出现某种错误说法，模型可能给错误说法很高概率。交叉熵不会自动判断事实真伪，它只会让训练文本中出现过的 next token 更可能。法律和医学场景必须额外引入证据检索、引用支持、拒答边界和人工复核。

边界：perplexity 衡量的是模型对文本分布的拟合，不是“这个回答是否有依据”“是否合规”“是否安全”。一个低 perplexity 模型仍可能在缺少证据时编造法条或医学建议。

## 15. 常见错误

| 常见错误 | 正确认识 |
| --- | --- |
| labels 不右移 | 模型会学成复制当前 token |
| 对 logits 先 Softmax 再传给 `cross_entropy` | PyTorch 的 `F.cross_entropy` 内部已包含 log-softmax |
| 忽略 padding token | pad 进入 loss 会污染训练 |
| 以为训练时逐 token 生成 | 训练时可并行预测所有位置 |
| 以为 perplexity 低就能发布 | 还要任务评测、安全和证据 |
| temperature 能解决幻觉 | 它只改采样分布，不提供事实依据 |
| top-p 越高越好 | 高风险场景通常需要更稳、更可控 |

## 16. 测试验收

本章学完，至少应该能通过这些验收：

- 本章最低产物：跑通 next-token loss 的最小代码，并能说清 dataset 预右移与 Hugging Face 内部 shift 的区别。
- 能手算一个 3 token 词表的 Softmax。
- 能从正确答案概率手算交叉熵。
- 能把 `[A,B,C,D]` 写成正确的 input/label 对。
- 能写测试证明错误右移会改变训练目标。
- 能解释 `logits.reshape(-1,V)` 和 `labels.reshape(-1)`。
- 能比较 greedy、temperature、top-k、top-p 的输出差异。
- 能计算 perplexity，并说明它不等于安全可靠。

## FAQ

### 1. 为什么不用准确率训练语言模型？

因为语言模型要输出整个词表上的概率分布。准确率只关心最高分是不是正确，丢掉了“第二可能是什么”“模型有多不确定”等信息。交叉熵能更细致地惩罚概率分布。

### 2. 为什么 `F.cross_entropy` 接收 logits，而不是概率？

为了数值稳定和计算效率。它内部会做 log-softmax。如果你先手动 Softmax，再传进去，可能造成数值和语义错误。

### 3. SFT 和 next-token training 是不是两套东西？

底层仍然是 next-token training。区别是 SFT 把数据组织成 system/user/assistant 格式，并常常只对 assistant 部分算 loss，让模型学习回答格式和行为边界。

### 4. 为什么生成会越写越偏？

因为推理时模型把自己生成的 token 再喂回上下文。如果早期采样了不合适的 token，后续预测就建立在污染后的上下文上。

## 自测题

1. logits `[2.0, 1.0, 0.0]` 经过 Softmax 后，最大概率大约是多少？
2. 正确答案概率从 0.9 降到 0.1，交叉熵会变大还是变小？
3. `[A,B,C,D]` 的 next-token labels 应该是什么？
4. temperature 变大时，输出通常更稳定还是更多样？
5. perplexity 低能否证明法律模型可以上线？

答案要点：

- 最大概率约 0.665。
- 交叉熵变大。
- 可以是 `[B,C,D,EOS]`。
- 更多样，也更可能跑偏。
- 不能，还需要任务指标、引用、安全、人工复核和发布门禁。

## 想继续深挖

继续深挖 next-token，可以把训练目标写成整段序列的负对数似然：

```text
P(x_1, x_2, ..., x_T) = Π_t P(x_t | x_<t)
loss = - Σ_t log P(x_t | x_<t)
```

交叉熵不是额外发明的损失，它就是让真实下一个 token 的概率变大。若正确 token 概率是 `0.8`，loss 是 `-log(0.8)`；若正确 token 概率是 `0.01`，loss 是 `-log(0.01)`，惩罚会大很多。

采样也可以继续公式化：

```text
p_i = softmax(logits_i / temperature)
```

`temperature < 1` 会让分布更尖，`temperature > 1` 会让分布更平。top-k/top-p 不是改变模型知识，而是改变从分布里取样的候选集合。领域项目里，这解释了为什么“生成更稳定”不等于“事实更可靠”：采样只控制输出分布形状，不提供证据。

## 和领域项目的关系

法律和医学回答最终也是一个个 token 生成出来的。理解 next-token 目标，才能解释为什么模型会流畅地编造、为什么 SFT 学的是格式和行为而不是事实来源、为什么 RAG 要给证据、为什么高风险场景需要拒答和人工复核。

本章的数学目标是后面所有训练方法的共同底层：SFT、LoRA、QLoRA、蒸馏都还在优化 token loss，只是训练数据、可训练参数和约束条件不同。
