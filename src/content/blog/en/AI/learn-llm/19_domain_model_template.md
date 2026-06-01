---
title: "Chapter 19: A Complete Engineering Template for Domain Models"
description: "Chapters 17 and 18 built legal and medical projects. The two domains are very different, but their engineering skeleton is similar: data governance..."
author: LienJack
pubDate: 2026-06-01
locale: en
tags:
  - LLM Learning
  - LLM
  - AI
---

# Chapter 19: A Complete Engineering Template for Domain Models

## 1. The Real Problem This Chapter Solves

Chapters 17 and 18 built legal and medical projects. The two domains are very different, but their engineering skeleton is similar: data governance, SFT, RAG, distillation, evaluation, safety, deployment, and continuous iteration.

This chapter abstracts those shared parts into a reusable template. The goal is not to build yet another demo. It is to establish an engineering structure that lets a new domain project be started, reviewed, trained, evaluated, and released in a disciplined way.

The core question is:

```text
How do we turn a domain model project into a reusable template?
```

## 2. Problem Chain

1. A single domain project can be stitched together by hand, but it is hard to reuse.
2. A reusable template must standardize directories, configuration, data contracts, and reports.
3. Data versions, model versions, and RAG index versions must be traceable to one another.
4. Training, evaluation, and deployment need a unified command entry point.
5. Risk, safety, and human review must be part of the template.
6. Continuous iteration depends on regression evaluation and failure cases.
7. The course comes full circle: from the tensor training loop to the engineering loop for domain models.

## 3. Concept Card

| Concept | Mathematical Object | Shape | Code Object | Experiment Object |
| --- | --- | --- | --- | --- |
| domain template | project skeleton | directory tree | `domain_model_template/` | migration to a new domain |
| config | experiment parameters | YAML / JSON | `configs/*.yaml` | reproducibility |
| manifest | run evidence | JSON | `run_manifest.json` | version traceability |
| report chain | release evidence | markdown/csv | `reports/` | go/no-go |
| release gate | release criteria | rules | check script | block unfinished releases |
| failure loop | iteration loop | cases -> actions | `failure_cases.csv` | continuous improvement |

## 4. Template Directory

```text
domain_model_template/
├── configs/
│   ├── data.yaml
│   ├── train_lora.yaml
│   ├── rag.yaml
│   ├── eval.yaml
│   └── serving.yaml
├── data/
│   ├── raw/
│   ├── cleaned/
│   ├── sft/
│   ├── distill/
│   └── eval/
├── scripts/
│   ├── prepare_data.py
│   ├── train_lora.py
│   ├── build_rag_index.py
│   ├── generate_distill_data.py
│   ├── evaluate.py
│   ├── benchmark.py
│   ├── serve.py
│   ├── check_release_gate.py
│   └── rollback.py
├── src/
│   ├── data/
│   ├── training/
│   ├── rag/
│   ├── evaluation/
│   ├── safety/
│   └── serving/
├── tests/
│   ├── test_data_schema.py
│   ├── test_rag_pipeline.py
│   ├── test_metrics.py
│   ├── test_safety_policy.py
│   └── test_release_gate.py
├── reports/
│   ├── data_quality_report.md
│   ├── eval_report.md
│   ├── failure_cases.csv
│   ├── risk_report.md
│   ├── model_card.md
│   └── run_manifest.json
└── README.md
```

The template is not just a directory display. Every directory should correspond to a runnable command, a testable contract, or a piece of release evidence.

## 5. Configuration Management

Do not scatter important experiment parameters throughout scripts. At minimum, configure:

```yaml
project:
  name: domain_model_template
  domain: legal|medical|custom

base_model:
  model_id: ...
  revision: ...

data:
  train_path: data/sft/train.jsonl
  val_path: data/sft/val.jsonl
  eval_path: data/eval/eval.jsonl
  split_seed: 42

training:
  method: lora
  learning_rate: 0.0002
  batch_size: 4
  gradient_accumulation_steps: 8
  max_seq_length: 2048

rag:
  index_version: ...
  chunk_size: 512
  top_k: 5

serving:
  model_version: ...
  adapter_version: ...
  rag_index_version: ...
  prompt_template_version: ...
  safety_policy_version: ...
  quantization: ...
  rollback_target: ...
```

Configuration files are the entry point for experiment reproduction, and they are also the basis for report generation.

The key to configuration management is not YAML syntax. It is pulling every choice that can affect the result out of the scripts. Anything that changes training, retrieval, evaluation, or deployment should be traceable:

```text
Model: base model, revision, adapter, quantization
Data: paths, versions, split seed, filtering rules
Training: learning rate, batch size, max length, LoRA rank
RAG: chunk size, overlap, embedding model, top_k
Evaluation: eval set, metrics, thresholds, slices
Serving: max_new_tokens, timeout, model / adapter / RAG / prompt / safety policy version, rollback target
```

When a report shows a metric change, you can go back to the configuration and determine which choice most likely caused it.

## 6. Data Version Management

Every training run should be able to trace:

```text
raw data version
cleaning script version
SFT dataset version
distill dataset version
eval dataset version
RAG index version
```

It is good practice to save `run_manifest.json` in the training output:

```json
{
  "run_id": "2026-05-28_lora_v3",
  "base_model": "model-id@revision",
  "model_version": "domain-model-v3",
  "adapter_version": "domain-adapter-v3",
  "dataset_version": "sft_v3",
  "rag_index_version": "kb_v5",
  "prompt_template_version": "rag_prompt_v4",
  "safety_policy_version": "safety_v2",
  "quantization": "int8",
  "config_files": ["configs/train_lora.yaml", "configs/eval.yaml"],
  "benchmark_report": "reports/benchmark_report.md",
  "rollback_target": "domain-model-v2",
  "git_commit": "..."
}
```

`run_manifest.json` is the evidence index for the whole system. It does not replace reports, but it tells you which run those reports came from. If a domain model version has no manifest, it becomes very hard to answer questions such as:

```text
Which SFT dataset was this adapter trained on?
Which RAG index was used during evaluation?
Which checkpoint do the scores in the model card refer to?
Which prompt version produced this online output?
```

The manifest fields do not have to be perfect on day one, but they must cover the model, data, configuration, code, and evaluation artifacts.

## 7. Unified Command Entry Points

The template should provide a stable set of commands:

```bash
python scripts/prepare_data.py --config configs/data.yaml
python scripts/train_lora.py --config configs/train_lora.yaml
python scripts/build_rag_index.py --config configs/rag.yaml
python scripts/evaluate.py --config configs/eval.yaml
python scripts/serve.py --config configs/serving.yaml
```

Once commands are stable, CI, documentation, teaching, and production migration all become easier.

Unified commands also move the course from notebooks toward engineering. Notebooks are good for exploration and teaching. Scripts are good for reproduction and automation. A mature project can use both:

```text
notebooks/: explain mechanisms, visualize behavior, inspect manually
scripts/: fixed workflows, reproducible runs, CI entry points
src/: testable core logic
tests/: engineering contracts and regression protection
reports/: run results and release evidence
```

If a critical workflow can only be run manually inside a notebook, it has not yet entered the engineering loop.

## 8. Report Chain

Each run should output at least:

- `data_quality_report.md`
- `eval_report.md`
- `failure_cases.csv`
- `risk_report.md`
- `model_card.md`
- `run_manifest.json`
- `benchmark_report.md`
- `deployment_manifest.json`

Reports should cross-reference one another: the eval report cites data versions, the model card cites the eval report, and the risk report cites failure cases.

## 9. Test System

Template tests should check more than whether code can run. They should check engineering contracts:

- Data schema.
- De-identification rules.
- No train/eval leakage.
- RAG citations exist.
- Output formats are parseable.
- Safety samples trigger refusal or human review.
- Required model card fields are complete.

These tests are the guardrails for domain projects. Every time a new domain is added, the corresponding guardrails should be added first.

Template tests can be divided into four categories:

| Type | Example | What It Prevents |
| --- | --- | --- |
| schema tests | JSONL fields, required config keys | malformed data/config |
| split tests | no `source_group` leakage | inflated metrics |
| behavior tests | refusal, citations, format parsing | model outputs outside boundaries |
| release tests | reports, model card, rollback target | unfinished releases |

These tests do not require training a real large model. Many of them can be completed with small samples, fake models, or rule-based outputs. The important point is to freeze the engineering contracts.

## 10. Release Gate

Before a domain model version is released, it should satisfy at least:

```text
data quality report has been generated
eval report shows no critical regression
safety eval meets the threshold
model card is complete
risk report has been reviewed
rollback target is available
owner has approved
```

If any item is missing, the model should remain in the experimental stage.

### Write the Release Gate as a Script

The release gate cannot live only in the README. The template should provide:

```bash
python scripts/check_release_gate.py --manifest reports/run_manifest.json
```

At minimum, it should check:

```text
eval_report exists
risk_report exists
model_card exists
run_manifest exists
rollback_target is non-empty
benchmark_report exists
safety eval passes
no new high-risk failures
model / tokenizer / adapter / RAG index / prompt / safety policy versions are complete
```

If any item is missing, the script should return a non-zero exit code. That lets CI, course assignments, and real projects all use the same gate.

## 11. Continuous Iteration

After launch, the iteration loop is:

```text
collect failures
  -> label root causes
  -> update data / prompt / RAG / adapter
  -> run regression eval
  -> update model card and risk report
  -> release or rollback
```

Every failure case must lead to an action:

- Add data.
- Change the prompt.
- Change retrieval.
- Adjust the safety policy.
- Mark the scenario as unsupported by the product.

If failure cases do not enter the iteration system, they will simply reappear in the next version.

Continuous iteration should also avoid the short-sighted pattern of "see one failure, add one example." Each failure case should first receive a root-cause label, then an action should be chosen:

```text
retrieval_failure -> change chunks / embeddings / query / index
format_failure -> change prompt / SFT format examples / parser
safety_failure -> add safety eval / refusal examples / policy
knowledge_gap -> add to the knowledge base or training data
capacity_gap -> switch model, tune LoRA, reduce task complexity
product_gap -> explicitly declare the scenario unsupported
```

Only then does the course endpoint become more than "run it once." It becomes a domain model system that can keep improving.

## 12. Steps for Migrating to a New Domain

To migrate the template to a new domain, use this order:

1. Write a clear intended use and out-of-scope use.
2. Define the output contract and safety boundaries.
3. Collect 20-50 high-quality seed examples.
4. Build the minimal RAG knowledge base and citation rules.
5. Write the eval set, covering failure boundaries before chasing volume.
6. Run the base model and generate the first set of failure cases.
7. Decide whether to first improve the prompt, add RAG coverage, or run SFT / LoRA.
8. Generate the model card, risk report, and run manifest.
9. Write the release gate so versions without reports, rollback, or safety evaluation cannot be released.

This order intentionally moves evaluation and safety earlier. The most common failure in domain models is not "the model cannot speak." It is "the model sounds convincingly right, but its boundaries and evidence are unreliable."

A 90-minute migration assignment can skip model training and build only a minimal engineering shell for enterprise support or education QA:

| Step | Deliverable |
| --- | --- |
| 1 | `intended_use.md`: what it can and cannot do |
| 2 | `output_schema.json`: fixed answer fields and citation fields |
| 3 | `eval.jsonl`: 5 success examples + 5 failure-boundary examples |
| 4 | `run_manifest.json`: base model, RAG index, prompt, safety policy versions |
| 5 | `check_release_gate.py`: fails when eval/model card/rollback target is missing |

This assignment deliberately does not train a model. The goal is not to chase performance. It is to verify that learners can migrate the legal template into a new domain project that is evaluable, reviewable, and rollback-ready.

## 13. Required Experiment

- Copy the template directory and create a skeleton for a new domain project.
- Fill in `configs/data.yaml`, `configs/eval.yaml`, and `configs/serving.yaml`.
- Generate a `run_manifest.json` that records model, data, RAG index, and configuration versions.
- Write a minimal release check that fails when the eval report, model card, or rollback target is missing.
- Run root-cause classification on 5 failure cases and output the next action list.

## 14. Graduation Check

After completing this course, learners should be able to deliver:

1. A runnable minimal training loop.
2. An explainable mini GPT backbone.
3. A Hugging Face SFT / LoRA workflow.
4. A RAG baseline with citations.
5. A distillation data generation and filtering pipeline.
6. An eval runner and failure cases report.
7. A model card and risk report.
8. A deployable, rollback-ready domain model project template.

These deliverables should connect to one another: the training loop produces a model, SFT/LoRA adjusts behavior, RAG provides evidence, distillation expands capability, evaluation finds failures, safety documents define boundaries, and deployment configuration preserves versions and rollback paths.

The final repository structure can converge to:

```text
mini_gpt/
hf_sft_lora/
domain_project_legal/
domain_project_medical/
domain_template/
reports/
```

Scoring should also be organized around the engineering loop, rather than only judging whether model output looks good:

| Module | Weight |
| --- | ---: |
| Training loop and Mini GPT | 20% |
| HF / SFT / LoRA workflow | 20% |
| RAG and citation support | 20% |
| Eval / safety / model card | 25% |
| Serving / manifest / release gate | 15% |

## 15. Failure Modes

- The template becomes only a directory tree, with no commands or reports.
- Configuration is scattered across scripts, making experiments impossible to reproduce.
- The eval set has no version, so regressions cannot be compared.
- The RAG index is updated without synchronizing the model card.
- The risk report lags behind model release.
- All domains share one safety policy, ignoring domain differences.
- The release gate appears only in documentation, with no script or CI entry point.

## 16. Test Acceptance

The tests for this chapter should verify at least:

1. The template directory contains `configs`, `data`, `scripts`, `src`, `tests`, and `reports`.
2. Every config can be parsed and includes required fields.
3. `run_manifest.json` records model, data, RAG index, and configuration versions.
4. Required report files exist and cross-reference versions.
5. The release check blocks versions missing an eval report or rollback target.

## 17. Course Wrap-Up

This path starts in Chapter 1 with:

```text
forward -> loss -> backward -> optimizer.step
```

and ends in Chapter 19 with:

```text
data -> train -> RAG -> distill -> eval -> safety -> deploy -> monitor -> rollback
```

Every chapter in between adds one real engineering capability: training, modeling, representation, context, reuse, fine-tuning, retrieval, distillation, evaluation, safety, deployment, and continuous iteration.

The final memory anchor for this course is:

> The goal is not to turn an LLM into a chat demo. The goal is to turn model behavior into an engineering system that can be trained, retrieved against, evaluated, reviewed, deployed, and rolled back.

If you can migrate this template to a new domain and leave behind data, code, tests, reports, and a rollback path, then this course is no longer just something you have "studied." You are ready to start building maintainable small domain-model systems.
