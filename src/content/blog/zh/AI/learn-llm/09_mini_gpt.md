---
title: "第 9 章：MiniGPT 从零实现"
description: "到这里，attention 和 block 都能单测通过。但 MiniGPT 仍然可能不工作：loss 不降、生成重复、save/load 对不上。"
author: LienJack
pubDate: 2026-06-01
locale: zh
tags:
  - LLM 学习
  - LLM
  - AI
---
# 第 9 章：MiniGPT 从零实现

## 核心问题

到这里，attention 和 block 都能单测通过。但 MiniGPT 仍然可能不工作：loss 不降、生成重复、save/load 对不上。

这一章只做一件事：把所有组件接成一个可训练、可保存、可生成、可测试的闭环。

MiniGPT 的价值不在模型强度，而在系统边界：

```text
文本 -> token ids -> batch -> model -> logits -> loss -> backward
  -> checkpoint -> load -> generate -> eval
```

如果这条链路能在 tiny corpus 上稳定运行，你以后使用 Hugging Face、LLaMA、LoRA、RAG 或部署框架时，就不会只是在调用黑盒 API。

## 前置知识

- 已完成 tokenizer、next-token、attention 和 Transformer Block。
- 会写训练循环和 shape 测试。
- 知道 checkpoint 保存加载的重要性。
- 理解 causal mask 和 label shift。
- 能解释 logits `[B,T,V]` 与 labels `[B,T]` 如何计算 cross entropy。

## 本章新增能力

你会实现 decoder-only GPT、learned position embedding、causal language modeling、train loop、generate loop、checkpoint、perplexity 和 pytest。RoPE 不在本章正式展开，它会作为现代 LLaMA 架构改进放到第 10 章。

学完后，你应该能做到：

- 从 config 构建一个 tiny GPT。
- 给定 `input_ids: [B,T]` 输出 `logits: [B,T,V]`。
- 用 labels 计算 causal LM loss。
- 训练 tiny corpus 并看到 loss 下降。
- 保存和加载模型、tokenizer/config。
- 实现 temperature、top-k、top-p、eos、context 裁剪。
- 写测试覆盖 shape、mask、loss、save/load、generate。

## 系统接口清单

第 6 章已经把目标说清楚了：语言模型训练的是 next-token prediction。这一章不再重新解释目标，而是把目标接到完整模型里：

```text
config -> dataset/input-label -> forward/logits/loss
  -> train loop/loss/PPL -> checkpoint -> load -> generate -> pytest
```

这条链路里，每一步都有明确 shape：

| 阶段 | 张量 | shape |
| --- | --- | --- |
| 输入 | `input_ids` | `[B,T]` |
| token embedding | `tok_emb` | `[B,T,C]` |
| position embedding | `pos_emb` | `[1,T,C]` 或 `[T,C]` |
| block 输出 | `x` | `[B,T,C]` |
| LM head | `logits` | `[B,T,V]` |
| labels | `labels` | `[B,T]` |
| loss 输入 | `logits.view(-1,V)` | `[B*T,V]` |
| loss 目标 | `labels.view(-1)` | `[B*T]` |

只要其中一个 shape 理错，模型可能还能运行，但语义已经错了。

## 最小推导或最小代码

MiniGPT 数据流：

```text
input_ids -> token embedding + position
  -> N 个 Transformer Block
  -> LM head
  -> logits [B,T,V]
```

最小生成循环：

```python
for _ in range(max_new_tokens):
    logits, _ = model(ids)
    logits = logits[:, -1, :]
    next_id = sample(logits, temperature, top_k, top_p)
    ids = torch.cat([ids, next_id[:, None]], dim=1)
```

保存加载必须验证 round-trip：同一 checkpoint、同一 seed、同一输入，输出应一致或差异可解释。

## 1. Decoder-only：只能看过去的位置

Decoder-only 的结构和训练目标都按从左到右生成设计：

```text
位置 t 只能看 <= t 的 token
位置 t 输出用于预测 t+1 的 token
```

训练时常见做法是把一段 token 切成：

```text
input:  [x0, x1, x2, x3]
label:  [x1, x2, x3, x4]
```

本章 MiniGPT 默认采用 dataset-shifted，和第 3、4、6 章的教学代码一致：

```text
input_ids = ids[i : i + block_size]
labels    = ids[i + 1 : i + block_size + 1]
forward 内部不再 shift
logits [B,T,V] 直接和 labels [B,T] 摊平计算 CE
```

后续 Hugging Face 章节会遇到另一种常见模式：dataset 输出 `labels=input_ids`，模型内部用 `logits[:, :-1]` 对齐 `labels[:, 1:]`。两种模式不要混用。

模型在每个位置都输出 vocab 分布：

```text
logits[0] -> predict x1
logits[1] -> predict x2
logits[2] -> predict x3
logits[3] -> predict x4
```

这就是 label shift。常见 bug 是 input 和 label 对齐错一位，导致模型学“复制当前 token”或 loss 看似下降但生成很差。

例子 1：法律语料。

```text
input:  甲方 应 在
label:  应 在 十
```

位置“甲方”预测“应”，位置“应”预测“在”，位置“在”预测“十”。

例子 2：医学语料。

```text
input:  如 出现 胸痛
label:  出现 胸痛 应
```

位置“胸痛”要预测“应”，但不能看未来“应”本身。

## 2. Embedding、Position 和 Block 的接口

token embedding：

```python
x = token_embedding(input_ids)  # [B,T,C]
```

位置 embedding：

```python
positions = torch.arange(T, device=input_ids.device)
pos = position_embedding(positions)  # [T,C]
x = x + pos[None, :, :]
```

为什么要加位置？因为 attention 本身主要根据内容相似度计算。如果没有位置信息，模型很难区分：

```text
甲方 起诉 乙方
乙方 起诉 甲方
```

两句话 token 集合相似，但角色关系完全反了。位置表示让模型知道 token 的顺序。

这里别把 position embedding 推过头。它只能帮助模型区分顺序，不能保证模型理解法律主体、医学禁忌或证据来源。

## 3. LM Head：从 hidden state 回到词表

经过 block 后：

```text
x: [B,T,C]
```

LM head 是一个线性层：

```text
logits = x @ W_vocab
```

如果：

```text
W_vocab: [C,V]
```

输出：

```text
logits: [B,T,V]
```

每个位置都有一个长度为 `V` 的分数向量。softmax 后就是下一个 token 的概率分布。

最小推导：

```text
loss = average(-log P(label_t | input_<=t))
```

PyTorch 里通常写成：

```python
loss = F.cross_entropy(
    logits.reshape(-1, vocab_size),
    labels.reshape(-1),
    ignore_index=-100,
)
```

`ignore_index=-100` 常用于忽略 padding 或不参与训练的位置。

完整 `forward(input_ids, labels=None, attention_mask=None)` 可以写成：

```python
class MiniGPT(nn.Module):
    def forward(self, input_ids, labels=None, attention_mask=None):
        B, T = input_ids.shape
        if T > self.config.block_size:
            raise ValueError(
                f"Sequence length {T} exceeds block_size {self.config.block_size}"
            )

        tok = self.token_embedding(input_ids)
        pos_ids = torch.arange(T, device=input_ids.device)
        pos = self.position_embedding(pos_ids)[None, :, :]
        x = self.drop(tok + pos)

        for block in self.blocks:
            x = block(x, attention_mask=attention_mask, causal=True)

        x = self.norm_f(x)
        logits = self.lm_head(x)

        loss = None
        if labels is not None:
            loss = F.cross_entropy(
                logits.reshape(-1, logits.size(-1)),
                labels.reshape(-1),
                ignore_index=-100,
            )
        return logits, loss
```

## 4. Generate：每次只采样最后一个位置

训练时，模型一次看到完整 `[B,T]`，用 causal mask 防未来。推理时，模型只有已经生成的 token：

```text
prompt -> predict next -> append -> predict next -> append
```

最小采样流程：

```python
def sample_next_token(logits, temperature=1.0, top_k=None, top_p=None):
    if temperature == 0:
        return torch.argmax(logits, dim=-1, keepdim=True)
    assert temperature > 0
    logits = logits / temperature

    if top_k is not None:
        values, _ = torch.topk(logits, k=min(top_k, logits.size(-1)))
        logits = logits.masked_fill(logits < values[..., -1, None], float("-inf"))

    if top_p is not None and top_p < 1:
        sorted_logits, sorted_idx = torch.sort(logits, descending=True)
        sorted_probs = torch.softmax(sorted_logits, dim=-1)
        remove = sorted_probs.cumsum(dim=-1) > top_p
        remove[..., 1:] = remove[..., :-1].clone()
        remove[..., 0] = False
        logits = logits.scatter(
            dim=-1,
            index=sorted_idx,
            src=sorted_logits.masked_fill(remove, float("-inf")),
        )

    probs = torch.softmax(logits, dim=-1)
    return torch.multinomial(probs, num_samples=1)

def generate(model, ids, max_new_tokens, eos_token_id=None):
    model.eval()
    for _ in range(max_new_tokens):
        idx_cond = ids[:, -model.config.block_size:]
        logits, _ = model(idx_cond)
        next_id = sample_next_token(logits[:, -1, :])
        ids = torch.cat([ids, next_id], dim=1)
        if eos_token_id is not None and (next_id == eos_token_id).all():
            break
    return ids
```

为什么要裁剪 `idx_cond`？因为模型训练时最大上下文是 `block_size`。如果生成时输入超过这个长度，position embedding 可能越界，或者模型进入训练未覆盖的范围。

采样参数直觉：

| 参数 | 作用 | 风险 |
| --- | --- | --- |
| temperature | 调整分布尖锐程度 | 太低重复，太高胡说 |
| top-k | 只保留概率最高的 k 个 token | k 太小会单调 |
| top-p | 保留累计概率达到 p 的候选 | 实现错排序会失效 |
| eos | 遇到结束符停止 | 没处理会无限续写 |

## 5. Checkpoint：权重、config 和 tokenizer 要一起存

很多教学代码只保存：

```python
torch.save(model.state_dict(), "model.pt")
```

这不够。一个可复现的 MiniGPT 至少要保存：

- `model_state_dict`
- `config`
- tokenizer 或 vocab 映射
- 训练 step 或 epoch
- optimizer state，如果要继续训练
- 随机 seed 和重要超参数记录

可以分成两档：

```text
inference checkpoint:
  model_state_dict + config + tokenizer/vocab

training checkpoint:
  inference checkpoint
  + optimizer state
  + scheduler state
  + global_step
  + rng_state
  + data cursor / epoch
```

否则你可能加载了权重，却用错 vocab size、block size、hidden size 或 tokenizer，输出完全不可比。

round-trip 测试：

```python
model.eval()
logits_before = model(input_ids)
save_checkpoint(model, tokenizer, config)
loaded = load_checkpoint(path)
loaded.eval()
logits_after = loaded(input_ids)
assert torch.allclose(logits_before, logits_after, atol=1e-6)
```

教学 round-trip 建议限定在 CPU / fp32 / `model.eval()` / `torch.no_grad()` 下比较 logits。如果不一致，先检查 `eval()`、dropout、seed、dtype、device 和 config。

## 6. 最小训练实验

建议从 tiny corpus 开始，不追求语义强，只验证闭环：

```text
法律：甲方 应 按期 付款 。 乙方 逾期 付款 应 承担 违约责任 。
医学：如 出现 胸痛 或 呼吸困难 ， 应 立即 就医 。
```

实验步骤：

1. 构建 tokenizer 和 vocab。
2. 把文本编码成 ids。
3. 用 block_size 生成 input/label 对。
4. 构建 tiny GPT，例如 `n_layer=2, n_head=2, n_embd=64`。
5. 训练 300 step，记录 loss。
6. 计算 perplexity。
7. 保存加载并比较 logits。
8. 用固定 prompt 生成，确认长度、eos、context 裁剪都工作。

> 教学模型只验证 token-level LM 闭环。tiny corpus 上 loss 快速下降，不代表模型学会法律或医学能力；生成结果只用于检查长度、eos、context 裁剪、采样和 checkpoint，不做问答、不做建议、不评估事实正确。

## 常见错误

| 常见错误 | 为什么会出问题 | 正确认识 |
| --- | --- | --- |
| 训练时 mask 正确，generate 时忘记裁剪 context window | position 越界或超出训练范围 | 生成时使用 `ids[:, -block_size:]` |
| checkpoint 只保存模型参数，不保存 vocab/config | 加载后结构或 token 映射不一致 | checkpoint 应包含 config 和 tokenizer 信息 |
| save/load 后输出变了却没有记录 seed 和 eval 模式 | dropout 或随机性干扰判断 | round-trip 用 `eval()` 和固定输入 |
| 只写 demo，不写 shape、mask、loss、save/load、generate 测试 | 系统 bug 难定位 | 每个接口都要有最小测试 |
| label 没有 shift | 模型学错目标 | input 和 label 应错开一位 |
| loss 下降就认为模型可用 | 小数据记忆不代表泛化 | 还要 valid split、评测、安全检查 |
| 生成不设长度上限 | 可能卡死 | `max_new_tokens` 是必需参数 |

## 测试验收

- tiny corpus 上 loss 能下降，perplexity 可计算。
- checkpoint 保存加载后输出一致或差异有记录。
- generate 支持 `temperature=0` 的 greedy 特殊约定、temperature、top-k、top-p、eos 和长度上限。
- 至少 5 个 pytest：shape、mask、loss、save/load、generate 长度。
- 能解释 input/label shift。
- 能说明训练阶段和生成阶段的差别。
- 能用一条法律或医学 prompt 检查模型是否只是在机械重复。

## FAQ

1. MiniGPT 生成质量很差，是不是实现错了？

   不一定。tiny 模型和 tiny corpus 生成差很正常。先看 loss 是否下降、shape 是否正确、保存加载是否一致，再判断模型容量和数据问题。

2. 位置编码能不能先不加？

   可以做对照实验，但正式 MiniGPT 不建议省略。没有位置，模型难以稳定区分顺序关系。

3. 为什么 logits 不是直接 softmax 后再算 loss？

   `F.cross_entropy` 内部会做 log-softmax，更数值稳定。通常直接传 logits。

4. top-k 和 top-p 要同时开吗？

   可以，但教学阶段建议分别实现和测试，避免采样 bug 被叠加参数掩盖。

5. 保存 optimizer state 必须吗？

   如果只是推理，不必须；如果要恢复训练，就应该保存，否则学习率、动量等状态会丢失。

6. MiniGPT 能用于法律或医学问答吗？

   不能直接用于真实场景。本章模型只是理解架构和训练闭环的教学模型，不具备事实可靠性、安全边界和专业审查能力。

## 自测题

1. MiniGPT 的主数据流是什么？
2. `logits: [B,T,V]` 和 `labels: [B,T]` 如何送入 cross entropy？
3. 为什么 generate 每一步只取 `[:, -1, :]`？
4. 保存 checkpoint 时为什么要保存 tokenizer/vocab？
5. `block_size=128` 时，prompt 长度超过 128 应怎么办？
6. 举一个 loss 下降但模型仍不可用的领域项目风险。

答案要点：

- `input_ids -> embedding + position -> blocks -> lm_head -> logits`。
- reshape 成 `[B*T,V]` 和 `[B*T]`。
- 生成只需要最后一个位置预测下一个 token。
- token id 到文本的映射必须一致，否则同一个 id 代表不同 token。
- 裁剪到最近 128 个 token，或使用支持更长上下文的模型。
- 例如模型记住训练模板，把“胸痛”总是续写成固定建议，却不能识别急症边界或拒答。

## 想继续深挖

继续深挖 MiniGPT，可以把完整模型压成三个接口：

```text
x = token_embedding(input_ids) + position_embedding(pos)
h = TransformerBlocks(x)
logits = lm_head(h)
```

训练目标仍然沿用前文的 next-token learning：

```text
loss = average_t -log P(label_t | input_<=t)
perplexity = exp(loss)
```

生成阶段则不断取最后一个位置：

```text
next_logits = logits[:, -1, :]
next_token ~ sample(softmax(next_logits / temperature))
```

带走三个工程判断：loss 下降不等于生成好，因为 tiny corpus 可能只是被记住；temperature/top-k/top-p 改变的是采样行为，不改变模型参数；checkpoint round-trip 必须比较同一输入的 logits，因为生成文本会受采样随机性影响。第 10 章会把 learned position embedding 换成 RoPE，但 MiniGPT 的训练闭环不变。

## 和领域项目的关系

MiniGPT 是全课程第一个完整里程碑。后续用 Hugging Face、LLaMA、LoRA 和部署框架时，你不再把开源模型当黑盒，而能把每个 API 映射回自己写过的组件。

在法律项目里，你会知道合同文本如何变成 token、如何通过 causal LM 预测条款续写、为什么不能把生成流畅当作法律正确。在医学项目里，你会更警惕“小模型记住高频建议”的风险，知道必须用证据、评测、拒答和人工复核来约束输出。

下一章会从 MiniGPT 进入现代 LLaMA block。你会看到真实开源模型没有推翻 decoder-only GPT，而是在位置编码、归一化、FFN、attention head 组织和 KV cache 上做了更适合大规模训练与部署的升级。
