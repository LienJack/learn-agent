---
title: "Chapter 15: Safety, Compliance, and Model Cards"
description: "Chapter 14 made model failures visible. This chapter turns failure boundaries into engineering contracts that must be checked, disclosed, and monit..."
author: LienJack
pubDate: 2026-06-01
locale: en
tags:
  - LLM Learning
  - LLM
  - AI
---
# Chapter 15: Safety, Compliance, and Model Cards

## 1. The Real Problem This Chapter Solves

Chapter 14 made model failures visible. This chapter turns failure boundaries into engineering contracts that must be checked, disclosed, and monitored before release. Especially in legal and medical settings, a model cannot only aim to sound right; it must know when not to answer and when to require human review.

This chapter does not provide legal or medical compliance advice. It builds a framework for safety documentation and release gates.

Core question:

```text
Legal/medical domain models cannot only aim to answer convincingly; they must know when they cannot answer.
```

## 2. Chain of Questions

1. Evaluation reveals capability boundaries and risky failures.
2. High-risk tasks need refusals, disclaimers, uncertainty expression, and human review.
3. Safety test sets turn these boundaries into repeatable acceptance checks.
4. A model card documents use cases, limitations, data, evaluation, risks, and responsibility boundaries.
5. A risk report records unresolved risks and release conditions.
6. Human review decides whether the model can enter a real workflow.
7. Next chapter's question: after safety boundaries are clear, how do we deploy and monitor the model at low cost?

## 3. Concept Card

| Concept | Mathematical object | Shape | Code object | Experimental object |
| --- | --- | --- | --- | --- |
| safety policy | behavior rules | text/rules | `policy.md` | refusal boundaries |
| refusal set | refusal samples | eval items | `refusal_eval.jsonl` | refusal rate |
| risk tag | risk category | labels | `risk_tags` | slice report |
| model card | transparency report | markdown | `model_card.md` | release document |
| risk report | risk register | markdown/csv | `risk_report.md` | go/no-go |
| human review | human gate | workflow | `review_status` | approval record |

## 4. Risk Classification

A domain model should distinguish at least:

- Low risk: explain concepts, summarize public materials, transform format.
- Medium risk: analyze contract clauses, explain medical education materials, provide general guidance.
- High risk: case-specific legal judgment, diagnosis, treatment advice, emergency symptom handling, privacy data handling.
- Prohibited or requires human handoff: requesting conclusions despite insufficient evidence, asking to bypass rules, asking the model to replace professional decision-making.

Risk classification should enter data, evaluation, logs, and reports. It should not live only in the README.

Risk classification is not for pretty labels; it drives different handling paths. A low-risk sample can be answered automatically. A medium-risk sample may need stronger citations and uncertainty expression. A high-risk sample may require refusal, human review, or escalation.

A simple decision table can express this:

| Risk level | Allowed behavior | Required behavior | Prohibited behavior |
| --- | --- | --- | --- |
| low | summarize, explain, rewrite | keep sources traceable | fabricate sources |
| medium | give general risk notes | express uncertainty, provide citations | give final professional conclusion |
| high | warn about risk, recommend human review | `needs_human_review=true` | replace lawyer/doctor decisions |
| blocked | refuse or request redaction | explain reason and safe alternative path | process private or dangerous requests |

This table later enters prompts, SFT samples, eval sets, model cards, and release gates. If safety boundaries only live in documentation and not in data or tests, the next fine-tuning run can easily break them.

## 5. Refusal and Uncertainty

Refusal is not simply saying "I can't answer." A good refusal explains why and offers a safe alternative:

```text
insufficient materials: explain what information is missing.
high risk: recommend qualified professionals or human review.
privacy risk: request redaction or refuse processing.
out-of-bound request: explain that specific legal/medical action cannot be provided.
```

The model must also learn uncertainty expression:

```text
Based on the current materials, this cannot be confirmed...
This is not a diagnosis or legal opinion...
Points requiring human review include...
```

Uncertainty expression must be evaluated. Otherwise, the model may treat the disclaimer as boilerplate while still giving overconfident conclusions in the main answer.

A qualified refusal usually has four parts:

```text
boundary: why the model cannot answer directly
missing_info_or_risk: what information is missing, or where the risk lies
safe_alternative: what safe next step the user can take
no_fabrication: do not fabricate evidence or pretend certainty
```

In a medical example, if the user asks "I have chest pain but don't want to go to the hospital; what medicine can relieve it?", the model should not only say "I cannot provide medical advice." A better behavior is to point out that chest pain may be a warning sign, cannot be diagnosed through chat, avoid specific dosage advice, recommend urgent care or emergency services, and possibly provide general guidance on how to describe symptoms before seeking care.

Legal scenarios are similar. If the user asks "Can this contract clause guarantee that I win?", the model should explain that it cannot provide final legal judgment. It can only identify risk points, missing information, and items requiring lawyer review based on the provided clause.

### Over-refusal is also a failure

Safety does not mean refusing everything. If a domain assistant refuses low-risk education, format conversion, and material summaries, users may bypass the system or disguise truly high-risk questions as low-risk requests.

So safety evaluation must look at two types of errors:

```text
unsafe_answer: answered when it should not
over_refusal: refused when it could safely answer
```

Good safety behavior is layered, not simple rejection:

```text
low risk: answer normally, keep sources
medium risk: provide general information, express uncertainty and boundaries
high risk: warn, recommend human review or professional help
blocked scenario: refuse and provide a safe alternative path
```

This keeps the model from bouncing between "dangerous" and "useless."

## 6. Safety Test Set

A safety test set should include:

- No-answer questions: no support in the knowledge base.
- Ambiguous questions: missing key facts.
- High-risk medical symptoms: require care or emergency guidance.
- High-risk legal cases: require lawyer review.
- Privacy data: contains IDs, medical record numbers, contact information.
- Prompt injection: asks the model to ignore system rules or reveal internal prompts.
- Misleading citations: provides wrong or irrelevant sources.

Each sample should state expected behavior, not only expected answer:

```json
{
  "id": "safety_0001",
  "input": "...",
  "expected_behavior": "拒绝给出诊断；建议及时就医；不编造依据",
  "risk_tags": ["medical", "emergency", "needs_human_review"]
}
```

## 7. Model Card

A model card is the model's accompanying explanation, not a marketing page. It should include at least:

- Model name, version, base model, adapter, training date.
- Intended use: applicable scenarios.
- Out-of-scope use: unsupported and prohibited scenarios.
- Training data: sources, cleaning, de-identification, license boundaries.
- Evaluation: eval set, metrics, slice scores, failure cases.
- Limitations: known weaknesses and things not guaranteed.
- Safety: refusal boundaries, human review requirements, privacy handling.
- Deployment: inference config, monitoring, rollback conditions.
- Contact / owner: responsible maintainer.

The purpose of a model card is transparent reporting, so users understand what the model can do, what it cannot do, and how it was evaluated.

A useful model card should answer questions for three groups:

```text
users: what tasks is this model suitable for, and when should I not trust it?
maintainers: what data, configuration, evaluation, and version produced it?
reviewers: what residual risks remain, and what are release and rollback conditions?
```

So a model card cannot only say "this model reached 90% on eval." It should link to the eval report, failure cases, and risk report. For domain models especially, limitations and failure cases are not a weakness; they are part of responsible release.

## 8. Risk Report

A risk report supports release decisions. It answers:

```text
Which risks remain unresolved?
Which risks are mitigated technically?
Which risks require process mitigation?
Which scenarios are prohibited from launch?
Who has authority to approve release?
Which metrics are monitored after launch?
What conditions trigger rollback?
```

A risk item can be recorded like:

```text
risk_id: R-LEGAL-003
description: 模型可能在证据不足时给出合同风险等级
severity: high
mitigation: RAG citation required + refusal eval + human review
residual_risk: medium
owner: domain_reviewer
release_gate: refusal accuracy >= threshold
```

The difference between a risk report and a model card is this: the model card is for transparent explanation; the risk report is for go / no-go decisions. The first tells others what the model is. The second tells the team whether it can ship, under what conditions, and who is responsible if something goes wrong.

Risk items should also keep status:

```text
open: not mitigated; cannot release or only internal experiments allowed
mitigated: technical or process mitigation exists, but monitoring is still required
accepted: business/review owner accepts residual risk
blocked: this risk prohibits launch
```

If every risk is marked "mitigated," usually the model is not perfectly safe; the review is not honest enough.

## 9. Human Review

Legal/medical models should not be released by automatic evaluation alone. Human review should cover at least:

- high-risk failure cases.
- refusal samples.
- privacy and de-identification samples.
- representative real tasks.
- model card and risk report.

Human review conclusions should be traceable: who reviewed which version, what they found, and whether release was allowed.

Human review does not mean experts read the entire dataset from start to finish. A more practical pattern combines sampling and targeted review:

```text
stratified sample: review some samples from each risk tag
failure-focused review: review all automatically failed samples
boundary review: focus on refusal, human handoff, privacy, high-risk samples
release review: review model card, risk report, and failure-case table together
```

When multiple reviewers are involved, record disagreement. High-disagreement samples may mean the model is wrong, or the task itself is ambiguous. Either way, the fix should go back into the rubric, data labels, or product boundaries.

## 10. Release Gates

Safety is not finished after writing the model card. Before release, there should be hard gates:

```text
required_docs: model_card + risk_report + eval_report
required_metrics: safety eval passes; high-risk out-of-bound answers are 0 or enter human approval
required_process: owner, reviewer, rollback target are clear
required_data_controls: private samples are redacted, logging policy is clear
required_monitoring: refusal rate, missing-citation rate, safety flag ratio are observable
```

More measurable metrics can be:

```text
high_risk_unsafe_answer_rate == 0
high_risk_human_review_recall >= threshold
false_reassurance_rate == 0
privacy_leak_rate == 0
over_refusal_rate <= threshold
```

If a model only runs in a notebook but has no release gates, it is still only an experiment. Domain model engineering turns "cannot ship" conditions into automatic or semi-automatic checks.

### Safety policy should enter code, not only documents

Model cards and risk reports matter, but production systems also need policy-as-code:

```text
pre_filter: detect privacy, high risk, prompt injection
generation_policy: control whether RAG is allowed and whether citation is required
post_filter: check out-of-bound advice, missing citations, unsafe answers
release_gate: check reports, metrics, owners, rollback target
monitoring: record safety flags, refusal rate, human-review rate
```

A minimal `safety_policy.yaml` can start as:

```yaml
high_risk:
  require_human_review: true
  allow_final_decision: false
  require_citation: true
medical_emergency:
  require_seek_care_suggestion: true
  allow_medication_dosage: false
legal_advice_boundary:
  allow_case_outcome_prediction: false
  require_uncertainty: true
privacy:
  require_redaction: true
  allow_raw_logging: false
```

If safety boundaries live only in documents, the next fine-tune, prompt change, or RAG-index update can break them.

## 11. Required Experiments

- Write `refusal_eval.jsonl` covering no-answer, high-risk, privacy, and prompt-injection cases.
- Run safety evaluation and output refusal accuracy and out-of-bound answer rate.
- Fill out `model_card_template.md`.
- Generate `risk_report.md` with at least 5 risks and mitigations.
- Record human review for high-risk failure cases.
- Add over-refusal eval: low-risk material summaries should be answered safely, not always refused.

## 12. Failure Modes

- The disclaimer appears only at the beginning, while the body still gives definite advice.
- The answer starts with "not legal/medical advice" but then gives definite treatment, dosage, litigation outcome prediction, or final conclusion.
- Safety samples are not included in regression eval, so a new version breaks old boundaries.
- The model card lists strengths but not limitations or failures.
- Risk ownership is unclear: no one is responsible for post-release issues.
- Only automatic evaluation is run; real high-risk outputs are not inspected.
- Private data is logged without redaction or access control.
- Over-refusal: the model refuses low-risk questions and becomes unusable.
- Only a disclaimer is added: it says "I am not a doctor" at the top while giving specific drug dosage in the body.

## 13. Test Acceptance

The tests in this chapter should at least verify:

1. Safety eval samples contain `risk_tags` and `expected_behavior`.
2. Refusal metrics can identify outputs that refuse while providing a safe alternative.
3. Required model card fields are not empty.
4. Risk report contains at least severity, mitigation, owner, and release gate.
5. High-risk samples must have `needs_human_review` or an equivalent tag.
6. Over-refusal metrics can identify low-risk answerable questions that were incorrectly refused.

## 14. Memory Anchors and Boundaries

The most important sentence in this chapter is:

> Safety is not one disclaimer; it is an engineering contract maintained jointly by data, evaluation, documentation, process, and release gates.

Remember:

1. High-risk tasks need refusal, uncertainty, and human review.
2. A disclaimer cannot hide out-of-bound content in the main answer.
3. Over-refusal is also a failure.
4. The model card is for transparent explanation; the risk report is for go/no-go.
5. Safety policy must enter regression eval and release gates.

This chapter does not solve low-cost model serving. The next chapter covers quantization and deployment.

## 15. Next Chapter

Once safety boundaries and release documentation are ready, we still need to run the model. The next chapter covers quantization and deployment: engineering trade-offs among cost, latency, throughput, observability, and rollback.
