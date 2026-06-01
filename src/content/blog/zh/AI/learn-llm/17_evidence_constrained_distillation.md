---
title: "第 17 章：证据约束蒸馏"
description: "很多同学第一次做蒸馏时，会自然地把 teacher 当成“更聪明的答案生成器”：把问题丢给大模型，收集一批看起来流畅的回答，再拿去训练 student。这个流程在闲聊任务里可能暂时可用，但一进入法律、医学、金融、政务这类高风险领域，问题就变了：如果 teacher 自信地编出一个不存在的依据，..."
author: LienJack
pubDate: 2026-06-01
locale: zh
tags:
  - LLM 学习
  - LLM
  - AI
---
# 第 17 章：证据约束蒸馏

## 本章核心困惑

很多同学第一次做蒸馏时，会自然地把 teacher 当成“更聪明的答案生成器”：把问题丢给大模型，收集一批看起来流畅的回答，再拿去训练 student。这个流程在闲聊任务里可能暂时可用，但一进入法律、医学、金融、政务这类高风险领域，问题就变了：如果 teacher 自信地编出一个不存在的依据，小模型会把这种幻觉学得更便宜、更快、更难发现。

本章要解决的真实困惑不是“怎么让小模型模仿大模型”，而是：

- teacher 的回答到底由什么证据支持？
- student 学到的是“会说话”，还是“会在证据边界内回答”？
- 当证据不足时，模型是否学会说不知道、拒答或请求人工复核？
- 蒸馏后便宜了多少，可靠性又掉了多少？

问题演化链可以写成：

```text
大模型太贵
  -> 想用小模型承接常见问题
  -> 直接蒸馏会复制 teacher 幻觉
  -> 必须让 teacher 基于检索证据回答
  -> 必须过滤 unsupported answer
  -> student 训练后还要在固定评测集上和 base/teacher 对比
  -> 最终产物不是一个“更会说”的小模型，而是一个有证据链的小模型
```

生活类比：你不是让助教背诵教授的所有结论，而是要求助教回答时附上教材页码、推导步骤和不确定之处。没有页码的漂亮答案不能进入讲义。

## 前置知识

- 已有 RAG baseline、SFT 数据和 eval harness。
- 理解 teacher/student、response distillation 和 logit distillation 直觉。
- 知道高风险领域必须保留证据来源。

补充检查清单：

| 前置能力 | 为什么重要 | 没有它会怎样 |
| --- | --- | --- |
| 固定评测集 | 判断 student 是否真变好 | 只能靠主观 demo |
| 文档切片和 span id | 检查答案是否被具体证据支持 | 引用停留在“某文档”层面 |
| 输出格式约束 | 让证据、结论、拒答可解析 | 后续无法自动过滤 |
| 失败类型标注 | 知道该改检索、prompt 还是数据 | 所有错误混成“模型不好” |

## 本章新增能力

你会设计 evidence-grounded generation、蒸馏数据生成、数据过滤、unsupported answer reject、student 训练，以及 base/teacher/student 固定评测对比。

核心概念可以拆成四层：

1. 证据约束生成：teacher 只能根据给定 evidence 回答，不能把内部知识当成证据。
2. 支持性检查：答案中的关键 claim 必须能被 evidence span 支持。
3. 保守蒸馏目标：student 不只学习结论，也学习引用、不确定性和拒答。
4. 三方对比评测：base、teacher、student 必须在同一套题上比较质量、引用和安全。

这里的 teacher 更像“受控样本生成器”，不是事实仲裁者。它可以帮助改写问题、生成结构化答案、补全不确定性表达，但每个事实性 claim 都必须回到 RAG evidence。法律/医学项目尤其要避免“teacher 说了所以对”：teacher 的内部知识可能过期、混淆司法辖区或遗漏红旗症状，不能替代可审计来源。

一个可落地的数据记录建议如下：

```json
{
  "question_id": "q_001",
  "question": "合同中违约金过高时可以怎么处理？",
  "answerability": "answerable",
  "normalized_question_hash": "sha256:...",
  "source_span_hash": "sha256:...",
  "teacher_prompt_hash": "sha256:...",
  "semantic_near_duplicate_score": 0.12,
  "retrieved_evidence": [
    {"source_id": "law_doc_12", "span_id": "s_03", "text": "..."}
  ],
  "teacher_output": {
    "answerability": "answerable | insufficient_evidence | partial | red_flag",
    "answer": "...",
    "citations": [{"source_id": "law_doc_12", "span_id": "s_03"}],
    "uncertainty": "需要结合具体合同和司法辖区判断",
    "review_required": true,
    "review_type": "lawyer | clinician | safety"
  },
  "claims": [
    {
      "claim_id": "c_001",
      "claim_text": "可以请求调整过高违约金",
      "span_id": "s_03",
      "support_label": "full",
      "review_method": "manual",
      "reviewer": "domain_reviewer",
      "confidence": 0.9
    }
  ],
  "student_target": {
    "answer": "...",
    "evidence": [{"source_id": "law_doc_12", "span_id": "s_03"}],
    "uncertainty": "需要结合具体合同和司法辖区判断"
  },
  "keep": true
}
```

## 最小推导或最小代码

证据约束蒸馏流程：

```text
RAG 取证据
  -> teacher 基于证据回答
  -> 自动检查引用支持
  -> 人工抽检
  -> 过滤 unsupported answer
  -> student 训练
  -> 固定 eval set 对比
```

最小推导：为什么不能只看 teacher 质量？

假设一批蒸馏样本有 100 条，teacher 表面正确率为 90%。但其中 20 条没有证据支持。student 学到这些样本后，离线准确率可能仍然不错，却会在真实系统中制造不可追溯答案。

可以把有效蒸馏样本粗略定义为：

```text
effective_sample = task_correct * citation_supported * boundary_safe
```

其中任一项为 0，这条样本就不应该直接进入训练。于是：

```text
100 条 teacher 样本
- 8 条任务错误
- 15 条引用不支持
- 5 条越过安全边界
= 72 条可用于蒸馏的候选样本
```

这个推导只有在三类失败互斥时才成立。真实审核里一条样本可能同时“引用不支持”和“越过安全边界”，所以报告时要记录每类原因的次数，也要单独记录 `unique_rejected_examples`。数据量不是越多越好，可验证样本才有价值。

过滤逻辑：

```python
def keep_for_distillation(sample):
    if not sample.get("evidence"):
        return False
    if sample.get("answerability") == "insufficient_evidence" and sample.get("teacher_output", {}).get("citations"):
        return False
    if sample["citation_support"] in {"none", "missing", "contradicted"}:
        return False
    if any(claim["support_label"] in {"none", "contradicted"} for claim in sample.get("claims", [])):
        return False
    if sample["safety_label"] in {"legal_advice", "diagnosis", "unsafe"}:
        return False
    if sample["answer_style"] == "overconfident_without_uncertainty":
        return False
    return True

sample["keep"] = keep_for_distillation(sample)
```

teacher 是生成训练信号的工具，不是事实来源。事实来源必须来自可记录、可更新、可审计的 evidence。

teacher prompt 必须写清楚：

```text
只能使用 provided evidence。没有可用证据时输出 answerability=insufficient_evidence，
不要使用内部知识补全，不要编造 citation，不要给最终法律/医学判断。
```

固定评测集必须复用第 12 章的 eval harness，而不是为本章临时挑一批顺眼样例。蒸馏实验至少报告：

```text
base vs teacher vs student
quality score
citation support
unsupported answer rate
refusal / unknown correctness
high-risk human-review trigger
schema pass
```

如果 student 平均质量分提高，但引用支持率下降、缺证据拒答变差、医学 red flag 或法律 high-risk 人工复核触发率下降，本章实验不能算通过。蒸馏迁移的是“证据内回答的行为”，不是 teacher 的自信语气。

高风险默认走 response distillation：让 student 学结构化答案、引用、不确定性和复核动作。只有在 teacher/student tokenizer 与 vocab 对齐、teacher 已严格 evidence-filtered、且安全回归不下降时，才考虑 logit distillation；否则 soft logits 会把 teacher 的越界偏好也压进 student。

最小实验可以不用真实大模型，先用几条手写样本验证过滤器：

```python
samples = [
    {"id": 1, "evidence": ["span_1"], "citation_support": "supported", "safety_label": "safe", "answer_style": "calibrated"},
    {"id": 2, "evidence": [], "citation_support": "missing", "safety_label": "safe", "answer_style": "calibrated"},
    {"id": 3, "evidence": ["span_2"], "citation_support": "supported", "safety_label": "diagnosis", "answer_style": "overconfident_without_uncertainty"},
]

kept = [s["id"] for s in samples if keep_for_distillation(s)]
assert kept == [1]
```

这个实验的意义是先验证“发布前的规则”能运行，再接入真实 teacher。

### 具体例子 1：法律合同条款

问题：合同写明“乙方迟延一天支付总价款 20% 作为违约金”，用户问“这个条款一定有效吗？”

不合格 teacher 回答：

```text
该条款无效，因为违约金明显过高。
```

问题在于它把“可能调整”说成“无效”，且没有证据。

合格 teacher 目标：

```text
根据给定证据，违约金过高时通常不是当然无效，而是可能由当事人请求调整。
该结论需要结合合同背景、损失情况和适用司法辖区判断。
证据：law_doc_12/s_03。
该回答仅供信息参考，不构成法律意见。
```

student 应该学习的不是某个固定结论，而是“引用证据 + 限定条件 + 人工复核”的行为。

### 具体例子 2：医学科普问答

问题：用户说“胸口痛、喘不过气，能不能先吃止痛药观察？”

不合格 teacher 回答：

```text
可以先休息并服用常见止痛药。
```

这类回答即使语气温和，也可能错过危险信号。

合格 teacher 目标：

```text
胸痛伴呼吸困难属于需要及时就医评估的危险信号。不能仅凭在线问答判断原因，
也不应把止痛药作为替代诊疗方案。建议尽快联系急救或线下医疗机构。
证据：medical_guideline_08/s_11。
```

student 在蒸馏中必须学习 red flag 触发，而不是只学习“解释症状”。

### 反例和边界

反例：有些问题不适合蒸馏成确定答案。

例如用户问：“我这份具体劳动合同能不能赢官司？”即使检索到相关法规，证据也不足以判断事实、证据链、管辖、诉讼策略和司法裁量。此时合格目标应是：

```text
无法根据当前信息判断胜诉概率。可以说明一般评估维度，并建议带合同和证据材料咨询律师。
```

边界：证据约束蒸馏不是让模型完全不使用常识，而是要求高风险 claim 必须可追溯。比如“建议阅读合同全文”是一般性建议，不一定需要引用；但“该条款无效”“需要立即服药”必须有证据和边界。

## 常见错误

| 常见错误 | 表面现象 | 风险 | 修正方式 |
| --- | --- | --- | --- |
| teacher 没有证据也生成确定答案 | 回答流畅但引用为空 | 幻觉被蒸馏进 student | prompt 强制证据内回答，缺证据则 unknown |
| 只保留“看起来流畅”的样本 | 人工觉得好读 | 评价标准偏向文风 | 增加 citation support 和 safety label |
| student 只和 base 比 | 指标提升但不知道上限 | 无法判断蒸馏损失 | 同时报告 base/teacher/student |
| 蒸馏数据混入 eval set | 分数异常好 | 数据泄漏 | 用 question id、source hash 去重 |
| 只蒸馏答案，不蒸馏拒答 | 常规题变好，高风险题变差 | 线上越界回答 | 把拒答、转人工、不确定性也作为 target |
| 引用只到文档级 | “来自指南 A” | 无法核查具体句子 | 保留 span id 和 evidence text hash |

## 测试验收

- 每条 teacher 样本必须有证据来源。
- unsupported answer 必须被过滤。
- student 必须在固定 eval set 上和 base/teacher 对比。
- 必须复用第 12 章固定 eval set，并记录 eval 版本。
- 蒸馏后平均分提升不能抵消引用支持、拒答边界或高风险人工复核指标下降。
- 报告过滤率、人工抽检结果和失败类型。

建议验收表：

| 指标 | 最小要求 | 解释 |
| --- | --- | --- |
| eval set 版本 | 复用第 12 章固定集 | 防止为蒸馏结果重新挑题 |
| 样本保留率 | 不是越高越好，需要解释 | 保留率过高可能说明过滤过松 |
| 引用支持率 | 高风险 claim 必须接近全支持 | 重点看 claim-span 对齐 |
| 拒答一致性 | 缺证据题不能硬答 | 检查 student 是否继承边界 |
| 高风险复核 | 不低于 base/teacher 设定门槛 | 法律 high/unknown、医学 red flag 必须触发 |
| teacher-student 差距 | 质量可有小幅下降 | 但安全指标不能明显下降 |
| 人工抽检 | 覆盖法律/医学高风险样本 | 自动规则不能替代专家审阅 |

### FAQ

Q：teacher 本身很强，为什么还要 RAG 证据？

A：强模型知道很多模式，但训练语料不可追溯、可能过期，也可能把相似规则混在一起。RAG 证据让答案能被当前项目的数据版本约束。

Q：过滤掉很多样本会不会导致数据不够？

A：会，但这是有意义的损失。宁可先训练一个覆盖范围小但边界清楚的 student，也不要训练一个覆盖广但不可审计的模型。

Q：能不能把 teacher 的 logits 也蒸馏下来？

A：可以，但本课程优先讲 response distillation，因为法律和医学项目更需要可读证据链。logit distillation 仍然要配合安全评测，不能绕过证据过滤。

Q：student 回答比 teacher 短，是不是失败？

A：不一定。若 student 保留了正确结论、引用、不确定性和拒答边界，短回答可能更适合服务场景。

### 自测题

1. 为什么“teacher 回答正确”不等于“样本适合蒸馏”？
2. citation support、answer correctness、boundary safety 三者分别检查什么？
3. 法律项目中，为什么“违约金过高所以条款无效”是危险表述？
4. 医学项目中，为什么红旗症状样本必须进入蒸馏和评测？
5. 如何发现蒸馏数据污染了 eval set？

答案要点：

1. 因为样本还必须有证据支持、边界安全、可追溯，不能只看结论。
2. citation support 看 claim 是否被 span 支持；answer correctness 看任务结论是否合理；boundary safety 看是否越过法律意见、诊断、处方等边界。
3. 因为“可能调整”和“当然无效”不是同一结论，且需要司法辖区、事实和裁量条件。
4. 因为模型必须学会及时转交和拒绝低风险化处理，这也是安全能力。
5. 用 question id、文本 hash、source span、语义近重复检查，并固定评测集版本。

## 想继续深挖

继续深挖蒸馏，要区分 hard label 和 soft distribution。hard label 只说：

```text
正确答案 = A
```

soft label 还给出 teacher 的不确定性：

```text
P_teacher = {A: 0.70, B: 0.20, C: 0.10}
```

student 学的是分布接近：

```text
KL(P_teacher || P_student)
```

但在法律/医学场景里，teacher distribution 不是事实来源。它只能在证据约束下生成候选行为。深挖本章时要加一道过滤：

```text
teacher_answer supported_by evidence ? keep : reject
```

蒸馏迁移的是“基于证据回答、无依据拒答、保留不确定性”的行为，不是 teacher 的权威感。

## 和领域项目的关系

法律和医学蒸馏如果不约束证据，会把强模型的幻觉压缩进小模型。本章把蒸馏纳入 RAG、评测和安全门禁，让便宜模型学到可审计行为，而不是更便宜地犯错。

在法律项目中，本章产出的证据链是：

```text
合同问题 -> 法规/案例/条款 span -> teacher 结构化回答 -> 支持性检查 -> student target -> 法律 release gate
```

在医学项目中，本章产出的证据链是：

```text
症状/科普问题 -> 指南 span -> red flag 判断 -> teacher 谨慎回答 -> clinician review 标记 -> student target -> 医学 safety gate
```

最终你要能回答一句话：student 为什么可以被信任？答案不是“因为它像 teacher”，而是“因为它继承的是经过证据、过滤、抽检和固定评测约束后的行为”。
