---
title: "Trace Analysis: locating Agent failures with fact logs"
description: "Once an Agent has provider runtime, tool runtime, permission, session replay, and delegation, it looks like a working system. Then it says \"I fixed..."
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.png'
locale: "en"
tags:
  - Agent
  - Harness
  - Trace Analysis
  - Observability
  - Evaluation
  - Technical Tutorial
aliases:
  - Agent Trace Analysis
  - Agent Failure Attribution
  - Fact Log Diagnosis
  - Harness Observability
---

# Trace Analysis: locating Agent failures with fact logs

Once an Agent has provider runtime, tool runtime, permission, session replay, and delegation, it looks like a working system. Then it says "I fixed the failing test", and the user reruns the test and still sees failure.

Without trace, every failure collapses into "the model was wrong." That is easy, but it has little engineering value. If the real bug is in permission, tool runtime, context projection, verification, or delegation join, changing the model will not fix the system.

Event log records what happened. Trace organizes why it happened. Trace Analysis attributes failure to model, context, tool, permission, observation, verification, or delegation boundaries.

## Problem Chain

```text
After failure, final transcript compresses the problem into "model was wrong"
-> session log records facts but is not yet a diagnostic view
-> trace connects goal, context, model decision, intent, permission, execution, observation, verification
-> Trace Analysis attributes failure to the broken boundary
-> attribution must point to a repair route
-> first confirm whether the model saw the key fact at decision time
-> diagnostic reports preserve evidence, impact, and suggested fix
-> failure samples become eval and regression cases
```

## 1. Without trace, failure becomes "model was wrong"

A test run first fails with `expected user.id to be string, received number`. The Agent edits `normalizeUser`. The second run fails differently: `legacy login should preserve numeric user_id for v1 API`. The Agent misses the change and keeps editing the same path.

Final transcript is too coarse. Trace asks: did the model see the second failure? Was it truncated? Did verification read the exit code? Did a sub-agent detect legacy API risk? Did join ignore an unknown?

![Trace Analysis: locating Agent failures with fact logs Mermaid 1](./assets/00-19-trace-analysis-agent-failures/mermaid-01.png)

## 2. Session log is fact source, not diagnostic view

Events such as `model.requested`, `tool.intent.created`, `permission.checked`, `tool.executed`, and `observation.created` preserve facts. Trace projects those facts into a responsibility chain.

![Trace Analysis: locating Agent failures with fact logs Mermaid 2](./assets/00-19-trace-analysis-agent-failures/mermaid-02.png)

## 3. A diagnosable trace connects eight boundaries

```text
goal
context projection
model decision
tool intent
permission
execution
observation
verification
```

If any boundary is missing, attribution becomes guesswork.

![Trace Analysis: locating Agent failures with fact logs Mermaid 3](./assets/00-19-trace-analysis-agent-failures/mermaid-03.png)

## 4. What a test-fix trace should look like

Trace should show the original user goal, model input snapshot, test command, raw result artifact, observation shown to the model, edit diff, second test result, verification observation, and final answer reference.

## 5. Failure taxonomy is not a labeling game

![Trace Analysis: locating Agent failures with fact logs Mermaid 4](./assets/00-19-trace-analysis-agent-failures/mermaid-04.png)

Useful classes include:

```text
model_decision_error
context_missing_fact
tool_execution_error
permission_misclassification
observation_projection_error
verification_missing
delegation_join_error
```

The class matters only if it tells us which layer to repair.

## 6. Model decision error

Before blaming the model, prove the model had the required facts in its input. If the fact was in the raw log but absent from model context, the failure is context projection, not model reasoning.

## 7. Context missing fact

The most dangerous case is "the fact exists in the log but not in front of the model." Trace should distinguish discovered, projected, and used facts.

![Trace Analysis: locating Agent failures with fact logs Mermaid 5](./assets/00-19-trace-analysis-agent-failures/mermaid-05.png)

## 8. Tool execution error

Tool failure is not only a thrown exception. Wrong working directory, partial output, timeout treated as success, stale artifact, or malformed diff can all be execution-layer failures.

## 9. Permission misclassification

Both allow and deny can be wrong. A safe test command denied by policy blocks progress; a risky write auto-approved by delegation leaks control.

## 10. Observation projection error

The worst observation bug is turning failure into success. Raw tool output may say exit code 1 while the model receives "tests completed." Trace must preserve the raw artifact and the projection decision.

## 11. Missing verification

Final answer is not verification. Verification observation must say what command or check was run, what evidence proves the goal, and what remains unverified.

## 12. Delegation Join error

A sub-agent may discover evidence, but the parent may ignore it, drop unknowns, or merge conflicting findings incorrectly.

![Trace Analysis: locating Agent failures with fact logs Mermaid 6](./assets/00-19-trace-analysis-agent-failures/mermaid-06.png)

## 13. Trace Analyzer pipeline

![Trace Analysis: locating Agent failures with fact logs Mermaid 7](./assets/00-19-trace-analysis-agent-failures/mermaid-07.png)

```text
Event Log
-> Trace Projection
-> Fact Extraction
-> Rule Checks
-> Failure Classification
-> Diagnostic Report
-> Eval Candidate
```

## 14. Diagnostic report

A diagnostic report should read like an incident review, not a chat summary. It should contain symptom, expected behavior, evidence, broken boundary, impact, suggested repair, and regression candidate.

## 15. Relationship to eval

Failures that can be explained can become regression cases. Eval should preserve input trace, expected boundary classification, and expected repair route.

## 16. Minimum implementation

Start locally:

```bash
agent trace report --session <id>
```

Produce a Markdown report from event log and artifact references before building a large observability platform.

## 17. Bad smells

```text
only final transcript is stored
raw tool result is lost
verification is inferred from final answer
permission decisions have no evidence
child traces are separate from parent trace
diagnostic report says "model failed" with no boundary
```

## 18. Trace Analysis leads to Memory Governance

Once failures are diagnosable, some facts look reusable. That creates the next risk: writing temporary, uncertain, or malicious facts into long-term memory.

## 19. Load-bearing chain

```text
Event log preserves facts.
Trace projects responsibility.
Analysis attributes failures.
Reports propose repairs.
Evals preserve regressions.
Memory governance decides what may survive beyond the session.
```

## Image Plan

```text
photo-01-log-to-trace-diagnosis.png
photo-02-failure-taxonomy-map.png
photo-03-trace-analyzer-pipeline.png
photo-04-delegation-join-failure.png
```

---

GitHub source: [00-19-trace-analysis-agent-failures.md](https://github.com/LienJack/build-harness/blob/main/docs/en/00-19-trace-analysis-agent-failures.md)
