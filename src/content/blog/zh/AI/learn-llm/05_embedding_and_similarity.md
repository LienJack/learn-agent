---
title: "第 5 章：Embedding 与相似度"
description: "token id 只是编号，模型怎么学出语义？"
author: LienJack
pubDate: 2026-06-01
locale: zh
tags:
  - LLM 学习
  - LLM
  - AI
---
# 第 5 章：Embedding 与相似度

## 本章核心困惑

token id 只是编号，模型怎么学出语义？

当 tokenizer 把文本变成：

```text
"合同 违约金 过高" -> [12, 305, 88]
```

这些数字本身并不懂语义。`12` 不比 `305` 更“合同”，`88` 也不天然表示“过高”。它们只是词表里的身份证号。

那模型怎么从这些编号里学出“违约金”和“合同风险”有关，“胸痛”和“及时就医”有关？

答案是 embedding。

embedding 做的第一件事，是把离散 token id 查成连续向量：

```text
12  -> [0.2, -0.1, 0.7, ...]
305 -> [0.4,  0.3, 0.1, ...]
88  -> [-0.5, 0.8, 0.2, ...]
```

一旦变成向量，模型就可以做矩阵乘法、点积、距离、相似度和梯度更新。

本章还要澄清一个非常容易混淆的问题：

> LLM 内部的 token embedding 和 RAG 使用的 retrieval embedding，不是同一个东西。

它们都叫 embedding，但服务的任务不同、训练目标不同、使用方式也不同。

## 前置知识

- 知道 token id 和 vocab。
- 能读懂 `[B,T,C]` embedding 输出。
- 知道点积、范数和余弦相似度的基本直觉。
- 已理解第 3 章里 logits、概率和 loss 的关系。

## 本章新增能力

学完本章，你应该能做到：

- 解释 embedding lookup 本质上是查表。
- 说明 token embedding 会随训练更新，不是固定词典解释。
- 手算 dot product、norm、cosine similarity。
- 区分 token embedding、sentence embedding、document embedding。
- 解释 RAG 检索为什么依赖相似度，但相似不等于证据充分。

一句话记忆：

> embedding 把离散符号放进连续空间；相似度让模型可以用数字回答“像不像、相关不相关”。

本章的问题演化链是：

```text
token id 只有身份
  -> embedding lookup 给它连续向量
    -> 训练让向量服务于 loss
      -> 点积、范数、cosine 衡量向量关系
        -> attention 用相似度分配上下文
          -> RAG 用相似度召回证据候选
            -> 高风险领域还要判断证据是否支持结论
```

## 1. 为什么 token id 不够用

token id 最大的问题是它只有身份，没有关系。

假设词表里：

```text
合同 -> 12
违约金 -> 305
苹果 -> 88
```

这些编号的大小没有语义：

```text
12 和 305 的距离 = 293
12 和 88 的距离 = 76
```

如果直接用 id 的数值做计算，模型可能会误以为“合同”和“苹果”更近，因为 `12` 和 `88` 的数字差更小。这显然不对。

所以 token id 不能直接作为语义输入。它必须先通过 embedding 表：

```text
embedding_table: [vocab_size, hidden_dim]
```

每个 id 对应表里一行向量。

## 2. Embedding lookup：查表，不是魔法

embedding 层可以先理解成一个可训练词典：

```text
id 0 -> vector_0
id 1 -> vector_1
id 2 -> vector_2
...
```

如果：

```text
vocab_size = 5
hidden_dim = 3
```

embedding 表就是：

```text
[
  [ 0.10,  0.20, -0.10],  # id 0
  [ 0.03, -0.40,  0.50],  # id 1
  [ 0.70,  0.10,  0.20],  # id 2
  [-0.20,  0.80,  0.01],  # id 3
  [ 0.11,  0.05, -0.60],  # id 4
]
```

输入：

```text
input_ids = [2, 3, 1]
```

输出：

```text
[
  [ 0.70,  0.10,  0.20],
  [-0.20,  0.80,  0.01],
  [ 0.03, -0.40,  0.50],
]
```

这就是 lookup。

PyTorch 代码：

```python
embedding = torch.nn.Embedding(num_embeddings=5, embedding_dim=3)
input_ids = torch.tensor([[2, 3, 1]])
x = embedding(input_ids)
assert x.shape == (1, 3, 3)
```

这里输出 shape 是 `[B,T,C]`。

## 3. Embedding 为什么能学出语义

刚初始化时，embedding 向量通常是随机的。它并不懂“合同”或“医学”。

语义来自训练。

如果“违约金”“赔偿”“逾期”“风险”经常出现在相似上下文里，并且它们对 loss 的影响方向相近，那么训练会不断调整这些 token 的向量，让模型更容易用它们预测后续 token 或完成任务。

直观说：

```text
经常在相似语境中扮演相似角色的 token，
会被训练推到表示空间中更有用的位置。
```

注意，这不是说 embedding 空间一定能被简单解释成“语义地图”。它只是模型为了降低 loss 学出的内部表示。我们可以观察相似性，但不要过度神化。

## 4. 向量空间：方向、长度和位置

embedding 一旦变成向量，我们就可以讨论：

- 方向：两个向量指向是否相似。
- 长度：一个向量的 norm 有多大。
- 距离：两个点离得多远。
- 相似度：两个表示是否相关。

在二维里，你可以画图；在真实 LLM 里，hidden_dim 可能是 768、4096、8192，无法直接画出来，但数学操作类似。

生活类比：同一份简历可以从不同角度评分。技术面试官看“工程能力”，HR 看“岗位匹配”，业务负责人看“领域经验”。embedding 的每个维度不一定有明确人类标签，但整体向量像是在一个高维评分空间里给 token 定位。

## 5. 点积：方向和长度一起影响相似度

点积定义：

```text
a · b = a1*b1 + a2*b2 + ... + an*bn
```

最小例子：

```text
a = [1, 2]
b = [3, 4]

a · b = 1*3 + 2*4 = 11
```

点积大，通常表示两个向量方向相近且长度较大。但它同时受方向和长度影响。

例如：

```text
a = [1, 0]
b = [10, 0]
c = [1, 1]
```

点积：

```text
a · b = 10
a · c = 1
```

从方向看，`a` 和 `b` 完全同向；`a` 和 `c` 有 45 度夹角。点积把方向和长度混在一起，所以 `b` 很长时得分更大。

attention 里的 `QK^T` 本质上就是大量点积。当前 token 的 query 和历史 token 的 key 点积越大，说明当前 token 越“想看”那个历史位置。

## 6. 范数：向量有多长

向量范数可以理解成长度。最常见的 L2 norm：

```text
||a|| = sqrt(a1^2 + a2^2 + ... + an^2)
```

例子：

```text
a = [3, 4]
||a|| = sqrt(3^2 + 4^2) = 5
```

范数在很多地方都会出现：

- cosine similarity 要用范数归一化。
- 梯度裁剪会限制 gradient norm。
- RMSNorm 会用均方根稳定 hidden state。
- 向量数据库有时会先 normalize embedding。

直观感受：

- 方向表示“像什么”。
- 长度有时表示“强度”或“置信倾向”，但不能随便解释。

## 7. 余弦相似度：更关注方向

余弦相似度定义：

```text
cos(a,b) = (a · b) / (||a|| * ||b||)
```

它把长度影响除掉，更关注方向是否一致。

例子：

```text
a = [1, 0]
b = [10, 0]
c = [0, 1]
```

结果：

```text
cos(a,b) = 1
cos(a,c) = 0
```

`a` 和 `b` 长度不同，但方向完全一样，所以 cosine 是 1。`a` 和 `c` 垂直，所以 cosine 是 0。

在 RAG 检索里，我们常常把 query 和文档片段都变成 embedding，然后用 cosine similarity 或 dot product 找最近的 chunk。

但要记住：

> 相似度只说明“向量接近”，不自动说明“证据支持答案”。

这就是后面评测章节要测 citation support 的原因。

## 8. token embedding、sentence embedding、document embedding

这三个都叫 embedding，但不要混在一起。

| 类型 | 输入 | 输出 | 常见用途 |
| --- | --- | --- | --- |
| token embedding | token id | 每个 token 一个向量 | LLM 内部计算 |
| sentence embedding | 一句话 | 整句一个向量 | 语义匹配、检索 |
| document embedding | 文档或 chunk | 每个 chunk 一个向量 | RAG 召回 |

LLM 内部 token embedding：

```text
input_ids: [B,T]
embedding: [B,T,C]
```

RAG retrieval embedding：

```text
query_text -> [D_emb]
chunk_text -> [D_emb]
similarity(query, chunk)
```

`D_emb` 由检索 embedding 模型决定，不要求等于生成模型 hidden size `C`。它们的训练目标不同。生成模型的 token embedding 是为了帮助 next-token prediction；检索模型的 embedding 通常是为了让语义相关文本在向量空间靠近。

所以不要直接拿 LLM 的内部 token embedding 当 RAG 检索 embedding，除非你非常清楚自己在做什么，并且有评测证明效果。

## 9. Embedding 和上下文：同一个 token 在不同句子里不是同一个表示

embedding table 查出来的是初始 token 向量。但进入 Transformer 后，token 表示会被上下文不断改写。

例如：

```text
苹果 发布 新 手机
我 吃 了 苹果
```

同一个“苹果”的 token embedding 初始查表可能一样，但经过 attention 后，它在两句话里的 hidden state 应该不同。

所以要区分：

- token embedding：输入层查表得到的静态起点。
- contextual hidden state：经过上下文建模后的动态表示。

RAG 用的 sentence/document embedding 也通常是某种上下文编码后的整体向量，不是单个 token 的初始 embedding。

## 10. 最小实验：比较 dot 和 cosine

下面用小向量观察长度和方向的影响：

```python
import torch

a = torch.tensor([1.0, 0.0])
b = torch.tensor([10.0, 10.0])  # 很长，但方向偏
c = torch.tensor([1.0, 0.0])    # 短，但方向完全一致

def cosine(x, y, eps=1e-8):
    return (x * y).sum() / (x.norm() * y.norm() + eps)

print("dot(a,b)", (a * b).sum().item())
print("dot(a,c)", (a * c).sum().item())
print("cos(a,b)", cosine(a, b).item())
print("cos(a,c)", cosine(a, c).item())
```

你会看到：

```text
dot(a,b) > dot(a,c)
cos(a,b) < cos(a,c)
```

这是真正的排序反转：dot product 被 `b` 的长度支配，认为 `b` 更相似；cosine 去掉长度影响后，认为方向完全一致的 `c` 更相似。安全版 `cosine(..., eps=1e-8)` 也避免了空文本、异常输入或全零向量导致除零。

## 11. 最小 RAG 检索例子

假设有三个 chunk：

```text
chunk_1: 合同违约金应结合实际损失判断
chunk_2: 胸痛伴呼吸困难应及时就医
chunk_3: 今天适合学习张量 shape
```

用户 query：

```text
违约金过高有什么风险
```

RAG 的第一步不是生成答案，而是检索相关证据：

```text
query -> query_embedding
chunk_i -> chunk_embedding_i
score_i = cosine(query_embedding, chunk_embedding_i)
```

然后取 top-k chunk 给生成模型。

但如果 top-k 里没有真正支持答案的证据，模型应该说：

```text
资料不足，无法基于当前证据判断，需要人工复核。
```

而不是凭相似度强行回答。

## 12. 相似不等于支持：领域项目的关键边界

这一点要反复强调。

在法律场景中，一个 chunk 和问题相似，不代表它适用当前合同：

- 管辖区可能不同。
- 法规版本可能过期。
- 合同类型可能不同。
- chunk 只提到一般原则，不支持具体结论。

在医学场景中，一个科普片段和症状相似，也不代表可以诊断：

- 年龄、病史、用药、持续时间缺失。
- 红旗症状需要就医，而不是聊天回答。
- 指南适用范围可能有限。

所以 RAG 至少要区分：

```text
retrieved: 检索到了相似片段
relevant: 片段和问题相关
supporting: 片段足以支持答案
```

很多 demo 只做到 retrieved，看起来很像 RAG；真正可发布的领域系统必须继续检查 supporting。

后续评测可以从 claim-level schema 开始：

```json
{
  "claim": "该违约金条款可能被请求调整",
  "citation_id": "chunk_1",
  "support_label": "supported"
}
```

`support_label` 至少应覆盖：`supported`、`partially_supported`、`unsupported`、`contradicted`。法律/医学项目还可以继续加 `human_review_required`、`unsafe_overclaim`、`medical_red_flag_referral` 等字段。

## 13. 最小推导：Embedding 参数如何被训练更新

embedding lookup 看起来只是查表，但查出来的向量会参与后续计算，因此它也是可训练参数。

看一个极小例子。词表里 id `2` 的 embedding 是一维参数：

```text
E[2] = e
```

模型非常简化：

```text
logit = e * w
loss = (logit - y)^2
```

设：

```text
e = 1
w = 2
y = 10
```

前向：

```text
logit = 1 * 2 = 2
loss = (2 - 10)^2 = 64
```

对 embedding 参数 `e` 求梯度：

```text
d loss / d e
= d loss / d logit * d logit / d e
= 2(logit - y) * w
= 2(2 - 10) * 2
= -32
```

学习率 `0.1`：

```text
e_new = e - 0.1 * (-32) = 4.2
```

这个例子当然过度简化，但它说明了核心：某个 token 出现在输入中，它对应的 embedding 行会沿着降低 loss 的方向更新。真实 LLM 中，一个 token 的 embedding 会通过多层 attention、FFN 和 LM head 间接影响很多位置的 loss。

这也解释了为什么领域继续训练会改变词向量：如果“违约金”“实际损失”“人工复核”在训练目标中经常共同出现，相关 token 的表示会被调整到更有利于预测这些上下文的位置。

## 14. 相似度的反例：长度、热门词和伪相关

反例 1：dot product 被长度支配。

```text
a = [1, 0]
b = [100, 0]
c = [1, 1]
```

`a · b = 100`，`a · c = 1`。如果只看 dot product，`b` 得分巨大。很多时候这是合理的，因为方向完全一致且长度大；但在检索中，长度可能来自模型的尺度偏差，不一定代表更相关。因此很多 embedding 检索会先 normalize，再比较 cosine 或等价的 dot product。

反例 2：相似文本不支持结论。

用户问：

```text
本合同约定 80% 违约金，一定无效吗？
```

检索到：

```text
违约金可根据实际损失、合同履行情况等因素调整。
```

这个 chunk 相关，但不支持“一定无效”。安全回答应该说“资料不足以得出确定结论，需要结合具体事实和适用法律人工复核”，而不是把相似内容扩写成结论。

反例 3：医学症状相似但适用范围不同。

“头痛”相关 chunk 可能是普通科普，也可能是偏头痛介绍。但如果用户同时有“突然剧烈头痛、意识模糊”，检索相似科普并不足以支持普通建议，系统应识别红旗症状并建议及时就医。

边界：embedding 相似度是召回工具，不是事实裁判。它能帮你找到候选材料，但不能替你判断材料是否适用、是否过期、是否足以支撑结论。

## 15. 最小实验：观察 embedding 行是否真的更新

可以用一个小测试证明 embedding 不是静态词典：

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

torch.manual_seed(0)

embedding = nn.Embedding(5, 3)
head = nn.Linear(3, 2)
optimizer = torch.optim.SGD(
    list(embedding.parameters()) + list(head.parameters()),
    lr=0.1,
)

ids = torch.tensor([2])
label = torch.tensor([1])

before_used = embedding.weight[2].detach().clone()
before_unused = embedding.weight[4].detach().clone()

x = embedding(ids)
logits = head(x)
loss = F.cross_entropy(logits, label)
loss.backward()
optimizer.step()

after_used = embedding.weight[2].detach()
after_unused = embedding.weight[4].detach()

assert not torch.allclose(before_used, after_used)
assert torch.allclose(before_unused, after_unused)
```

这个实验说明：在这个最小例子里，我们使用普通 `Embedding`、SGD 且无 weight decay，所以只有被 lookup 的 embedding 行收到非零梯度；没用到的行不会在这一步更新。真实 LM 如果使用 tied embeddings、LM head 或 decoupled weight decay，未作为输入出现的 token 行也可能通过其他路径更新。随着不同 token 出现在不同 batch，它们的 embedding 会逐步被塑形。

## 16. 常见错误

| 常见错误 | 正确认识 |
| --- | --- |
| 把 token id 当语义数字 | id 只是编号，要先查 embedding |
| 把 token embedding 当固定词典释义 | embedding 会随训练更新，是模型内部表示 |
| 混淆 token embedding 和 retrieval embedding | 它们任务目标不同 |
| 只用 dot product 排序 | dot 受向量长度影响 |
| 相似度高就当证据充分 | 还要 citation support 检查 |
| 过度解释二维可视化 | 降维图只是观察工具，不是证明 |
| 忽略 embedding 模型版本 | RAG index 必须记录 embedding model/version |

最小 `retrieval_index_manifest.yaml` 可以记录：

```yaml
embedding_model: text-embedding-example
embedding_model_version: "2026-05-31"
embedding_dim: 768
normalize: true
metric: cosine
chunking:
  max_tokens: 300
  overlap_tokens: 50
source_filter: teaching_toy_data_only
```

## 17. 测试验收

本章学完，至少应该能通过这些验收：

- 本章最低产物：`tests/test_dot_vs_cosine_ranking.py` 能证明 dot/cosine 排序反转，`tests/test_embedding_update.py` 能证明最小 embedding 行更新。
- 能解释 embedding lookup 为什么输出 `[B,T,C]`。
- 能手算 dot product、norm、cosine similarity。
- 能用代码比较 dot 和 cosine 的排序差异。
- 能观察 token embedding 训练前后的参数变化。
- 能用 sentence/document embedding 做一次 toy 检索。
- 能说明 RAG embedding 模型和生成模型不是同一个部件。
- 能解释“相似”和“证据支持”的区别。

## FAQ

### 1. embedding 的每个维度都有明确含义吗？

通常没有。我们可以观察某些方向或聚类，但不能假设第 17 维就固定代表“法律风险”。embedding 是为训练目标服务的高维表示，不是人类设计的标签表。

### 2. 为什么 cosine similarity 常用于检索？

因为它更关注方向，能减少向量长度对相似度的影响。很多 embedding 模型会把向量 normalize 后再做 dot product，此时 dot product 和 cosine similarity 等价。

### 3. RAG 检索 top-1 很相似，为什么还要让模型拒答？

因为相似片段可能不足以支持结论。高风险领域需要证据支持、适用范围和不确定性表达。相似只是召回候选，不是最终裁判。

### 4. embedding 训练好了还会变吗？

如果继续训练模型，token embedding 参数会更新。如果使用外部 embedding 模型做 RAG，除非你更新 embedding 模型或重新建索引，否则已有向量不会自动变化。

## 自测题

1. token id 为什么不能直接表示语义距离？
2. embedding table 的 shape 是 `[V,C]`，输入 `[B,T]`，输出是什么？
3. 点积和 cosine similarity 最大区别是什么？
4. 为什么 attention 里的 `QK^T` 可以看成相似度计算？
5. RAG 中 retrieved、relevant、supporting 有什么区别？

答案要点：

- id 只是词表编号，数值大小没有语义。
- 输出 `[B,T,C]`。
- 点积受长度和方向共同影响，cosine 更关注方向。
- query 和 key 点积衡量当前位置对历史位置的匹配程度。
- retrieved 是召回，relevant 是相关，supporting 是足以支撑答案。

## 想继续深挖

继续深挖 embedding，要把“像不像”拆成两个量：方向和长度。点积是：

```text
dot(a,b) = Σ_i a_i b_i
```

余弦相似度是：

```text
cos(a,b) = dot(a,b) / (||a|| * ||b||)
```

如果 `a=[10,0]`，`b=[1,0]`，`c=[0,1]`，那么 `dot(a,b)=10`，`cos(a,b)=1`；`dot(a,c)=0`，`cos(a,c)=0`。点积同时受方向和长度影响，cosine 更关注方向。

这也是 RAG 的边界：高相似度只说明 query 和 chunk 在 embedding 空间接近，不说明 chunk 能支持答案。领域系统要把相似度继续交给 citation support 检查，判断“这段证据是否真的支撑这个结论”。

## 和领域项目的关系

RAG 检索、证据引用、相似案例召回都依赖 embedding。法律和医学场景中，相似不等于可用依据。本章为后续 RAG baseline、citation support、无依据拒答、数据版本管理打基础。

如果你把 embedding 理解成“语义魔法”，后面很容易写出看似聪明但无法审计的系统；如果你把 embedding 理解成“可训练向量 + 相似度工具 + 明确边界”，就能更稳地把它放进领域小模型工程里。
