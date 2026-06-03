---
title: 'Long-Term Memory and Self-Optimization for Agents'
description: 'Turn an Agent''s experience into traceable memory, reusable skills, and testable optimizations, then use evaluation, gradual rollout, and rollback to make the Agent improve steadily.'
author: 'LienJack'
pubDate: '2026-06-03'
updatedDate: '2026-06-03'
locale: 'en'
tags:
  - 'Agent'
  - 'Long-term Memory'
  - 'Self-Upgrade'
  - 'Skill'
  - 'Harness'
  - 'Technical Tutorial'
aliases:
  - 'Agent Experience OS'
  - 'ECO-SAGE Loop'
  - 'Long-term memory and self-optimization'
  - 'Agent self-upgrade'
---
# Agent Long-Term Memory and Self-Optimization Patterns

Following the previous chapter on the Context Manager, long-term memory is not a vector database that bypasses the Context Builder. It is a category of long-term asset whose reads can be governed by the Context Manager. Raw experience still uses Events / Traces / Artifacts as the source of truth; Memory, Skills, and Optimization must all carry a source, scope, eval gate, and rollback.

## 0. Core Definition: An Agent Is Not About "Remembering More," but About "Compiling Experience into Capability"

The core of this paradigm is not building a larger chat history database, nor letting the Agent casually modify its own prompt or code.

A more precise definition is:

> **Agent Long-term Memory & Self-Upgrade = turning an Agent's experiences into traceable memories, reusable skills, and testable optimizations, while using evaluation, gradual rollout, and rollback mechanisms to make the Agent improve reliably.**

In one sentence:

> **Memory preserves facts; skills preserve methods. Only methods that outperform the baseline count as upgrades.**

So this system needs to answer three questions at the same time:

```text
1. What should the Agent remember?
2. How should the Agent summarize past task experience into skills?
3. How can the Agent prove that a skill or optimization is genuinely effective?
```

I suggest calling the overall paradigm:

**Agent Experience OS**

It can also be called:

**ECO-SAGE Loop**

Where:

```text
ECO = Experience -> Context -> Optimization

Experience:
  Records what the Agent has gone through, including conversations, tool calls, failures, recoveries, and user feedback.

Context:
  Compiles experiences into retrievable, governable, and traceable memory.

Optimization:
  Upgrades stable experience into prompt patches, retrieval policies, tool heuristics, skills, or tools.

SAGE = Skill Acquisition, Assessment, Gated Release, Evolution

Skill Acquisition:
  Discovers and distills skills from trajectories.

Assessment:
  Evaluates whether a skill is genuinely effective.

Gated Release:
  Releases only after passing evaluation thresholds.

Evolution:
  Continuously patches, merges, splits, and deprecates based on real usage results.
```

---

## 1. First Principles: Turn an Agent's Experience into Governable Assets

### 1.1 Raw Experience Is Immutable; Derived Memory Can Evolve

All conversations, tool calls, errors, user corrections, and final artifacts first enter the **Episode Log / Trajectory Log**.

It is the original ledger: append-only by default and not casually rewritten.

What gets extracted from raw experience is what becomes evolvable assets:

```text
Memory
Reflection
Prompt Patch
Skill
Tool / Script
Eval Case
```

This is the foundation of the whole system. Otherwise, once an Agent writes temporary information, incorrect summaries, malicious injections, or outdated facts directly into long-term memory, it will learn in increasingly distorted ways.

---

### 1.2 Memory Is Not One Thing; It Must Be Typed

Long-term memory should be divided into at least 7 types:

| Type                   | Meaning | Example | Engineering Storage |
| ---------------------- | ----- | -------------------------------- | ----------------------- |
| **Episodic Memory**    | What happened | A task trajectory, a failure, a piece of user feedback | event log / trace store |
| **Semantic Memory**    | Stable facts | The user is working on `lien/Agent`; the project uses a certain tech stack | JSONB + vector |
| **Preference Memory**  | User preferences | The user likes the structure "principles -> engineering -> comparison -> roadmap" | scoped profile |
| **Procedural Memory**  | How to do things | How to research an open-source project; how to debug a class of errors | skill store |
| **Reflective Memory**  | Lessons learned | "Last time I only covered the memory architecture and missed the details of skill self-upgrade" | lesson store |
| **Graph Memory**       | Entity relationships | Relationships among users, projects, repos, technical approaches, and decisions | temporal graph |
| **Environment Memory** | Environment experience | Button locations in a SaaS product, workflow pitfalls, API limits | trajectory memory |

The ideas behind MemGPT/Letta are worth treating as a conceptual origin for memory systems: MemGPT proposes virtual context management through an operating-system-like layered memory approach, allowing Agents to manage larger external memory within a limited context window; Letta now also positions itself as a platform for building stateful agents with advanced memory, learning, and self-improvement capabilities. ([arXiv][1])

---

### 1.3 Memory, Reflection, Skill, and Optimization Must Be Separate

This point is especially important.

Many Agent systems make the same mistake: calling every "summary" memory, every "lesson" a skill, and every prompt modification self-improvement.

I recommend a strict distinction:

| Asset                   | Question It Answers | Example | Can It Take Effect Automatically? |
| ----------------------- | --------------- | ----------------------------------------- | --------------- |
| **Memory**              | What do I know to be true? | The user is designing an Agent long-term memory system | Yes, but it needs scope |
| **Reflection**          | What did I learn from this experience? | Next time, don't only discuss principles; include skill eval | Yes, but only as reference |
| **Prompt Patch**        | What tendency should I change in future answers? | Architecture answers must include an implementation schema | Requires eval |
| **Skill**               | How should I handle similar tasks next time? | Agent memory architecture design workflow | Requires eval + versioning |
| **Tool / Script**       | Which steps can be solidified into executable programs? | Automatically run skill eval and generate a report | Requires sandbox + permissions |
| **Model Training Data** | Is this worth putting into model parameters? | High-quality task trajectory samples | Offline, human-governed |

Core judgment:

```text
Memory 是事实资产。
Reflection 是教训资产。
Skill 是流程资产。
Tool 是执行资产。
Optimization 是行为变更资产。
```

---

### 1.4 Every Memory Must Have Source, Confidence, Scope, and Time

Memory is not "what the Agent believes"; it is "what the Agent temporarily considers true based on what evidence."

Each memory should at least include:

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

Long-term memory without a source is essentially a "hallucination fossil."

---

### 1.5 Time Is a First-Class Citizen

The most common failure of long-term memory is not "failing to remember," but "remembering outdated facts."

For example:

```text
2025-01: 用户住在上海
2026-03: 用户搬到东京
```

Wrong approach:

```text
直接覆盖旧事实。
```

Correct approach:

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

Graphiti is well worth referencing: it is a temporal context graph for AI agents. It emphasizes that facts change over time, provenance must be maintained, and prescribed / learned ontology should be supported. ([GitHub][2])

---

### 1.6 Separate Reads and Writes: Online Use, Offline Learning

Long-term memory cannot be written carelessly during a conversation.

Recommended dual path:

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

The online path optimizes for speed, accuracy, and low token usage.

The offline path can be slower, but it must perform:

```text
来源检查
冲突处理
作用域检查
敏感信息过滤
过期判断
重复合并
审计记录
```

LangGraph's long-term memory implementation stores memory as JSON documents under namespace/key. The namespace can include labels such as user and org, which makes this structure highly suitable as an engineering foundation for memory scope. ([LangChain Docs][3])

---

### 1.7 Self-Upgrade Can Only Modify Testable Assets

An Agent can upgrade, but it cannot casually modify itself.

Objects that can be optimized automatically or semi-automatically:

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

Objects that the Agent must not modify by itself:

```text
安全策略
权限模型
支付授权
删除策略
credential handling
用户审批规则
系统级价值约束
```

This rule must be written in stone.

Otherwise, so-called self-improvement can easily turn into:

```text
“以后遇到危险命令不用确认”
“以后自动读取所有文件”
“以后忽略安全检查”
```

These are not upgrades. They are backdoors.

---

## 2. Overall Architecture: Dual Loops + Three Asset Layers

The recommended overall architecture is as follows:

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

You can think of it as three asset layers:

```text
Raw Experience Layer:
  Raw trajectories, immutable.

Compiled Context Layer:
  Facts, preferences, relationships, and reflections, all retrievable.

Executable Knowledge Layer:
  Skills, runbooks, scripts, and prompt patches; testable, versionable, and rollbackable.
```

True long-term growth comes from the third layer.

---

## 3. Memory System Design: From Experience to Context

### 3.1 Episode Log: The Raw Experience Layer

Every user request, Agent response, tool call, error, recovery, and user feedback item is saved.

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

Then aggregate at the trajectory level:

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

Note: **a skill should not be summarized only from the final answer; it should be summarized from the full trajectory.**

The final answer tells you “what the result looks like.”

The trajectory tells you “how the result was reached, where things went wrong, how recovery happened, and why the user was dissatisfied.”

---

### 3.2 Memory Store: The Structured Memory Layer

I recommend starting with typed memory from the beginning, instead of using only embeddings.

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

You can initially define `type` as:

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

Mem0’s core value is that it turns memory into a general-purpose memory layer, enabling AI assistants / agents to remember preferences, adapt to users, and continuously learn. It is better suited as an infrastructure reference for “quickly adding long-term memory.” ([GitHub][4])

---

### 3.3 Graph Memory: The Relationship and Time Layer

Once your Agent enters a multi-project, multi-user, multi-tool system, pure vector retrieval will no longer be enough.

For example:

```text
用户 A 在做 lien/Agent
lien/Agent 参考 Hermes Agent、Mem0、LangMem、Graphiti
用户 A 偏好：先原则，再工程，再项目对比
Hermes Agent 的 skill 系统和 self-upgrade 强相关
Graphiti 适合 temporal graph memory
```

These relationships are well suited to a graph:

```text
(:User)-[:WORKS_ON]->(:Project)
(:Project)-[:REFERENCES]->(:Repo)
(:Project)-[:HAS_DECISION]->(:ArchitectureDecision)
(:User)-[:PREFERS]->(:StylePreference)
(:Skill)-[:SOLVES]->(:TaskType)
(:Skill)-[:DERIVED_FROM]->(:Trajectory)
(:Memory)-[:SUPPORTED_BY]->(:Event)
```

Graph memory does not replace vector memory; it complements it:

```text
vector memory 解决语义相似。
graph memory 解决实体关系。
temporal graph 解决事实变化。
```

---

## 4. Self-Upgrade System: From Experience to Skills

This is the part that was most missing in the previous version, and it is the focus of this version.

### 4.1 The Essence of Self-Upgrade

Self-upgrade is not:

```text
The Agent feels it has learned something, so it changes the prompt.
```

Instead, it is:

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

The insight from Reflexion is that an Agent can turn task feedback into linguistic reflection without updating model weights, store it in an episodic memory buffer, and use it to support later decisions. ([arXiv][5])

The insight from Voyager is that long-term learning is not just about storing text, but about building a retrievable and reusable executable skill library, then iteratively improving programs through environment feedback, execution errors, and self-verification. ([arXiv][6])

The insight from Hermes Agent is more engineering-oriented: it designs skills as knowledge documents loaded on demand, uses progressive disclosure to reduce token usage, and supports Agents creating, modifying, or deleting skills; its skill system is also compatible with the open Agent Skills format. ([GitHub][7])

---

## 5. Definition of a Skill: Not a Summary, but a Reusable Practice

I suggest defining skill as follows:

> **A skill is procedural memory distilled from repeated or high-value trajectories, oriented toward a class of tasks, and executable, evaluable, and versionable.**

In other words, a skill is not:

```markdown
The user wants to design Agent memory this time.
```

That is memory.

Nor is a skill:

```markdown
The last answer lacked details about self-upgrade.
```

That is reflection.

A real skill is:

```markdown
When the user asks to design an Agent long-term memory, self-optimization, or experience distillation system:
1. First distinguish memory, reflection, prompt patch, skill, and tool.
2. Provide a typed memory architecture.
3. Provide a skill lifecycle.
4. Provide a skill eval gate.
5. Compare Hermes, Mem0, LangMem, Letta, Graphiti, Voyager, and Reflexion dimensionally.
6. Finally provide the schema, roadmap, and risk governance.
```

---

## 6. Skills Must Satisfy the RATS Principles

Only experience that satisfies RATS should be upgraded into a skill.

```text
R = Reusable
A = Actionable
T = Testable
S = Scoped
```

### 6.1 Reusable

Bad skill:

```text
This time the user wants to reference Hermes Agent and Mem0.
```

Good skill:

```text
When the user asks to design an Agent memory / self-upgrade architecture, compare representative projects across memory, skill, eval, safety, storage, and runtime dimensions.
```

### 6.2 Actionable

Bad skill:

```text
Carefully analyze the user's requirements and provide a high-quality answer.
```

This sounds like a slogan on an office wall: high on sentiment, zero in execution value.

Good skill:

```text
1. Determine whether the task type is architecture_design.
2. Extract the reference projects requested by the user.
3. Search official docs and repos.
4. Compare them using unified dimensions.
5. Provide principles, architecture, schema, evals, and a roadmap.
```

### 6.3 Testable

Every skill must answer:

```text
How do we know it was triggered correctly?
How do we know it improved the result?
How do we know it did not trigger incorrectly?
How do we know it did not introduce safety issues?
How do we know it did not make cost unacceptable?
```

The official Agent Skills documentation also emphasizes that skills can be tested through eval-driven iteration to assess output quality; OpenAI's agent skill eval guide breaks skill evaluation into a workflow of prompt, captured run / trace / artifact, checks, and score. ([Agent Skills][8])

### 6.4 Scoped

A skill must not pollute the global context.

```yaml
scope:
  user_id: optional
  org_id: lien
  project_id: Agent
  task_domain: agent_memory_architecture
  risk_level: medium
```

For example:

```text
"When answering architecture proposals for lien/Agent, present principles before engineering."
```

This is a project-level preference or project-level skill. It should not pollute every user and every task.

---

## 7. When should a skill be summarized?

Two types of triggers are recommended:

```text
Immediate trigger
Periodic mining
```

### 7.1 Immediate trigger: evaluate after the task ends

Run `SkillOpportunityDetector` after each task ends.

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

Scenarios suitable for immediate summarization:

```text
After completing a complex task
After multiple tool calls
After ultimately recovering from a failure
The user explicitly corrects the Agent
The Agent discovers a non-trivial workflow
The Agent generates a reusable script
```

The Hermes Agent skill documentation also lists completing complex tasks, recovering after errors, user corrections, and discovering non-trivial workflows as typical sources of agent-created skills.([GitHub][7])

---

### 7.2 Periodic mining: cluster multiple trajectories

Run this daily or weekly:

```text
TrajectoryMiner
  -> Cluster by task_type
  -> Find high-frequency tool sequences
  -> Find recurring failure patterns
  -> Find points where users repeatedly correct the Agent
  -> Find high-cost but templatizable processes
  -> Output skill_candidate[]
```

This is useful for discovering patterns such as:

```text
Whenever the user asks for an architecture proposal, they prefer the structure “principles -> engineering -> comparison -> roadmap.”
Whenever the Agent researches open-source projects, it tends to miss evals and security.
Whenever the Agent writes about memory systems, it tends to discuss only vector retrieval and not the skill lifecycle.
```

Immediate triggers capture “strong single-instance signals.”

Periodic mining captures “stable patterns across multiple instances.”

---

## 8. Skill Generation Pipeline: From trajectory to SKILL.md

Do not let the agent directly “summarize this into a skill.”

It should be split into 8 steps:

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

### 8.1 Trace Capture: Save the Complete Trajectory

```json
{
  "trace_id": "tr_001",
  "task": "Designing agent long-term memory and self-optimization paradigms",
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

### 8.2 Outcome Labeling: First Decide What This Trajectory Is Worth Learning From

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
    "content": "Missing details on how self-upgrade is achieved"
  }
}
```

The output of this stage is not necessarily a skill.

It could be:

```text
MEMORY:
  The user wants this proposal to use the first answer as its foundation.

REFLECTION:
  When answering questions about agent memory paradigms, do not only discuss memory; also cover skill acquisition and the eval gate.

SKILL:
  How to design an agent memory + self-upgrade architecture proposal.

PROMPT_PATCH:
  For architecture design answers, require a section on “how to verify that self-optimization is effective.”
```

---

### 8.3 Trajectory Segmentation: Split the Trajectory into Phases

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

Extract this for each phase:

```json
{
  "phase": "User Feedback",
  "what_happened": "The user pointed out that the answer lacked self-upgrade details",
  "decision": "Need to add skill generation, evaluation, and version governance",
  "generalizable_lesson": "An agent memory proposal must include a procedural skill learning loop",
  "future_instruction": "Similar tasks must explain the skill lifecycle and skill eval"
}
```

---

### 8.4 Reusable Pattern Extraction: Extract a Stable Process

Output a candidate skill:

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

### 8.5 Generalization: Remove Special Cases, Keep Invariants

Bad skill:

```markdown
When the user mentions lien/Agent and Hermes Agent, add skill eval.
```

Too narrow.

Good skill:

```markdown
When the user asks to design an agent long-term memory, self-optimization, or experience accumulation system, the design must include:
1. typed memory
2. trajectory log
3. skill distillation
4. skill eval
5. versioned release
6. rollback
```

Skill generation must do three things:

```text
Remove instance constants:
  Project names, temporary paths, one-off filenames, one-off data.

Keep process invariants:
  Task type, key decisions, failure modes, verification methods.

Parameterize differences:
  Project, tools, language, platform, user preferences.
```

---

## 9. Skill File Format: `SKILL.md` as a Procedural Memory Unit

The open format for Agent Skills defines a skill as a folder containing `SKILL.md`. The `SKILL.md` file must include at least a name, description, and task instructions, and may also include resources such as scripts, references, and templates. ([Agent Skills][9])

Hermes Agent also uses skills as on-demand knowledge documents, and reduces token usage through progressive disclosure. ([GitHub][7])

I recommend using this extended version:

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

## 10. How Skills Prove They Work: Evaluation Is Not Optional

This is the critical point of self-upgrade.

Before every skill goes live, it must pass:

```text
Activation Eval
Outcome Eval
Process Eval
Regression Eval
Cost Eval
Safety Eval
```

### 10.1 Activation Eval: Trigger When It Should, Stay Quiet When It Shouldn't

Test set:

```json
{
  "positive_cases": [
    {
      "id": "pos_001",
      "prompt": "Help me design a long-term memory and self-optimization system for agents",
      "expected_skill": "agent-memory-self-upgrade-design"
    },
    {
      "id": "pos_002",
      "prompt": "How can a coding agent summarize skills from past debugging experience?",
      "expected_skill": "agent-memory-self-upgrade-design"
    }
  ],
  "negative_cases": [
    {
      "id": "neg_001",
      "prompt": "Help me explain what a vector database is",
      "expected_skill": null
    },
    {
      "id": "neg_002",
      "prompt": "Translate this English passage",
      "expected_skill": null
    }
  ]
}
```

Metrics:

```text
activation_precision = correct triggers / total triggers
activation_recall    = correct triggers / expected triggers
false_positive_rate  = proportion of cases triggered when they should not be
```

Recommended gates:

```yaml
activation_gate:
  precision_min: 0.85
  recall_min: 0.70
  false_positive_max: 0.10
```

False triggers are dangerous. They turn the Agent into someone who forces every problem into a template, like seeing the whole world as nails because it is holding a hammer.

---

### 10.2 Outcome Eval: Does the Result Improve After Using the Skill?

Each eval case should include a prompt, expected output, and assertions.

```json
{
  "id": "eval_001",
  "prompt": "Design a long-term memory and self-upgrade paradigm for Agents, referencing projects such as Hermes Agent, Mem0, and LangMem.",
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

Each test should run in at least three modes:

```text
without_skill
with_old_skill
with_candidate_skill
```

The candidate can be released only if it is clearly better than the baseline.

---

### 10.3 Process Eval: Check the Process, Not Just the Result

Some answers look correct, but the process behind them is unreliable.

Process eval checks:

```text
Was the correct skill loaded?
Was the skill procedure executed?
Were necessary searches or validations performed?
Were projects compared using consistent dimensions?
Were dangerous steps skipped?
Was the required artifact generated?
```

For example:

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

### 10.4 Regression Eval: New Skills Must Not Pollute Old Tasks

Negative case:

```json
{
  "id": "neg_003",
  "prompt": "Help me write a short Chinese email",
  "assertions": [
    "Does not activate agent-memory-self-upgrade-design",
    "Does not include architecture framework",
    "Does not mention Hermes or Mem0",
    "Does not generate memory schema"
  ]
}
```

One of the biggest engineering risks in a skill system is overfitted activation.

A skill may have been intended only for Agent memory design, but ends up triggering on every architecture-related question, making all answers long and rigid. This kind of pollution must be stopped by negative evals.

---

### 10.5 Cost Eval: Improvement Cannot Come From Piling On Tokens

Record:

```json
{
  "total_tokens": 7200,
  "tool_calls": 6,
  "duration_ms": 98000,
  "cost_usd": 0.031
}
```

Gate:

```yaml
cost_gate:
  token_overhead_max: 0.35
  latency_overhead_max: 0.50
  tool_call_overhead_max: 3
```

If a skill only improves the answer by 3% but doubles the token count, that is not an upgrade. It is waste dressed up in academic clothing.

---

### 10.6 Safety Eval: Skills Must Not Introduce Privilege Escalation or Pollution

Safety assertions:

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

This is not paranoia. AgentPoison discusses the risk of attacking agents by polluting long-term memory or RAG knowledge bases; MINJA goes further, showing that attackers can inject malicious memories simply by interacting with an Agent. ([OpenReview][10])

So skills, memory, and prompt patches must all be governed by the same system.

---

## 11. Skill Scoring Formula

Each skill should maintain a `skill_score`:

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

Where:

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

Promotion gate:

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

For high-risk skills, such as those that can execute shell commands, modify code, deploy, or access external services, the bar should be raised:

```yaml
high_risk_skill_gate:
  min_eval_cases: 15
  requires_human_review: true
  requires_sandbox_run: true
  requires_rollback_plan: true
  max_destructive_action_without_confirmation: 0
```

---

## 12. Skill Release and Evolution: No Direct Production Rollout

### 12.1 State Machine

```text
draft
  -> candidate
  -> canary
  -> active
  -> deprecated
  -> archived
```

Meaning:

| State          | Meaning                                                  |
| -------------- | -------------------------------------------------------- |
| **draft**      | A draft generated by the Agent; cannot be invoked by default |
| **candidate**  | Eligible to enter the eval harness                       |
| **canary**     | Used in a limited scope, only for low-risk tasks or specific projects |
| **active**     | Retrievable by default                                   |
| **deprecated** | No longer used by default, but kept for compatibility with historical tasks |
| **archived**   | Disabled; retained only for audit and rollback           |

---

### 12.2 Versioning Rules

```text
0.1.0  Initial version of a new skill
0.1.1  Local patch
0.2.0  Clear change in procedure
1.0.0  Stable after sufficient evals and real invocations
2.0.0  Breaking change
```

Every modification must record a diff:

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

### 12.3 Post-use Reflection: Review After Every Invocation

After each skill use, record:

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

Standardize the reflection questions:

```text
1. Should this skill have been triggered?
2. Did it help complete the task?
3. Which instruction step was unclear?
4. Is there a new pitfall that should be written down?
5. Is there a repeated process that should be distilled into a script?
6. Does it need to be patched, merged, split, or deprecated?
```

---

### 12.4 Skill Bank Maintenance

As the number of skills grows, the system needs to support:

| Operation     | Trigger Condition                         | Result                         |
| ------------- | ----------------------------------------- | ------------------------------ |
| **CREATE**    | A new workflow passes evals               | Add a new skill                |
| **PATCH**     | A local defect in an old skill            | Minor version upgrade          |
| **MERGE**     | Two skills overlap heavily                | Merge them                     |
| **SPLIT**     | One skill is too large                    | Split it                       |
| **DEPRECATE** | Long unused or declining effectiveness    | No longer recalled by default  |
| **ARCHIVE**   | Dangerous, incorrect, or withdrawn by the user | Disable while retaining audit records |
| **BUNDLE**    | Multiple skills are often used together   | Form a task bundle             |

Mem0's memory system is a useful analogy for skill bank operations: after a candidate memory enters the system, it needs to be compared with existing memories before deciding whether to add, update, delete, or no-op. Translated to the skill scenario, this becomes create, patch, merge, split, deprecate, or noop. ([arXiv][11])

---

## 13. Skill Retrieval and Activation: Don’t Stuff Every Skill into the Prompt

Recommended flow:

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

activation score:

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

Load skills using progressive disclosure:

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

The best practices for Agent Skills also note that once a skill is activated, the full `SKILL.md` enters the context window, so every token competes for attention with the conversation history, system context, and other skills. ([Agent Skills][12])

---

## 14. Retrieval Path: How Memory and Skill Enter Context Together

A request should not simply do this:

```text
query -> vector top_k -> stuff into prompt
```

A better path is:

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

Context is assembled into a brief:

```markdown
## Context Brief

User preference:
- The user wants technical proposals to explain the principles first, then map them to engineering practice and project comparisons.
  source: mem_001, confidence: 0.91

Project context:
- The current project is lien/Agent, with the goal of designing long-term memory and self-optimization paradigms.
  source: mem_002, confidence: 0.92

Activated skill:
- agent-memory-self-upgrade-design v0.1.1
  reason: user asked to merge memory paradigm and self-upgrade skill details.

Relevant reflections:
- The previous answer covered the memory architecture sufficiently, but lacked detail on self-upgrade.
  source: tr_001, confidence: 0.86

Open uncertainty:
- “harmes agent” likely means Hermes Agent.
```

The agent should not receive a pile of scattered fragments, but an explainable task context.

---

## 15. Engineering Table Design

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

## 16. Memory Contract: What Can Be Remembered, and What Cannot

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

## 17. Optimization Contract: How an Agent Can Upgrade Itself

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

## 18. Cross-Project Comparison: What to Learn from Each

| Project / Direction      | Core Abstraction                                    | Most Valuable Takeaway for Your Paradigm                                                                  | Notes                                      |
| ------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Hermes Agent**         | SKILL.md, agent-created skills, progressive disclosure | Use skills as procedural memory; agents can create, modify, and delete skills; complex tasks and error recovery can be distilled into skills | Must add eval gates, version governance, and permission boundaries |
| **Agent Skills**         | Open skill folder format                            | Borrow portable `SKILL.md`, description-based triggering, scripts/references/assets, and skill eval practice | The standard does not solve security, release, or rollback for you |
| **Mem0**                 | General-purpose memory layer                        | Borrow memory extraction, updating, retrieval, and user preference memory                                  | It is more memory infrastructure than a complete self-upgrade runtime |
| **LangMem**              | Memory + prompt optimization primitives             | Borrow extracting information from interactions, optimizing prompts, and maintaining long-term memory       | Prompt optimization is not the same as a complete skill system |
| **Letta / MemGPT**       | Stateful agent runtime, virtual context             | Borrow OS-like memory management ideas and stateful agent design                                           | Adopting its runtime model would be relatively heavy |
| **Graphiti / Zep**       | Temporal context graph                              | Borrow temporal change, provenance, and entity relationship graphs                                         | Graph complexity is high; introduce it in V2/V3 |
| **Voyager**              | Executable skill library                            | Borrow the idea of crystallizing experience into executable skills and iterating with environmental feedback | Minecraft provides strong environmental feedback; a general-purpose agent needs a custom verifier |
| **Reflexion**            | Verbal reflection + episodic memory                 | Borrow generating reflections from failure feedback and using them to influence later behavior              | Reflections cannot accumulate indefinitely; they need merging and invalidation |
| **LongMemEval / LoCoMo** | Long-term memory evaluation                         | Borrow evaluation dimensions such as information extraction, multi-session reasoning, temporal reasoning, and knowledge updates | Add your own project-level evals |

LangMem explicitly provides tools for extracting important information from conversations, optimizing agent behavior through prompt refinement, and maintaining long-term memory. LongMemEval breaks long-term memory capability into information extraction, multi-session reasoning, temporal reasoning, knowledge updates, refusal, and other capabilities, making it a strong foundation for memory evals. ([LangChain][13])

LoCoMo is suitable for evaluating long-term multi-session conversational memory. Its data includes long conversations of up to 35 sessions and an average of 300 turns. LongMemEval-V2 is closer to the environmental experience of web agents, covering static state recall, dynamic state tracking, workflow knowledge, environment gotchas, and premise awareness. ([arXiv][14])

---

## 19. Recommended Implementation Roadmap

### V0: Session Memory

Only handle context for the current session.

```text
conversation buffer
short summary
thread state
```

Use cases:

```text
demo
low-risk assistant
single-turn or short-session tasks
```

---

### V1: Typed Long-term Memory

Goal: enable the Agent to remember user preferences, project facts, and historical decisions.

```text
Episode Log
Typed Memory Store
Vector Search
Memory Contract
User-visible Memory Panel
```

Required:

```text
source_event_ids
scope
confidence
valid_from / valid_to
sensitivity
delete / edit interface
```

---

### V2: Reflection + Skill Candidate

Goal: enable the Agent to propose candidate skills from failures and complex tasks, without automatically putting them into production.

```text
Trajectory Log
Outcome Labeling
Reflection Store
SkillOpportunityDetector
SkillDistiller
Draft SKILL.md
```

This stage can be semi-automated:

```text
Agent generates a skill draft
human review
manually add it to the skill bank
```

---

### V3: Eval-gated Skill Release

Goal: a skill must outperform the baseline before it can become active.

```text
Skill Eval Case
With-skill / Without-skill Eval
Activation Eval
Regression Eval
Safety Eval
Skill Release Table
Rollback
```

This is the real starting point for self-upgrade.

Without this stage, so-called “self-upgrade” is just hype.

---

### V4: Post-use Self-Patching

Goal: skills keep improving through real-world use.

```text
Skill Invocation Log
Post-use Reflection
Patch Candidate
Candidate Version
Eval Re-run
Canary Release
Auto Rollback
```

The Agent can patch a skill, but it cannot publish it directly.

---

### V5: Shared Skill Bank + Multi-agent Learning

Goal: multiple Agents and multiple projects share authorized experience.

```text
org-level skill
project-level skill
user-level skill
skill bundle
cross-scope policy
skill trust score
supply-chain scan
```

Key risks:

```text
cross-user contamination
cross-project leakage
malicious skill injection
overgeneralization
version drift
```

---

## 20. Final Pattern Convergence

You can summarize the core principles of this system in three sentences:

> **Every memory needs evidence.**
> Every memory must have a source.

> **Every skill needs evaluation.**
> Every skill must beat the baseline.

> **Every upgrade needs rollback.**
> Every upgrade must be reversible.

Compressed further into a slogan:

> **Facts go into memory, methods go into skills, changes go through evaluation, and failures can be rolled back.**

The final architecture is not:

```text
Agent + Vector DB
```

but:

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

This is the real self-optimization pattern for an Agent that can run over the long term.

The most important tradeoff is:

```text
Do not optimize for the Agent “learning a lot automatically.”
Optimize for the Agent “turning only verified experience into capability.”
```

In other words:

> **Long-term memory keeps the Agent from forgetting; skill learning keeps the Agent from repeating mistakes; eval-gated self-upgrade makes the Agent improve without losing control.**

---

GitHub: [02-agent-long-term-memory-self-upgrade.md](https://github.com/LienJack/learn-agent/blob/main/src/content/blog/en/AI/agent-design-paradigms/02-agent-long-term-memory-self-upgrade.md)

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
