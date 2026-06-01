---
title: "Chapter 7: Implementing Mini GPT from Scratch"
description: "The previous chapters implemented the LM objective, tokenizer, embeddings, attention, and blocks separately. This chapter combines them into a deco..."
author: LienJack
pubDate: 2026-06-01
locale: en
tags:
  - LLM Learning
  - LLM
  - AI
---
# Chapter 7: Implementing Mini GPT from Scratch

## 1. The Real Problem This Chapter Solves

The previous chapters implemented the LM objective, tokenizer, embeddings, attention, and blocks separately. This chapter combines them into a decoder-only language model and makes it train, save, load, and generate.

But connecting blocks so that forward works is not the same as having a reproducible GPT. A usable Mini GPT must also explain how input text becomes IDs, how positions are encoded, how context is cropped during generation, and whether a checkpoint is sufficient to restore inference or continue training.

Core question:

```text
Once all local mechanisms are connected, what engineering contracts does a minimal GPT still need?
```

## 2. Chain of Questions

1. The LM objective defines the supervision signal.
2. The tokenizer turns text into IDs.
3. Embedding and position embeddings provide input representations.
4. Transformer blocks perform causal context mixing.
5. The LM head outputs next-token logits.
6. A checkpoint does not only save weights; it also saves configuration, tokenizer, generation config, and necessary training state.
7. Next chapter's question: training from scratch is too expensive in real projects, so how do we reuse open-source model workflows?

## 3. Concept Card

| Concept | Mathematical object | Shape | Code object | Experimental object |
| --- | --- | --- | --- | --- |
| token embedding | token representation | `(V, D)` | `tok_emb` | parameter count |
| position embedding | position representation | `(T, D)` | `pos_emb` | context length |
| blocks | stacked transformations | `(B, T, D)` | `nn.ModuleList` | layers vs loss |
| lm head | vocab projection | `(D, V)` | `lm_head` | logits |
| checkpoint | state snapshot | file | `save/load` | reproducible generation |

This chapter closes the loop from Chapters 1-6:

| Source chapter | Part | Location in Mini GPT |
| --- | --- | --- |
| Chapter 1 | training loop | `loss.backward()` / `optimizer.step()` |
| Chapter 2 | next-token loss | `labels` / cross entropy |
| Chapter 3 | tokenizer / dataset | `input_ids` / `attention_mask` |
| Chapter 4 | token embedding | `tok_emb(input_ids)` |
| Chapter 5 | causal attention | mask inside each block |
| Chapter 6 | transformer block | `nn.ModuleList(blocks)` |

## 4. Shape Contract

```text
input_ids: LongTensor[B, T], T <= block_size
positions: LongTensor[T]
hidden: FloatTensor[B, T, D]
logits: FloatTensor[B, T, V]
labels: LongTensor[B, T]
loss: scalar
```

During generation, each step only uses logits at the last position:

```text
next_logits = logits[:, -1, :]
next_id = sample(next_logits)
input_ids = cat(input_ids, next_id)
```

Mini GPT's forward pass processes the whole training sequence at once, but `generate` calls the model in a loop:

```text
prompt ids
-> forward
-> take logits from the last position
-> sample next token
-> append
-> if block_size is exceeded, crop the left history
-> repeat
```

This is autoregressive generation. It is slow but general, because every new token depends on all previously generated context. The prefill, decode, and KV cache techniques in later deployment chapters are essentially performance optimizations around this loop.

## 5. Minimal Implementation Structure

This chapter's code should include at least:

- `MiniGPTConfig`
- `MiniGPT`
- `train_mini_gpt.py`
- `generate_text.py`
- `save_checkpoint(path, model, config, tokenizer)`
- `load_checkpoint(path)`

The configuration must save `vocab_size`, `block_size`, `hidden_dim`, `num_layers`, `num_heads`, and `dropout`; otherwise, the checkpoint cannot be loaded reliably.

A checkpoint is not just a saved `state_dict`. A reproducible checkpoint needs at least:

```text
model_config
model_state_dict
tokenizer vocab / special tokens
training step
random seed or generation config
```

A teaching-version `checkpoint.json` might look like:

```json
{
  "model_config": {
    "vocab_size": 128,
    "block_size": 64,
    "hidden_dim": 128,
    "num_layers": 2,
    "num_heads": 4,
    "dropout": 0.1
  },
  "tokenizer": {
    "type": "simple_char",
    "special_tokens": ["<pad>", "<unk>", "<bos>", "<eos>"]
  },
  "training": {
    "global_step": 1200,
    "seed": 42,
    "best_val_loss": 1.73
  },
  "generation_config": {
    "temperature": 0.8,
    "top_k": 20,
    "max_new_tokens": 64
  }
}
```

If you only save weights, you may load them with the wrong vocabulary size, block size, or tokenizer and get a model that appears to run but behaves inconsistently. Starting in Chapter 7, model engineering moves from "writing modules" to "saving and reproducing runs."

### Two Kinds of Checkpoints: Inference Recovery and Training Recovery

If a checkpoint is only for inference, it should at least save:

```text
model_config
model_state_dict
tokenizer vocab / special tokens
generation_config
```

But if the checkpoint must support training recovery, model weights alone are not enough. It also needs:

```text
optimizer_state_dict
scheduler_state_dict
global_step / epoch
random seed
torch / cuda / numpy / python RNG state
best validation metric
training config
```

Otherwise, you can "load the model" but cannot resume the same training trajectory. This is the boundary where Mini GPT moves from a toy model into an engineering model: if a model file cannot explain what data, configuration, tokenizer, and random state produced it, it is difficult to reproduce or audit.

Position embeddings also deserve special attention. Token embeddings tell the model "what token this is"; position embeddings tell it "where it is in the sequence." If a prompt is longer than `block_size`, position IDs go out of range. During generation, you must crop context or use a position mechanism that supports longer context.

## 6. Required Experiments

- Tiny-corpus overfit: prove that the whole GPT pipeline can memorize a very small corpus.
- Checkpoint round-trip: after saving and loading, the same prompt should produce the same logits.
- Context crop: when the prompt exceeds `block_size`, keep only the most recent context.
- temperature / top-k: compare generation quality and diversity.
- Remove position embeddings as a control: observe whether the model struggles to distinguish the same token at different positions.
- train/eval generation comparison: with dropout, greedy generation should be reproducible under `eval()`.
- Resume training: save optimizer / scheduler / RNG and continue training, comparing with a checkpoint that does not save those states.

A good tiny-corpus experiment is not about producing beautiful text. It verifies that the entire pipeline is intact:

```text
tokenizer -> dataset -> model -> loss -> backward -> optimizer -> checkpoint -> generate
```

If a tiny corpus cannot be overfit, first suspect data offset, masks, learning rate, model capacity, or the training loop, not "the model is not large enough." This diagnostic habit continues through SFT, LoRA, and domain projects.

## 7. Failure Modes

- Position IDs exceed `block_size`: embedding lookup goes out of range.
- Weights are saved without config: loading uses an inconsistent structure.
- Tokenizer version changes: the same prompt gets different IDs.
- Training uses teacher forcing, generation is autoregressive, and the two distributions differ.
- Only `state_dict` is saved: inference can load, but the same training trajectory cannot be restored.
- Forgetting `model.eval()` before generation: dropout makes even greedy generation unstable.

## 8. Test Acceptance

The tests in this chapter should at least verify:

1. `MiniGPT(input_ids, labels)` returns logits and loss.
2. logits shape is `(B, T, V)`.
3. the causal mask prevents future-token leakage.
4. after checkpoint loading, parameters are identical item by item.
5. training-recovery checkpoints contain optimizer, scheduler, global step, and RNG state.
6. `generate()` output does not exceed the requested length and can stop on `<eos>`.

## 9. Memory Anchors and Boundaries

The most important sentence in this chapter is:

> Mini GPT is not just a chain of blocks; it is a complete language-model contract from tokenizer to checkpoint to generation.

Remember:

1. token embeddings say "what token this is."
2. position embeddings say "where it is."
3. blocks perform causal context mixing.
4. the LM head projects hidden states back to the vocabulary.
5. generate is an autoregressive loop, not one forward pass that outputs a full sentence.
6. checkpoints must save the model, tokenizer, configuration, and necessary training state.

This chapter does not solve model reuse and ecosystem tooling in real projects. The next chapter moves into the Hugging Face workflow.

## 10. Next Chapter

Implementing from scratch teaches the structure, but real projects usually start from Hugging Face models. The next chapter covers how to load, run inference, fine-tune, and save open-source models.
