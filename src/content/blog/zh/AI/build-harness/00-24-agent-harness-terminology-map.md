---
title: "Agent Harness 术语地图：从 Intent 到 Context Manager"
description: "用 glossary / map 的形式收口核心术语：首讲章节、典型消费者、常见混淆和教学项目字段映射，并补上 Context Policy 与 Context Manager 的边界。"
author: LienJack
pubDate: 2026-05-29
updatedDate: 2026-06-03
heroImage: './assets/cover.jpg'
locale: "zh"
tags:
  - Agent
  - Harness
  - Glossary
  - Context Manager
  - 技术教程
aliases:
  - Agent Harness 术语地图
  - Harness Glossary
  - Context Manager 术语
---

# Agent Harness 术语地图：从 Intent 到 Context Manager

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

> 给 00-13 以后共用的核心对象固定一张地图。

## 先按章节找词

| 术语 | 首次正式展开 | 后续用途 |
| --- | --- | --- |
| `ToolIntent` | 00-10 / 00-12 | 模型行动提议 |
| `Observation` | 00-13 | 给模型、UI、State 的事实投影 |
| `Artifact` | 00-13 / 00-16 / 00-23 | 大块证据材料 |
| `Snapshot` | 00-16 / 00-21 | 某一时刻的可复盘证据包 |
| `Projection` | 00-15 / 00-19 | 给某类消费者看的视图 |
| `ContextPolicy` | 00-15 | Context Builder 内部的模型输入投影策略 |
| `Trace` | 00-19 | 失败诊断投影 |
| `Compaction` | 00-15 / Agent 设计范式 01 | 可审计压缩，不替代原始事件 |
| `Governance` | 00-20 / 00-23 | 跨 session / 用户 / 项目的策略生命周期 |
| `ContextManager` | Agent 设计范式 01 | 事件溯源、状态投影、上下文编译、压缩和恢复的运行时中枢 |

## 易混淆对照

| 容易混淆 | 一句话区分 |
| --- | --- |
| Observation vs Audit Event | Observation 给模型 / 用户 / 状态，Audit Event 给 replay / trace / 审计。 |
| Artifact vs Snapshot | Artifact 是材料，Snapshot 是一次可见证据包目录。 |
| Trace vs Event Log | Event Log 是事实源，Trace 是诊断投影。 |
| Context Policy vs Context Manager | Context Policy 管本轮模型输入投影，Context Manager 管事实源、状态投影、压缩、恢复和分支。 |
| Summary vs Event Log | Summary 是派生物，Event Log 是事实源。 |
| Permission vs Trust | Permission 管这次 intent 能不能执行，Trust 管这个来源能不能贡献能力。 |
| Memory vs Retrieval | Memory 管长期知识写入治理，Retrieval 管本轮边界内召回和投影。 |
| Verification vs Final Answer | Verification 证明目标是否完成，Final Answer 只能引用验证证据。 |

## 行动链路里的对象

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

## 能力系统里的对象

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

## 控制语义里的三个词

`Permission`、`Trust`、`Governance` 不应该混用。

| 术语 | 作用层级 | 例子 |
| --- | --- | --- |
| `Permission` | 某次具体 intent 能否执行 | 这次能不能写 `src/auth.ts` |
| `Trust` | 某个来源是否允许贡献能力 | 这个 extension / MCP server 能不能加载 |
| `Governance` | 跨 session、跨用户、跨项目的策略、审计、生命周期治理 | memory 写入、组织策略、secret 生命周期 |

extension trust 不是 tool permission。

memory governance 也不是某次工具调用审批。

## 完成状态必须落到 verification

最终回答不能替代验证。

```text
Observation 说明某一步发生了什么。
Verification Observation 说明目标是否被验证。
Final Answer 只能引用 verification evidence，不能代替 verification。
```

所以“工具执行完了”“模型说修好了”“验证通过了”是三种不同状态。

Agent Harness 的完成语义应该以最后一种为准。

## 本章代码落点

本章不是新增 runtime，而是给读者和代码建立同一张 glossary table：

```text
term
firstMentionedChapter
typicalConsumer
commonConfusion
projectFieldMapping
```

验收标准是：

```text
读者能查到术语首讲位置。
每个术语都能对应到一个消费者或代码字段。
易混淆概念能用一句话拆开。
```

## 教学 Harness 落点

这张术语地图最好和教学项目的字段对齐：Intent 对应 `ToolCallContent`，Observation 对应 `ToolResultMessage`，Event 对应 `AgentEvent`，Projection 对应 `buildContext()` 产物，Snapshot 对应 retrieval 或模型输入快照，Trace 对应可回放的事件序列。这样术语不只是解释词，而能直接指导读者读代码。

---

GitHub 地址: [00-24-agent-harness-terminology-map.md](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-24-agent-harness-terminology-map.md)
