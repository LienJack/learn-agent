---
title: "Chapter 2: The Probabilistic Objective of Language Models"
description: "Chapter 1 trained a classifier: feed in a vector, get out a class. Now we switch to a problem that looks much more like an LLM:"
author: LienJack
pubDate: 2026-06-01
locale: en
tags:
  - LLM Learning
  - LLM
  - AI
---
# Chapter 2: The Probabilistic Objective of Language Models

## 1. The Real Problem This Chapter Solves

Chapter 1 trained a classifier: feed in a vector, get out a class. Now we switch to a problem that looks much more like an LLM:

> Given the beginning of a sentence, how does the model continue it?

Intuitively, it feels as if the model is "outputting a sentence." But during training, we cannot directly supervise whether a whole sentence is good, because many different continuations can be reasonable. So language modeling breaks the problem into smaller pieces:

> Instead of generating the whole sentence at once, predict the next token at each position.

Our running toy corpus is:

```text
合同 违约金 过高 ， 它 可能 存在 风险 <eos>
```

During training, it becomes a sequence of supervised relationships:

```text
合同   -> 违约金
违约金 -> 过高
过高   -> ，
，      -> 它
它      -> 可能
```

The capability this chapter adds is:

```text
rewriting "continue this text" into trainable, evaluable, generatable next-token prediction.
```

## 2. Chain of Questions

1. Starting point: a classifier can only output fixed labels; it cannot output variable-length text.
2. New problem: text generation looks like "writing a sentence," but training needs a computable supervised objective.
3. New mechanism: decompose the probability of a sentence into a chain of next-token probabilities:

   ```text
   P(x_1, ..., x_T) = ∏ P(x_t | x_<t)
   ```

4. Engineering translation: give the model `tokens[:, :-1]` and ask it to predict `tokens[:, 1:]`.
5. Training signal: each position outputs vocabulary-sized logits, and cross entropy supervises the correct next token.
6. Inference boundary: during training, the true prefix is available; during generation, the model can only use tokens it has already generated.
7. New problem: the model needs token IDs, but the real input is a string. The next chapter moves into tokenizers and datasets.

## 3. Concept Card

| Concept | Mathematical object | Shape | Code object | Experimental object |
| --- | --- | --- | --- | --- |
| corpus | token sequence | `(N,)` or `(B, T)` | `input_ids` | small Chinese corpus |
| logits | class scores at each position | `(B, T, V)` | `model(input_ids)` | check vocab dimension |
| labels | target tokens shifted one position to the right | `(B, T)` | `targets` | verify the offset |
| loss | mean negative log likelihood | `()` | `nn.CrossEntropyLoss` | whether loss decreases |
| generate | autoregressive sampling | grows step by step | `generate()` | compare temperature and top-k |

## 4. Shape Contract

A minimal language-model training batch should satisfy:

```text
tokens:  LongTensor[B, T + 1]
inputs:  tokens[:, :-1] -> LongTensor[B, T]
labels:  tokens[:, 1:]  -> LongTensor[B, T]
logits:  FloatTensor[B, T, V]
loss:    CE(logits.reshape(B*T, V), labels.reshape(B*T))
```

Important: `logits.argmax(-1)` gives the most likely next token at each position. It is not the answer to the whole sentence. A generation loop must append each new token back into the context.

This "shift right by one" relationship is the core of language-model training. Given the token sequence:

```text
合同 违约金 过高 ， 它 可能 存在 风险 <eos>
```

the supervised relationships seen during training are:

```text
合同   -> 违约金
违约金 -> 过高
过高   -> ，
，      -> 它
它      -> 可能
```

If inputs and labels are aligned to the same token, the loss may fall quickly, but the model learns to copy the current token instead of predicting the next one. This bug is subtle because the training curve can look "great," while generation degenerates into repeated similar tokens.

Training scripts should assert this relationship instead of relying on visual inspection:

```python
assert torch.equal(inputs[:, 1:], labels[:, :-1])
```

A minimal batch can be checked by hand:

| Item | Correct LM batch | Wrong batch |
| --- | --- | --- |
| `inputs` | `合同 违约金 过高` | `合同 违约金 过高` |
| `labels` | `违约金 过高 ，` | `合同 违约金 过高` |
| Learned objective | predict the next token | copy the current token |
| Generation consequence | can continue the text | tends to repeat |

Training and generation also differ in an important way: during training, every position sees the true history. This is called teacher forcing. During generation, the model can only see the history it has generated itself. One small mistake enters the context and affects every later token. That is why training loss alone is not enough; you must actually run `generate()`.

### Loss and Perplexity: Why One Scalar Can Represent Prediction Difficulty

Cross entropy loss can be understood as:

> The higher the probability the model assigns to the correct next token, the lower the loss; the lower that probability, the higher the loss.

If the average loss is `L`, perplexity is usually written as:

```text
perplexity = exp(L)
```

Roughly, it means how many candidate tokens the model is, on average, "confused among" at each position. Lower perplexity means the model is more confident about the correct next token.

But it has limits:

- Perplexity evaluates next-token prediction; it is not the same as answer quality.
- Very low perplexity on a tiny corpus may simply mean overfitting.
- For SFT, RAG, legal QA, and medical QA, later chapters must also examine format accuracy, factual accuracy, citation accuracy, and safe refusal behavior.

## 5. Minimal Implementation

The minimal model in this chapter can start with a neural bigram language model:

```python
class BigramLanguageModel(nn.Module):
    def __init__(self, vocab_size: int, hidden_dim: int) -> None:
        super().__init__()
        self.token_embedding = nn.Embedding(vocab_size, hidden_dim)
        self.lm_head = nn.Linear(hidden_dim, vocab_size)

    def forward(self, input_ids: torch.Tensor) -> torch.Tensor:
        hidden = self.token_embedding(input_ids)
        return self.lm_head(hidden)
```

Its meaning is:

```text
current token id
  -> look up embedding
    -> project to vocab logits
      -> predict the next token
```

This model does not really look at longer history. Strictly speaking, if `hidden_dim < vocab_size`, it is a low-rank parameterized bigram baseline rather than a full bigram transition table.

It is weak, but it is extremely useful for teaching. It helps us verify four things:

1. whether `input_ids` and `labels` are shifted correctly;
2. whether the logits shape is `[B, T, V]`;
3. whether cross entropy is wired correctly;
4. whether `generate()` can really generate tokens in a loop.

It does not solve long-context modeling. When it sees the token "它" ("it"), it does not know whether "it" refers to "违约金" ("liquidated damages") or "合同" ("contract"). That gap naturally motivates the embedding context model and attention in later chapters.

The experiments in this chapter can stay very small: train a bigram LM on a few dozen characters, confirm that loss decreases, generation works, and sampling parameters change the output. Small experiments are explainable, which makes it easier to locate problems once the models become more complex.

## 6. Required Experiments

- Overfit a short piece of text, such as repeated Chinese poetry or a snippet from the project README.
- Compare greedy, temperature, top-k, and top-p sampling, observing repetition, divergence, and diversity.
- Intentionally avoid shifting labels: the model learns to "copy the current token," and generation quality looks falsely good.
- Intentionally include padding in the loss: observe the model over-learning `<pad>`.
- Fix the seed: the same training and sampling configuration should reproduce the same output.

## 7. Failure Modes

- `logits` and `labels` are flattened incorrectly: cross entropy either errors or silently trains the wrong target.
- Padding tokens are included in the loss: the model over-learns padding symbols.
- Training loss decreases but generation is all repeated tokens: the bigram model lacks context capacity; the training loop is not necessarily broken.
- Generation forgets to crop context: later Transformers will exceed the maximum context length.

## 8. Test Acceptance

The tests in this chapter should at least verify:

1. `make_lm_batch()` returns correctly offset `inputs` and `labels`.
2. `BigramLanguageModel` outputs shape `(B, T, V)`.
3. One training step updates both embedding and lm head parameters.
4. Loss clearly decreases after overfitting a small corpus.
5. `generate()` returns the correct output length and never emits tokens outside the vocabulary.
6. `perplexity == exp(loss)`.

## 9. Memory Anchors and Boundaries

The most important sentence in this chapter is:

> A language model does not learn to "write a complete sentence" in one shot. It learns to predict the next token at every position.

Remember:

1. `inputs = tokens[:, :-1]`
2. `labels = tokens[:, 1:]`
3. `logits.shape = [B, T, V]`
4. `loss = CE(logits.reshape(B*T, V), labels.reshape(B*T))`
5. Training uses true history; generation uses the model's own generated history.

This chapter does not solve two problems:

- how strings become stable token IDs;
- how the model uses longer context.

## 10. Next Chapter

We now know that a language model needs `input_ids`. But real text is a string, and the string-to-number process determines the vocabulary, unknown words, padding, batching, and evaluation consistency. The next chapter covers tokenizers and datasets.
