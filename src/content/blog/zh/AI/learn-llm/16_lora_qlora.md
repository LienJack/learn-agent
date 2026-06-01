---
title: "第 16 章：LoRA / QLoRA 参数高效微调"
description: "全量微调太贵，能不能只训练少量参数？"
author: LienJack
pubDate: 2026-06-01
locale: zh
tags:
  - LLM 学习
  - LLM
  - AI
---
# 第 16 章：LoRA / QLoRA 参数高效微调

## 本章核心困惑

全量微调太贵，能不能只训练少量参数？

一个现代 LLM 可能有几十亿甚至上百亿参数。如果每次领域适配都更新全部参数，会遇到几个现实问题：

- 显存不够。
- 训练成本高。
- 多个领域版本难以管理。
- 回滚和对比困难。
- 小数据全量更新容易过拟合。

LoRA 的答案很漂亮：

> 冻结原模型的大矩阵，只训练一个低秩增量。

QLoRA 再进一步：

> 底座模型用低比特量化省显存，训练时只更新 LoRA adapter。

本章的数学核心是低秩分解。不要把 LoRA 当成“微调插件”，要理解它为什么可以用少量参数近似更新方向。

## 前置知识

- 会跑 Hugging Face 最小训练。
- 理解线性层、矩阵乘法和低秩直觉。
- 知道 SFT 学的是格式、行为和输出契约。
- 理解领域数据少时容易过拟合。

## 本章新增能力

你会设置 PEFT、LoRA rank/alpha、target_modules、adapter 保存加载、merge adapter、QLoRA、4-bit quantization 和显存优化，并报告质量、速度和成本。

一句话记忆：

> LoRA 不重写整块知识，而是在关键线性层旁边加一个小的可训练修正方向。

## 1. 全量微调为什么贵

一个线性层可以写成：

```text
y = xW
```

如果：

```text
W: [4096, 4096]
```

参数量是：

```text
4096 * 4096 = 16,777,216
```

这只是一个矩阵。真实 LLM 有很多层、很多投影矩阵。

全量微调要为大量参数保存：

- 参数本身。
- 梯度。
- optimizer state。
- 可能还有混合精度副本。

显存压力会迅速上升。

而领域小模型任务往往不需要重塑整个语言能力，只需要让模型学会：

- 特定输出格式。
- 领域术语使用。
- 风险边界。
- 引用和拒答行为。

所以全量更新所有参数常常过重。

## 2. 低秩直觉：很多更新方向并不需要满维

LoRA 假设：微调时需要的权重变化 `ΔW` 可能位于一个低维子空间里。

原始全量更新：

```text
W' = W + ΔW
```

如果 `W` 是 `[d_in, d_out]`，那么 `ΔW` 也是 `[d_in, d_out]`。

LoRA 不直接训练完整 `ΔW`，而是写成两个小矩阵的乘积：

```text
ΔW = A B
```

其中：

```text
A: [d_in, r]
B: [r, d_out]
r << min(d_in, d_out)
```

`r` 就是 rank。

参数量从：

```text
d_in * d_out
```

变成：

```text
d_in * r + r * d_out
```

如果 `d_in = d_out = 4096`，`r = 8`：

```text
full ΔW 参数量 = 4096 * 4096 = 16,777,216
LoRA 参数量 = 4096*8 + 8*4096 = 65,536
```

只占约：

```text
65,536 / 16,777,216 ≈ 0.39%
```

这就是 LoRA 的数学收益。

## 3. LoRA 前向公式

原始线性层：

```text
x: [B, d_in]
W: [d_in, d_out]
y = xW
```

LoRA 后：

```text
ΔW = A @ B
A: [d_in, r]
B: [r, d_out]
y = xW + scale * xAB
```

通常：

```text
scale = alpha / r
```

这是本章统一采用的教学口径。很多工程库为了匹配 PyTorch `Linear.weight` 的存储，会把矩阵名写成转置形状：PEFT 常见 `lora_A: [r, d_in]`、`lora_B: [d_out, r]`，前向仍等价于 `x @ A.T @ B.T`。读源码时要分清“数学口径”和“框架存储口径”，不要把二者混用。

训练时：

- `W` 冻结。
- `A` 和 `B` 可训练。
- 反向传播只更新 LoRA 参数。

生活类比：原模型像一本已经印好的大书。全量微调是重新排版整本书；LoRA 是贴一组可拆卸批注。批注足够小，方便不同领域切换，也方便回滚。

## 4. rank 怎么选

rank 越大，LoRA 可表达的更新越复杂，但参数和过拟合风险也更高。

常见实验矩阵：

| rank | 成本 | 表达能力 | 风险 |
| --- | --- | --- | --- |
| 4 | 很低 | 有限 | 可能欠拟合 |
| 8 | 低 | 常用起点 | 平衡 |
| 16 | 中等 | 更强 | 可能过拟合 |
| 32+ | 更高 | 更强 | 数据少时需谨慎 |

不要凭感觉选 rank。应该固定数据、eval set 和训练步数，比较：

- JSON 格式准确率。
- citation support。
- refusal accuracy。
- 高风险 unsafe rate。
- adapter 大小。
- 训练时间。

领域项目里，rank 不是越大越好。小数据任务尤其要防止 adapter 把训练集格式背死。

## 5. target_modules：LoRA 应该加在哪里

LoRA 通常加在线性层上，尤其是 attention 和 FFN 的投影矩阵。

常见目标：

```text
q_proj, k_proj, v_proj, o_proj
gate_proj, up_proj, down_proj
```

不同目标影响不同：

- 只调 Q/V：成本低，常见轻量方案。
- 调 Q/K/V/O：更充分影响 attention。
- 加上 FFN：表达能力更强，但参数更多。

目标模块必须和模型结构匹配。不同模型命名不同，不能盲目复制配置。

第 10 章理解 LLaMA 结构后，你才知道这些 target_modules 对应哪些矩阵。

最小 PEFT 配置应显式打印 target 命中和可训练参数：

```python
from peft import LoraConfig, get_peft_model

config = LoraConfig(
    r=8,
    lora_alpha=16,
    lora_dropout=0.05,
    target_modules=["q_proj", "v_proj"],
    bias="none",
    task_type="CAUSAL_LM",
)
model = get_peft_model(base_model, config)
model.print_trainable_parameters()

trainable = [n for n, p in model.named_parameters() if p.requires_grad]
assert trainable
assert any("lora_" in n for n in trainable)
assert all(not p.requires_grad for n, p in model.named_parameters() if "base_model" in n and "lora_" not in n)
```

## 6. QLoRA：量化底座 + LoRA adapter

QLoRA 的核心是：

```text
base model: 4-bit quantized, frozen
adapter: LoRA params, trainable
```

这样能显著降低显存占用，让单卡训练更可行。

但量化不是免费午餐：

- 低比特表示可能带来精度损失。
- 训练和推理框架更复杂。
- 某些硬件/算子支持有限。
- 量化后必须重新跑评测和安全回归。

QLoRA 适合低成本适配，不适合拿来掩盖脏数据、模糊任务和缺失评测。

QLoRA 最小 checklist：

```text
load_in_4bit = true
bnb_4bit_quant_type = nf4
bnb_4bit_compute_dtype = bf16
bnb_4bit_use_double_quant = true
gradient_checkpointing = true
max_seq_len = 任务真实上限
effective_batch_size = per_device_batch * gradient_accumulation * devices
```

## 7. adapter 保存、加载、合并与回滚

LoRA 的工程优势之一，是 adapter 可以单独保存。

常见版本关系：

```text
base_model: llama-base@revision
adapter: legal-lora-v3
data: legal-sft-v3
eval: legal-eval-v2
```

推理时可以：

```text
base + adapter -> serve
```

也可以把 adapter merge 进 base：

```text
W_merged = W + ΔW
```

merge 后推理部署可能更方便，但会降低 adapter 切换和回滚的灵活性。

领域项目建议 manifest 记录：

- base model id/revision。
- adapter version。
- candidate_manifest：base model、adapter、quantization、prompt、retrieval index、eval version、decoding config。
- LoRA rank/alpha。
- target_modules。
- merge 前后的 greedy token ids / logits 差异。

merge 风险要单独验证：在 `eval()`、`no_grad()`、固定 decoding、`temperature=0` 下比较 merge 前后输出 token ids 和关键 logits。量化部署版本也要独立跑同一套 gate，不能因为 fp16 adapter 通过就默认 int4 服务通过。
- dataset version。
- eval report。
- rollback target。

### 例子 1：法律合同审查 adapter

假设你有一个通用 chat base model，希望它更稳定地输出合同审查 JSON。LoRA 训练目标不是让模型“记住全部法律”，而是让它更稳定地学会：

- 风险等级字段：`low | medium | high | unknown`。
- 风险标签字段：违约金过高、单方解除、责任排除、管辖争议等。
- 引用字段：必须指向 RAG 提供的 `source_id/span_id`。
- 边界字段：`review_required=true`、`review_type=lawyer` 在高风险或证据不足时出现。

一个健康的法律 LoRA 实验报告不应只写“训练 loss 下降”，而应比较：

```text
base -> legal_sft_lora_r8 -> legal_sft_lora_r16

format_accuracy
citation_support
unsafe_legal_conclusion_rate
review_required_recall
adapter_size
training_time
```

如果 r16 的格式准确率比 r8 高 2%，但 unsafe legal conclusion rate 也上升，就不能简单选择 r16。高风险领域里，低错误率通常比更流畅的回答更重要。

### 例子 2：医学科普 QLoRA

医学科普助手可能希望在有限显存上训练一个 adapter，让模型更稳定地识别危险信号和拒绝个体化诊断。QLoRA 适合这种低成本实验：

```text
base model: 4-bit frozen
adapter: trainable LoRA
task: structured medical education answer
eval slices: common_qa, red_flags, medication_boundary, no_evidence_refusal
```

但 QLoRA 的边界也很清楚：量化底座降低了训练显存，不代表医学安全提高。训练后必须重新评测急症警示、药物禁忌、拒答和免责声明。如果量化后模型更容易漏掉危险信号，即使平均格式分不错，也不能进入发布候选。

## 8. LoRA 不能解决什么

LoRA 降低训练成本，但不能替你解决任务定义。

它不能自动修复：

- 脏数据。
- 错误标签。
- 训练/评测泄漏。
- RAG 证据不足。
- 法律/医学边界不清。
- 输出 schema 设计不合理。

如果 SFT 数据里充满“无证据强答”，LoRA 会高效学会无证据强答。

这句话有点冷，但很关键：

> 参数高效，不等于行为可靠。

更完整地说，LoRA 的工程边界可以分成四层：

| 层级 | LoRA 能做什么 | LoRA 不能做什么 |
| --- | --- | --- |
| 成本层 | 减少可训练参数和 adapter 存储 | 消除训练、评测和部署成本 |
| 行为层 | 学习格式、语气、拒答模式 | 保证事实正确或证据充分 |
| 知识层 | 记住少量稳定模式 | 可靠维护会更新的法律/医学知识 |
| 治理层 | 方便版本切换和回滚 | 替代数据许可、隐私审计和发布门禁 |

这也是为什么本路线先讲评测、数据工程、RAG 和 SFT，再讲 LoRA。没有前面几章，LoRA 只会让错误更便宜、更快、更难被察觉。

## 9. 最小参数量计算

```python
def lora_params(d_in, d_out, rank):
    return d_in * rank + rank * d_out

d = 4096
for rank in [4, 8, 16]:
    adapter = lora_params(d, d, rank)
    full = d * d
    print(rank, adapter, adapter / full)
```

你应该看到 rank 越大，adapter 参数线性增长；全量矩阵参数是平方级。

这就是低秩分解的核心收益。

最小实验说明：

```text
实验 A：base model
  -> 跑 frozen eval，记录格式、事实、拒答、引用指标。

实验 B：LoRA r=4
  -> 同一数据、同一 epoch、同一 eval。

实验 C：LoRA r=8
  -> 只改变 rank，其他不变。

实验 D：QLoRA r=8
  -> 底座量化，比较显存、速度和质量。
```

报告时不要只画一条 loss 曲线。最低限度要有：

```text
rank | train_loss | val_loss | format_acc | citation_support | refusal_acc | unsafe_rate | adapter_mb | peak_vram
```

如果训练 loss 持续下降，但 val refusal accuracy 下降，这不是“还没训练够”，而可能是模型正在过拟合有问必答的训练分布。

## 10. 常见错误

| 常见错误 | 正确认识 |
| --- | --- |
| rank 越大越好 | rank 是成本/表达/过拟合的 trade-off |
| LoRA 能修复脏数据 | 它只会高效学习数据里的模式，包括坏模式 |
| adapter 不需要版本管理 | adapter、base、data、eval 必须一起追踪 |
| merge 后还能随便回滚 | merge 降低切换灵活性，需保留原 adapter |
| QLoRA 只影响显存不影响质量 | 量化可能影响质量，必须回归评测 |
| target_modules 可以照抄 | 不同模型层命名和结构不同 |

### 10.1 失败模式分层排查

| 现象 | 可能根因 | 排查顺序 | 修复方向 |
| --- | --- | --- | --- |
| 训练报找不到 target module | 模型层命名不同 | 打印 `model.named_modules()` | 按实际结构改 `target_modules` |
| loss 不下降 | labels 全是 `-100`、学习率太低、adapter 未启用 | 检查 batch labels 和 trainable params | 修正 collator 或 LoRA 配置 |
| train loss 降，eval 变差 | 过拟合、泄漏、样本偏差 | 比较 train/val gap 和失败切片 | 降 rank、早停、清洗数据 |
| merge 前后输出明显不同 | dtype/量化/merge 流程问题 | 固定 greedy、比较 logits 或 token ids | 复查 merge 和保存加载 |
| QLoRA 显存仍爆 | batch、seq_len、optimizer、gradient checkpoint 设置不当 | 记录 peak vram | 降 seq_len、梯度累积、检查量化加载 |
| 法律/医学回答更自信但错 | 训练数据鼓励强答 | 看 unsafe/refusal eval | 加入拒答和证据不足样本 |

### 10.2 反例：LoRA 训练成功但系统失败

一个常见反例是：合同审查 LoRA 训练后 JSON 格式准确率从 70% 升到 95%，但 citation support 从 65% 降到 45%。表面看模型更“工程化”，实际是它学会了稳定输出引用字段，却没有学会引用必须支撑结论。

这个系统不能发布。正确处理不是继续加大 rank，而是回到数据和 RAG：

```text
检查 SFT 样本中的 citation 是否真实支持答案
  -> 检查 RAG top-k 是否召回 expected span
    -> 增加无依据拒答样本
      -> 再跑同一 frozen eval
```

## 测试验收

- 能手算一个 LoRA 参数量。
- 能解释 `ΔW = AB` 为什么是低秩更新。
- 能比较 rank 4/8/16 的 adapter 参数规模。
- 能保存并重新加载 adapter。
- 能 merge adapter，并比较 merge 前后输出差异。
- 能在同一 eval set 上比较 base、SFT-LoRA、QLoRA。
- 能在报告中记录质量、成本、显存和回滚方案。

## FAQ

### 1. LoRA 为什么有效？

因为许多下游适配不需要更新整个高维权重空间，低秩子空间里的增量就能表达足够的任务变化。它是经验上很有效的参数高效微调方法，但具体效果仍要靠评测确认。

### 2. rank 太小会怎样？

可能表达能力不足，模型学不会目标格式或领域边界。表现为训练和验证指标都上不去。

### 3. rank 太大会怎样？

成本上升，也更容易在小数据上过拟合。表现为训练集很好，eval set 或高风险切片退化。

### 4. QLoRA 是否一定适合生产？

不一定。QLoRA 适合降低训练成本；生产推理还要考虑延迟、吞吐、部署框架、量化质量、安全回归和回滚。

### 5. LoRA target_modules 应该越多越好吗？

不一定。目标模块越多，adapter 表达能力越强，成本和过拟合风险也越高。课程项目应从小配置开始，例如 attention 中的关键投影，再用 eval 判断是否需要扩展到 FFN。

### 6. LoRA 可以和 RAG 一起用吗？

可以，而且高风险领域通常应该一起用。LoRA 学会如何使用证据、如何输出结构和如何拒答；RAG 提供可更新、可引用的外部证据。LoRA 不应替代 RAG。

### 7. 为什么 adapter 要绑定 base revision？

adapter 学到的是相对于某个 base 权重的增量。base revision 改变后，同一个增量叠加到不同权重上，行为可能变化。发布报告必须记录 base model id 和 revision。

### 8. 训练 loss 很好看，为什么还要看 unsafe rate？

loss 衡量模型拟合训练 token 的程度，不直接衡量法律/医学安全。训练数据如果有偏，loss 越低可能表示模型越稳定地复现偏差。

## 自测题

1. `W: [4096,4096]`，rank=8 时 LoRA 参数量是多少？
2. `alpha/r` 的作用是什么？
3. 为什么 LoRA adapter 需要和 base model revision 绑定？
4. QLoRA 的底座模型通常是训练还是冻结？
5. LoRA 为什么不能替代 RAG？
6. 如果 r16 比 r8 的格式准确率更高，但拒答准确率更低，应该如何选择？
7. target_modules 配错时通常会出现什么问题？
8. 为什么 merge adapter 后仍要保留原 adapter 文件？

答案要点：

- `4096*8 + 8*4096 = 65536`。
- 控制 LoRA 增量缩放。
- base 权重变了，adapter 对应的增量语义也可能变。
- 通常量化后冻结，只训练 adapter。
- LoRA 学行为和参数内模式，RAG 提供可更新外部证据。
- 不能只看格式，应以高风险拒答和 unsafe rate 为发布优先指标；必要时选择 r8 或继续修数据。
- 可能报找不到模块，或实际没有可训练 adapter；应打印模型模块名和 trainable params。
- merge 方便部署但降低回滚和多 adapter 切换灵活性，原 adapter 是审计和恢复依据。

## 想继续深挖

继续深挖 LoRA，要盯住它限制了参数更新空间：

```text
W' = W + ΔW
ΔW ≈ A @ B
A: [d_in, r]
B: [r, d_out]
```

全量更新需要 `d_out * d_in` 个参数；LoRA 只训练：

```text
r * (d_out + d_in)
```

当 `d_out=d_in=4096, r=8` 时，全量矩阵约 `16.7M` 参数，LoRA 约 `65K` 参数。rank 越大，更新空间越自由，成本也越高；rank 太小，可能表达不了领域变化；rank 太大，又可能过拟合或吞掉省参数收益。深挖 LoRA，就是理解“省参数”背后是对 `ΔW` 形状的数学假设。

QLoRA 再多加一个取舍：底座权重量化降低显存，adapter 保持可训练。它省的是存储和训练成本，不是安全责任。每个 rank、target module、量化位宽组合都要回到固定 eval set 上比较质量、引用、拒答和高风险切片。

## 和领域项目的关系

法律合同审查和医学科普助手常常数据敏感、样本有限、更新频繁。LoRA/QLoRA 适合做低成本适配和版本化实验：同一个 base 可以挂不同 adapter，分别服务法律、医学或企业知识库。

但在高风险领域，LoRA 只是训练手段。真正决定能否发布的，是数据质量、RAG 证据、eval set、安全拒答、model card、risk report 和 release gate。LoRA 让试错更便宜，不让责任边界消失。
