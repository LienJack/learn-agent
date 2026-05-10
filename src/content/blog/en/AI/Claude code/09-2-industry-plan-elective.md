---
title: 'Claude Code Source Analysis Series, Chapter 15: Planning Patterns Across Agent Systems (Optional)'
description: 'How planning in modern agent systems evolves from prompt advice into an execution control plane.'
author: LienJack
pubDate: 2026-05-03
heroImage: './assets/09-2-cover-plan-control-plane.jpg'
locale: 'en'
tags:
  - Claude-Code
  - Codex
  - Gemini
  - Agent
  - Plan Mode
  - Source Analysis
aliases:
  - Industry plan design
  - Agent planning architecture
  - Plan Mode comparison
---

# Claude Code Source Analysis Series, Chapter 15: Planning Patterns Across Agent Systems (Optional)

Claude Code's own Plan Mode already gives us one concrete design: `EnterPlanModeTool` moves the session into a read-only phase, `ExitPlanModeTool` submits the plan and restores permissions, the Plan subagent isolates repository research, and verification hooks turn the approved plan into a post-execution check.

Now switch perspective:

> Outside Claude Code, how do other agent systems design planning?

This topic is easy to flatten into a vendor checklist:

- Claude Code has Plan Mode, a Plan subagent, and permission modes.
- Codex has `/plan`, Chat and Agent modes, `AGENTS.md`, subagents, approvals, and sandboxing.
- Gemini Deep Research has collaborative planning, where the system can return a research plan first, let the user revise it, and only then execute.
- Gemini ADK has Sequential, Parallel, Loop, and Graph workflows for deterministic orchestration.
- OpenAI Agents SDK has `Agent.as_tool()`, handoffs, and code-driven orchestration.

But if all you remember are those names, the design still feels blurry.

Because the real problem Plan solves is not:

```text
Can the model write a plan?
```

It is:

```text
Before the agent starts acting, how does the system define scope,
collect evidence, surface risk, get approval,
and then constrain execution to that approved plan?
```

The core claim of this chapter is:

> In modern agent systems, Plan is becoming less like "think first" prompt wording and more like an execution control plane.

To keep things concrete, keep using one running example:

```text
User request: add pagination to a REST API.
```

At first glance, that sounds small. In a real project, it may touch routes, the ORM layer, response formats, parameter validation, frontend callers, tests, compatibility strategy, and performance limits.

If the agent jumps straight into code, it can lock onto one implementation too early.

That is where Plan earns its value: it surfaces uncertainty before the code changes begin.

## 1. Start with the Problem Chain

Plan modules did not appear because models were bad at listing steps.

In fact, models are often too good at writing generic plans. Ask for one and you will almost always get something like:

```text
1. Analyze the requirements
2. Modify the API
3. Add tests
4. Run validation
```

That plan is not wrong. It is just not very useful.

It does not answer the dangerous questions:

```text
Should pagination use offset or cursor?
Does the project already have a pagination convention?
Is the response shape allowed to change?
Will old clients break?
Which queries need indexes?
Which tests prove compatibility was preserved?
```

So the evolution chain behind Plan looks more like this:

```text
Single-turn chat can answer a question directly
-> agents gain the ability to read files, edit code, and run commands
-> early execution introduces real side effects
-> a read-only research phase becomes necessary before execution
-> read-only research produces a lot of context noise
-> the system needs isolated research context or an explicit plan object
-> the draft plan may still diverge from user expectations
-> an approval gate and editable plan become necessary
-> execution may drift from the approved plan
-> the system needs verification, recovery, and rollback references
```

That chain shows that Plan is never really a standalone feature. It naturally pulls in five other pieces:

```text
Read-only tools
Context management
Plan objects
Human approval
Execution verification
```

So the biggest difference across systems is not whether they "have planning."

It is this:

**At which layer of the system do they place those five responsibilities?**

Some systems keep them mostly in prompts. Some move them into runtime permissions. Some expose them as protocol or API state. That choice says a great deal about the system's engineering maturity.

## 2. The Shared Structure: Plan Usually Sits Between Goal and Execution

Whether you are looking at Claude Code, Codex, or Gemini, the planning layer usually plays roughly the same role:

```text
User goal
-> planning layer
   -> scope definition
   -> read-only research
   -> option comparison
   -> risk declaration
   -> plan output
-> approval gate
-> execution layer
-> validation layer
```

As a minimal state machine, it looks like this:

```text
Scope -> Research -> DraftPlan -> Review -> Execute -> Validate
```

`Review` is the step people underestimate most easily.

Many demos quietly compress the flow into:

```text
Goal -> Plan -> Execute
```

Real engineering usually needs:

```text
Goal -> Plan -> human or policy approval -> Execute
```

Why? Because planning is where tradeoffs surface:

```text
Should old parameters remain supported?
Are response fields allowed to change?
Should the query layer be refactored at the same time?
Should frontend callers be updated now or later?
How much test coverage is enough?
```

These are not intelligence problems. They are product and engineering boundary problems.

A good planning system makes those tradeoffs explicit instead of letting the model silently decide them on the user's behalf.

## 3. Claude Code: Planning as Read-Only Research Plus Permission Boundaries

We already unpacked Claude Code's Plan Mode in detail. In a broader industry comparison, its most distinctive move is this:

> Claude Code puts planning into the runtime permission layer and the subagent research layer.

It does not rely on a prompt that merely says, "please plan first."

Instead, it turns Plan Mode into a permission state. Once the session enters Plan Mode, file writes, edits, and dangerous commands are restricted. If repository understanding is needed, the system can delegate research to the built-in Plan subagent.

That design is especially well suited to coding agents.

Because in code work, the biggest risk is not that the model cannot think. It is that it starts modifying the project before it has understood the project.

In the pagination example, Claude Code's ideal flow looks like this:

```text
User: add pagination to the REST API
-> enter Plan Mode
-> Plan subagent performs read-only search across existing endpoints,
   response formats, ORM usage, and test structure
-> the main thread synthesizes the findings
-> the system proposes offset vs cursor choices and a compatibility strategy
-> the user approves
-> writable permissions are restored
-> execution and verification begin
```

The Plan subagent is valuable for more than parallel search.

Its deeper benefit is context hygiene. Search paths, irrelevant files, and elimination steps do not all flood the main thread. The main thread receives research conclusions rather than raw exploration noise.

So Claude Code's planning philosophy can be summarized like this:

```text
Put the agent in a read-only room first.
Make it understand the project.
Only then let it act.
```

The tradeoff is also clear. Publicly visible material does not suggest a fixed plan schema or a central planner AST.

In other words, Claude Code treats planning primarily as a runtime phase, not as a structured planning protocol.

## 4. Codex: Planning as an Interactive Control Plane and Engineering Workflow

Codex takes a noticeably different approach.

If Claude Code emphasizes read-only research plus permission modes, Codex feels more like planning is assembled out of:

```text
Interaction mode
+ project instructions
+ task tracking
+ subagent orchestration
+ approval and sandbox boundaries
```

Codex CLI exposes `/plan`: switch into plan mode, have Codex propose an execution plan, then move into implementation.

Codex also reads the `AGENTS.md` instruction chain before work starts, combining global rules, project rules, and current-directory rules.

That difference matters.

For the same pagination task, a bare model sees:

```text
Add pagination.
```

Codex during planning may see something closer to:

```text
User goal: add pagination to the REST API
AGENTS.md: all API changes must remain backward compatible
AGENTS.md: Zod is the standard validation layer
AGENTS.md: changes must be followed by npm test and typecheck
Local directory rule: the users service may not access the database directly
```

At that point, the plan is no longer a temporary list the model invented on the spot. It becomes an execution blueprint synthesized from the user's goal and the project's own rules.

A second important trait is how tightly Codex ties planning to collaboration.

The official subagent docs show that Codex can spin up multiple specialized agents in parallel and then merge the results into one response. But they also emphasize that Codex only spawns subagents when the user explicitly asks for them.

So Codex's multi-agent model is not uncontrolled growth. It is centrally governed fan-out and fan-in.

Inside a planning workflow, that means:

```text
User goal
-> /plan sets the high-level direction
-> explorer, reviewer, or worker agents are dispatched explicitly when needed
-> child results flow back into the main thread
-> the main thread updates the plan
-> execution begins only after approval
```

The third major trait is that approval and sandboxing remain close to the front of the workflow.

Planning does not end when the draft is written. Execution is still constrained by the environment:

```text
Approval policy decides which actions require user confirmation
Sandbox decides which directories can be read or written and whether networking is allowed
Subagents inherit the parent's execution boundaries
Non-interactive runs should fail and return an error if a high-risk action cannot be approved
```

So Codex feels less like "plan first" and more like an engineering control plane:

```text
Plan first
-> constrain the work with project rules
-> decide whether to delegate
-> pass through approvals and sandboxing
-> execute and synthesize results
```

Its strength is engineering rigor. It fits long-running tasks, PR changes, code review flows, and projects with strong team conventions.

Its limitation is also visible. Public materials expose the control surface clearly, but they do not tell us what internal symbolic planner, tree search, or reproducible planning algorithm might exist under the hood, if any.

In one sentence:

> Codex planning is not "finish thinking, then act." It is "assemble the goal, rules, permissions, division of labor, and validation path before acting."

## 5. OpenAI Agents SDK: Planning Can Belong to the Model or to Code

Codex leans toward product and workflow ergonomics. OpenAI Agents SDK makes another question much more explicit:

> Should an agent's flow be decided by the model, or by code?

The SDK's orchestration guidance effectively splits the world into two patterns:

```text
LLM orchestration: the model plans, uses tools, and hands work to specialists
Code orchestration: code controls sequence, parallelism, looping, and termination
```

That matters for planning.

People often hear "plan" and assume it simply means "let the model reason longer." But production systems usually cannot leave the whole process to model judgment.

For the pagination example, the model can help reason about implementation choices. But the following controls are often better held by code or by the runtime:

```text
Read before write
Run the existing tests first
Wait for user approval before execution
Do not modify schema and frontend in the same pass
Return to plan review on failure
```

Two classic SDK patterns also map cleanly onto two ways of executing a plan:

```text
Agents as tools:
  A manager keeps control and calls specialists as tools.

Handoffs:
  A triage agent transfers control to a specialist,
  and that specialist owns the next phase.
```

The first model fits local subtasks inside a larger plan, such as "have a security reviewer inspect the new pagination parameters for injection risk."

The second fits true role transitions, such as "move from a requirements-clarification agent to an implementation agent."

So the SDK layer gives us a useful lesson:

```text
Not every part of a plan has to live in natural language.
Use code to lock down what is deterministic.
Use the model for what requires judgment.
Put human approval gates in front of high-risk actions.
```

That is why so many agent systems evolve from one big prompt into something closer to "LLM + workflow graph + guardrails."

The prompt did not suddenly become bad. It just stopped being enough.

## 6. Gemini: Planning as an API State Machine

Gemini Deep Research's collaborative planning is one of the clearest public examples of planning as a protocol rather than as casual chat behavior.

It does not merely tell the model to plan first. It exposes planning as a three-stage API flow:

```text
Step 1: set collaborative_planning=true and request a research plan
Step 2: continue the same interaction with previous_interaction_id and refine the plan
Step 3: set collaborative_planning=false, or omit it, to approve and begin execution
```

It is a notably clean model.

The user is not informally saying, "Looks good, go ahead." The interaction itself carries the state transition from draft plan to refined plan to approved execution.

Using the pagination example as an analogy:

```text
First interaction:
  Research the API pagination migration and return only a plan.

Second interaction:
  Reduce frontend changes and prioritize backward compatibility.

Third interaction:
  Plan approved. Begin execution.
```

Gemini Deep Research is aimed more at research workflows than at direct code modification.

But its lesson for planning design is powerful:

> A plan can be protocol-level state, not just temporary text in a conversation.

Gemini ADK adds another layer: workflow agents.

Its Workflow Agents include Sequential, Parallel, and Loop patterns. Instead of leaving the whole process to dynamic LLM decisions, they let predefined logic govern the execution order of child agents.

That means the Gemini ecosystem effectively splits planning into two layers:

```text
Model layer: understand the task, reason, generate or revise a plan
Workflow layer: turn the stable parts into sequence, parallelism, loops, or graphs
```

That is a strong fit for production systems.

The pagination refactor could be modeled like this:

```text
Sequential:
  inspect existing API conventions
  draft the migration plan
  wait for approval
  implement backend changes
  run tests

Parallel:
  reviewer checks compatibility
  reviewer checks performance
  reviewer checks API docs

Loop:
  run tests -> fix failures -> run tests
  until tests pass or the retry limit is reached
```

At that point, the plan is no longer only a Markdown list. It can drive an execution graph.

In one sentence:

> Gemini's public design emphasizes planning as an interactive, revisable, approvable API conversation, while ADK pulls stable execution flow out of the model and into predictable workflows.

## 7. Put the Major Designs on One Table

If you line up Claude Code, Codex, OpenAI Agents SDK, and Gemini, the contrast becomes much clearer:

| System | Where Plan Mostly Lives | Strongest Capability | Best-Fit Use Cases | Main Limitation |
| --- | --- | --- | --- | --- |
| Claude Code | Plan Mode + Plan subagent + permission mode | Read-only research, context isolation, permission boundaries | Repository exploration and safe planning before complex code changes | Publicly visible design emphasizes runtime phase more than a fixed plan schema |
| Codex | `/plan` / Chat / Agent modes + `AGENTS.md` + subagents + approvals and sandbox | Engineering workflow, project-rule injection, centralized orchestration | PR changes, code review, long-running tasks, team-convention-heavy projects | Public material exposes the control surface, not the internal planner algorithm |
| OpenAI Agents SDK | Orchestration layer in code plus agent-level handoffs and tools | Clear separation between model-driven planning and code-driven control | Systems that need explicit control over sequence, retries, delegation, and termination | More of a builder toolkit than a single opinionated planning runtime |
| Gemini Deep Research | Collaborative planning + Interactions API | Three-stage state machine for draft, revision, and approval | Long research tasks, report generation, workflows where humans refine the scope | Primarily oriented toward research agents, not direct coding runtime |
| Gemini ADK | Workflow Agents and graph workflows | Deterministic sequence, parallelism, and loops | Production agent workflows and multi-step platform capabilities | Higher implementation complexity because the workflow must be modeled explicitly |

The more important takeaway behind the table is this:

```text
Claude turns planning into a permission boundary.
Codex turns planning into an engineering control plane.
OpenAI Agents SDK turns planning into an orchestration design choice.
Gemini turns planning into API state plus workflow structure.
```

These are not direct substitutes for one another. They solve the same planning problem at different layers.

## 8. Do Not Mystify Planning into a Hidden Algorithm

There is an important boundary to keep in mind.

People often ask:

```text
Are these systems using MCTS?
Do they have symbolic planners?
Is there a hidden planner AST?
```

Based on public information, the safest answer is: do not assume so.

Claude, Codex, and Gemini all talk about reasoning, thinking, agent loops, tool use, subagents, and workflows. But their public materials do not describe the planning layer as a reproducible classical planner.

So when reading these systems, it is better not to imagine planning as:

```text
A mysterious planner algorithm
```

Instead, think of it as:

```text
Prompt-driven planning
+ read-only evidence gathering
+ explicit state
+ tool permissions
+ human approval
+ execution verification
```

That framing is actually more useful for engineering.

Because when you build your own agent harness, the reusable part is not guessing how a vendor thinks internally. The reusable part is the public control surface.

## 9. If You Built Your Own Planning System, a Good Minimal Design Has Four Layers

If we abstract across vendors instead of copying any single one, a small but credible planning system can be broken into four layers.

The earlier list of five building blocks still applies here. `Context management` is not a separate layer in this version because it is distributed across the other four: mode boundaries, tool restrictions, the shape of the plan object, and the approval/verification loop all help manage context pressure.

**Layer 1: mode.**

```text
mode = chat | plan | execute
```

Small questions can be answered directly. Complex tasks enter planning first. Execution begins only after approval.

**Layer 2: tools.**

```text
plan mode:
  allow: read, search, inspect, safe command
  deny: write, edit, delete, mutating shell, external side effects

execute mode:
  allow according to approval policy and sandbox
```

Do not rely on prompt wording alone. The runtime must know whether the current phase is allowed to create side effects.

**Layer 3: the plan object.**

```json
{
  "goal": "Add pagination to the REST API",
  "assumptions": ["Keep old parameters backward compatible"],
  "evidence": ["Existing list endpoints already use limit/offset"],
  "steps": [
    "Confirm the response format",
    "Modify the users route",
    "Add parameter validation",
    "Add tests",
    "Run test and typecheck"
  ],
  "risks": ["A response shape change may break the frontend"],
  "validation": ["Existing tests pass", "New pagination tests pass"]
}
```

The plan object does not have to be JSON. It could be Markdown, a task board, an execution plan format, or a workflow graph.

What matters is that it can be recovered, reviewed, and referenced during execution.

**Layer 4: approval and verification.**

```text
DraftPlan
-> user edits or approves
-> Execute
-> Validate(actual_diff, approved_plan)
-> done or return to Plan
```

Without approval, planning becomes the model talking to itself.

Without verification, planning becomes a ritual before execution.

## 10. Back to Claude Code: What This Comparison Clarifies

Once you understand the broader industry patterns, Claude Code's own Plan Mode becomes easier to place.

Claude Code does not expose the most elaborate protocol, and it does not present planning as an explicit workflow graph.

Instead, it chooses the cut that matters most for coding agents:

```text
Before execution, stay read-only.
```

That sounds simple. It is also extremely effective.

Because for code tools, the biggest danger is not that the model cannot think. It is that it starts changing things too quickly. Read-only Plan Mode, the Plan subagent, permission restoration, plan persistence, and verification hooks work together to upgrade "understand first, act second" from model self-discipline into runtime governance.

Codex and Gemini then remind us what happens as the task grows beyond local code changes into team workflows or long-lived research systems:

```text
Codex: project rules + subagent orchestration + approval and sandbox
Gemini: collaborative planning API + workflow graph
```

So the end state of planning is not "make the model write prettier plans."

It is this:

> Move uncertainty earlier, push side effects later, put user decisions back at the critical gates, and bring execution results back to the approved plan for validation.

That is one of the clearest dividing lines between a modern agent harness and an ordinary chatbot.
