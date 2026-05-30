---
title: "Agent Harness 术语地图：Intent、Observation、Event、Artifact、Snapshot、Projection、Trace 的关系"
description: "从 Tool Runtime 开始，系列文章进入了一个更容易混淆的阶段。"
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.jpg'
locale: "zh"
tags:
  - Agent
  - Harness
  - Glossary
  - 技术教程
aliases:
  - Agent Harness 术语地图
  - Harness Glossary
---

# Agent Harness 术语地图：Intent、Observation、Event、Artifact、Snapshot、Projection、Trace 的关系

从 Tool Runtime 开始，系列文章进入了一个更容易混淆的阶段。

模型不只是在回答问题。它会提出 tool intent，Harness 会校验、授权、执行、记录、恢复、检索、注入上下文、委派子任务，最后还要验证目标是否真的完成。

这时如果术语没有钉住，很多边界会慢慢糊在一起：

```text
observation 像 event。
event 像 log。
artifact 像 snapshot。
snapshot 像 context。
memory 像 retrieval。
trace 像 audit。
permission 像 governance。
```

这篇短附录只做一件事：

> 给 00-13 到 00-23 共用的核心对象固定一张地图。

## 一、行动链路里的对象

| 术语 | 固定含义 | 典型消费者 |
| --- | --- | --- |
| `ToolIntent` | 模型提出的结构化行动意图 | Provider Runtime / Tool Runtime |
| `ToolInvocation` | Runtime 接受、校验、授权后准备执行的工具请求 | Scheduler / Executor |
| `ToolExecution` | Tool Runtime 真实执行工具并可能产生副作用的过程 | Tool Runtime / Sandbox |
| `Raw Result` | 工具实现返回的原始结果，如 stdout、stderr、diff、文件字节 | Normalizer / Artifact Store |
| `Observation` | 面向模型、用户、状态的事实投影 | Model / UI / State Reducer |
| `Verification Observation` | 专门说明目标是否被验证的 observation | Final Answer / Trace |
| `Audit Event` | 面向 replay、trace、审计的事实事件 | Session Store / Trace Analyzer |
| `Artifact` | 大块证据材料，如完整日志、diff、模型输入快照、原文证据 | Artifact Store / Audit |
| `Snapshot` | 某一时刻的可见证据包或上下文证据包 | Replay / Trace / Context Policy |
| `Projection` | 从事实源到某个消费者视图的投影 | Context Policy / UI / Trace |

它们的基本方向是：

```text
ModelEvent
-> ToolIntent
-> Validation / Permission
-> ToolInvocation
-> ToolExecution
-> RawResult
-> Observation
-> Audit Event
-> State
-> ContextProjection
-> ModelInput
```

旁路证据不要硬塞进 prompt，而要保留引用：

```text
RawResult -> Artifact
RetrievalResult -> AuditSnapshot
ContextProjection -> DecisionLedger
EventLog -> TraceView
CandidateMemory -> GovernanceStore
```

## 二、能力系统里的对象

能力系统也需要分层。

```text
Plugin Host 负责外部能力进入系统。
Registry 记录已注册的内部能力事实。
Capability Catalog 是 Registry 的扩展视图，记录 tool / skill / resource / prompt / channel。
Discovery Policy 从 Catalog 里选择本轮 Visible Set。
Context Policy 把 Visible Set、状态、规则、retrieved block 装配成 Model Input。
Tool Runtime 只处理某个具体 ToolIntent 是否可执行。
```

所以：

```text
存在不等于可见。
可见不等于可执行。
可执行不等于可以绕过审计。
```

## 三、控制语义里的三个词

`Permission`、`Trust`、`Governance` 不应该混用。

| 术语 | 作用层级 | 例子 |
| --- | --- | --- |
| `Permission` | 某次具体 intent 能否执行 | 这次能不能写 `src/auth.ts` |
| `Trust` | 某个来源是否允许贡献能力 | 这个 extension / MCP server 能不能加载 |
| `Governance` | 跨 session、跨用户、跨项目的策略、审计、生命周期治理 | memory 写入、组织策略、secret 生命周期 |

extension trust 不是 tool permission。

memory governance 也不是某次工具调用审批。

## 四、完成状态必须落到 verification

最终回答不能替代验证。

```text
Observation 说明某一步发生了什么。
Verification Observation 说明目标是否被验证。
Final Answer 只能引用 verification evidence，不能代替 verification。
```

所以“工具执行完了”“模型说修好了”“验证通过了”是三种不同状态。

Agent Harness 的完成语义应该以最后一种为准。

## 落地到教学 Harness

这张术语地图最好和教学项目的字段对齐：Intent 对应 `ToolCallContent`，Observation 对应 `ToolResultMessage`，Event 对应 `AgentEvent`，Projection 对应 `buildContext()` 产物，Snapshot 对应 retrieval 或模型输入快照，Trace 对应可回放的事件序列。这样术语不只是解释词，而能直接指导读者读代码。

---

GitHub 地址: [00-24-agent-harness-terminology-map.md](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-24-agent-harness-terminology-map.md)
