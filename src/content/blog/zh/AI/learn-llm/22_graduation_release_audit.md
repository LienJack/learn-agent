---
title: "第 22 章：毕业发布审计"
description: "一个领域小模型能不能发布，应该由什么材料证明？不能由一次漂亮 demo 决定，而要由代码、数据、评测、安全和部署证据共同决定。"
author: LienJack
pubDate: 2026-06-01
locale: zh
tags:
  - LLM 学习
  - LLM
  - AI
---
# 第 22 章：毕业发布审计

## 本章核心困惑

一个领域小模型能不能发布，应该由什么材料证明？不能由一次漂亮 demo 决定，而要由代码、数据、评测、安全和部署证据共同决定。

课程走到这里，你已经能训练、检索、微调、蒸馏、量化和服务一个领域助手。但真正的毕业问题不是“能不能跑”，而是“能不能被审计”。如果模型出错，你能否追溯到数据版本、检索证据、模型配置、评测结果、上线时间和回滚路径？如果不能，就还不是一个可发布系统。

问题演化链：

```text
模型 demo 看起来可用
  -> 需要证明不是偶然样例
  -> 需要固定评测和失败分类
  -> 需要数据卡、模型卡、风险报告
  -> 需要部署报告、隐私检查、回滚预案
  -> 需要 release review 做出明确结论
  -> no_release/internal_only/canary/release/rollback 必须有证据支撑
```

生活类比：发布审计像飞机起飞前的检查单。不是因为飞行员不会飞，而是因为复杂系统不能靠感觉起飞。

## 前置知识

- 已完成至少一个法律或医学领域项目。
- 已有 eval report、data card、model card、risk report 和部署报告。
- 知道 `no_release / internal_only / canary / release / rollback` 的区别。

补充前置材料：

| 材料 | 作用 | 最低要求 |
| --- | --- | --- |
| `eval_report.md` | 证明任务质量 | 固定集、指标、失败样例 |
| `failure_taxonomy.md` | 解释模型怎么错 | 分类、数量、示例、修复方向 |
| `data_card.md` | 说明数据来源和限制 | 来源、版本、清洗、泄漏检查 |
| `model_card.md` | 说明模型用途和边界 | intended/out-of-scope、评测、安全 |
| `risk_report.md` | 说明安全和合规风险 | 红队、隐私、人工复核 |
| `deployment_report.md` | 说明服务质量 | latency、throughput、日志、回滚 |
| `rollback_playbook.md` | 说明失败后怎么退回 | 目标版本、步骤、owner、演练记录 |
| `release_decision.md` | 给出结论 | no_release/internal_only/canary/release |

## 本章新增能力

你会组织一次 release review，汇总 `eval_report.md`、`failure_taxonomy.md`、`model_card.md`、`data_card.md`、`risk_report.md`、`release_decision.md` 和 `rollback_playbook.md`。

核心概念深讲：

| 概念 | 朴素解释 | 为什么必须有 |
| --- | --- | --- |
| release audit | 发布前审计 | 把“我觉得能用”变成“证据显示可用” |
| traceability | 可追溯 | 出错时知道是哪个版本、数据、配置 |
| blocking risk | 阻断发布的风险 | 防止带病上线 |
| residual risk | 剩余风险 | 说明已知但可接受的限制 |
| owner | 负责人 | 风险必须有人关闭 |
| rollback playbook | 回滚预案 | 线上失败时快速恢复 |
| internal_only | 仅内部试用 | 在有限范围继续收集证据 |

发布审计不是找一个“完美模型”。真实模型总有失败。审计要回答的是：

```text
失败是否已知？
失败是否可接受？
高风险失败是否阻断？
用户是否被正确告知边界？
出问题是否能回滚？
```

本章要把前面材料收束成六类证据：

| 证据类 | 必须回答的问题 | 典型文件 |
| --- | --- | --- |
| eval | 固定评测是否通过，失败是什么 | `eval_report.md`, `failure_taxonomy.md` |
| model | 哪个模型、adapter、量化版本被审计 | `model_card.md`, config hash |
| data | 数据来源、许可、脱敏和泄漏检查是否清楚 | `data_card.md` |
| risk | 法律/医学边界、红队、隐私、人工复核是否达标 | `risk_report.md` |
| release | 结论、范围、owner 和阻断项是什么 | `release_decision.md` |
| rollback | 失败时退到哪里、谁执行、是否演练过 | `rollback_playbook.md` |

缺任一类材料，发布结论最多只能是 `internal_only`；缺风险或回滚材料时，高风险领域默认 `no_release`。

材料清单必须版本化：

| material | version | candidate_model | hash | status |
| --- | --- | --- | --- | --- |
| eval_report | eval-2026-05 | legal-v4-int8 | sha256:... | present |
| risk_report | risk-2026-05 | legal-v4-int8 | sha256:... | present |
| model_card | card-2026-05 | legal-v4-int8 | sha256:... | present |
| data_card | data-2026-05 | legal-v4-int8 | sha256:... | present |
| deployment_report | deploy-2026-05 | legal-v4-int8 | sha256:... | present |

## 最小推导或最小代码

发布判断不是单指标，而是门禁表：

```text
format pass
+ citation support pass
+ high-risk refusal pass
+ privacy test pass
+ latency/cost acceptable
+ rollback ready
= canary candidate
```

最小发布结论：

```markdown
# Release Decision

- Decision: no_release | internal_only | canary | release | rollback
- Blocking risks:
- Required follow-up:
- Rollback version:
- Owner:
```

状态机定义：

| state | 进入条件 | 流量范围 | 人工复核 | 回滚要求 |
| --- | --- | --- | --- | --- |
| no_release | critical blocking、材料缺失、gate fail | 0 | 必须修复后重审 | 不上线 |
| internal_only | 非 critical 边界问题，但访问控制和人审完备 | 指定内部用户 | 强制 | 可退回上一候选 |
| canary | gate pass 且无阻断风险 | 小流量或选定 reviewer | 高风险强制 | rollback command 已演练 |
| release | canary 通过，监控稳定 | 目标范围 | 按风险策略 | 有 rollback target |
| rollback | 线上触发停止条件 | 恢复旧版本 | 复盘前冻结新流量 | 执行并记录 smoke test |

最小推导：为什么要有 `internal_only`？

假设一个法律助手：

```text
schema pass: 99%
citation support: 96%
high-risk human review: 98%
privacy test: pass
latency p95: acceptable
rollback: ready
```

但 red-team 发现“用户强烈要求直接判断胜诉概率”时，模型仍有 8% 样本给出过度确定回答。这个版本不适合公开 release，但如果内部法务可见、所有输出必须律师确认、日志严格脱敏，它可能适合 `internal_only`。这就是第三种结论的价值：不把世界简化成“上线/不上线”。

最小审计代码：

```python
def audit_release(gates):
    blocking = []
    critical = []
    if not gates["schema_pass"]:
        blocking.append("schema")
    if not gates["citation_pass"]:
        blocking.append("citation")
    if not gates["privacy_pass"]:
        blocking.append("privacy")
    if not gates["rollback_ready"]:
        blocking.append("rollback")
    if not gates["high_risk_boundary_pass"]:
        blocking.append("high_risk_boundary")
    if not gates["materials_complete"]:
        blocking.append("materials")
    if gates.get("critical_blocking"):
        critical.append("critical")

    if critical:
        return "no_release", critical
    if blocking:
        controls = gates.get("internal_only_controls", {})
        controlled = (
            blocking == ["high_risk_boundary"]
            and controls.get("allowed_users")
            and controls.get("traffic_scope")
            and controls.get("human_review_enforced")
            and controls.get("export_disabled")
            and controls.get("audit_logging")
            and controls.get("expiration_date")
        )
        if controlled:
            return "internal_only", blocking
        return "no_release", blocking
    return "canary", []

decision, blocking = audit_release({
    "schema_pass": True,
    "citation_pass": True,
    "privacy_pass": True,
    "rollback_ready": True,
    "high_risk_boundary_pass": False,
    "internal_only_controls": {
        "allowed_users": ["reviewer@example.com"],
        "traffic_scope": "selected internal reviewers",
        "human_review_enforced": True,
        "export_disabled": True,
        "audit_logging": True,
        "expiration_date": "2026-06-30",
    },
    "materials_complete": True,
})
assert decision == "internal_only"
assert blocking == ["high_risk_boundary"]
```

release decision 的指标表也要带样本量和区间：

| metric | threshold | n | estimate | interval | pass/fail |
| --- | ---: | ---: | ---: | --- | --- |
| schema_pass | 0.98 | 300 | 0.992 | [0.972, 0.998] | pass |
| claim_support | 0.90 | 120 | 0.958 | [0.904, 0.984] | pass |

incident response 记录至少包含：`severity`、`first_response_owner`、`rollback_time`、`user_impact`、`added_failure_cases`、`postmortem_link`、`next_review_date`。

最小实验：选择法律或医学项目的一个 checkpoint，冻结所有版本号，跑一次完整审计。不要再改模型；只收集证据、写报告、做发布结论。

### 具体例子 1：法律项目审计

候选版本：`legal-assistant-student-v4-int8`

审计发现：

- schema pass 99.2%。
- citation support 95.8%。
- high/unknown 样本 human review 标记 98.7%。
- red-team 中“请直接告诉我能不能赢”仍有少量过度确定回答。
- 日志已对合同主体和金额做脱敏。
- rollback target 为 `legal-assistant-v3-fp16`。

可能结论：

```text
Decision: internal_only
Reason: 常规合同审查链路可用，但法律意见边界仍有少量失败。
Requirement: 仅内部法务试用，所有 high/unknown 输出必须人工确认。
Follow-up: 增加胜诉承诺类红队样本，修复 prompt 和蒸馏数据。
```

这里的重点是结论和证据一致：不是因为模型“还不错”就 release，也不是因为有瑕疵就完全停止。

### 具体例子 2：医学项目审计

候选版本：`medical-qa-v2-fp16`

审计发现：

- 普通科普质量较好。
- red flag recall 低于阈值，尤其是“儿童高热伴精神差”漏检。
- PHI 脱敏通过。
- clinician review 标记在孕期用药样本中达标。
- latency 可接受，rollback ready。

可能结论：

```text
Decision: no_release
Reason: red flag recall 是医学项目阻断门禁，不能用普通质量分抵消。
Required follow-up: 补充儿童急症 red-team set，修正路由规则，重新评测。
```

医学项目的阻断风险更严格，因为漏掉危险信号可能造成现实伤害。

### 反例和边界

反例：漂亮 demo 不能作为发布证据。

如果团队只展示 5 个成功样例，没有固定评测、没有失败样例、没有版本号、没有回滚计划，那么即使 demo 很顺，也不能发布。

边界：发布审计不是一次性仪式。数据更新、模型微调、检索索引变化、prompt 变化、量化方式变化，都可能触发重新审计。小改动也可能影响高风险边界。

## 常见错误

| 常见错误 | 表面现象 | 风险 | 修正方式 |
| --- | --- | --- | --- |
| 没有明确发布结论 | 报告很多分数 | 团队不知道能不能用 | 必须写 no_release/internal_only/canary/release |
| 高风险失败没有 owner | 问题被记录 | 没人关闭 | 每个 blocking risk 绑定负责人和日期 |
| 版本不可追溯 | 文件名随意 | 无法复现问题 | 记录 model/data/eval/config hash |
| 没有 rollback playbook | 上线流程简单 | 故障扩大 | 写明回滚目标、步骤、负责人 |
| 用平均分抵消安全失败 | 总体看不错 | 红旗/越界被掩盖 | 安全门禁一票否决 |
| 把 `internal_only` 当 release | 范围模糊 | 风险外溢 | 明确访问权限和人工复核 |
| 审计后继续改 prompt | 临时修一下 | 报告失效 | 改动后重新跑受影响门禁 |

## 测试验收

- 有明确发布结论：`no_release`、`internal_only`、`canary`、`release` 或 `rollback`。
- 每个高风险失败都有 owner 和 follow-up。
- 发布版本可回滚。
- 模型、数据、评测集和配置可追溯。
- eval/model/data/risk/release/rollback 六类材料齐全，且版本号相互一致。
- release decision 必须说明适用范围、阻断风险、剩余风险、回滚目标和下一次复审条件。

建议毕业审计清单：

| 检查项 | 通过标准 | 证据文件 |
| --- | --- | --- |
| 任务边界 | intended/out-of-scope 清楚 | `model_card.md` |
| 数据来源 | 来源、清洗、去重、隐私说明完整 | `data_card.md` |
| 质量评测 | 固定 eval 和失败样例 | `eval_report.md` |
| 证据支持 | claim-span 可核查 | `citation_report.md` |
| 安全红队 | 法律/医学边界覆盖 | `risk_report.md` |
| 部署指标 | latency、throughput、错误率 | `deployment_report.md` |
| 回滚 | 目标版本和步骤可执行 | `rollback_playbook.md` |
| 结论 | 明确 decision 和 owner | `release_decision.md` |
| 材料一致性 | model/data/eval/risk/release/rollback 版本互相匹配 | release review 记录 |

### Release Review 会议模板

```markdown
# Release Review

## Candidate
- Model:
- Data:
- Eval:
- Retrieval index:
- Serving config:

## Evidence Summary
- Quality:
- Citation:
- Safety:
- Privacy:
- Deployment:
- Rollback:

## Blocking Risks
| Risk | Severity | Owner | Due | Decision |
| --- | --- | --- | --- | --- |

## Required Materials
| Material | Version | Status | Link |
| --- | --- | --- | --- |
| Eval report | | | |
| Model card | | | |
| Data card | | | |
| Risk report | | | |
| Release decision | | | |
| Rollback playbook | | | |

## Decision
- Decision:
- Scope:
- Residual risk:
- Rollback:
- Next review date:
```

### FAQ

Q：如果只有个人学习项目，也需要发布审计吗？

A：需要简化版。哪怕不公开上线，也应知道数据从哪来、模型在哪些题上失败、是否有隐私风险、能否复现。

Q：所有指标都达标就一定 release 吗？

A：不一定。还要看使用范围、组织承受风险、人工复核是否到位、法律/医学边界是否清楚。

Q：修了一个 prompt 小问题，是否需要重新审计？

A：至少要重新跑受影响评测。prompt 变化可能影响引用、拒答和输出格式。

Q：发布后发现线上失败怎么办？

A：按 rollback playbook 回退，保留事件记录，补充失败样本，更新风险报告，再重新审计。

### 自测题

1. 为什么发布审计不能只看 demo？
2. `release`、`internal_only`、`no_release` 的区别是什么？
3. 哪些改动会触发重新审计？
4. 为什么 rollback 是发布门禁的一部分？
5. 医学项目中，为什么 red flag 失败可能一票否决？

答案要点：

1. demo 样本少、不可复现、可能选择性展示，不能证明真实可靠性。
2. release 面向目标使用范围；internal_only 只限内部受控试用；no_release 表示存在阻断风险。
3. 模型、数据、评测集、检索索引、prompt、量化方式、服务配置、安全策略变化。
4. 线上失败不可完全避免，回滚能控制影响范围并保护用户。
5. 因为漏掉危险信号可能造成现实健康风险，不能被普通科普质量抵消。

## 想继续深挖

继续深挖毕业审计，要把 release decision 写成证据函数：

```text
decision = f(eval_report, model_card, data_card, risk_report, rollback_playbook)
```

如果任一关键证据缺失，就不能发布：

```text
release_allowed =
  eval_passed
  and data_traceable
  and high_risk_failures_owned
  and rollback_ready
  and residual_risk_accepted
```

毕业审计不是再训练一次模型，而是检查“能不能证明”。深挖时要逐项追问：模型版本能回滚吗？数据版本能追溯吗？失败案例有 owner 吗？风险报告承认剩余风险吗？发布结论是 release、internal_only，还是 no_release？这些问题决定课程项目是否从 demo 变成工程资产。

## 和领域项目的关系

本章是课程收束：从第 0 章的学习仓库，到 MiniGPT、Hugging Face、评测、数据、RAG、SFT、LoRA、蒸馏、安全和部署，最终都要变成一次可审计的发布决策。

法律项目最终证据链：

```text
contract sample
  -> data_card
  -> legal evidence spans
  -> model output
  -> citation/risk eval
  -> lawyer review rule
  -> deployment report
  -> release decision
```

医学项目最终证据链：

```text
health question
  -> PHI masking
  -> guideline evidence spans
  -> red flag route
  -> non-diagnostic output
  -> clinician review rule
  -> safety gate
  -> release decision
```

毕业标准不是“我训练了一个模型”，而是“我能证明这个模型在定义好的边界内、用定义好的证据、通过定义好的门禁，做出定义好的发布结论”。这也是从学习项目走向真实工程项目的分界线。
