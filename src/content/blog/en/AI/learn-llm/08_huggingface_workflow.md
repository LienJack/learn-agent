---
title: "Chapter 8: Hugging Face Workflow"
description: "Chapter 7 implemented Mini GPT from scratch so we could understand the internal structure of a language model. Real projects usually do not start t..."
author: LienJack
pubDate: 2026-06-01
locale: en
tags:
  - LLM Learning
  - LLM
  - AI
---
# Chapter 8: Hugging Face Workflow

## 1. The Real Problem This Chapter Solves

Chapter 7 implemented Mini GPT from scratch so we could understand the internal structure of a language model. Real projects usually do not start training from random initialization. They reuse open-source models, tokenizers, configuration files, weight formats, and training toolchains.

The capability this chapter adds is the move from "I understand the GPT structure" to "I can reliably load, run inference, minimally fine-tune, save, and reproduce experiments."

From-scratch implementation makes the structure visible. Hugging Face lets us reuse the ecosystem, but it also hides mistakes inside configuration, tokenizers, revisions, and checkpoints.

Core question:

```text
In real projects, we cannot train from scratch every time. How do we use open-source models without losing the engineering judgment built in earlier chapters?
```

## 2. Chain of Questions

1. Training from scratch proves the structure works, but the required data, compute, and time are unrealistic.
2. Hugging Face Hub provides model weights, configs, tokenizers, and processors.
3. `AutoTokenizer` and `AutoModelForCausalLM` decouple code from specific architectures.
4. `model.generate()` reuses the standard autoregressive generation flow, but prompts, sampling, and stopping conditions still need control.
5. `datasets` and `Trainer` organize data processing, training arguments, evaluation, and saving into a reproducible workflow.
6. Accelerate handles devices, mixed precision, and distributed-training entry points, but it does not replace experimental design.
7. Next chapter's question: once a model is loaded, how do we turn it from "continues text" into "answers instructions"?

## 3. Concept Card

| Concept | Mathematical object | Shape | Code object | Experimental object |
| --- | --- | --- | --- | --- |
| pretrained config | architecture hyperparameters | JSON | `AutoConfig` | hidden size / layers |
| tokenizer | text to IDs | `(B, T)` | `AutoTokenizer` | chat template |
| causal LM | next-token model | logits `(B, T, V)` | `AutoModelForCausalLM` | prompt inference |
| dataset row | training sample | dict | `datasets.Dataset` | map / split |
| trainer state | training process | checkpoint | `Trainer` | save / resume |
| generated ids | output tokens | `(B, T+N)` | `model.generate` | decode |

### Mapping Mini GPT to Hugging Face

Hugging Face does not change the model contract from Chapter 7. It standardizes the objects:

| Mini GPT object | Hugging Face object | Checks |
| --- | --- | --- |
| `MiniGPTConfig` | `AutoConfig` | whether hidden size, layers, and vocab size match |
| simple tokenizer | `AutoTokenizer` | special tokens, chat template, pad token |
| `MiniGPT.forward` | `AutoModelForCausalLM.forward` | `input_ids`, `attention_mask`, `labels` |
| handwritten `generate()` | `model.generate()` | max length, sampling, stop tokens |
| `save_checkpoint()` | `save_pretrained()` | whether model, tokenizer, and config are saved in the same directory |
| training history | `TrainerState` / logs | whether seed, step, and eval report are reproducible |

This table is the bridge from Chapter 7 to Chapter 8. Implementing from scratch was not a toy exercise; it taught you what contract each object in the open-source toolchain is supposed to carry.

## 4. Minimal Inference Workflow

When loading a model, make the tokenizer, model, device, dtype, and trust policy explicit:

```python
from transformers import AutoModelForCausalLM, AutoTokenizer

model_id = "sshleifer/tiny-gpt2"
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(model_id)

prompt = "Large language models learn to"
inputs = tokenizer(prompt, return_tensors="pt")
outputs = model.generate(
    **inputs,
    max_new_tokens=32,
    do_sample=False,
)
text = tokenizer.decode(outputs[0], skip_special_tokens=True)
```

In the teaching stage, prefer small models to verify the workflow. Do not start by downloading a large model, or ordinary mistakes will be buried under GPU memory, network, and permission problems.

For production or reproducible experiments, do not rely on a floating model ID alone. Pin the revision whenever possible:

```python
revision = "commit_hash_or_tag"
tokenizer = AutoTokenizer.from_pretrained(model_id, revision=revision)
model = AutoModelForCausalLM.from_pretrained(model_id, revision=revision)
```

Otherwise, the same model ID may point to different weights, tokenizers, or configs in the future, and old experiments cannot be reproduced.

The most important change in the Hugging Face workflow is that many previously handwritten objects become standard interfaces:

```text
config: model structure and hyperparameters
tokenizer: text protocol
model: weights and forward
generation_config: generation strategy
trainer_state: training-process record
```

This makes onboarding faster, but it also makes errors less visible. For example, if the tokenizer and model come from different directories, the code may still run, but token IDs no longer match embedding rows, and the output becomes impossible to explain. So the point of this chapter is not to memorize APIs. It is to transfer the shape, mask, tokenizer, and checkpoint judgment built earlier into the open-source model ecosystem.

### tokenizer and model vocab must align

One of the most hidden Hugging Face mistakes is that both tokenizer and model load successfully, but their vocabularies do not actually match.

Check it like this:

```python
num_tokenizer_tokens = len(tokenizer)
num_embedding_rows = model.get_input_embeddings().weight.size(0)

assert num_tokenizer_tokens <= num_embedding_rows
assert model.get_output_embeddings().weight.size(0) == model.config.vocab_size
```

If you add special tokens, for example:

```python
tokenizer.add_special_tokens({"pad_token": "<pad>"})
```

you must resize the model embeddings as well:

```python
model.resize_token_embeddings(len(tokenizer))
```

Otherwise, the new token has no corresponding embedding row, and training and inference become impossible to interpret.

For many causal LMs that do not originally have a `pad_token`, a teaching workflow can temporarily use:

```python
tokenizer.pad_token = tokenizer.eos_token
```

But understand that this is only an engineering compromise. It fixes batch-padding errors; it does not mean `<pad>` and `<eos>` are semantically the same. During real training, pad positions must still be excluded from the loss.

### `trust_remote_code` is a safety boundary

Some models require:

```python
trust_remote_code=True
```

This means custom Python code from the model repository will be executed during loading. Teaching projects should keep it off by default unless you explicitly know the model source, code contents, and risk.

## 5. Chat Template

Instruction models do not consume arbitrarily concatenated strings. Different models have different conversation formats; system, user, and assistant boundary tokens may differ. Prefer the tokenizer's built-in chat template:

```python
messages = [
    {"role": "system", "content": "你是谨慎的中文技术助教。"},
    {"role": "user", "content": "解释什么是 causal mask。"},
]

prompt = tokenizer.apply_chat_template(
    messages,
    tokenize=False,
    add_generation_prompt=True,
)
```

If you first call `apply_chat_template(tokenize=False)` and then call the tokenizer, avoid adding special tokens twice. Templates, special tokens, and label masks are key boundaries in the SFT chapter.

## 6. Minimal Fine-Tuning Workflow

Minimal fine-tuning is not "running a Trainer demo." It means fixing the following contract:

```text
raw examples
  -> format text / messages
  -> tokenize
  -> build labels
  -> train / val split
  -> TrainingArguments
  -> Trainer.train()
  -> evaluate
  -> save_pretrained()
```

For causal LM training, common data fields are:

```text
input_ids: LongTensor[B, T]
attention_mask: LongTensor[B, T]
labels: LongTensor[B, T]
```

For ordinary continuation tasks, `labels` are usually a copy of `input_ids`, with padding positions changed to `-100`. For SFT, user/system positions should usually also be changed to `-100`; otherwise, the model is trained to repeat the user's question.

This chapter only requires you to check ordinary causal-LM `labels` and pad masks. Assistant-only label masks, chat-template spans, and instruction-sample quality are handled separately in Chapter 9 so HF object learning and the SFT objective do not get mixed together.

Trainer helps organize the training loop, but it cannot automatically judge whether the data objective is correct. You still need to manually inspect a batch:

```text
decode input_ids: what the model actually sees
decode labels != -100: what the model is actually asked to learn
attention_mask: whether padding is masked
```

This check is simple, but it catches most fine-tuning accidents early: duplicated templates, truncated answers, padding entering loss, user content contributing to loss, and special tokens added twice.

## 7. Saving and Loading

A reproducible Hugging Face experiment saves at least:

- model weights: `model.save_pretrained(output_dir)` or `trainer.save_model(output_dir)`.
- tokenizer: `tokenizer.save_pretrained(output_dir)`.
- training args: learning rate, batch size, epochs, gradient accumulation, seed.
- dataset version: raw data path, cleaning script hash, split seed.
- eval report: comparison on the same prompts / eval set before and after training.

When loading, restore model and tokenizer from the same directory:

```python
tokenizer = AutoTokenizer.from_pretrained(output_dir)
model = AutoModelForCausalLM.from_pretrained(output_dir)
```

Saving weights without saving the tokenizer means the same text can become different token IDs, making evaluation unreproducible.

## 8. Where Accelerate Fits

Accelerate is not a new model theory. It is an abstraction for devices and distributed training. It helps Trainer or custom training loops handle multi-GPU, mixed precision, FSDP / DeepSpeed, and related engineering concerns.

In the teaching stage, first make the single-machine CPU / single-GPU flow correct, then introduce:

- `accelerate config`
- `accelerate launch`
- mixed precision
- gradient accumulation
- checkpoint resume

Do not use Accelerate to hide shape errors, label errors, or data leakage. Distributed training only amplifies small mistakes.

The practical learning order should be:

```text
run data and shape correctly on CPU / tiny model
-> run minimal training on one GPU
-> make save, load, and evaluation reproducible
-> then introduce mixed precision / accelerate / multi-GPU
```

This way, when you encounter OOM, device mismatch, or distributed-checkpoint issues, you know the basic training objective is already correct and are not debugging ten categories of problems at once.

## 9. Required Experiments

- Load a tiny causal LM and verify the full inference chain from prompt to generated text.
- Compare greedy, temperature, and top-k outputs on the same prompt.
- Build a tiny text dataset of 20-100 examples and run one minimal Trainer fine-tuning job.
- Save model and tokenizer, reload them, and verify that the same prompt has usable logits shape and generation flow.
- Manually record output changes on the same prompts before and after training; do not use "loss decreased" as a substitute for behavioral observation.
- After adding a special token, run `resize_token_embeddings(len(tokenizer))` and verify that logits vocab dimension matches the number of embedding rows.
- Pin revision and generation config, then verify reproducibility under the same model version and greedy settings.

## 10. Failure Modes

- model and tokenizer come from different directories: token IDs do not match embeddings.
- `pad_token` is not set: batch padding or the data collator errors.
- chat template is handwritten incorrectly: role boundaries do not match the pretraining format.
- `max_length` truncates key answer content: the sample looks normal, but the label is incomplete.
- only train loss is inspected: the model may memorize format without improving the target ability.
- checkpoint is saved without dataset version: the experiment cannot be reproduced.
- special tokens are added without resizing embeddings: the new tokens cannot train correctly and may even go out of bounds.
- `trust_remote_code=True` is enabled by default: model loading becomes unreviewed code execution.

## 11. Test Acceptance

The tests in this chapter should at least verify:

1. tokenizer output contains `input_ids` and `attention_mask`, with matching shapes.
2. causal LM forward outputs logits, and `logits.size(-1) == model.get_output_embeddings().weight.size(0)`.
3. `len(tokenizer) <= model.get_input_embeddings().weight.size(0)`; if special tokens are added, tests should verify that `resize_token_embeddings(len(tokenizer))` was run.
4. the data collator changes pad-position labels to `-100`.
5. after `save_pretrained()`, model and tokenizer can be reloaded from the local directory.
6. under the same seed and greedy generation config, a short prompt produces reproducible output.

## 12. Memory Anchors and Boundaries

The most important sentence in this chapter is:

> The Hugging Face workflow does not think through engineering contracts for you; it puts the model, tokenizer, config, training state, and generation strategy behind standard interfaces.

Remember:

1. model, tokenizer, config, and revision should be fixed as a group.
2. after adding tokens to the tokenizer, resize the model embeddings.
3. pad token can temporarily reuse eos, but pad positions must not enter the loss.
4. `trust_remote_code=True` is a code-execution boundary.
5. Trainer organizes training; it does not check labels, leakage, or evaluation for you.

This chapter does not solve "answering instructions." The next chapter moves into SFT.

## 13. Next Chapter

This chapter solves "how to reuse open-source models." But the objective of an ordinary causal LM is still continuation. The next chapter covers SFT: how to train a model to follow system / user / assistant instruction formats.
