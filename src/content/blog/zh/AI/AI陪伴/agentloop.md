---
title: Agent Harness 与 Durable Agent Runtime 架构设计
description: 从目标治理、上下文记忆、执行循环、工具能力和多 Agent 协作出发，梳理可持续、可恢复、可验证的 Agent Harness 架构。
pubDate: 2026-07-11
locale: zh
---

明白。这里要讲的不是“怎么把系统做出来”，而是面试中如何解释：**一个能够让 Agent 长时间自主执行的 Harness，应该遵循什么架构思想、模块如何划分、为什么这样划分。**

你的五个方向基本正确，但目前把不同层次的问题放在了一起。例如：

* Context 和 Memory 都属于知识管理，但生命周期不同。
* Workflow 属于控制逻辑，Agent Loop 属于执行机制。
* Agent-to-Agent 不只是通信，还包含职责、权限和任务所有权。
* Tool 不只是工具注册，还涉及副作用、环境隔离和能力治理。
* 最重要的是，目前缺少一个核心：**Durable Runtime，持久化执行内核。**

---

# 一、先定义这个系统到底是什么

面试时可以先给出一个定义：

> Agent Harness 不是一个不断调用模型的循环，而是一个让 Agent 在不确定环境中，能够持续、可控、可恢复、可验证地完成长期任务的执行基础设施。

这里有五个关键词：

| 目标   | 含义                               |
| ---- | -------------------------------- |
| 持续性  | 任务可以运行几小时、几天，甚至跨会话继续执行           |
| 可恢复性 | 模型崩溃、工具失败、上下文丢失后，可以继续            |
| 可控性  | Agent 的权限、预算、执行范围都有边界            |
| 可验证性 | 不能由 Agent 自己说“完成了”就算完成           |
| 可组合性 | Agent、Workflow、Tool、Skill 可以自由组合 |

所以，我会把系统看成一个 **Durable Agent Runtime**，而不是简单的 Agent Loop。

---

# 二、建议从“五个模块”升级为“八个能力平面”

你的五个模块可以保留，但需要重新定义边界，并补充三个核心能力。

## 1. Goal & Governance：目标与治理层

这是你原来的设计里缺失的第一层。

在 Agent 开始执行之前，系统必须明确：

* 最终目标是什么；
* 什么叫成功；
* 什么叫失败；
* 有哪些约束；
* 可以使用多少时间、Token、金钱和计算资源；
* 哪些操作必须由人批准；
* 什么情况下应该停止、暂停或升级给人。

这里最重要的设计理念是：

> 不要把任务只表达成一段 Prompt，而要表达成一个 Goal Contract。

一个目标至少应当包含四类信息：

```text
Objective        要实现什么
Acceptance       如何判断完成
Constraints      不能做什么
Budget           最多消耗多少资源
```

例如，“帮我完成一个代码模块”并不是完整目标。

完整目标应类似于：

```text
目标：实现支付重试模块
验收：测试通过，接口兼容，不修改数据库 Schema
约束：不能访问生产环境
预算：最多执行 2 小时
升级条件：发现需要修改公共 API 时请求人工确认
```

这会让后面的 Workflow、Agent 和 Verifier 都有统一依据。

---

## 2. Durable Runtime：持久化执行内核

这是整个 Harness 的核心。

长时间执行的本质问题，不是模型能否继续思考，而是：

> 当一次模型调用结束后，任务状态是否仍然存在。

因此，Agent 的真实状态不能只存在于 Conversation Context 中，而应该存在于系统外部。

概念上，Runtime 管理：

* 任务生命周期；
* 当前执行状态；
* 已完成步骤；
* 尚未完成步骤；
* checkpoint；
* 重试与恢复；
* 超时与暂停；
* 调度；
* 资源预算；
* 死循环检测；
* 终止条件。

推荐把 Agent Loop 表达成一个状态机：

```text
Goal
  ↓
Plan
  ↓
Act
  ↓
Observe
  ↓
Verify
  ↓
Checkpoint
  ↓
Replan / Continue / Terminate
```

这里比传统的：

```text
Think → Act → Observe
```

多了两个关键步骤：

### Verify

判断本次行动是否真的产生了有效结果。

### Checkpoint

把已确认的结果写入持久化状态，使任务可以从这里恢复。

面试中可以强调：

> 长时 Agent 的可靠性来自状态外置，而不是来自更长的上下文窗口。

---

## 3. Context Management：认知上下文管理

你原来的 Context Manage 是正确方向，但需要明确：

> Context 不是 Memory。Context 是 Agent 当前一次推理所需要的工作集。

它更像 CPU Cache 或 Working Memory。

Context 管理需要回答三个问题：

### 什么信息应该进入当前上下文

不是把所有历史都塞进去，而是根据当前任务动态选取：

* 当前目标；
* 当前步骤；
* 最近观察；
* 相关工具结果；
* 相关记忆；
* 当前约束；
* 未解决问题。

### 什么信息应该被压缩

长时间任务一定会产生大量历史信息，因此需要：

* 摘要；
* 分层摘要；
* 状态提取；
* 决策记录；
* 证据索引；
* 去重。

### 什么信息必须保留原文

某些信息不能只保留摘要，例如：

* 用户明确约束；
* 安全规则；
* 精确代码；
* 数据结构；
* 法律或业务条款；
* 验收标准。

Context 的设计原则是：

> 根据当前决策需要构造最小充分上下文，而不是追求最大上下文。

---

## 4. Memory & Learning：记忆与学习系统

Memory 是跨步骤、跨任务、跨会话存在的长期知识。

这里建议把记忆分成三类：

| 记忆类型              | 内容      | 示例               |
| ----------------- | ------- | ---------------- |
| Episodic Memory   | 发生过什么   | 上一次部署失败的过程       |
| Semantic Memory   | 已知事实和规律 | 用户偏好、项目架构、API 约束 |
| Procedural Memory | 应该怎么做   | 部署流程、调试方法、代码审查流程 |

你提到“把用户重复的过程自动变成 Skill”，这实际上是从：

```text
Episodic Memory
```

向：

```text
Procedural Memory / Skill
```

进行转化。

但设计上不能简单地认为“重复三次就自动成为 Skill”。

更合理的理念是一个 **Skill Promotion Pipeline**：

```text
执行轨迹收集
    ↓
发现重复模式
    ↓
抽象输入、输出和前置条件
    ↓
生成候选 Skill
    ↓
评测与验证
    ↓
版本化发布
    ↓
持续监控
    ↓
回滚或升级
```

其中必须验证：

* 这个流程是真的通用，还是仅适用于一次任务；
* 哪些部分是固定步骤；
* 哪些部分仍需要 Agent 判断；
* 适用条件是什么；
* 失败条件是什么；
* 是否包含过期信息；
* 是否包含敏感信息。

一个很好的面试表达是：

> Memory 是经验，Skill 是经过验证和编译后的经验。原始执行轨迹不能直接当作 Skill。

跨对话获取记忆时，也不应把所有用户历史加载进来，而是通过：

```text
用户身份
+ 当前目标
+ 当前项目
+ 当前任务阶段
```

做有范围的检索。

因此 Memory Retrieval 应该是上下文感知的，而不是全局搜索。

---

## 5. Coordination Protocol：Agent 协作与委派协议

你提到 Agent-to-Agent Protocol，但“通信”只是其中最浅的一层。

真正需要设计的是四个问题：

### Agent 之间如何表达任务

任务不能只是一句自然语言消息，应当是一个任务契约：

```text
任务目标
输入材料
预期输出
验收标准
权限范围
资源预算
截止条件
失败处理方式
```

### 谁拥有任务

每一个任务必须有明确 owner。

否则多个 Agent 很容易：

* 重复执行；
* 互相等待；
* 同时修改同一资源；
* 都认为对方负责；
* 没有 Agent 对最终结果负责。

### 如何委派

父 Agent 不应该只是“创建一个 Subagent”。

它需要决定：

* 为什么需要委派；
* 委派什么；
* 哪些上下文需要传递；
* 子 Agent 可以做哪些决策；
* 子 Agent 是否可以继续创建子 Agent；
* 子 Agent 的结果如何验收。

### 如何 Handoff

Handoff 不是转发聊天记录，而是转移：

* 任务所有权；
* 当前状态；
* 已做决策；
* 未解决问题；
* 证据；
* 权限；
* 后续责任。

因此我会把 Agent-to-Agent 模块重新命名为：

> Coordination, Delegation and Ownership

它管理的不是“Agent 怎么聊天”，而是“多个执行主体如何在同一个任务状态上协作”。

---

# 六、Planning & Workflow：规划与工作流

你原来的 Workflow 模块也需要拆成两个概念：

## Workflow

Workflow 是显式、可观察、可重复的控制结构。

例如：

```text
读取需求
  ↓
分析影响范围
  ↓
修改代码
  ↓
运行测试
  ↓
代码审查
  ↓
提交结果
```

## Planning

Planning 是 Agent 根据当前状态动态决定下一步。

例如：

* 测试失败后是修改代码还是回滚；
* 缺少信息时是搜索文档还是询问用户；
* 是否需要创建 Subagent；
* 是否需要修改原计划。

这两者不能互相替代。

纯 Workflow 太僵硬，无法处理未知情况。

纯 Agent Planning 又太不稳定，难以控制和审计。

因此最合理的是：

> Deterministic Shell，Agentic Core。

也就是：

* 稳定、可预测的部分放在 Workflow 中；
* 需要判断、推理和适应的部分交给 Agent；
* Agent 可以修改计划，但不能随意突破 Workflow 的治理边界。

例如代码任务：

```text
固定 Workflow：
需求分析 → 实现 → 测试 → Review → 交付

Agentic Step：
如何实现
如何定位 Bug
是否需要重构
选择哪些测试
```

Claude Code 一类产品的 Workflow 编辑，本质上可以理解为：

> 用户在编辑 Agent 的控制平面，而不只是编辑 Prompt。

---

# 七、Capability & Environment：工具与执行环境

Tool 模块最好不要只叫 Tool Registry，因为工具只是表象。

更完整的概念是：

> Capability System，即 Agent 被允许对外部世界做什么。

一个能力不仅包含函数名称，还应包含：

* 输入输出；
* 前置条件；
* 权限；
* 风险级别；
* 副作用；
* 成本；
* 是否可重试；
* 是否可撤销；
* 是否需要人工批准；
* 运行环境。

例如下面三个工具的治理方式完全不同：

```text
搜索网页
读取数据库
删除生产数据
```

从 Agent 角度看都是 Tool Call，但从 Harness 角度看，它们具有不同的：

* 信任级别；
* 权限边界；
* 审批要求；
* 恢复策略；
* 审计要求。

## Sandbox 的设计理念

Sandbox 不是简单的“把代码放进容器”。

它承担的是能力隔离：

```text
Agent
  ↓
Capability Policy
  ↓
Sandbox
  ↓
External World
```

Agent 不应该直接拥有系统权限，而应该通过 Harness 获得经过限制的能力。

核心原则是：

> 默认无权限，按任务授予最小权限，并且权限有时间和作用域限制。

还要区分：

* Read capability；
* Write capability；
* Destructive capability；
* Irreversible capability。

越不可逆的操作，越需要更强的验证和人工介入。

---

# 八、Assurance：验证、可观测性与安全保障

这是你原始模块中第二个明显缺失的部分。

Agent 系统不能只观察：

* 调用了多少次模型；
* 花了多少 Token；
* 执行了哪些 Tool。

更重要的是观察：

* 是否接近目标；
* 当前进度是多少；
* 哪些假设尚未验证；
* 哪些结果有证据；
* 是否在重复无效行为；
* 是否已经偏离目标；
* 当前结论的可信度是多少。

这个平面包括三个方面。

## Observability

记录 Agent 的行为轨迹、状态变化和关键决策。

## Evaluation

评估执行过程和最终结果质量。

## Verification

由独立机制判断结果是否满足验收标准。

其中最重要的设计原则是：

> 执行者不能同时成为最终裁判。

例如代码 Agent 说：

```text
我已经完成实现。
```

并不代表真的完成。

系统还需要检查：

* 测试是否通过；
* 编译是否通过；
* 是否满足接口约束；
* 是否引入回归；
* 是否真的修改了正确文件。

因此 Verifier 可以是：

* 确定性规则；
* 测试程序；
* Schema Validator；
* 静态分析；
* 另一个模型；
* 人类审批；
* 多种验证机制的组合。

---

# 九、还需要一个横向能力：资源与风险治理

长时间运行还必须考虑 Resource Governance。

Agent 的优化目标不能只是“完成任务”，还应该是：

```text
在满足质量要求的情况下，
用合理的时间、成本和风险完成任务。
```

系统需要考虑：

* 模型选择；
* 是否需要大模型；
* 是否可以使用小模型；
* 是否并行执行；
* 是否创建 Subagent；
* 是否继续搜索；
* 当前步骤的信息价值是否值得成本；
* 任务是否已经不值得继续。

因此 Harness 应当管理多个 Budget：

```text
Token Budget
Time Budget
Tool Budget
Monetary Budget
Risk Budget
Human Attention Budget
```

“Human Attention Budget”也很重要。

系统不能遇到任何不确定性都询问用户，也不能什么都不问。它需要判断什么时候值得打断人。

---

# 十、你现有五个模块的更新方式

可以直接这样重新命名和扩展：

| 原模块                     | 建议更新后的模块                                         |
| ----------------------- | ------------------------------------------------ |
| Context Manage          | Cognitive Context Management                     |
| Agent-to-Agent Protocol | Coordination, Delegation and Ownership           |
| Memory System           | Memory, Learning and Skill Promotion             |
| Workflow                | Planning and Workflow Orchestration              |
| Tool                    | Capability, Permission and Execution Environment |

然后补充三个核心模块：

| 新增模块              | 解决的问题               |
| ----------------- | ------------------- |
| Goal & Governance | 目标、验收、约束、预算、终止条件    |
| Durable Runtime   | 状态持久化、恢复、调度、重试、长时执行 |
| Assurance         | 验证、评测、可观测性、安全与人工介入  |

最终可以得到八个模块：

```text
1. Goal & Governance
2. Durable Runtime
3. Context Management
4. Memory & Learning
5. Coordination & Delegation
6. Planning & Workflow
7. Capability & Environment
8. Assurance & Observability
```

其中 Resource Governance 可以作为贯穿所有模块的横向能力。

---

# 十一、几个最重要的设计原则

面试中不需要把模块全部展开，可以重点讲这些原则。

## 1. Externalized State，而不是依赖聊天历史

任务状态应该存在于 Agent 外部。

Agent 可以被替换、重启或切换模型，但任务仍然可以继续。

## 2. Contract over Prompt

Prompt 适合表达意图，但不适合承担任务治理。

目标、权限、输出和验收需要结构化契约。

## 3. Bounded Autonomy

Agent 可以自主决策，但自主性必须受到：

* 权限；
* 预算；
* Workflow；
* 风险；
* 验收条件；

的限制。

不是无限自治，而是有边界的自治。

## 4. Evidence-based Completion

“完成”必须有外部证据，不依赖 Agent 自我声明。

## 5. Separate Execution from Evaluation

执行者和验证者应分离。

这能降低自我确认偏差。

## 6. Memory with Admission Control

不是所有信息都值得写入长期记忆。

记忆写入必须经过筛选、归纳、去重和权限检查。

## 7. Least Privilege

Agent 只获得完成当前任务所必需的最小权限。

## 8. Deterministic Where Possible, Agentic Where Necessary

能确定执行的部分尽量确定化，只有真正存在不确定性的部分才使用 Agent 推理。

## 9. Every Loop Must Produce Progress

每一轮执行至少应当产生一种结果：

* 新证据；
* 新状态；
* 完成一个子任务；
* 排除一个假设；
* 明确一个阻塞；
* 触发升级。

否则就可能处于无效循环。

---

# 十二、面试时可以直接使用的表达

可以用下面这段作为两分钟左右的回答：

> 我不会把长时 Agent Harness 理解成一个无限调用模型的 Loop，而会把它设计成一个 Durable Agent Runtime。它的核心目标是让 Agent 能够持续、可恢复、可控制、可验证地执行任务。
>
> 架构上我会分成八个能力层。首先是 Goal and Governance，把用户意图转化为包含成功标准、约束、预算和终止条件的任务契约。第二层是 Durable Runtime，负责状态持久化、checkpoint、恢复、重试和调度。第三和第四层分别是 Context 与 Memory，Context 是当前推理的工作集，Memory 是跨任务存在的长期知识；重复经验不能直接成为 Skill，而应该经过抽象、评测、版本化和发布。
>
> 多 Agent 部分我不会只设计通信协议，而会设计任务契约、所有权、委派权限和 Handoff 语义。Workflow 和 Planning 也会分开：Workflow 提供确定性的控制框架，Agent 负责其中需要动态判断的部分，也就是 deterministic shell、agentic core。
>
> Tool 层本质上是 Capability System，负责工具注册、最小权限、Sandbox、副作用治理和高风险操作审批。最后还需要独立的 Assurance Layer，通过测试、规则、Verifier 或人工审批判断任务是否真正完成。
>
> 整个设计的核心原则是：状态外置、契约优先、有界自治、最小权限，以及执行和验证分离。

一句话总结就是：

> **这个 Harness 的价值，不是让 Agent 一直运行，而是让它能够在长期运行中始终知道自己在做什么、做到哪里、是否真的完成，以及什么时候应该停止。**
