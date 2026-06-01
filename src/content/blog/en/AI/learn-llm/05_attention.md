---
title: "Chapter 5: Causal Self-Attention"
description: "The causal mean model from Chapter 4 can already look at history, but it has an obvious limitation:"
author: LienJack
pubDate: 2026-06-01
locale: en
tags:
  - LLM Learning
  - LLM
  - AI
---
# Chapter 5: Causal Self-Attention

## 1. The Real Problem This Chapter Solves

The causal mean model from Chapter 4 can already look at history, but it has an obvious limitation:

> It mixes historical positions by a fixed rule and does not know which earlier token the current token should really look at.

Consider this sentence:

```text
合同 违约金 过高 ， 它 可能 存在 风险
```

When predicting the token after "可能" ("may"), "它" ("it") should look back more strongly to "违约金" ("liquidated damages") than average over "合同," "过高," and punctuation.

So the real problem in this chapter is:

```text
How does each token in a sentence dynamically decide which historical tokens to look at?
```

That is why causal self-attention exists.

## 2. Chain of Questions

1. Starting point: fixed pooling can see history, but it cannot dynamically select by context.
2. Problem: different tokens need to attend to different historical positions in different sentences.
3. New mechanism: each position produces a query, key, and value.
4. The query is dotted with keys to produce scores for "which positions should this position look at?"
5. Softmax turns scores into attention weights.
6. Values are weighted and summed to produce a context representation.
7. The causal mask prevents the current position from seeing future tokens.
8. New boundary: single-head attention is only one information-mixing operation. A full LLM block still needs multiple heads, residuals, normalization, and an FFN.

## 3. Concept Card

| Concept | Mathematical object | Shape | Code object | Experimental object |
| --- | --- | --- | --- | --- |
| Q | query vector | `(B, T, H)` | `q_proj(x)` | dot-product scores |
| K | queried vector | `(B, T, H)` | `k_proj(x)` | pre-mask logits |
| V | content to aggregate | `(B, T, H)` | `v_proj(x)` | weighted sum |
| weights | attention distribution | `(B, T, T)` | `softmax(scores)` | visualization |
| causal mask | lower-triangular constraint | `(T, T)` | `torch.tril` | future weights are 0 |

## 4. Shape Contract

```text
x:       FloatTensor[B, T, D]
q,k,v:   FloatTensor[B, T, H]
scores:  FloatTensor[B, T, T] = q @ k.transpose(-2, -1) / sqrt(H)
mask:    BoolTensor[T, T]
weights: FloatTensor[B, T, T]
out:     FloatTensor[B, T, H]
```

For a causal LM, `weights[:, i, j]` must be 0 whenever `j > i`. Otherwise, training lets the model peek at the answer, the loss becomes artificially low, and generation collapses.

The key idea of attention is not "all tokens look at one another." It is that each position dynamically chooses information sources according to its current representation. The same token can attend to different positions in different sentences:

```text
这份合同中的违约金过高，它可能...
这份报告中的指标过高，它可能...
```

The two instances of "它" need to look back to different nouns. Fixed pooling struggles to express that conditional selection, while query-key dot products allow each position to produce its own retrieval distribution.

The scaling factor `sqrt(H)` is not mathematical decoration. As head dimension grows, dot-product variance grows. Without scaling, softmax can become too sharp, the model may focus on a single position too early, and gradients become less stable.

## 5. Minimal Implementation

```python
def scaled_dot_product_attention(q, k, v, causal: bool = True):
    head_dim = q.size(-1)
    scores = q @ k.transpose(-2, -1) / head_dim**0.5
    if causal:
        t = q.size(-2)
        mask = torch.tril(torch.ones(t, t, device=q.device, dtype=torch.bool))
        scores = scores.masked_fill(~mask, float("-inf"))
    weights = torch.softmax(scores, dim=-1)
    return weights @ v, weights
```

This function is the core of later multi-head attention. First implement single-head attention correctly; then introduce batch, heads, and projections.

The causal mask is the key boundary between language models and ordinary sequence encoders. Standard self-attention can let every position see the whole sentence. Causal self-attention can only see the current and previous positions. If you forget the mask during training, the model directly sees the answer token. Loss becomes abnormally low, but future tokens do not exist during generation, and the model suddenly performs poorly.

A useful teaching experiment is to run both versions intentionally:

```text
with mask: loss is more honest, generation is more stable
without mask: training loss is artificially low, generation exposes the problem
```

This is more convincing than simply saying "do not peek into the future." All later decoder-only models are built on this constraint.

### Keep Causal Mask and Padding Mask Separate

The minimal implementation in this chapter only handles the causal mask:

```text
position i cannot look at future token j > i
```

Real batches also need a padding mask:

```text
pad positions should not be used as context by any valid token
```

The two masks solve different problems:

```text
causal mask: prevents future peeking
padding mask: prevents reading padding symbols
```

When writing a full Transformer later, the two must be combined. There is also a numerical edge case: if every position in a row is masked to `-inf`, softmax produces NaN. Pure causal masks do not cause this because each position can at least see itself; padding query rows can trigger the edge case.

You can remember the minimal combined-mask shapes like this:

```text
causal_mask:  BoolTensor[1, 1, T, T]   # query i cannot see future key j
padding_mask: BoolTensor[B, 1, 1, T]   # whether key j is a valid token
combined:     BoolTensor[B, 1, T, T]
scores:       FloatTensor[B, H, T, T]
```

In other words, the padding mask usually masks the key dimension first. If pad query rows are used later, also zero their corresponding outputs. Do not collapse causal and padding masks into an undocumented two-dimensional matrix, or the multi-head version is easy to broadcast incorrectly.

### Attention Weights Are Useful to Inspect, but Do Not Mythologize Them

Attention weights are useful for teaching visualization because they show how much weight one position assigns to historical tokens.

But they are not a full explanation:

- A large weight does not necessarily mean the final answer is truly determined by that token.
- Multiple layers, multiple heads, FFNs, and residual connections continue to transform the information.
- Reliable diagnosis must combine task loss, output changes, and intervention experiments.

So in this chapter we inspect attention weights to check whether the mechanism works, not to claim that "the model is already interpretable."

## 6. Required Experiments

- Construct an increasing token sequence and verify that position `i` cannot attend to `i+1`.
- Visualize attention weights and observe that each row sums to 1.
- Remove the `sqrt(H)` scaling factor and observe that softmax becomes too sharp and gradients less stable.
- Remove the causal mask and observe artificially low training loss but unreliable generation.

## 7. Failure Modes

- Mask dtype or device does not match: runtime error.
- Using `0` instead of `-inf` for masking: future tokens can still receive weight.
- Softmax is applied along the wrong dimension: columns are normalized instead of each query over all keys.
- Attention weights look pretty but are not connected to task loss.

## 8. Test Acceptance

The tests in this chapter should at least verify:

1. attention output shape is correct.
2. weights sum to approximately 1 along the last dimension.
3. after causal masking, all future-position weights are 0.
4. when the mask is disabled, future positions are visible as a control.
5. modifying a future token does not change past-position outputs.
6. softmax is over the key dimension, not the query dimension.
7. attention has no NaNs in `float32`.
8. an incorrect implementation that uses a `0` mask instead of a `-inf` mask should be caught by tests.

## 9. Memory Anchors and Boundaries

The most important sentence in this chapter is:

> Attention does not let tokens "look around freely"; it lets each position dynamically choose which historical values to aggregate through query-key matching.

Remember:

1. `scores = Q @ K^T / sqrt(d_k)`
2. `weights = softmax(scores)`
3. `out = weights @ V`
4. In a causal LM, future positions must be masked.
5. Attention weights are observable, but they are not a complete explanation.

This chapter does not solve deep training stability, nor does it solve modeling multiple relationships at the same time.

## 10. Next Chapter

Attention solves "who to look at," but an LLM block still needs multiple heads, residuals, normalization, and an FFN in order to stack stably. The next chapter enters the Transformer block.
