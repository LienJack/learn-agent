---
title: "从 0 到 1 构建 Agent 与 Harness"
description: "一套从简单 CLI 助手开始，逐步构建可控、可观测、可扩展 Agent Harness 的工程教程。"
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.png'
locale: "zh"
tags:
  - Agent
  - Harness
  - 教程
aliases:
  - Agent Harness 教程
  - Build Harness
---

# 从 0 到 1 构建 Agent 与 Harness

这是一套面向工程实践的 Agent Harness 教程。它不会一上来就把你扔进复杂框架，而是从一个能聊天的 CLI 助手开始，逐步长出 agent loop、工具调用、上下文策略、记忆、权限、trace、评测、子 Agent、自动化与托管运行。

这套教程的目标很明确：让你真正理解“模型外面的系统”到底在做什么。LLM 可以判断下一步，但要让它稳定完成长任务，还需要执行层、状态层、权限层、观测层、恢复机制和产品化边界。这些东西组合起来，就是 Harness。

如果你用过 ChatGPT、Claude、Cursor 或 Claude Code，却仍然好奇“Agent 为什么能干活”“Claude Code 这种工具背后大概怎么搭”，这套内容会带你从理论走到一个可运行、可扩展、可诊断的工程模型。

## Agent 到底是什么？

Agent 不是一句 prompt。它是一个由模型、循环、工具、状态和策略共同组成的系统：模型负责判断下一步，循环负责推进任务，工具负责接触外部世界，状态负责记录事实，策略负责控制上下文、权限、预算和恢复。

Agent 的核心要素包括：

- **Model**：判断下一步做什么。
- **Loop**：让任务从单次回答变成多步行动。
- **Tools**：读写文件、搜索代码、执行命令、调用 API。
- **State**：记录消息、事件、观察、产物和决策。
- **Policy**：管理上下文、权限、安全、预算和恢复。

当这些要素进一步具备可观测、可恢复、可扩展、可审计、可产品化的控制能力时，Agent 就进化成了 **Harness**：模型外部的工程控制系统。

## 适合谁读？

适合会写 Python 或 TypeScript，能看懂 HTTP API、JSON、CLI、Git、SQLite 等基础组件的开发者。你不需要是 AI 研究员，只需要想弄清楚：怎样把一个 LLM 包进可靠的工程系统里，让它真正做事。

## 章节目录

### 第零章：Agent 基础模型与 Harness 演化

1. [Agent 基础定义：它为什么不是一句 Prompt？](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-01-agent-not-a-prompt.md)  
   从最容易误解的地方开始：Agent 不是更长的提示词，而是会循环、会调用工具、会记录状态、会接受控制的运行系统。

2. [Agent 组成模型：Model、Loop、Tools、State](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-02-agent-components.md)  
   拆开 Agent 的最小构成，理解模型、循环、工具和状态如何配合。读完后，你会知道一个 Agent 至少需要哪些工程零件。

3. [系统边界：ChatBot、Workflow、Agent、Harness 的区别](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-03-chatbot-workflow-agent-harness.md)  
   区分聊天机器人、固定流程、Agent 和 Harness。这个边界图能帮你判断什么时候该用脚本，什么时候需要真正的 Agent 架构。

4. [Harness 基础定义：模型外部的控制系统](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-04-harness-control-system.md)  
   把 Harness 看成模型外部的控制层：它负责执行、权限、审计、恢复和产品行为。模型提出意图，Harness 决定如何落地。

5. [Agent 演化路径：Chat Agent -> Tool Agent -> Runtime Agent -> Managed Agent](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-05-agent-evolution-path.md)  
   展示 Agent 从聊天到工具、再到运行时控制和托管管理的演化路径。每一步都对应真实工程压力，而不是概念堆叠。

6. [手写 Agent 的意义：理解框架抽象背后的最小机制](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-06-handwrite-agent-meaning.md)  
   通过手写最小 Agent，看清框架背后的机制。理解底层之后，再用 LangChain、MCP 或其他框架时会更有判断力。

7. [LLM Provider 接入：让 CLI 完成第一次模型调用](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-07-llm-provider-cli-first-call.md)  
   把真实模型接进 CLI，完成第一次可运行的调用。这里开始从理论进入代码，让系统真正能和 LLM 对话。

8. [最小 Agent Loop：从单次回答到多步行动](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-08-minimal-agent-loop.md)  
   把一次性回答改造成多步行动循环，加入停止条件、观察结果和错误处理。这是 Agent 开始“自己推进任务”的关键一步。

9. [M0 Core Kernel：把真实大模型接进系统，而不是接管系统](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-09-m0-core-kernel.md)  
   设计一个最小核心内核，让模型进入系统，但不让模型接管系统。核心负责事件、状态、边界和运行时契约。

10. [Intent / Execution 分离：模型提议，系统执行](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-10-intent-execution-separation.md)  
    建立最重要的安全边界：模型只提出 intent，系统负责执行。这样才能做权限审批、审计、重放和可控调试。

### 第二章：扩展边界

11. [Plugin Host：core 为什么要学会被扩展？](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-11-plugin-host-core-extension.md)  
    解释为什么 Harness 需要插件边界。Provider、工具、策略和工作流都应该能扩展，但 core 本身必须保持稳定。

12. [Provider Runtime：provider 为什么只能返回 tool intent？](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-12-provider-runtime-tool-intent.md)  
    定义模型供应商的运行时边界：provider 可以返回文本和工具意图，但不能直接执行工具。执行权必须留在 Harness。

### 第三章：执行与现场控制

13. [Tool Runtime：从 tool intent 到 observation](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-13-tool-runtime-observation.md)  
    把工具意图变成结构化 observation。你会看到工具调度、执行、结果整理和错误归属如何形成可审计的运行链路。

14. [Local Tool Bundle：文件、搜索、终端与权限运行时](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-14-local-tool-bundle-permission-runtime.md)  
    加入最实用的本地工具：文件、搜索和终端。重点不是“能不能执行”，而是风险分级、权限门禁和输出规范。

15. [Context Policy：模型这一轮应该看见什么？](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-15-context-policy-model-input.md)  
    讨论每一轮到底该给模型看什么。好的上下文策略能降低成本、减少误判、保护隐私，也让调试更清楚。

16. [Session Replay：为什么事件日志是长任务的事实源？](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-16-session-replay-event-log.md)  
    用事件日志替代脆弱的聊天历史。长任务需要可重放、可恢复、可审计的事实记录，而不是一串不可控消息。

### 第四章：能力、协作与诊断

17. [Capability Discovery：Skills、MCP 与动态工具暴露](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-17-capability-discovery-skills-mcp.md)  
    让 Agent 只看见当前需要的能力。Skills、MCP 和动态工具发现可以扩展系统，同时避免把模型淹没在工具列表里。

18. [Delegation Runtime：把任务分出去，但不丢掉控制权](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-18-delegation-runtime-control.md)  
    引入子 Agent 和任务委派，但仍保持父级 Harness 对上下文、权限、结果合并和失败恢复的控制。

19. [Trace Analysis：用事实日志定位 Agent 失败](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-19-trace-analysis-agent-failures.md)  
    用 trace 分析失败，而不是靠感觉猜。你会学会检查决策、工具输出、观察结果和控制点，找到 Agent 失败的真实位置。

20. [Memory Governance：candidate ledger 到 governance store](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-20-memory-governance-candidate-ledger.md)  
    把记忆当成需要治理的数据，而不是随便写入的缓存。候选账本、审批、时效和清理机制让长期记忆保持可信。

21. [Scoped Retrieval：从边界检索到 audit snapshot](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-21-scoped-retrieval-audit-snapshot.md)  
    让检索结果有范围、有证据、有审计快照。Agent 使用了什么资料、为什么能使用，都应该可以被追踪。

### 第五章：产品化与托管

22. [Productized CLI：profile、extension、multi-provider](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-22-productized-cli-profile-extension.md)  
    把原型变成真正可用的 CLI：支持 profile、扩展、多 provider、稳定输出和可预期的用户体验。

23. [Hosted Harness：Sandbox、Cron、durable execution 与远程部署](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-23-hosted-harness-durable-execution.md)  
    从本地运行走向托管执行。Sandbox、队列、重试、定时任务和持久状态，让 Agent 能面对真实生产环境。

24. [Agent Harness 术语地图：Intent、Observation、Event、Artifact、Snapshot、Projection、Trace 的关系](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-24-agent-harness-terminology-map.md)  
    用一张术语地图收束全系列。理解这些概念之间的关系，才能清晰设计、调试和讨论 Agent Harness。
