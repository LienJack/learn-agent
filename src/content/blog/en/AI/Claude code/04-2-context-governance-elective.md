---
title: 'Context Governance for Coding Agents'
description: 'A broader industry view of context management and how Claude Code compares with other agent systems.'
author: LienJack
pubDate: 2026-05-03
heroImage: './assets/04-2-cover-context-governance.jpg'
locale: 'en'
tags:
  - Agent
  - Context-Engineering
  - Context-Management
  - Harness
  - Source Analysis
aliases:
  - Context governance for coding agents
  - Claude Code context governance
  - Agent context management
---
# Context Governance for Coding Agents

When people first hear the phrase "context management," they often reduce it to two ideas:

```text
Use a larger context window.
Compress history when the window is about to overflow.
```

That is not wrong, but it is far too narrow.

In ordinary chat systems, context management really is mostly about conversation history. But once a system becomes a coding agent, especially one that reads files, calls tools, runs commands, writes code, and interacts with external systems, context is no longer just a transcript. It becomes the whole working scene the model can see on every turn.

So the real question is this:

**During real engineering work, an agent keeps producing new information. How does the system decide what should enter the model, what should stay outside it, what should be compressed, and what must survive over time?**

This article uses Claude Code as one concrete case study, but it is not only about Claude Code.

Claude Code is a strong case study because it exposes the context problem in a very direct way: source files are long, tool outputs are long, test logs are long, and tasks regularly stretch across dozens of turns. But the same class of problem appears in many other agent systems too, including LangGraph, the OpenAI Agents SDK, AutoGen, Cursor, Devin, OpenClaw, and Hermes.

The difference is where each project places the weight:

- Claude Code is closer to a long-running CLI agent. Its pressure comes from tool output, project rules, compression, and recovery.
- LangGraph is closer to a workflow state machine. Its pressure comes from structured state, checkpoints, and resumable execution.
- OpenAI Agents SDK is closer to an application SDK. Its pressure comes from separating local runtime context from model-visible context.
- AutoGen is closer to a multi-agent conversation framework. Its pressure comes from role separation, memory injection, and collaborative context flow.
- Cursor and Copilot are closer to in-IDE real-time assistants. Their pressure comes from low latency, local code snippets, and retrieval precision.
- Hermes, OpenClaw, and enterprise harnesses lean more toward long-running runtime governance, entry-point control, and policy enforcement.

So context management is not one feature inside one product. It is a foundational engineering problem that almost every serious agent system eventually hits.

In this article, I use `context management` for the operational mechanics and `context governance` for the broader design problem around visibility, authority, recall, compression, and isolation.

The point here is to widen the lens and look at the broader governance model underneath the implementation details:

```text
The model is stateless.
The task is continuous.
Information explodes.
The context window is finite.
The outer system has to rebuild the working scene every turn.
```

To keep the discussion concrete, we will use one running example:

```text
The user says: post-login redirect is broken in this project. Find the cause and fix it.
```

A real agent would not stop at "maybe check the route guard." It would do something more like this:

```text
Inspect the project structure
-> Search for login-related code
-> Read the route guard
-> Read auth state management
-> Run tests
-> Analyze error logs
-> Modify code
-> Run tests again
-> Summarize the change and the remaining risks
```

Each step produces more information. Context governance exists to keep that information alive across a long task without drowning the model in it.

## 1. Why Context Management Becomes an Engineering Problem

Start with the most basic fact:

**Every model call is stateless by default.**

The model does not naturally remember which file it read on the previous turn, nor does it automatically know where the last test failed. An agent only appears continuous because the runtime outside the model reconstructs the current working scene on each round and sends it back in.

A simple chat turn looks roughly like this:

```text
user question
-> model answer
```

An agent turn looks much more like this:

```text
system rules
+ project rules
+ current user goal
+ message history
+ tool descriptions
+ recent tool results
+ current task state
+ compressed summaries
+ available external resources
-> model decides what to do next
```

At that point, context management is no longer answering "how do I save the chat history?" It is answering questions like these:

- What exactly should the model see on this turn?
- Which information should be visible on every turn?
- Which information should only be fetched on demand?
- Which tool results are already stale?
- Which content is too large and must be trimmed?
- Which parts of history can be summarized?
- How do you preserve continuity after compression?
- How do you isolate context across multiple agents?
- Which internal states must never be exposed to the model?

That is a systems-design problem, not a prompt-wording problem.

Without context governance, an agent quickly runs into several classic failures.

### 1. Token Explosion

Tool output keeps piling up and requests get longer and longer.

One `grep` can return dozens of matches. One test run can spill thousands of log lines. One source file can cost thousands of tokens. In long tasks, what fills the window is often not the user's words but the environmental noise coming back from tools.

Many teams get trapped here because they only count conversation turns and think, "We've only had 20 turns, so the window should still be fine." But each tool call has been dumping more material into the context the whole time.

### 2. Context Pollution

Old information is still present in context even though the real world has already changed.

For example, the agent first reads `auth.ts`, later edits it, but the old version still sits in history. On the next turn the model may reason carefully from information that is no longer true.

```text
It looks like deliberate analysis,
but the thing being analyzed is no longer the current code.
```

### 3. Constraint Loss

The user says early on, "Don't change the public API," and by turn ten the model has forgotten.

The project rules say migration files must not be hand-edited, but after compression that rule may not survive into the summary. The task keeps moving, every step still sounds reasonable, and the system has already crossed a boundary.

### 4. Compression Amnesia

Compression is not free.

A weak summary may record which files were read and which code was modified, while losing:

- the user's actual goal
- where the task is currently stuck
- which approaches have already failed
- which constraints must not be violated
- what should happen next

That leaves the model like someone who has read the meeting minutes but never sat in the room.

### 5. Multi-Agent Pollution

The problem becomes even sharper once sub-agents enter the picture.

A research agent may read a huge amount of material, while the execution agent only needs the final conclusion. If you dump all of the research agent's drafts and dead ends into the executor's context, the downstream agent does not become smarter. It becomes noisier.

In multi-agent systems, the danger is often not a lack of information. It is every agent carrying someone else's intermediate state forward.

## 2. Context Is Not Prompt, and It Is Not Memory Either

Before going deeper, it helps to separate a few terms that are easy to blur together.

| Concept | Plain meaning | The question it answers |
| --- | --- | --- |
| Prompt | Task wording | How should I ask the model? |
| Context | Current workbench | What does the model actually see on this turn? |
| Memory | Reusable knowledge | Which facts should survive across tasks? |
| Transcript | Raw archive | How do we audit and recover the full process? |
| State | Structured task state | What is the current machine state of the task? |
| Artifact | External output | Where do files, logs, diffs, and reports live? |

A practical analogy looks like this:

```text
Prompt is the assignment sheet.
Context is the material spread across your desk.
Memory is the filing cabinet.
Transcript is the audio/video recording.
State is the project kanban board.
Artifacts are the actual documents and code produced.
```

Many agents become unstable precisely because these layers get mixed together.

Treat the transcript as context, and every turn explodes in tokens.

Treat context as memory, and transient noise pollutes long-term recall.

Treat memory as prompt, and the model misreads "experience" as hard policy.

Store state only in natural-language history, and long tasks lose it the moment compaction happens.

So the first principle of context management is simple:

**Do not shove every kind of information into one linear chat history.**

A more reliable engineering pattern is to keep different information in different layers, then assemble only the small subset needed for this turn right before each model call.

## 3. Separate the Action Layer from the Architecture Layer

Many context-management discussions start by listing a set of actions:

```text
Offload: move large objects out of the prompt
Reduce: trim, extract, summarize
Retrieve: bring information back when needed
Isolate: split work into independent contexts
Cache: reuse stable context or computed results
```

These actions are useful, but they answer only one question:

```text
The context is too large. What operations can I apply?
```

Real engineering has to answer earlier questions first:

```text
Should the model even see this piece of information?
Which source outranks which?
Is this hot or cold information right now?
Should it appear as raw text, a summary, a citation, or structured state?
Where should it be recalled from?
How do I compress it without distorting the truth?
Inside which boundary should it apply?
```

That is where the broader seven-dimensional model becomes useful. It upgrades context management from "a list of cleanup operations" into an architectural model.

The action layer is like a toolbox. The architectural model is like a blueprint.

A toolbox tells you that you have a hammer, pliers, and a screwdriver. A blueprint tells you where you are allowed to hammer, which layer gets installed first, and how to trace accountability when the system goes wrong.

## 4. The Seven-Dimension Model: Turn Context into a Governable Working Set

If context management is treated as a real subsystem, it has to manage information across at least seven dimensions:

```text
Visibility:  what the model is allowed to see
Authority:   which source wins when conflicts arise
Temperature: whether the information is hot, warm, cold, frozen, or long-term
Shape:       what form the information takes
Retrieval:   where to recall information from when it is missing
Compression: how to shrink context without losing the truth
Boundary:    how to isolate across tasks, agents, tenants, and permissions
```

These are not parallel buzzwords. Together they form a practical engineering pipeline.

### 1. Visibility: Decide First Whether the Model Should See It

The first gate is not compression. It is visibility.

Context usually falls into three broad categories:

| Type | Examples | Handling |
| --- | --- | --- |
| `llm_visible` | user goals, project rules, key code snippets, filtered retrieval results | may enter model-visible context |
| `runtime_only` | API keys, permission objects, sessions, traces, internal dependencies, database handles | available to tools and runtime only |
| `artifact_ref` | large logs, large files, page snapshots, full diffs | keep the original outside the prompt and provide a reference plus preview |

One early mistake many agent systems make is confusing "the tool can access it" with "the model should also see it."

This is why the OpenAI Agents SDK's distinction between local context and LLM context matters so much. Tool functions may need the current user object, the logger, the dependency container, and permission state. The model usually does not.

One-line rule:

**If the model does not need to see it, do not show it to the model. If a reference is enough, do not paste the full original.**

### 2. Authority: Conflicts Need a Resolution Chain

Conflicts show up in context all the time.

The user says, "Edit the generated file directly," while the project rules say, "Do not modify generated files." Long-term memory says the user likes Redis, while the current task says not to introduce Redis. An old summary says tests passed, while the newest tool output says they failed.

If the system has no explicit resolution chain, it is effectively dumping the conflict onto the model and hoping it will improvise correctly.

A sensible default ordering might look like this:

```text
System / safety policy
> Tenant / organization policy
> Project rules
> Current user instruction
> Current task state
> Verified retrieval result
> Long-term memory
> Historical summary
> Raw old conversation
```

The point is not that every system must use this exact order. The point is:

**Authority has to be designed. It cannot be replaced by adding more "please follow these rules" text to the prompt.**

Claude Code's system rules, project rules, permission modes, and tool-safety checks are all forms of authority enforced at different layers. In enterprise agents, RBAC, approvals, and audit systems move authority even further out of the prompt and into the runtime.

### 3. Temperature: Information Needs Hot and Cold Layers

Context is not just "short-term" versus "long-term."

A more useful breakdown is:

| Layer | Meaning | Examples |
| --- | --- | --- |
| Hot | Must be used now; included by default | current user goal, latest failure log, file currently being edited |
| Warm | Probably relevant; often kept as summary or state | ruled-out causes, file summaries, active hypotheses |
| Cold | Recalled on demand | code index, documentation index, historical sessions |
| Frozen | Complete raw record; used for audit and recovery | transcripts, full logs, page snapshots |
| Long-term Memory | Stable facts across sessions | persistent user preferences, project conventions, long-lived rules |

This makes a context manager look more like a memory manager:

```text
Hot items cool into Warm after use.
Stable Warm items may move into long-term memory.
Cold items heat up again when retrieved.
Frozen records stay outside the prompt but preserve the truth.
```

This is also where weak summaries often break down. Many systems compress a hot live scene into a warm summary without preserving the recent tail, so the model loses its feel for the present on the very next turn.

### 4. Shape: The Same Information Can Take Different Forms

Not everything should be represented as natural-language prose.

The same test failure can exist in many shapes:

| Shape | Best used when |
| --- | --- |
| Raw | you need line-by-line inspection |
| Extract | you only need command, exit code, error type, and key stack frame |
| Summary | you are reviewing older history |
| Structured State | you are tracking task status, failed attempts, and next steps |
| Reference | the original is too large, so you keep only an artifact ID or path |
| Diff | the code change matters more than the full file |
| Graph | the task is really about relationships, dependencies, or DAG structure |

For example, a failing test log does not always need to enter the model as a raw blob. It can first be reshaped like this:

```yaml
command: pnpm test auth
status: failed
error: TypeError user.id should be string
file: src/auth/session.ts
test: redirects after login
artifact: logs/test-auth-2026-05-03.txt
next_step: inspect mock user construction
```

That is the value of shape:

**The same information, represented differently, changes token cost, retrievability, and reliability.**

LangGraph's `State`, Claude Code's compact summary, the OpenAI Agents SDK's tool context, and execution context in enterprise systems can all be understood through this lens.

### 5. Retrieval: Recall Is Not Just Vector Search

Many people hear "retrieval" and immediately think of vector databases. But agents need far more than one retrieval path.

A mature system typically has multiple recall routes:

| Retrieval path | Best suited for |
| --- | --- |
| Recent Tail | recent conversation, current tool results, current state |
| Rule Loading | `AGENTS.md`, `CLAUDE.md`, project rules |
| Keyword Search | function names, error codes, field names, config keys |
| Vector / Hybrid Search | document semantics, similar experiences, complex knowledge |
| Tool Search | progressive loading of tools, skills, and plugins |
| Artifact Lookup | large logs, large files, web outputs |
| Memory Search | user preferences, long-term facts, project conventions |
| Graph Traversal | module dependencies, task DAGs, database relationships |

In code-heavy tasks, symbols, keywords, and paths are often more important than pure semantic retrieval.

In enterprise knowledge systems, hybrid search, permission filtering, and source credibility matter more.

In multi-agent systems, artifact lookup and structured handoff matter more.

So the key retrieval question is not "do you have RAG?" It is this:

**When this kind of task is missing information, what is the most reliable way to recover it?**

### 6. Compression: Shrink the Working Set, Not the Truth

Compression is not just LLM summarization either.

It can be broken into several categories:

| Compression method | Meaning | Main risk |
| --- | --- | --- |
| Truncate | cut directly | easiest way to lose critical constraints |
| Extract | pull out key fields | incomplete extraction rules can leak important information |
| Summarize | model-generated summary | prone to summary drift |
| Distill | condense into structured state | requires schema design |
| Archive + Ref | keep the original externally and retain only a reference | later recovery must be possible |
| Rehydrate | expand back to the original when needed | requires traceable provenance |

A more reliable order often looks like this:

```text
First offload large objects
-> extract key fields
-> distill them into structured state
-> summarize old history
-> truncate only when absolutely necessary
```

The biggest danger is summary drift: the summary quietly rewrites user constraints, failure causes, or unresolved issues.

So a compression result should preserve:

- source scope
- critical constraints
- failed attempts
- unresolved issues
- artifact references
- next steps

That is why Claude Code-style compaction works best when the summary behaves like a handoff document, not a book report.

### 7. Boundary: Isolation Is the Main Thread's Self-Preservation Mechanism

Boundary is the most underrated dimension.

The value of sub-agents is not just parallelism. It is context isolation.

These kinds of tasks especially benefit from isolation:

- large-scale search and research
- long log analysis and debugging
- codebase scanning and web scraping
- data cleaning and independent implementation work
- high-privilege tool calls
- multi-tenant data access

Boundaries can exist at many layers:

| Boundary | Purpose |
| --- | --- |
| Thread | isolate context across sessions |
| Task | isolate state across separate tasks |
| Subagent | isolate local context for a sub-task |
| Tool | isolate permissions plus input/output flow |
| Artifact | externalize large objects so they do not pollute messages |
| Permission | require approval for high-risk actions |
| Tenant | isolate across organizations, users, and data domains |
| Sandbox | isolate execution environments |

A well-scoped sub-agent should look like this:

```text
Narrow input: task + constraints + artifact references
Narrow output: conclusion + evidence + suggested next step + confidence
```

The main thread should never receive a full replay of a sub-thread's raw process.

Without boundary discipline, multi-agent systems easily degrade from "collaboration" into "mutual contamination."

## 5. How Context Grows While an Agent Executes a Task

Go back to the login redirect example.

At the start, the user only provides one sentence:

```text
Post-login redirect is broken in this project. Help me find the cause and fix it.
```

If the agent genuinely tries to solve that problem, it will generate context like this:

| Step | New information produced |
| --- | --- |
| Inspect directory | project structure, framework type, entry files |
| Read `package.json` | test commands, dependencies, scripts |
| Search for `login` | matching files, relevant functions, route paths |
| Read route guard | auth logic, redirect handling |
| Read state management | token, user, session storage strategy |
| Run tests | failure logs, stack traces, test names |
| Modify code | diff, changed files, implementation hypotheses |
| Run tests again | new results, new errors, or proof of success |

Some of that information is hot. Some cools off quickly.

The current failure log is hot because the next step depends on it.

Old search results are warm because they might still be useful, but they do not need to remain verbatim forever.

The first file read can become cold, or even toxic, once that file has been edited.

The full transcript still matters, but as a cold archive, not as something to paste into every turn.

So the context manager's job is not "save everything." It is to keep asking:

```text
At this exact step, which pieces of information matter most for the model to see?
```

That is the core of context governance.

## 6. Engineering Problems You Will Actually Hit, and How to Solve Them

Now let's break the engineering side down as symptom -> root cause -> response.

### Problem 1: The Model Doesn't Know the Workspace

Symptom: the agent starts guessing.

It changes routing logic without reading the routing code. It claims the token was probably never stored without checking the tests. It reorganizes directories according to its own habits without seeing the project rules.

The problem is not that the model cannot reason. The problem is that the current context does not contain enough on-the-ground information.

The response is dynamic context injection:

- load project rules and workspace information early
- read task-relevant files on demand
- treat search results as candidates first instead of dumping everything in
- write tool results back into messages or structured state
- retrieve external knowledge through search, web, MCP, or database tools only when needed

The key phrase is "on demand."

More context is not automatically better. A stable agent is not the one that has seen the most material. It is the one that sees the most relevant material on each turn.

### Problem 2: Tool Results Are Too Large

Symptom: token usage rises fast, the model gets slower, and eventually the context limit hits.

The root cause is usually not too much user conversation. It is bloated tool output.

The response is to govern tool results before governing chat history:

- set result budgets for each tool category
- keep only summaries, key stack frames, exit codes, and affected files from long logs
- return snippets, line ranges, symbol indexes, or references instead of entire large files
- return search overviews first, and let the model drill into specific files later
- snip or micro-compact stale tool output

Claude Code is especially instructive here. In coding agents, context windows often explode because `Bash`, `Read`, and `Grep` bring back too much real-world material, not because the model reasoned too much.

### Problem 3: Stale Information Pollutes New Decisions

Symptom: the agent keeps reasoning from old code or re-investigates paths that have already been ruled out.

The root cause is a missing notion of freshness.

The response is to give context a lifecycle:

- file reads should carry version, hash, mtime, or read timestamp
- once a file changes, old reads should be down-weighted or marked stale
- test logs should be associated with the command, commit, and time they came from
- search results should be treated as clues, not truth
- key facts should cite sources whenever possible instead of living only in prose summaries

That is why a context manager should ideally handle information as metadata-rich objects, not just a bag of strings.

### Problem 4: Rules Conflict with Each Other

Symptom: system rules, project rules, the current user instruction, and long-term memory collide.

For example:

```text
The system says secrets must never leak.
Project rules say generated files must not be edited.
The current user request says to edit a generated file directly.
Long-term memory says the user prefers speed over ceremony.
```

If all of that is merely dumped into natural-language context, the model may resolve the conflict inconsistently or for the wrong reason.

The response is an explicit authority hierarchy:

```text
System / security policy
-> organization-level rules
-> project-level rules
-> current user instruction
-> long-term preferences
-> retrieval and tool results
```

In practice, rules often split into:

- hard constraints: the system must intercept or require approval
- soft constraints: inject into context for the model's guidance
- situational constraints: inject only when a path, tool, or task matches

This is also why an extremely long `AGENTS.md` or `CLAUDE.md` is not automatically better. Rules that are too long, too broad, and too conflicting eventually become context noise.

### Problem 5: The Task Loses the Thread After Compression

Symptom: after compaction, the model knows roughly what happened but not what it should do next.

The root cause is that the summary records history but not state.

A good compressed summary is not an essay abstract. It is a task handoff.

At minimum, it should preserve:

```text
the user's goal
inviolable constraints
the current phase
important files already read
files already modified
key judgments and evidence
failed attempts
latest test or verification results
recommended next step
```

And ideally it should also preserve the most recent few raw turns plus key tool outputs.

In other words:

```text
The summary preserves the main thread.
The recent tail preserves the live feel of the scene.
```

That is much more stable than flattening all old history into one paragraph.

### Problem 6: Multiple Agents Contaminate Each Other

Symptom: one sub-agent's draft, assumptions, or dead ends distort another sub-agent's work.

The root cause is a shared linear chat history.

The response is context isolation:

- a sub-agent receives a local task, not the full global history
- a sub-agent returns a structured result, not a complete thought dump
- upstream passes forward verifiable artifacts, references, and conclusions
- shared state is managed with schemas, not casual paraphrase
- each agent gets its own tool permissions and context budget

In complex work, isolation often matters more than collaboration.

Without isolation, multi-agent work quickly turns into multiple agents polluting the same working surface.

### Problem 7: Cost and Latency Spiral Out of Control

Symptom: the agent can work, but every step becomes slow, expensive, and verbose.

The root cause is that each turn carries too much fixed content, or keeps re-searching, re-reading, and re-explaining from scratch.

Useful responses include:

- prompt caching for stable system prompts and tool descriptions
- lazy loading for detailed tool docs, rule files, and long documents
- progressive disclosure: summary or index first, full content only when needed
- local context for runtime dependencies and internal state that the model does not need
- structured state for machine-processable information that should not become natural-language tokens

The key insight is this:

**Large context windows solve the capacity problem. They do not solve the information-discipline problem.**

No matter how large the window gets, if you stuff every turn with irrelevant material, the model will still be slow, expensive, and prone to drift.

## 7. How Different Projects Handle Context

Now put several representative systems on the same canvas.

The point is not to decide which one is "more advanced." The point is to see how radically the pressure on context management changes across different host environments.

### 1. Claude Code: Context Defense Lines for a Long-Task CLI Agent

Claude Code's typical environment is:

```text
Inside a real repository, continuously reading files, editing code, running commands, and fixing bugs.
```

Its most visible context pressures are tool results and long-task history.

So its context priorities are:

- inject project context through `CLAUDE.md`, rule files, and path scoping
- keep large files, logs, and search results from flooding the message stream
- compact history into summaries near context limits so the task can continue
- preserve transcript, resume state, and recent tail for continuity
- isolate search, analysis, and implementation into sub-agents when needed

The big lesson from Claude Code is:

**For a coding agent, context management is not primarily about long-term memory. It is about keeping the tool loop alive.**

### 2. LangGraph: Move Context Out of Chat History and into Structured State

LangGraph looks at the problem from a different angle.

It does not primarily treat an agent as a running conversation. It treats it as a graph:

```text
node executes
-> state updates
-> checkpoint
-> next node continues
```

Its context priorities are:

- state schema
- checkpoints
- thread-level state history
- time travel for debugging and branching
- fault tolerance and recovery from the last valid checkpoint

The lesson here is:

**Do not force chat history to carry all of the task state.**

If a task has explicit steps, nodes, and intermediate state, a state graph can be much more reliable than keeping everything in natural-language dialogue.

Claude Code starts by governing messages and tool results. LangGraph starts by governing state and execution boundaries.

### 3. OpenAI Agents SDK: Separate Local Context from LLM Context

One of the most important distinctions in the OpenAI Agents SDK is this:

```text
Local context: context visible to your code and tools at runtime.
LLM context: context visible to the model during generation.
```

That is an extremely engineering-oriented distinction.

Many developers think of "context" as simply "whatever gets sent to the model." But in real applications, some information is necessary for tools while remaining unnecessary, or inappropriate, for the model itself.

Examples include:

- database connections
- loggers
- current user objects
- permission state
- internal dependencies
- tool-call metadata
- usage statistics

These belong in runtime-local structures, not necessarily in model-visible context.

The lesson is:

**The first step of context management is distinguishing what the runtime needs from what the model needs.**

That separation prevents both accidental leakage and wasted tokens.

### 4. AutoGen: Model Context and Memory Injection in Multi-Agent Systems

AutoGen's typical environment is multi-agent conversation and collaboration.

Its pressure is not just whether one model forgets. It is how multiple agents share information, separate roles, and control message history.

Its main context concerns include:

- which messages each agent sees when calling the model
- how memory gets queried and injected
- how roles partition visible information
- how team orchestration controls message flow and termination
- when to keep full history versus only a window or head-and-tail view

The lesson from AutoGen is:

**In multi-agent systems, context management is first and foremost boundary management.**

A reviewer should not inherit every tool permission from the executor.

A researcher should not dump every search draft into the writer's context.

A planner's intermediate assumptions should not automatically become global facts.

### 5. Cursor / Copilot: IDE Assistants Prioritize Local Relevance and Low Latency

IDE assistants live in a very different environment.

They often need to autocomplete, explain, or rewrite code while the user is typing. The core pressure is not long-task recovery. It is:

```text
Find the most useful code context near the cursor as quickly as possible.
```

So their context priorities skew toward:

- snippets around the cursor
- symbols in the current file
- imports and type information
- similar code blocks
- recently edited files
- semantic or incremental indexing

They do not always need full-project comprehension.

The lesson is:

**Context management should serve the scenario, not chase completeness by default.**

### 6. Hermes / OpenClaw / Enterprise Harnesses: Long-Running Runtime and Governance Context

One level up, context management expands from task execution into runtime governance.

OpenClaw is closer to an agent control plane and entry point. It cares about how messaging channels, automation tasks, device nodes, browsers, and local capabilities connect into one session system.

Hermes is closer to a self-improving runtime. It cares about long-term memory, user profiles, skill accumulation, cross-session recall, and reusable experience.

Enterprise harnesses care about pipeline context, secrets, connectors, RBAC, approvals, and audit, where the agent has to operate inside existing process controls rather than outside them.

What these systems share is:

**Context is no longer just model input. It becomes part of the whole runtime environment.**

At this level, context governance also has to answer:

- who triggered the task
- which channel it came from
- whose machine or sandbox is executing it
- which secrets are available
- which approvals have already passed
- which past experience is reusable
- which operations must be auditable

That is why the end state of context management is not simply "better prompting." It becomes part of the agent harness itself.

## 8. Put Them Side by Side

We can place these systems onto a shared comparison grid:

| Project / System | Primary scenario | Core of context management | Main problem solved | Easily overlooked edge |
| --- | --- | --- | --- | --- |
| Claude Code | CLI coding agent | project rules, tool results, compression, recovery | keep long tasks coherent without tool output blowing up the window | compressed summaries can still lose local in-situ detail |
| LangGraph | graph-based workflow agent | state, checkpoints, threads, time travel | recoverable state and debuggable workflow nodes | model input still needs separate governance |
| OpenAI Agents SDK | application-style agent SDK | separation of local context and LLM context | layered handling of runtime dependencies and model-visible information | developers still have to design injection policy |
| AutoGen | multi-agent collaboration | model context, memory, role boundaries | multi-role message flow and memory augmentation | too much shared history causes contamination |
| Cursor / Copilot | IDE real-time assistant | cursor-local context, similar code, indexing | low-latency local relevance | not ideal for carrying long-task state by default |
| Hermes / OpenClaw | personal long-running runtime | gateway, memory, skills, session search | multi-entry operation and long-term experience reuse | long-term memory must resist staleness and contamination |
| Enterprise harnesses | workflow and governance agent | pipeline context, secrets, RBAC, audit | place agents inside governable enterprise processes | process boundaries constrain flexibility |

The main point of the table is this:

**These projects are not just giving different answers to the same exam question. They are handling different context pressures in different environments.**

Claude Code struggles most with long tasks and tool output.

LangGraph struggles most with recoverable state.

OpenAI Agents SDK struggles most with the boundary between runtime state and model-visible state.

AutoGen struggles most with multi-agent coordination.

Cursor and Copilot struggle most with low-latency code relevance.

Hermes and OpenClaw struggle most with long-lived runtime continuity.

Enterprise harnesses struggle most with permissions, audit, and process embedding.

## 9. Building a Minimal Context Manager Yourself

If you are implementing a small agent from scratch, do not start with a giant vector database or a complex multi-layer memory design.

A more stable path is to split the context manager into explicit components:

| Component | Responsibility |
| --- | --- |
| Visibility Filter | decide what may enter model context and what must remain runtime-only |
| Authority Resolver | resolve conflicts and priority |
| Temperature Manager | manage hot / warm / cold / frozen / long-term layers |
| Retrieval Router | choose whether to recall from rules, keywords, vectors, tools, artifacts, memory, or graphs |
| Compression Engine | handle offloading, extraction, summarization, structuring, and rehydration |
| Boundary Controller | manage thread, task, subagent, tenant, permission, and sandbox boundaries |
| Context Budgeter | manage token budget, selection reasoning, and the resulting context plan |

Once split that way, a context manager is no longer "the code that assembles a prompt." It becomes a debuggable working-set planner.

An MVP loop can be quite simple:

```text
1. Preserve all messages and tool results in the transcript.
2. Before each model request, collect candidate context from transcript, state, memory, and tools.
3. Tag each candidate with source, kind, temperature, authority, token estimate, and visibility.
4. Select the most relevant subset for the current task.
5. Trim or summarize large tool outputs.
6. Keep the most recent N raw turns.
7. Compress older history into a task handoff summary.
8. Force the summary to retain: goal, constraints, completed work, failed work, and next step.
9. Keep the pre-compression original in the transcript for recovery and audit.
```

A minimal data structure might look like this:

```ts
type ContextItem = {
  id: string
  kind: "instruction" | "user_goal" | "tool_result" | "file" | "summary" | "memory" | "state"
  source: string
  visibility: "llm_visible" | "runtime_only" | "artifact_ref"
  authority: "system" | "org" | "project" | "user" | "task_state" | "retrieval" | "memory" | "summary"
  temperature: "hot" | "warm" | "cold" | "frozen" | "long_term"
  shape: "raw" | "extract" | "summary" | "reference" | "diff" | "structured" | "graph"
  boundary: "thread" | "task" | "subagent" | "tool" | "tenant" | "sandbox"
  tokenEstimate: number
  freshnessTs?: string
  conflictKey?: string
  confidence?: number
  ttl?: string
  content?: string
  ref?: string
}
```

And each turn can produce a `ContextPlan`:

```ts
type ContextPlan = {
  selected: ContextItem[]
  compressed: Array<{ from: string; to: string; method: "extract" | "summarize" | "distill" | "archive_ref" }>
  dropped: Array<{ id: string; reason: string }>
  conflicts: Array<{ key: string; winner: string; losers: string[]; reason: string }>
  budget: {
    total: number
    used: number
    buckets: Record<string, number>
  }
}
```

The value of `ContextPlan` is explainability.

When the agent makes a mistake, you can ask:

```text
What context was actually selected this turn?
Which rules were dropped?
Which tool result was compressed?
Why was long-term memory injected?
Why did a user constraint fail to make it into the prompt?
```

Without a plan like that, context behavior stays a black box.

One useful mental model for the per-turn build process is:

```text
collect candidates
-> remove runtime-only items
-> resolve authority conflicts
-> drop stale tool results
-> prefer hot context
-> compress large items
-> preserve recent tail
-> inject final context
```

In pseudocode:

```ts
function buildContext(task, state, transcript, memory, budget) {
  const candidates = collect(task, state, transcript, memory)
  const visible = applyVisibilityFilter(candidates)
  const resolved = resolveAuthorityConflicts(visible)
  const fresh = updateTemperatureAndFreshness(resolved, state)
  const retrieved = routeRetrievalIfNeeded(fresh, task)
  const shaped = transformShape(retrieved)
  const compressed = compressToBudget(shaped, budget)
  const selected = enforceBoundaries(compressed, task)

  return [
    stableInstructions(selected),
    projectRules(selected),
    taskSummary(selected),
    recentTail(transcript),
    toolResults(selected),
    currentUserInput(task),
  ]
}
```

The key point is not the exact code. It is the mindset:

**Context should be built deliberately. It should not just grow by accident.**

You also should not budget only by total token count. Bucketed budgeting is usually more stable:

| Budget bucket | Suggested share |
| --- | --- |
| System / policy / project rules | 10%-20% |
| Current user input + task state | 10%-20% |
| Recent tail | 15%-25% |
| Retrieved context | 20%-35% |
| Tool results / artifact preview | 10%-20% |
| Long-term memory | 5%-10% |

When you exceed budget, do not immediately chop the recent tail first.

A safer order is often:

```text
drop low-confidence retrieval first
-> drop expired memory
-> convert oversized tool results into artifact references
-> compress older history
-> shrink the recent tail only at the end
```

The recent tail often carries the system's sense of "where we are right now." Cut it too early and the model loses proximity to the live scene.

## 10. How to Write a Good Compression Summary

Many systems have unstable compaction because they aim the summary at the wrong target.

They write a recap of the past instead of a handoff for the next turn.

For agents, a better compact template looks like this:

```md
User Goal:
[What the user originally wanted]

Hard Constraints:
[Rules that must not be violated, explicit user requirements, permission boundaries]

Current State:
[Where the task is actually stuck right now, not a vague recap]

Key Facts:
[Facts confirmed from files, logs, or tool results, ideally with sources]

Files Read:
[Path + key takeaways + whether the content may now be stale]

Files Modified:
[Path + what changed + why]

Approaches Tried But Failed:
[So the next turn does not repeat the same mistakes]

Latest Verification Results:
[Command, result, failure message, or proof of success]

Next Step:
[What should happen first after decompression]
```

The point of this template is resumability.

History alone is not enough. The agent must know where to pick the task up again.

## 11. What Questions Should Drive Your Architecture Choice?

If you are designing your own agent system, do not start with "which framework is strongest?"

Start with questions like these:

```text
Is my agent for low-latency completion or long-running task execution?
Can the task state be structured?
Will tool results be very large?
Do I need cross-session memory?
Is there multi-agent collaboration?
Do I need enterprise permissions and audit?
Should the model be allowed to see internal runtime state?
Do failures need to be recoverable?
What is the one thing I can least afford to lose after compression?
```

Different answers lead to different design priorities:

- IDE completion systems should prioritize local code context and low-latency indexing.
- Workflow systems should prioritize state, checkpoints, and resumable execution.
- Application SDKs should prioritize separating local context from model-visible context.
- Coding CLI agents should prioritize tool-result governance, compaction, and recent-tail continuity.
- Multi-agent systems should prioritize boundaries, roles, handoffs, and structured artifacts.
- Long-lived personal assistants should prioritize layered memory, skill accumulation, and expiration policy.
- Enterprise systems should build permissions, approvals, secrets, and audit directly into the context architecture.

This gets much closer to engineering reality than comparing models in the abstract.

## 12. One-Sentence Summary

If you compress this whole chapter into one sentence, it becomes:

**Context management is not about stuffing more content into the model. It is about continuously deciding, within a finite window, what the model should see, in what form, at what time, how to compress it when space runs out, and how to recover when the task is interrupted.**

Compressed even further, it becomes six verbs:

```text
Select
Inject
Recall
Compress
Isolate
Recover
```

Claude Code, LangGraph, OpenAI Agents SDK, AutoGen, Cursor, Hermes, and OpenClaw all look very different on the surface. But underneath, they are all answering the same question:

```text
When the model has no real memory,
and the task still has to move forward continuously,
how does the outer system manage the world the model gets to see on this turn?
```

That is the real value of context management.

It is not a side feature of an agent. It is one of the core capabilities of the agent harness.
