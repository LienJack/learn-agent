---
title: "Chapter 14: Model Evaluation"
description: "Chapter 13 produced a distilled student, but a model that \"can talk\" is not necessarily reliable. The most dangerous habit in LLM projects is repla..."
author: LienJack
pubDate: 2026-06-01
locale: en
tags:
  - LLM Learning
  - LLM
  - AI
---
# Chapter 14: Model Evaluation

## 1. The Real Problem This Chapter Solves

Chapter 13 produced a distilled student, but a model that "can talk" is not necessarily reliable. The most dangerous habit in LLM projects is replacing evaluation with a few good-looking examples, and using averages to hide high-risk failures.

This chapter adds the ability to decompose model quality into an evaluation system that can be rerun, explained, and traced back to failure cases.

Core question:

```text
The model seems fluent. How do we prove it actually improved?
```

## 2. Chain of Questions

1. Lower training loss only proves that the model better fits the training objective.
2. The eval set defines the real capabilities and risk boundaries to test.
3. Metrics turn outputs into comparable numbers, but each number must trace back to samples.
4. Automatic evaluation works well for format, citation, retrieval, and some factual checks.
5. Human scoring is needed for safety, completeness, professionalism, and boundary judgment.
6. A failure-case table guides the next round of data and training better than an average score.
7. Next chapter's question: once evaluation exposes high-risk boundaries, how do we write them into safety, compliance, and model cards?

## 3. Concept Card

| Concept | Mathematical object | Shape | Code object | Experimental object |
| --- | --- | --- | --- | --- |
| eval item | test sample | dict | `EvalExample` | gold / rubric |
| prediction | model output | text / JSON | `Prediction` | output parsing |
| metric | scoring function | scalar | `metrics.py` | slice scores |
| rubric | scoring standard | levels | `rubric.md` | human consistency |
| slice | sample subset | tags | `risk_tags` | high-risk performance |
| report | evidence summary | markdown/json | `eval_report.md` | regression comparison |

## 4. Eval Set Design

An evaluation set is not a random sample from the training data. It should cover capability, risk, and failure boundaries:

```text
capability: what the model should be able to do
format: whether output can be parsed by programs
grounding: whether the answer is supported by evidence
refusal: whether the model refuses when materials are insufficient
safety: whether it avoids out-of-bound advice
robustness: whether it stays stable under noisy input
```

Each eval sample should contain at least:

```json
{
  "id": "eval_0001",
  "input": "...",
  "expected_behavior": "指出风险并引用来源；资料不足则拒答",
  "gold_facts": ["..."],
  "required_citations": ["doc_001#chunk_03"],
  "risk_tags": ["contract", "needs_human_review"],
  "rubric": "legal_contract_risk_v1"
}
```

The easiest mistake is treating the eval set as "a held-out percentage of the training set." For domain models, the eval set is closer to a product acceptance checklist: it should not only ask whether the model can answer, but whether it remains controlled under insufficient evidence, high risk, strict formats, user inducement, and long-context pressure.

Eval samples should therefore be explicitly stratified:

```text
normal capability cases: routine questions in the target scenario
hard capability cases: tasks requiring multi-step reasoning or long context
negative cases: no answer in the knowledge base or insufficient evidence
format cases: must output JSON / citations / fields
safety cases: law, medicine, privacy, out-of-bound advice
regression cases: samples that failed before, were fixed, and must not break again
```

Do not try to create a huge eval set on day one. A teaching project can start with 20-50 high-quality samples, but every sample needs `id`, source, expected behavior, risk tags, and a rubric. A small auditable eval set is more valuable than a large spreadsheet with unclear provenance.

Eval samples must also avoid training leakage. Chapters 9 and 13 emphasized splitting by `source_group`; evaluation needs the same rule. If the same contract, medical document, or teacher generation batch appears in both training and evaluation, metrics become unrealistically high.

## 5. Metric Layer

Different tasks need different metrics:

- Format accuracy: whether JSON is parseable and fields are complete.
- Citation accuracy: whether citations exist and support the answer.
- Factual accuracy: whether answer facts match gold facts or evidence.
- Refusal accuracy: whether no-answer/high-risk questions are refused.
- Recall: whether RAG retrieves chunks containing the answer.
- Human score: professionalism, completeness, risk expression, usability.

Averages must be paired with slice scores:

```text
overall_score
by_domain
by_risk_tag
by_prompt_type
by_document_source
by_answerability
```

Otherwise, a model may perform well on ordinary samples and fail badly on high-risk ones.

A practical metric table can be divided into three layers:

| Layer | Examples | Purpose |
| --- | --- | --- |
| Structure metrics | JSON parse rate, field completeness | decide whether output can enter downstream systems |
| Evidence metrics | citation existence, citation support, retrieval recall | decide whether answers are traceable |
| Behavior metrics | refusal accuracy, risk flag recall, human score | decide whether behavior matches task boundaries |

Metric design should avoid numbers that look precise but measure the wrong thing. For example, citation existence only proves that a citation string exists; it does not prove the citation supports the answer. JSON parse rate only proves the format is parseable, not that the content is correct. Reports should state what each metric measures and what it does not measure.

### Metrics should become release gates

Evaluation is not only for producing nice tables. Domain models should have release thresholds:

```text
json_valid_rate >= 0.98
citation_support_rate >= 0.90
unknown_when_no_evidence_rate >= 0.95
high_risk_unsafe_answer_rate == 0
privacy_leak_rate == 0
p95_latency_ms <= target
```

Thresholds can change by project stage, but they must be written down in advance. Otherwise teams easily ignore high-risk regression when the average score improves.

Release gates turn "cannot ship" conditions into programs and reports instead of decisions made by feel in the final meeting.

## 6. Automatic Evaluation

Automatic evaluation is suitable for programmatically verifiable targets:

```text
parse_json(output)
check_required_fields(output)
check_citation_exists(output, knowledge_base)
check_answer_contains_refusal(output)
check_retrieved_gold_chunk(top_k)
```

For factual judgment, rules, gold facts, retrieved evidence, or a judge model can help, but the judge model cannot become the only evidence. High-risk scenarios need human spot-checking or full human review.

### Judge models need calibration

LLM-as-judge can help judge factual support, completeness, and safety boundaries, but it should not be treated as truth.

At minimum, build a small calibration set:

```text
human-label 20-50 samples
judge model scores them
compare judge-human agreement
record where the judge is easy to mislead
```

If a judge prefers longer, more polite, expert-sounding answers, it may overrate fluent but unsupported outputs. High-risk legal/medical samples must retain human spot-checking or full review.

## 7. Human Scoring

Human scoring needs a rubric; it cannot rely on "feels good":

```text
5: fully satisfies the task, facts are evidence-supported, boundaries are clear
4: minor issues that do not affect use
3: partially correct, but missing key evidence or boundaries
2: clear errors, requires human correction
1: dangerous, hallucinated, out-of-bound, or unusable format
```

When multiple people score, record disagreement. Samples with large disagreement often indicate that the task definition or rubric is unclear.

## 8. Eval Runner

Minimal evaluation runner:

```text
load eval set
for each example:
    build prompt
    run model / RAG pipeline
    parse output
    compute automatic metrics
    save prediction
aggregate metrics
write eval_report.md
write failure_cases.csv
```

Every evaluation run should save:

- model ID / adapter ID / checkpoint.
- tokenizer and chat template versions.
- RAG index version.
- generation config.
- eval set version.
- raw predictions.

A report without raw predictions is not auditable.

An auditable prediction record should look like:

```json
{
  "eval_id": "eval_0001",
  "model_id": "legal-student-v2",
  "input": "...",
  "raw_output": "...",
  "parsed_output": {"risk_level": "medium"},
  "metrics": {
    "json_valid": true,
    "citation_exists": true,
    "refusal_correct": false
  },
  "latency_ms": 842,
  "generation_config": {"temperature": 0.2, "max_new_tokens": 512}
}
```

Save both `raw_output` and `parsed_output`. If you save only parsed JSON, you lose important failure clues such as the model bypassing format, adding explanations, or outputting multiple text blocks. If you save only raw text, metrics are hard to aggregate.

In a teaching project, the runner can first use a local fake model or rule function instead of a real LLM. The important part is running the `load -> predict -> parse -> score -> aggregate -> report` evaluation skeleton.

## 9. Failure-Case Table

A failure-case table should include at least:

```text
eval_id
input
expected_behavior
model_output
metric_failures
risk_tags
suspected_root_cause
next_action
```

Common root causes:

- Data gap: no similar task in training data.
- Retrieval failure: RAG did not find the right material.
- Weak prompt constraints: the model improvises.
- Insufficient model capacity: the student cannot learn complex reasoning.
- Not enough safety samples: refusal boundary is unclear.

The failure-case table is not an appendix; it is the entry point for the next round of work. Each failure should map to an action:

```text
data_gap -> add training or distillation samples
retrieval_gap -> tune chunk / embedding / top_k / query rewrite
prompt_gap -> strengthen output contract or refusal conditions
metric_gap -> modify evaluation logic to avoid missed failures
safety_gap -> add safety eval and human review
product_gap -> clarify that this scenario is unsupported
```

If a failure case cannot be attributed, you do not yet have enough evidence to review it. Add logs, save intermediate retrieval results, or add human review instead of immediately "training again to see what happens."

## 10. Regression Evaluation

Every change to data, prompts, adapters, RAG indexes, or decoding parameters should run the same regression eval. The report should answer:

```text
Which metrics improved?
Which metrics regressed?
Which high-risk samples still fail?
Were new format errors introduced?
Are there trade-offs in cost, latency, or refusal rate?
```

Do not ship only the version with the highest average score. Domain models usually require trade-offs among accuracy, refusal rate, latency, and safety.

A regression report should include direction of change, not only the new score:

| metric | old | new | delta | gate |
| --- | ---: | ---: | ---: | --- |
| json_valid_rate | 0.96 | 0.99 | +0.03 | pass |
| citation_support_rate | 0.84 | 0.81 | -0.03 | review |
| high_risk_refusal_rate | 0.92 | 0.88 | -0.04 | fail |

This makes trade-offs visible. A version may improve average score while breaking high-risk refusal; in a domain project, that version should fail, not ship because a leaderboard number looks good.

## 11. Running Experiment: Start With 5 Samples

The minimal experiment in this chapter can contain only 5 eval items:

1. One ordinary answerable question.
2. One contract-risk question requiring JSON format.
3. One question that must cite specified material.
4. One question with no answer in the knowledge base.
5. One high-risk medical or legal question.

For each sample, save prediction, automatic metrics, and failure reason. Then manually create two model versions:

```text
base: outputs free text; format and citation often fail
student: outputs more stable structure, but may still over-answer high-risk samples
```

Even without training a real model, you can see the value of the evaluation system: it tells you exactly where the model fails instead of merely saying "it seems okay."

## 12. Required Experiments

- Write `eval_runner.py` to run a fixed eval set.
- Write `metrics.py` to compute format accuracy, citation existence rate, and refusal accuracy.
- Generate `eval_report.md` and `failure_cases.csv`.
- Compare base / SFT / LoRA / RAG / distilled student.
- Build high-risk slices and report legal/medical refusal and human-review prompts separately.
- Write a release-gate threshold file and verify that release checks fail when high-risk failures occur or p95 latency exceeds the target.

## 13. Failure Modes

- Training samples are used as eval: metrics are inflated.
- Only averages are inspected: high-risk failures are hidden.
- Judge model is uncalibrated: automatic scoring looks objective but favors a writing style.
- Predictions are not saved: failures cannot be reviewed.
- Eval set is too small: one sample changes the conclusion.
- Cost and latency are ignored: the model works but cannot be deployed.

## 14. Test Acceptance

The tests in this chapter should at least verify:

1. eval item schema is valid and IDs are unique.
2. `eval_runner.py` outputs predictions, metrics, and a report.
3. JSON format metrics correctly distinguish valid and invalid output.
4. Citation metrics detect missing citations or citations that do not support the answer.
5. Regression report can compare metric differences between two model versions.

## 15. Memory Anchors and Boundaries

The most important sentence in this chapter is:

> Evaluation is not proving that the model "looks good"; it turns capability, failure, risk, and regression into a repeatable evidence chain.

Remember:

1. The eval set is a product acceptance checklist, not a held-out ratio from training.
2. Average scores must be paired with slice scores.
3. Automatic metrics can check structure and some evidence, but cannot replace human risk judgment.
4. Failure cases are the entry point for the next round of data, RAG, prompts, and safety strategy.
5. Regression eval prevents a new version from fixing one problem while breaking another.

This chapter does not define full release boundaries. The next chapter covers safety, compliance, and model cards.

## 16. Next Chapter

Evaluation exposes where the model should not answer, should warn, or should hand off to a human. The next chapter covers safety, compliance, and model cards, writing these boundaries into required pre-release documentation and tests.
