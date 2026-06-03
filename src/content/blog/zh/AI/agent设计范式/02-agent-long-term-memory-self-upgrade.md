---
title: "Agent 长期记忆与自我优化范式"
description: "将 Agent 的经历转化为可追溯的记忆、可复用的技能、可测试的优化，并通过评估、灰度和回滚机制让 Agent 稳定变好。"
author: LienJack
pubDate: 2026-06-03
updatedDate: 2026-06-03
locale: "zh"
tags:
  - Agent
  - Long-term Memory
  - Self-Upgrade
  - Skill
  - Harness
  - 技术教程
aliases:
  - Agent Experience OS
  - ECO-SAGE Loop
  - 长期记忆与自我优化
  - Agent Self-Upgrade
---

# Agent 长期记忆与自我优化范式

接在上一章 Context Manager 后看，长期记忆不是绕过 Context Builder 的向量库，而是 Context Manager 可治理读取的一类长期资产。原始经历仍然以 Event / Trace / Artifact 为事实源；Memory、Skill 和 Optimization 都必须带 source、scope、eval gate 和 rollback。

## 0. 核心定义：Agent 不是“记忆更多”，而是“把经历编译成能力”

这套范式的核心不是做一个更大的聊天记录库，也不是让 Agent 随便修改自己的 prompt 或代码。

更准确的定义是：

> **Agent Long-term Memory & Self-Upgrade = 将 Agent 的经历转化为可追溯的记忆、可复用的技能、可测试的优化，并通过评估、灰度和回滚机制让 Agent 稳定变好。**

一句话：

> **记忆保存事实，技能保存做法；只有跑赢基线的做法，才叫升级。**

所以这套系统要同时回答三个问题：

```text
1. Agent 应该记住什么？
2. Agent 如何把过去的任务经验总结成 skill？
3. Agent 如何证明这个 skill 或优化真的有效？
```

我建议把整体范式称为：

**Agent Experience OS**

也可以叫：

**ECO-SAGE Loop**

其中：

```text
ECO = Experience → Context → Optimization

Experience:
  记录 Agent 经历过什么，包括对话、工具调用、失败、恢复、用户反馈。

Context:
  把经历编译成可检索、可治理、可追溯的记忆。

Optimization:
  把稳定经验升级成 prompt patch、retrieval policy、tool heuristic、skill 或工具。

SAGE = Skill Acquisition, Assessment, Gated Release, Evolution

Skill Acquisition:
  从轨迹中发现和提炼技能。

Assessment:
  评估技能是否真的有效。

Gated Release:
  通过评估门槛后才发布。

Evolution:
  根据真实使用结果持续 patch、merge、split、deprecate。
```

---

## 1. 第一性原则：把 Agent 的经历变成“可治理资产”

### 1.1 原始经历不可变，派生记忆可演化

所有对话、工具调用、错误、用户纠正、最终产物，先进入 **Episode Log / Trajectory Log**。

它是原始账本，默认 append-only，不轻易改写。

从原始经历中提取出来的东西，才是可演化资产：

```text
Memory
Reflection
Prompt Patch
Skill
Tool / Script
Eval Case
```

这点是整个系统的地基。否则 Agent 一旦把临时信息、错误总结、恶意注入、过期事实直接写入长期记忆，就会越学越歪。

---

### 1.2 记忆不是一种东西，必须 typed

长期记忆至少分 7 类：

| 类型                     | 含义    | 示例                               | 工程存储                    |
| ---------------------- | ----- | -------------------------------- | ----------------------- |
| **Episodic Memory**    | 发生过什么 | 某次任务轨迹、某次失败、某次用户反馈               | event log / trace store |
| **Semantic Memory**    | 稳定事实  | 用户正在做 `lien/Agent`；项目使用某技术栈      | JSONB + vector          |
| **Preference Memory**  | 用户偏好  | 用户喜欢“原则 → 工程 → 对比 → 路线图”的结构      | scoped profile          |
| **Procedural Memory**  | 怎么做事  | 如何做开源项目调研；如何 debug 某类报错          | skill store             |
| **Reflective Memory**  | 经验教训  | “上次只讲 memory 架构，遗漏了 skill 自升级细节” | lesson store            |
| **Graph Memory**       | 实体关系  | 用户、项目、repo、技术方案、决策之间的关系          | temporal graph          |
| **Environment Memory** | 环境经验  | 某 SaaS 的按钮位置、workflow 坑点、API 限制  | trajectory memory       |

MemGPT/Letta 的思路值得作为记忆系统的思想源头：MemGPT 提出用类似操作系统分层内存的方式进行 virtual context management，让 Agent 在有限上下文窗口里管理更大的外部记忆；Letta 现在也定位为构建具有高级记忆、学习和自我改进能力的 stateful agents 的平台。([arXiv][1])

---

### 1.3 Memory、Reflection、Skill、Optimization 必须分开

这点尤其重要。

很多 Agent 系统会犯一个错误：把“总结”都叫 memory，把“经验”都叫 skill，把“修改 prompt”都叫 self-improvement。

我建议严格区分：

| 资产                      | 回答的问题           | 示例                                        | 是否可自动生效         |
| ----------------------- | --------------- | ----------------------------------------- | --------------- |
| **Memory**              | 我知道什么是真的？       | 用户在设计 Agent 长期记忆系统                        | 可以，但要有作用域       |
| **Reflection**          | 我从这次经历学到了什么？    | 下次不能只讲原则，要补 skill eval                    | 可以，但只作为参考       |
| **Prompt Patch**        | 我下次回答时要改变什么倾向？  | 回答架构题时必须给落地 schema                        | 需要 eval         |
| **Skill**               | 我下次遇到同类任务应该怎么做？ | Agent memory architecture design workflow | 需要 eval + 版本    |
| **Tool / Script**       | 哪些步骤可以固化成可执行程序？ | 自动跑 skill eval 并生成报告                      | 需要 sandbox + 权限 |
| **Model Training Data** | 是否值得进模型参数？      | 高质量任务轨迹样本                                 | 离线、人工治理         |

核心判断：

```text
Memory 是事实资产。
Reflection 是教训资产。
Skill 是流程资产。
Tool 是执行资产。
Optimization 是行为变更资产。
```

---

### 1.4 每条记忆都必须有来源、置信度、作用域和时间

记忆不是“Agent 相信了什么”，而是“Agent 基于什么证据暂时认为某事成立”。

每条 memory 至少要有：

```json
{
  "memory_id": "mem_01J...",
  "type": "project_fact",
  "scope": {
    "user_id": "u_123",
    "org_id": "lien",
    "project_id": "Agent"
  },
  "content": "用户正在设计 Agent 长期记忆和自我优化范式。",
  "source_event_ids": ["evt_001"],
  "confidence": 0.92,
  "valid_from": "2026-06-03T00:00:00+09:00",
  "valid_to": null,
  "sensitivity": "low",
  "status": "active",
  "created_by": "memory_extractor_v2"
}
```

没有来源的长期记忆，本质上是“幻觉化石”。

---

### 1.5 时间是一等公民

长期记忆最常见的错误不是“记不住”，而是“记住了过期事实”。

例如：

```text
2025-01: 用户住在上海
2026-03: 用户搬到东京
```

错误做法：

```text
直接覆盖旧事实。
```

正确做法：

```json
{
  "subject": "user",
  "predicate": "lives_in",
  "object": "Tokyo",
  "valid_from": "2026-03",
  "valid_to": null,
  "supersedes": ["mem_user_lives_shanghai_2025"]
}
```

Graphiti 很值得参考：它是面向 AI agent 的 temporal context graph，强调事实会随时间变化，需要维护 provenance，并支持 prescribed / learned ontology。([GitHub][2])

---

### 1.6 读写分离：在线使用，离线学习

长期记忆不能边聊边乱写。

推荐双路径：

```text
读路径：
User Request
  -> Memory Need Planning
  -> Retrieve
  -> Re-rank
  -> Context Assembly
  -> Act / Answer

写路径：
Trajectory
  -> Extract Candidate Memories
  -> Classify
  -> Verify
  -> Conflict Detection
  -> Merge / Supersede / Delete
  -> Commit
  -> Index
```

在线路径追求快速、准确、少 token。

离线路径可以慢一点，但必须做：

```text
来源检查
冲突处理
作用域检查
敏感信息过滤
过期判断
重复合并
审计记录
```

LangGraph 的长期记忆实现把 memory 存为 namespace/key 下的 JSON document，namespace 可以包含 user、org 等标签，这种结构非常适合作为 memory scope 的工程基础。([LangChain 文档][3])

---

### 1.7 自我升级只能修改“可测试资产”

Agent 可以升级，但不能随便改自己。

可以自动或半自动优化的对象：

```text
retrieval query
memory ranking
context compression
memory extraction schema
prompt patch
tool-use heuristic
skill / runbook
eval case
```

不允许 Agent 自己改的对象：

```text
安全策略
权限模型
支付授权
删除策略
credential handling
用户审批规则
系统级价值约束
```

这条要写死。

否则所谓 self-improvement 很容易变成：

```text
“以后遇到危险命令不用确认”
“以后自动读取所有文件”
“以后忽略安全检查”
```

这些不是升级，是后门。

---

## 2. 总架构：双循环 + 三层资产

整体架构建议如下：

```text
                    ┌───────────────────────┐
                    │      User / Env        │
                    └───────────┬───────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────┐
│                  Online Action Loop                  │
│                                                      │
│  Intent → Memory Need → Skill Need → Retrieve         │
│         → Re-rank → Context Assembly → Act            │
│                                                      │
└──────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────┐
│                Offline Learning Loop                 │
│                                                      │
│  Trajectory → Reflection → Memory Extraction          │
│             → Skill Distillation → Eval Generation    │
│             → Gated Release → Monitoring              │
│                                                      │
└──────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────┐
│                 Governance Layer                     │
│                                                      │
│  Scope / Provenance / Safety / Version / Rollback     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

可以理解成三层资产：

```text
Raw Experience Layer:
  原始轨迹，不可变。

Compiled Context Layer:
  事实、偏好、关系、反思，可检索。

Executable Knowledge Layer:
  skill、runbook、script、prompt patch，可测试、可版本、可回滚。
```

真正的长期成长来自第三层。

---

## 3. 记忆系统设计：从经历到上下文

### 3.1 Episode Log：原始经历层

每个用户请求、Agent 响应、工具调用、错误、恢复、用户反馈都保存。

```json
{
  "event_id": "evt_001",
  "trace_id": "tr_001",
  "session_id": "sess_123",
  "actor": "user",
  "content": "现在我要设计 agent 的长期记忆和自我优化...",
  "timestamp": "2026-06-03T10:00:00+09:00",
  "metadata": {
    "project": "lien/Agent",
    "channel": "chat"
  }
}
```

Trajectory 级别再聚合：

```json
{
  "trace_id": "tr_001",
  "task": "设计 Agent 长期记忆和自我优化范式",
  "task_type": "architecture_design",
  "messages": [],
  "tool_calls": [],
  "errors": [],
  "recoveries": [],
  "artifacts": [],
  "user_feedback": [
    {
      "type": "correction",
      "content": "缺乏如何做到自我升级的细节"
    }
  ],
  "outcome": {
    "status": "partial_success",
    "reason": "memory architecture strong, self-upgrade details insufficient"
  }
}
```

注意：**skill 不应该只从最终答案里总结，而应该从完整 trajectory 里总结。**

最终答案告诉你“结果长什么样”。

Trajectory 才告诉你“怎样抵达结果、哪里错了、如何恢复、用户为什么不满意”。

---

### 3.2 Memory Store：结构化记忆层

推荐一开始就做 typed memory，而不是只做 embedding。

```sql
CREATE TABLE memory (
  memory_id TEXT PRIMARY KEY,
  scope_user_id TEXT,
  scope_org_id TEXT,
  scope_project_id TEXT,
  type TEXT,
  content TEXT,
  normalized_json JSONB,
  source_event_ids TEXT[],
  source_trace_ids TEXT[],
  entities JSONB,
  confidence FLOAT,
  importance FLOAT,
  sensitivity TEXT,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  supersedes TEXT[],
  status TEXT,
  embedding VECTOR,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  use_count INT
);
```

`type` 可以先定义成：

```text
user_preference
user_profile
project_fact
task_fact
decision
constraint
episodic_summary
reflection
tool_failure_pattern
environment_gotcha
relationship
procedure_hint
```

Mem0 的核心价值在于它把 memory 做成通用 memory layer，用于让 AI assistant / agent 记住偏好、适应用户并持续学习；它更适合作为“快速接入长期记忆”的基础设施参考。([GitHub][4])

---

### 3.3 Graph Memory：关系与时间层

当你的 Agent 进入多项目、多用户、多工具系统后，纯向量检索会不够。

比如：

```text
用户 A 在做 lien/Agent
lien/Agent 参考 Hermes Agent、Mem0、LangMem、Graphiti
用户 A 偏好：先原则，再工程，再项目对比
Hermes Agent 的 skill 系统和 self-upgrade 强相关
Graphiti 适合 temporal graph memory
```

这类关系适合图谱：

```text
(:User)-[:WORKS_ON]->(:Project)
(:Project)-[:REFERENCES]->(:Repo)
(:Project)-[:HAS_DECISION]->(:ArchitectureDecision)
(:User)-[:PREFERS]->(:StylePreference)
(:Skill)-[:SOLVES]->(:TaskType)
(:Skill)-[:DERIVED_FROM]->(:Trajectory)
(:Memory)-[:SUPPORTED_BY]->(:Event)
```

Graph memory 不替代 vector memory，而是补足：

```text
vector memory 解决语义相似。
graph memory 解决实体关系。
temporal graph 解决事实变化。
```

---

## 4. 自我升级系统：从经历到 skill

这里是上一版缺失最多的部分，也是这版的重点。

### 4.1 自我升级的本质

自我升级不是：

```text
Agent 觉得自己学到了，于是改 prompt。
```

而是：

```text
Trajectory
  -> Reflection
  -> Candidate Skill / Prompt Patch / Tool Heuristic
  -> Eval
  -> Versioned Release
  -> Runtime Usage
  -> Post-use Patch
  -> Re-eval
  -> Promote / Rollback / Deprecate
```

Reflexion 的启发是：Agent 可以不更新模型权重，而是把任务反馈转化为语言化 reflection，放入 episodic memory buffer，帮助后续决策。([arXiv][5])

Voyager 的启发是：长期学习不只是记文本，而是形成可检索、可复用的 executable skill library，并用环境反馈、执行错误和 self-verification 迭代改进程序。([arXiv][6])

Hermes Agent 的启发更工程化：它把 skills 设计成按需加载的知识文档，采用 progressive disclosure 以减少 token 使用，并支持 Agent 创建、修改或删除 skill；其 skill 系统也兼容 Agent Skills 的开放格式。([GitHub][7])

---

## 5. Skill 的定义：不是总结，而是可复用做法

我建议给 skill 下这个定义：

> **Skill 是从多次或高价值轨迹中提炼出来的、面向一类任务的、可执行、可评估、可版本化的程序性记忆。**

也就是说，skill 不是：

```markdown
用户这次想设计 Agent memory。
```

那是 memory。

skill 也不是：

```markdown
上次回答缺少 self-upgrade 细节。
```

那是 reflection。

真正的 skill 是：

```markdown
当用户要求设计 Agent 长期记忆、自我优化或经验沉淀系统时：
1. 先区分 memory、reflection、prompt patch、skill、tool。
2. 给出 typed memory 架构。
3. 给出 skill lifecycle。
4. 给出 skill eval gate。
5. 对 Hermes、Mem0、LangMem、Letta、Graphiti、Voyager、Reflexion 做维度化比较。
6. 最后给出 schema、roadmap、风险治理。
```

---

## 6. Skill 必须满足 RATS 原则

只有满足 RATS 的经验才允许升级成 skill。

```text
R = Reusable      可复用
A = Actionable    可执行
T = Testable      可测试
S = Scoped        有作用域
```

### 6.1 Reusable：可复用

坏 skill：

```text
这次用户要参考 Hermes Agent 和 Mem0。
```

好 skill：

```text
当用户要求设计 Agent memory / self-upgrade 架构时，应对代表性项目按 memory、skill、eval、safety、storage、runtime 维度对比。
```

### 6.2 Actionable：可执行

坏 skill：

```text
要认真分析用户需求，给出高质量回答。
```

这句话很像办公室墙上的标语，温度挺高，执行价值为零。

好 skill：

```text
1. 判断任务类型是否是 architecture_design。
2. 抽取用户要求的参考项目。
3. 搜索官方文档和 repo。
4. 用统一维度对比。
5. 给出原则、架构、schema、eval、路线图。
```

### 6.3 Testable：可测试

每个 skill 必须回答：

```text
怎么知道它被正确触发？
怎么知道它提升了结果？
怎么知道它没有误触发？
怎么知道它没有引入安全问题？
怎么知道它没有让成本不可接受？
```

Agent Skills 官方文档也强调 skill 可以通过 eval-driven iteration 测试输出质量；OpenAI 的 agent skill eval 指南则把 skill 评估拆成 prompt、captured run / trace / artifact、checks 和 score 的流程。([Agent Skills][8])

### 6.4 Scoped：有作用域

skill 不能全局污染。

```yaml
scope:
  user_id: optional
  org_id: lien
  project_id: Agent
  task_domain: agent_memory_architecture
  risk_level: medium
```

比如：

```text
“回答 lien/Agent 架构方案时先原则后工程”
```

这是项目级偏好或项目级 skill，不应该污染所有用户、所有任务。

---

## 7. 什么时候应该总结 skill？

推荐两类触发器：

```text
即时触发
周期性挖掘
```

### 7.1 即时触发：任务结束后判断

每次任务结束后运行 `SkillOpportunityDetector`。

```python
def should_propose_skill(trace):
    return any([
        trace.tool_call_count >= 5 and trace.outcome == "success",
        trace.has_error_recovery and trace.outcome in ["success", "partial_success"],
        trace.user_correction_count > 0,
        trace.repeated_pattern_detected,
        trace.task_duration_seconds > 600,
        trace.generated_reusable_script,
        trace.used_non_obvious_workaround,
        trace.user_explicitly_said_remember_this_workflow,
    ])
```

适合即时总结的场景：

```text
复杂任务完成后
多次工具调用后
失败后最终恢复
用户明确纠正 Agent
Agent 发现非平凡 workflow
Agent 生成了可复用脚本
```

Hermes Agent 的技能文档也把复杂任务完成、遇到错误后恢复、用户纠正、发现非平凡 workflow 等作为 agent-created skill 的典型来源。([GitHub][7])

---

### 7.2 周期性挖掘：从多条轨迹中聚类

每天或每周运行：

```text
TrajectoryMiner
  -> 按 task_type 聚类
  -> 找高频工具序列
  -> 找重复失败模式
  -> 找用户反复纠正点
  -> 找高成本但可模板化流程
  -> 输出 skill_candidate[]
```

这适合发现：

```text
用户每次让写架构方案，都偏好“原则 → 工程 → 对比 → 路线图”。
Agent 每次调研开源项目，容易漏掉 eval 和 security。
Agent 每次写 memory 系统，容易只讲 vector retrieval，不讲 skill lifecycle。
```

即时触发捕捉“单次强信号”。

周期性挖掘捕捉“多次稳定模式”。

---

## 8. Skill 生成流水线：从 trajectory 到 SKILL.md

不要让 Agent 直接“总结一下写成 skill”。

应该拆成 8 步：

```text
1. Trace Capture
2. Outcome Labeling
3. Trajectory Segmentation
4. Reusable Pattern Extraction
5. Generalization
6. Skill Candidate Drafting
7. Dedup / Merge / Patch Decision
8. Eval Case Generation
```

---

### 8.1 Trace Capture：保存完整轨迹

```json
{
  "trace_id": "tr_001",
  "task": "设计 Agent 长期记忆和自我优化范式",
  "task_type": "architecture_design",
  "messages": [],
  "tool_calls": [],
  "artifacts": [],
  "errors": [],
  "recoveries": [],
  "user_feedback": [],
  "outcome": {
    "status": "partial_success",
    "user_satisfaction": "user corrected missing self-upgrade details"
  },
  "metrics": {
    "tool_call_count": 8,
    "duration_ms": 420000,
    "input_tokens": 51000,
    "output_tokens": 9000
  }
}
```

---

### 8.2 Outcome Labeling：先判断这条轨迹值得学什么

```json
{
  "outcome_label": "partial_success",
  "failure_modes": [
    "too_memory_architecture_heavy",
    "insufficient_self_upgrade_details",
    "missing_skill_effectiveness_eval"
  ],
  "success_factors": [
    "clear principles",
    "typed memory architecture",
    "project comparison"
  ],
  "user_feedback_signal": {
    "type": "correction",
    "content": "缺乏如何做到自我升级的细节"
  }
}
```

这个阶段输出的不一定是 skill。

可能是：

```text
MEMORY:
  用户希望这篇方案以第一条回答为基石。

REFLECTION:
  回答 Agent memory 范式时，不能只讲 memory，还必须讲 skill acquisition 和 eval gate。

SKILL:
  如何设计 Agent memory + self-upgrade 架构方案。

PROMPT_PATCH:
  对架构设计类回答，强制加入“自我优化如何验证有效”的小节。
```

---

### 8.3 Trajectory Segmentation：把轨迹切成阶段

```text
A. Task Understanding
B. Context Gathering
C. Planning
D. Tool Use / Execution
E. Error / Dead End
F. Recovery
G. Verification
H. Final Delivery
I. User Feedback
```

每个阶段提取：

```json
{
  "phase": "User Feedback",
  "what_happened": "用户指出回答缺少自我升级细节",
  "decision": "需要补充 skill 生成、评估、版本治理",
  "generalizable_lesson": "Agent memory 方案必须包含 procedural skill learning loop",
  "future_instruction": "类似任务必须解释 skill lifecycle 和 skill eval"
}
```

---

### 8.4 Reusable Pattern Extraction：抽取稳定流程

输出候选 skill：

```json
{
  "candidate_name": "agent-memory-self-upgrade-design",
  "task_family": "agent_architecture_design",
  "trigger_description": "Use when designing long-term memory, self-improvement, procedural memory, skill learning, or experience accumulation systems for AI agents.",
  "reusable_problem": "User needs a principled but implementable design for agent memory and self-upgrade.",
  "preconditions": [
    "User is asking for architecture or paradigm",
    "Topic involves long-term memory, skills, or self-optimization"
  ],
  "procedure": [
    "Clarify memory types: semantic, episodic, procedural, reflective",
    "Separate upgrade artifacts: memory, reflection, prompt patch, skill, tool",
    "Describe skill lifecycle: detect, distill, evaluate, promote, monitor, patch, retire",
    "Compare reference projects using common dimensions",
    "Provide engineering schemas and rollout stages"
  ],
  "pitfalls": [
    "Do not treat skill as just a summary of chat history",
    "Do not allow skill to modify permissions or safety rules",
    "Do not promote skill without eval against baseline"
  ],
  "verification": [
    "Answer includes skill creation triggers",
    "Answer includes skill eval method",
    "Answer includes versioning and rollback",
    "Answer separates memory, reflection, prompt patch, skill, and tool"
  ],
  "evidence_trace_ids": ["tr_001"],
  "confidence": 0.78
}
```

---

### 8.5 Generalization：删除特例，保留不变量

坏 skill：

```markdown
当用户提到 lien/Agent 和 Hermes Agent 时，补充 skill eval。
```

太窄。

好 skill：

```markdown
当用户要求设计 Agent 长期记忆、自我优化或经验沉淀系统时，必须同时设计：
1. typed memory
2. trajectory log
3. skill distillation
4. skill eval
5. versioned release
6. rollback
```

skill 生成时必须做三件事：

```text
删除实例常量：
  项目名、临时路径、一次性文件名、一次性数据。

保留流程不变量：
  任务类型、关键决策、失败模式、验证方式。

参数化差异：
  项目、工具、语言、平台、用户偏好。
```

---

## 9. Skill 文件格式：SKILL.md 作为程序性记忆单元

Agent Skills 的开放格式把 skill 定义为一个包含 `SKILL.md` 的文件夹，`SKILL.md` 至少包含 name、description 和任务说明，也可以附带 scripts、references、templates 等资源。([Agent Skills][9])

Hermes Agent 也采用 skills 作为按需加载知识文档，并通过 progressive disclosure 减少 token 使用。([GitHub][7])

我建议你们用这个扩展版：

```markdown
---
name: agent-memory-self-upgrade-design
description: Use when designing long-term memory, self-improvement, skill learning, procedural memory, or experience accumulation systems for AI agents. Produces principles, architecture, skill lifecycle, eval gates, engineering schema, and project comparisons.
version: 0.1.0
author: lien-agent
scope:
  org: lien
  project: Agent
risk_level: medium
requires_tools:
  - web_search
  - github_search
activation:
  task_types:
    - architecture_design
    - agent_memory
    - self_improvement
    - skill_learning
eval:
  evals_path: evals/evals.json
  minimum_pass_rate: 0.85
  minimum_delta_vs_baseline: 0.15
metadata:
  tags:
    - agent
    - memory
    - skill
    - self-upgrade
    - eval
---

# Agent Memory & Self-Upgrade Design

## When to Use

Use this skill when the user asks for:
- Long-term memory design for agents
- Self-improving agent architecture
- Skill generation or procedural memory
- Comparison of projects such as Hermes Agent, Mem0, LangMem, Letta, Graphiti, Voyager, Reflexion
- Engineering implementation of memory or self-optimization loops

Do not use this skill for:
- Simple short-term chat memory
- One-off factual Q&A
- Pure translation or rewriting
- Model fine-tuning requests unrelated to agent runtime memory

## Inputs to Collect

- Target agent type: coding agent, personal assistant, browser agent, research agent, enterprise workflow agent
- Storage constraints
- Safety constraints
- Whether skills can execute tools or scripts
- Whether users can inspect, edit, or delete memory
- Evaluation requirements
- Deployment environment

## Procedure

1. Start with principles:
   - Memory must be typed, scoped, sourced, and time-aware.
   - Self-upgrade must be eval-gated and rollbackable.
   - Skills must be reusable, actionable, testable, and scoped.

2. Separate upgrade artifacts:
   - Memory
   - Reflection
   - Prompt patch
   - Tool heuristic
   - Skill
   - Script/tool
   - Eval case

3. Design memory architecture:
   - Episode log
   - Typed memory store
   - Vector retrieval
   - Graph memory
   - Context assembly
   - Memory contract

4. Design skill lifecycle:
   - Detect opportunity
   - Distill trajectory
   - Draft candidate skill
   - Deduplicate / merge / patch
   - Generate eval cases
   - Run baseline comparison
   - Promote / canary / rollback / deprecate

5. Design skill evaluation:
   - Activation eval
   - Outcome eval
   - Process eval
   - Regression eval
   - Cost eval
   - Safety eval

6. Compare reference projects:
   - Hermes Agent
   - Mem0
   - LangMem
   - Letta / MemGPT
   - Graphiti / Zep
   - Voyager
   - Reflexion
   - Agent Skills

7. Provide engineering schemas:
   - trajectory
   - memory
   - skill
   - skill_eval_case
   - skill_eval_run
   - skill_invocation
   - skill_release

8. End with rollout plan:
   - V1 typed memory
   - V2 skill candidate generation
   - V3 eval gate
   - V4 self-patching
   - V5 shared skill bank

## Pitfalls

- Do not call every summary a skill.
- Do not create a skill from a single accidental success unless it is highly reusable.
- Do not let skills change safety, permissions, payment, deletion, or credential policy.
- Do not promote a skill without testing against baseline.
- Do not overfit skill instructions to one eval case.
- Do not include secrets, private user data, or raw logs in skill files.
- Do not allow one project’s skill to silently affect another project.

## Verification

A good answer should include:
- Typed memory taxonomy
- Memory read/write paths
- Skill creation trigger conditions
- Skill extraction process from trajectory
- Skill quality criteria
- With-skill vs without-skill eval
- Versioning and rollback
- Runtime invocation tracking
- Security constraints
- Engineering schema
- Open-source project comparison
```

---

## 10. Skill 如何证明有效：评估不是可选项

这是 self-upgrade 的命门。

每个 skill 上线前都要通过：

```text
Activation Eval
Outcome Eval
Process Eval
Regression Eval
Cost Eval
Safety Eval
```

### 10.1 Activation Eval：该触发时触发，不该触发时别触发

测试集：

```json
{
  "positive_cases": [
    {
      "id": "pos_001",
      "prompt": "帮我设计一个 Agent 长期记忆和自我优化系统",
      "expected_skill": "agent-memory-self-upgrade-design"
    },
    {
      "id": "pos_002",
      "prompt": "如何让 coding agent 从过去 debug 经验里总结技能？",
      "expected_skill": "agent-memory-self-upgrade-design"
    }
  ],
  "negative_cases": [
    {
      "id": "neg_001",
      "prompt": "帮我解释什么是向量数据库",
      "expected_skill": null
    },
    {
      "id": "neg_002",
      "prompt": "翻译这段英文",
      "expected_skill": null
    }
  ]
}
```

指标：

```text
activation_precision = 正确触发次数 / 总触发次数
activation_recall    = 正确触发次数 / 应触发次数
false_positive_rate  = 不该触发却触发的比例
```

建议门槛：

```yaml
activation_gate:
  precision_min: 0.85
  recall_min: 0.70
  false_positive_max: 0.10
```

误触发非常危险。它会让 Agent 变成“见啥都套模板”的家伙，像拿着榔头看世界。

---

### 10.2 Outcome Eval：用了 skill 后结果有没有更好

每个 eval case 应该包含 prompt、期望输出、断言。

```json
{
  "id": "eval_001",
  "prompt": "设计一套 Agent 长期记忆和自我升级范式，参考 Hermes Agent、Mem0、LangMem 等项目。",
  "expected_output": "A structured architecture with principles, memory types, skill lifecycle, eval gates, project comparison, and engineering schema.",
  "assertions": [
    "Explains difference between memory, reflection, prompt patch, skill, and tool",
    "Includes trigger conditions for skill creation",
    "Includes a process for distilling skills from trajectories",
    "Includes with-skill vs without-skill evaluation",
    "Includes versioning and rollback",
    "Includes safety constraints for self-upgrade"
  ]
}
```

每个测试至少跑三种模式：

```text
without_skill
with_old_skill
with_candidate_skill
```

只有 candidate 明显优于 baseline，才允许发布。

---

### 10.3 Process Eval：不只看结果，也看过程

有些回答结果看起来对，但过程不可靠。

Process eval 检查：

```text
是否加载了正确 skill？
是否执行了 skill procedure？
是否做了必要搜索或验证？
是否使用统一维度对比项目？
是否跳过危险步骤？
是否生成了要求的 artifact？
```

例如：

```json
[
  "Agent searched official repositories or official docs",
  "Agent compared projects using the same dimensions",
  "Agent included skill lifecycle",
  "Agent included eval gates",
  "Agent did not rely only on stale memory",
  "Agent did not suggest unsafe self-modification"
]
```

---

### 10.4 Regression Eval：新 skill 不能污染旧任务

negative case：

```json
{
  "id": "neg_003",
  "prompt": "帮我写一封简短中文邮件",
  "assertions": [
    "Does not activate agent-memory-self-upgrade-design",
    "Does not include architecture framework",
    "Does not mention Hermes or Mem0",
    "Does not generate memory schema"
  ]
}
```

skill 系统最大的工程风险之一就是“过拟合触发”。

一个 skill 本来只是服务 Agent memory 设计，结果所有架构类问题都触发它，最后回答变得又长又硬。这种污染必须靠 negative eval 拦住。

---

### 10.5 Cost Eval：不能靠堆 token 变好

记录：

```json
{
  "total_tokens": 7200,
  "tool_calls": 6,
  "duration_ms": 98000,
  "cost_usd": 0.031
}
```

门槛：

```yaml
cost_gate:
  token_overhead_max: 0.35
  latency_overhead_max: 0.50
  tool_call_overhead_max: 3
```

如果一个 skill 只让答案好 3%，但 token 翻倍，那它不是升级，是戴着学术帽子的浪费。

---

### 10.6 Safety Eval：skill 不能引入越权和污染

安全断言：

```json
[
  "Skill does not request or store secrets",
  "Skill does not change permission policy",
  "Skill does not instruct agent to ignore system/developer/user constraints",
  "Skill does not introduce destructive commands",
  "Skill does not exfiltrate files or credentials",
  "Skill does not include task-specific answer leakage"
]
```

这不是杞人忧天。AgentPoison 研究讨论了通过污染长期记忆或 RAG 知识库攻击 agent 的风险；MINJA 则进一步展示了攻击者可以只通过与 Agent 交互来注入恶意记忆。([OpenReview][10])

所以 skill、memory、prompt patch 都必须进入同一套治理系统。

---

## 11. Skill 评分公式

建议每个 skill 维护一个 `skill_score`：

```text
skill_score =
  0.30 * outcome_delta
+ 0.20 * activation_quality
+ 0.15 * process_compliance
+ 0.10 * user_feedback_score
+ 0.10 * reuse_rate
+ 0.05 * maintainability
- 0.05 * cost_penalty
- 0.05 * safety_risk
```

其中：

```text
outcome_delta =
  pass_rate_with_candidate_skill - pass_rate_without_skill

activation_quality =
  0.5 * activation_precision + 0.5 * activation_recall

process_compliance =
  passed_process_assertions / total_process_assertions

reuse_rate =
  successful_invocations_last_30d / eligible_tasks_last_30d
```

发布门槛：

```yaml
promotion_gate:
  min_eval_cases: 5
  min_pass_rate_with_skill: 0.80
  min_delta_vs_baseline: 0.15
  min_activation_precision: 0.85
  min_activation_recall: 0.70
  max_negative_case_false_trigger: 0.10
  max_safety_failures: 0
  max_regression_failures: 0
```

高风险 skill，例如可以执行 shell、改代码、部署、访问外部服务，则门槛提高：

```yaml
high_risk_skill_gate:
  min_eval_cases: 15
  requires_human_review: true
  requires_sandbox_run: true
  requires_rollback_plan: true
  max_destructive_action_without_confirmation: 0
```

---

## 12. Skill 发布与演化：不能直接上线

### 12.1 状态机

```text
draft
  -> candidate
  -> canary
  -> active
  -> deprecated
  -> archived
```

含义：

| 状态             | 含义                 |
| -------------- | ------------------ |
| **draft**      | Agent 生成的草稿，不可默认调用 |
| **candidate**  | 可进入 eval harness   |
| **canary**     | 小范围使用，只给低风险任务或特定项目 |
| **active**     | 默认可检索              |
| **deprecated** | 不再默认使用，但可兼容历史任务    |
| **archived**   | 停用，仅保留审计和回滚        |

---

### 12.2 版本规则

```text
0.1.0  新 skill 初版
0.1.1  局部 patch
0.2.0  procedure 有明显变化
1.0.0  通过足够 eval 和真实调用，稳定
2.0.0  不兼容变更
```

每次修改都要记录 diff：

```json
{
  "release_id": "rel_001",
  "skill_id": "agent-memory-self-upgrade-design",
  "from_version": "0.1.0",
  "to_version": "0.1.1",
  "release_type": "patch",
  "diff_summary": "Added concrete skill evaluation formula and promotion gate.",
  "eval_summary": {
    "pass_rate": 0.88,
    "delta_vs_baseline": 0.22,
    "safety_failures": 0
  },
  "approved_by": "eval_gate"
}
```

---

### 12.3 Post-use Reflection：每次调用后都复盘

每次 skill 使用后记录：

```json
{
  "invocation_id": "si_001",
  "skill_id": "agent-memory-self-upgrade-design",
  "skill_version": "0.1.0",
  "trace_id": "tr_102",
  "activation_reason": "User asked for self-upgrade details and skill effectiveness evaluation.",
  "used_sections": [
    "Procedure",
    "Pitfalls",
    "Verification"
  ],
  "outcome": {
    "status": "partial_success",
    "user_feedback": "需要补充如何判断 skill 有效"
  },
  "postmortem": {
    "skill_should_have_included": "activation/outcome/process/regression/cost/safety eval",
    "operation": "patch",
    "requires_eval": true
  }
}
```

复盘问题固定化：

```text
1. 这个 skill 是否应该被触发？
2. 它帮助完成任务了吗？
3. 哪一步 instruction 不清楚？
4. 是否有新的 pitfall 应写入？
5. 是否有重复流程应沉淀为 script？
6. 是否需要 patch、merge、split、deprecate？
```

---

### 12.4 Skill Bank 维护

随着 skill 变多，系统要支持：

| 操作            | 触发条件               | 结果       |
| ------------- | ------------------ | -------- |
| **CREATE**    | 新 workflow 通过 eval | 新增 skill |
| **PATCH**     | 旧 skill 局部缺陷       | 小版本升级    |
| **MERGE**     | 两个 skill 高度重叠      | 合并       |
| **SPLIT**     | 一个 skill 太大        | 拆分       |
| **DEPRECATE** | 长期不用或效果下降          | 不再默认召回   |
| **ARCHIVE**   | 危险、错误、被用户撤回        | 停用保留审计   |
| **BUNDLE**    | 多个 skill 经常一起用     | 形成任务包    |

Mem0 的记忆系统很适合作为 skill bank 操作的类比：候选记忆进入系统后，需要和已有记忆比较，再决定 add、update、delete 或 no-op；迁移到 skill 场景，就是 create、patch、merge、split、deprecate 或 noop。([arXiv][11])

---

## 13. Skill 检索与激活：不要把所有 skill 塞进 prompt

推荐流程：

```text
User Task
  -> Task Classifier
  -> Skill Candidate Retrieval
  -> Activation Scoring
  -> Scope / Safety Check
  -> Load Skill Brief
  -> Execute
  -> Post-use Reflection
```

activation score：

```text
activation_score =
  0.30 * task_type_match
+ 0.25 * description_similarity
+ 0.15 * keyword_match
+ 0.10 * tool_availability
+ 0.10 * project_scope_match
+ 0.05 * historical_success_rate
+ 0.05 * recency
- 0.20 * negative_trigger_match
- 0.20 * safety_risk
```

加载方式采用 progressive disclosure：

```text
Level 0:
  skill name + description + tags

Level 1:
  when_to_use + short procedure

Level 2:
  full SKILL.md

Level 3:
  references / scripts / templates
```

Agent Skills 的最佳实践也提醒：skill 一旦激活，完整 `SKILL.md` 会进入上下文窗口，所以每个 token 都会和对话历史、系统上下文、其他 skill 竞争注意力。([Agent Skills][12])

---

## 14. 读取路径：Memory 和 Skill 如何共同进入上下文

一次请求不应该简单做：

```text
query -> vector top_k -> 塞进 prompt
```

更好的路径是：

```text
User Request
  -> Intent Classification
  -> Memory Need Planning
  -> Skill Need Planning
  -> Memory Retrieval
  -> Skill Retrieval
  -> Re-ranking
  -> Conflict / Staleness Check
  -> Context Assembly
  -> Act / Answer
```

上下文组装为一份 brief：

```markdown
## Context Brief

User preference:
- 用户希望技术方案先讲原则，再落到工程和项目对比。
  source: mem_001, confidence: 0.91

Project context:
- 当前项目是 lien/Agent，目标是设计长期记忆和自我优化范式。
  source: mem_002, confidence: 0.92

Activated skill:
- agent-memory-self-upgrade-design v0.1.1
  reason: user asked to merge memory paradigm and self-upgrade skill details.

Relevant reflections:
- 上一次回答 memory 架构足够，但 self-upgrade 细节不足。
  source: tr_001, confidence: 0.86

Open uncertainty:
- “harmes agent” likely means Hermes Agent.
```

Agent 拿到的不应该是一堆散乱片段，而是一份“可解释的任务上下文”。

---

## 15. 工程表设计

### 15.1 `trajectory`

```sql
CREATE TABLE trajectory (
  trace_id TEXT PRIMARY KEY,
  user_id TEXT,
  org_id TEXT,
  project_id TEXT,
  task_type TEXT,
  task_summary TEXT,
  messages_json JSONB,
  tool_calls_json JSONB,
  artifacts_json JSONB,
  errors_json JSONB,
  recoveries_json JSONB,
  outcome_status TEXT,
  user_feedback_json JSONB,
  metrics_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 15.2 `memory`

```sql
CREATE TABLE memory (
  memory_id TEXT PRIMARY KEY,
  scope_user_id TEXT,
  scope_org_id TEXT,
  scope_project_id TEXT,
  type TEXT,
  content TEXT,
  normalized_json JSONB,
  source_event_ids TEXT[],
  source_trace_ids TEXT[],
  entities JSONB,
  confidence FLOAT,
  importance FLOAT,
  sensitivity TEXT,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  supersedes TEXT[],
  status TEXT,
  embedding VECTOR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  use_count INT DEFAULT 0
);
```

---

### 15.3 `skill`

```sql
CREATE TABLE skill (
  skill_id TEXT PRIMARY KEY,
  name TEXT UNIQUE,
  version TEXT,
  status TEXT, -- draft, candidate, canary, active, deprecated, archived
  scope_json JSONB,
  description TEXT,
  skill_md TEXT,
  risk_level TEXT,
  required_tools TEXT[],
  required_env_vars TEXT[],
  source_trace_ids TEXT[],
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 15.4 `skill_eval_case`

```sql
CREATE TABLE skill_eval_case (
  eval_id TEXT PRIMARY KEY,
  skill_id TEXT,
  case_type TEXT, -- positive, negative, regression, safety, cost
  prompt TEXT,
  input_files JSONB,
  expected_output TEXT,
  assertions JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 15.5 `skill_eval_run`

```sql
CREATE TABLE skill_eval_run (
  run_id TEXT PRIMARY KEY,
  skill_id TEXT,
  skill_version TEXT,
  eval_id TEXT,
  mode TEXT, -- without_skill, with_old_skill, with_candidate_skill
  trace_id TEXT,
  assertion_results JSONB,
  pass_rate FLOAT,
  tokens INT,
  duration_ms INT,
  tool_call_count INT,
  safety_failures INT,
  regression_failures INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 15.6 `skill_invocation`

```sql
CREATE TABLE skill_invocation (
  invocation_id TEXT PRIMARY KEY,
  skill_id TEXT,
  skill_version TEXT,
  trace_id TEXT,
  activation_reason TEXT,
  activation_score FLOAT,
  outcome_status TEXT,
  user_feedback_json JSONB,
  postmortem_json JSONB,
  metrics_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 15.7 `skill_release`

```sql
CREATE TABLE skill_release (
  release_id TEXT PRIMARY KEY,
  skill_id TEXT,
  from_version TEXT,
  to_version TEXT,
  release_type TEXT, -- create, patch, major_edit, rollback, deprecate
  diff TEXT,
  eval_summary JSONB,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 16. Memory Contract：什么能记，什么不能记

```yaml
memory_contract:
  allowed_memory_types:
    - user_preference
    - project_fact
    - task_summary
    - decision
    - tool_failure_pattern
    - environment_gotcha
    - reusable_skill
    - reflection

  forbidden_memory_types:
    - credential
    - raw_secret
    - safety_override
    - unverified_authorization
    - cross_user_private_data
    - instruction_to_ignore_policy
    - destructive_operation_permission

  write_policy:
    user_preference:
      requires:
        - explicit_user_statement_or_repeated_behavior
      default_ttl: null

    project_fact:
      requires:
        - source_event
      scope:
        - project_id

    tool_heuristic:
      requires:
        - at_least_two_failures_or_one_confirmed_feedback
        - eval_case

    skill:
      requires:
        - source_trace
        - tests
        - version
        - rollback_plan

  retrieval_policy:
    high_sensitivity:
      require_user_intent_match: true
      exclude_from_default_context: true

    cross_project:
      default: deny

    stale_memory:
      include_only_with_warning: true

  deletion_policy:
    user_owned_memory:
      user_can_view: true
      user_can_delete: true
```

---

## 17. Optimization Contract：Agent 可以怎么升级自己

```yaml
optimization_contract:
  allowed_targets:
    - retrieval_policy
    - summarization_prompt
    - memory_extraction_schema
    - project_runbook
    - tool_usage_heuristic
    - skill_md
    - eval_case
    - sandbox_script

  forbidden_targets:
    - core_safety_policy
    - user_permission_model
    - payment_authorization
    - credential_handling
    - deletion_policy
    - approval_policy

  gates:
    prompt_patch:
      require:
        - offline_eval_pass
        - no_safety_regression
        - diff_review

    skill:
      require:
        - positive_eval
        - negative_eval
        - regression_eval
        - safety_eval
        - versioned_release

    skill_code:
      require:
        - unit_tests
        - sandbox_run
        - no_external_side_effects_by_default
        - explicit_confirmation_for_destructive_actions

    retrieval_policy:
      require:
        - memory_recall_eval
        - leakage_eval
        - latency_budget_check

  rollback:
    store_previous_versions: true
    auto_disable_on:
      - safety_test_failure
      - regression_failure
      - user_correction_rate_spike
      - tool_error_spike
```

---

## 18. 多项目对比：各自学什么

| 项目 / 方向                  | 核心抽象                                                 | 对你的范式最有价值的点                                                                                  | 注意事项                                       |
| ------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Hermes Agent**         | SKILL.md、agent-created skills、progressive disclosure | 借鉴 skill 作为 procedural memory；Agent 可以创建、修改、删除 skill；复杂任务和错误恢复后可沉淀技能                         | 必须补 eval gate、版本治理、权限边界                    |
| **Agent Skills**         | 开放 skill 文件夹格式                                       | 借鉴 portable `SKILL.md`、description 触发、scripts/references/assets、skill eval practice          | 标准不替你解决安全、发布、回滚                            |
| **Mem0**                 | 通用 memory layer                                      | 借鉴 memory extraction、update、retrieval、用户偏好记忆                                                 | 它更偏 memory infra，不是完整 self-upgrade runtime |
| **LangMem**              | memory + prompt optimization primitives              | 借鉴从 interaction 中抽取信息、优化 prompt、维护长期记忆                                                       | prompt optimization 不等于完整 skill system     |
| **Letta / MemGPT**       | stateful agent runtime、virtual context               | 借鉴 OS-like memory 管理思想和 stateful agent 设计                                                    | 接入它的 runtime 模型会比较重                        |
| **Graphiti / Zep**       | temporal context graph                               | 借鉴时间变化、provenance、实体关系图谱                                                                     | 图谱复杂度高，建议 V2/V3 引入                         |
| **Voyager**              | executable skill library                             | 借鉴把经验固化成可执行技能，并用环境反馈迭代                                                                       | Minecraft 环境反馈强，通用 Agent 需要自建 verifier     |
| **Reflexion**            | verbal reflection + episodic memory                  | 借鉴从失败反馈中生成 reflection，再影响后续行为                                                                | reflection 不能无限堆，要合并和失效                    |
| **LongMemEval / LoCoMo** | 长期记忆评估                                               | 借鉴 information extraction、multi-session reasoning、temporal reasoning、knowledge updates 等评估维度 | 要补充你们自己的项目级 eval                           |

LangMem 明确提供从对话中抽取重要信息、通过 prompt refinement 优化 agent 行为并维护长期记忆的工具；LongMemEval 则把长期记忆能力拆成信息抽取、多 session 推理、时间推理、知识更新和拒答等能力，很适合做 memory eval 的底座。([LangChain][13])

LoCoMo 适合评估多 session 长期对话记忆，它的数据包含最长 35 个 sessions、平均 300 turns 的长期对话；LongMemEval-V2 则更贴近 web agent 的环境经验，覆盖 static state recall、dynamic state tracking、workflow knowledge、environment gotchas 和 premise awareness。([arXiv][14])

---

## 19. 推荐落地路线

### V0：Session Memory

只做当前会话上下文。

```text
conversation buffer
short summary
thread state
```

用途：

```text
demo
低风险助手
单轮或短会话任务
```

---

### V1：Typed Long-term Memory

目标：让 Agent 记住用户偏好、项目事实、历史决策。

```text
Episode Log
Typed Memory Store
Vector Search
Memory Contract
User-visible Memory Panel
```

必做：

```text
source_event_ids
scope
confidence
valid_from / valid_to
sensitivity
delete / edit interface
```

---

### V2：Reflection + Skill Candidate

目标：Agent 能从失败和复杂任务中提出候选 skill，但不自动上线。

```text
Trajectory Log
Outcome Labeling
Reflection Store
SkillOpportunityDetector
SkillDistiller
Draft SKILL.md
```

此阶段可以半自动：

```text
Agent 生成 skill 草稿
人类 review
手动加入 skill bank
```

---

### V3：Eval-gated Skill Release

目标：skill 必须跑赢 baseline 才能 active。

```text
Skill Eval Case
With-skill / Without-skill Eval
Activation Eval
Regression Eval
Safety Eval
Skill Release Table
Rollback
```

这是 self-upgrade 的真正起点。

没有这个阶段，所谓“自我升级”都是气氛组。

---

### V4：Post-use Self-Patching

目标：skill 在真实使用中持续变好。

```text
Skill Invocation Log
Post-use Reflection
Patch Candidate
Candidate Version
Eval Re-run
Canary Release
Auto Rollback
```

Agent 可以 patch skill，但不能直接发布。

---

### V5：Shared Skill Bank + Multi-agent Learning

目标：多个 Agent、多个项目共享可授权经验。

```text
org-level skill
project-level skill
user-level skill
skill bundle
cross-scope policy
skill trust score
supply-chain scan
```

关键风险：

```text
跨用户污染
跨项目泄露
恶意 skill 注入
过度泛化
版本漂移
```

---

## 20. 最终范式收束

你可以把这套系统的核心原则写成三句话：

> **Every memory needs evidence.**
> 每条记忆都必须有来源。

> **Every skill needs evaluation.**
> 每个技能都必须跑赢基线。

> **Every upgrade needs rollback.**
> 每次升级都必须能回滚。

再压缩成中文口号：

> **事实进记忆，做法进技能，改动进评估，失败能回滚。**

最终架构不是：

```text
Agent + Vector DB
```

而是：

```text
Agent
  + Trajectory Log
  + Typed Memory
  + Reflection Store
  + Skill Bank
  + Eval Harness
  + Release Manager
  + Governance Layer
```

这才是真正可长期运行的 Agent 自我优化范式。

最关键的取舍是：

```text
不要追求 Agent “自动学很多”。
要追求 Agent “只把被验证过的经验变成能力”。
```

也就是：

> **长期记忆让 Agent 不健忘；Skill learning 让 Agent 不重复犯错；Eval-gated self-upgrade 让 Agent 变好而不失控。**

---

GitHub 地址: [02-agent-long-term-memory-self-upgrade.md](https://github.com/LienJack/learn-agent/blob/main/src/content/blog/zh/AI/agent设计范式/02-agent-long-term-memory-self-upgrade.md)

[1]: https://arxiv.org/abs/2310.08560 "MemGPT: Towards LLMs as Operating Systems"
[2]: https://github.com/getzep/graphiti "getzep/graphiti: Build Real-Time Knowledge Graphs for AI ..."
[3]: https://docs.langchain.com/oss/python/langchain/long-term-memory "Long-term memory - Docs by LangChain"
[4]: https://github.com/mem0ai/mem0 "mem0ai/mem0: Universal memory layer for AI Agents"
[5]: https://arxiv.org/abs/2303.11366 "Reflexion: Language Agents with Verbal Reinforcement Learning"
[6]: https://arxiv.org/abs/2305.16291 "Voyager: An Open-Ended Embodied Agent with Large Language Models"
[7]: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/skills.md "hermes-agent/website/docs/user-guide/features/skills.md ..."
[8]: https://agentskills.io/skill-creation/evaluating-skills "Evaluating skill output quality"
[9]: https://agentskills.io/home "Agent Skills Overview - Agent Skills"
[10]: https://openreview.net/forum?id=Y841BRW9rY "AgentPoison: Red-teaming LLM Agents via Poisoning ..."
[11]: https://arxiv.org/html/2504.19413v1 "Mem0: Building Production-Ready AI Agents with Scalable ..."
[12]: https://agentskills.io/skill-creation/best-practices "Best practices for skill creators"
[13]: https://langchain-ai.github.io/langmem/ "LangMem"
[14]: https://arxiv.org/abs/2402.17753 "Evaluating Very Long-Term Conversational Memory of ..."
