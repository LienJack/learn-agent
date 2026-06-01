---
title: "第 11 章：Hugging Face 工作流"
description: "现实中不可能每次从零写 tokenizer、模型结构、训练循环和保存加载逻辑。问题是：如果直接使用 Hugging Face，会不会从“理解模型”退回到“复制模板”？"
author: LienJack
pubDate: 2026-06-01
locale: zh
tags:
  - LLM 学习
  - LLM
  - AI
---
# 第 11 章：Hugging Face 工作流

## 本章核心困惑

现实中不可能每次从零写 tokenizer、模型结构、训练循环和保存加载逻辑。问题是：如果直接使用 Hugging Face，会不会从“理解模型”退回到“复制模板”？

这一章要解决的不是“背 API”，而是把前面自己实现过的组件一一映射到工业工具链里。学习者常见的困惑会沿着下面这条链演化：

```text
我能从零写 MiniGPT
  -> 但真实模型太大，不能总从零训练
    -> 我需要加载开源模型
      -> 加载后又要知道 tokenizer、chat template、generate 和 checkpoint 在哪里
        -> 训练、保存、加载、复现实验都要能解释
          -> 最后才能把 HF 当工程工具，而不是黑盒魔法
```

最重要的心智模型是：Hugging Face 不是替代底层知识，而是把底层知识封装成稳定接口。你越理解 tokenizer、forward、loss、generate 和 checkpoint，越不容易被模板坑住。

## 前置知识

- 已理解 MiniGPT 组件：tokenizer、embedding、Transformer block、LM head 和 generate。
- 知道 tokenizer、model、generate 和 checkpoint 的职责。
- 能记录依赖版本、模型 id、数据版本和实验配置。
- 理解训练和推理不是同一件事：训练关注 loss，推理关注采样、格式和延迟。

学这一章之前，你不需要记住所有 HF 类名，但应该能回答：“一段文本如何变成 token ids，token ids 如何进入模型，logits 如何变成新 token，参数如何保存和恢复。”

## 本章新增能力

你会使用 `AutoTokenizer`、`AutoModelForCausalLM`、`datasets`、`Trainer` 或 custom loop、`accelerate`、`generate()`、`save_pretrained()` 和 chat template，并建立 CPU fallback。

更具体地说，学完本章你应该能做到：

- 加载一个 tiny causal LM，在 CPU 上完成最小推理。
- 解释 `AutoTokenizer` 和 `AutoModelForCausalLM` 分别替代了你手写系统里的哪一部分。
- 使用 chat template 构造训练和推理一致的输入。
- 保存并重新加载模型或 adapter，知道保存的是全量权重还是增量权重。
- 在实验报告中记录模型版本、依赖版本、dtype、device、seed 和 prompt。

## 最小推导或最小代码

组件映射：

```text
自己实现 tokenizer  -> AutoTokenizer
自己实现 model      -> AutoModelForCausalLM
自己写 train loop   -> Trainer / custom loop
自己写 generate     -> model.generate
自己存 checkpoint   -> save_pretrained
```

这个映射不是表面替换。它背后有一条数据流：

```text
prompt 文本
  -> tokenizer 编码成 input_ids / attention_mask
    -> model 前向得到 logits
      -> generate 根据 logits 选择下一个 token
        -> tokenizer.decode 还原文本
```

最小推理：

```python
from transformers import AutoModelForCausalLM, AutoTokenizer

model_id = "sshleifer/tiny-gpt2"
tok = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(model_id)

if tok.pad_token is None:
    tok.pad_token = tok.eos_token
model.config.pad_token_id = tok.pad_token_id

prompt = "A safe medical assistant should"
ids = tok(prompt, return_tensors="pt")
out = model.generate(**ids, max_new_tokens=32, do_sample=False)
print(tok.decode(out[0], skip_special_tokens=True))
```

这里的最小推导是：`input_ids` 的 shape 通常是 `[batch, seq_len]`，模型输出 `logits` 的 shape 是 `[batch, seq_len, vocab_size]`。生成第一个新 token 时，框架会取最后一个位置的 logits：

```text
next_logits = logits[:, -1, :]
next_token = argmax(next_logits)   # greedy decoding
```

也就是说，`generate()` 并没有绕开语言模型原理。它只是把“反复前向、取最后一个位置、采样、拼接 token、检查停止条件”这件事封装起来。

最小显存估算也要能手算。假设一个 tiny model 有 `10M` 参数：

```text
fp32 权重显存 ~= 10,000,000 * 4 bytes = 40 MB
fp16/bf16 权重显存 ~= 10,000,000 * 2 bytes = 20 MB
int8 权重显存 ~= 10,000,000 * 1 byte = 10 MB
```

这只是权重本身，不包含 optimizer state、activation、KV cache 和框架开销。训练时如果使用 Adam，常见还要额外保存梯度和一阶/二阶动量，所以训练显存通常远大于推理显存。这个估算的价值不是精确报数，而是让你在切换 dtype、batch size 和 max length 前先有数量级判断。

最小版本记录可以写成实验日志：

```json
{
  "model_id": "sshleifer/tiny-gpt2",
  "revision": "main",
  "transformers": "固定到本次环境版本",
  "datasets": "固定到本次环境版本",
  "dtype": "float32",
  "device": "cpu",
  "seed": 42
}
```

后续第 12 章 eval runner 会把这些字段写进报告，否则同一个 prompt 的输出差异无法归因。

HF causal LM 的 label shift 约定要和前面手写 MiniGPT 区分清楚。`AutoModelForCausalLM` 通常约定：

```text
batch["input_ids"] 和 batch["labels"] 同形状
padding 或不训练位置的 labels 设为 -100
model.forward 内部把 logits[:, :-1] 对齐 labels[:, 1:]
```

不要把第 9 章 dataset-shifted 的 labels 再交给 HF model，否则可能重复 shift。最小训练 batch 可以这样检查：

```python
batch = tok(["hello world"], return_tensors="pt")
batch["labels"] = batch["input_ids"].clone()
outputs = model(**batch)
assert outputs.loss is not None
```

如果 `pad_token_id == eos_token_id`，padding 位置仍必须 `labels=-100`，生成停止条件也要单独测试。

### 例子 1：普通 causal LM prompt

普通 causal LM 可以直接输入：

```text
请总结这段合同的风险：
```

`sshleifer/tiny-gpt2` 适合测试 tokenizer/model/generate/save-load 流程，但它不是 chat model，不适合承担 chat template 教学。

### 例子 2：chat model 的 messages 序列化

chat model 通常训练在消息格式上：

```python
messages = [
    {"role": "system", "content": "你是一个谨慎的合同审查助手。"},
    {"role": "user", "content": "请总结这段合同的风险：..."},
]
text = tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
```

如果训练时使用 chat template，推理时却直接拼接字符串，模型看到的格式会变。轻则输出风格漂移，重则角色边界失效，比如把 system 规则当作用户正文继续补全。

如果教学环境暂时不下载 chat tiny model，也可以先保存 rendered text 样例，确认 system/user/assistant 边界被序列化成预期文本。

### 例子 3：保存的是全量模型还是 adapter

全量模型保存通常是：

```python
model.save_pretrained("outputs/full-model")
tok.save_pretrained("outputs/full-model")
```

LoRA adapter 保存通常是：

```python
peft_model.save_pretrained("outputs/legal-lora-adapter")
tok.save_pretrained("outputs/legal-lora-adapter")
```

这两者含义不同。全量模型目录应能直接 `AutoModelForCausalLM.from_pretrained()`；adapter 目录通常还需要原始 base model，再通过 PEFT 加载。把 adapter 当成全量模型加载，是课程项目里很常见的事故。

PEFT adapter 必须绑定 base model 和 revision：

```python
base = AutoModelForCausalLM.from_pretrained(base_model_id, revision=base_revision)
model = PeftModel.from_pretrained(base, adapter_path)
```

adapter manifest 至少记录：

```yaml
base_model_id: ""
base_revision: ""
adapter_path: ""
peft_version: ""
target_modules: ["q_proj", "v_proj"]
lora_r: 8
lora_alpha: 16
lora_dropout: 0.05
```

### 反例或边界：不要一上来就使用最大模型

如果你只想验证数据管道、保存加载和评测脚本，使用大模型反而会拖慢学习。工程上应先用 tiny model 跑通闭环：

```text
tiny model 通过：tokenize -> forward -> loss -> save -> load -> generate
  -> 再切换到目标 base model
```

边界是：tiny model 的输出质量没有参考价值，它只验证流程，不验证能力。不要因为 tiny model 答得差就否定流程，也不要因为大模型 demo 看起来好就跳过自动测试。

## 常见错误

| 常见错误 | 表现 | 正确认识 | 最小检查 |
| --- | --- | --- | --- |
| 训练和推理 chat template 不一致 | 训练后格式好，部署后乱输出 | template 是输入分布的一部分 | 保存训练样本的 rendered text |
| 没有固定依赖版本 | 今天能跑，换机器失败 | `transformers/datasets/accelerate/peft` 都会演进 | 报告写入 `pip freeze` 关键版本 |
| 保存了 adapter，却加载成全量模型 | 加载时报缺少权重或输出像 base | adapter 只是增量 | manifest 记录 `base_model` 和 `adapter_path` |
| 没有 CPU fallback | 教学 demo 只能在特定 GPU 上跑 | tiny 流程应能 CPU 复现 | CI 或本地跑 tiny model |
| 只看生成文本，不看 logits/loss | 无法定位问题在 tokenization 还是 decoding | 推理问题要能回到张量层 | 打印 `input_ids.shape` 和 `logits.shape` |
| 忽略 special tokens | padding、eos、bos 混乱 | special token 影响 mask 和停止条件 | 检查 `pad_token_id/eos_token_id` |
| 不记录 license/revision | 无法审计是否可用、可商用或可复现 | HF 模型也是带权利边界的依赖 | manifest 固定 license、revision、gated |

模型 manifest 至少包含：

```yaml
model_id: sshleifer/tiny-gpt2
revision: main
model_license: unknown
gated_access: false
base_model_card_url: https://huggingface.co/sshleifer/tiny-gpt2
allowed_use_notes: teaching smoke test only
local_files_only: false
trust_remote_code: false
```

默认 `trust_remote_code=False`。只有在明确审查模型仓库代码后，才考虑打开。

## 测试验收

- 加载 tiny HF model，完成一次推理和一次 train step。
- 保存加载验收分两层：CPU/fp32/eval/no_grad 下 logits `allclose`；`do_sample=False` 下 generated token ids 一致。
- 实验日志写入模型 id、依赖版本、dtype、device、seed、chat template 和 prompt。
- CPU fallback 能运行 tiny demo。
- 至少保留一个失败样例：例如错误 chat template 导致 JSON schema 不通过，并说明如何定位。
- 能手算 tiny model 的权重显存，并在报告中说明 dtype 改变带来的数量级变化。
- 将模型 id、revision、dtype、device 和 seed 传给第 12 章固定 eval runner，作为后续 RAG/SFT/LoRA 对比的基线元数据。

一个最小验收实验可以这样设计：

```text
1. 使用 tiny-gpt2 跑 greedy generate，保存输出。
2. 保存模型和 tokenizer。
3. 重新加载后使用同一 prompt、同一 seed、do_sample=False。
4. 比较 token ids 是否一致。
5. 如果不一致，记录依赖版本、特殊 token 和 generation config。
```

## FAQ

### 1. `AutoModelForCausalLM` 为什么不用我指定具体模型类？

因为模型目录里的 config 会声明架构类型，`AutoModelForCausalLM` 根据 config 自动选择对应类。它方便，但不代表你可以不看 config。遇到 target_modules、RoPE、chat template 或特殊 token 问题时，config 往往是第一现场。

### 2. `Trainer` 和 custom loop 应该选哪个？

教学项目建议两者都理解。`Trainer` 适合快速跑通标准训练，custom loop 适合暴露 loss mask、batch、梯度累积和日志细节。如果你正在调 assistant-only loss 或特殊评测，custom loop 更容易定位问题。

### 3. 为什么要记录 dtype 和 device？

同一模型在 fp32、fp16、bf16、4-bit 下的速度、显存和数值误差都不同。法律/医学项目需要可审计报告，不能只写“模型变好了”，还要写是在什么环境下得到的结果。

### 4. chat template 是 prompt engineering 吗？

它比普通 prompt 更底层。chat template 定义消息如何被序列化成模型训练时见过的 token 序列。template 错了，模型可能不是“回答不好”，而是根本没看到熟悉的对话格式。

### 5. Hugging Face 下载模型失败怎么办？

工程上要区分网络问题、权限问题、模型 id 错误和 revision 不存在。教学项目可以准备 tiny 本地缓存或跳过大模型测试，但不能删除版本记录。

## 自测题

1. `input_ids` 和 `logits` 的典型 shape 分别是什么？
2. 为什么训练和推理必须使用一致的 chat template？
3. `save_pretrained()` 保存全量模型和保存 LoRA adapter 有什么区别？
4. 为什么 tiny model 适合做流程测试，却不适合评价领域能力？
5. greedy decoding 和 sampling 的输出稳定性有什么差别？

答案要点：

- `input_ids` 通常是 `[batch, seq_len]`，`logits` 通常是 `[batch, seq_len, vocab_size]`。
- template 决定消息序列化方式，是模型输入分布的一部分。
- 全量模型包含完整权重；adapter 只包含相对 base 的增量，必须绑定 base revision。
- tiny model 只能验证代码闭环，参数规模和训练数据不足以代表真实能力。
- greedy 在同一环境下更稳定；sampling 会受 temperature、top-p、seed 等影响。

## 想继续深挖

继续深挖 Hugging Face，不要只记 API，要把每个 API 对回手写组件：

```text
AutoTokenizer -> text <-> token ids
AutoModelForCausalLM -> input_ids -> logits [B,T,V]
generate -> logits -> sampling/search -> new token
save_pretrained -> config + weights + tokenizer files
```

显存估算也可以先用最小公式：

```text
parameter_memory ≈ num_parameters * bytes_per_parameter
```

一个 100M 参数模型，fp32 约 `100M * 4 = 400MB`，fp16/bf16 约 `200MB`，还没算 optimizer state、activation、KV cache 和 batch。这样你看到 `torch_dtype`、`device_map`、`load_in_4bit` 时，就知道它们不是配置玄学，而是在改变数值精度、显存占用和部署约束。

## 和领域项目的关系

法律和医学项目会大量使用开源模型、tokenizer 和 PEFT 工具。本章让你能把框架便利与底层机制对应起来，减少模板错配、版本漂移和保存加载事故。

在合同审查项目中，HF 工作流会负责加载 base model、应用合同审查 chat template、保存 LoRA adapter，并把 eval report 绑定到模型版本。在医学科普项目中，它会帮助你控制拒答模板、危险信号提示和引用格式的一致性。

高风险项目里，最危险的不是“不知道某个 API”，而是 API 能跑但语义错了：训练时一个 template，评测时另一个 template；报告里只写 adapter 路径，不写 base revision；本地 GPU 能跑，CPU 教学环境无法复现。本章的验收标准就是把这些隐性风险显性化。
