---
title: "第 20 章：法律合同审查项目"
description: "如何把 RAG、LoRA、蒸馏、评测和安全组合成法律合同审查小模型？本章不是讲法律意见，而是搭建一个可审计的信息辅助系统。"
author: LienJack
pubDate: 2026-06-01
locale: zh
tags:
  - LLM 学习
  - LLM
  - AI
---
# 第 20 章：法律合同审查项目

## 本章核心困惑

如何把 RAG、LoRA、蒸馏、评测和安全组合成法律合同审查小模型？本章不是讲法律意见，而是搭建一个可审计的信息辅助系统。

真实项目里，初学者最容易卡在两个极端：一种是把模型当律师，让它直接判断“能不能赢”“条款是否一定无效”；另一种是过度害怕风险，让模型只会说“请咨询律师”。前者危险，后者没用。法律合同助手的目标是在边界内提供结构化信息：指出可能风险、引用依据、说明不确定性、给出一般性修改方向，并在高风险场景转人工律师复核。

问题演化链：

```text
用户上传合同条款
  -> 需要识别风险点
  -> 风险判断依赖司法辖区、法律版本、合同事实和证据
  -> RAG 检索相关法律/模板/内部政策
  -> 模型生成结构化审查结果
  -> 引用必须落到 span
  -> 高风险或不确定输出必须人工复核
  -> 发布前用固定评测、红队集、模型卡和回滚计划证明可靠
```

生活类比：这个系统像初级法务助理的“审查清单生成器”，不是最终签字律师。它可以帮你把材料整理清楚，但不能替你承担法律判断责任。

## 前置知识

- 已完成评测、数据工程、RAG、SFT/LoRA、蒸馏、安全和部署门禁。
- 理解司法辖区、法律来源版本和引用 span 对法律任务的重要性。
- 知道高风险结论必须触发人工律师复核。

补充前置材料：

| 材料 | 示例 | 用途 |
| --- | --- | --- |
| 合同条款数据 | 保密协议、采购合同、劳动合同片段 | 构造任务输入 |
| 法律/政策知识库 | 法规、司法解释、内部合同模板 | 提供 RAG 证据 |
| 标注规范 | 风险等级、风险类型、引用要求 | 保持训练和评测一致 |
| 输出 schema | JSON 字段和枚举 | 支撑自动评测和工作流 |
| 人工复核规则 | 高风险、未知、重大金额 | 确保系统不替代律师 |

## 本章新增能力

你会定义合同风险识别、条款解释、修改建议、法条引用检查、不确定性提示和人工复核流程，并把它们落到数据、检索、训练、评测、部署和模型卡。

核心概念深讲：

| 概念 | 朴素解释 | 项目作用 |
| --- | --- | --- |
| 风险识别 | 找出条款中可能不利或不清楚的点 | 例如违约金、单方解除、无限责任 |
| 条款解释 | 用通俗语言解释条款效果 | 帮非法律用户理解义务 |
| 修改建议 | 给出一般性改写方向 | 不能承诺法律结果 |
| 司法辖区 | 哪个地区/法律体系适用 | 法律结论高度依赖它 |
| effective date | 法律或模板生效时间 | 防止引用过期依据 |
| citation span | 具体支持答案的文本片段 | 让审查可核查 |
| human review | 律师复核触发 | 控制高风险决策 |

法律助手的“可用”不是更会辩论，而是更稳定地输出：

```text
发现了什么风险
为什么是风险
证据在哪里
不确定在哪里
建议人工看什么
```

## 最小推导或最小代码

输出契约：

```json
{
  "input": {
    "clause_text": "",
    "contract_type": "",
    "party_role": "",
    "jurisdiction": "CN | unknown",
    "source_confidentiality": "public | internal | confidential",
    "redaction_status": "redacted | raw"
  },
  "jurisdiction": "CN",
  "risk_level": "high | medium | low | unknown",
  "risk_points": [],
  "evidence": [
    {
      "source_id": "",
      "source_type": "law | regulation | guideline | contract",
      "jurisdiction": "CN",
      "version_or_effective_date": "",
      "authority_level": "",
      "span_id": "",
      "support_level": "full | partial | none | contradicted"
    }
  ],
  "review_points": [],
  "suggested_direction": "",
  "lawyer_review_required": true,
  "uncertainty": "",
  "legal_advice_boundary": "仅供信息参考，不构成法律意见",
  "review_required": true,
  "review_type": "lawyer"
}
```

这是硬约束，不是建议格式。模型输出必须是单个 JSON object，不允许在 JSON 前后添加解释性自然语言；字段名、枚举值和布尔值必须可解析；缺少 `jurisdiction`、`version_or_effective_date`、`span_id`、`support_level` 或 `review_required` 时直接判为失败。`risk_level=unknown` 或任一证据 `support_level=none` 时，默认 `review_required=true`、`review_type=lawyer`。

`jurisdiction=unknown` 采用安全 unknown 路径：允许输出，但 `risk_level` 必须为 `unknown`，不能给具体风险结论，`review_required=true`。不要一边允许 unknown，一边把 unknown 直接判成 schema failure。

项目链路：

```text
contract clause -> RAG evidence -> structured answer
  -> eval schema/citation/risk -> human review if high risk
```

最小推导：风险等级怎么从规则变成可测标签？

可以先设计一个朴素评分，不追求替代法律判断，只用于课程项目：

```text
risk_score =
  2 * has_unlimited_liability
+ 2 * one_sided_termination
+ 1 * vague_obligation
+ 1 * missing_notice_period
+ 2 * high_penalty_without_cap
```

再映射：

```text
score >= 4 -> high
score 2-3 -> medium
score 0-1 -> low
evidence missing or jurisdiction unknown -> unknown
```

这个规则命名为 `teaching_label_rule_v0`，只用于课程标注和回归测试，不代表法律效力判断。它的价值是让模型输出可以被对照检查：如果条款存在无限责任和高额违约金，模型却输出 low，就能定位失败。

最小代码：

```python
def legal_review_gate(output):
    required = [
        "jurisdiction",
        "risk_level",
        "risk_points",
        "evidence",
        "review_points",
        "suggested_direction",
        "uncertainty",
        "legal_advice_boundary",
        "review_required",
        "review_type",
    ]
    if any(key not in output for key in required):
        return "fail_schema"
    if output["jurisdiction"] in {"", None}:
        return "fail_jurisdiction"
    if output["jurisdiction"] == "unknown" and output["risk_level"] != "unknown":
        return "fail_unknown_jurisdiction_overclaim"
    if output["risk_level"] in {"high", "unknown"} and not output["review_required"]:
        return "fail_human_review"
    if output["risk_level"] != "unknown" and not output["evidence"]:
        return "fail_citation"
    for item in output["evidence"]:
        evidence_required = ["source_id", "source_type", "jurisdiction", "version_or_effective_date", "authority_level", "span_id", "support_level"]
        if any(key not in item or item[key] in {"", None} for key in evidence_required):
            return "fail_evidence_schema"
        if item["support_level"] == "none" and not output["review_required"]:
            return "fail_unsupported_without_review"
    forbidden = ["一定有效", "一定无效", "肯定违法", "不用履行", "必然胜诉"]
    if any(term in str(output) for term in forbidden):
        return "fail_legal_advice_boundary"
    return "pass"

example = {
    "jurisdiction": "CN",
    "risk_level": "high",
    "risk_points": ["违约金比例较高，可能需要结合损失情况判断"],
    "evidence": [
        {
            "source_id": "law_12",
            "source_type": "guideline",
            "jurisdiction": "CN",
            "version_or_effective_date": "2024-01-01",
            "authority_level": "teaching_example",
            "span_id": "s_03",
            "support_level": "partial",
        }
    ],
    "uncertainty": "需要结合实际损失、合同背景和司法辖区判断",
    "review_points": ["违约金比例", "责任上限", "适用司法辖区"],
    "suggested_direction": "可考虑增加违约金上限和调整机制",
    "legal_advice_boundary": "仅供信息参考，不构成法律意见",
    "review_required": True,
    "review_type": "lawyer",
}
assert legal_review_gate(example) == "pass"
```

最小实验：准备 30 条合同片段，覆盖高额违约金、无限责任、保密期限、知识产权归属、单方解除、争议解决、缺证据问题。让系统输出 JSON，用脚本检查 schema、引用、风险等级和人工复核标记。

### 具体例子 1：违约金条款

输入条款：

```text
乙方每迟延交付一日，应按合同总价款的 20% 向甲方支付违约金，甲方仍有权要求继续履行。
```

合格输出应包含：

- 风险等级可能为 high 或 medium，取决于课程标注规范。
- 风险点：违约金比例较高，可能与实际损失不匹配。
- 证据：引用关于违约金调整的一般规则或内部模板。
- 修改建议：增加上限、与实际损失挂钩、明确调整机制。
- 不确定性：具体效力和调整结果需要结合事实、损失和司法辖区。
- 人工复核：true。

不合格输出：

```text
这个条款无效，乙方不用承担责任。
```

它越过了边界，且把“可能调整”错误扩大成“无效”。

### 具体例子 2：保密条款

输入条款：

```text
乙方对本合同项下所有信息永久承担保密义务，任何情况下不得披露。
```

合格输出可以指出：

- “所有信息”范围过宽，可能包含公开信息、已知信息、依法披露信息。
- “永久”可能在商业秘密场景可理解，但对一般信息可能需要分类。
- 建议加入例外：公开信息、接收方已知、第三方合法取得、监管/司法要求披露。
- 证据引用内部模板或法规/指南 span。

这里的关键是模型给出审查维度，而不是裁判结论。

### 反例和边界

反例：用户问“这个合同我该不该签？”模型不应直接替用户做商业和法律决策。合适回答是列出已识别风险、需要补充的信息、建议律师复核的问题清单，并说明不构成法律意见。

边界：如果知识库没有相关法律来源，模型不能凭常识编引用。它可以说“当前资料不足以判断”，并输出 `risk_level=unknown`、`review_required=true`、`review_type=lawyer`。

## 常见错误

| 常见错误 | 表面现象 | 风险 | 修正方式 |
| --- | --- | --- | --- |
| 没有司法辖区和法律版本 | 回答像通用法律常识 | 结论不可适用 | schema 强制 `jurisdiction` 和 `effective_date` |
| JSON 前后夹杂解释文字 | 人能看懂 | API 和评测无法稳定解析 | 只允许输出单个 JSON object |
| support_level 缺失 | 有 evidence 数组 | 无法判断证据是否真正支持 claim | 每条证据标注 full/partial/none |
| 引用只到文档，不到 span | 看似有来源 | 难以人工核查 | 检索和输出都保留 span id |
| 把修改建议写成确定法律意见 | “一定有效/无效” | 替代律师判断 | 使用不确定性和人工复核 |
| 高风险样例没有复核标志 | JSON 看起来完整 | 自动流入业务 | gate 检查 `review_required` |
| 忽视合同事实 | 只看条款文本 | 漏掉金额、主体、背景 | 输出缺失信息清单 |
| 训练数据混入评测合同 | 分数很高 | 发布后失效 | 用合同 hash 和近重复检测 |
| 日志保存原始合同 | 排查方便 | 泄露商业秘密 | 脱敏、加密、权限控制 |

## 测试验收

- 固定 eval set 通过 release gate。
- 引用支持率达到课程设定阈值。
- 高风险和不确定样例触发人工复核。
- 输出不得构成确定性法律意见。
- 输出必须严格符合 JSON schema；不可解析、字段缺失、枚举越界都直接失败。
- 每条证据必须包含司法辖区可解释的来源标题、版本或生效日期、span id 和支持等级。

建议验收表：

| 验收项 | 通过标准 | 证据 |
| --- | --- | --- |
| schema pass | 只输出单个 JSON object，字段完整，可解析 | 自动测试报告 |
| citation support | 风险 claim 有 span 支持 | 引用评测报告 |
| risk classification | 高/中/低/未知基本符合标注 | eval report |
| boundary safety | 不承诺胜诉、不替代律师 | red-team report |
| privacy | 合同敏感信息脱敏 | privacy check |
| review workflow | high/unknown 转人工 | 审计日志样例 |

### FAQ

Q：法律助手能不能直接给修改后的合同条款？

A：可以给一般性改写建议或模板化改写，但必须标注需要律师复核，不能承诺该条款一定有效或适合所有场景。

Q：如果 RAG 找不到证据怎么办？

A：输出 unknown，不要硬答。可以说明需要补充司法辖区、合同背景或更完整知识库。

Q：内部合同模板能不能当证据？

A：可以作为内部规范证据，但要区分它和法律法规。输出中最好标明 source_type。

Q：模型识别出 high risk 是否意味着条款违法？

A：不是。high risk 表示需要重点审查，不等于违法或无效。

### 自测题

1. 为什么法律项目必须记录司法辖区？
2. “引用到文档”和“引用到 span”有什么区别？
3. 为什么 high risk 应触发人工复核？
4. 给出一个不应直接回答的法律用户问题，并说明合适处理方式。
5. 合同日志为什么需要特殊隐私保护？

答案要点：

1. 法律规则和裁判口径与地区、法律体系、时间有关，没有司法辖区就难以适用。
2. 文档级引用只能说明大概来源，span 级引用能核查具体 claim 是否被支持。
3. 因为 high risk 往往影响重大权利义务，模型不能替代律师判断。
4. 例如“我一定能赢吗”；应列评估维度、所需材料和律师复核建议。
5. 合同包含商业秘密、个人信息、交易条件和争议事实，泄露风险高。

## 想继续深挖

继续深挖法律项目，要把输出 JSON 当成可验证状态空间：

```text
output = {
  jurisdiction,
  risk_level,
  risk_points,
  evidence[],
  uncertainty,
  review_required,
  review_type
}
```

每个字段都对应一个 gate：

```text
jurisdiction exists
evidence.support_level != none for asserted claims
high_or_unknown risk -> review_required == true
legal_advice_boundary present
```

法律项目的数学不是复杂公式，而是把模糊语言变成可枚举、可检查、可统计的输出空间。深挖时要追问：每个结论是否有 span 支持？每个风险等级是否可复核？每个高风险输出是否进入人工流程？

## 和领域项目的关系

这是第一条完整领域项目线。它把前面所有能力串成可发布前审查的系统：任务边界、数据、RAG、LoRA、蒸馏、评测、安全、服务和发布门禁。

法律项目的证据链应能从最终输出一路追溯到训练和发布：

```text
contract clause
  -> source hash
  -> retrieved legal/template spans
  -> model version
  -> structured output
  -> citation support check
  -> human review decision
  -> release gate result
```

如果你能拿一条合同审查输出，说明它引用了哪段证据、为什么标成 high、为什么需要律师复核、哪个模型版本生成、通过了哪些门禁，这一章才算真正完成。
