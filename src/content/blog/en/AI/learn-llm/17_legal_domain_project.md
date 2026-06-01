---
title: "Chapter 17: Legal Domain Small-Model Project"
description: "The first 16 chapters covered training, language models, tokenizers, Transformers, Hugging Face, SFT, LoRA, data engineering, RAG, distillation, ev..."
author: LienJack
pubDate: 2026-06-01
locale: en
tags:
  - LLM Learning
  - LLM
  - AI
---
# Chapter 17: Legal Domain Small-Model Project

## 1. The Real Problem This Chapter Solves

The first 16 chapters covered training, language models, tokenizers, Transformers, Hugging Face, SFT, LoRA, data engineering, RAG, distillation, evaluation, safety, and deployment. This chapter combines them into a legal contract review project.

This project is not a legal-advice system and does not replace lawyers. It is a teaching project: given contract clauses, it outputs risk notes, evidence, suggested revisions, uncertainty notes, and routes high-risk scenarios to human review.

Core question:

```text
How do we combine fine-tuning, RAG, distillation, and evaluation into a legal contract review small model?
```

## 2. Chain of Questions

1. Contract review needs to identify clause risks, not hold generic conversations.
2. Contract corpora need de-identification, source records, and risk tags.
3. SFT teaches the model the contract-risk output format.
4. RAG provides clause libraries, templates, and internal review guidelines as evidence.
5. LoRA reduces the cost of domain fine-tuning.
6. Distillation transfers strong-model review examples into a small model.
7. Evaluation, safety, and model cards decide whether the project can be demonstrated or released.
8. Next chapter's question: how does the same engineering loop transfer to a medical education assistant?

## 3. Concept Card

| Concept | Mathematical object | Shape | Code object | Experimental object |
| --- | --- | --- | --- | --- |
| contract clause | contract-clause text | text | `clause` | risk detection |
| risk point | risk structure | JSON object | `risk_points` | issue / evidence |
| review guideline | review evidence | chunks | RAG knowledge base | citation |
| SFT sample | instruction sample | messages | `contract_sft.jsonl` | output format |
| human review | human check | status | `needs_human_review` | high-risk gate |
| model card | release explanation | markdown | `model_card.md` | use limits |

## 4. Project Directory

```text
legal_contract_review/
├── data/
│   ├── raw/
│   ├── cleaned/
│   ├── sft/
│   └── eval/
├── sft/
│   ├── build_dataset.py
│   └── train_lora.py
├── rag/
│   ├── chunk_documents.py
│   ├── build_index.py
│   └── rag_pipeline.py
├── distill/
│   ├── generate_teacher_data.py
│   └── filter_distill_data.py
├── eval/
│   ├── evaluate.py
│   ├── metrics.py
│   └── failure_cases.csv
├── reports/
│   ├── eval_report.md
│   ├── risk_report.md
│   └── model_card.md
└── README.md
```

The directory itself is a learning deliverable: every file corresponds to a capability from earlier chapters.

## 5. Data Design

Contract review data should at least include three categories:

```text
contract clauses: redacted contract clauses
review guidelines: internal review rules or public templates
risk examples: risk level, risk point, evidence, suggestion
```

SFT sample format:

```json
{
  "id": "contract_sft_0001",
  "source_id": "contract_doc_001",
  "risk_tags": ["liability", "needs_human_review"],
  "messages": [
    {"role": "system", "content": "你是谨慎的合同风险分析助手，不提供最终法律意见。"},
    {"role": "user", "content": "分析以下条款：<CLAUSE>..."},
    {"role": "assistant", "content": "{\"risk_level\":\"medium\",\"risk_points\":[...],\"basis\":[...],\"suggestion\":\"...\",\"uncertainty\":\"需律师复核\"}"}
  ]
}
```

All real contracts must be de-identified. Amounts, dates, and party roles can be kept as placeholders so the model can learn contract structure.

The most important thing about contract data is not volume. It is clear source, labels, and boundaries. A trainable sample should answer at least:

```text
Where did this clause come from?
Has it been de-identified?
Who labeled the risk tags?
What evidence supports the answer?
Does it require human review?
Is it allowed in training, evaluation, or only as an internal example?
```

De-identification cannot only replace company names with "a company." Contracts may also contain amounts, accounts, addresses, contacts, project names, transaction structures, and performance schedules. A teaching project can preserve structure while replacing sensitive values with placeholders:

```text
甲方 -> PARTY_A
乙方 -> PARTY_B
人民币 120 万元 -> AMOUNT_1
2026 年 5 月 28 日 -> DATE_1
北京市朝阳区... -> ADDRESS_1
```

This lets the model learn contract language and risk structure without memorizing real entity information.

### Legal materials must record jurisdiction and version

Contract risk does not exist independently of place and time. A clause may carry different risk under different jurisdictions, regulation versions, or contract types.

Therefore, legal knowledge bases and samples should record at least:

```text
jurisdiction
source_name
source_version
published_at / effective_at
document_type
license_or_usage_note
```

If the material version is unclear, the model should not give a definite legal conclusion. The correct behavior is:

```text
risk_level = "unknown"
needs_human_review = true
uncertainty = "缺少适用管辖区或资料版本，无法给出确定判断"
```

This is not excessive caution. It is a basic boundary for legal-domain models.

## 6. Output Contract

A contract review model should not improvise freely. A fixed JSON output is recommended:

```json
{
  "risk_level": "low|medium|high|unknown",
  "jurisdiction": "unknown|CN|other",
  "risk_points": [
    {
      "issue": "...",
      "why_it_matters": "...",
      "evidence": ["source_id#chunk_id"],
      "suggested_revision": "...",
      "confidence": "low|medium|high"
    }
  ],
  "uncertainty": "...",
  "legal_advice_boundary": true,
  "needs_human_review": true
}
```

Once the format is fixed, evaluation and human review can run consistently.

The output contract serves three goals:

1. Provide readable risk notes to the user.
2. Provide structured fields parseable by the system.
3. Provide a traceable evidence chain to auditors.

So `risk_points` should not only say "there is breach risk." It should split issue, reason, evidence, and suggestion:

```json
{
  "issue": "违约责任范围过宽",
  "why_it_matters": "条款要求 PARTY_A 对所有间接损失负责，可能超出常见责任边界",
  "evidence": ["guideline_002#chunk_04"],
  "suggested_revision": "建议限定为直接损失，并增加责任上限",
  "needs_human_review": true
}
```

If the model cannot find evidence, the correct behavior is not to fabricate reasons, but to output `risk_level="unknown"` and set `needs_human_review` to `true`.

Here, `suggested_revision` is not final legal advice. It is a revision direction for human review. The model must not promise that "this revision will definitely work," nor judge case outcomes from one clause.

## 7. RAG Design

The knowledge base can include:

- contract templates and clause libraries.
- internal review guidelines.
- public legal education materials.
- approved example explanations.

RAG pipeline:

```text
clause query
  -> retrieve similar clauses / guidelines
  -> build context with source ids
  -> ask model to analyze only with evidence
  -> output JSON + citations
```

If no relevant evidence exists, the model should output `risk_level="unknown"` and explain that human review is needed.

## 8. Fine-Tuning and Distillation

Training route:

```text
base instruct model
  -> LoRA SFT on approved contract examples
  -> RAG teacher generates hard cases
  -> filter distilled examples
  -> train student adapter
```

Do not let the teacher directly generate unreviewable legal conclusions. Teacher outputs must preserve evidence, prompt version, filtering status, and human spot-check results.

In this project, SFT, RAG, and distillation solve different problems:

| Component | Main role | What it cannot replace |
| --- | --- | --- |
| SFT | learn contract review output format and basic expression | cannot guarantee real citations |
| RAG | provide clause library and review guideline evidence | cannot guarantee the model uses evidence correctly |
| LoRA | lower the cost of domain-format training | cannot compensate for bad data |
| Distillation | expand high-quality review examples | cannot treat teacher output as truth |
| Eval | expose risk, format, and citation failures | cannot automatically fix failures |

The capstone project's key is connecting these components into a loop, not merely making each component run alone.

## 9. Evaluation Design

The eval set should cover at least:

- Risk identification: whether key risks are found.
- Clause explanation: whether the reason for risk is clear.
- Revision suggestions: whether suggestions are concrete without overpromising.
- Citation checks: whether evidence comes from retrieved materials.
- Refusal ability: whether the model outputs unknown when evidence is insufficient.
- High-risk review: whether `needs_human_review` is marked.
- Format accuracy: whether JSON is parseable.

The report must compare:

```text
base model
SFT LoRA
RAG pipeline
distilled student
```

Legal evaluation cannot only ask "does the risk level match." A model may correctly classify high risk while giving a wrong reason. Or a citation may exist but not support the conclusion. Recommended metrics:

```text
json_valid_rate: whether output parses
risk_level_accuracy: whether risk level matches labels
risk_point_recall: whether key risk points are found
citation_support_rate: whether citations support risk points
unknown_when_no_evidence_rate: whether the model refuses judgment when evidence is absent
human_review_recall: whether high-risk cases trigger human review
```

Failure cases should be categorized by root cause: data gap, retrieval failure, output-format failure, excessive legal conclusion, safety-boundary failure. Only then does the next round know whether to add data, change RAG, adjust prompts, or revise product boundaries.

## 10. Safety Boundaries

The project must make clear:

- Output is risk prompting, not final legal advice.
- High-risk clauses require human review.
- When materials are insufficient, the model must not fabricate evidence.
- Unredacted personal or trade-secret data should not be processed.
- The model must not derive a complete legal conclusion from a single clause.

Safety boundaries should enter the system prompt, SFT samples, safety eval, model card, and README.

## 11. Deployment Loop

Minimal demo API:

```text
POST /review-contract-clause
input: clause text + optional document metadata
output: risk JSON + citations + audit versions + latency
```

Before launch, rollback must be possible:

```text
model_version: legal-lora-v1
adapter_version: legal-adapter-v1
rag_index_version: legal-guidelines-2026-05
prompt_template_version: legal-rag-prompt-v3
safety_policy_version: legal-safety-v2
quantization: int8
rollback_target: legal-baseline-v0
```

Legal projects especially need audit logs, but logs can themselves contain sensitive information. A teaching version can record redacted fields:

```text
request_id
model_version
adapter_version
rag_index_version
prompt_template_version
safety_policy_version
quantization
input_hash
retrieved_chunk_ids
output_json
safety_flags
needs_human_review
latency_ms
finish_reason
parse_status
```

The release package should also keep:

```text
benchmark_report.md
deployment_manifest.json
rollback_config.json
```

Only then can Chapter 16's release gate check that the legal model is not merely "able to return risk JSON," but has inspectable reports, versions, citations, safety, and rollback.

If the input contains real full contracts, a production system also needs explicit log retention, access control, and deletion mechanisms. The course project does not require a full compliance system, but learners must understand: model deployment is not just opening a `/predict`.

## 12. Running Example: Breach-Liability Clause

This chapter can run the full loop around one simplified clause:

```text
若 PARTY_A 未按期交付，应赔偿 PARTY_B 因此产生的一切损失，包括间接损失、可得利益损失及律师费。
```

The system should:

1. De-identify the clause and generate an SFT sample.
2. Retrieve relevant guidelines such as "liability scope," "indirect loss," and "liability cap."
3. Output JSON risk notes.
4. Cite retrieved chunks.
5. Mark `needs_human_review=true`.
6. Record risk detection, citation support, and format metrics in the eval report.

This sample connects earlier chapters: tokenizer and SFT handle text format, RAG provides evidence, distillation expands similar cases, evaluation verifies JSON and citations, safety prevents presenting the output as final legal advice, and deployment records versions and latency.

The corresponding `expected_output.json` fixture can start as:

```json
{
  "risk_level": "high",
  "jurisdiction": "unknown",
  "risk_points": [
    {
      "issue": "违约责任范围过宽",
      "why_it_matters": "条款要求赔偿一切损失，并包含间接损失、可得利益损失及律师费，可能扩大责任承担范围。",
      "evidence": ["guideline_002#chunk_04"],
      "suggested_revision": "建议限定为直接损失，并明确责任上限和除外情形。",
      "confidence": "medium"
    }
  ],
  "uncertainty": "缺少适用管辖区、合同类型和资料版本，不能给出最终法律判断。",
  "legal_advice_boundary": true,
  "needs_human_review": true
}
```

Tests do not require exact wording, but must check that fields exist, JSON is parseable, citations point to real chunks, and missing jurisdiction does not produce a definite legal conclusion.

## 13. Required Experiments

- Build 30 redacted contract-clause SFT samples.
- Build a small clause knowledge base and RAG index.
- Train a LoRA model for the contract-risk output format.
- Evaluate JSON format accuracy, risk detection, citation accuracy, and refusal ability.
- Write a model card explaining that the model does not replace lawyers and requires human review.

## 14. Failure Modes

- Output sounds like legal advice but has no evidence.
- RAG cites a similar but irrelevant clause.
- The model confuses `medium` and `high` risk.
- Suggested revisions are overly specific and exceed the evidence.
- Unredacted contracts enter training or logs.
- Human review marker is missing.
- The model gives a final legal conclusion without jurisdiction, material version, or citation support.

## 15. Test Acceptance

The tests in this chapter should at least verify:

1. Contract SFT sample schema is valid and de-identified.
2. Output JSON contains `risk_level`, `risk_points`, `evidence`, and `needs_human_review`.
3. RAG citations point to existing contract-clause or review-guideline chunks.
4. No-evidence samples trigger `risk_level="unknown"` or a refusal path.
5. Output contains `jurisdiction` and `legal_advice_boundary`.
6. The model card clearly states use limitations and human-review requirements.

## 16. Memory Anchors and Boundaries

The most important sentence in this chapter is:

> The core of a legal-domain model is not sounding like a lawyer; it is making risk points, evidence, boundaries, and human review traceable.

Remember:

1. Contract data must be de-identified.
2. Risk output must be structured.
3. Citations must support risk points.
4. Missing evidence, jurisdiction, or version should output unknown.
5. High-risk clauses must enter human review.

This chapter's project cannot replace legal advice. The next chapter transfers the same engineering loop to medical education.

## 17. Next Chapter

Legal contract review emphasizes evidence and human review. Medical education assistants emphasize red flags, care-seeking guidance, and not replacing diagnosis. The next chapter transfers the same engineering loop to the medical domain.
