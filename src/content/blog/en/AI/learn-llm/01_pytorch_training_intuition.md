---
title: "Chapter 1: Training Loops, Computation Graphs, and Reproducible Experiments"
description: "You already know Python, so this chapter does not teach syntax. We go straight to the central question in deep learning:"
author: LienJack
pubDate: 2026-06-01
locale: en
tags:
  - LLM Learning
  - LLM
  - AI
---
# Chapter 1: Training Loops, Computation Graphs, and Reproducible Experiments

## 1. The Real Problem This Chapter Solves

You already know Python, so this chapter does not teach syntax. We go straight to the central question in deep learning:

> Why can a model improve from its mistakes, and how do we prove that this "improvement" is not an illusion?

Being able to write the following code is not enough:

```python
logits = model(x)
loss = loss_fn(logits, y)
loss.backward()
optimizer.step()
```

That is only the surface of training. Professional training keeps asking harder questions:

- If `backward()` is wrong, how would we notice?
- If the loss goes down but validation gets worse, did the model really improve?
- If the seed is not fixed, can we trust the experimental conclusion?
- If the parameters never update, can the tests catch it?
- If the model cannot even overfit a tiny dataset, is there a bug in the training pipeline?

This chapter builds the smallest professional training system that later chapters will reuse for mini GPT, SFT, LoRA, and distillation.

## 2. Chain of Questions

1. The starting problem: code that runs does not mean the model is learning.
2. Tensor shape is the first contract in a training system.
3. The forward pass produces a loss, and the computation graph records local dependencies.
4. `backward()` sends the effect of the loss back to the parameters, and `step()` actually updates them.
5. train/val split, overfit tiny, seed, and history make training conclusions verifiable.
6. Tests must prove parameter updates, loss reduction, gradient-free evaluation, and reproducible experiments.
7. Next chapter's question: after building a classification training loop, how do we turn the objective into sequence next-token prediction?

## 3. Concept Card

| Concept | Mathematical object | Shape | Code object | Experimental object |
| --- | --- | --- | --- | --- |
| tensor | numerical array | `(B, D)` | `torch.Tensor` | shape checks |
| model | parameterized function | `x -> logits` | `SimpleMLP` | forward |
| loss | scalar objective | `()` | `CrossEntropyLoss` | loss curve |
| gradient | parameter derivative | same shape as parameter | `.grad` | grad norm |
| optimizer | update rule | parameter set | `SGD/Adam` | update norm |
| split | generalization estimate | train / val | `split_dataset` | val loss |
| seed | randomness control | scalar | `TrainingConfig.seed` | reproducibility |

## 4. From Numeric Containers to Training Objects: Why Tensor Shape Is the First Language

At first, you can think of a tensor as a "numeric container with a shape." In training, however, shape is not a comment. It is a contract.

To connect this contract with the domain projects later in the course, this chapter uses a very small toy task for contract risk:

```text
Input x: [liquidated damages ratio, days overdue]
Output y: 0 = low risk, 1 = high risk
```

For example:

```text
x = [0.01, 3]   -> low risk
x = [0.30, 60]  -> high risk
```

This is obviously not a real legal model. Its role is to let us see the training loop clearly with two-dimensional numeric features:

```text
x:      [batch_size, 2]
logits: [batch_size, 2]
y:      [batch_size]
loss:   scalar
```

This shape contract is more reliable than variable names. Later, a language model will use:

```text
input_ids: [batch_size, seq_len]
logits:    [batch_size, seq_len, vocab_size]
labels:    [batch_size, seq_len]
```

If you do not build the habit of tracking shapes now, it is easy to get lost when attention introduces `[B, H, T, T]`.

Later in the course, we will repeatedly return to three kinds of contract risk:

```text
Excessive liquidated damages: the amount or ratio is clearly high and should trigger a risk warning
Overly broad liability scope: compensation for all losses, indirect losses, or loss of expected profits
Insufficient information: missing jurisdiction, regulation version, contract type, or evidence source
```

In this chapter, we compress those risks into two-dimensional toy features so we can answer a more basic question: does the loss really change the parameters through gradients? By Chapter 17, these three risk types will expand again into redacted clauses, RAG citations, JSON output, and human-review gates.

## 5. Computation Graphs: What PyTorch Actually Records

Training is not "the model makes a mistake and automatically becomes smarter." More precisely:

1. The forward pass turns inputs into a loss.
2. PyTorch records the computation graph during the forward pass.
3. Backpropagation follows that graph and sends the loss's influence back to each parameter.
4. The optimizer updates parameters according to their gradients.

A two-layer classifier can be written as:

```python
h = torch.relu(x @ W1 + b1)
logits = h @ W2 + b2
loss = F.cross_entropy(logits, y)
```

One detail matters here: `cross_entropy` expects raw logits, not probabilities after softmax, and you generally should not run the final output through ReLU before passing it in. Hidden layers may use ReLU. The final layer should remain unnormalized class scores.

Each node in the computation graph only needs to answer one local question:

> Given upstream `dL / dout`, how much gradient should I pass to my inputs and parameters according to my own local formula?

Backpropagation is not one spell cast over the whole model. It is many local chain-rule steps connected together.

### `requires_grad`, `grad_fn`, and Leaf Tensors

- `requires_grad=True` tells PyTorch to track computations involving this tensor.
- `grad_fn` points to the computation node that produced this tensor.
- `nn.Parameter` is usually a leaf tensor, and after training its gradient accumulates in `.grad`.

That is why you cannot casually insert `.detach()` during training or turn intermediate results into `.item()`. They may cut the computation graph and prevent gradients from reaching the parameters.

## 6. The Division of Labor Between `backward()` and `step()`

In one sentence:

> `loss.backward()` computes "how the model should change"; `optimizer.step()` actually makes the change.

More concretely:

```python
optimizer.zero_grad()
logits = model(x)
loss = loss_fn(logits, y)
loss.backward()
optimizer.step()
```

- `zero_grad()`: clears gradients left over from the previous batch.
- `model(x)`: runs the forward pass and builds the computation graph.
- `loss_fn(logits, y)`: compresses prediction error into a scalar.
- `backward()`: computes `.grad` for each parameter along the computation graph.
- `step()`: updates parameters using `.grad`.

If you forget `step()`, the loss can still be computed, but the parameters will not change.

If you forget `zero_grad()`, gradients accumulate across batches, which often makes early training behavior hard to explain.

## 7. Gradient Checks: Do Not Blindly Trust the Module You Just Wrote

PyTorch's built-in operators are usually reliable. But once you start writing your own attention, masks, losses, or custom modules, you need a sanity check:

```text
numerical gradient ≈ [L(theta + eps) - L(theta - eps)] / (2 * eps)
```

This is called a finite-difference gradient check.

It is not used during training because it is far too slow. It is a debugging tool for answering:

> Does the gradient from autograd point in the same direction as the numerical approximation?

The MLP in this chapter stays simple, but the tests and lesson text establish this habit. When you later implement attention, the habit becomes much more important.

## 8. train/val Split: Better Training-Set Performance Is Not the Same as a Better Model

The first version of many training scripts has a basic problem: training and evaluation use the same dataloader. That only proves the model improved on the training set. It does not prove that the model learned a pattern that generalizes.

Professional training must at least separate:

- train set: used by the optimizer to update parameters.
- validation set: used only to observe generalization, without parameter updates.

So each epoch should record:

```text
train_loss, train_acc
val_loss, val_acc
grad_norm, update_norm
```

If you see:

```text
train_loss keeps decreasing
val_loss starts increasing
```

that usually means overfitting: the model is memorizing the training data more and more, but it may not be getting better on unseen data.

## 9. overfit tiny: If the Model Cannot Memorize a Tiny Dataset, the Training Pipeline Probably Has a Problem

A very useful training sanity check is:

> Take a very small, noise-free batch of data and train on it repeatedly. The model should be able to memorize almost 100% of it.

If the model cannot overfit a tiny dataset, likely causes include:

- The loss and labels do not match.
- The optimizer is not updating parameters.
- The learning rate is too small or too large.
- The model does not have enough capacity.
- Data and labels were shuffled out of alignment.
- There is a bug in training mode, gradient handling, or device handling.

This chapter provides:

```bash
python -m src.training.simple_mlp --experiment overfit_tiny
```

This is not about real generalization. It verifies that the training pipeline itself is capable of learning.

## 10. Initialization, Learning Rate, and Batch Size

### Initialization

Model parameters do not start as a "blank slate"; they start from random initialization. Initialization affects:

- the scale of the initial logits.
- the scale of the gradients.
- differences between training curves under different seeds.

### Learning Rate

The learning rate controls how large a step each parameter update takes:

- Too small: loss decreases very slowly.
- Appropriate: loss decreases steadily.
- Too large: loss oscillates or even diverges.

### Batch Size

Batch size controls how many samples are used to estimate the gradient for each update:

- Small batch: noisier gradients, but more frequent updates.
- Large batch: more stable gradients, but each update costs more.

These are not tuning superstition. They are observables in the training system. The Chapter 1 code returns history so you can compare curves under different configurations.

## 11. Random Seeds and Reproducible Experiments

"I ran it once and the loss went down" is not a reliable conclusion. Professional training should at least control:

- the dataset generation seed.
- the train/val split seed.
- the model initialization seed.
- the DataLoader shuffle generator.

This chapter uses a single `TrainingConfig(seed=...)` to control those random sources. The tests check that training history and final parameters are reproducible under a fixed seed.

This is not formalism for its own sake. When you later evaluate LoRA, DPO, or RAG, irreproducible experiments make error analysis painful.

## 12. `model.train()`, `model.eval()`, and `torch.no_grad()`

These three things are often mixed together, but they are not the same.

### `model.train()`

Tells the model to enter training mode. Dropout randomly drops some activations, and BatchNorm updates its statistics.

### `model.eval()`

Tells the model to enter evaluation mode. Dropout disables randomness, and BatchNorm uses its existing statistics.

### `torch.no_grad()`

Tells PyTorch not to record the computation graph. This saves memory and prevents validation from accidentally producing gradients.

So an evaluation function usually needs both:

```python
@torch.no_grad()
def evaluate(...):
    model.eval()
```

This chapter's `SimpleMLP` supports optional dropout specifically so you can observe the difference between train and eval modes.

## 13. Code Structure in This Chapter

The core code lives in `src/training/simple_mlp.py`.

It provides:

- `TrainingConfig`: centrally manages seed, lr, batch size, epochs, and related configuration.
- `TrainingHistory`: records train/val metrics for each epoch in a structured form.
- `set_seed`: controls randomness consistently.
- `split_dataset`: creates non-overlapping train/val splits.
- `make_dataloaders`: builds dataloaders with a fixed shuffle generator.
- `compute_grad_norm`: observes whether gradients exist and whether they explode.
- `compute_update_norm`: observes whether parameters actually update.
- `run_training`: runs the baseline training experiment.
- `run_overfit_tiny_experiment`: runs the tiny-data overfitting experiment.

Run the baseline experiment:

```bash
python -m src.training.simple_mlp --experiment baseline
```

Run the tiny-data overfitting experiment:

```bash
python -m src.training.simple_mlp --experiment overfit_tiny
```

## 14. Required Experiments

- Baseline training: record train/val loss, accuracy, grad norm, and update norm.
- overfit tiny: verify that the model can memorize a small dataset.
- Seed reproducibility experiment: verify that history and parameters are reproducible under the same configuration.
- train/eval comparison: observe the behavioral difference caused by dropout in the two modes.
- Finite-difference gradient check: verify the autograd gradient direction on a small module.

The main experiment in this chapter can be reduced to four comparisons:

| Experiment | Change | Observable | Expected behavior |
| --- | --- | --- | --- |
| baseline | normal training | train/val loss, accuracy, update_norm | loss decreases, parameters update |
| no step | skip `optimizer.step()` | update_norm | loss is computable, but parameters do not change |
| no zero_grad | skip `zero_grad()` | grad_norm, loss curve | gradients accumulate, and the curve is harder to interpret |
| overfit tiny | repeatedly train on very small noise-free data | train accuracy | should approach 100% |

These four experiments are more reliable than looking at a single loss curve. They separately prove that "learning can happen," "missing updates can be detected," "gradient accumulation can be detected," and "the pipeline has enough capacity to memorize simple examples."

## 15. Failure Modes

- Forgetting `optimizer.step()`: the loss is computed, but parameters do not update.
- Forgetting `optimizer.zero_grad()`: gradients accumulate across batches, making training behavior confusing.
- Mixing training and validation data: generalization is overestimated.
- Failing to overfit a tiny dataset: the data, labels, learning rate, or update path probably has a bug.
- Evaluating without `torch.no_grad()`: validation records unnecessary computation graphs, wastes GPU memory, and slows down; if you later call `backward()` on validation loss by mistake, gradients that should not affect training can pollute debugging.
- Not fixing the seed: conclusions from a single run cannot be checked.

## 16. Test Acceptance

The tests in this chapter do more than check that "the code runs." They prove the key behaviors of the training pipeline:

- dataset output shapes are correct.
- model forward output shape is correct.
- train/val splits do not overlap.
- loss clearly decreases across epochs.
- parameters really update after one epoch.
- evaluate does not produce gradients.
- fixed seeds are reproducible.
- small samples can be overfit.
- dropout behaves differently in train and eval modes.
- grad norm and update norm are observable and greater than 0.

Run:

```bash
pytest -q tests/test_training_loop.py
```

## 17. Acceptance Criteria for This Chapter

After this chapter, you should be able to answer:

- Why does lower training loss not necessarily mean better generalization?
- What does `loss.backward()` compute, and where are the results stored?
- How can you prove that `optimizer.step()` really updated the parameters?
- Why do we need finite-difference gradient checks?
- Why is overfit tiny a training-pipeline sanity check?
- Why is fixing the seed not just "making the results look nice"?
- What is the difference between `model.eval()` and `torch.no_grad()`?

## 18. Memory Anchors and Boundaries

This chapter solves the most basic problem:

> A model does not become smarter just because it "saw the answer." It improves because the loss produces gradients through the computation graph, and the optimizer uses those gradients to update the parameters.

Remember three things:

1. **shape is the first contract in a training system**: if shapes are wrong, all later explanations are unreliable.
2. **lower loss is not the same as a better model**: you must look at validation, overfit tiny, seed reproducibility, and failed experiments.
3. **tests are not smoke tests**: they should prove that parameters really update, evaluation does not build graphs, small data can be overfit, and randomness is reproducible.

This chapter does not solve the language-modeling problem.

## 19. Next Chapter

A classifier predicts:

```text
P(y | x)
```

A language model predicts:

```text
P(x_t | x_<t)
```

In other words, it does not choose an answer from a fixed set of classes. It predicts the next token at every position.

The next chapter transfers the training loop to sequence probability modeling: cross entropy, perplexity, input/label shift, and the bigram language model.
