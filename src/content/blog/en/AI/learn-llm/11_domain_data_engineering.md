---
title: "Chapter 11: Domain Data Engineering"
description: "Chapter 10 reduced fine-tuning cost, but it did not explain where capability comes from. Domain small models usually do not become stronger because..."
author: LienJack
pubDate: 2026-06-01
locale: en
tags:
  - LLM Learning
  - LLM
  - AI
---
# Chapter 11: Domain Data Engineering

## 1. The Real Problem This Chapter Solves

Chapter 10 reduced fine-tuning cost, but it did not explain where capability comes from. Domain small models usually do not become stronger because of the adapter trick itself. They improve because data clearly defines task boundaries, terminology, format, refusal behavior, and evaluation targets.

Domain data engineering is not "collect as much as possible." In high-risk settings such as law and medicine, dirty data, leaked data, unredacted data, and wrong labels directly become model-behavior risks.

Core question:

```text
Where does a domain model's capability mainly come from: the model, or the data?
```

## 2. Chain of Questions

1. LoRA lowers training cost, but the training objective is still defined by data.
2. Raw domain documents cannot be directly turned into SFT samples.
3. Data needs source records, license boundaries, cleaning, deduplication, de-identification, and quality filtering.
4. SFT, RAG, distillation, and evaluation need different data forms.
5. High-risk domains must explicitly label refusal, uncertainty, and human-review boundaries.
6. Data versions must be reproducible; otherwise model versions cannot be explained.
7. Next chapter's question: even if data enters model parameters, knowledge goes stale. How can the model retrieve materials before answering?

## 3. Concept Card

| Concept | Mathematical object | Shape | Code object | Experimental object |
| --- | --- | --- | --- | --- |
| raw document | original material | text / PDF / HTML | `raw/` | source inventory |
| cleaned text | cleaned text | text chunks | `cleaned/` | noise rate |
| SFT example | instruction sample | messages | `sft.jsonl` | schema check |
| eval item | evaluation sample | input + expected | `eval.jsonl` | coverage |
| metadata | data lineage | dict | `source`, `license` | traceability |
| risk tag | risk category | labels | `risk_tags` | high-risk slices |

## 4. Data Layers

A domain project should at least separate data into four categories:

```text
raw data:      original documents; keep as immutable as possible and only append source metadata
cleaned data:  text after cleaning, deduplication, and de-identification
sft data:      instruction / messages / response
eval data:     never used for training; used only for capability and risk evaluation
```

Do not copy the same sample and call one copy train and another eval. The evaluation set must be independent of the training process; otherwise it only proves the model memorized the answer.

These four layers have different lifecycles. Raw data should be as immutable as possible for traceability. Cleaned data can be regenerated as cleaning rules improve. SFT data is the training objective. Eval data is the acceptance standard. Mixing them in one directory turns every later training run into archaeology.

The same contract clause should become different data forms at different stages:

```text
raw doc -> cleaned chunk -> SFT message -> eval item -> distill prompt
```

For example, "赔偿一切损失，包括间接损失、可得利益损失及律师费":

| Form | What is saved | Use |
| --- | --- | --- |
| raw doc | original redacted contract, source, version | traceability and license review |
| cleaned chunk | clause text, clause number, source_id | RAG retrieval |
| SFT message | user instruction + assistant risk JSON | train output format and boundaries |
| eval item | input, expected_behavior, risk_tags | evaluation and regression |
| distill prompt | query + retrieved_context + teacher config | generate candidate distillation samples |

Do not substitute one for another. SFT samples are not a RAG knowledge base, and eval items are not training samples.

A practical rule: for any data that enters model parameters, know which raw source it came from; for any data used in evaluation, be able to prove it did not enter training.

### Freeze the eval set early

Many projects train first, see promising results, and then assemble an eval set afterward. This is risky because it is easy to include samples that were already seen, tuned against, or hand-selected during training.

A safer approach is:

```text
define intended use / out-of-scope use first
-> write a small eval set first
-> then build SFT / RAG / distillation data
-> run the same eval after every training run
```

The eval set does not have to be large at the start, but it must be independent, traceable, and versioned. Otherwise, the evaluation report only says "the examples selected this time look good," not that the model truly improved.

## 5. Data Record Fields

Each domain sample should contain at least:

```json
{
  "id": "contract_000123",
  "source_id": "doc_2026_001",
  "source_type": "contract_clause",
  "created_by": "manual|rule|teacher_model",
  "license": "internal_review_only",
  "usage_scope": ["train", "eval", "rag"],
  "contains_personal_data": false,
  "risk_tags": ["contract", "liability", "needs_human_review"],
  "messages": [
    {"role": "system", "content": "你是谨慎的合同风险分析助手。"},
    {"role": "user", "content": "分析以下条款的风险：..."},
    {"role": "assistant", "content": "该条款可能存在..."}
  ]
}
```

These fields look verbose, but later they answer three key questions:

1. Which batch of data created this capability?
2. If the model fails, can we locate the source sample?
3. Is this sample allowed for training, evaluation, or publication?

Raw data is not the same as trainable data. Especially in law and medicine, just because something can technically be trained on does not mean it is allowed under license, privacy, or risk boundaries. License and usage boundaries belong in the manifest and data quality report.

## 6. Cleaning and Deduplication

Cleaning is not about making text look pretty. It reduces training noise:

- Remove headers, footers, tables of contents, watermarks, and garbled text.
- Normalize full-width/half-width characters, whitespace, line breaks, and numbering formats.
- Delete duplicate paragraphs and near-duplicate samples.
- Preserve structured numbering in legal clauses and medical guidelines.
- Mark uncertain sources instead of mixing them directly into the high-quality training set.

Near-duplicates are more dangerous than exact duplicates. Contract clauses, medical QA, and regulatory excerpts often differ by only a few words. If near-duplicates appear in both train and test, evaluation is inflated.

Deduplication must also distinguish "semantic duplicates" from "structural duplicates." In legal contracts, many clause templates are similar, but amounts, liability scope, or exceptions may differ. In medical materials, the same symptom may have different boundaries for adults, children, and pregnancy. Over-deduplication deletes important differences; under-deduplication causes leakage.

So the data quality report should record deleted samples and deletion reasons, not only the final count.

### Engineer near-duplicate checks

Near-duplicates should not be detected by eye alone. Add at least one coarse screening layer:

```text
character n-gram overlap
MinHash / SimHash
source_id / source_group deduplication
title, numbering, and clause-number rule matching
```

Legal and medical data often contains samples that "look different but are materially the same":

```text
same contract template with changed amount
same medical guideline with changed title
same teacher prompt producing multiple similar answers
```

If these near-duplicates enter both train and test, evaluation is inflated. The deduplication report should record:

```text
duplicate type
deleted sample id
kept sample id
deletion reason
```

## 7. De-identification and Risk Control

Legal and medical data should be assumed to contain privacy risk by default. De-identification should cover at least:

- names, ID numbers, phone numbers, addresses, medical record numbers, contract numbers.
- internal organization identifiers and trade secrets.
- rare fields that can identify individuals when combined.

After de-identification, keep the structure needed for the task. For example, contract amounts can be kept as `<AMOUNT>` and dates as `<DATE>`; otherwise the model loses contextual form needed for risk judgment.

High-risk samples should carry explicit labels:

```text
needs_human_review
medical_emergency
legal_advice_boundary
privacy_sensitive
insufficient_context
```

These labels later feed into evaluation, safe refusal, and the model card.

## 8. SFT Data Construction

Before constructing data, make component boundaries explicit:

| Component | Data form used | Main role | What it cannot replace |
| --- | --- | --- | --- |
| SFT | approved messages | learn output format, tone, and refusal boundaries | cannot guarantee factual freshness or real citations |
| LoRA | SFT / distill train split | reduce training cost | cannot repair dirty data |
| RAG | cleaned chunks + metadata | provide updatable evidence | cannot guarantee the model uses evidence correctly |
| Distillation | teacher outputs + filters | expand verifiable behavior samples | cannot treat the teacher as a fact source |
| Eval | frozen eval items | expose failures and regressions | must not participate in training |

An SFT sample is not an arbitrary rewrite of a document summary. Each sample should correspond to an observable capability:

- Format ability: output fixed JSON or tables.
- Terminology ability: use domain concepts correctly.
- Citation ability: identify which material supports the answer.
- Refusal ability: say unknown when evidence is insufficient.
- Boundary ability: do not replace a lawyer or doctor in final decision-making.

Low-quality SFT samples train the model to be fluent and wrong. It is better to start with 200 high-quality samples than to mix in 20,000 untraceable weak samples.

## 9. Distillation Data Construction

Distillation data comes from a teacher model, but the teacher is not a source of truth. Distillation samples must be filtered:

- Did the teacher cite the given material?
- Did it fabricate nonexistent clauses, diseases, or regulations?
- Did it express uncertainty?
- Did it cross legal/medical advice boundaries?
- Did it match the target output format?

Distillation samples should retain teacher model ID, prompt version, generation parameters, and filtering status.

## 10. Evaluation Data Construction

The eval set should cover both success and failure:

- Routine ability: correct extraction, explanation, and summarization.
- Factual ability: whether answers are supported by evidence.
- Format ability: whether output can be parsed by programs.
- Refusal ability: whether the model refuses when information is insufficient.
- Risk ability: whether high-risk scenarios prompt human review.
- Robustness: typos, missing fields, and overlong context.

Evaluation data should not be derived only by rewriting training data. Prefer splitting by source group so the same raw document cannot enter both train and test.

## 11. Data Quality Report

Before every training run, generate a data quality report:

```text
sample count
source distribution
length distribution
duplicate / near-duplicate rate
de-identification hit count
risk tag distribution
train/val/test split rules
schema error count
manual spot-check conclusion
```

The report is not decoration. It is the evidence chain for explaining model behavior.

The data quality report should be generated before training, not filled in after training fails. It helps catch problems early:

```text
one source dominates, so the model may become biased
too few high-risk tags, so safety eval will likely fail
sample length exceeds max_length, so answers will be truncated
duplicate rate is too high, so val loss will be artificially low
de-identification hits look abnormal, so there may be privacy leakage
```

Later eval reports and model cards should reference the data quality report. This connects model performance to data sources, cleaning, and risk tags instead of leaving it as isolated numbers.

A minimal `data_quality_report.md` can start with:

```markdown
# Data Quality Report

- dataset_version:
- raw_sources:
- license_or_usage_scope:
- split_rule:
- train_count / val_count / test_count:
- duplicated_or_near_duplicated_count:
- privacy_redaction_summary:
- risk_tag_distribution:
- max_length_overflow_count:
- schema_error_count:
- manual_spot_check_result:
- known_limitations:
```

The report does not need to be long at first, but it must be generated before training and referenced by the training config, eval report, and model card.

## 12. Required Experiments

- Run schema validation on SFT jsonl and count invalid roles, empty answers, and overlong samples.
- Check train/test duplicates and near-duplicates.
- Test de-identification hits on sensitive fields.
- Output a data quality report before training and write its path into the training config.
- Construct a set of refusal samples and verify they enter eval, not only train.
- Use the same contract clause to build an SFT sample, RAG chunk, distillation prompt, and eval item, observing how fields change.

## 13. Failure Modes

- Data source is untraceable: when the model fails, the source cannot be located.
- train/test leakage: metrics look high, but true generalization is poor.
- Over-cleaning: numbering, amounts, dates, and other key risk information are deleted.
- Only positive examples are collected: the model does not know when to refuse.
- Teacher distillation is not reviewed: hallucinations become domain knowledge.
- Data version is not fixed: the same training command produces a different model next time.

## 14. Test Acceptance

The tests in this chapter should at least verify:

1. Every SFT / eval sample has a unique `id` and `source_id`.
2. Message roles are limited to `system/user/assistant`.
3. train / val / test have no duplicate IDs and no duplicate source groups.
4. The de-identification function can replace phone numbers, ID numbers, and address placeholders in test samples.
5. The data quality report includes sample counts, length distribution, risk tags, and duplicate rate.

## 15. Memory Anchors and Boundaries

The most important sentence in this chapter is:

> A domain model's behavior is defined first by data; the fine-tuning method only writes that definition into the model or workflow.

Remember:

1. raw, cleaned, SFT, RAG, distill, and eval are different data forms.
2. Every sample should trace source, license, risk_tags, and usage boundaries.
3. The eval set should be independent of training and frozen early.
4. De-identification must not destroy task-essential structure.
5. The data quality report is a pre-training gate, not post-training decoration.

This chapter does not solve knowledge freshness and traceable answers. The next chapter moves into RAG.

## 16. Next Chapter

Even with good data engineering, writing all knowledge into parameters is unrealistic. Domain knowledge changes, and evidence needs to be traceable. The next chapter covers RAG: let the model retrieve external materials before answering.
