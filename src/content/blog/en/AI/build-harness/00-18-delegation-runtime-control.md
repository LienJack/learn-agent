---
title: "Delegation Runtime: delegate work without losing control"
description: "At this point, the small CLI Agent is no longer just a chat-shaped model wrapper. It has a provider, intent parsing, tool runtime, permission, even..."
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.png'
locale: "en"
tags:
  - Agent
  - Harness
  - Delegation Runtime
  - Sub-Agent
  - Multi-Agent
  - Technical Tutorial
aliases:
  - Delegation Runtime
  - Agent Task Delegation
  - Sub-Agent Control
  - Multi-Agent Delegation Runtime
---

# Delegation Runtime: delegate work without losing control

At this point, the small CLI Agent is no longer just a chat-shaped model wrapper. It has a provider, intent parsing, tool runtime, permission, event log, session replay, capability discovery, and a context policy. A user can now ask:

```text
This project has failing tests. Help me find the cause and fix it.
Also check whether the old API is affected.
If the change touches permission logic, run a security review too.
```

One Agent can do all of this sequentially, but three problems show up quickly: context noise, lost parallelism, and control leakage. Test logs, call chains, compatibility checks, permission logic, and security review all compete for the main context. Some work can be isolated or parallelized. But simply "calling more models" turns one controlled Agent into several uncontrolled copies.

Delegation Runtime solves this by treating delegation as a special tool call. A sub-agent is a controlled executor. The parent delegates local work, not final control.

```text
The parent Agent keeps final decision authority.
The parent Agent keeps write-permission and change-acceptance authority.
The parent Agent keeps join authority.
The sub-agent only has the local exploration rights granted by the task package.
```

## Problem Chain

```text
A single Agent can handle small tasks
-> large tasks pollute the main context with exploration noise
-> some local tasks can be parallelized or independently verified
-> directly spawning models loses tool, permission, trace, and result-contract boundaries
-> delegation must be modeled as a special tool intent
-> the parent Agent specifies goal, context, tools, permissions, budget, and output contract
-> the sub-agent returns structured observation and evidence
-> the parent Agent joins and reviews results, preserving final judgment and merge control
```

## 1. When tasks grow, the main thread is the first thing lost

A minimal Agent loop can run tests, observe a failure, read files, edit code, rerun tests, and answer. That works when the root cause is local. Real failures usually branch: session refresh behavior, legacy login API compatibility, and cookie / token permission boundaries may all matter.

If the parent Agent personally investigates everything, the main context becomes a mixture of user goal, logs, source files, old routes, frontend callers, test mocks, security checklists, unrelated files, wrong assumptions, and truncated tool outputs. More information does not always mean better judgment. The model now has to rediscover the main line every turn.

![Delegation Runtime: delegate work without losing control Mermaid 1](./assets/00-18-delegation-runtime-control/mermaid-01.png)

## 2. Treating sub-agents as model copies is the first multi-agent trap

A sub-agent is not just another model instance. If it can read everything, write everything, run commands, access the network, and approve itself, the Harness has lost the control plane. Delegation must still pass through validation, permission, audit, observation, and trace.

```text
normal tool call: model proposes intent -> runtime validates and executes
delegation: model proposes delegate_task intent -> runtime validates and runs a controlled executor
```

![Delegation Runtime: delegate work without losing control Mermaid 2](./assets/00-18-delegation-runtime-control/mermaid-02.png)

## 3. Task package: the parent does not send just one sentence

A useful delegation request is a task package, not a vague prompt.

```ts
type DelegatedTask = {
  objective: string;
  scope: string[];
  context: ContextProjection;
  allowedTools: string[];
  permissionPolicy: PermissionPolicy;
  budget: { steps: number; tokens: number; wallClockMs?: number };
  outputContract: ResultContract;
};
```

The package says what to investigate, what not to touch, what tools are visible, what risks must escalate, how much budget is available, and what shape the result must take.

## 4. Context isolation

The sub-agent should not receive a full copy of the parent context. It should receive a projection: local goal, relevant evidence, constraints, known assumptions, and output contract.

![Delegation Runtime: delegate work without losing control Mermaid 3](./assets/00-18-delegation-runtime-control/mermaid-03.png)

This keeps the parent context clean and prevents sub-agents from inheriting irrelevant state, private details, or speculative reasoning.

## 5. Tool inheritance

Sub-agents should not automatically inherit every parent tool. Common policies include:

```text
intersection: sub-agent tools = parent tools intersect role-allowed tools
subset: parent explicitly grants a tool subset
isolated: sub-agent uses its own fixed tool set
```

The sub-agent cannot exceed the parent control plane or its delegated role.

## 6. Permission boundary

High-risk actions must bubble back to the parent Agent or user.

![Delegation Runtime: delegate work without losing control Mermaid 4](./assets/00-18-delegation-runtime-control/mermaid-04.png)

```text
sub-agent may request
sub-agent may not self-approve
```

## 7. Result contract

The sub-agent should not return an essay. It should return structured evidence:

```ts
type DelegatedResult = {
  status: "completed" | "partial" | "blocked" | "failed";
  summary: string;
  evidence: EvidenceRef[];
  findings: Finding[];
  unknowns: string[];
  recommendedNextSteps: string[];
};
```

The parent must be able to distinguish evidence, assumptions, unknowns, and recommendations.

## 8. Join / Review

Join is not voting. It is evidence merge. The parent maps each sub-result back to the user goal, checks conflicts, reviews unknowns, decides whether to continue, re-delegate, ask the user, or finish.

## 9. Trace merge

Delegation must be written into the event log. The trace should answer why the parent delegated, what task package was sent, what context projection the sub-agent saw, what tools it used, what evidence it returned, and how the parent joined it.

## 10. Failure recovery

Sub-agent failure is not automatically parent-task failure.

![Delegation Runtime: delegate work without losing control Mermaid 5](./assets/00-18-delegation-runtime-control/mermaid-05.png)

Failures should be classified:

```text
validation failure -> fix task package
capability failure -> request permission or reassign
runtime failure -> retry or degrade
contract failure -> rewrite result into contract
conflict failure -> arbitrate evidence
```

## 11. Minimum implementation

Make delegation a tool:

```ts
const delegateTask = defineTool({
  name: "delegate_task",
  schema: DelegatedTaskSchema,
  async execute(task, runtime) {
    const child = await runtime.createChildSession(task);
    return await child.run();
  },
});
```

The parent loop still sees a normal observation. The child session gets its own trace and artifacts.

## 12. A complete test-fix chain

For a failing auth test, the parent may keep the implementation path while delegating legacy API compatibility and permission review. The sub-agents return structured evidence. The parent joins results, chooses the minimal fix, runs verification, and preserves the final decision.

## 13. Bad smells

```text
sub-agent receives full parent context by default
sub-agent inherits all tools by default
sub-agent can approve its own risky actions
result is free-form prose with no evidence
parent joins by majority vote
child trace is not attached to parent trace
unknowns are ignored at join time
```

## 14. When not to delegate

Do not delegate tiny single-file edits, tasks with one fragile ordering constraint, work requiring one tightly held mental model, or actions whose risk cannot be scoped.

## 15. Relationship to neighboring chapters

Delegation depends on tool runtime, permission, context policy, session replay, and capability discovery. It also creates the need for trace analysis: when the parent makes a bad final decision, we need to know whether the task package was wrong, the child evidence was wrong, or the join ignored something.

## 16. Minimum memory point

```text
Delegation Runtime does not solve how to make several Agents talk.
It solves how to split local work while the parent Agent keeps goal, permission, state, evidence merge, and final responsibility.
```

## Image Plan

```text
photo-01-delegation-as-tool-call.png
photo-02-context-isolation-join.png
photo-03-permission-escalation-control.png
photo-04-failure-recovery-join.png
```

---

GitHub source: [00-18-delegation-runtime-control.md](https://github.com/LienJack/build-harness/blob/main/docs/en/00-18-delegation-runtime-control.md)
