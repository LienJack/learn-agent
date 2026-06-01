---
title: "第 13 章：领域任务定义与数据工程"
description: "领域模型能力主要来自模型，还是任务定义和数据？在高风险领域，任务边界、数据来源、许可、脱敏、标注规范和 eval 冻结，往往比换一个更大的模型更重要。"
author: LienJack
pubDate: 2026-06-01
locale: zh
tags:
  - LLM 学习
  - LLM
  - AI
---
# 第 13 章：领域任务定义与数据工程

## 本章核心困惑

领域模型能力主要来自模型，还是任务定义和数据？在高风险领域，任务边界、数据来源、许可、脱敏、标注规范和 eval 冻结，往往比换一个更大的模型更重要。

学习者容易经历这样的误区链：

```text
我想做法律/医学小模型
  -> 先找一个大模型微调
    -> 收集一些看起来相关的文本
      -> 训练后 demo 变流畅
        -> 但无法回答数据能不能用、有没有泄漏、是否含隐私
          -> 最后模型无法发布，也无法解释失败原因
```

数据工程的核心不是“把文本凑够”，而是把每条样本变成可追溯、可审计、可复用、可拒绝使用的工程资产。

## 前置知识

- 已有最小 eval harness。
- 知道 SFT、RAG、蒸馏、评测数据的用途差异。
- 理解法律/医学边界不能靠一句免责声明补救。
- 知道 JSONL、manifest、dataset split 和 basic dedup 的作用。

学这一章时要不断追问：这条数据从哪里来？许可是什么？是否含个人信息？用于训练还是评测？如果模型答错，我能追溯到哪条样本或哪份来源吗？

## 本章新增能力

你会设计任务边界、来源许可矩阵、PII/PHI 脱敏、清洗去重、质量过滤、train/eval leakage 检查、标注规范、data card、manifest 和样本审计日志。

本章新增的不是单个函数，而是一条数据生命周期：

```text
任务定义
  -> 来源登记
    -> 许可检查
      -> 脱敏与清洗
        -> 用途分配
          -> 标注与质检
            -> 切分与冻结
              -> data card 与审计日志
```

## 最小推导或最小代码

同一条合同条款可以变成四种数据：

```text
SFT: instruction + structured answer
RAG: source document + chunk + span_id
distill: evidence + teacher answer + filter result
eval: frozen input + expected checks + risk label
```

manifest 最小字段：

```json
{
  "sample_id": "",
  "source_id": "",
  "source_group": "",
  "parent_doc_id": "",
  "content_hash": "",
  "license": "",
  "allowed_uses": ["rag", "eval"],
  "commercial_use_allowed": false,
  "redistribution_allowed": false,
  "version": "",
  "effective_date": "",
  "purpose": "sft|rag|distill|eval|demo_only",
  "pii_status": "none|synthetic|redacted|unknown",
  "review_status": "auto|human_reviewed|blocked",
  "access_scope": "public|internal|restricted"
}
```

许可不要只用一个字符串糊过去。来源许可矩阵至少要回答：

```text
source | read | store | train | rag_index | eval | redistribute | commercial | attribution_required | notes
```

`license = unknown` 默认不得进入发布候选训练集，也不得上传到公开仓库；最多用于本地 `demo_only` 探索。

最小推导：同一份原始文本不能因为“切成不同样子”就同时进入训练和评测。假设某份指南 `source_id = guideline_2024_a` 被切成 100 个 chunk，其中 90 个进训练、10 个进 eval。即使没有完全重复文本，模型仍可能通过相同来源的术语、结构和答案模式获得优势。

更安全的切分是按来源组：

```text
train sources: guideline_2023_a, faq_public_b
eval sources:  guideline_2024_c, expert_cases_d
```

最小 leakage 检查可以从“文本重复 + 来源重复”两层开始：

```python
train_texts = {row["normalized_text"] for row in train}
eval_texts = {row["normalized_text"] for row in eval_items}
assert train_texts.isdisjoint(eval_texts)

train_sources = {row["source_group"] for row in train}
eval_sources = {row["source_group"] for row in eval_items}
assert train_sources.isdisjoint(eval_sources)
```

手算一个虚高分数的例子：eval 有 20 条，其中 6 条来自训练来源的近重复样本。模型真实会做 10 条，但近重复 6 条也答对，于是报告变成 `16/20 = 0.80`。如果去掉泄漏，真实表现只有 `10/14 ~= 0.71`。这就是为什么第 12 章 eval runner 必须接入 `leakage_check`，而不是只在数据清洗脚本里打印一句“已去重”。

数据用途也要显式冻结：

```text
同一 source_group:
  可以进入 RAG index 和训练候选
  但不能同时进入 frozen eval
```

如果课程为了教学需要演示同源样本，应在 manifest 中标记 `purpose = demo_only`，并且不能把它纳入发布验收分数。

RAG eval 需要再拆清三类对象：

```text
knowledge_corpus: 部署时允许检索的文档集合
eval_questions: 冻结问题和 expected checks
training_samples: SFT/LoRA/蒸馏样本
```

更准确的隔离规则是：frozen eval questions/answers 不得进入训练；eval 的 `expected_span_id` 可以来自 `knowledge_corpus`，用于测试检索；但不能用 eval questions 或 expected labels 调 chunking、rerank、prompt，除非升版本并重新冻结。

### 例子 1：合同审查任务边界

模糊任务：

```text
帮我审合同。
```

工程化任务：

```text
输入：合同条款片段和合同类型
输出：risk_level、risk_labels、evidence_spans、suggested_review_points、needs_lawyer_review
边界：不输出确定法律结论，不替代律师意见，不处理未提供的上下文
```

这会直接影响数据标注。标注员不再写一段泛泛建议，而是按字段判断：是否有违约金过高、单方解除、责任排除、管辖争议等风险。

### 例子 2：医学科普任务边界

模糊任务：

```text
回答健康问题。
```

工程化任务：

```text
输入：用户问题、年龄段可选、是否包含危险信号
输出：科普解释、危险信号、就医建议级别、不能替代诊断声明
边界：不提供个体化诊断，不生成处方，不建议停药换药
```

医学任务的数据工程重点是 PHI/PII、急症升级、禁忌表达和证据版本。数据再多，如果混入真实可识别病历且没有授权，就不能安全发布。

### 反例或边界：公开文本不等于可随便训练

“网上能看到”不代表“可以用于训练、再分发或商业发布”。有些资料允许阅读，不允许复制；允许研究，不允许商用；允许引用，不允许构建衍生数据集。

工程边界是：当 `license` 或 `pii_status` 为 `unknown` 时，样本不能进入发布候选训练集。它最多进入本地探索，并且要在 manifest 里标记不可发布。

PII/PHI 字段也要拆细：

```text
pii_types
phi_types
deidentification_method
reidentification_risk
consent_status
retention_policy
human_privacy_review
```

自动脱敏不是发布许可；真实病历、可识别健康信息、稀有疾病组合和可回溯机构/日期默认不能进入教学仓库或公开模型训练。

清洗日志要绑定数据版本：

```json
{
  "sample_id": "",
  "action": "keep|drop|modify",
  "reason": "duplicate|license_unknown|pii_risk|low_quality|schema_invalid",
  "rule_version": "",
  "timestamp": ""
}
```

distill/teacher 数据还要额外记录：

```text
teacher_model_id
teacher_prompt_version
evidence_used
filter_status
support_label
unsafe_overclaim
```

未通过 support/refusal 审计的 teacher 样本不得进入发布候选训练。

## 常见错误

| 常见错误 | 后果 | 正确认识 | 最小防线 |
| --- | --- | --- | --- |
| 一份数据同时用于训练和评测 | 分数虚高 | eval 必须冻结且隔离 | 按 `source_group` 切分 |
| 没有来源和许可 | 后续无法发布或复现 | 数据是带权利边界的资产 | manifest 必填 `license` |
| 只清洗文本，不记录规则 | 无法解释数据变化 | 清洗也是实验变量 | 保存 cleaning log |
| 医学样本保留可识别信息 | 隐私和合规风险 | PHI/PII 必须先处理 | 脱敏状态必填 |
| 标注规范只给例子不给反例 | 标注不一致 | 反例定义边界 | guideline 包含 bad cases |
| 只按行随机切分 | 同源泄漏 | 来源组比样本行更重要 | `source_id/source_group` |
| 任务定义频繁变化 | 数据不可复用 | schema 是行为契约 | schema 版本化 |

标注规范要有复核机制，而不只是例子：

```text
double_annotation_rate
adjudication_rule
reviewer_role
disagreement_taxonomy
inter_annotator_agreement
```

分歧样本优先用于修订 guideline，而不是简单投票吞掉。

## 测试验收

- 每条数据有来源、许可、版本和用途。
- train/eval 无泄漏，能按 `source_group` 检查。
- 高风险字段已脱敏或标记为不可用。
- 输出 data card 和数据质量报告。
- 标注规范包含至少 5 个正例、3 个反例和字段级解释。
- 每次清洗能报告保留数量、丢弃数量和丢弃原因。
- frozen eval 的 `source_group` 列表写入第 12 章 eval runner 配置，后续 RAG/SFT/LoRA 只能读取，不能静默改动。
- 数据质量报告要单独列出用于 SFT、RAG、distill、eval 的样本数，防止用途混淆。

一个最小数据质量报告可以包含：

```text
dataset_name: legal_sft_v1
total_samples: 1200
usable_samples: 860
dropped_duplicate: 140
dropped_license_unknown: 90
dropped_pii_risk: 35
dropped_low_quality: 75
train_sources: 42
eval_sources: 8
known_limitations: ...
```

## FAQ

### 1. 数据越多越好吗？

不一定。高风险项目里，来源清楚、边界明确、标注一致的小数据，常常比混杂的大数据更有价值。脏数据会让模型更稳定地学会错误模式。

### 2. SFT 数据和 RAG 数据可以共用来源吗？

可以共用领域来源，但要明确用途和切分。用于 eval 的来源必须隔离。RAG 知识库可以包含可检索文档，SFT 样本则训练回答格式和行为，二者不要混成一团。

### 3. 脱敏是不是把姓名替换掉就够了？

不够。电话、地址、身份证号、病历号、罕见疾病组合、具体日期和机构信息都可能重新识别个人。医学数据尤其需要保守处理。

### 4. 为什么要写 data card？

data card 是给未来的自己、评审者和发布流程看的。它说明数据从哪里来、能做什么、不能做什么、有什么偏差、有哪些合规限制。

### 5. 标注员之间不一致怎么办？

先不要急着投票合并。应回到任务定义，看字段是否模糊、反例是否不足、风险等级是否太细。标注分歧常常暴露任务定义问题。

## 自测题

1. 为什么同一来源的不同切片同时进入 train 和 eval 会造成泄漏？
2. 请说明 SFT、RAG、distill、eval 四类数据的用途差异。
3. `license = unknown` 的样本应该如何处理？
4. 医学数据脱敏至少要考虑哪些字段？
5. 为什么任务 schema 变化需要版本化？

答案要点：

- 模型可能记住来源结构、术语和答案模式，导致 eval 分数虚高。
- SFT 学行为格式，RAG 提供外部证据，distill 从 teacher 迁移输出但需过滤，eval 用于冻结比较。
- 不进入发布候选训练集，最多本地探索并显式标记。
- 姓名、联系方式、地址、证件号、病历号、日期、机构、稀有组合等。
- schema 是数据和模型输出契约，变化后历史样本和指标不可直接比较。

## 想继续深挖

继续深挖数据工程，要把数据集看成从真实分布里抽出的样本：

```text
train_set ~ P_train(x, y)
eval_set  ~ P_eval(x, y)
```

如果 `P_eval` 和真实使用场景不同，评测会虚高；如果 train/eval 有重复，评测会变成记忆检查。最简单的 leakage 检查是：

```text
intersection(train_hashes, eval_hashes) == empty
```

但领域项目还要检查 `source_group`：同一份合同模板、同一篇指南、同一个案例改写出的样本，可能文本不同但信息来源相同。深挖数据工程，就是把“样本从哪里来、允许用于什么、是否进入 eval、是否泄漏、是否覆盖高风险切片”全部变成 manifest 里的可审计字段。

## 和领域项目的关系

法律合同审查和医学科普助手的可靠性，首先取决于数据是否可追溯、可冻结、可审核。本章决定后续 RAG 查什么、SFT 学什么、蒸馏过滤什么、评测证明什么。

法律项目里，数据工程要记录司法辖区、合同类型、条款位置、来源版本和是否需要律师复核。医学项目里，数据工程要记录指南版本、适用人群、危险信号、PHI 状态和是否允许模型回答。

这章的工程边界是：数据工程不能替代模型能力，但它决定模型能力是否可解释、可发布、可复现。失败模式也很现实：任务边界模糊会导致标注混乱，许可不清会阻止发布，脱敏不足会造成合规风险，泄漏会制造虚假的进步。
