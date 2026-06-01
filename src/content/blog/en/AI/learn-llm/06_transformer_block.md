---
title: "Chapter 6: Transformer Block"
description: "Chapter 5's causal self-attention already lets each token dynamically look back at historical positions. So why can we not simply stack many attent..."
author: LienJack
pubDate: 2026-06-01
locale: en
tags:
  - LLM Learning
  - LLM
  - AI
---
# Chapter 6: Transformer Block

## 1. The Real Problem This Chapter Solves

Chapter 5's causal self-attention already lets each token dynamically look back at historical positions. So why can we not simply stack many attention layers and call it GPT?

The problem is that attention is only one information-mixing operation. It can answer "which historical positions should the current position look at," but it has not solved three engineering problems:

1. **Limited expressiveness**: one attention view struggles to handle local collocations, long-range references, format boundaries, and citation relationships at the same time.
2. **Unstable depth**: as layers increase, activation scale and gradient paths can become hard to train.
3. **Mixing without processing**: attention mainly routes information across positions, but we still need position-wise nonlinear transforms to process features.

Transformer blocks exist not to pile up terminology, but to turn attention into a basic module that can be stacked and trained stably:

```text
multi-head: look at different relationships in parallel
residual: preserve a direct path
LayerNorm: stabilize feature scale
FFN: process features nonlinearly at each position
Dropout: regularize during training
```

Core question:

```text
How does attention become a stackable, stably trainable basic building block for LLMs?
```

## 2. Chain of Questions

1. Starting point: single-head attention can dynamically look at history, but it is only one information-mixing operation.
2. New problem one: a single head has a limited perspective and struggles to learn multiple relationships at once.
3. New mechanism one: multi-head attention splits the hidden dimension into several subspaces and learns different routes in parallel.
4. New problem two: after stacking many layers, rewriting the representation at every layer can make gradients and information flow unstable.
5. New mechanism two: residual connections let a module make incremental changes while the original representation keeps a direct path.
6. New problem three: activation scale easily drifts in deep networks.
7. New mechanism three: LayerNorm stabilizes scale over the hidden dimension at each position; pre-norm is better suited to deep training.
8. New problem four: attention mixes information, but position-wise nonlinear processing is still needed.
9. New mechanism four: the FFN applies an MLP transformation independently at each position.
10. Next chapter's question: once we have stackable blocks, how do we combine embeddings, positions, blocks, and the LM head into a full Mini GPT?

## 3. Concept Card

| Concept | Mathematical object | Shape | Code object | Experimental object |
| --- | --- | --- | --- | --- |
| multi-head | multiple attention subspaces | `(B, heads, T, Hd)` | `CausalSelfAttention` | head shape |
| residual | identity bypass | `(B, T, D)` | `x + module(x)` | gradient stability |
| LayerNorm | feature normalization | `(B, T, D)` | `nn.LayerNorm` | mean/variance |
| FFN | position-wise MLP | `(B, T, D)` | `FeedForward` | capacity comparison |
| dropout | stochastic regularization | `(B, T, D)` | `nn.Dropout` | train/eval difference |

## 4. Shape Contract

```text
x: FloatTensor[B, T, D]
num_heads: h
head_dim: D / h
qkv: FloatTensor[B, T, 3D]
q,k,v: FloatTensor[B, h, T, head_dim]
attn_out: FloatTensor[B, T, D]
ffn_out: FloatTensor[B, T, D]
block_out: FloatTensor[B, T, D]
```

`D % num_heads == 0` is a hard constraint. Otherwise, the dimension cannot be evenly split across heads.

The intuition for multi-head attention is not "average several attentions." It splits the hidden dimension into several subspaces so different heads can learn different relationships: one head may prefer local neighboring tokens, another may prefer syntactic boundaries, and another may focus on citations or format markers. In a teaching project, attention heads do not need to be mythologized, but you should understand that multi-head attention provides parallel information-routing capacity. After the heads are concatenated back to `(B, T, D)`, an output projection usually mixes their information again.

The mask in multi-head attention must also broadcast to the attention scores:

```text
attn_scores: FloatTensor[B, h, T, T]
causal_mask: BoolTensor[1, 1, T, T] or broadcastable to that shape
```

If a mask only works in a single-head example, some batch/head combinations may peek at the future once the model becomes multi-batch and multi-head.

Residual connections solve a different problem: the module can make incremental changes to the original representation instead of being forced to rewrite all information at every layer. Without residuals, deep networks degrade more easily. With residuals, gradients also have a more direct path through the network.

LayerNorm keeps the feature scale at each position more stable. Pre-norm has the form:

```text
x = x + attention(layer_norm(x))
x = x + ffn(layer_norm(x))
```

It is usually more stable for deeper Transformers because the residual path keeps an unnormalized direct channel.

LayerNorm normalizes over the last hidden-feature dimension, not over the batch or sequence dimension. The FFN usually expands the hidden dimension first, for example to `4 * hidden_dim`, and then projects it back:

```text
FloatTensor[B, T, D] -> FloatTensor[B, T, 4D] -> FloatTensor[B, T, D]
```

## 5. Minimal Implementation Structure

```python
class TransformerBlock(nn.Module):
    def __init__(self, hidden_dim, num_heads, dropout):
        super().__init__()
        self.ln_1 = nn.LayerNorm(hidden_dim)
        self.attn = CausalSelfAttention(hidden_dim, num_heads, dropout)
        self.ln_2 = nn.LayerNorm(hidden_dim)
        self.ffn = FeedForward(hidden_dim, dropout)

    def forward(self, x):
        x = x + self.attn(self.ln_1(x))
        x = x + self.ffn(self.ln_2(x))
        return x
```

This chapter prioritizes pre-norm. Post-norm can be used as a comparison experiment, but it is not the main path.

### Why Stacking Attention Alone Is Not Enough

A model with only attention can mix historical tokens into the current position, but it lacks two key abilities.

First, it has no stable channel for "preserving original information." Every layer is forced to rewrite the representation, and training degrades more easily as depth increases. Residual connections let each module learn an increment:

```text
new_x = old_x + module(old_x)
```

Second, it lacks position-wise nonlinear processing. Attention exchanges information across tokens; the FFN recombines the mixed information inside each token. Without an FFN, the model easily becomes a system that only moves context around without processing features.

So a Transformer block is not a thin wrapper around attention. It is a stackable training unit.

Beginners often underestimate the FFN. Attention mixes information across positions; the FFN performs nonlinear transformation within each position. A Transformer block with attention but no FFN has clearly limited expressiveness. A block with an FFN but no attention cannot dynamically read context.

Dropout is also worth keeping in teaching models because it forces you to distinguish `model.train()` from `model.eval()`. The training habits built in Chapter 1 continue here: the same input may be stochastic in train mode because of dropout, and should be stable in eval mode.

After this chapter, you should be able to view a block as a shape-preserving function:

```text
TransformerBlock: FloatTensor[B, T, D] -> FloatTensor[B, T, D]
```

Keeping the shape unchanged is what makes stacking layers easy.

## 6. Required Experiments

- Verify that output shape stays unchanged under different numbers of heads.
- Compare training loss and gradient norm with and without residual connections.
- Compare dropout behavior in train and eval modes.
- Stack 1, 2, and 4 blocks and observe tiny-corpus overfitting ability.
- Intentionally stack only attention, without residual / norm / FFN, and observe unstable deep training or limited expressiveness.

## 7. Failure Modes

- Calling `view` directly after forgetting `.contiguous()`: multi-head reshaping may error or behave strangely.
- Incorrect mask broadcast dimensions: some batches/heads may peek at the future.
- FFN hidden size is too small: block capacity is insufficient.
- No residual connection: deep training degrades more easily.
- Treating LayerNorm like BatchNorm: normalizing over the wrong dimensions changes training behavior.

## 8. Test Acceptance

The tests in this chapter should at least verify:

1. `hidden_dim % num_heads != 0` raises an explicit error.
2. block input and output shapes are exactly the same.
3. the causal mask applies to every head.
4. train/eval dropout behavior differs.
5. after stacking multiple blocks, backpropagated gradients are nonzero and contain no NaNs.

## 9. Memory Anchors and Boundaries

The most important sentence in this chapter is:

> A Transformer block turns attention from a single information-mixing operation into a stackable, trainable, reusable basic module for language models.

Remember:

1. Multi-head solves parallel routing for multiple relationships.
2. Residuals provide direct paths for information and gradients.
3. LayerNorm stabilizes hidden-feature scale.
4. The FFN performs position-wise nonlinear processing.
5. Dropout requires different train / eval behavior.

This chapter does not solve full language-model engineering. The next chapter puts blocks into Mini GPT and adds positions, checkpoints, generation, and reproducible experiments.

## 10. Next Chapter

We now have stackable modules. The next chapter connects tokenizer, embeddings, positions, Transformer blocks, the LM head, the training loop, and generation into a Mini GPT.
