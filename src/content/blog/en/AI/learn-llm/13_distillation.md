---
title: "Chapter 13: Distilling Small Models"
description: "RAG can let a strong model answer from external evidence, but calling a strong model every time can be expensive, slow, and hard to control. Domain..."
author: LienJack
pubDate: 2026-06-01
locale: en
tags:
  - LLM Learning
  - LLM
  - AI
---
# Chapter 13: Distilling Small Models

## 1. The Real Problem This Chapter Solves

RAG can let a strong model answer from external evidence, but calling a strong model every time can be expensive, slow, and hard to control. Domain projects often want to transfer a strong model's behavior on certain tasks into a smaller, cheaper student model that is easier to deploy.

Distillation is not "copy all capabilities of a large model." It turns teacher outputs, preferences, or probability information into training signals for a student over a clearly defined task distribution.

Core question:

```text
A large model works well but is too expensive. How do we transfer verifiable domain ability into a small model?
```

## 2. Chain of Questions

1. The teacher model can answer complex questions, but calls are expensive.
2. The student model is cheap, but its original capability is insufficient.
3. Response distillation uses teacher-generated answers to train the student.
4. Logit distillation uses the teacher probability distribution for finer supervision.
5. Preference distillation uses paired preferences to teach the student which answer is better.
6. Distillation data must filter hallucinations, format errors, and out-of-bound advice.
7. Next chapter's question: after distillation, how do we prove the student truly improved?

## 3. Concept Card

| Concept | Mathematical object | Shape | Code object | Experimental object |
| --- | --- | --- | --- | --- |
| teacher | strong model | function | `teacher.generate` | data generation |
| student | small model | parameters | `student_model` | fine-tuning |
| response | text supervision | messages | `distill.jsonl` | quality filtering |
| logits | probability distribution | `(B, T, V)` | `teacher_logits` | KL loss |
| preference | preference pair | pair | `chosen/rejected` | ranking ability |
| filter | quality gate | rules/model/human | `filter.py` | pass rate |

## 4. Response Distillation

The most common distillation method asks the teacher to generate answers, then trains the student on those answers as SFT data:

```text
prompt + retrieved context
  -> teacher answer
  -> filter / edit / approve
  -> SFT example
  -> student fine-tune
```

Samples must record generation provenance:

```json
{
  "id": "distill_0001",
  "teacher_model": "teacher-model-id",
  "teacher_prompt_version": "rag_prompt_v3",
  "generation_config": {"temperature": 0.2, "top_p": 0.9},
  "filter_status": "approved",
  "messages": [...]
}
```

Without teacher and prompt versions, you cannot later explain why the student learned a certain answer style.

Response distillation quality depends on whether teacher outputs are suitable for student learning. A teacher answer that is long, fluent, and expert-like is not automatically good training data. Training samples should be stable, verifiable, match the target format, and cover refusal and boundary cases. Otherwise the student learns the teacher's tone, not deployable domain ability.

A distillation sample should ideally keep:

```text
prompt
retrieved_context / citations
teacher_response
teacher_model
teacher_prompt_version
generation_config
filter_status
review_notes
source_group
```

These fields feed later filtering, splitting, and evaluation.

## 5. Logit Distillation

Response distillation gives the student only one target answer. Logit distillation also tries to make the student learn the teacher's soft vocabulary distribution.

```text
teacher_logits: FloatTensor[B, T, V]
student_logits: FloatTensor[B, T, V]

teacher_probs_T = softmax(teacher_logits / temperature)
student_log_probs_T = log_softmax(student_logits / temperature)

loss = CE(student_logits, hard_labels)
     + lambda * temperature^2 * KL(teacher_probs_T || student_probs_T)
```

In PyTorch, a common form is:

```python
kl = F.kl_div(
    student_log_probs_T,
    teacher_probs_T,
    reduction="batchmean",
)
```

The KL direction matters: we want the student's distribution to move toward the teacher's distribution.

Soft distributions can express "which wrong answers are closer to the correct answer." But this is much more expensive: it requires storing or computing large-vocabulary logits, and it can import the teacher's biases and overconfidence.

Logit distillation has clear boundaries:

1. If teacher and student use different tokenizers, vocabulary distributions are hard to align directly.
2. Fully storing `(B, T, V)` logits is expensive.
3. You can store only top-k logits or request the teacher online during training.
4. The teacher's soft distribution can contain misplaced confidence.
5. In high-risk domains, high teacher probability does not make an output factual.

For teaching, implement response distillation first and treat logit distillation as an advanced experiment.

## 6. Preference Distillation

Sometimes the teacher does not provide a standard answer directly. Instead, it compares two answers:

```json
{
  "prompt": "...",
  "chosen": "更好、更安全、更有依据的答案",
  "rejected": "更差、幻觉或越界的答案",
  "reason": "chosen 引用了证据，rejected 编造了来源"
}
```

Preference data is suitable for teaching the model to avoid bad answers, especially for safety, refusal behavior, and format stability. It is not the first step in this course because it requires a more complex training objective.

## 7. Distillation Data Filtering

Teacher outputs cannot be trusted directly. At minimum, filter for:

- whether the answer addresses the question instead of giving generic explanation.
- whether it is supported by the provided materials.
- whether it cites real sources.
- whether it follows the output format.
- whether it contains privacy risk, out-of-bound legal/medical advice, or dangerous suggestions.
- whether it expresses necessary uncertainty.

Filtering can have three layers:

```text
rule filter: schema, length, sensitive terms, citation existence
model filter: ask a reviewer model to judge support and risk
human review: human spot-check or full review for high-risk samples
```

Filters should not only keep answers that "look pretty." A domain student also needs to learn:

```text
refuse when materials are insufficient
route to humans in high-risk cases
avoid conclusions when citations are missing
repair or refuse incomplete formats
```

If filtering deletes all refusals, failures, and boundary samples, the student becomes overconfident. A good distillation dataset should include both positive answers and safety boundaries.

The distillation sample lifecycle can be fixed as:

```text
eval gap
  -> teacher prompt
  -> teacher response
  -> rule/model/human filter
  -> approved distill jsonl
  -> student SFT / LoRA
  -> same eval set comparison
```

Filter output should not only say passed/failed. Record rejection reasons:

| reject_reason | Example |
| --- | --- |
| `no_citation` | answer is complete but has no source |
| `unsupported_claim` | citation does not support the conclusion |
| `unsafe_advice` | legal/medical advice crosses boundaries |
| `bad_format` | JSON is unparsable or fields are missing |
| `privacy_risk` | repeats unredacted personal information |
| `over_confident` | gives a definite conclusion despite insufficient materials |

### Do not use the teacher itself as the only reviewer

A common mistake is:

```text
teacher generates answer
-> teacher judges whether the answer is good
-> passed samples train the student
```

This passes the teacher's blind spots directly to the student. A more robust filter mixes:

```text
rule checks: schema, citation, length, sensitive fields
evidence checks: whether the answer is supported by context
model assistance: another judge model helps score
human spot-check: high-risk samples must be reviewed by humans
```

In legal and medical settings especially, the more expert-like the teacher output sounds, the easier it is to miss fabricated evidence or out-of-bound advice.

## 8. Student Training

Student training essentially returns to SFT / LoRA:

```text
distilled dataset
  -> train/val/test split by source
  -> SFT or LoRA
  -> compare base / teacher / student
```

Keep the base student as a control. Otherwise, you cannot tell whether the student improved because of distillation or already had the ability.

## 9. Comparative Evaluation

A distillation report should compare at least three systems:

```text
base student: small model before distillation
teacher: large model that generated distillation data
student: small model after distillation
```

Do not only look at averages. Inspect slices:

- routine tasks.
- long-context tasks.
- no-answer / refusal tasks.
- high-risk legal/medical tasks.
- strict-format tasks.

An excellent student does not necessarily beat the teacher, but it should approach the teacher under the target cost and clearly outperform the base student.

Distillation evaluation should also record cost and latency. The student's goal is usually not absolute superiority over the teacher; it is enough quality at lower cost:

```text
quality: eval score / human score / citation support
cost: cost per 1000 requests
latency: p50 / p95
safety: high-risk refusal and out-of-bound answers
```

If the student is slightly lower quality but much cheaper, and safety metrics do not regress, it may be more deployable. Conversely, if the student average score is close to the teacher but high-risk slices regress clearly, it should not go live.

## 10. Required Experiments

- Use RAG + teacher to generate a small batch of distillation samples.
- Write a filtering script and report pass rate and rejection reasons.
- Train an SFT baseline and a distill-dataset run from the same student base.
- Compare base / teacher / student on the same eval set.
- Construct teacher-error samples and verify that the filter blocks some of them.

## 11. Failure Modes

- Teacher hallucination is learned by the student.
- Distillation data is too homogeneous: the student learns a template, not ability.
- Only pretty teacher answers are kept: refusal and failure boundaries are missing.
- The teacher evaluates its own data: quality filtering is overly optimistic.
- The student is too small: the target ability does not transfer.
- The comparison omits base student: distillation contribution cannot be proven.

## 12. Test Acceptance

The tests in this chapter should at least verify:

1. Distillation samples record teacher model, prompt version, and filter status.
2. The filter rejects samples with no citation, empty answers, or bad format.
3. train / val / test split does not randomly leak sources after distillation.
4. Student behavior changes observably on a tiny eval before and after training.
5. The eval report includes base, teacher, and student columns.

## 13. Memory Anchors and Boundaries

The most important sentence in this chapter is:

> Distillation does not copy all capabilities of a large model; it compresses a verifiable behavior over a clearly defined task distribution.

Remember:

1. Response distillation is simplest, but heavily depends on teacher answer quality.
2. Logit distillation is finer-grained, but requires vocabulary alignment and is expensive.
3. Preference distillation is useful for learning "which answer is better," but has a more complex objective.
4. Distillation data must filter hallucinations, out-of-bound advice, and format errors.
5. The student must be compared on the same questions against both the base student and the teacher.

This chapter does not prove the student truly improved. The next chapter covers evaluation.

## 14. Next Chapter

Distillation makes small models cheaper, but "it seems to answer" is still not evidence. The next chapter covers model evaluation: how to prove the model really improved and where it still fails.
