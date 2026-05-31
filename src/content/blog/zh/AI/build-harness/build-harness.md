---
title: "从 0 到 1 构建 Agent 与 Harness"
description: "一套从简单 CLI 助手开始，逐步构建可控、可观测、可扩展 Agent Harness 的工程教程。"
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.jpg'
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

## 推荐读法

这套教程最好按“问题 -> 机制 -> 失效点 -> 下一个机制”的节奏读。每读到一层，都问自己三个问题：

```text
它解决了什么痛点？
如果没有它，Agent 会在哪里失控或失真？
它和前后两层机制怎样接上？
```

如果你想先建立全局地图，可以先读 00-01 到 00-05；如果你想尽快进入实现，可以读完 00-07 后开始跟着 00-08 到 00-16 搭最小 loop、tool runtime、context policy 和 event log。后面的能力发现、委派、trace、memory、retrieval、产品化与托管，则更像把一个能跑的 Agent 变成能交付、能诊断、能长期维护的 Harness。

## 系列路径

### 第一部分：Agent 基础模型与 Harness 演化

1. [Agent 基础定义：从回答到执行过程](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-01-agent-not-a-prompt.md)  
   从 prompt-only 的边界开始：模型可以提出下一步，但真实任务需要 loop、tools、state 和最薄的一层外部控制。

2. [Agent 组成模型：Model、Loop、Tools、State](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-02-agent-components.md)  
   拆开 Agent 的最小构成，理解模型、循环、工具和状态如何配合。读完后，你会知道一个 Agent 至少需要哪些工程零件。

3. [系统边界：ChatBot、Workflow、Agent、Harness 的区别](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-03-chatbot-workflow-agent-harness.md)  
   区分聊天机器人、固定流程、Agent 和 Harness。这个边界图能帮你判断什么时候该用脚本，什么时候需要真正的 Agent 架构。

4. [Harness 的控制回路：约束、反馈、再投影](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-04-harness-control-system.md)  
   从一个 demo Agent 的事故现场进入，拆清 Harness 如何接住执行、权限、日志、恢复和验证这些控制责任。

5. [Agent 演进路线：从聊天原型到托管运行](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-05-agent-evolution-path.md)  
   用项目里程碑看 Agent 如何从 v0 聊天原型，逐步长出工具、运行时控制、session log、sandbox、trace 和评估。

6. [手写 Agent 的意义：理解框架抽象背后的最小机制](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-06-handwrite-agent-meaning.md)  
   解释为什么要亲手摸一次最小机制：不是替代框架，而是看清框架藏起了哪些工程边界。

7. [LLM Provider 接入：让 CLI 完成第一次模型调用](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-07-llm-provider-cli-first-call.md)  
   把真实模型接进 CLI，并留下 provider contract：chat、stream、error mapping 先跑通，tool intent 只预留事件。

8. [最小 Agent Loop：从单次回答到多步行动](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-08-minimal-agent-loop.md)  
   用 fake tool 验证最小 loop：observation 要影响下一轮判断，final、maxTurns 和错误要能让系统停下来。

9. [M0 Core Kernel：真实模型接入系统边界](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-09-m0-core-kernel.md)  
   把真实 provider 事件接进 contracts、registry、event bus、state reducer 和 runtime facade，保持 core 的内部语言。

10. [Intent / Execution 分离：模型提议，系统执行](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-10-intent-execution-separation.md)  
    正式展开 intent -> validate -> approve -> execute -> observe，让工具意图进入受控执行管线。

### 第二部分：扩展边界

11. [Plugin Host：让外部能力按规则进入 Core](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-11-plugin-host-core-extension.md)  
    解释外部能力如何以 contribution 进入系统：manifest、loader、registry、lifecycle 和 hook kernel 共同保护 core。

12. [Provider Runtime：把模型输出归一成 ToolIntent](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-12-provider-runtime-tool-intent.md)  
    定义 provider 的翻译边界：把 streaming、tool-call delta、usage 和 error 归一成 ModelEvent / ToolIntent，但不执行工具。

### 第三部分：执行与现场控制

13. [Tool Runtime：从 ToolIntent 到 Observation](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-13-tool-runtime-observation.md)  
    展开所有工具共享的执行管线：registry、validation、permission、scheduler、sandbox、normalization 和 observation。

14. [Local Tool Bundle：文件、搜索、终端的本地边界](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-14-local-tool-bundle-permission-runtime.md)  
    把 Read / Edit / Write / Glob / Grep / Bash 拆成不同本地风险语义，重点是路径、动作、执行环境和输出预算。

15. [Context Policy：模型这一轮应该看见什么？](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-15-context-policy-model-input.md)  
    治理模型输入投影：选什么、压什么、隔离什么、记录什么，让第 N 轮模型看到一张可信工作台。

16. [Session Replay：用事件日志恢复长任务现场](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-16-session-replay-event-log.md)  
    用 events.jsonl、artifact、snapshot、ReplayRunner 和 ResumeGate，让长任务中断后能恢复现场并判断能否继续。

### 第四部分：能力、协作与诊断

17. [Capability Discovery：按任务暴露最小能力集合](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-17-capability-discovery-skills-mcp.md)  
    用 Capability Catalog、Discovery Policy 和 Visible Set 管理能力可见性，避免把模型淹没在工具、Skills 和 MCP 列表里。

18. [Delegation Runtime：把任务分出去，但不丢掉控制权](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-18-delegation-runtime-control.md)  
    把 sub-agent 建模成受控工具执行体，通过任务包、上下文隔离、权限继承和 JoinReview 保留父级控制权。

19. [Trace Analysis：用事实日志定位 Agent 失败](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-19-trace-analysis-agent-failures.md)  
    把 event log 投影成诊断 trace，用 FailureFinding 和 FailureTaxonomy 判断失败断在模型、上下文、工具、权限、验证还是委派边界。

20. [Memory Governance：长期记忆的写入治理](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-20-memory-governance-candidate-ledger.md)  
    把可复用经验先写入 CandidateLedger，再通过 source、scope、confidence、TTL、review 和 health check 进入长期记忆。

21. [Scoped Retrieval：从边界检索到 audit snapshot](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-21-scoped-retrieval-audit-snapshot.md)  
    把一次检索做成 evidence snapshot：有 scope、query plan、citation、裁剪记录和可 replay 的审计证据。

### 第五部分：产品化与托管

22. [Productized CLI：从 demo 入口到稳定运行身份](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-22-productized-cli-profile-extension.md)  
    把原型 CLI 的运行方式收敛成 profile、resolver chain、doctor、extension loader 和稳定事件流。

23. [Hosted Harness：Sandbox、Cron、Durable Execution 与远程部署](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-23-hosted-harness-durable-execution.md)  
    进入远程托管生命周期：job、workspace、sandbox、secret、durable step、artifact、worker lease 和 notification。

24. [Agent Harness 术语地图：从 Intent 到 Trace](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-24-agent-harness-terminology-map.md)  
    用 glossary / map 收口核心术语：首讲章节、典型消费者、常见混淆和教学项目字段映射。
