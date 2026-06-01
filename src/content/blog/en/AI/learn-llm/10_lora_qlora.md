---
title: "Chapter 10: LoRA / QLoRA Parameter-Efficient Fine-Tuning"
description: "Chapter 9's SFT assumes model parameters can be updated. But full fine-tuning a 7B, 14B, or larger model brings GPU memory, storage, distribution, ..."
author: LienJack
pubDate: 2026-06-01
locale: en
tags:
  - LLM Learning
  - LLM
  - AI
---
# Chapter 10: LoRA / QLoRA Parameter-Efficient Fine-Tuning

## 1. The Real Problem This Chapter Solves

Chapter 9's SFT assumes model parameters can be updated. But full fine-tuning a 7B, 14B, or larger model brings GPU memory, storage, distribution, and rollback costs. Domain projects often do not need to rewrite all knowledge; they need a controlled shift in a few task directions.

The core idea of LoRA is to freeze the original model weights and train only low-rank update matrices. QLoRA goes further: the frozen base model is quantized to 4-bit, while the trainable part remains the LoRA adapter.

Core question:

```text
Full fine-tuning is expensive, so why can training only a small low-rank adapter still change model behavior?
```

## 2. Chain of Questions

1. Full fine-tuning changes many weights and has high GPU-memory, storage, and rollback costs.
2. New problem: how can changing a small number of parameters affect the behavior of large matrices?
3. New mechanism: LoRA freezes `W` and trains only a low-rank update `Delta W = B @ A`.
4. New boundary: low-rank capacity is limited, so rank `r`, `alpha`, and data quality become key choices.
5. New problem: which linear layers should receive adapters?
6. New mechanism: `target_modules` decides whether adapters affect attention, MLP, or other projection layers.
7. New problem: during deployment, should the adapter be kept separate or merged into the base?
8. New mechanism: adapters can be saved, loaded, switched, or merged separately, but merged models must be re-evaluated.
9. QLoRA further reduces GPU memory by using a 4-bit quantized base model plus LoRA.
10. Next chapter's question: even cheap adapter training cannot rescue dirty data; what kind of data engineering creates domain ability?

## 3. Concept Card

| Concept | Mathematical object | Shape | Code object | Experimental object |
| --- | --- | --- | --- | --- |
| frozen weight | original weight | `(out, in)` | base model | no-update check |
| LoRA A | down-projection matrix | `(r, in)` | `lora_A` | rank comparison |
| LoRA B | up-projection matrix | `(out, r)` | `lora_B` | update norm |
| rank | low-rank capacity | scalar | `r` | underfit/overfit |
| alpha | scaling coefficient | scalar | `lora_alpha` | stability |
| target modules | injection locations | module names | `target_modules` | parameter count |
| quantized base | quantized weights | 4-bit storage | bitsandbytes | memory use |

## 4. LoRA's Mathematical Object

For a linear layer:

```text
y = x @ W.T
```

LoRA does not train `W` directly. It trains a low-rank update:

```text
y = x @ W.T + scale * x @ A.T @ B.T
scale = alpha / r
```

where:

```text
W: FloatTensor[out, in]   frozen
A: FloatTensor[r, in]     trainable
B: FloatTensor[out, r]    trainable
r << min(in, out)
```

If `r` is small, the adapter is cheap but has limited capacity. If `r` is large, it approaches full fine-tuning while costs rise.

The intuition is: do not directly modify the original weight matrix; learn a low-rank "correction direction" next to it. The base model retains general ability, and the adapter learns the shift needed for the domain task. The engineering benefits are:

```text
lower training memory
smaller saved artifacts
multiple domain adapters can be switched
rollback is simpler than full-model rollback
```

But this also means the adapter depends on the base model. An adapter is not a complete model, and it cannot be interpreted apart from its corresponding base revision.

### Why LoRA Does Not Break the Base Model at the Start

A common LoRA initialization makes:

```text
A: random initialization
B: initialized to 0
```

So at the start of training:

```text
Delta W = B @ A = 0
```

Model behavior is almost identical to the base model. During training, the adapter gradually learns a low-rank correction direction.

This design matters: LoRA does not overwrite the base model at the beginning. It learns an increment beside frozen original weights, preserving engineering room for rollback and adapter switching.

## 5. PEFT Workflow

Typical code structure:

```python
from peft import LoraConfig, TaskType, get_peft_model
from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained(model_id)
config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=8,
    lora_alpha=16,
    lora_dropout=0.05,
    target_modules=["q_proj", "v_proj"],
    bias="none",
)
model = get_peft_model(model, config)
model.print_trainable_parameters()
```

This chapter does not ask you to memorize every model's module names. It asks you to inspect the model structure. Different architectures may use names such as `q_proj/v_proj`, `c_attn`, or `query_key_value`. Blindly copying `target_modules` can easily fail to inject adapters into the right locations.

Minimal code for checking module names:

```python
for name, module in model.named_modules():
    if "proj" in name or "attn" in name or "mlp" in name:
        print(name, module.__class__.__name__)
```

After injecting LoRA, also check the trainable-parameter ratio and sample target layers to confirm that `lora_A` / `lora_B` actually appear. If `print_trainable_parameters()` reports 0 trainable parameters, or target module names never match, the training script may still finish while the adapter learned nothing.

## 6. Adapter Saving, Loading, and Merging

The main LoRA artifact is the adapter, not a full base model:

```text
base model id + adapter weights + tokenizer + chat template + training config
```

Common operations:

- Save the adapter separately for distribution and multi-task switching.
- Load the same base model and mount the adapter.
- Merge the adapter into base weights for deployment, while losing lightweight switching.
- Keep adapter config, including rank, alpha, target modules, and base model revision.

If you save only the adapter without recording the base model revision, future loading against different base weights may not reproduce behavior.

### merge is not always the right move

Merging an adapter simplifies inference structure by removing an extra adapter layer. The costs are:

1. Multiple adapters can no longer be switched easily.
2. Rollback is less convenient than with a separate adapter.
3. For quantized base models, merge and export formats are easier to get wrong.
4. After merge, the same eval suite must be rerun; you cannot assume behavior is identical.

Teaching projects should keep all of the following:

```text
base model revision
adapter weights
adapter config
unmerged eval report
merged eval report
```

Only then can you tell whether merge affected format, citations, safe refusal, and domain performance.

## 7. QLoRA Boundaries

QLoRA's engineering goal is to reduce GPU memory: the frozen base model is stored in 4-bit quantized form, while backpropagation trains only the LoRA adapter. A common flow is:

```text
load base model in 4-bit
prepare model for k-bit training
inject LoRA adapter
run SFT
save adapter
```

So QLoRA does not mean "training 4-bit weights." It means "quantized frozen base + trainable adapter." The base quantization method, adapter dtype, optimizer, and export format all belong in the report.

QLoRA also does not mean "after the model becomes 4-bit, all computation is free." It still needs activation memory, optimizer state, and management of batch and sequence length. Long context and large batches can still OOM.

QLoRA also introduces quality-verification questions: quantized base plus adapter may not behave exactly like non-quantized training. A teaching project can first run a dry run to verify the flow, then compare on the same eval prompts:

```text
base fp16
LoRA fp16
QLoRA 4-bit + adapter
```

If the QLoRA version has worse format quality or degraded refusal boundaries, record that difference in the evaluation report instead of only reporting memory savings.

## 8. Parameter Count and Memory Estimation

For a linear layer `W(out, in)`, full training uses:

```text
out * in
```

LoRA adds:

```text
r * in + out * r = r * (in + out)
```

If `in = out = 4096`, `r = 8`:

```text
full: 4096 * 4096 = 16,777,216
LoRA: 8 * (4096 + 4096) = 65,536
```

This order-of-magnitude difference explains why adapters are cheaper, while also reminding us that too-small rank limits the task shift the adapter can express.

Parameter-count estimation is the first step in choosing an approach, not the final answer. Real engineering decisions still depend on:

```text
whether the target task is only format/style adaptation or requires complex new ability
whether the training data size supports higher rank
whether deployment needs a merged adapter
whether multiple domain adapters must be maintained
whether evaluation shows low rank is already enough
```

Do not treat LoRA as a universal switch. When data is bad, evaluation is weak, or task boundaries are unclear, parameter-efficient fine-tuning only learns the wrong target more efficiently.

When not to prioritize LoRA:

| Situation | What to do first |
| --- | --- |
| Output lacks evidence or citations | Add RAG and citation-support eval first |
| Sample sources are not traceable | Build data engineering and `source_id` first |
| Task boundaries are unclear | Write intended use, refusal samples, and eval first |
| Knowledge changes frequently | Use RAG first, not adapter-stored knowledge |
| Safety metrics are undefined | Build the evaluation and gates from Chapters 14 and 15 first |

## 9. Required Experiments

- Print trainable-parameter ratio and confirm the base model is frozen.
- Compare `r=4/8/16` on the same tiny SFT data in terms of loss and output changes.
- Inject only attention layers vs more linear layers, comparing parameter count and effect.
- Save the adapter, reload it, and verify behavior on the same prompt.
- QLoRA small-model dry run: record memory, batch size, max length, and OOM boundaries.

## 10. Failure Modes

- Wrong `target_modules`: trainable parameters are 0 or adapters are injected into unexpected layers.
- Forgetting to freeze the base: GPU memory suddenly approaches full fine-tuning.
- Reporting loss without reporting trainable-parameter ratio.
- Adapter and base model revision do not match.
- Assuming multiple adapters can still be switched losslessly after merge.
- QLoRA quantized loading succeeds, but sequence length is still too large and OOMs.
- Believing higher rank is always better: on small data, it may overfit faster.

## 11. Test Acceptance

The tests in this chapter should at least verify:

1. After LoRA injection, trainable parameters contain only adapter parameters.
2. If `target_modules` cannot be found, fail explicitly instead of silently training.
3. Tiny-batch forward output logits shape is unchanged.
4. Before training, the LoRA update is 0 or approximately 0, so base output is not disturbed by the initial adapter.
5. After one training step, frozen base weights remain unchanged and adapter weights change.
6. After saving and reloading the adapter, logits shape and generation flow are usable.
7. After merge, rerun fixed eval prompts and confirm there is no unrecorded behavioral regression.

## 12. Memory Anchors and Boundaries

The most important sentence in this chapter is:

> LoRA does not rewrite the model; it learns a saveable, switchable, rollback-friendly low-rank increment beside a frozen base.

Remember:

1. Common initialization sets `B=0`, so initial `Delta W=0`.
2. `target_modules` must be checked for the specific architecture.
3. Higher rank is not always better; small data may overfit faster.
4. QLoRA is quantized frozen base + trainable adapter.
5. After merge, eval must be rerun.

This chapter does not solve data source and quality. The next chapter moves into domain data engineering.

## 13. Next Chapter

LoRA / QLoRA lowers fine-tuning cost, but it does not answer where training data comes from, how quality is proven, or how risk is controlled. The next chapter covers domain data engineering.
