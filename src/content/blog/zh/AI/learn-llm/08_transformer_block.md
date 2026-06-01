---
title: "第 8 章：Transformer Block"
description: "Attention 解决“看谁”，但完整 Transformer Block 还需要“如何变换”和“如何稳定堆深”。本章把 multi-head attention、FFN、残差和归一化合成一个可训练 block。"
author: LienJack
pubDate: 2026-06-01
locale: zh
tags:
  - LLM 学习
  - LLM
  - AI
---
# 第 8 章：Transformer Block

## 核心问题

Attention 解决“看谁”，但完整 Transformer Block 还需要“如何变换”和“如何稳定堆深”。本章把 multi-head attention、FFN、残差和归一化合成一个可训练 block。

写到这里，很多人会遇到一个更实际的问题：attention 已经能汇总上下文了，为什么 block 里还要塞 FFN、残差和 norm？这些部件看起来像工程补丁，但少一个训练就可能不稳定，少一个表达力就会明显下降。

一个 decoder-only Transformer block 可以粗略理解成两步：

```text
先让每个 token 从历史上下文取信息
再让每个 token 独立做一次更强的非线性变换
```

对应结构是：

```text
x -> attention -> x'
x' -> FFN -> x''
```

但如果直接堆几十层：

```text
x = FFN(Attention(x))
```

训练很容易出现梯度不稳、数值尺度漂移、深层难优化。于是有了完整 block 的四个支柱：

- Multi-Head Attention：从多个子空间看上下文。
- FFN：对每个位置做非线性特征变换。
- Residual：保留原信息，让梯度有近路。
- Norm：控制 hidden state 尺度，让深层更稳定。

本章只做一件事：把 attention 变成可堆叠、可训练、可表达的 Transformer block。

```text
单头 attention -> 多头 attention -> 输出投影
  -> 残差保底 -> 归一化稳尺度
  -> FFN 增强表达 -> pre-norm block
  -> 可堆叠的 decoder block
```

## 前置知识

- 已能实现 single-head attention。
- 理解 residual 是把输入加回输出。
- 知道 LayerNorm/RMSNorm 用于稳定数值尺度。
- 能读懂 `[B,T,C]`、`[B,H,T,D]`、`[B,H,T,T]`。
- 知道 causal language modeling 不能看未来 token。

## 本章新增能力

你会手写 Multi-Head Attention、FFN、activation、residual connection、LayerNorm、dropout、pre-norm/post-norm，并估算 attention complexity、参数量、显存和 KV cache 直觉。RMSNorm 在本章只做概念预告，第 10 章正式实现。

学完后，你应该能解释：

- 为什么 Transformer block 输入输出 shape 必须一致。
- attention 和 FFN 分别负责什么。
- residual 为什么要保留主干和梯度近路。
- pre-norm 为什么通常比 post-norm 更容易堆深。
- attention 的 `O(T^2)` 成本从哪里来。
- 为什么 FFN 往往占很多参数，而 attention 往往占长上下文显存。

## 最小推导或最小代码

Pre-norm block 的数据流：

```text
x -> x + Attention(Norm(x))
  -> x + FFN(Norm(x))
```

代码骨架：

```python
def forward(x):
    x = x + self.attn(self.norm1(x))
    x = x + self.ffn(self.norm2(x))
    return x
```

Attention score 是 `[B,H,T,T]`，所以序列长度翻倍时，注意力计算和显存近似变成四倍。

## 1. Block 的两条路径：跨 token 与逐 token

假设输入是：

```text
x: [B,T,C]
```

每个位置都有一个 hidden state。第 7 章的 attention 会让每个位置从历史位置取信息，得到仍然是：

```text
attn_out: [B,T,C]
```

为什么输出还要是 `[B,T,C]`？因为 block 要堆叠。第 1 层输出必须能作为第 2 层输入。如果 attention 输出变成 `[B,T,2C]`，残差就加不上，后续层接口也乱了。

可以把一个 block 想成对每个 token 表示做两次处理：

```text
上下文加工：这个 token 应该吸收哪些历史信息？
特征加工：吸收之后，这个位置内部哪些特征应该增强或抑制？
```

最小例子：

```text
患者 胸痛 伴 呼吸困难 ， 应 立即 就医
```

attention 把“立即就医”与“胸痛”“呼吸困难”联系起来；FFN 可以将它转成“危险信号”维度更强的表示。

## 2. Multi-Head Attention：shape 逻辑

第 7 章已经把多头 attention 的内部 shape 推过。在 Transformer Block 里，先把它看成一个保持接口不变的子层：

```text
x:       [B,T,C]
attn(x): [B,T,C]
```

内部会临时展开成：

```text
q/k/v:  [B,H,T,D]
scores: [B,H,T,T]
out:    [B,T,C]
```

这个接口成立，后面 residual 才能写成：

```text
x = x + attn(norm(x))
```

多头的价值在于并行使用多个匹配子空间。不要过度解释单个 head，但要理解所有子层最后都必须回到 `[B,T,C]`。

## 3. Residual：保留主干和梯度近路

残差连接写成：

```text
y = x + F(x)
```

它至少解决三件事。

第一，保留原信息。Attention 或 FFN 初期还没学好时，`F(x)` 可能很差；加上 `x` 后，block 至少可以近似恒等映射。

第二，帮助梯度流动。如果多层都是复杂函数复合：

```text
x -> F1 -> F2 -> F3 -> ...
```

梯度要穿过每一层。残差提供了一条更直接的路径。

第三，让深层网络逐步修正表示。每一层不必从零重写 token 表示，只需要学习一个增量：

```text
new_state = old_state + correction
```

实际写的时候先检查 shape：两边必须一致。如果 `x: [B,T,C]`，`F(x): [B,T,4C]`，不能直接相加，必须先投影回 `C`。这也是为什么 FFN 最后要 `down_proj` 回 hidden size。

梯度直觉也可以更严谨一点：标量写法里 `y = x + F(x)` 的局部导数像 `1 + dF/dx`；向量网络中更准确地说是 identity Jacobian `I` 加上子层 Jacobian `J_F(x)`。残差让梯度至少有一条接近恒等映射的路径。

## 4. 归一化：LayerNorm、RMSNorm 与 pre-norm

深层网络里，每层输出的尺度可能逐渐漂移。某层 hidden state 数值过大，会让 attention score 过尖，也会让 FFN 激活进入不稳定区间。

LayerNorm 对最后一维做：

```text
mean = average(x)
var = average((x - mean)^2)
y = (x - mean) / sqrt(var + eps) * gamma + beta
```

RMSNorm 更简单：

```text
rms = sqrt(mean(x^2) + eps)
y = x / rms * weight
```

在第 10 章我们会深入 RMSNorm。这里先抓住共同点：它们都在 hidden 维度上控制尺度，输入输出 shape 不变：

```text
norm(x): [B,T,C] -> [B,T,C]
```

Post-norm 写法：

```text
x = norm(x + attention(x))
x = norm(x + ffn(x))
```

Pre-norm 写法：

```text
x = x + attention(norm(x))
x = x + ffn(norm(x))
```

现代 decoder-only LLM 多偏向 pre-norm，因为残差主干更干净，梯度更容易沿着 `x -> x + ...` 的路径传播。直观说，先把输入整理到稳定尺度，再交给子层处理；子层输出作为增量加回主干。

## 5. FFN：逐 token 的非线性变换

Attention 在 token 之间交换信息，FFN 则对每个位置独立处理：

```text
FFN(x_t) = W2 activation(W1 x_t)
```

如果：

```text
x: [B,T,C]
W1: [C, 4C]
W2: [4C, C]
```

那么：

```text
x @ W1: [B,T,4C]
activation: [B,T,4C]
... @ W2: [B,T,C]
```

为什么中间维度常常放大到 `4C`？因为 FFN 需要一个更宽的空间来组合特征，再压回 hidden size。

Attention 把别的位置的信息搬到当前位置；FFN 在当前位置内部做非线性组合。所以 FFN 不改变 token 之间的通信图，但会改变每个 token 表示里的特征组合。

边界：FFN 不在 token 之间通信。没有 attention，FFN 看不到别的位置；没有 FFN，attention 汇总后的信息缺少强非线性变换。两者是分工，不是替代。

## 6. 最小实现

```python
from src.models.transformer_block import MultiHeadSelfAttention

class TransformerBlock(nn.Module):
    def __init__(self, hidden_size, num_heads, dropout=0.1):
        super().__init__()
        self.norm1 = nn.LayerNorm(hidden_size)
        self.attn = MultiHeadSelfAttention(hidden_size, num_heads, dropout)
        self.norm2 = nn.LayerNorm(hidden_size)
        self.ffn = nn.Sequential(
            nn.Linear(hidden_size, 4 * hidden_size),
            nn.GELU(),
            nn.Linear(4 * hidden_size, hidden_size),
            nn.Dropout(dropout),
        )

    def forward(self, x, attention_mask=None, causal=True):
        x = x + self.attn(
            self.norm1(x),
            attention_mask=attention_mask,
            causal=causal,
        )
        x = x + self.ffn(self.norm2(x))
        return x
```

本课程默认 dropout 位置如下：

```text
attention weights dropout：可选，本仓库实现中包含
attention output dropout：建议
FFN output dropout：建议
round-trip / save-load 测试：必须 model.eval() + torch.no_grad()
```

测试不要只看 forward 能跑。最小实验应该包括：

- 输入 `[2, 8, 32]`，输出也必须是 `[2, 8, 32]`。
- causal mask 开关能改变未来可见性。
- `model.train()` 下 dropout 生效，`model.eval()` 下输出稳定。
- 堆 1、2、4 层，loss 能 backward，grad norm 非 NaN。

## 7. 复杂度与参数量直觉

Attention score 是 `[B,H,T,T]`，所以长上下文成本主要来自 `T^2`：

```text
T = 1024 -> score 元素约 1M / head / batch
T = 2048 -> score 元素约 4M / head / batch
```

attention scores 近似显存：

```text
B * H * T * T * bytes_per_element
```

例如 `B=1, H=16, T=2048, bf16`，仅 scores 就约 `1 * 16 * 2048^2 * 2 ≈ 128MB`，还没算梯度、Q/K/V、中间激活和 optimizer state。

FFN 参数量通常很大。以普通 FFN 为例：

```text
W1: C * 4C = 4C^2
W2: 4C * C = 4C^2
合计约 8C^2
```

Attention 的 q/k/v/o 投影：

```text
Wq/Wk/Wv/Wo: 4 * C^2
```

所以在许多配置下，FFN 参数量可能比 attention 投影还大；但在长上下文训练或推理中，attention 的 `T^2` score 和 KV cache 又会成为显存/速度瓶颈。参数量和运行时成本不是同一个问题。

## 常见错误

| 常见错误 | 为什么会出问题 | 正确认识 |
| --- | --- | --- |
| residual 前后 hidden size 不一致 | 张量无法相加 | 子层输出必须投影回 `[B,T,C]` |
| 把 dropout 用在 eval 阶段 | 生成和保存加载测试会不稳定 | 推理、评测、round-trip 测试使用 `model.eval()` |
| 忽略 attention 的 `O(T^2)` 成本 | 上下文一长显存突然爆炸 | score shape 是 `[B,H,T,T]` |
| 只堆层数，不监控 grad_norm 和 loss 曲线 | 深层可能已发散但还在训练 | 记录 loss、grad norm、NaN 检查 |
| softmax 维度写成 head 维 | attention 权重语义错误 | 应在 key 维，也就是最后一维归一化 |
| 把 FFN 理解成跨 token 混合 | 会误解 block 分工 | FFN 逐位置处理，attention 跨位置通信 |
| pre-norm/post-norm 随便换 | 训练稳定性会变 | 深层 decoder 通常优先 pre-norm |

## 测试验收

- 输入输出 shape 完全一致。
- 1/2/4 层 block 的 loss 与 grad_norm 可比较。
- tiny block 参数量可手算或脚本统计。
- 能解释 residual、norm、FFN 各自解决什么问题。
- 能从 `[B,T,C]` 推出 q/k/v、score、out 的 shape。
- 能说明 attention 参数量、attention score 显存、FFN 参数量三者的区别。
- 能证明 `model.train()` 下 dropout 输出可变、`model.eval()` 下输出稳定。
- 能用 `attention_mask` 和 `causal` 开关做最小行为测试。
- 能构造一个测试证明 eval 模式下 dropout 不改变输出。

## FAQ

1. Attention 已经有线性投影了，为什么还需要 FFN？

   Attention 的核心是跨 token 加权汇总，FFN 的核心是逐 token 非线性特征变换。没有 FFN，模型组合特征的能力会弱很多。

2. Residual 会不会让模型偷懒，只复制输入？

   初期 residual 确实让模型容易保持恒等映射，但训练目标会推动子层学习有用增量。它的作用是降低优化难度，不是取消学习。

3. LayerNorm 和 RMSNorm 能不能混用？

   教学实现里最好先选一种保持一致。真实模型结构要跟 checkpoint 配置一致，不能随便替换后还期待加载权重正常。

4. 为什么 block 输出不直接变成 logits？

   单个 block 只是中间表示变换。最终需要经过多个 block 和 LM head，把 hidden state 映射到 vocab size。

5. FFN 中间维度一定是 `4C` 吗？

   不是。`4C` 是常见教学配置，现代模型可能使用不同 expansion ratio，SwiGLU 结构下还会有不同参数计算方式。

## 自测题

1. `x: [B,T,C]`，`H` 个 head，`D=C/H`，q reshape 后 shape 是什么？
2. Attention score 为什么是 `[B,H,T,T]`？
3. Residual 为什么要求输入输出 hidden size 一致？
4. Pre-norm block 的两行核心公式是什么？
5. FFN 为什么先升维再降维？
6. 当 `T` 翻倍时，attention score 元素数量大约变成几倍？

答案要点：

- `[B,H,T,D]`。
- 每个 head 中每个 query 位置都要和每个 key 位置打分。
- 相加必须 shape 相同，且堆叠接口要稳定。
- `x = x + attn(norm1(x))`；`x = x + ffn(norm2(x))`。
- 在更宽空间中做非线性组合，再回到 block hidden size。
- 约 4 倍。

## 想继续深挖

继续深挖 Transformer block，可以抓住三件事：

```text
- attention 负责跨 token 汇聚信息。
- FFN 负责在每个位置内部做非线性变换。
- residual/norm 让这个过程能稳定堆深。
```
残差的核心公式仍然是 `y = x + F(x)`。向量网络里可以把它理解为 identity Jacobian 加上子层 Jacobian，让梯度保留一条接近恒等映射的路径。归一化则控制每层激活尺度，避免层数变深后数值漂移太大。

## 和领域项目的关系

后续 MiniGPT、LLaMA、LoRA target_modules 都围绕 Transformer Block 展开。理解 block，才能知道参数高效微调到底改了哪些矩阵，量化和 KV cache 又影响哪里。

在法律合同审查里，attention 负责把“该条款”“上述责任”“除非另有约定”等上下文连接起来，FFN 负责把连接后的表示转成风险、义务、例外条件等内部特征。在医学问答里，attention 负责汇总症状、年龄、危险信号和否定词，FFN 负责组合出“需要就医”“可居家观察”“必须拒绝诊断”等表达倾向。

但 Transformer block 只是能力载体，不自动带来可靠性。领域项目还必须依赖数据清洗、证据约束、评测集、安全拒答和发布门禁。
