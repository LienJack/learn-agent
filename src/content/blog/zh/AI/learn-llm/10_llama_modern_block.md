---
title: "第 10 章：现代 LLaMA 架构"
description: "主流开源大模型在教学版 GPT 上改了什么，为什么改？"
author: LienJack
pubDate: 2026-06-01
locale: zh
tags:
  - LLM 学习
  - LLM
  - AI
---
# 第 10 章：现代 LLaMA 架构

## 核心问题

主流开源大模型在教学版 GPT 上改了什么，为什么改？

第 9 章的 MiniGPT 已经具备 decoder-only 骨架：

```text
token embedding -> position embedding -> Transformer blocks -> LM head
```

LLaMA 没有推翻第 9 章的 MiniGPT 主线：仍然是 decoder-only causal LM。变化集中在位置编码、归一化、FFN、K/V head 组织和增量解码：

```text
position embedding -> RoPE
LayerNorm -> RMSNorm
ReLU/GELU FFN -> SwiGLU
MHA -> GQA / MQA
推理重复算历史 K/V -> KV cache
```

这些升级都在回应真实的训练和推理压力：

- 长上下文里怎样表达相对位置？
- 深层网络怎样更稳定？
- FFN 怎样提高表达能力？
- 推理时怎样少存、少算、更快生成？

本章不追求复刻完整 LLaMA，而是分两条线理解这些部件为什么出现：

```text
训练结构升级：learned position -> RoPE
            LayerNorm -> RMSNorm
            GELU FFN -> SwiGLU
            MHA -> GQA

推理结构升级：重复计算历史 -> KV cache
            full attention -> prefill / decode
            MHA cache -> GQA cache
```

## 前置知识

- 已实现 MiniGPT。
- 理解 attention、Transformer block 和 causal LM。
- 熟悉 `[B,H,T,D]`、`[B,T,C]` shape。
- 知道推理生成是逐 token autoregressive 的。

## 本章新增能力

你会理解 RoPE、RMSNorm、SwiGLU、MHA/MQA/GQA、KV cache、causal LM head 和 logits 到 token 的路径，并能画出现代 LLaMA block 数据流。

先抓住这个判断：LLaMA-family 的主线仍然是 decoder-only Transformer，升级点集中在稳定性、长上下文位置表达和增量推理成本。

## 1. 从 MiniGPT 到 LLaMA：哪些地方变了

教学版 MiniGPT 常见结构：

```text
x = token_embedding + learned_position_embedding
x = TransformerBlock(x)
logits = lm_head(x)
```

LLaMA 风格 block 更接近：

```text
x = x + Attention(RMSNorm(x), RoPE, GQA, KV cache)
x = x + SwiGLU(RMSNorm(x))
logits = lm_head(RMSNorm(x))
```

主线只需要在这里说一次：

- 仍然是 causal self-attention。
- 仍然预测 next token。
- 仍然输出 logits。
- 仍然用交叉熵或相关变体训练。

变化集中在位置、归一化、FFN 和推理效率上。

本章讲的是 LLaMA-family 常见设计模式，不代表所有 LLaMA 或 decoder-only 模型细节完全一致。实际模型以 `config.json` 为准，重点字段包括：

```text
hidden_size
intermediate_size
num_attention_heads
num_key_value_heads
rms_norm_eps
rope_theta
tie_word_embeddings
architectures
```

对照表：

| 部件 | MiniGPT 教学写法 | LLaMA 风格写法 | 解决的问题 |
| --- | --- | --- | --- |
| 位置 | learned position embedding | RoPE | 更自然地进入 Q/K 相对位置匹配 |
| Norm | LayerNorm | RMSNorm | 控制尺度、更简单 |
| FFN | Linear + GELU + Linear | SwiGLU | 门控增强表达 |
| Attention | MHA | GQA/MQA | 减少 KV cache |
| 推理 | 每步重算全部历史 | KV cache | 增量解码提速 |

## 2. RoPE：把位置信息放进 Q/K 的旋转里

MiniGPT 常用 learned position embedding：

```text
x = token_embedding + position_embedding
```

每个绝对位置有一个可学习向量。这样简单，但有两个问题：

- 位置表示绑定绝对 index，不天然表达相对位置。
- 超出训练长度时泛化困难。

RoPE，Rotary Position Embedding，把位置编码成对 Q/K 向量的旋转。

二维直觉：

```text
[x1, x2] 旋转角度 theta 后：
[
  x1*cos(theta) - x2*sin(theta),
  x1*sin(theta) + x2*cos(theta)
]
```

高维 RoPE 把 head_dim 按偶数/奇数成对分组，每一对用不同频率旋转。

如果：

```text
q: [B,H,T,D]
k: [B,G,T,D] 或 [B,H,T,D]
```

RoPE 作用后 shape 不变：

```text
rope(q): [B,H,T,D]
rope(k): [B,G,T,D] 或 [B,H,T,D]
```

RoPE 的关键性质：

- 旋转不改变向量长度。
- Q 和 K 都带上位置角度。
- `QK^T` 会自然包含相对位置信息。

最小相对位置直觉：如果位置 `m` 的 Q 旋转角度是 `mθ`，位置 `n` 的 K 旋转角度是 `nθ`，它们点积中的角度差会包含：

```text
mθ - nθ = (m - n)θ
```

也就是说，attention score 不只知道“这是第 m 个 token 和第 n 个 token”，还自然包含二者距离 `m-n` 的信息。这就是 RoPE 比单纯绝对位置 embedding 更贴近 attention 匹配的原因。

为什么 V 通常不加 RoPE？

因为 Q/K 用来计算“看谁”的分数，位置应该参与匹配；V 是被汇总的内容，通常不需要旋转位置用于打分。如果给 V 也加旋转，输出内容空间会被位置角度混入，未必符合原设计。

例子：在一段长合同里，“解除”与前文“逾期付款”的距离和相对顺序都重要。RoPE 让这种相对位置信息进入 attention score。

这里别把 RoPE 当成长上下文万能药。它改变的是位置进入 attention score 的方式，外推效果还要看训练长度、频率缩放、数据分布、注意力实现和评测任务。

## 3. RoPE 最小代码

```python
def apply_rope_pair(x_even, x_odd, cos, sin):
    new_even = x_even * cos - x_odd * sin
    new_odd = x_even * sin + x_odd * cos
    return new_even, new_odd
```

更接近实现的 shape：

```python
def apply_rope(x, cos, sin):
    assert x.size(-1) % 2 == 0, "RoPE requires even head_dim"
    x_even = x[..., 0::2]
    x_odd = x[..., 1::2]
    y_even = x_even * cos - x_odd * sin
    y_odd = x_even * sin + x_odd * cos
    return torch.stack((y_even, y_odd), dim=-1).flatten(-2)
```

为了覆盖 KV cache、padding 或 batch 内不同位置，更推荐把接口统一成：

```python
q, k = apply_rope(q, k, cos_cache, sin_cache, position_ids)
```

其中：

```text
q: [B,H,T,D]
k: [B,G,T,D] 或 [B,H,T,D]
position_ids: [B,T] 或 [T]
cos/sin cache: [max_seq_len,D/2]
gather 后 broadcast 到 [B,1,T,D/2]
```

仓库中的 `src/models/llama_components.py` 提供了 `apply_rope_with_cache()` 和 `rotary_cache()`，对应这一版接口。

测试重点不是生成效果，而是数学性质：

```text
RoPE 前后 shape 不变
RoPE 前后每个位置的向量 norm 近似不变
Q/K 加 RoPE，V 不加 RoPE
相同 position_ids 重算应得到相同结果
增量解码时 position_ids 不能从 0 重新开始
```

如果使用 KV cache，新的 token 在第 `past_len` 个位置，它的 RoPE 角度必须用真实位置：

```text
position_id = past_len
```

不能每次生成新 token 都从 0 开始，否则新 Q/K 与历史 K 的相对位置全部错乱。

## 4. RMSNorm：只控制向量尺度

LayerNorm 通常做：

```text
(x - mean(x)) / std(x)
```

RMSNorm 不减均值，只用均方根归一化：

```text
rms = sqrt(mean(x^2) + eps)
y = x / rms * weight
```

它解决的问题是深层训练中的数值稳定，同时比 LayerNorm 更简单。

shape：

```text
x:      [B,T,C]
rms:    [B,T,1]
weight: [C]
y:      [B,T,C]
```

最小例子：

```text
x = [3, 4]
rms = sqrt((9 + 16) / 2) = sqrt(12.5) ≈ 3.54
x / rms ≈ [0.85, 1.13]
```

RMSNorm 控制的是向量尺度，而不是把均值移到 0。直观感受：

- hidden state 数值太大，后续层容易不稳定。
- 归一化把尺度拉回可控范围。
- RMSNorm 保留方向信息，主要控制长度尺度。

在 LLaMA 风格 block 中，常见的是 pre-norm：

```text
x = x + attention(norm(x))
x = x + ffn(norm(x))
```

pre-norm 的好处是深层梯度流动更稳定。残差主干保留原始路径，norm 后的分支负责产生增量。

边界：RMSNorm 不能替代所有稳定性措施。学习率、初始化、梯度裁剪、数据质量、精度策略同样重要。RMSNorm 也不能随便替换已有 checkpoint 的 LayerNorm，否则权重语义不匹配。

## 5. SwiGLU：给 FFN 加门控

普通 FFN 可以写成：

```text
FFN(x) = W2 activation(W1 x)
```

SwiGLU 引入门控：

```text
SwiGLU(x) = W_down( SiLU(W_gate x) * W_up x )
```

shape 逻辑：

```text
x:          [B,T,C]
gate_proj:  [C,I] -> [B,T,I]
up_proj:    [C,I] -> [B,T,I]
SiLU(gate) * up: [B,T,I]
down_proj:  [I,C] -> [B,T,C]
```

其中 `I` 是 intermediate size。

它有两条上投影：

- `gate_proj`：决定哪些信息通过。
- `up_proj`：提供候选内容。
- 两者逐元素相乘后再降维。

`up_proj` 提供候选内容，`gate_proj` 决定每个维度通过多少。这个门不是 0/1 的硬开关，而是连续控制。

最小数值例子：

```text
up    = [2.0, -1.0, 0.5]
gate  = [0.9,  0.1, 0.0]
after = [1.8, -0.1, 0.0]
```

即使候选内容里有某个维度，gate 也可以把它压低。SwiGLU 通常比简单 ReLU/GELU FFN 表达力更强，也成为许多现代 LLM 的常见选择。

SwiGLU 也会把参数和计算推上去，真实配置要在质量、速度和显存之间取舍。

## 6. MHA / MQA / GQA：少存 K/V

标准 multi-head attention：

```text
query heads: H
key heads:   H
value heads: H
```

每个 query head 对应自己的 K/V head。

推理时，模型每生成一个 token，都要保存历史 K/V：

```text
KV cache shape roughly: [layers, B, H, T, D]
```

更完整地说，K 和 V 各一份：

```text
K cache: [L,B,H,T,D]
V cache: [L,B,H,T,D]
total:   2 * L * B * H * T * D elements
```

如果上下文很长，KV cache 会非常占显存。GQA 解释为什么可以少存 K/V，下一节的 KV cache 解释为什么要存 K/V。

MQA，Multi-Query Attention：

```text
query heads: H
key heads:   1
value heads: 1
```

所有 query heads 共享一组 K/V，省很多 cache，但可能损失表达能力。

GQA，Grouped-Query Attention，折中：

```text
query heads: H
key/value heads: G
G < H
```

例如：

```text
H = 32
G = 8
```

每 4 个 query heads 共享一组 K/V。

shape：

```text
q: [B,H,T,D]
k: [B,G,T,D]
v: [B,G,T,D]
```

attention 计算时，需要让 K/V 能被 H 个 query heads 使用。常见做法是 repeat 或在 kernel 内逻辑广播：

```text
repeat_factor = H / G
k repeated: [B,H,T,D]
v repeated: [B,H,T,D]
```

但 cache 存储时仍只存 G 组 K/V：

```text
cache: [L,B,G,T,D]
```

最小 repeat 函数可以写成：

```python
def repeat_kv(x, num_query_heads, num_kv_heads):
    # x: [B,G,T,D]
    assert num_query_heads % num_kv_heads == 0
    repeat = num_query_heads // num_kv_heads
    return x[:, :, None, :, :].expand(-1, -1, repeat, -1, -1).reshape(
        x.size(0), num_query_heads, x.size(2), x.size(3)
    )
```

注意：cache 存 G 组 K/V，attention 计算时可以逻辑 repeat；不要把 repeat 后的 H 组 K/V 存进 cache，否则会丢掉 GQA 的显存收益。

KV cache 大小大约减少：

```text
H / G = 32 / 8 = 4 倍
```

这就是 GQA 在推理效率上的意义。

边界：GQA 主要减少 K/V cache，不会让 Q 的计算消失，也不会改变 next-token 训练目标。质量是否受影响需要评测。

## 7. KV cache：复用历史 K/V

自回归生成时：

```text
prompt -> token_1 -> token_2 -> token_3
```

如果每一步都重新计算所有历史 token 的 K/V，会非常浪费。

KV cache 的思路：

```text
历史 token 的 K/V 算过一次后保存
新 token 只算自己的 Q/K/V
attention 时用新 Q 去看 cached K/V + new K/V
```

prefill 阶段：

```text
prompt length = T
一次性计算 prompt 的所有 K/V
cache length = T
```

decode 阶段：

```text
每次输入 1 个新 token
q_new: [B,H,1,D]
k_new/v_new: [B,G,1,D]
append cache -> [B,G,T+1,D]
新 token attention score: [B,H,1,T+1]
```

训练/prefill 使用 full causal mask；decode 单步时 `q_len=1`，`k_len=past_len+1`，新 query 可以看所有 cached K/V 和当前 token，mask shape 是 `[B,H,1,T_cache+1]`。不能简单套一个 `torch.tril(torch.ones(1,1))`，否则只能看到自己，看不到历史 cache。

这和训练阶段的 full attention 不同：

```text
训练: scores [B,H,T,T]
推理单步: scores [B,H,1,T_cache]
```

所以 KV cache 不能消除“看长历史”的成本，但避免了重复计算历史 token 的 K/V 和每层 hidden state。

需要注意：

- cache 必须和层数、head 数、head_dim、位置对齐。
- RoPE 位置不能错，否则新 token 看历史时相对位置会乱。
- batch 中不同请求长度不同，会让 serving 更复杂。
- cache 会占显存，长上下文和大 batch 时尤其明显。

KV cache 的正确性测试要比较：

```text
full_forward(prompt + next_token) 最后位置 logits
≈ prefill(prompt) + decode_one(next_token, past_kv) 的 logits
```

测试条件必须固定：`model.eval()`、`torch.no_grad()`、同 dtype、同 `position_ids`、同 causal mask。若不一致，优先查 RoPE position、mask、cache 拼接维度和 dropout。

## 8. 最小 shape 对比

假设：

```text
layers = 32
B = 1
T = 4096
H = 32
G = 8
D = 128
```

MHA cache 近似元素数：

```text
2 * layers * B * H * T * D
```

GQA cache：

```text
2 * layers * B * G * T * D
```

减少比例：

```text
H / G = 4
```

如果使用 fp16/bf16，每个元素约 2 bytes，则 GQA cache 约为：

```text
2 * 32 * 1 * 8 * 4096 * 128 * 2 bytes
≈ 536,870,912 bytes
≈ 512 MB
```

对应 MHA 约 4 倍，即约 2 GB。实际 serving 还会有其他激活、权重、调度和框架开销，但这个估算能说明为什么 head 配置会直接影响部署成本。

## 9. LLaMA block 的最小伪代码

```python
def llama_block(x, position_ids, past_kv=None):
    residual = x
    x_norm = rms_norm_attn(x)

    q = q_proj(x_norm)  # [B,T,H*D] -> [B,H,T,D]
    k = k_proj(x_norm)  # [B,T,G*D] -> [B,G,T,D]
    v = v_proj(x_norm)  # [B,T,G*D] -> [B,G,T,D]

    q, k = apply_rope(q, k, cos_cache, sin_cache, position_ids)

    if past_kv is not None:
        k = concat(past_kv.k, k, dim=-2)
        v = concat(past_kv.v, v, dim=-2)

    attn_out = grouped_attention(q, k, v)
    x = residual + o_proj(attn_out)

    residual = x
    x_norm = rms_norm_ffn(x)
    x = residual + down_proj(silu(gate_proj(x_norm)) * up_proj(x_norm))
    return x, (k, v)
```

这段伪代码抓住了五个关键点：

- RMSNorm 是 pre-norm。
- RoPE 只作用在 Q/K。
- GQA 的 K/V heads 少于 Q heads。
- KV cache 拼接在序列维。
- residual 要求输出回到 hidden size。

## 常见错误

| 常见错误 | 正确认识 |
| --- | --- |
| 给 V 加 RoPE | 通常 Q/K 加 RoPE，V 不加 |
| 把 RMSNorm 当 LayerNorm 简写 | RMSNorm 不减均值，只控制 RMS 尺度 |
| 以为 GQA 改变 next-token 目标 | 它主要改变 attention head/KV 组织 |
| KV cache 只影响速度不影响显存 | 长上下文下 cache 是显存大头之一 |
| 只看训练结构，不看推理结构 | LLM 部署瓶颈常在 autoregressive decode |
| 以为 LLaMA 是全新架构 | 它仍是 decoder-only Transformer |
| 增量生成时 position_id 从 0 开始 | RoPE 相对位置会错 |
| 把 GQA 的 K/V 物理 repeat 后再存 cache | 会丢掉 GQA 的显存收益 |

## 测试验收

- 能说明 LLaMA 相比 MiniGPT 改了什么。
- 能解释 Q/K 加 RoPE、V 不加 RoPE。
- 能比较 LayerNorm 和 RMSNorm。
- 能写最小测试验证 RoPE 前后向量 norm 近似不变。
- 能用 `position_ids` 测试 RoPE cache offset，不让 decode 阶段从 0 重新开始。
- 能写 `repeat_kv` shape 测试，确认 `H % G == 0`。
- 能在 eval/no_grad 下比较 KV cache decode 和 full forward 的最后位置 logits。
- 能比较 MHA、MQA、GQA 的 KV cache shape。
- 能解释 KV cache 为什么能加速增量推理。
- 能用 `H=32,G=8` 估算 cache 缩减比例。
- 能说明 prefill 和 decode 阶段 attention score shape 的差别。

## FAQ

### 1. RoPE 是否一定比 learned position embedding 好？

不是无条件好。RoPE 更适合现代 decoder-only 长上下文和相对位置建模，但具体效果还受训练长度、插值策略、模型规模和数据影响。

### 2. GQA 会不会降低质量？

可能有取舍。GQA 通过减少 K/V heads 节省 cache，通常在质量和效率之间折中。具体配置需要评测。

### 3. RMSNorm 为什么不减均值也能用？

它主要控制向量尺度，让深层计算更稳定。实践中 RMSNorm 足够有效，也更简单。

### 4. KV cache 会不会改变模型输出？

正确实现时不应该改变输出语义。它只是复用历史 K/V，避免重复计算。若输出变化，通常是 position_id、mask、dtype、cache 拼接或 eval 模式有问题。

### 5. GQA 和 KV cache 是一回事吗？

不是。GQA 是 attention head 组织方式，减少要存的 K/V heads；KV cache 是推理策略，保存历史 K/V。两者经常一起影响推理显存。

### 6. LLaMA block 学完是否就能训练大模型？

不能。本章只解释结构。真实训练还需要大规模数据、分布式训练、优化器、混合精度、稳定性监控、评测和安全治理。

## 自测题

1. RoPE 为什么作用在 Q/K 上？
2. RMSNorm 和 LayerNorm 的公式差异是什么？
3. SwiGLU 的门控在哪里？
4. `H=32, G=8` 时，GQA 的 KV cache 相比 MHA 大约省多少？
5. KV cache 保存的是什么？
6. prefill 阶段和 decode 单步阶段的 attention score shape 分别是什么？
7. 增量生成时 RoPE 的 position_id 为什么不能每步从 0 开始？

答案要点：

- Q/K 决定 attention score，位置应参与匹配。
- RMSNorm 不减均值，只除以 RMS 并乘 weight；LayerNorm 会减均值并除以标准差。
- `SiLU(W_gate x) * W_up x`。
- 约 4 倍。
- 每层历史 token 的 key/value。
- prefill 近似 `[B,H,T,T]`；decode 单步近似 `[B,H,1,T_cache]`。
- 因为新 token 与历史 token 的相对位置依赖真实序号，重置会破坏 RoPE 角度关系。

## 想继续深挖

继续深挖 LLaMA，要把“现代组件”都还原成数学压力的回应：

```text
- RoPE 让位置进入 Q/K 匹配。
- RMSNorm 控制向量尺度。
- SwiGLU 给 FFN 加门控。
- GQA 少存 K/V。
- KV cache 避免重复计算历史 K/V。
```

这些改动都不是花哨架构名词，而是在长上下文、推理延迟、显存和训练稳定性之间做取舍。

## 和领域项目的关系

法律和医学领域小模型最终往往不会从零训练 LLaMA，但你需要读懂它的结构，才能决定 LoRA target_modules、量化策略、serving cache、上下文长度和延迟预算。理解 LLaMA 组件，是从教学 MiniGPT 走向真实开源模型工作流的桥。

法律项目中，长合同会直接考验上下文长度、RoPE 位置处理和 KV cache 显存预算；医学项目中，多轮问答和安全追问会放大增量解码延迟。GQA 和 KV cache 不只是“底层优化”，而会影响你能否在给定显存、延迟和成本下提供可靠服务。

同时要记住：结构升级不等于领域可靠。LLaMA block 提供能力底座，法律/医学可用性仍然取决于证据约束、专业评测、拒答策略、审计日志和人工复核。
