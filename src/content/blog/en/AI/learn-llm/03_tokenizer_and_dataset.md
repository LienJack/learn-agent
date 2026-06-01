---
title: "Chapter 3: Tokenizers and Dataset Construction"
description: "A language model can only process integer IDs, but users, documents, and training sets are text. A tokenizer is not a \"preprocessing utility.\" It d..."
author: LienJack
pubDate: 2026-06-01
locale: en
tags:
  - LLM Learning
  - LLM
  - AI
---
# Chapter 3: Tokenizers and Dataset Construction

## 1. The Real Problem This Chapter Solves

A language model can only process integer IDs, but users, documents, and training sets are text. A tokenizer is not a "preprocessing utility." It defines the model's input space: vocabulary size, how long words are split, how unknown characters are handled, and whether padding enters the loss.

Core question:

```text
How do we turn text into stable token IDs and build datasets reusable for both language modeling and SFT?
```

## 2. Chain of Questions

1. Strings cannot be fed directly into the model.
2. Character-level tokenizers are simple, but sequences become long and semantics are fragmented.
3. Word-level tokenizers are easy to understand, but open vocabularies create many OOV cases.
4. Subword methods compromise between character and word levels: common fragments are merged, rare words can still be decomposed.
5. Batches need padding, truncation, and attention masks.
6. Next chapter's question: token IDs are only numbers, so how does the model learn updatable semantic representations from them?

## 3. Concept Card

| Concept | Mathematical object | Shape | Code object | Experimental object |
| --- | --- | --- | --- | --- |
| vocab | token-to-ID mapping | `V` | `token_to_id` | check special tokens |
| encode | text to IDs | `(T,)` | `encode(text)` | round trip |
| decode | IDs to text | string | `decode(ids)` | reversibility |
| attention mask | valid-position marker | `(B, T)` | `attention_mask` | padding excluded |
| labels | LM supervision target | `(B, T)` | `labels` | pad positions set to `-100` |

## 4. Minimal Tokenizer Contract

A teaching tokenizer needs at least:

```text
special tokens: <pad>, <unk>, <bos>, <eos>
encode(text, add_special_tokens=True) -> list[int]
decode(ids, skip_special_tokens=True) -> str
batch_encode(texts, max_length, padding, truncation) -> input_ids, attention_mask
```

For LM datasets, we also need to cut chunks from a continuous token stream:

```text
corpus_ids: LongTensor[N]
sample: input_ids = corpus_ids[i : i + block_size]
        labels    = corpus_ids[i + 1 : i + block_size + 1]
```

For SFT datasets, we must also distinguish which positions participate in the loss: usually the user/system portions are context only, and the assistant response is the label.

The tokenizer is the protocol between the model and the world of text. Training, evaluation, inference, and deployment must use the same protocol. Otherwise, the same sentence becomes a different ID sequence and the model's behavior changes. This matters especially for chat models: the boundary tokens for system / user / assistant are not decoration; they are role signals the model learns to read.

Special tokens should be fixed from the start:

```text
<pad>: batch padding; should not participate in loss
<unk>: unknown character or unknown fragment
<bos>: beginning of sequence
<eos>: end of sequence; stop signal for generation
```

Without `<eos>`, generation can only stop by hitting a maximum length. If `<pad>` participates in the loss, the model is trained to predict padding at many positions. What looks like a data-processing detail directly contaminates the training objective.

### attention mask and label mask are not the same

Beginners often mix up two masks:

```text
attention_mask: whether this position can be seen by the model
labels == -100: whether this position contributes to the loss
```

For example, after batch padding:

```text
input_ids:      [合同, 违约金, <eos>, <pad>, <pad>]
attention_mask: [1,    1,      1,     0,     0]
labels:         [违约金, <eos>, -100, -100, -100]
```

`attention_mask=0` tells the model that pad positions are just padding and should not be treated as context.
`labels=-100` tells the loss function not to compute supervision for that position.

You can remember their responsibilities with this table:

| Mask | What it controls | Who uses it | What goes wrong if it is wrong |
| --- | --- | --- | --- |
| `attention_mask` | whether the model can treat the position as context | attention / model forward | pad contaminates context |
| `labels == -100` | whether the loss supervises the position | loss function | pad, user, or system text is trained as the target |

SFT introduces another kind of label mask:

```text
system / user:      context only, no loss
assistant answer:   target answer, included in loss
```

So a dataset should not return only `input_ids`. At minimum, it should return:

```text
input_ids
attention_mask
labels
source_id
```

Later RAG, distillation, and evaluation will need `source_id` to trace sample origins and avoid data leakage.

Without `source_id`, debugging becomes guesswork: an eval sample about "missing liability cap" is answered very well, but you cannot tell whether it came from the same contract template, whether it entered training, whether it was de-identified, or whether it is allowed in a release report. `source_id` is not metadata fussiness. It is the lowest-cost evidence for data-leakage and compliance boundaries.

## 5. Why Subwords Are Needed: Character-Level Is Too Long, Word-Level Is Too Brittle

Do not rush to memorize the definitions of BPE or WordPiece. Start from the raw difficulty.

Suppose the corpus contains:

```text
合同违约责任过重
```

A character-level tokenizer produces:

```text
合 / 同 / 违 / 约 / 责 / 任 / 过 / 重
```

It almost never OOVs, because any Chinese character can enter the vocabulary. But sequences become longer, and the model must process longer context.

A word-level tokenizer might produce:

```text
合同违约责任 / 过重
```

The sequence is shorter, but new words, typos, and domain terms easily become `<unk>`.

Subword methods try to compromise:

```text
合同 / 违约 / 责任 / 过重
```

Common fragments can be merged, while rare words can still be split apart. This avoids character-level length while avoiding word-level collapse on unknown words.

BPE and WordPiece are both common subword methods, but their merge criteria are not identical. This chapter only focuses on the shared intuition:

> Subwords work not because they "understand meaning," but because they make an engineering trade-off between open vocabulary and sequence length.

For example, "合同违约责任" can be split as:

```text
字符级: 合 / 同 / 违 / 约 / 责 / 任
词级: 合同违约责任
子词级: 合同 / 违约 / 责任
```

Which one is best depends on the corpus, model, and task. This course first implements a simple tokenizer so the contracts for encode, decode, padding, masks, and labels are visible. Once you understand the contract, replacing it with a real tokenizer becomes much less likely to turn into blaming the library.

Dataset construction must also keep provenance. Later SFT, RAG, distillation, and evaluation will all ask: where did this sample come from, does it leak into eval, and does it have risk tags? If the data object starts with only `input_ids`, auditing becomes much harder later.

## 6. Required Experiments

- Compare token counts from a character-level tokenizer and a simple BPE tokenizer on the same text.
- Set `max_length` too small and observe how truncation cuts off the answer.
- Compare loss when padding enters the loss versus when pad labels are set to `-100`.
- Construct an SFT sample and verify that positions outside the assistant response do not contribute to loss.

## 7. Failure Modes

- Training and inference use different tokenizers: the same sentence gets different IDs, making model behavior impossible to explain.
- Forgetting `<eos>`: the generation loop does not know when to stop.
- Padding tokens are not masked: the model learns to output pad.
- Segmenting Chinese by spaces: many sentences become a single unknown word.
- Changing the chat template makes old data unreproducible.

## 8. Test Acceptance

The tests in this chapter should at least verify:

1. Special token IDs are fixed and do not conflict.
2. `decode(encode(text))` is approximately reversible on the basic character set.
3. After batch padding, `input_ids` and `attention_mask` have matching shapes.
4. LM dataset `input_ids` and `labels` are shifted correctly.
5. Non-assistant labels in an SFT dataset are set to `-100`.
6. Tokenizer mismatch changes the ID sequence for the same sentence and should be exposed by a test.

## 9. Memory Anchors and Boundaries

The most important sentence in this chapter is:

> A tokenizer is not a preprocessing utility. It is the protocol for the model's input space.

Remember:

1. Training, evaluation, and inference must use the same tokenizer.
2. `<pad>` should not participate in loss.
3. `<eos>` is an important stop signal for generation.
4. `attention_mask` controls what can be seen; `labels=-100` controls what counts toward loss.
5. A chat template is a role-boundary protocol, not string decoration.

This chapter does not solve the semantic problem of token IDs. `42` is only an ID; it is not naturally closer to some word than `41` is. The next chapter lets the model learn embeddings.

## 10. Next Chapter

Text has now become token IDs. But IDs are only discrete numbers; they have no distance or meaning by themselves. The next chapter uses an embedding table to map discrete tokens into trainable vectors.
