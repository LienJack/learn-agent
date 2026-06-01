---
title: "Chapter 16: Quantization and Deployment"
description: "The previous chapters produced a model that has gone through evaluation and safety review, but the model has not yet entered a real usage workflow...."
author: LienJack
pubDate: 2026-06-01
locale: en
tags:
  - LLM Learning
  - LLM
  - AI
---
# Chapter 16: Quantization and Deployment

## 1. The Real Problem This Chapter Solves

The previous chapters produced a model that has gone through evaluation and safety review, but the model has not yet entered a real usage workflow. Deployment introduces new constraints: GPU memory, latency, throughput, concurrency, cold starts, monitoring, rollback, and cost.

Quantization is not for showing off. It is a trade-off among quality, memory, latency, and throughput. It often reduces weight memory, but it is not guaranteed to be faster across all hardware, model architectures, and concurrency settings. Whether it is worthwhile must be verified with the same eval set, decoding parameters, and benchmark.

Serving is also not "opening an API." Real serving turns a model into an observable, rate-limited, auditable, rollback-capable system component.

Core question:

```text
Once the model is trained, how do we make verifiable engineering trade-offs among cost, latency, throughput, quality, and safety?
```

This chapter can be studied as two half-chapters:

```text
16A quantization experiments: compare fp16 / int8 / int4 quality, memory, and latency under the same eval set
16B serving contract: fix API, logs, manifest, release gates, and rollback
```

This keeps the main thread clear: quantization answers "which format to run," while serving answers "how to run observably, auditably, and rollbackably."

## 2. Chain of Questions

1. Starting point: the model can generate in a notebook, but that does not mean it can serve real requests.
2. New problem one: weights, KV cache, runtime buffers, and concurrent requests may exceed the memory budget.
3. New mechanism one: use inference formats such as FP16 / BF16 / INT8 / INT4 or GGUF to reduce resource pressure.
4. New boundary one: quantization may degrade format, citations, safe refusal, or long-text generation, so it must be tied to eval.
5. New problem two: one request running successfully does not mean latency, throughput, and error rate are acceptable under concurrency.
6. New mechanism two: benchmarks, batching, KV cache, timeouts, rate limiting, and serving engines.
7. New boundary two: batching can improve throughput but can also increase waiting time for a single request.
8. New problem three: after an online answer fails, missing versions, logs, and intermediate state make review difficult.
9. New mechanism three: API contract, monitoring, audit fields, deployment manifest, and structured errors.
10. New boundary three: a new version may regress safety or citations, so release gates and rollback are required.
11. Next chapter's question: how do we combine training, RAG, evaluation, safety, and deployment into a full legal-domain project?

## 3. Concept Card

| Concept | Mathematical object | Shape / unit | Code object | Experimental object |
| --- | --- | --- | --- | --- |
| precision | numeric format | bits/value | `torch_dtype` | memory and speed |
| quantization | low-precision weights + scale | int weights + scale/zero point | `quantization_config` | quality regression |
| KV cache | historical key/value cache | `[L, B, H, T, Dh] * 2` | `past_key_values` / server cache | long-context memory |
| prefill | prompt forward computation | prompt tokens | benchmark timer | TTFT |
| decode | token-by-token generation | output tokens | generation loop | tokens/s |
| batching | batch multiple requests | dynamic batch | serving queue | throughput / p95 |
| API contract | request/response protocol | JSON schema | FastAPI / client | schema test |
| observability | runtime evidence | logs / metrics | logger / monitor | incident review |
| rollback | grouped version recovery | model + adapter + RAG + prompt | deployment config | rollback drill |

## 4. Numeric Formats

Common formats:

```text
FP32: stable for training, but large memory use.
FP16: common inference/training format, roughly half the memory of FP32.
BF16: larger exponent range, common on modern hardware.
INT8: smaller weights, commonly used for inference.
INT4: even lower memory, but quality and compatibility need more validation.
```

Do not only look at weight size. Inference memory also includes KV cache, activations, batches, runtime buffers, and fragmentation.

The same model can hit different bottlenecks at different stages:

```text
loading the model: weight size determines the baseline memory floor
processing long inputs: prefill compute and KV cache grow
generating long answers: token-by-token decode becomes the bottleneck
serving concurrent requests: batching, queues, and cache management determine throughput
```

So "this 4-bit model is only a few GB" does not mean "it can stably serve 20 concurrent long-context requests." Before deployment, benchmark real prompt lengths, output lengths, and concurrency patterns.

### Inference memory is not just model weights

Many beginners see "the 4-bit model is only a few GB" and assume it can deploy stably. That is not enough.

Inference memory includes at least:

```text
weights: model weights
KV cache: every layer and head stores historical key/value
activations / temporary buffers: intermediate results for the current forward pass
batching overhead: extra memory from batching multiple requests
runtime fragmentation: inference framework and memory fragmentation
```

KV cache can be roughly understood as:

```text
num_layers * batch_size * num_heads * seq_len * head_dim * 2
```

The final `2` corresponds to key and value.

This explains why the same model can behave like:

```text
short prompt + single request: runs
long prompt + long output: slows down
long prompt + high concurrency: may OOM
```

Before deployment, ask not only "how large are the weights?" but also:

```text
How long are real inputs?
How long is the average output?
How long is p95 output?
What is concurrency?
Is streaming enabled?
Does the request include RAG retrieval and post-processing?
```

## 5. Quantization Experiments

Quantization must be tied to evaluation:

```text
baseline FP16/BF16
  -> INT8
  -> INT4
  -> compare quality + latency + memory
```

A minimal experiment table should not only look at average score:

| Version | peak memory | p50 latency | p95 latency | TTFT | tokens/s | json valid | citation support | safety regression | Conclusion |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| fp16/bf16 | | | | | | | | | baseline |
| int8 | | | | | | | | | |
| int4 | | | | | | | | | |

where:

```text
json valid: whether strict format regressed
citation support: whether citations still support answers
safety regression: whether high-risk refusal, unknown, or human_review regressed
```

If int4 degrades high-risk refusal, it cannot be shipped directly even if average quality changes little.

Quantization evaluation must keep the same inputs, decoding parameters, and eval set. Otherwise, you cannot tell whether differences come from quantization or from prompts, temperature, or model version changes.

Minimal experiment flow:

```text
load fp16 model -> run eval + benchmark -> save report
load int8 model -> run same eval + benchmark -> save report
load int4 model -> run same eval + benchmark -> save report
compare quality / latency / memory / safety
```

Quantization is not one-way upside. It may reduce memory but slow down on some hardware. It may leave ordinary QA almost unchanged while making strict JSON output more fragile. Therefore, format and safety metrics must be in the comparison table.

Even if an int4 version uses less memory and has higher throughput, it should not ship just because it is cheaper if `high_risk_unsafe_answer_rate` regresses or `citation_support_rate` drops clearly.

## 6. GGUF and Local Inference

GGUF is commonly used in local CPU/GPU mixed inference ecosystems. The learning focus is not memorizing commands, but understanding:

- Weights are converted into a format supported by the inference engine.
- Different quant levels trade off size, speed, and quality.
- Tokenizer, chat template, and special tokens must still match.
- Local inference must run the same eval, not only check whether it can output text.

The most common hidden local-inference problem is mistaking "the model can output Chinese" for "the model matches training-time behavior." If tokenizer, chat template, system prompt, or stop tokens differ, model behavior changes. Deployment checks should save at least:

```text
base model id
adapter id
quantization format
tokenizer version
chat template hash
generation config
eval report id
```

These fields later enter the model card, serving config, and run manifest.

If a LoRA adapter must be merged or converted to another format, run the same eval both before and after merge. Do not assume converted-format behavior is identical.

## 7. Serving Engine

A minimal API server can be handwritten, but production inference usually needs a serving engine with support for:

- continuous batching / dynamic batching.
- KV cache management.
- tensor parallelism.
- streaming output.
- OpenAI-compatible API.
- request queues, timeouts, and cancellation.

These capabilities address GPU utilization and user waiting time under concurrency. A fast single-request demo does not mean the concurrent service is usable.

### Serving engines do not fix model behavior errors

Serving engines solve performance and concurrency problems:

```text
batching
KV cache
streaming
timeout
queue
parallelism
```

They do not solve:

```text
fabricated citations
unstable JSON format
out-of-bound answers to high-risk questions
RAG retrieval errors
prompt injection
```

So deployment optimization must be evaluated together with Chapters 14 and 15's evaluation and safety. A service can output wrong answers very quickly; that is not successful deployment, but faster risk amplification.

## 8. API Contract

The service interface should be fixed:

```json
{
  "request_id": "req_001",
  "messages": [
    {"role": "user", "content": "分析这段合同风险..."}
  ],
  "generation_config": {
    "temperature": 0.2,
    "max_new_tokens": 512
  }
}
```

The response should include both user-visible fields and audit fields:

```json
{
  "request_id": "req_001",
  "answer": "...",
  "citations": [],
  "safety_flags": [],
  "needs_human_review": false,
  "model_version": "legal-sft-v3",
  "adapter_version": "legal-lora-v2",
  "rag_index_version": "legal-guidelines-2026-05",
  "prompt_template_version": "rag_prompt_v4",
  "safety_policy_version": "safety_v2",
  "quantization": "int4",
  "generation_config_id": "gen_low_temp_v1",
  "token_usage": {
    "prompt_tokens": 512,
    "completion_tokens": 128
  },
  "finish_reason": "stop",
  "parse_status": "valid_json",
  "latency_ms": 1234
}
```

Domain systems should not return only a string. Citations, safety flags, versions, and latency are evidence for debugging.

These fields are not decorative. They answer key incident-review questions:

```text
Which model produced this answer?
Which adapter was attached?
Which RAG index was searched?
Which prompt template was used?
Which quantized version ran?
Was the answer truncated by max_new_tokens?
Did JSON parse succeed?
Was a safety policy triggered?
```

Error responses should also be structured:

```json
{
  "request_id": "req_001",
  "error": {
    "code": "generation_timeout",
    "message": "request exceeded max latency budget"
  },
  "model_version": "legal-sft-v3",
  "retryable": true
}
```

Without an error contract, callers can only treat every failure as a 500 or empty answer, making monitoring and rollback very difficult.

These fields extend Chapters 14 and 15's evaluation and safety gates into production.

## 9. Benchmark

Benchmarks should include at least three categories:

- Single-request latency: p50, p95, p99.
- Throughput: tokens/s, requests/s, concurrency.
- Quality regression: metric changes on the same eval set.

Also separate:

```text
prefill time: processing the input prompt
decode time: token-by-token generation
time to first token
total latency
output tokens per second
```

Long prompts are often bottlenecked by prefill; long answers are often bottlenecked by decode.

### Define the input distribution before benchmarking

Benchmarks are often incomparable not because the timer is wrong, but because input conditions differ.

Reports must record:

```text
number of warmup runs
concurrency
prompt length distribution, e.g. p50=512, p95=2048
output length distribution, e.g. p50=128, p95=512
max_new_tokens
temperature / top_p / top_k
whether streaming is enabled
whether RAG retrieval is included
whether safety filters are included
hardware and dtype / quantization
```

A teaching benchmark input distribution can start as:

```text
prompt_len: p50=512, p95=2048
max_new_tokens: 512
concurrency: 1 / 4 / 16
with_rag: true
temperature: 0.2
```

For domain models, split latency into:

```text
retrieval_latency_ms
generation_latency_ms
postprocess_latency_ms
total_latency_ms
```

Otherwise, you only know "it is slow," not whether retrieval, generation, JSON parsing, or safety post-processing is slow.

## 10. Monitoring and Rollback

After launch, monitor at least:

- request volume, error rate, timeout rate.
- p50/p95/p99 latency.
- input/output token distributions.
- refusal rate and safety flag ratio.
- missing-citation rate.
- user feedback and human-review results.

Rollback conditions should be written in advance:

```text
error rate exceeds threshold
latency exceeds threshold
high-risk out-of-bound answer appears
RAG citations go missing at scale
new version fails eval regression
```

Monitoring has two categories: system health and model behavior. System health includes latency, errors, throughput, and resource use. Model behavior includes refusal rate, missing-citation rate, safety flags, human-review ratio, and user feedback.

Rollback should also be rehearsed. A rollback-capable deployment knows:

```text
current_model_version
current_adapter_version
rollback_model_version
current_rag_index_version
rollback_rag_index_version
prompt_template_version
generation_config_id
safety_policy_version
config compatibility
rollback command
owner
```

If RAG index, adapter, and prompt template were upgraded together, rollback must roll them back as a group. Rolling back only the model but not the index or prompt may create a combination that was never evaluated.

Before rollback, also run a compatibility check:

```text
model_version
adapter_version
tokenizer_version
rag_index_version
prompt_template_version
generation_config_id
safety_policy_version
```

These objects must match as a group in both current and rollback versions.

## 11. Release Gate: Which Versions Cannot Ship

Deployment ultimately lands on release gates. A model version should not ship only because "the API returns an answer."

Minimal release gate:

```text
eval_report_exists == true
risk_report_exists == true
model_card_exists == true
benchmark_report_exists == true
rollback_target_exists == true
json_valid_rate >= threshold
citation_support_rate >= threshold
high_risk_unsafe_answer_rate == 0
p95_latency_ms <= threshold
error_rate <= threshold
```

If any item fails, the version must remain in the experiment environment.

Release gates turn "cannot go live" conditions into scripts rather than final human gut feeling.

## 12. Running Experiment: Four Serving Configurations for One Model

This chapter can use a fake generator or tiny local model for teaching. The focus is deployment metrics, not model ability:

```text
config_a: baseline, normal output, low concurrency
config_b: quantized, low memory, but possibly worse format
config_c: strict serving, short max_new_tokens + timeout, lower latency but possible truncation
config_d: unsafe new version, fails high-risk samples, used to verify rollback
```

Run the same batch of requests on the configurations and record:

```text
latency_ms
tokens_per_second
error_rate
json_valid_rate
model_version
rollback_target
deployment_manifest
benchmark_report
```

This exposes a real deployment trade-off: shorter `max_new_tokens` may lower latency but also truncate answers; quantization may reduce memory but must not significantly regress evaluation metrics.

## 13. Required Experiments

- Compare fp16, int8, and int4 inference quality and memory for the same model.
- Write a local API server that returns answer, citations, model_version, and latency.
- Write a benchmark script reporting p50/p95, tokens/s, and error rate under concurrency.
- Stress-test different batch sizes / max_new_tokens.
- Rehearse version rollback: old and new models can switch on the same eval set.
- Intentionally release a config missing rollback target and verify the release gate fails.
- Intentionally make the quantized version regress on `high_risk_unsafe_answer_rate` and verify the release gate fails.

## 14. Failure Modes

- Looking only at model file size, ignoring KV cache and concurrent memory.
- Skipping safety eval after quantization.
- API has no model version, so online outputs cannot be traced.
- Benchmark tests only single requests, not concurrency or long context.
- No rate limiting: traffic spikes take down the service.
- No rollback: a bad new version requires manual emergency fixes.
- Throughput only: total tokens/s improves after batching, but p95 latency is already unacceptable.
- Benchmark has no warmup or input distribution, so numbers are not comparable.
- Logs store unredacted sensitive raw inputs.
- Only the model is rolled back, not adapter, RAG index, prompt, and safety policy.

## 15. Test Acceptance

The tests in this chapter should at least verify:

1. API success response includes `answer`, `model_version`, `latency_ms`, and `finish_reason`.
2. API error response includes `request_id`, `error.code`, `model_version`, and `retryable`.
3. generation config must include `max_new_tokens` to prevent unbounded generation.
4. benchmark report must include p50, p95, tokens/s, error_rate, and input-length distribution.
5. quantized versions must run the same eval set and generate an fp16/int8/int4 comparison report.
6. serving config must include `rollback_target`.
7. release gate blocks versions missing eval report, model card, risk report, or rollback target.
8. release gate must fail when high-risk safety metrics regress.
9. logs must not store unredacted raw sensitive inputs; they should at least support hashing or redacted records.
10. rollback config must record model, adapter, RAG index, prompt template, and safety policy as a group.

## 16. Memory Anchors and Boundaries

The most important sentence in this chapter is:

> Deployment is not making the model run; it is building a verifiable engineering contract among quality, cost, latency, safety, observability, and rollback.

Remember:

1. Quantization often reduces weight memory, but quality, format, citations, and safety must be re-evaluated.
2. Inference memory is not only weights; KV cache and concurrency change the memory budget.
3. Benchmarks should include p50/p95, TTFT, tokens/s, error rate, and quality regression.
4. The API cannot return only a string; it must return versions, citations, safety flags, latency, and structured errors.
5. Rollback must roll back model, adapter, RAG index, prompt, and safety policy as a group.
6. Release gates should block versions with missing reports, missing rollback, quality regression, or safety regression.

This chapter does not solve how to combine concrete domain tasks. The next chapter moves into the legal contract review project, combining training, RAG, distillation, evaluation, safety, and deployment into a complete small-model project.

## 17. Next Chapter

We now have components for training, fine-tuning, RAG, distillation, evaluation, safety, and deployment. The next chapter begins the capstone project: combining these components into a legal contract review small model.
