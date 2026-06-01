---
title: "Chapter 4: Embeddings and Neural Language Models"
description: "The tokenizer has already turned text into token IDs. But token IDs are only identifiers:"
author: LienJack
pubDate: 2026-06-01
locale: en
tags:
  - LLM Learning
  - LLM
  - AI
---
# Chapter 4: Embeddings and Neural Language Models

## 1. The Real Problem This Chapter Solves

The tokenizer has already turned text into token IDs. But token IDs are only identifiers:

```text
合同 -> 17
违约金 -> 42
过高 -> 91
```

`42` is not more "legally meaningful" than `17`. An ID is only a lookup index, not meaning.

So the first question in this chapter is:

> How does the model turn discrete token IDs into trainable vectors?

But turning IDs into vectors is not enough. Look at this sentence:

```text
合同 违约金 过高 ， 它 可能 存在 风险
```

If the model only sees the current token "它" ("it"), it does not know whether "it" refers to "违约金" ("liquidated damages") or "合同" ("contract"). So this chapter has a second question:

> Before we introduce attention, can we use a simple context window so the model looks at more than the current token?

The capability this chapter adds is:

```text
token id -> embedding -> causal context vector -> next-token logits
```

## 2. Chain of Questions

1. Starting point: token IDs are discrete identifiers; their numeric size has no semantic distance.
2. Problem one: one-hot vectors have dimension equal to the vocabulary size, are sparse, and cannot express similarity.
3. New mechanism one: an embedding table maps token IDs to dense vectors.
4. New boundary one: looking up only the current token still does not provide context.
5. Problem two: next-token prediction often depends on several preceding tokens.
6. New mechanism two: use a fixed causal context mixer to aggregate historical tokens.
7. New boundary two: fixed averaging or fixed windows cannot dynamically decide "who to look at."
8. Next chapter's question: how can each position dynamically choose information sources based on the current context? This leads to causal self-attention.

## 3. Concept Card

| Concept | Mathematical object | Shape | Code object | Experimental object |
| --- | --- | --- | --- | --- |
| embedding table | trainable matrix | `(V, D)` | `nn.Embedding` | row update checks |
| token embeddings | lookup result | `(B, T, D)` | `hidden` | norm / cosine |
| causal context | history aggregation vector | `(B, T, D)` | `causal_mean()` / `context_mixer` | no-future test |
| lm head | projection back to vocabulary | `(D, V)` | `nn.Linear` | logits shape |
| pad row | placeholder row that should not train | `(D,)` | `padding_idx` | pad does not update |

## 4. Shape Contract

```text
input_ids: LongTensor[B, T]
attention_mask: LongTensor[B, T]
embedding.weight: FloatTensor[V, D]
hidden: FloatTensor[B, T, D]
context: FloatTensor[B, T, D]
logits: FloatTensor[B, T, V]
labels: LongTensor[B, T]
loss: scalar
```

The input to `nn.Embedding` must be integer IDs. Its output can participate in gradient computation, but `input_ids` themselves are not differentiable.

You can understand embedding as a trainable lookup table:

```text
input_ids[b, t] = 42
hidden[b, t] = embedding.weight[42]
```

During backpropagation, only token rows that appeared in the batch receive gradients. Tokens that did not appear are not updated in this step. This matters: rare tokens learn slowly not because they are "hard to understand," but because they receive less training signal.

`padding_idx` is another easy detail to miss. If the pad token's embedding is updated normally, the model gradually learns some "meaning" for padding, even though padding should only be a placeholder. Later, the attention mask, label mask, and padding embedding must work together to keep pad tokens from contaminating training.

## 5. Minimal Implementation: From Current-Token Models to Causal-Context Models

Start with the weakest version:

```python
class CurrentTokenLM(nn.Module):
    def __init__(self, vocab_size: int, hidden_dim: int, padding_idx: int | None = None) -> None:
        super().__init__()
        self.token_embedding = nn.Embedding(
            vocab_size,
            hidden_dim,
            padding_idx=padding_idx,
        )
        self.lm_head = nn.Linear(hidden_dim, vocab_size)

    def forward(self, input_ids: torch.Tensor) -> torch.Tensor:
        hidden = self.token_embedding(input_ids)   # [B, T, D]
        logits = self.lm_head(hidden)              # [B, T, V]
        return logits
```

This model solves:

```text
id -> vector -> logits
```

But it does not solve context. Each position only sees itself.

To let the model see at least some history, add the simplest possible causal mean mixer:

```python
def causal_mean(hidden: torch.Tensor, attention_mask: torch.Tensor | None = None) -> torch.Tensor:
    """
    hidden: [B, T, D]
    attention_mask: [B, T], 1 means valid token, 0 means pad
    return: [B, T, D]
    """
    bsz, seq_len, dim = hidden.shape
    device = hidden.device

    causal = torch.tril(torch.ones(seq_len, seq_len, device=device))  # [T, T]

    if attention_mask is not None:
        key_mask = attention_mask[:, None, :].float()                 # [B, 1, T]
        weights = causal[None, :, :] * key_mask                       # [B, T, T]
    else:
        weights = causal[None, :, :].expand(bsz, -1, -1)              # [B, T, T]

    denom = weights.sum(dim=-1, keepdim=True).clamp_min(1.0)
    weights = weights / denom

    return weights @ hidden                                           # [B, T, D]
```

Here, `attention_mask` mainly masks keys: valid tokens should not read pad positions as history. If a query position is itself pad, the implementation above may still aggregate preceding valid tokens for it. As long as the labels for those pad queries are set to `-100`, this usually does not affect the loss. But if you use intermediate hidden states for visualization, pooling, or downstream modules, it is better to also zero out pad query outputs before returning.

Then the model becomes:

```python
class CausalMeanLanguageModel(nn.Module):
    def __init__(self, vocab_size: int, hidden_dim: int, padding_idx: int | None = None) -> None:
        super().__init__()
        self.token_embedding = nn.Embedding(
            vocab_size,
            hidden_dim,
            padding_idx=padding_idx,
        )
        self.mixer = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.GELU(),
            nn.Linear(hidden_dim, hidden_dim),
        )
        self.lm_head = nn.Linear(hidden_dim, vocab_size)

    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor | None = None,
    ) -> torch.Tensor:
        hidden = self.token_embedding(input_ids)              # [B, T, D]
        context = causal_mean(hidden, attention_mask)         # [B, T, D]
        context = self.mixer(context)                         # [B, T, D]
        logits = self.lm_head(context)                        # [B, T, V]
        return logits
```

This is still not attention. It only averages historical tokens. Its value is that it exposes an intermediate step:

```text
current-token model: sees only itself
causal mean model: sees history, but each history position has a fixed weight
attention model: sees history and dynamically decides which positions to use
```

This chapter also does not formally solve position yet. Causal mean accumulates history in order, so it uses order implicitly. But a real GPT still needs position embeddings or mechanisms such as RoPE so the model can distinguish "the same token at position 2" from "the same token at position 20." That gap is filled in Chapter 7, Mini GPT.

### Important Boundary: Context Aggregation Must Be Causal

A common wrong implementation is:

```python
context = hidden.mean(dim=1, keepdim=True).expand_as(hidden)
```

This lets position 1 see information from position 5. Training loss may look good, but the model is peeking into the future.

Context aggregation in a language model must satisfy:

```text
the output at position i can only depend on tokens at positions <= i
```

So the tests in this chapter cannot only check shapes. They must also check:

```text
changing a future token should not change logits at past positions.
```

## 6. Required Experiments

- Current-token LM vs causal-mean LM: compare tiny-corpus overfitting speed.
- Check `embedding.weight.grad`: only token rows that appeared should have gradients.
- Check `padding_idx`: the pad embedding row should not update.
- Modify a future token: verify that past-position logits do not change.
- Intentionally use non-causal mean: observe artificially low training loss but worse generation.
- Visualize cosine similarity for several token embeddings and compare before/after training.

## 7. Failure Modes

- Vocabulary size does not match the tokenizer: embedding lookup goes out of bounds.
- `padding_idx` is not set: the pad embedding is trained into having "meaning."
- Only writing a position-wise MLP: the model looks like a neural LM but has no context ability.
- Using full-sequence mean pooling: the model peeks into the future and gets artificially low training loss.
- `hidden_dim` is too small: capacity is insufficient, and even a tiny corpus is hard to overfit.
- Assuming embeddings come with meaning: meaning comes from the training objective and data, not from ID order.

## 8. Test Acceptance

The tests in this chapter should at least verify:

1. embedding output shape is `(B, T, D)`.
2. logits output shape is `(B, T, V)`.
3. After one training step, embeddings for tokens that appeared are updated.
4. After setting `padding_idx`, the pad token embedding is not updated.
5. The causal context mixer output shape is correct.
6. Modifying a future token does not change past-position logits.
7. If non-causal pooling is intentionally used, the no-future test should fail.
8. Loss can decrease on a tiny corpus.

## 9. Memory Anchors and Boundaries

This chapter solves two problems:

1. Token IDs have no meaning; the embedding table turns IDs into trainable vectors.
2. The current token is not enough; the causal context mixer lets the model see at least some history.

But this chapter does not solve:

```text
How should the importance of different historical tokens change dynamically?
```

Fixed averaging mixes "合同," "违约金," and "它" together. But when the model sees "它," the token it may need to look back to most is "违约金." The next chapter's attention mechanism exists to solve this question of "who to look at dynamically."
