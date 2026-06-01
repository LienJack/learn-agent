---
title: "第 4 章：Tokenizer、LM Dataset 与 padding label masking"
description: "文本如何变成模型能计算、能训练、还能正确忽略 padding 的数字？Tokenizer 不是附属工具，它决定文本边界、特殊 token 和 causal LM 的 loss 计算范围。"
author: LienJack
pubDate: 2026-06-01
locale: zh
tags:
  - LLM 学习
  - LLM
  - AI
---
# 第 4 章：Tokenizer、LM Dataset 与 padding label masking

## 本章核心困惑

文本如何变成模型能计算、能训练、还能正确忽略 padding 的数字？Tokenizer 不是附属工具，它决定文本边界、特殊 token 和 causal LM 的 loss 计算范围。

很多初学者会把 tokenizer 当成“把文字转成 id 的小工具”，直到训练时才发现模型开始输出一堆 padding，或者 loss 看起来正常但样本目标已经错位。问题往往不在 Transformer，而在数据进入模型之前已经错了。

本章的真实困惑可以串成一条链：

```text
原始文本
  -> 怎么切成 token
    -> 怎么变成 input_ids
      -> batch 里长度不同怎么 padding
        -> 哪些位置可以被 attention 看到
          -> 哪些位置应该参与 loss
```

如果第 3 章回答的是“模型在预测什么”，本章回答的就是“训练样本到底喂给模型什么，以及哪些 token 应该算错”。

## 前置知识

- 已理解 next-token labels 右移。
- 能读懂 `[B,T]` input_ids、attention_mask 和 labels。
- 知道训练 loss 只应该惩罚需要学习的位置。
- 理解 `F.cross_entropy(..., ignore_index=-100)` 会跳过对应 label。

本章不要求你从零实现工业级 BPE tokenizer，但要求你能看懂一个样本被 tokenizer 和 dataset 处理后的每个字段。

## 本章新增能力

你会实现 simple tokenizer 和 causal LM Dataset，理解 token、vocab、BPE/WordPiece 直觉、padding、truncation、attention mask、padding label masking 和 `ignore_index=-100`。

学完后你应该能做到：

- 用小词表手动 encode/decode。
- 解释 unknown token、special token、pad token、eos token 的作用。
- 构造 causal LM 的 `input_ids` 和 `labels`。
- 判断 padding mask、causal mask 和 label mask 的区别。
- 检查中文法条编号、医学剂量和英文缩写是否被异常切分。

一句话记忆：

> tokenizer 决定文本如何进入模型，dataset 决定样本如何组成 batch，label masking 决定模型到底为哪些 token 负责。

## 最小推导或最小代码

先固定本课程在第 3、4 章的默认约定：

```text
dataset 预先右移 labels
input_ids: [BOS, 合同, 违约金, 过高]
labels:    [合同, 违约金, 过高, EOS]
model/loss 不再二次 shift
```

这和很多 Hugging Face causal LM 的默认风格不同。HF 常见写法是 dataset 输出同长度 `input_ids` 和 `labels`，再由模型或 loss 内部用 `logits[:, :-1]` 对齐 `labels[:, 1:]`。两种都可以，但课程代码、文章和测试必须保持同一个约定。

padding 位置不能进 loss：

```text
input_ids      = [101, 20, 21, 0, 0]
attention_mask = [1,   1,  1, 0, 0]
labels         = [20, 21,102,-100,-100]
```

这里可以读成：

```text
真实 token 参与上下文和训练
padding token 只是为了补齐 batch，不应该被预测
```

领域 tokenizer 需要观察：

```text
《中华人民共和国民法典》第五百八十五条
对乙酰氨基酚 500mg q6h
违约金不得超过实际损失的30%
```

医学剂量样例只用于检查药名、剂量、频次文本是否被稳定切分，不表示课程系统可以生成处方或用药方案。

### 1. Tokenizer 到底做了什么

最小 tokenizer 可以先看成两步：

```text
text -> tokens -> token ids
```

例如一个极小词表：

```text
<pad>: 0
<unk>: 1
<bos>: 2
<eos>: 3
合同: 10
违约金: 11
过高: 12
风险: 13
```

输入：

```text
合同 违约金 过高
```

可以编码成：

```text
[2, 10, 11, 12, 3]
```

其中 `<bos>` 表示开始，`<eos>` 表示结束。真实 tokenizer 不一定按空格切中文，可能使用 BPE、WordPiece 或 unigram，把常见片段保留为较长 token，把罕见词拆成更小单元。

直观类比：tokenizer 像把文章切成模型能处理的积木。积木太大，遇到新词就不认识；积木太小，序列变长，训练和推理更贵。

一个最小 tokenizer 可以这样写。它不是工业级 BPE，只用于让你看清 encode/decode 和 special token 的职责：

```python
class SimpleTokenizer:
    def __init__(self, vocab):
        self.token_to_id = vocab
        self.id_to_token = {idx: token for token, idx in vocab.items()}
        self.pad_token_id = vocab["<pad>"]
        self.unk_token_id = vocab["<unk>"]
        self.bos_token_id = vocab["<bos>"]
        self.eos_token_id = vocab["<eos>"]

    def encode(self, text):
        tokens = text.split()
        ids = [self.token_to_id.get(token, self.unk_token_id) for token in tokens]
        return [self.bos_token_id, *ids, self.eos_token_id]

    def decode(self, ids):
        tokens = []
        for idx in ids:
            token = self.id_to_token.get(int(idx), "<unk>")
            if token not in {"<pad>", "<bos>", "<eos>"}:
                tokens.append(token)
        return " ".join(tokens)
```

### 2. BPE / WordPiece 的核心直觉

子词 tokenizer 想解决的是开放词表问题。现实文本里总会有新词、编号、药名、拼写变体，如果只按完整词建词表，词表会爆炸；如果只按字符切，序列会太长。

BPE 的直觉是：

```text
从字符开始
  -> 统计最常一起出现的相邻片段
    -> 合并成更长 token
      -> 重复直到达到词表大小
```

最小例子：

```text
low, lower, lowest
```

如果 `lo`、`low` 经常出现，tokenizer 可能把它们合并成稳定子词。中文法律文本中，“违约金”“民法典”“第五百八十五条”如果出现频繁，也可能被切成更有意义的片段；医学文本中，“500mg”“q6h”“对乙酰氨基酚”如果切分很碎，就可能增加建模难度。

边界是：tokenizer 的切分不是语义理解。它只是把文本变成离散符号，语义仍要靠 embedding 和训练目标学习。

### 3. Dataset：把单条文本变成训练样本

对 causal LM 来说，最小样本是：

```text
input_ids:      [BOS, 合同, 违约金, 过高]
labels:         [合同, 违约金, 过高, EOS]
attention_mask: [1,   1,    1,     1]
```

对应的 dataset 和 collate 可以写成：

```python
import torch

IGNORE_INDEX = -100

class CausalLMDataset:
    def __init__(self, texts, tokenizer):
        self.examples = [tokenizer.encode(text) for text in texts]

    def __len__(self):
        return len(self.examples)

    def __getitem__(self, index):
        ids = self.examples[index]
        return {
            "input_ids": ids[:-1],
            "labels": ids[1:],
        }

def collate_fn(examples, pad_token_id):
    max_len = max(len(item["input_ids"]) for item in examples)
    batch = {"input_ids": [], "attention_mask": [], "labels": []}

    for item in examples:
        length = len(item["input_ids"])
        pad_count = max_len - length
        batch["input_ids"].append(item["input_ids"] + [pad_token_id] * pad_count)
        batch["attention_mask"].append([1] * length + [0] * pad_count)
        batch["labels"].append(item["labels"] + [IGNORE_INDEX] * pad_count)

    return {
        key: torch.tensor(value, dtype=torch.long)
        for key, value in batch.items()
    }
```

这个 collate 的关键点是：padding 可以进入 `input_ids` 用于补齐 batch，但 padding 对应的 labels 必须是 `-100`。

### 4. Padding：batch 需要整齐，语义不能被污染

batch 里样本长度常常不同：

```text
样本 A: [2, 10, 11, 12, 3]
样本 B: [2, 20, 21, 3]
```

为了组成张量，需要补齐：

```text
input_ids =
[
  [2, 10, 11, 12, 3],
  [2, 20, 21,  3, 0],
]

attention_mask =
[
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 0],
]
```

`attention_mask` 告诉模型：最后那个 `0` 是 padding，不是真实文本。label masking 还要进一步告诉 loss：不要惩罚 padding 位置。

```text
labels =
[
  [10, 11, 12, 3, -100],
  [20, 21,  3, -100, -100],
]
```

注意 `attention_mask` 和 `labels == -100` 不是同一个东西：

| 名称 | 控制什么 | 典型 shape |
| --- | --- | --- |
| attention mask | 模型能不能看某些位置 | `[B,T]` 或广播到 attention |
| causal mask | 当前位置不能看未来 | `[T,T]` 或 `[1,1,T,T]` |
| label mask | 哪些位置参与 loss | `[B,T]` |

可以用一个很小的测试验收这个语义：同一文本 pad 到长度 8 和 16，只要 logits 与有效 token 相同，正确 mask 后的有效 token 平均 loss 应该一致或几乎一致。这个测试能抓住“padding 进入 loss”这类看起来不报错、但训练目标已经污染的问题。

### 5. Truncation：截断不是随便砍

真实样本可能超过模型最大长度。截断策略会影响训练目标。

法律例子：

```text
前半段是合同背景，后半段才是违约责任和争议解决。
```

如果简单保留前 `max_length`，可能把关键风险条款截掉。

医学例子：

```text
用户先描述普通症状，最后补充“胸痛伴呼吸困难”。
```

如果截断尾部，红旗症状可能消失，模型会学到错误分流。

所以领域数据常需要显式策略：

- 保留问题和答案边界。
- 优先保留证据 span。
- 长文按 chunk 切分并记录来源。
- 截断后重新检查 label mask 和引用。

decoder-only 模型还要区分训练和批量生成的 padding side。训练中常用 right padding；批量生成时某些 decoder-only 模型更常用 left padding，以便最后一个非 pad token 对齐。无论选择哪种，都必须和 tokenizer config、position ids、attention mask、labels mask 保持一致。

### 6. 本章边界：先讲 padding label masking，不正式讲 SFT loss

chat template 和 assistant-only loss 很重要，但它们属于第 15 章 SFT 的训练目标问题。本章只处理 causal LM 数据里的一个更基础问题：

```text
padding token 不是文本
  -> 它可以出现在 input_ids 里补齐 batch
    -> 但不应该作为 label 参与 cross entropy
```

也就是说，本章的 label mask 只回答“padding 位置是否参与 loss”。到了第 15 章，label mask 还会继续回答“system/user/assistant 哪些角色参与 loss”。

### 7. 反例：mask 方向错了，loss 仍然能下降

一个特别危险的反例是：

```text
labels = input_ids.clone()
labels[attention_mask == 1] = -100
```

这行代码把真实 token 全部 mask 掉了，只留下 padding 或无效位置。训练脚本可能仍然能跑，但 loss 不是你想优化的目标。

另一个反例是 padding 进入 loss。模型会被惩罚为没有预测 pad token，久而久之学会在不该结束的地方输出 `<pad>` 或异常特殊符号。这个问题和 SFT 无关，普通 causal LM 训练也会发生。

### 8. 两个领域例子

法律样本：

```text
合同约定逾期一天支付总价 50% 的违约金。
```

如果这条样本被 padding 到固定长度，padding 位置必须设为 `-100`。否则模型会把补齐符号也当作合同语言的一部分来学习。

医学样本：

```text
如出现胸痛伴呼吸困难，应及时线下就医。
```

如果 tokenizer 把“呼吸困难”切得很碎，序列会变长；如果尾部被截断，关键红旗提示可能消失。padding、truncation 和 label mask 都会影响后续训练目标。

## 常见错误

| 常见错误 | 后果 | 正确认识 |
| --- | --- | --- |
| pad token 进入 loss | 模型学会输出 padding | padding label 设为 `-100` |
| 右移在 dataset 和 model 里重复做 | labels 错位 | 统一 shift 责任位置 |
| 截断直接砍尾部 | 丢失关键证据或红旗症状 | 设计领域截断策略 |
| 对中文、法条编号、医学剂量不检查 | 关键实体被异常拆分 | 做 encode/decode spot check |
| padding side 随意变 | 生成位置或 mask 出错 | 训练/推理保持一致 |
| `-100` 当作 token id decode | 调试输出混乱 | `-100` 只属于 labels，不属于 tokenizer |

## 测试验收

- 本章最低产物：跑通 `SimpleTokenizer + CausalLMDataset + collate_fn`，并能审计一条样本从原文到 loss 的路径。
- Dataset 能输出 `input_ids`、`attention_mask`、`labels`。
- padding 位置的 labels 必须是 `-100`。
- encode/decode round-trip 对关键样例可解释。
- 能构造一个 batch，证明短样本 padding 不影响 loss。
- 能检查法律条款编号和医学剂量的切分是否稳定。
- 能解释本章 padding label masking 与第 15 章 assistant-only loss 的区别。
- 能写一个 `debug_batch(batch, tokenizer)`，逐列打印 token、id、attention_mask、label、是否参与 loss，并避免把 `-100` 当 token id decode。

### FAQ

**1. `attention_mask=0` 和 `labels=-100` 有什么区别？**

`attention_mask=0` 通常表示模型不应该把该位置当作有效上下文；`labels=-100` 表示 loss 不评价该位置。一个控制看不看，一个控制学不学。

**2. 为什么本章不正式讲 assistant-only loss？**

因为本章要先解决所有 causal LM 都会遇到的 padding loss 问题。assistant-only loss 需要 chat template、角色边界和指令数据格式，会在第 15 章作为 SFT 的核心训练目标展开。

**3. tokenizer 切得很碎一定不好吗？**

不一定。切得碎可以覆盖未知词，但会增加序列长度和学习难度。领域项目要看关键实体是否稳定、长度是否可控、评测是否受影响。

**4. `pad_token` 可以等于 `eos_token` 吗？**

有些 decoder-only 模型会这样配置，但必须确保 attention mask 和 labels mask 正确，否则模型可能把 padding 和结束语义混在一起。如果 `pad_token_id == eos_token_id`，padding 位置仍必须 `labels=-100`；生成时还要确认 eos 作为 stop token 的行为没有被 padding side 影响。

**5. 本章的 label masking 和第 15 章的 assistant-only loss 有什么区别？**

本章的 mask 只排除 padding 等无效位置；第 15 章的 assistant-only loss 会进一步根据角色边界决定 system/user/assistant 哪些 token 参与训练。

### 自测题

1. 为什么 padding 位置不能进入 loss？
2. causal mask、attention mask、label mask 分别解决什么问题？
3. 如果真实 token 全部被设成 `-100`，会发生什么？
4. 为什么法律条款编号和医学剂量需要专门检查 tokenizer 切分？
5. 本章为什么只预告 assistant-only loss，而不展开实现？

答案要点：

- padding 不是真实文本，训练它会污染目标。
- causal mask 防未来，attention mask 防无效位置，label mask 控制 loss 范围。
- loss 不再评价真实文本，训练目标会失效或变得不可解释。
- 这些是领域关键实体，切分异常会影响表示、检索和生成。
- assistant-only loss 依赖 chat template 和角色边界，应该放到第 15 章 SFT 中系统讲。

## 想继续深挖

继续深挖 label masking，可以把平均 loss 写得更明确。没有 mask 时：

```text
loss = (loss_1 + loss_2 + ... + loss_T) / T
```

有 padding mask 时，只有有效位置参与平均：

```text
loss = Σ_t mask_t * loss_t / Σ_t mask_t
```

其中 `mask_t=1` 表示这个位置参与训练，`mask_t=0` 表示跳过。PyTorch 里的 `ignore_index=-100` 本质上就是让这些位置的 `mask_t=0`。

这会改变优化目标。假设 5 个位置里 2 个是 padding，如果 padding 没有 mask，模型会被迫学习“什么时候输出 pad”。如果 padding 被正确 mask，模型只学习真实文本的 next-token 分布。第 15 章的 assistant-only loss 仍然是同一个公式，只是 `mask_t` 不再只由 padding 决定，还由 system/user/assistant 角色决定。

## 和领域项目的关系

法律条款编号、医学剂量和引用 span 都依赖稳定 tokenization。padding label masking 错了，后面的 SFT、LoRA 和蒸馏会在错误目标上继续放大问题。

法律项目中，tokenizer 和 dataset 会影响：

- 法条编号、合同金额、百分比和日期能否稳定保留。
- 证据 span 是否能和原文对齐。
- padding 是否被排除在 loss 之外。

医学项目中，它们会影响：

- 药名、剂量、频次和红旗症状是否被正确保留。
- padding 是否被排除在 loss 之外。
- 截断是否意外删除红旗症状或药物禁忌。

本章的核心不是“会调用 tokenizer API”，而是能审计一条样本从原始文本到 loss 的完整路径。只要这条路径错了，后面模型再大、训练再久，也只是在更快地学习错误目标。
