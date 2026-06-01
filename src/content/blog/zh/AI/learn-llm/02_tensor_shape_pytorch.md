---
title: "第 2 章：张量、shape 与 PyTorch 基础"
description: "LLM 学习里，很多 bug 不是公式不懂，而是 shape 对不上。"
author: LienJack
pubDate: 2026-06-01
locale: zh
tags:
  - LLM 学习
  - LLM
  - AI
---
# 第 2 章：张量、shape 与 PyTorch 基础

## 本章核心困惑

LLM 学习里，很多 bug 不是公式不懂，而是 shape 对不上。

初学者常常觉得张量只是“很多数字”，真正写代码时才发现，模型报错往往不是因为概念不会，而是因为某个维度放错了：

```text
Expected size [..., 128], got [..., 127]
mat1 and mat2 shapes cannot be multiplied
The size of tensor a must match the size of tensor b
```

这些报错看起来冷冰冰，其实都在问同一个问题：

> 你知道每一步数据长什么样吗？

LLM 里的 tokenizer、embedding、attention、logits、labels、LoRA、RAG、评测输出，最后都会落到张量或结构化数组上。本章要建立的不是“背公式”的能力，而是看 shape 的能力。

贯穿本章的核心路线是：

```text
文本 -> token ids -> embedding -> attention -> logits -> labels/loss
```

只要这条 shape 主线清楚，后面的 Transformer 就不会像黑箱。

## 前置知识

- 已理解第 1 章训练循环。
- 知道向量、矩阵和三维数组的直观含义。
- 能运行简单 PyTorch tensor 操作。
- 不要求熟悉所有 PyTorch API，但要愿意逐行打印 shape。

## 本章新增能力

学完本章，你应该能做到：

- 用自己的话解释向量、矩阵、张量的区别。
- 读懂 `[B,T]`、`[B,T,C]`、`[B,H,T,D]`、`[B,T,V]`。
- 解释 batch、seq_len、hidden、heads、head_dim、vocab_size 的含义。
- 判断 `reshape`、`transpose`、`matmul`、broadcasting 是否合理。
- 用 pytest 写 shape 契约，提前抓住模型错位。

一句话记忆：

> shape 是深度学习里的地图。你可以暂时忘公式，但不能丢地图。

本章的问题演化链是：

```text
文本为什么不能直接进模型
  -> token ids 为什么是整数矩阵
    -> embedding 为什么多出 hidden 维
      -> Linear 为什么只改最后一维
        -> attention 为什么出现两个 T
          -> mask 为什么能广播
            -> labels 为什么不是 logits 的 one-hot 版本
```

## 1. 从数字容器开始：向量、矩阵、张量是什么

最直观地说：

- 向量是一排数。
- 矩阵是一张二维表。
- 张量是更高维的数字容器。

例如，一个 token 的 embedding 可以是向量：

```text
"合同" -> [0.2, -0.1, 0.7]
```

一句话有多个 token，就变成矩阵：

```text
"合同 违约金 过高"

[
  [ 0.2, -0.1,  0.7],
  [ 0.4,  0.3,  0.1],
  [-0.5,  0.8,  0.2],
]
```

这个矩阵的 shape 是：

```text
[3, 3] = [token 数量, embedding 维度]
```

如果一次训练不只一句话，而是一个 batch：

```text
batch = 2
seq_len = 3
hidden = 3
```

那 shape 就变成：

```text
[2, 3, 3]
```

这就是三维张量。

生活类比：向量像一行表格，矩阵像一张 Excel，三维张量像一叠 Excel。LLM 训练时处理的是很多叠、多层、多头的 Excel。

## 2. LLM 里最重要的六个 shape

先把主线背下来：

```text
input_ids: [B,T]
embedding: [B,T,C]
q/k/v:     [B,H,T,D]
score:     [B,H,T,T]
logits:    [B,T,V]
labels:    [B,T]
```

这里要先把 labels 说严谨：`logits: [B,T,V]` 是每个位置对整个词表的分数；`labels: [B,T]` 是每个位置的正确 token id。Cross entropy 会用 token id 索引正确类，不需要把 labels 写成 `[B,T,V]` 的 one-hot。

每个字母的含义：

| 符号 | 含义 | 例子 |
| --- | --- | --- |
| `B` | batch size，一次处理多少条样本 | 2 条合同片段 |
| `T` | sequence length，每条样本多少 token | 128 个 token |
| `C` | hidden size，每个 token 的向量维度 | 768 维 |
| `H` | attention heads，多头数量 | 12 个头 |
| `D` | head dim，每个头的维度 | `C / H` |
| `V` | vocab size，词表大小 | 32000 |

这些符号不是装饰。它们决定矩阵能不能相乘，loss 能不能对齐，mask 会不会广播错。

### 本课程 mask 命名约定

从本章开始，mask 统一按作用位置命名：

| 名称 | 典型 shape | 作用 |
| --- | --- | --- |
| `padding_mask` / `attention_mask` | `[B,T]` | 标记真实 token 与 pad token，通常作用在 key 维 |
| `causal_mask` | `[T,T]` 或 `[1,1,T,T]` | 防止当前位置看未来 token |
| `additive_attention_bias` | 可广播到 `[B,H,T,T]` | 加到 attention scores 上，常用 `-inf` 屏蔽不可见位置 |
| `label_mask` | `[B,T]` | 决定哪些位置参与 loss |

一个位置“不能被看见”和“不要参与 loss”不是同一件事。`attention_mask=0` 控制上下文可见性，`labels=-100` 或 `label_mask=0` 控制是否评价这个位置。

## 3. 从文本到 token ids：为什么是 `[B,T]`

模型不能直接处理中文字符串。文本要先经过 tokenizer 变成 token id：

```text
"合同 违约金 过高" -> [12, 305, 88]
```

如果 batch 里有两条样本：

```text
样本 1: [12, 305, 88]
样本 2: [91, 44,  8]
```

合起来就是：

```text
input_ids = [
  [12, 305, 88],
  [91, 44,  8],
]
```

shape：

```text
[B,T] = [2,3]
```

注意，`input_ids` 不是 embedding。它只是整数编号。编号本身没有语义距离，`12` 不一定比 `305` 更接近 `88`。语义要等 embedding 表把 id 查成向量之后才开始出现。

## 4. Embedding：从 `[B,T]` 到 `[B,T,C]`

embedding 层本质是一张查表矩阵：

```text
embedding_table: [V,C]
```

如果词表大小 `V = 1000`，hidden size `C = 64`，那么表里有 1000 行，每行是一个 64 维向量。

输入：

```text
input_ids: [B,T]
```

查表后：

```text
x: [B,T,C]
```

最小代码：

```python
B, T, C, V = 2, 4, 8, 20
ids = torch.randint(0, V, (B, T))
embedding = torch.nn.Embedding(V, C)
x = embedding(ids)

assert ids.shape == (B, T)
assert x.shape == (B, T, C)
```

直观感受：

- `[B,T]` 是每个位置的 token 编号。
- `[B,T,C]` 是每个位置的语义向量。

也就是说，每个 token 从“身份证号”变成了“个人档案”。

## 5. Linear：最后一维发生变换

PyTorch 的 `nn.Linear(in_features, out_features)` 默认作用在最后一维。

如果：

```text
x: [B,T,C]
linear: C -> V
```

那么：

```text
logits = linear(x)
logits: [B,T,V]
```

这一步在语言模型里非常关键。LM head 会把每个位置的 hidden state 映射到整个词表：

```text
每个位置 -> 对 V 个候选 token 打分
```

所以输出是：

```text
[batch, seq_len, vocab_size]
```

初学者常见误解是以为模型只预测最后一个 token。训练时并不是这样。训练时模型会并行预测每个位置的下一个 token，所以 logits 是 `[B,T,V]`。推理生成时，我们通常只取最后一个位置的 logits 来采样下一个 token。

## 6. Attention 为什么会出现 `[B,H,T,T]`

attention 的核心问题是：

> 每个 token 应该看哪些历史 token？

如果一句话长度是 `T`，每个 query 位置都要给所有 key 位置打分，那么分数矩阵就是：

```text
[T,T]
```

第 `i` 行表示第 `i` 个 token 看所有 token 的分数。

加入 batch：

```text
[B,T,T]
```

加入多头：

```text
[B,H,T,T]
```

这就是 attention score 的来源。

最小形状推导：

```text
x: [B,T,C]
q/k/v projection 后: [B,T,C]
拆成 H 个头: [B,H,T,D]
q @ k.transpose(-2, -1) / sqrt(D): [B,H,T,T]
apply causal/padding mask: [B,H,T,T]
softmax over key dimension: [B,H,T,T]
weights @ v: [B,H,T,D]
合并 heads: [B,T,C]
lm_head: [B,T,V]
```

这里 `C = H * D`。如果 `hidden_dim` 不能被 `num_heads` 整除，head_dim 就不是整数，多头注意力无法平均拆分。

## 7. transpose、view、reshape：为什么维度顺序会坑你

在 attention 里，我们经常从：

```text
[B,T,C]
```

变成：

```text
[B,H,T,D]
```

常见写法：

```python
x = x.view(B, T, H, D)
x = x.transpose(1, 2)  # [B,H,T,D]
```

这里有两个坑。

第一个坑：`transpose` 改变的是视图里的维度顺序，不一定让内存连续。后面如果要 `view` 回去，通常要先：

```python
x = x.transpose(1, 2).contiguous().view(B, T, C)
```

第二个坑：`reshape` 有时会自动复制，有时返回视图。它更方便，但如果你不理解原始维度含义，`reshape` 可能把错误藏起来。

建议初学阶段养成习惯：

```python
print("after split heads:", q.shape)
print("after scores:", scores.shape)
```

别觉得打印 shape 土。真正调模型的人都靠这种路标活着。

## 8. Broadcasting：方便，也容易静默出错

broadcasting 是 PyTorch 自动扩展维度的机制。

例如：

```text
x:    [B,T,C]
bias: [C]
x + bias -> [B,T,C]
```

这是合理的，因为 bias 加到最后一维。

attention mask 里也常用 broadcasting：

```text
scores:       [B,H,T,T]
causal_mask:  [1,1,T,T]
padding_mask: [B,1,1,T]
combined:     [B,H,T,T]
```

问题是，broadcasting 有时不会报错，但语义错了。

比如你想 mask key 维，却把 mask 写成 `[B,T,1]`，它可能广播到 query 维，结果变成“某些 query 行被 mask”，而不是“某些 key 列不可见”。

所以 mask 的 shape 一定要写清楚：

```text
causal mask: 防止看未来，作用在 query-key 对上
padding mask: 防止看 pad，通常作用在 key 维
```

## 9. dtype 和 device：数字类型与设备也是契约

shape 对了，代码仍然可能因为 dtype 或 device 错。

常见 dtype：

- `torch.long`：token ids、labels。
- `torch.float32`：默认训练浮点。
- `torch.float16` / `torch.bfloat16`：混合精度训练和推理。
- `torch.bool`：mask。

常见错误：

```text
Embedding 输入用了 float，而不是 long
labels 用了 float，而 cross entropy 需要 long
mask 用 int 混进 masked_fill
一个 tensor 在 CPU，另一个 tensor 在 cuda
```

建议每章最小实验都打印：

```python
print(x.shape, x.dtype, x.device)
```

这三个字段加起来，才是完整的张量契约。

## 10. 最小实验：追踪一条 LLM shape 流

下面这个实验不训练模型，只追踪 shape：

```python
import torch

B, T, C, H, V = 2, 4, 8, 2, 20
D = C // H

input_ids = torch.randint(0, V, (B, T))
attention_mask = torch.ones(B, T, dtype=torch.bool)
embedding = torch.nn.Embedding(V, C)
x = embedding(input_ids)

qkv = torch.nn.Linear(C, 3 * C)(x)
q, k, v = qkv.chunk(3, dim=-1)

q = q.view(B, T, H, D).transpose(1, 2)
k = k.view(B, T, H, D).transpose(1, 2)
v = v.view(B, T, H, D).transpose(1, 2)

scores = q @ k.transpose(-2, -1) / (D**0.5)
causal_mask = torch.tril(torch.ones(T, T, dtype=torch.bool))
padding_mask = attention_mask[:, None, None, :]
scores = scores.masked_fill(~causal_mask[None, None, :, :], float("-inf"))
scores = scores.masked_fill(~padding_mask, float("-inf"))
weights = torch.softmax(scores, dim=-1)
context = weights @ v
context = context.transpose(1, 2).contiguous().view(B, T, C)
logits = torch.nn.Linear(C, V)(context)

assert input_ids.shape == (B, T)
assert x.shape == (B, T, C)
assert q.shape == (B, H, T, D)
assert scores.shape == (B, H, T, T)
assert weights.shape == (B, H, T, T)
assert context.shape == (B, T, C)
assert logits.shape == (B, T, V)
```

建议你不要只复制运行，而是每一步都问：

```text
这一维代表什么？
为什么要放在这个位置？
下一步会和谁相乘？
```

能回答这三个问题，shape 才真的学会了。

## 11. 最小矩阵乘法推导：为什么 Linear 改的是最后一维

`nn.Linear(C, V)` 对 `[B,T,C]` 的最后一维做变换。可以先忽略 batch 和时间，只看一个 token：

```text
x = [1, 2]        # C = 2
W = [[1, 0, 2],
     [0, 1, 3]]   # [C,V] = [2,3]
b = [0.1, 0.2, 0.3]
```

矩阵乘法：

```text
xW = [
  1*1 + 2*0,
  1*0 + 2*1,
  1*2 + 2*3,
] = [1, 2, 8]
```

加 bias：

```text
logits = [1.1, 2.2, 8.3]
```

这就是一个位置对 3 个词表候选的打分。如果有 `T` 个位置，就对每个位置重复同样的最后一维变换；如果有 `B` 条样本，就对每条样本重复。

因此：

```text
[B,T,C] @ [C,V] -> [B,T,V]
```

PyTorch 不需要你手动展开 `B*T`，因为 `Linear` 会把前面的维度当作批量维度保留，只变换最后一维。

## 12. 两个具体例子：shape 错位如何污染任务

例子 1：法律合同分类。

```text
input_ids: [B,T]
labels:    [B]
```

如果任务是“整段合同片段分类”，模型可能取最后一个 hidden state 或 pooled representation，再输出：

```text
logits: [B,num_classes]
```

这时 labels 是 `[B]`，不是 `[B,T]`。如果你误用语言模型的 token-level loss，把每个 token 都当分类标签，shape 可能被勉强改到能跑，但任务语义已经错了。

例子 2：医学 SFT。

```text
logits: [B,T,V]
labels: [B,T]
```

这里是 token-level next-token loss。若 label mask 写成 `[B,T,1]` 后错误广播，可能把整行 query 位置 mask 掉，而不是只 mask padding key 或 user token。loss 会变小，但模型没有学到正确的 assistant 回复范围。

## 13. 反例与边界：shape 对了，语义仍然可能错

最危险的一类 bug 是 shape 完全正确，但含义错了。

反例 1：label shift 错位。

```text
input_ids: [A, B, C, D]
labels:    [A, B, C, D]
```

shape 是 `[T]`，和模型输出能对齐，但目标变成复制当前 token，而不是预测下一个 token。

反例 2：softmax 维度错。

```python
probs = torch.softmax(logits, dim=1)  # 错：在 T 维归一化
```

如果 `logits` 是 `[B,T,V]`，正确分类分布通常应该在 `V` 维：

```python
probs = torch.softmax(logits, dim=-1)
```

前者 shape 仍然是 `[B,T,V]`，但语义变成“不同位置之间竞争概率”，这不再是每个位置对词表的概率分布。

边界：shape 测试只能证明张量尺寸契约，不能证明目标、mask、概率维度和业务边界都正确。所以后续测试要同时覆盖 shape 和行为。

## 14. 常见错误

| 常见错误 | 正确认识 |
| --- | --- |
| 把 `[B,T,C]` 误当成 `[T,B,C]` | 先确认项目约定，PyTorch 现代 LLM 多用 batch-first |
| labels 写成 `[B,T,V]` | cross entropy 的 labels 通常是 `[B,T]` token id |
| head_dim 算错 | 必须满足 `hidden_dim % num_heads == 0` |
| causal mask 和 padding mask 混用 | 一个防未来，一个防 pad，shape 不同 |
| `view` 直接接在 `transpose` 后 | 常需要 `.contiguous()` |
| dtype 不匹配 | ids/labels 通常 long，mask bool，hidden float |
| 只在 notebook 里看 shape | 应该把关键 shape 写进 pytest |

## 15. 测试验收

本章学完，至少应该通过这些验收：

- 本章最低产物：能把 `input_ids -> embedding -> q/k/v -> scores -> weights -> context -> logits` 的 shape trace 跑通，并把关键 shape 写进测试。
- 能解释 `[B,T,C]` 每一维的含义。
- 能解释 attention score 为什么是 `[B,H,T,T]`。
- 能写一个 shape trace，从 `input_ids` 到 `logits`。
- 能写 pytest 覆盖 embedding、linear head、attention split heads。
- 能写行为测试证明 softmax 在 `dim=-1` 后概率和为 1。
- 能写行为测试证明 label shift 后，位置 `t` 的 logits 对齐 `input_ids[t+1]`。
- 能构造一次故意 shape mismatch，并读懂报错。
- 能解释 `input_ids` 和 `embedding` 的区别。
- 能说明 labels 为什么是 `[B,T]`，不是 `[B,T,V]`。

## FAQ

### 1. 为什么不统一把 batch 放最后？

可以，但项目必须有统一约定。PyTorch 早期 RNN 常见 `[T,B,C]`，现代 Transformer 教学和 Hugging Face 场景常见 `[B,T,C]`。本课程采用 batch-first，方便和 tokenizer batch 对齐。

### 2. `view` 和 `reshape` 到底用哪个？

教学阶段建议先理解 `view` 的限制：它要求内存布局兼容。`reshape` 更宽容，但可能隐藏复制。写 Transformer 时，`transpose(...).contiguous().view(...)` 是很常见的安全组合。

### 3. 为什么 attention score 是平方级 `[T,T]`？

因为每个 query 位置都要和每个 key 位置比较。序列长度翻倍，score 数量大约变成四倍。这也是长上下文推理昂贵的重要原因。

### 4. shape 对了是不是就一定对？

不是。shape 是第一道门，不是全部。softmax 维度、mask 方向、label shift 都可能 shape 正确但语义错误。所以测试既要查 shape，也要查行为。

## 自测题

1. `input_ids: [4, 128]`，embedding hidden size 是 768，输出 shape 是什么？
2. `hidden_dim = 1024`，`num_heads = 16`，`head_dim` 是多少？
3. attention score 的 `[B,H,T,T]` 中，最后两个 `T` 分别代表什么？
4. 为什么 `padding_mask` 通常要作用在 key 维？
5. 如果 `labels` 和 `input_ids` shape 一样，是否说明 label shift 一定正确？

答案要点：

- embedding 输出 `[4,128,768]`。
- head_dim 是 64。
- 倒数第二个 `T` 是 query 位置，最后一个 `T` 是 key 位置。
- 因为有效 token 不应该读取 pad token 的内容。
- 不一定，shape 一样只能说明尺寸对齐，不能说明语义右移正确。

## 想继续深挖

继续深挖 shape，可以把它当成“数学类型系统”。例如：

```text
input_ids: [B,T]
embedding_table: [V,C]
x = embedding(input_ids): [B,T,C]
lm_head: [C,V]
logits = x @ lm_head: [B,T,V]
```

这不是尺寸游戏，而是语义约束：`B` 是样本，`T` 是位置，`C` 是隐藏表示，`V` 是词表分数。只要某个维度的语义错了，代码可能还能运行，但模型会学错目标。

一个实用检查是给每个矩阵乘法写“最后两维合同”：

```text
[B,T,C] @ [C,V] -> [B,T,V]
[B,H,T,D] @ [B,H,D,T] -> [B,H,T,T]
```

如果你不能说出每个 `T` 分别代表 query 位置还是 key 位置，就不要继续写 attention。shape 深挖的目标，是让每一行 tensor 代码都能被翻译回模型语义。

## 和领域项目的关系

领域模型的 JSON 格式、RAG 引用、安全标签、拒答模板，最终都会变成 token 序列和 label mask。一个 label mask 维度广播错，可能让 system/user token 也参与 loss；一个 padding mask 错，可能让模型学习 pad 位置；一个 attention mask 错，可能让训练 loss 虚低。

所以 shape 不是基础课里的小知识，而是后续所有工程章节的地基。你越早把 shape 当成契约，后面越少被幽灵 bug 追着跑。
