---
title: 'Guide to the Claude Code Source Analysis Series'
description: 'An index for the Claude Code source analysis series, organized around architecture, core mechanisms, tools, extensibility, and collaboration.'
author: LienJack
pubDate: 2026-05-03
heroImage: './assets/00-cover-claude-code-runtime.jpg'
locale: 'en'
tags:
  - Claude-Code
  - Agent
  - Source Analysis
  - Series Guide
aliases:
  - Claude Code source analysis guide
  - Claude Code series index
---
# A Guide to the "Claude Code Source Analysis" Series

This series of articles isn't trying to answer "Can Claude Code write code?" It's asking a more engineering-oriented question:

**How does a coding Agent grow from a model API into a full runtime system — one that reads projects, invokes tools, manages permissions, controls context, and supports collaboration?**

To make the series easier to navigate, I've reorganized it into five parts, grouped by the chain of questions they address. You can read straight through, or jump to whichever part interests you.

There's also a reading convention across the series: every article starts by explaining *why* a particular mechanism exists, then traces it back into the source to see which load-bearing files and key objects carry it. This makes reading Claude Code more reliable: don't hunt for functions at random in the directory tree. Instead, first grasp the runtime chain — `QueryEngine -> query.ts -> Tool -> Context/Prompt/Permission` — then follow each link in that chain to understand why each module emerged.

## 1. Build the Big Picture First

1. [*Inside Claude Code* Chapter 1 — Engineering Architecture](./01-engineering-architecture)

This chapter starts from a high vantage point and establishes the overall structure of Claude Code: the roles that `Model API`, `QueryEngine`, `Tools`, `Context / State`, security governance, and Agent collaboration each play within the system.

When reading the source code, latch onto three anchors: `QueryEngine.ts` governs a single session, `query.ts` drives one round of the ReAct loop after another, and `Tool.ts` defines the protocol boundary that a model action must satisfy before it enters a real engineering environment.

## 2. Understanding the Main Loop and Context

1. [*Claude Code Source Code Deep Dive*, Chapter 2 — The ReAct Main Loop](./02-react-loop)
2. [*Claude Code Source Code Deep Dive*, Chapter 3 — Prompt Construction](./03-prompt-construction)
3. [*Claude Code Source Code Deep Dive*, Chapter 4 — Context Management](./04-1-context-management)
4. [*Claude Code Source Code Deep Dive*, Chapter 5 — Context Governance (Optional)](./04-2-context-governance-elective)

Read these chapters together, and you will come away with a fairly complete picture of what Claude Code "sees" in each turn, how it decides the next step, how history is preserved, and how it compresses when the context grows too long.

The main code path for this section: `QueryEngine.submitMessage()` kicks off a turn, `queryLoop()` constructs the request for the current turn based on `State`, the model returns a `tool_use` which is then executed, and the `tool_result` is fed back into `messages`. Don't read Prompt and Context in isolation — they both serve the same purpose: deciding what the model should actually see on the next turn.

## 3. Understanding the Tool System

1. [*Claude Code Source Code Deep Dive* — Chapter 6: Tools Overview](./05-0-tools-overview)
2. [*Claude Code Source Code Deep Dive* — Chapter 7: File Tools](./05-1-file-tools)
3. [*Claude Code Source Code Deep Dive* — Chapter 8: Terminal Tools](./05-2-terminal-tools)
4. [*Claude Code Source Code Deep Dive* — Chapter 9: Task Management](./05-3-task-management)

If your primary question is "why does Claude Code actually get things done instead of just calling a model?", this section is the answer.

Read the tools section by protocol, not by tool name: start with the `Tool` type declaration, then look at how `tools.ts` builds the menu of tools available to the current turn, and finally examine `toolExecution.ts` to see how schema validation, permission checks, hooks, execution, and result backfilling all come together.

## 4. Part 4: Understanding Extension Capabilities

1. [*Claude Code Source Code Analysis Series* Chapter 10 — MCP](./06-mcp)
2. [*Claude Code Source Code Analysis Series* Chapter 11 — Skill](./07-skill)

This section covers how Claude Code integrates more external capabilities and more mature task experience into its main runtime.

## 5. Collaboration and Planning

1. [Claude Code Source Code Analysis — Chapter 12: Agent Collaboration](./08-1-agent-collaboration)
2. [Claude Code Source Code Analysis — Chapter 13: Agent Collaboration in the Industry (Elective)](./08-2-industry-agent-collaboration-elective)
3. [Claude Code Source Code Analysis — Chapter 14: Plans](./09-1-plan)
4. [Claude Code Source Code Analysis — Chapter 15: Plans in the Industry (Elective)](./09-2-industry-plan-elective)

This section is best read after you've grasped the single-Agent main loop. It moves up a level to cover task decomposition, sub-agents, approval boundaries, and the plan control plane.

## 6. Reading Suggestions

- If this is your first time reading through this series, the recommended order is: `01 → 02 → 03 → 04.1 → 05 → 06 → 07 → 08.1 → 09.1`.
- If you lean more toward engineering implementation, prioritize `02 / 03 / 04.1 / 05`.
- If you're more interested in the extension ecosystem, prioritize `06 / 07 / 08.1`.
- If you're more interested in methodology comparisons, supplement with the optional chapters `04.2 / 08.2 / 09.2`.

## 7. Consistent Naming for This Series

I've standardized the filenames to a more stable series numbering format:

- `00` indicates the guide page
- `01-09` indicates main chapters
- `05.1 / 05.2 / 05.3` for sub-chapters under the tools system
- `04.2 / 08.2 / 09.2` for optional or cross-sectional extended reading

The benefit of doing this is that directory ordering, article slugs, prev/next navigation, and blog list ordering will stay consistent, so you won't bounce around due to literal filename sorting.
