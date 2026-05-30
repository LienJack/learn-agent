---
title: "Agent Harness terminology map: Intent, Observation, Event, Artifact, Snapshot, Projection, and Trace"
description: "Starting with Tool Runtime, the series enters a stage where terms can easily blur together."
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.jpg'
locale: "en"
tags:
  - Agent
  - Harness
  - Glossary
  - Technical Tutorial
aliases:
  - Agent Harness Terminology Map
  - Harness Glossary
---

# Agent Harness terminology map: Intent, Observation, Event, Artifact, Snapshot, Projection, and Trace

Starting with Tool Runtime, the series enters a stage where terms can easily blur together.

The model no longer only answers questions. It proposes tool intents; the Harness validates, authorizes, executes, records, resumes, retrieves, injects context, delegates subtasks, and finally verifies that the goal was actually completed.

If the terms are not defined, boundaries slowly smear:

```text
observation looks like event
event looks like log
artifact looks like snapshot
snapshot looks like context
memory looks like retrieval
trace looks like audit
permission looks like governance
```

This short appendix fixes one shared map for the core objects used from 00-13 to 00-23.

## 1. Objects in the action path

| Term | Fixed meaning | Typical consumer |
| --- | --- | --- |
| `ToolIntent` | Structured action intent proposed by the model | Provider Runtime / Tool Runtime |
| `ToolInvocation` | Tool request accepted, validated, authorized, and prepared by the runtime | Scheduler / Executor |
| `ToolExecution` | The process in which Tool Runtime actually executes the tool and may cause side effects | Tool Runtime / Sandbox |
| `Raw Result` | Raw result returned by the tool implementation, such as stdout, stderr, diff, or file bytes | Normalizer / Artifact Store |
| `Observation` | Fact projection for the model, user, or state reducer | Model / UI / State Reducer |
| `Verification Observation` | Observation specifically stating whether the goal was verified | Final Answer / Trace |
| `Audit Event` | Fact event for replay, trace, and audit | Session Store / Trace Analyzer |
| `Artifact` | Large evidence material, such as full logs, diffs, model input snapshots, or source evidence | Artifact Store / Audit |
| `Snapshot` | Visible evidence package or context evidence package at one point in time | Replay / Trace / Context Policy |
| `Projection` | A consumer-specific view derived from a source of truth | Context Policy / UI / Trace |

The basic direction is:

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

Side-channel evidence should keep references instead of being forced into the prompt:

```text
RawResult -> Artifact
RetrievalResult -> AuditSnapshot
ContextProjection -> DecisionLedger
EventLog -> TraceView
CandidateMemory -> GovernanceStore
```

## 2. Objects in the capability system

The capability system also needs layers.

```text
Plugin Host lets external capabilities enter the system.
Registry records the internal facts of registered capabilities.
Capability Catalog is an expanded Registry view covering tool / skill / resource / prompt / channel.
Discovery Policy selects the current Visible Set from the Catalog.
Context Policy assembles Visible Set, state, rules, and retrieved blocks into Model Input.
Tool Runtime only decides whether one concrete ToolIntent can execute.
```

Therefore:

```text
existing does not mean visible
visible does not mean executable
executable does not mean exempt from audit
```

## 3. Three words in control semantics

`Permission`, `Trust`, and `Governance` should not be mixed.

| Term | Layer | Example |
| --- | --- | --- |
| `Permission` | Whether one concrete intent may execute | May this call write `src/auth.ts`? |
| `Trust` | Whether a source may contribute capabilities | May this extension / MCP server load? |
| `Governance` | Cross-session, cross-user, cross-project policy, audit, and lifecycle control | memory writes, organization policy, secret lifecycle |

Extension trust is not tool permission. Memory governance is not one tool-call approval.

## 4. Completion must land in verification

Final answer cannot replace verification.

```text
Observation says what happened in one step.
Verification Observation says whether the goal was verified.
Final Answer may cite verification evidence, but cannot replace it.
```

So "the tool ran", "the model said it is fixed", and "verification passed" are three different states. Agent Harness completion semantics should use the third one as the anchor.

## Teaching Harness Landing Point

This terminology map should align with teaching-project fields: Intent maps to `ToolCallContent`, Observation to `ToolResultMessage`, Event to `AgentEvent`, Projection to the output of `buildContext()`, Snapshot to retrieval or model-input snapshots, and Trace to replayable event sequences. The terms then guide code reading instead of remaining abstract definitions.

---

GitHub source: [00-24-agent-harness-terminology-map.md](https://github.com/LienJack/build-harness/blob/main/docs/en/00-24-agent-harness-terminology-map.md)
