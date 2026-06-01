---
title: "Chapter 9: SFT Instruction Tuning"
description: "Chapter 8 taught us how to load and fine-tune a causal LM, but the original objective of a causal LM is still \"continue the text.\" What users actua..."
author: LienJack
pubDate: 2026-06-01
locale: en
tags:
  - LLM Learning
  - LLM
  - AI
---
# Chapter 9: SFT Instruction Tuning

## 1. The Real Problem This Chapter Solves

Chapter 8 taught us how to load and fine-tune a causal LM, but the original objective of a causal LM is still "continue the text." What users actually want is to give the model a task, constraints, context, and a question, and have it produce a usable answer according to the instruction.

The core of SFT is not magically "making the model smarter." It uses high-quality supervised examples to pull model behavior from the continuation distribution toward the instruction-response distribution.

Core question:

```text
How do we turn a model from "continues text" into one that answers in the system / user / assistant message format?
```

In the running contract example, the goal of SFT is not to make the model repeat "please analyze the following clause." It is to make the model output only risk JSON, evidence boundaries, and human-review markers.

This chapter uses teaching toy SFT data: few samples, clear boundaries, and the goal of validating the pipeline. It does not represent domain-grade SFT data. A real contract-risk model still needs Chapter 11's work on data sources, de-identification, deduplication, licensing, risk tags, and frozen evals. Otherwise, even if Chapter 9 training runs smoothly, the model has only learned a small format.

## 2. Chain of Questions

1. A base LM continues text; it does not necessarily follow user intent.
2. Instruction examples express tasks as `instruction -> response` or multi-turn messages.
3. A chat template turns structured messages into the token sequence expected by the model.
4. The label mask decides which tokens participate in loss; usually only assistant answers are trained.
5. Train / val / test split prevents mistaking memorization for ability.
6. Before and after training, compare behavior on the same prompts instead of only looking at loss.
7. Next chapter's question: full-parameter SFT is expensive; can we train only a small number of parameters?

## 3. Concept Card

| Concept | Mathematical object | Shape | Code object | Experimental object |
| --- | --- | --- | --- | --- |
| instruction | task description | text | `messages[user]` | instruction coverage |
| response | target answer | text | `messages[assistant]` | style and facts |
| chat template | formatting function | text -> ids | `apply_chat_template` | template consistency |
| labels | supervised tokens | `(B, T)` | `labels` | `-100` mask |
| split | generalization estimate | dataset partitions | `train/val/test` | leakage check |
| eval prompts | behavioral probes | list[str] | `before_after.md` | output comparison |

## 4. Data Format Contract

A minimal SFT sample should stay structured. Do not save only one pre-concatenated string:

```json
{
  "id": "legal_0001",
  "messages": [
    {"role": "system", "content": "你是谨慎的法律文本助手。"},
    {"role": "user", "content": "解释这段合同条款的风险。"},
    {"role": "assistant", "content": "这段条款的主要风险是..."}
  ],
  "source": "manual",
  "risk_tags": ["contract", "not_legal_advice"]
}
```

Structured fields make later cleaning, deduplication, de-identification, evaluation, and auditing traceable. Once everything is flattened into plain text, recovering role boundaries later is painful.

SFT data must control both "task" and "style." If samples only teach the model to answer politely, it may learn polished filler. If samples only provide factual answers, it may ignore system constraints. A high-quality SFT sample usually includes:

```text
task: what exactly the user wants the model to do
context: what materials the answer must rely on
format: whether the output should be natural language, JSON, a list, or a table
boundary: what to say when unknown, and what to do in high-risk cases
answer: the target output satisfying all constraints above
```

In later legal and medical projects, `risk_tags`, `source_group`, and `needs_human_review` are not extra burden. They are training material for SFT behavior boundaries.

## 5. Label Mask

SFT still uses causal LM loss, but not every token should contribute to the loss.

```text
system:    behavior constraint; usually not trained for repetition
user:      context; usually not trained for repetition
assistant: target answer; participates in loss
padding:   invalid position; must be set to -100
```

The core training-batch shapes are:

```text
input_ids:      LongTensor[B, T]
attention_mask: LongTensor[B, T]
labels:         LongTensor[B, T]
```

`labels[i, j] = -100` means that position is ignored by the loss. A wrong mask can train the model to repeat the user's question or treat padding as a target token.

### Build label masks by token span, not by string guessing

The easiest SFT mistake is not forgetting `-100`; it is masking the wrong tokens.

Do not search for the assistant answer in the full text by string position, because chat templates may add special tokens, newlines, spaces, and role markers. String positions are not token positions.

A more robust flow is:

```text
prompt_messages = system + user + assistant_prefix
full_messages   = system + user + assistant_answer

prompt_ids = tokenize(apply_chat_template(prompt_messages))
full_ids   = tokenize(apply_chat_template(full_messages))

labels = full_ids.copy()
labels[:len(prompt_ids)] = -100
```

This guarantees:

```text
system/user/assistant_prefix: context only, no loss
assistant answer/eos:        target output, included in loss
padding:                     set to -100
```

Before training, manually decode a batch:

```text
decode(input_ids): what the model actually sees
decode(labels != -100): what the model is actually asked to learn
```

This check catches accidents earlier than training loss.

## 6. Chat Template Consistency

Different instruct models use different message boundaries. Prefer the tokenizer's built-in template:

```python
text = tokenizer.apply_chat_template(
    messages,
    tokenize=False,
    add_generation_prompt=False,
)
```

Training, validation, and inference must use the same template. Otherwise, the model sees one format during training and another at inference. Quality drops, but the cause may not be obvious.

For base models without a chat template, save an explicit template version in the project, for example:

```text
<|system|>
...
<|user|>
...
<|assistant|>
...
```

The template is part of the model interface, not a casually concatenated string.

## 7. Data Splits and Leakage

SFT data should not be split by randomly shuffling rows alone. At minimum, check:

- The same source document must not appear in both train and test.
- Slight rewrites of the same question must not leak into test.
- Domain terms, format templates, and disclaimers should not appear only in train.
- High-risk refusal samples should have a separate eval set.

Recommended split:

```text
train: updates parameters
val:   tunes learning rate, epochs, early stopping, and template issues
test:  used only in the final report
```

If data volume is very small, fixed eval prompts can be used as behavioral probes, but acknowledge that they do not replace a formal test set.

## 8. Minimal Training Workflow

```text
raw jsonl
  -> schema validate
  -> de-duplicate
  -> split by source/group
  -> apply chat template
  -> tokenize
  -> build labels with assistant-only loss
  -> train
  -> eval loss + behavior prompts
  -> save model/tokenizer/report
```

Training configuration should record at least:

- base model ID and revision.
- tokenizer / chat template version.
- max sequence length.
- train / val / test split seed.
- learning rate, batch size, gradient accumulation, epochs.
- whether the run uses full fine-tuning, LoRA, or QLoRA.

After training, do not only inspect loss. SFT aims to change behavior, so prepare fixed behavioral probes:

```text
format probe: whether output follows the requested JSON format
refusal probe: whether it refuses when evidence is insufficient
style probe: whether it follows the system persona
safety probe: whether high-risk questions are routed to humans or warnings
regression probe: whether samples answered correctly by the old version regressed
```

These probes can be small, but they should be fixed. After each run, compare base and tuned outputs on the same prompts to see whether SFT actually pushed behavior toward the target.

For the running contract task, start with 5 fixed probes:

| probe | Input | Expected behavior |
| --- | --- | --- |
| format | ask for analysis of an excessive-liquidated-damages clause | output parseable JSON |
| boundary | provide only the clause, without jurisdiction | `risk_level="unknown"` or request human review |
| citation | ask for basis | do not fabricate source IDs |
| refusal | ask for a final legal conclusion despite insufficient materials | refuse to give a final conclusion |
| regression | missing liability-cap sample | continue marking `needs_human_review=true` |

## 9. Required Experiments

- Before/after comparison: output changes on the same instruction prompts.
- Tiny SFT overfit: use 20 high-quality samples to prove the pipeline can learn both format and content.
- Wrong-mask control: include user tokens in loss and observe the tendency to repeat the user.
- Assistant-span offset experiment: intentionally under-mask or over-mask the beginning of the assistant answer and observe missing openings, repeated role markers, or unstable format.
- Template mismatch control: use different templates for training and inference and observe output-format degradation.
- Report val loss and human behavioral observations side by side.

## 10. Failure Modes

- Chaotic data format: some samples use `prompt/completion`, others use `messages`, and the training script silently skips fields.
- Low-quality responses: SFT imitates bad answers; training cannot fix dirty labels.
- Training only for format: the model learns "first, second, finally" but does not improve factual ability.
- No refusal samples for high-risk scenarios: legal/medical models become overconfident.
- Eval prompts leak into training: before/after comparison looks better because samples were memorized.
- `max_length` truncates assistant answers: the model is trained to output half a sentence.
- Label masks are built with string search: special tokens, spaces, or newlines in the template cause token-span offsets.

## 11. Test Acceptance

The tests in this chapter should at least verify:

1. SFT jsonl sample schema is valid and includes `messages` with legal roles.
2. After `apply_chat_template`, the training text includes the assistant boundary.
3. user/system/pad positions in the label mask are `-100`.
4. train / val / test splits contain no duplicate `id` or duplicate source group.
5. A manually or programmatically decoded batch confirms `labels != -100` corresponds only to the assistant answer.
6. After tiny SFT training, loss decreases and the saved directory can be reloaded.

## 12. Memory Anchors and Boundaries

The most important sentence in this chapter is:

> SFT is not magic that makes a model "understand the task"; it uses high-quality examples to push model behavior from the continuation distribution toward the instruction-response distribution.

Remember:

1. A chat template is the model interface, not string decoration.
2. Usually only assistant answers participate in loss.
3. Label masks must be built by token span.
4. train/val/test should split by source group to prevent leakage.
5. Behavioral probes and human observation cannot be replaced by train loss.

This chapter does not solve fine-tuning cost. The next chapter moves into LoRA / QLoRA.

## 13. Next Chapter

SFT can change model behavior, but full fine-tuning updates many parameters and costs a lot of GPU memory and storage. The next chapter covers LoRA / QLoRA: how to train only a small number of adapter parameters.
