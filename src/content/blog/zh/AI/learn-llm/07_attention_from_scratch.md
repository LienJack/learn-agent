---
title: "第 7 章：Attention 手算与实现"
description: "Attention 到底在算什么？"
author: LienJack
pubDate: 2026-06-01
locale: zh
tags:
  - LLM 学习
  - LLM
  - AI
---
# 第 7 章：Attention 手算与实现

## 核心问题

Attention 到底在算什么？

很多人第一次看到公式：

```text
Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V
```

会觉得它像一串抽象符号：Q、K、V 是什么？为什么要相乘？为什么除以 `sqrt(d_k)`？为什么还要乘 V？为什么 causal mask 一漏，语言模型就会“偷看答案”？

看到 `softmax(QK^T / sqrt(d_k))V` 时，先别急着背公式。它其实在回答一个问题：

> 当前 token 想预测下一个 token 时，应该从哪些历史 token 里拿信息？

例如：

```text
合同 违约金 过高 ， 它 可能 存在 风险
```

当模型处理“它”时，它最好能回看“违约金”或“合同”，而不是平均看所有历史 token。固定窗口平均做不到这一点。Attention 的核心能力就是：让每个位置动态决定自己应该看谁。

演进路线：

```text
只看当前 token
  -> 固定平均历史 token
  -> 用相似度给历史 token 分配权重
  -> Q/K/V 分离匹配和取值
  -> scale 稳定 softmax
  -> causal mask 防止偷看未来
  -> multi-head 从多个子空间并行看上下文
```

## 前置知识

- 熟悉 `[B,T,C]` 和矩阵乘法。
- 知道 Softmax 把分数变成概率分布。
- 理解 next-token language modeling 不能看未来 token。
- 会区分 token embedding 和 contextual hidden state。

## 本章新增能力

学完本章，你应该能做到：

- 手算一轮单头 scaled dot-product attention。
- 解释 Q/K/V 各自的角色。
- 推导 attention score 为什么是 `[B,H,T,T]`。
- 解释 `sqrt(d_k)` 的数值稳定作用。
- 正确实现 causal mask，并说明它和 padding mask 的区别。
- 用测试证明未来 token 不会影响过去位置输出。

后面写代码时，先抓住这个边界：Q/K 决定看谁，V 决定拿什么内容，mask 决定哪些位置根本不能看。

## 1. 从固定平均的问题开始

在 attention 之前，我们可以用最简单的办法让 token 看历史：

```text
当前表示 = 历史 token 向量的平均值
```

这比完全不看上下文强，但问题明显：

```text
合同 违约金 过高 ， 它 可能 存在 风险
```

不同位置需要看的重点不同。处理“它”时，“合同”“违约金”更重要；处理“风险”时，“违约金”“过高”更重要。固定平均无法根据当前 token 动态选择。

所以我们需要一种机制：

```text
每个 token 自己决定看哪些历史 token，以及看多少。
```

这就是 attention。

## 2. Q/K/V：匹配和取值分开

可以把 attention 想成在资料库里查资料：

- Q，Query：我现在要查什么？
- K，Key：每份资料贴着什么索引标签？
- V，Value：资料真正包含什么内容？

当前 token 先生成一个 query，历史每个 token 生成 key 和 value。

匹配过程：

```text
query 和每个 key 做相似度计算 -> 得到分数
分数经过 Softmax -> 得到权重
权重加权 value -> 得到上下文信息
```

为什么 K 和 V 要分开？

因为“用什么来匹配”和“匹配后取什么内容”不一定相同。就像图书馆里书脊标签用于检索，但你真正要读的是书里的内容。

法律例子：

```text
该 条款 约定 违约金 过高
```

处理“过高”时，Q 像是在问“我要判断什么对象过高？”；“违约金”的 K 和这个问题高度匹配；它的 V 则携带“违约金”这个内容信息。

## 3. 最小 shape 主线

先不考虑多头，只看单头。

输入：

```text
x: [B,T,C]
```

经过三个线性投影：

```text
q = xWq
k = xWk
v = xWv
```

shape：

```text
q: [B,T,D]
k: [B,T,D]
v: [B,T,D]
```

attention score：

```text
scores = q @ k.transpose(-2, -1)
```

shape：

```text
[B,T,D] @ [B,D,T] -> [B,T,T]
```

这里 `[T,T]` 的含义是：

- 行：query 位置，也就是“谁在看”。
- 列：key 位置，也就是“被看的是谁”。

多头版本把 `D` 拆成多个 head：

```text
q/k/v:  [B,H,T,D]
scores: [B,H,T,T]
```

注意 score 不是 `[B,T,H,H]`。head 不是互相注意，token 位置才互相注意。每个 head 内部都有一张自己的 `[T,T]` 注意力表。

## 4. 用小数字手算一轮 attention

假设一句话只有 3 个 token，每个 token 的 q/k/v 都是 2 维。

```text
tokens = [合同, 违约金, 过高]
```

为了手算简单，假设第 3 个 token “过高”的 query 是：

```text
q_过高 = [1, 1]
```

三个 key：

```text
k_合同   = [1, 0]
k_违约金 = [1, 1]
k_过高   = [0, 1]
```

点积分数：

```text
q_过高 · k_合同   = 1
q_过高 · k_违约金 = 2
q_过高 · k_过高   = 1
```

如果 `d_k=2`，scaled score 是：

```text
[1, 2, 1] / sqrt(2) ≈ [0.71, 1.41, 0.71]
```

分数经过 Softmax，大致会得到：

```text
[0.25, 0.50, 0.25]
```

这表示“过高”这个位置更关注“违约金”。

如果 value 是：

```text
v_合同   = [1, 0]
v_违约金 = [0, 2]
v_过高   = [1, 1]
```

输出就是加权和：

```text
out_过高 = 0.25*v_合同 + 0.50*v_违约金 + 0.25*v_过高
          = [0.25, 0] + [0, 1.0] + [0.25, 0.25]
          = [0.50, 1.25]
```

这一步的意义是：当前位置的表示吸收了它关注位置的信息。

## 5. 为什么要除以 `sqrt(d_k)`

如果 head_dim 很大，两个随机向量的点积方差会随维度变大。

最小推导：假设 q 和 k 的每个维度均值为 0、方差为 1，且相互独立。点积是：

```text
q · k = q1*k1 + q2*k2 + ... + qd*kd
```

每一项方差约为 1，d 项相加后方差约为 `d`。也就是说，`d_k` 越大，点积分数的尺度越容易变大。除以 `sqrt(d_k)` 后，方差大致回到 1。

直观说，维度越多，点积累加的项越多，分数尺度越容易变大。分数太大时，Softmax 会变得非常尖：

```text
scores = [1, 2, 3]      -> softmax 还算平滑
scores = [10, 20, 30]   -> 最大项几乎独占
```

Softmax 太尖会带来两个问题：

- 模型过早只看一个位置，探索不足。
- 梯度可能变得不稳定。

所以 scaled dot-product attention 会除以：

```text
sqrt(d_k)
```

这一步把分数尺度拉回更稳定的范围，避免 Softmax 过早变成近似 one-hot。

## 6. Causal mask：为什么不能看未来

语言模型训练时，输入序列是完整的：

```text
[A, B, C, D]
```

如果不加 mask，位置 A 可以直接看 B、C、D。那它预测 B 时就偷看到了答案。

这会造成：

- 训练 loss 虚低。
- 生成时性能崩，因为真实推理没有未来 token。

causal mask 是一个下三角矩阵：

```text
[
  [1, 0, 0, 0],
  [1, 1, 0, 0],
  [1, 1, 1, 0],
  [1, 1, 1, 1],
]
```

第 `i` 行只能看 `j <= i` 的位置。

实现时通常把不允许看的位置填成负无穷：

```python
scores = scores.masked_fill(~mask, float("-inf"))
weights = torch.softmax(scores, dim=-1)
```

不要用 0 替代负无穷。0 仍然会参与 Softmax，未来 token 仍然可能得到权重。

边界：causal mask 防的是“未来 token”，不防“无效 token”。padding 需要另一种 mask。

## 7. 进阶：padding mask 和 causal mask 的区别

causal mask 防止看未来：

```text
query i 不能看 key j > i
```

padding mask 防止看补齐 token：

```text
有效 token 不应该读取 pad token 的内容
```

两者 shape 常见写法：

```text
scores:       [B,H,T,T]
causal_mask:  [1,1,T,T]
padding_key_mask:   [B,1,1,T]
padding_query_mask: [B,1,T,1]
combined:     [B,H,T,T]
```

padding mask 通常作用在 key 维，因为 pad token 不应该被任何有效 query 当作信息来源。

如果某一行所有 key 都被 mask，Softmax 可能产生 NaN；如果用 dtype 最小有限值代替 `-inf`，全 mask 行还可能得到近似均匀分布。纯 causal mask 不会这样，因为每个位置至少能看自己；padding query 行则需要额外处理，比如输出清零并在 loss 中忽略。不要只依赖 `masked_fill`，要么保证每行至少一个有效 key，要么在 softmax 后对无效 query 输出清零。

## 8. 多头 attention：从多个角度看上下文

单头 attention 只用一种匹配方式。多头 attention 把 hidden_dim 拆成多个 head：

```text
C = H * D
```

每个 head 学一套自己的 Q/K/V 投影。

直观上，多头像多个观察角度：

- 一个头可能关注主语和代词关系。
- 一个头可能关注局部短语。
- 一个头可能关注标点或格式。
- 一个头可能关注引用编号。

shape 流程：

```text
x:      [B,T,C]
qkv:    [B,T,3C]
split:  q/k/v each [B,T,C]
view:   [B,T,H,D]
move:   [B,H,T,D]
score:  [B,H,T,T]
out:    [B,H,T,D]
merge:  [B,T,C]
```

不要把多头解释得过度确定。attention head 的可解释性有限，但多头确实给模型提供了多组并行的匹配子空间。

## 9. 最小实现

```python
import torch

def scaled_dot_product_attention(q, k, v, causal=True, padding_mask=None):
    # 本章实现覆盖训练期 full-sequence self-attention；
    # KV cache / incremental decoding 的 q_len != k_len mask 第 10 章后再处理。
    head_dim = q.size(-1)
    scores = q @ k.transpose(-2, -1) / head_dim**0.5

    if causal:
        t = q.size(-2)
        causal_mask = torch.tril(torch.ones(t, t, device=q.device, dtype=torch.bool))
        scores = scores.masked_fill(~causal_mask[None, None, :, :], torch.finfo(scores.dtype).min)

    query_mask = None
    if padding_mask is not None:
        # padding_mask: [B,T], True means valid token.
        # key mask: valid query 不读 pad key。
        scores = scores.masked_fill(~padding_mask[:, None, None, :], torch.finfo(scores.dtype).min)
        query_mask = padding_mask[:, None, :, None]

    weights = torch.softmax(scores, dim=-1)
    if padding_mask is not None:
        weights = weights.masked_fill(~padding_mask[:, None, None, :], 0.0)
        weights = weights / weights.sum(dim=-1, keepdim=True).clamp_min(1e-8)
        # query mask: pad query 的输出清零，减少后续层污染。
        weights = weights.masked_fill(~query_mask, 0.0)
    values = weights @ v
    if query_mask is not None:
        values = values.masked_fill(~query_mask, 0.0)
    return values, weights
```

第 8 章会直接复用本章沉淀的多头类，仓库里对应 `src/models/transformer_block.py` 的 `MultiHeadSelfAttention` / `CausalSelfAttention`。它包含 qkv projection、split heads、causal/padding mask、output projection 和 dropout。

测试时不要只检查能跑。至少要检查：

- 输出 shape。
- weights 每行和为 1。
- future weights 为 0。
- 修改未来 token 不影响过去输出。
- 禁用 mask 时未来 token 可见，用于对照。

最小实验：

```python
out1, _ = attention(q, k, v, causal=True)
v_changed = v.clone()
v_changed[..., -1, :] += 1000
out2, _ = attention(q, k, v_changed, causal=True)
assert torch.allclose(out1[..., 0, :], out2[..., 0, :])
```

这个测试的含义是：修改最后一个未来 token 的 value，不应该影响第 0 个位置的输出。

更锋利的未来泄漏测试应该同时改未来位置的 `k/v`，并在完整 MHA 中修改未来 hidden state，检查所有过去位置都不变，而不是只检查第 0 个位置。若使用 padding mask，`weights.sum(dim=-1) == 1` 的断言只应施加在有效 query 行上；padding query 行的权重和应该是 0。

## 10. Attention weights：适合检查机制，不适合作证据

attention weights 适合拿来检查机制：mask 有没有生效，某个位置大概看向哪里。要解释最终答案，还要看后续层、FFN、残差、输出变化和干预实验。

- 权重大，不代表最终答案完全由该 token 决定。
- 多层、多头、FFN、residual 会继续改变信息。
- 真正可靠的诊断要结合 loss、输出变化、干预实验和评测。

所以本章看 attention weights，是为了检查机制是否工作，不是为了宣布模型“可解释”。

领域文本里的 attention 权重只能说明 token-level 机制的一部分。法律风险、医学建议这类结论还需要证据来源、任务评测、安全策略和人工复核。

## 常见错误

| 常见错误 | 正确认识 |
| --- | --- |
| Softmax 维度写错 | 应该在 key 维归一化，即最后一维 |
| mask 用 0 填未来位置 | 应使用负无穷或 dtype 最小值 |
| causal mask 和 padding mask 混为一谈 | 一个防未来，一个防 pad |
| 忘记除以 `sqrt(d_k)` | 分数尺度可能过大，Softmax 过尖 |
| 以为 attention weights 就是解释 | 它只是机制观察，不是完整因果解释 |
| 修改未来 token 后过去输出变化 | causal mask 失效 |
| 把 score shape 写成 `[B,T,H,H]` | token 位置之间打分，正确是 `[B,H,T,T]` |

## 测试验收

- q/k/v shape 必须可解释。
- score shape 必须是 `[B,H,T,T]`。
- causal mask 后未来权重为 0。
- weights 最后一维求和约等于 1。
- 能用小矩阵手算一轮 QK、Softmax 和加权求和。
- 能证明去掉 causal mask 后训练 loss 可能虚低。
- 能解释 padding mask 作用在 key 维。
- 能写一个“修改未来 token 不影响过去输出”的测试。
- 能写 padding query 输出清零测试。

## FAQ

### 1. Q、K、V 都来自同一个 x，为什么还要分三个投影？

因为同一个 token 在 attention 里有三种角色：发起查询、被别人匹配、提供内容。三个投影让模型可以为三种角色学习不同表示。

### 2. 为什么 decoder-only LLM 用 causal attention？

因为它训练和生成的目标都是从左到右预测下一个 token。看未来会破坏任务定义。

### 3. attention 是不是检索？

可以类比为内部软检索。Q/K 计算匹配，V 提供内容。但它发生在模型 hidden state 内部，不等同于 RAG 对外部知识库的检索。

### 4. 为什么 softmax 后权重和为 1？

因为每个 query 位置要把注意力分配到可见 key 位置上。权重和为 1 后，加权 value 的尺度更稳定，也更容易解释为“分配比例”。

### 5. 为什么 V 不参与打分？

打分阶段只需要判断“看谁”，由 Q 和 K 完成；V 是“看到了以后取什么内容”。分离后模型可以学习不同的匹配空间和内容空间。

### 6. Attention 能解决所有长上下文问题吗？

不能。标准 attention 的 score 是 `[T,T]`，长上下文成本高；而且能看见上下文不等于能正确使用上下文。后续还需要 RoPE、KV cache、RAG 和评测。

## 自测题

1. `q: [B,H,T,D]`，`k.transpose(-2,-1)` 的 shape 是什么？
2. 为什么 score 是 `[B,H,T,T]`？
3. `sqrt(d_k)` 不除可能发生什么？
4. causal mask 和 padding mask 分别解决什么问题？
5. 为什么 attention weights 不能直接当成完整解释？
6. 写出一个测试未来 token 泄漏的方法。

答案要点：

- `k.transpose(-2,-1): [B,H,D,T]`。
- 每个 query 位置要和每个 key 位置打分。
- Softmax 可能过尖，梯度不稳定。
- causal 防未来，padding 防读取 pad。
- 后续层、FFN、residual 和输出都会继续改变信息。
- 修改某个未来位置的 K/V 或 token，检查过去位置输出是否不变。

## 想继续深挖

继续深挖 attention，可以盯住一行公式：

```text
Attention(Q,K,V) = softmax(QK^T / sqrt(d_k) + mask) V
```

`QK^T` 负责匹配，`sqrt(d_k)` 控制尺度，`mask` 划掉未来或 padding，softmax 变成权重，最后乘 `V` 取回内容。最值得反复手算的是 3 个 token 的 causal mask：第一行只能看自己，第二行能看前两个，第三行能看前三个。这个小矩阵就是 decoder-only LM 不偷看未来的数学边界。

## 和领域项目的关系

法律合同审查里，模型需要把“它”“该条款”“上述违约责任”等指代和上下文联系起来；医学科普里，模型需要把症状、危险信号、指南条件关联起来。Attention 提供的是上下文选择机制。

但 attention 不是事实来源。它能帮助模型在上下文内汇聚信息，却不能保证外部知识正确。因此后面还要引入 RAG、citation support、安全拒答和人工复核。
