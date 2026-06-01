---
title: "第 19 章：量化、服务与发布门禁"
description: "模型训练好了，怎么在成本、延迟、吞吐、质量和安全之间做可验证取舍？部署优化如果没有评测和回滚，只会更快地放大错误。"
author: LienJack
pubDate: 2026-06-01
locale: zh
tags:
  - LLM 学习
  - LLM
  - AI
---
# 第 19 章：量化、服务与发布门禁

## 本章核心困惑

模型训练好了，怎么在成本、延迟、吞吐、质量和安全之间做可验证取舍？部署优化如果没有评测和回滚，只会更快地放大错误。

很多同学会把部署理解成“把模型跑成一个 API”。真正的问题更复杂：同一个模型在 FP16、INT8、INT4、不同 batch、不同 prompt 模板、不同检索版本下，可能表现出不同的质量、安全和延迟。量化让模型更省显存，但也可能让少数边界题更容易失败；服务让模型可访问，但也引入日志、限流、监控、回滚和隐私问题。

问题演化链：

```text
训练出的模型太慢/太贵
  -> 尝试量化和推理加速
  -> 质量可能回归，尤其是引用、格式、拒答边界
  -> 需要同一 eval set 对比不同部署版本
  -> API 服务必须保护隐私并记录可观测指标
  -> canary 发布观察真实流量
  -> 失败时能快速 rollback
```

生活类比：把模型部署上线像把实验室样车变成公路车辆。你不仅要看速度，还要看刹车、仪表盘、故障报警、维修手册和召回机制。

## 前置知识

- 已有固定 eval、model card 和 risk report。
- 理解 logits、dtype、显存和推理批处理的基本概念。
- 知道线上日志必须保护隐私。

补充前置检查：

| 前置项 | 最低要求 | 为什么重要 |
| --- | --- | --- |
| 固定 prompt 模板 | 模型版本之间保持一致 | 避免把 prompt 变化误认为量化影响 |
| 固定检索索引 | 记录 evidence 版本 | 避免 RAG 变化污染对比 |
| 固定评测脚本 | 输出可复现 | 支撑发布门禁 |
| 隐私策略 | 日志脱敏 | 法律/医学项目必须具备 |
| 回滚版本 | 可快速恢复 | 避免线上失败后临时救火 |

## 本章新增能力

你会比较 FP32/FP16/BF16、INT8/INT4、bitsandbytes、GGUF、vLLM、API server、batching、latency、throughput、quality regression、observability、PII masking、rate limiting、online eval、canary release 和 rollback playbook。

核心概念深讲：

| 概念 | 朴素定义 | 关键取舍 |
| --- | --- | --- |
| dtype | 参数和激活用多少位表示 | 位数越低通常越省，但误差更大 |
| 量化 | 用更少 bit 近似权重或激活 | 省显存、可能变快，也可能损失质量 |
| latency | 单个请求等待时间 | 用户体验敏感 |
| throughput | 单位时间处理多少 token/请求 | 成本和并发敏感 |
| batching | 合并请求一起算 | 提升吞吐，但可能增加等待 |
| release gate | 发布前 pass/fail 规则 | 把部署取舍变成证据 |
| canary | 小流量试运行 | 在可控范围内发现线上问题 |
| rollback | 回退到稳定版本 | 降低发布风险 |

对法律/医学项目来说，量化评测不能只看困惑度或通用准确率。更要看：

- 结构化 JSON 是否更容易损坏。
- 引用 source/span 是否更容易丢失。
- 拒答边界是否变松。
- red flag 是否仍能触发。
- prompt injection 防护是否退化。
- PII/PHI 是否在 request、response、trace、error log 中被 mask。
- canary 阶段是否有明确停止条件和 rollback target。

## 最小推导或最小代码

量化取舍：

```text
更低 bit -> 更低显存/可能更快
        -> 可能带来质量回归
        -> 必须跑同一 eval + 安全测试
```

一个最小显存估算：

```text
参数量 = 7B
FP16 每参数 2 bytes -> 约 14GB 参数显存
INT8 每参数 1 byte  -> 约 7GB 参数显存
INT4 每参数 0.5 byte -> 约 3.5GB 参数显存
```

这只是参数显存，还没有算 KV cache、batch、上下文长度、框架开销。随着上下文变长，KV cache 可能成为主要显存压力。

更完整的估算应写成：

```text
total_vram ≈ weight_memory + kv_cache_memory + activation_workspace + framework_overhead
kv_cache ≈ 2 * layers * B * kv_heads * T * head_dim * bytes
```

很多 4-bit 方案主要量化的是权重，KV cache 仍可能是 fp16/bf16；上下文长度和并发升高时，KV cache 会重新成为瓶颈。

部署评测必须绑定固定 eval set。比较 fp16、int8、int4 时，下面这些变量都要冻结：

```text
eval set version
prompt template version
retrieval index version
schema version
safety policy version
decoding parameters
```

最小演进路径建议分层：

```text
v0: HF fp16/bf16 local + frozen eval
v1: bitsandbytes int8/int4 + paired eval
v2: vLLM serving latency/throughput/observability
v3: canary + monitor + rollback
extension: GGUF / llama.cpp 作为边缘部署分支，独立评测
```

如果量化版本换了 prompt、检索索引或安全策略，就不是量化对比，而是一次新的发布候选审计。

最小发布门禁：

```python
def release_gate(report, threshold):
    if report["eval_version"] != threshold["required_eval_version"]:
        return "no_release"
    if report["quality_drop"] > threshold["max_quality_drop"]:
        return "no_release"
    if report["citation_support_drop"] > threshold["max_citation_drop"]:
        return "no_release"
    if report["red_flag_recall"] < threshold["min_red_flag_recall"]:
        return "no_release"
    if report["schema_pass_rate"] < threshold["min_schema_pass_rate"]:
        return "no_release"
    if report["legal_boundary_pass_rate"] < threshold["min_legal_boundary_pass_rate"]:
        return "no_release"
    if report["prompt_injection_followed_rate"] > threshold["max_prompt_injection_followed_rate"]:
        return "no_release"
    if report["privacy_leak_found"]:
        return "no_release"
    if not report["pii_phi_masking_verified"]:
        return "no_release"
    if not report["rollback_ready"]:
        return "internal_only"
    return "canary"

report = {
    "baseline_run_id": "fp16_eval_2026_05_31",
    "quality_drop": 0.02,
    "citation_support_drop": 0.01,
    "red_flag_recall": 0.98,
    "schema_pass_rate": 0.99,
    "legal_boundary_pass_rate": 0.97,
    "prompt_injection_followed_rate": 0.0,
    "privacy_leak_found": False,
    "pii_phi_masking_verified": True,
    "rollback_ready": True,
    "eval_version": "eval-2026-05",
}
threshold = {
    "required_eval_version": "eval-2026-05",
    "max_quality_drop": 0.03,
    "max_citation_drop": 0.02,
    "min_red_flag_recall": 0.95,
    "min_schema_pass_rate": 0.98,
    "min_legal_boundary_pass_rate": 0.95,
    "max_prompt_injection_followed_rate": 0.0,
}
assert release_gate(report, threshold) == "canary"
```

paired eval 的 delta 统一定义为 `candidate - baseline`。高者更好的指标要求 `delta >= -allowed_drop`；低者更好的指标要求 `delta <= allowed_increase`。报告必须记录 `baseline_run_id`，否则无法判断量化版本是否真实不退化。

最小实验流程：

```text
1. 选同一个 base/student checkpoint
2. 导出 fp16、int8、int4 三个推理版本
3. 使用同一 prompt、同一检索索引、同一 eval set
4. 记录质量、引用、格式、安全、延迟、吞吐、显存
5. 生成 deployment_report.md
6. 用 release_gate 得到 no_release/internal_only/canary
```

canary 和 rollback 也要写成可执行规则：

```text
canary scope: 1% internal traffic or selected reviewers only
stop canary if: schema_fail_rate > threshold
stop canary if: citation_support below gate
stop canary if: privacy leak or unmasked PII/PHI appears once
rollback target: last passing fp16/int8 version
rollback owner: named person
rollback evidence: command/runbook link + smoke test result
```

canary 配置至少包含：

```yaml
owner: serving-owner
traffic_scope: 1% internal
stop_conditions:
  - privacy leak once
  - schema_fail_rate > 0.02
alert_channels: ["#release-alerts"]
rollback_command: "deploy rollback legal-sft-v1-fp16"
post_rollback_smoke_test: "pytest tests/test_serving_runtime.py"
incident_log_path: "reports/incidents.md"
```

日志策略默认先 mask 再落盘。法律项目至少 mask 姓名、身份证号、联系方式、公司敏感主体、金额和合同编号；医学项目至少 mask 姓名、联系方式、身份证/病历号、精确地址、具体就诊记录和可识别健康信息。调试需要原文时，应走短期、授权、加密、可审计的例外流程。

### 具体例子 1：INT4 让格式变脆

法律合同审查要求输出 JSON：

```json
{
  "risk_level": "high",
  "evidence": [{"source_id": "law_01", "span_id": "s_12"}],
  "review_required": true,
  "review_type": "lawyer"
}
```

FP16 版本 100 条中有 98 条可解析，INT4 版本只有 88 条可解析。虽然回答文字看起来差不多，但 API 下游依赖 JSON 字段，格式错误会导致人工复核标记丢失。此时 INT4 不能因为延迟降低就直接发布。

修正方式：

- 降低温度。
- 使用更严格的输出 schema。
- 给格式失败单独设门禁。
- 必要时选择 INT8 或 FP16。

### 具体例子 2：batching 改善吞吐但增加等待

医学科普助手有两类流量：

- 普通科普：用户可以等待 2-3 秒。
- 红旗症状：应尽快给出就医引导。

如果所有请求都等 batch 凑齐，普通吞吐变好，但红旗请求可能被拖慢。更合理的服务设计是给高风险路由设置更短等待或独立队列。

可观测指标应至少分层记录：

```text
ordinary_latency_p50/p95
red_flag_latency_p50/p95
tokens_per_second
error_rate
schema_parse_fail_rate
fallback_rate
```

### 反例和边界

反例：并不是所有项目都值得追求最低 bit。

如果法律助手主要服务内部审阅，每天请求量不大，FP16 成本可接受，而 INT4 会降低引用支持率，那么保留 FP16 可能是更好的工程选择。优化目标不是“越省越好”，而是在业务约束下达到可靠、可回滚、可解释。

边界：离线 benchmark 不能完全代表线上。线上会出现长输入、脏格式、prompt injection、重复请求、超时、网络失败和用户隐私。离线门禁通过后，也应该先 canary。

## 常见错误

| 常见错误 | 表面现象 | 风险 | 修正方式 |
| --- | --- | --- | --- |
| 只看 latency 下降 | p95 更好看 | 质量/安全回归被忽略 | 部署报告同时看质量、安全、格式 |
| 日志记录原始合同或病历 | 排查方便 | PII/PHI 泄漏 | 默认 mask，必要字段最小化 |
| 没有 canary 和 rollback | 发布流程简单 | 线上失败无法快速退回 | 写 rollback playbook 并演练 |
| INT4 demo 正常就发布 | 少数样例很好 | 边界题失败 | 跑固定 eval 和 red-team set |
| 更换 prompt 后比较量化 | 看似 INT8 更好 | 对比不公平 | 控制变量，只改一个因素 |
| 只报告平均 latency | 数字好看 | 长尾请求不可用 | 报告 p50/p95/p99 |
| 线上错误不分类型 | 只有 error_rate | 无法定位 | 区分超时、格式、检索、模型、安全拒答 |

## 测试验收

- fp16/int8/int4 每个部署版本都有 eval report。
- 日志中 PII/PHI 已 mask。
- 质量或安全回归时 release gate 阻止发布。
- benchmark 报告 latency、throughput、显存、错误率和回滚路径。
- 每个部署版本必须绑定固定 eval set、prompt、检索索引、schema 和安全策略版本。
- canary 必须有流量范围、停止条件、监控指标和 rollback target。

建议部署报告：

| 字段 | 示例 | 说明 |
| --- | --- | --- |
| model_version | `student-v3-int8` | 可追溯 |
| quantization | `int8` | 部署差异 |
| eval_version | `eval-2026-05` | 固定评测 |
| prompt_version | `prompt-legal-2026-05` | 控制变量 |
| retrieval_index | `legal-index-2026-05` | RAG 可追溯 |
| citation_support | `96.5%` | 证据链质量 |
| schema_pass | `99.0%` | API 可用性 |
| red_flag_recall | `98.0%` | 医学安全 |
| legal_boundary_pass | `97.5%` | 法律安全 |
| pii_phi_masking | `pass` | 日志隐私门禁 |
| canary_scope | `1% internal` | 灰度范围 |
| rollback_status | `rehearsed` | 回滚是否演练 |
| latency_p95 | `1.8s` | 用户体验 |
| rollback_target | `student-v2-fp16` | 失败回退 |

### FAQ

Q：量化后模型输出不稳定，是不是量化一定不可用？

A：不一定。先看失败类型。如果只是少量格式问题，可以通过 schema 约束、解码参数或后处理修复；如果红旗召回或法律边界明显下降，就不应发布。

Q：吞吐和延迟哪个更重要？

A：取决于场景。交互式助手更看 p95 latency；批量合同审查更看 throughput；高风险请求还要单独看响应时间和转人工路径。

Q：日志可以不记录吗？

A：不能完全不记录，否则无法审计和排障。但应最小化、脱敏、分权限、设保留周期，尤其不能保存原始合同或健康信息。

Q：canary 通过后就能完全放心吗？

A：不能。canary 只是降低风险。仍需要持续监控、在线抽检、告警和回滚演练。

### 自测题

1. 为什么 INT4 版本不能只用通用准确率判断是否可发布？
2. 参数显存和 KV cache 有什么区别？
3. release gate 为什么要包含 rollback_ready？
4. 法律助手日志里最危险的信息类型是什么？
5. 医学助手为什么可能需要高风险请求独立队列？

答案要点：

1. 因为法律/医学项目还依赖引用、格式、拒答、红旗召回和隐私安全。
2. 参数显存来自模型权重，KV cache 来自推理时保存上下文注意力缓存，随 batch 和上下文长度增长。
3. 因为发布失败不可避免，没有回滚就无法控制影响范围。
4. 原始合同文本、姓名、身份证号、联系方式、公司敏感信息、案件事实等。
5. 因为红旗症状需要更快响应和更保守路由，不能被普通 batch 等待拖慢。

## 想继续深挖

继续深挖部署，要把“更快更省”写成带约束的优化问题：

```text
minimize latency, memory_cost
subject to quality_regression <= allowed_delta
           safety_regression <= 0
           privacy_leak_count == 0
```

量化会改变数值表示：

```text
fp16/int8/int4 -> smaller memory, possible output drift
```

所以每个部署候选都要和基线比较：

```text
regression_delta = metric_candidate - metric_baseline
```

如果 int4 让延迟下降 40%，但 `red_flag_recall` 从 0.96 掉到 0.88，release gate 必须阻断。部署深挖的关键是：性能优化只有在固定 eval、固定 prompt、固定检索索引、固定 safety policy 下才可比较。

## 和领域项目的关系

法律和医学助手的部署不是开一个 API 就结束。线上版本必须保留证据链、隐私保护、可观测性和回滚能力，否则再好的离线评测也无法支撑真实使用。

法律项目的可验证部署链：

```text
contract input -> PII masking -> RAG evidence -> model output -> schema validation -> lawyer review flag -> audit log -> rollback target
```

医学项目的可验证部署链：

```text
health question -> PHI masking -> red flag route -> guideline evidence -> response -> clinician review flag -> safety monitor -> rollback target
```

本章的核心不是某个量化工具，而是一种发布态度：任何速度和成本收益，都必须用质量、安全和回滚证据来支付。
