---
title: "Building Agent and Harness from 0 to 1"
description: "A hands-on engineering tutorial that starts with a simple CLI assistant and grows it into a controllable Agent Harness."
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.jpg'
locale: "en"
tags:
  - Agent
  - Harness
  - Tutorial
aliases:
  - Agent Harness Tutorial
  - Build Harness
---

# Building Agent and Harness from 0 to 1

This is a hands-on engineering tutorial for people who want to understand how modern coding agents actually work. It does not begin with a giant framework. It begins with a simple CLI assistant, then grows it step by step into a controllable Agent Harness.

The path moves from theory to practice: what an Agent is, why a prompt is not enough, how loops and tools turn language into action, why state and context must be designed, and how permissions, traces, memory, evals, delegation, and hosted execution become the control layer around the model.

If you have used ChatGPT, Claude, Cursor, or Claude Code and wondered, "What is the system outside the model doing?", this series is for you. By the end, you should be able to see an Agent not as magic, but as an engineered runtime with clear boundaries, contracts, and failure modes.

## What Is an Agent?

An Agent is a system where a model repeatedly decides what to do next, tools interact with the outside world, state records what happened, and a loop connects intention, execution, observation, and correction.

The essential parts are:

- **Model**: judges the next step.
- **Loop**: keeps the task moving across multiple turns.
- **Tools**: read files, run commands, search code, call APIs, or create artifacts.
- **State**: records messages, events, observations, artifacts, and decisions.
- **Policy**: controls context, permissions, safety, budgets, and recovery.

When those parts become observable, extensible, resumable, auditable, and productized, the Agent evolves into a **Harness**: the engineering control system outside the model.

## Who Should Read This?

This series is for developers who can read Python or TypeScript and are comfortable with APIs, JSON, CLI tools, Git, and basic runtime concepts. You do not need to be an AI researcher. You only need curiosity about how to build the system around an LLM so it can do real work.

## How to Read This Series

Read the series in the rhythm of "problem -> mechanism -> failure mode -> next mechanism." For every layer, keep three questions in view:

```text
What pain does this mechanism solve?
Where would the Agent lose control or distort reality without it?
How does it connect to the previous and next layers?
```

If you want the big map first, read 00-01 through 00-05. If you want to reach implementation quickly, read 00-07 and then build through 00-08 to 00-16: the minimal loop, tool runtime, context policy, and event log. The later chapters on capability discovery, delegation, traces, memory, retrieval, productization, and hosting turn a working Agent into a Harness that can be shipped, diagnosed, and maintained.

## Series Path

### Part 1: Agent Base Model and Harness Evolution

1. [Agent Base Definition: Why It Is Not a Prompt](https://github.com/LienJack/build-harness/blob/main/docs/en/00-01-agent-not-a-prompt.md)  
   Understand why an Agent is a runtime system, not a clever instruction. This chapter separates prompt design from action loops, state, tools, and control.

2. [Agent Composition Model: Model, Loop, Tools, State](https://github.com/LienJack/build-harness/blob/main/docs/en/00-02-agent-components.md)  
   Break an Agent into its minimum useful parts. You will learn how the model, loop, tools, and state cooperate to produce repeatable behavior.

3. [System Boundaries: The Difference Between ChatBot, Workflow, Agent, and Harness](https://github.com/LienJack/build-harness/blob/main/docs/en/00-03-chatbot-workflow-agent-harness.md)  
   Map the boundary between scripted workflows, conversational bots, autonomous agents, and harnesses. This gives you a vocabulary for choosing the right architecture.

4. [Harness Base Definition: The Control System Outside the Model](https://github.com/LienJack/build-harness/blob/main/docs/en/00-04-harness-control-system.md)  
   See the Harness as the layer that owns execution, permissions, recovery, audit, and product behavior. The model proposes; the Harness governs.

5. [Agent Evolution Path: Chat Agent -> Tool Agent -> Runtime Agent -> Managed Agent](https://github.com/LienJack/build-harness/blob/main/docs/en/00-05-agent-evolution-path.md)  
   Follow the staged evolution from chat to tools, then to runtime control and managed operation. This chapter explains why each new capability becomes necessary.

6. [The Value of Hand-Writing an Agent: Understanding the Minimal Mechanism Behind Framework Abstractions](https://github.com/LienJack/build-harness/blob/main/docs/en/00-06-handwrite-agent-meaning.md)  
   Build intuition by writing the smallest useful Agent yourself. Once you understand the mechanism, frameworks become tools instead of mysteries.

7. [LLM Provider Integration: Making the CLI Complete Its First Model Call](https://github.com/LienJack/build-harness/blob/main/docs/en/00-07-llm-provider-cli-first-call.md)  
   Connect a real model provider to a CLI and normalize the first response. This is where the project becomes executable instead of conceptual.

8. [Minimal Agent Loop: From One-Shot Answer to Multi-Step Action](https://github.com/LienJack/build-harness/blob/main/docs/en/00-08-minimal-agent-loop.md)  
   Turn a single model answer into an iterative action loop. You will add stopping rules, observations, retries, and the first taste of agent autonomy.

9. [M0 Core Kernel: Bringing a Real Large Model Into the System, Not Letting It Take Over](https://github.com/LienJack/build-harness/blob/main/docs/en/00-09-m0-core-kernel.md)  
   Design the smallest core that can host a model without surrendering system control. The kernel owns contracts, events, and runtime boundaries.

10. [Intent / Execution Separation: The Model Proposes, the System Executes](https://github.com/LienJack/build-harness/blob/main/docs/en/00-10-intent-execution-separation.md)  
    Separate model-generated intent from actual tool execution. This design makes permission checks, audits, replay, and debugging possible.

### Part 2: Extension Boundaries

11. [Plugin Host: Why Should Core Learn to Be Extended?](https://github.com/LienJack/build-harness/blob/main/docs/en/00-11-plugin-host-core-extension.md)  
    Learn why a serious Harness needs extension points. Plugin boundaries let the system gain providers, tools, policies, and workflows without bloating core.

12. [Provider Runtime: Why Can a Provider Only Return Tool Intent?](https://github.com/LienJack/build-harness/blob/main/docs/en/00-12-provider-runtime-tool-intent.md)  
    Keep model providers behind a clean runtime contract. The provider can stream text and tool intent, but execution stays inside the Harness.

### Part 3: Execution and Working-State Control

13. [Tool Runtime: From Tool Intent to Observation](https://github.com/LienJack/build-harness/blob/main/docs/en/00-13-tool-runtime-observation.md)  
    Build the runtime path from requested tool call to structured observation. This is where unsafe action becomes controlled, inspectable execution.

14. [Local Tool Bundle: Files, Search, Terminal, and Permission Runtime](https://github.com/LienJack/build-harness/blob/main/docs/en/00-14-local-tool-bundle-permission-runtime.md)  
    Add practical local tools: file reading, writing, search, and shell commands. The chapter focuses on risk levels, permission gates, and clean outputs.

15. [Context Policy: What Should the Model See This Turn?](https://github.com/LienJack/build-harness/blob/main/docs/en/00-15-context-policy-model-input.md)  
    Decide what enters the model input each turn. Good context policy keeps the Agent focused, cheaper, safer, and easier to debug.

16. [Session Replay: Why Is the Event Log the Source of Truth for Long Tasks?](https://github.com/LienJack/build-harness/blob/main/docs/en/00-16-session-replay-event-log.md)  
    Replace fragile chat history with an event log that can be replayed, audited, and resumed. Long tasks need facts, not just messages.

### Part 4: Capability, Collaboration, and Diagnosis

17. [Capability Discovery: Skills, MCP, and Dynamic Tool Exposure](https://github.com/LienJack/build-harness/blob/main/docs/en/00-17-capability-discovery-skills-mcp.md)  
    Expose only the capabilities the Agent needs right now. Skills, MCP, and tool discovery make the runtime flexible without overwhelming the model.

18. [Delegation Runtime: Handing Tasks Out Without Losing Control](https://github.com/LienJack/build-harness/blob/main/docs/en/00-18-delegation-runtime-control.md)  
    Add sub-agents and task delegation while keeping context isolation, permissions, result joining, and failure recovery under the parent Harness.

19. [Trace Analysis: Using Fact Logs to Locate Agent Failures](https://github.com/LienJack/build-harness/blob/main/docs/en/00-19-trace-analysis-agent-failures.md)  
    Diagnose failures from traces instead of vibes. You will learn how to inspect decisions, observations, tool outputs, and control points.

20. [Memory Governance: From Candidate Ledger to Governance Store](https://github.com/LienJack/build-harness/blob/main/docs/en/00-20-memory-governance-candidate-ledger.md)  
    Treat memory as governed data, not a dumping ground. Candidate ledgers, approval, freshness, and cleanup keep long-term memory useful.

21. [Scoped Retrieval: From Bounded Retrieval to Audit Snapshot](https://github.com/LienJack/build-harness/blob/main/docs/en/00-21-scoped-retrieval-audit-snapshot.md)  
    Make retrieval explicit, bounded, and reviewable. A scoped snapshot explains what evidence the Agent used and why it was allowed.

### Part 5: Productization and Hosting

22. [Productized CLI: Profile, Extension, Multi-Provider](https://github.com/LienJack/build-harness/blob/main/docs/en/00-22-productized-cli-profile-extension.md)  
    Turn the prototype into a usable CLI with profiles, provider selection, extensions, stable output, and predictable user experience.

23. [Hosted Harness: Sandbox, Cron, Durable Execution, and Remote Deployment](https://github.com/LienJack/build-harness/blob/main/docs/en/00-23-hosted-harness-durable-execution.md)  
    Move from local runs to hosted execution. Sandboxes, queues, retries, schedules, and durable state make agents survive real production conditions.

24. [Agent Harness Terminology Map: How Intent, Observation, Event, Artifact, Snapshot, Projection, and Trace Relate](https://github.com/LienJack/build-harness/blob/main/docs/en/00-24-agent-harness-terminology-map.md)  
    Close the series with a shared terminology map. These concepts let you design, debug, and discuss Agent Harness systems precisely.
