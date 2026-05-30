---
title: "Hosted Harness: Sandbox, Cron, Durable Execution, and remote deployment"
description: "Move a local CLI Agent into a hosted environment and understand how sandbox, cron, durable execution, workspace setup, secret boundary, artifact store, resume/retry, and notification form a Hosted Harness."
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.png'
locale: "en"
tags:
  - Agent
  - Harness
  - Hosted Harness
  - Durable Execution
  - Sandbox
  - Automation
  - Deployment
aliases:
  - Hosted Harness
  - Remote Hosted Agent Harness
  - Durable Agent Execution
---

# Hosted Harness: Sandbox, Cron, Durable Execution, and remote deployment

If you have followed the previous chapters to this point, you should have an increasingly capable CLI Agent in your hands.

It can connect to providers.

It can split model output into tool intent.

It can execute file, search, and terminal tools through Tool Runtime.

It can write observations back into the session.

It can use the event log for replay.

It can even delegate local subtasks to sub-agents.

At this point, it is easy to fall into a tempting shortcut:

Since the local CLI already runs, can we just put it on a server and call it a Hosted Harness?

For example, start a worker.

Wrap the CLI command in an HTTP API.

Add a cron job.

Run this every day at midnight:

```text
node cli-agent.js --task "Check why this repository's tests are failing and fix them"
```

It looks straightforward.

It is also dangerous.

Because a local CLI proves mechanism.

It proves that model, loop, tools, state, permission, and session can coordinate on one machine.

But Hosted Harness has to prove something else:

**When the Agent is not running in front of you, does not depend on the current terminal, does not depend on the current working directory, and does not depend on current process memory, can it still complete long tasks in a recoverable, auditable, and governable way?**

This article closes the "productization and hosting" phase.

We are no longer adding a new tool to the local Agent.

We are also not merely discussing one runtime detail.

We need to combine all the load-bearing layers from the previous articles:

```text
Session / Harness / Sandbox
Automation / Cron
Durable Execution
Workspace Setup
Secret Boundary
Artifact Store
Resume / Retry
Notification
Deployment Topology
```

Together, they answer one question:

> Why is Hosted Harness not "putting the CLI on a server"?

Condensed into one sentence:

**Hosted Harness is not a remote Agent process. It is a control system that hosts the Agent task lifecycle across time, workers, and sandboxes.**

This article is not trying to implement a full platform in one step.

It only draws the hosting boundaries: which facts must be persisted outside the worker, which actions must go through policy, and which recovery points must have evidence.

## 1. Why local CLI proves mechanism, not hosting

Keep using the previous example.

The user types locally:

```text
This repository's CI is failing. Help me find the cause and fix it.
```

The local CLI Agent's execution chain is roughly:

```text
read project rules
-> run tests
-> observe failure logs
-> search related code
-> edit files
-> run tests again
-> summarize the result
```

Getting this chain to work locally is already valuable.

It lets us confirm that many abstractions are not just talk.

For example, whether the provider contract is clean.

Whether tool intent can be validated.

Whether the permission gate blocks high-risk commands.

Whether the event log records facts.

Whether context policy can compress long logs into observations the next model turn can use.

But local CLI has a hidden assumption:

The user is usually sitting in front of the terminal.

The current process is still alive.

The current working directory still exists.

The current environment variables are still present.

The current shell's network, filesystem, and dependency caches are still present.

Even if the task fails, the user can see terminal output and roughly understand what happened.

Once this task becomes a remotely hosted task, all these assumptions change.

For example, the user sets an automation:

```text
Every morning at 8:00, check tests on the main branch.
If they fail, try to fix them and send a report.
```

Now the Agent is not running immediately inside the user's terminal.

It may be woken by a scheduler at some future time.

It may be placed into a remote worker.

It may need to pull the latest code from GitHub.

It may need to create a temporary workspace.

It may need access to secrets that only exist in a server-side vault.

It may run for 40 minutes.

The worker may be preempted midway.

It may pause halfway while waiting for user approval.

It may generate a patch, test logs, trace, and report.

It may need to notify the user through a thread, email, Slack, or PR comment after the task finishes.

That is not "the CLI ran once on a server."

That is a hosted execution system.

It has many more questions to answer than local CLI:

```text
When was the task triggered?
Is the trigger idempotent?
Which user / project / profile owns this task?
How is the workspace prepared?
How is the sandbox selected?
How are secrets injected, and how are leaks prevented?
Where is the event log stored?
Where are artifacts stored?
Where do we resume after worker crash?
Will repeated execution duplicate side effects?
How do we request approval when the user is offline?
How is completion reported?
How is failure attributed?
```

If these questions do not have clear answers, putting the local CLI on a server only creates a harder-to-debug CLI.

It will look automated when it succeeds.

When it fails, it will leave behind fragments of logs that cannot be replayed.

So the first principle of Hosted Harness is:

**Do not mistake "execution moved remote" for "the system has become hosted."**

Hosting is not about remoteness.

It is about explicitly modeling the task lifecycle.

## 2. The five boundaries of Hosted Harness

Article 4 separated three objects:

```text
Session: the source of truth
Harness: the control loop
Sandbox: the executor
```

In Hosted Harness, this three-way split expands outward by two more layers:

```text
Automation: when and why tasks are triggered
Deployment: where these components run, how they scale, and how tenants are isolated
```

In other words, Hosted Harness has at least five boundaries:

```text
Automation
Harness
Session
Sandbox
Deployment
```

They are not the same thing.

They should not be blended into one "remote agent service."

![Hosted Harness: Sandbox, Cron, Durable Execution, and remote deployment Mermaid 1](./assets/00-23-hosted-harness-durable-execution/mermaid-01.png)

The most important thing in this diagram is not the number of nodes.

It is the direction of the arrows.

Automation does not operate the repository directly.

It only creates a recordable trigger.

Harness does not hide facts in worker memory.

It writes events into Session.

Sandbox does not own task facts.

It is only the environment that executes actions.

Deployment is not business logic itself.

It is the infrastructure layer that keeps queue, worker, vault, artifact store, and sandbox pool running.

If these layers are blended together, common code looks like this:

```ts
cron.schedule("0 8 * * *", async () => {
  const repo = await git.clone(project.repoUrl);
  process.env.GITHUB_TOKEN = project.githubToken;

  const result = await runCliAgent({
    cwd: repo.path,
    prompt: "Check tests and fix them",
  });

  await sendEmail(project.ownerEmail, result.summary);
});
```

This code is not completely unable to run.

It may even feel smooth in a demo.

But it buries every important question.

The cron trigger has no event.

The repo workspace has no version identity.

The secret goes straight into process environment.

The agent run has no durable checkpoint.

Tool side effects are not recorded independently.

Artifacts are only temporary files.

After worker crash, the system does not know which step had completed.

After email is sent, the system does not know whether it was based on verified results.

Hosted Harness exists to avoid this urge to write every layer as one async function.

A more stable layering should look like this:

```text
Automation creates JobIntent
-> Queue persists Job
-> Worker leases Job
-> Harness creates or resumes Session
-> Workspace Setup prepares the code environment
-> Sandbox Pool allocates an execution environment
-> Durable Loop advances each step
-> Artifact Store saves evidence
-> Notification sends results or asks for user input
```

Every step should have an event.

Every step should be resumable.

Every step should be auditable.

## 3. Cron creates recoverable jobs, not timed commands

When many systems first add automation, they treat cron as "timed Bash."

That can be acceptable for ordinary scripts.

But for Agents, cron cannot represent only one command.

It should represent a task intent.

Because Agent tasks may be long.

They may pause.

They may require approval.

They may retry.

They may still be running when the next cron fires.

So cron in Hosted Harness must handle at least four questions:

```text
schedule: when to trigger
identity: on whose behalf to trigger
idempotency: whether this window has already been triggered
handoff: who takes responsibility after trigger
```

For example, "check tests every morning at 8:00" should not directly become:

```text
run npm test
```

It should first become a structured object:

```ts
type AutomationTrigger = {
  automationId: string;
  scheduleWindow: {
    start: string;
    end: string;
  };
  userId: string;
  projectId: string;
  profileId: string;
  goal: string;
  idempotencyKey: string;
  notificationPolicy: {
    onSuccess: "summary";
    onFailure: "summary-and-artifacts";
    onApprovalRequired: "immediate";
  };
};
```

The value of this object is not that the type looks nice.

It lets the system answer:

```text
Which automation triggered this task?
Is this a duplicate trigger for the same time window?
Which user authorization should be used?
Which project configuration should be used?
Where should results be sent?
If human approval is needed, should the user be notified immediately?
```

After cron fires, the first thing is not to start the model.

It is to write events:

```text
automation.triggered
job.created
job.enqueued
```

Only then does the task enter a worker.

![Hosted Harness: Sandbox, Cron, Durable Execution, and remote deployment Mermaid 2](./assets/00-23-hosted-harness-durable-execution/mermaid-02.png)

In this diagram, cron does not call the model directly.

It also does not run commands directly.

It only turns "some future time should continue doing something" into a recoverable job.

That is the difference between automation in Hosted Harness and an ordinary cron script.

Ordinary cron assumes the task is short, deterministic, and synchronous.

Agent automation must assume the task is long, uncertain, and may pause.

So cron output should not be stdout.

It should be a traceable job lifecycle.

If this layer is not done well, the most common problem is duplicate execution.

For example, one morning at 8:00 the scheduler triggers a task.

The worker has just started cloning the repo when the process restarts.

The scheduler retries and creates a new job.

Two jobs fix the same branch simultaneously.

One fixes the tests.

The other, based on an old workspace, submits a conflicting patch.

The user receives two contradictory notifications.

That is not model reasoning failure.

It is automation without idempotency.

Hosted Harness should block this kind of failure outside the model.

## 4. Remote Sandbox: both cage and license

The execution environment is the easiest place for local CLI to cheat.

It stands directly in the user's working directory.

Reading files, writing files, and running tests all happen on the same host.

Hosted Harness cannot do that.

Because a remotely hosted environment faces not one user's one command, but a combination of many users, many projects, many tasks, and many workers.

Each task may run model-generated code.

Each task may touch private repositories.

Each task may install dependencies, run tests, and access the network.

So a sandbox is not only a safety device.

It also has a more active role:

**It defines the area where the Agent may act freely.**

Without a sandbox, the system can only ask the user about every action:

```text
Can it write this file?
Can it install this dependency?
Can it run this test?
Can it access this domain?
Can it generate a patch?
```

Too many approvals exhaust users.

Once users are exhausted, they either abandon the Agent.

Or they reflexively approve everything.

Both make the system lose value.

With a sandbox, permission can move from "ask for every operation" to "configure a bounded workspace for this task."

That is why the sandbox is both cage and license.

It prevents the Agent from crossing boundaries.

It also lets the Agent keep making progress inside the boundaries.

In our hosted test-fix task, the sandbox must answer at least:

```text
Filesystem: which repo / worktree can it see?
Network: can it access package registries, GitHub API, or internal services?
Process: how long may test commands run?
Resources: what are CPU, memory, disk, and concurrency limits?
Snapshot: can the working context be retained after failure?
Reset: does the next task start from a clean environment?
Persistence: what can be kept across steps?
```

Different sandbox backends have different tradeoffs.

Local permission sandboxes start quickly and are good for narrowing a host view.

Containers package dependencies easily and fit project-level isolation.

microVMs provide stronger isolation, with higher cost and colder starts.

Browser or desktop sandboxes fit computer-use tasks.

Hosted Harness should not hard-code these choices into the Agent loop.

It should abstract them as execution backends.

```ts
type SandboxSpec = {
  image: string;
  workspaceRef: string;
  filesystemPolicy: "repo-only" | "worktree" | "ephemeral";
  networkPolicy: {
    allowDomains: string[];
    denyAllOther: boolean;
  };
  resourceLimits: {
    cpu: number;
    memoryMb: number;
    timeoutSeconds: number;
  };
  persistence: {
    keepArtifacts: boolean;
    keepWorkspaceSnapshot: boolean;
  };
};
```

Notice that no prompt appears here.

Nor does "the model thinks it is okay."

The sandbox spec is the Harness execution contract.

The model can propose running tests.

But it cannot decide whether it may access the user's home directory.

It also cannot decide whether it may print secrets to stdout.

These boundaries must be held by the execution layer of Hosted Harness.

![Hosted Harness: Sandbox, Cron, Durable Execution, and remote deployment Mermaid 3](./assets/00-23-hosted-harness-durable-execution/mermaid-03.png)

The key boundary in this diagram is `Policy -> Sandbox Spec`.

Many people think sandbox is an internal implementation detail of tool execution.

But in Hosted Harness, sandbox is policy made physical.

Policy says "tests may only run inside the repository workspace."

Sandbox turns that policy into filesystem, network, resource, and process limits.

Otherwise policy is only a promise on paper.

## 5. Workspace Setup: remote tasks do not magically have project state

Local CLI has a natural working context:

the current directory is the project.

A remote worker does not have that context.

Every time it starts a task, it must answer:

```text
Where does the code come from?
Which commit?
Which branch?
Should it create a temporary worktree?
How are dependencies installed?
Where are project rules?
Can caches be reused?
How is the failure context preserved?
```

That is workspace setup.

It is not a simple `git clone`.

It is the process by which Hosted Harness projects "the user's project" into "the operable workspace for this task."

For a test-fix task, a setup plan may be:

```text
read project config
-> fetch repo
-> checkout main@sha
-> create task branch
-> install dependencies
-> read AGENTS.md / project rules
-> create artifact directory
-> write workspace.ready event
```

The most important piece here is `main@sha`.

A remote long task must know which code fact it started from.

If it only says "main branch," what happens if main updates halfway through the task?

If the Agent generates a patch without a base commit, later review and replay become ambiguous.

So workspace setup should write an event:

```json
{
  "type": "workspace.ready",
  "workspaceId": "ws_123",
  "repo": "example/app",
  "baseRef": "main",
  "baseSha": "abc123",
  "taskBranch": "agent/fix-tests-2026-05-28",
  "sandboxId": "sbx_456",
  "rules": ["AGENTS.md", ".harness/project.md"],
  "artifactRoot": "artifact://session/s23/"
}
```

Then every later tool event can attach to the same workspace identity.

Which commit do the test logs belong to?

Which base is the patch based on?

In which sandbox did dependency installation happen?

Do the artifacts still exist?

These questions can all be answered from events.

Workspace setup has another easily underestimated role:

It is an input to context policy.

The next model turn does not see "whatever is on some worker's disk."

It sees context projected by the Harness from workspace facts:

```text
current repository
current base commit
current task branch
project rules summary
dependency installation status
latest test results
available tool boundaries
```

If setup is not structured, context can only guess from shell output.

That makes remote tasks extremely brittle.

## 6. Secret Boundary: secrets belong neither to the sandbox nor to model context

Remote hosted tasks inevitably touch secrets.

Pulling a private repository needs a token.

Installing private packages needs registry credentials.

Calling a cloud service needs an API key.

Sending user notifications needs a webhook.

But one of the most dangerous mistakes in Hosted Harness is treating secrets as ordinary environment variables and stuffing them into the sandbox:

```ts
env: {
  GITHUB_TOKEN: user.githubToken,
  NPM_TOKEN: project.npmToken,
  SLACK_WEBHOOK_URL: user.webhookUrl,
}
```

This looks simplest.

It is also the easiest to leak.

Because the Agent may run:

```bash
env
```

Test scripts may print the environment.

Dependency install logs may contain tokens.

The model may summarize stdout into observation.

Observation may then enter messages.

Finally, secrets may appear in trace, artifacts, notifications, or even PR comments.

So Hosted Harness must make the secret boundary a hard boundary.

The basic principles are:

```text
secrets live in vault.
the model never sees raw secrets.
the sandbox does not receive raw secrets by default.
tools use secrets through capabilities.
logs and artifacts are redacted.
injection, when needed, uses minimal scope and shortest lifetime.
```

For example, GitHub operations do not necessarily require handing a token to shell.

You can provide controlled tools:

```text
create_pull_request
post_pr_comment
fetch_ci_status
```

These tools use vault credentials on the Harness side.

The model only proposes intent.

Tool Runtime validates the intent.

During execution, the tool briefly retrieves the secret.

The result returns as a structured observation.

The secret does not enter sandbox stdout.

The secret does not enter messages.

The secret does not enter user-visible reports.

Of course, some tasks really do need to install private packages inside the sandbox.

Even then, use temporary credentials.

And limit domains, commands, lifetime, and output redaction.

![Hosted Harness: Sandbox, Cron, Durable Execution, and remote deployment Mermaid 4](./assets/00-23-hosted-harness-durable-execution/mermaid-04.png)

The most important parts of this diagram are the two dashed lines:

Vault does not enter the model.

Vault is not directly exposed to the sandbox.

If these two lines do not hold, all other governance in Hosted Harness weakens.

Remote hosting means the system acts on behalf of the user.

Acting on behalf of the user requires identity and credentials.

Once identity and credentials leak, the Agent problem is no longer merely "edited the wrong code."

It can become a cross-system permission incident.

## 7. Durable Execution: long tasks cannot bet on the worker staying alive

A minimal local CLI loop can be written as:

```ts
while (!done) {
  const response = await model.call(messages);
  const intent = parseIntent(response);
  const result = await toolRuntime.execute(intent);
  messages.push(toObservation(result));
}
```

Article 16 already explained why this form cannot support long-task recovery.

In Hosted Harness, the problem is even more obvious.

Because the worker is not a reliable source of truth.

Workers crash.

They are preempted.

They roll during deployments.

They are killed because of timeouts.

They release tasks while waiting for human approval.

So the core of durable execution is not "add more try/catch."

It is to turn every step into a state transition that can be confirmed, recovered, retried, or skipped.

Here, `durable execution` means recovery semantics. It is not tied to any specific workflow framework.

You can implement it with a queue, database, workflow engine, or a very plain state machine. The key is: do not re-execute unknown side effects; continue only from boundaries with evidence.

This is the same discipline as Session Replay from Article 16, upgraded for remote environments:

```text
Replay is the fact mechanism for local long-task recovery.
Durable execution is the recovery mechanism in remote worker / queue / sandbox environments.
They share the same discipline: do not re-execute unknown side effects; continue only from evidence-backed boundaries.
```

The special thing about the Agent loop is:

Model calls and tool execution are not ordinary functions.

Model calls may return different results.

Tool execution may have side effects.

Context projection changes the world the model sees.

The permission gate may pause the task.

So a durable loop in Hosted Harness should be at least this explicit:

```text
load session
-> acquire job lease
-> prepare workspace checkpoint
-> build context projection
-> persist model.requested
-> call model
-> persist model.responded
-> parse and validate intent
-> persist intent.validated
-> review policy
-> persist policy.decided
-> maybe pause for approval
-> execute in sandbox
-> persist tool.started
-> persist tool.finished
-> save artifacts
-> project observation
-> persist observation.appended
-> decide lifecycle state
-> release or renew job lease
```

This chain looks tedious.

But each step answers one recovery question:

```text
If the worker dies right now, where does the next attempt continue?
```

![Hosted Harness: Sandbox, Cron, Durable Execution, and remote deployment Mermaid 5](./assets/00-23-hosted-harness-durable-execution/mermaid-05.png)

The most important nodes in this diagram are `WaitingApproval` and `Paused`.

Local CLI often treats them as blocking.

Remote Hosted Harness must treat them as normal lifecycle states.

The user being offline does not mean the task failed.

The worker needing to release resources does not mean the task failed.

Budget exhaustion does not necessarily mean the task failed.

These are all durable states of the session.

On the next resume, Harness reads the event log.

It rebuilds state.

It checks artifacts.

It prepares workspace again or restores a snapshot.

Then it decides the next step.

### Retry is not rerunning everything

The easiest mistake in durable execution is treating retry as "start from the beginning."

For Agents, that is usually wrong.

If the model request has been sent but the response was not persisted, retrying the model call may produce a different intent.

If the tool has executed but `tool.finished` was not written successfully, retrying the tool may duplicate a side effect.

If a notification has been sent but the notification event was not written successfully, retrying may bother the user twice.

So retry must be classified by step:

```text
pure read: safe to retry
model call: retriable, but record request identity
tool write: must check side-effect evidence
external notification: must have a dedupe key
approval request: must be idempotent
workspace setup: can be rebuilt, but preserve base identity
```

A simple durable step can be expressed like this:

```ts
type DurableStep = {
  id: string;
  kind:
    | "model_call"
    | "tool_execution"
    | "workspace_setup"
    | "approval_request"
    | "notification";
  idempotencyKey: string;
  retryPolicy: "safe" | "check-before-retry" | "never-auto-retry";
  beforeEvent: string;
  afterEvent: string;
  artifactRefs?: string[];
};
```

The important part is not the type names.

The important part is that Harness no longer sees a long task as one continuous function call.

It sees the long task as a sequence of recoverable steps.

Each step has identity.

Each step has evidence.

Each step has retry semantics.

That is the difference between durable execution and an ordinary background job queue.

An ordinary queue usually only cares whether the job succeeded or failed.

Hosted Harness must care about the causal boundary inside every turn of the Agent loop.

## 8. Artifact Store: evidence for remote tasks cannot live only in logs

Local CLI output usually lives in the terminal.

Remote tasks do not have that luxury.

The user may not be online.

The worker's local disk may be cleaned after it exits.

The sandbox may be destroyed.

The logging system may only retain rolling text.

And the important evidence for Agent tasks is often large:

```text
test stdout / stderr
full patch
model input snapshot
raw model output
workspace diff
dependency installation log
screenshots
trace
evaluation report
final summary
```

These should not all be stuffed into the event log.

They also should not all be stuffed into messages.

They should enter the artifact store.

The event log records references and hashes.

The artifact store saves the evidence material.

Observation gives the model only the necessary summary.

![Hosted Harness: Sandbox, Cron, Durable Execution, and remote deployment Mermaid 6](./assets/00-23-hosted-harness-durable-execution/mermaid-06.png)

This diagram extends the principle from Article 16:

messages are not the source of truth.

the event log is the source of truth.

artifact is factual evidence.

projection is the view shown to different consumers.

In Hosted Harness, artifact store has one more value:

It makes notification more honest.

For example, a remote automation failed to fix tests.

The notification should not only say:

```text
Fix failed.
```

It should be able to attach:

```text
failed test summary
key log excerpts
full log artifact
generated patch artifact
last stable checkpoint
next step requiring user approval
```

This lets the user understand task state without opening the worker machine.

It also lets the next resume continue without relying on "the text summary inside the email."

## 9. Notification: not the final answer, but a lifecycle event

Local CLI has a simple ending.

The Agent says one final sentence:

```text
I fixed it, and the tests pass.
```

Remote Hosted Harness has a more complex ending.

Because the user may not be watching.

The task may succeed.

It may fail.

It may pause.

It may wait for approval.

It may need the user to choose the next step.

It may generate a PR.

It may be only a daily health report.

So notification should not be "send the final answer."

It should be a lifecycle consumer.

That means the notification system reads session events.

It decides what to send according to notification policy.

Then it writes the sent notification back into the event log.

```text
task.completed -> send summary
task.failed -> send failure report with artifacts
approval.requested -> send immediate approval link
job.paused -> send resume reason if policy requires
verification.failed -> send diagnostics
```

Why should notification also be written as an event?

Because notification itself is a side effect.

It may send twice.

It may fail to send.

The user may click it.

It may become the entry point for a later resume.

If it does not enter the event log, the system cannot answer:

```text
Was the user informed?
Which version of the facts were they informed about?
Which action did the user approve?
Does this approval still apply to the current workspace?
```

In remote tasks, notification is often tied to HITL.

For example, the Agent wants to run a high-risk command:

```text
rm -rf node_modules && npm install
```

Local CLI can directly ask in the terminal:

```text
Allow?
```

Hosted Harness cannot assume a terminal exists.

It has to create an approval request:

```json
{
  "type": "approval.requested",
  "sessionId": "s23",
  "actionId": "act_019",
  "risk": "medium",
  "reason": "Need to clear dependencies and reinstall to reproduce CI",
  "expiresAt": "2026-05-28T10:00:00Z",
  "notificationRef": "notification://thread/abc"
}
```

After the user approves, the system should not directly continue executing the old action.

It also has to check:

```text
Has the approval expired?
Is the workspace still the same base?
Is the action still applicable?
Has permission policy changed?
Has another worker already advanced the session?
```

This is why hosted HITL is more complex than a local prompt.

The user is not clicking just a button.

The user is authorizing an action with contextual identity.

## 10. Remote Worker: replaceable executor, not task source of truth

Now connect these layers.

Hosted Harness usually has a job queue and workers.

But the status of a worker is easy to misunderstand.

Many people call the worker "where the Agent is running."

That is only half true.

The worker is the current executor attempting to advance the session.

It is not the session itself.

It is also not the source of truth.

It is more like a rented pair of hands.

It leases a job.

It prepares a workspace.

It obtains a sandbox.

It advances a few steps.

It renews the lease.

If it cannot continue, it releases the lease.

The important facts are written outside:

```text
Session Store
Artifact Store
Workspace Snapshot
Queue Lease
Notification Log
Trace Store
```

![Hosted Harness: Sandbox, Cron, Durable Execution, and remote deployment Mermaid 7](./assets/00-23-hosted-harness-durable-execution/mermaid-07.png)

In this diagram, Worker A crashing is not a disaster.

The disaster is Worker A crashing while facts exist only in its memory.

As long as session and artifacts live outside the worker, Worker B can take over.

Taking over is not simply rerunning.

It replays the event log.

It checks artifacts.

It restores the workspace.

It finds the last stable point.

Then it continues through the resume gate.

This is the dividing line between Hosted Harness and "a background agent process."

A background process emphasizes process survival.

Hosted Harness emphasizes fact recovery.

The process may die.

The session must not be lost.

The artifact must not be lost.

The permission decision must not be lost.

The notification dedupe must not be lost.

## 11. Deployment Topology: the difference between Local CLI, Server, and Hosted Harness

At this point, we can put deployment topology into one diagram.

The same Agent carries completely different responsibilities under different topologies.

![Hosted Harness: Sandbox, Cron, Durable Execution, and remote deployment Mermaid 8](./assets/00-23-hosted-harness-durable-execution/mermaid-08.png)

Local CLI's advantage is fast feedback.

It is good for learning mechanisms, debugging tools, and validating a minimal loop.

It is also good for tasks that the user actively initiates and watches for a short period.

Server Agent goes one step further.

It moves execution remote.

It may have an API, queue, worker, and centralized logs.

But if it still keeps session in worker memory, treats sandbox as a temporary directory, and treats notification as the final message, it is not yet Hosted Harness.

The marks of Hosted Harness are:

```text
task triggers are recordable
session is recoverable
sandbox is replaceable
workspace is rebuildable
secrets have boundaries
artifacts are traceable
workers may fail
approval can cross time
notification is deduplicated
trace supports attribution
deployment is governable
```

This is not a feature checklist.

It is the minimum discipline for hosting long tasks.

### Do not jump to the final platform

Seeing these layers can make Hosted Harness feel heavy from the beginning.

It does not have to be.

A minimum viable Hosted Harness can be very narrow.

For example, support only one GitHub repo.

Support only one cron.

Support only one Docker sandbox.

Support only one notification method.

Support only the test-fix task category.

But it should still preserve the key boundaries:

```text
job queue is not session
worker is not source of truth
sandbox is not workspace identity
messages are not event log
secret is not ordinary env
final answer is not notification lifecycle
```

Capabilities can be few.

Boundaries should not be muddled.

## 12. How one hosted test-fix task runs to completion

Now ground the whole article in the same example.

The user configures an automation:

```text
Every morning at 8:00, check the main branch.
If tests fail, try to fix them.
If a high-risk action is needed, notify me for approval.
If the fix succeeds, generate a patch report.
```

A full Hosted Harness run can unfold like this.

### 1. Cron creates the task

The scheduler fires on time.

It does not run the Agent directly.

It creates an `AutomationTrigger`.

It generates an idempotency key from automation id, date window, and project id.

Queue checks whether this key already exists.

If it exists, no duplicate job is created.

If it does not exist, the system writes:

```text
automation.triggered
job.created
job.enqueued
```

### 2. Worker leases the job

A worker leases the job.

It does not own the task.

It only gets the right to advance it for a period of time.

It reads project config.

It reads user profile.

It reads automation policy.

Then it creates or resumes the session.

### 3. Workspace setup prepares the workspace

Harness fetches the repository.

It checks out `main@baseSha`.

It creates a task branch.

It installs dependencies.

It reads project rules.

It creates an artifact root.

It writes `workspace.ready`.

If dependency installation fails, the failure log enters artifacts.

The session enters a recoverable failure state.

Notification policy decides whether to report immediately.

### 4. Sandbox executes controlled tools

The model proposes:

```text
run tests.
```

The provider returns tool intent.

Harness validates the schema.

Permission policy finds this is an allowed test command.

Sandbox runs with controlled resources:

```text
npm test
```

stdout and stderr enter artifacts.

Tool Runtime generates an observation:

```text
Tests failed. The failing case is session refresh.
Key error: expected token to persist, got undefined.
Full log: artifact://...
```

### 5. Model advances from observation

Context policy does not stuff the full log into the model.

It gives the model the current goal, base commit, failure summary, related file snippets, available tools, and permission boundaries.

The model proposes searching related code.

The search tool is read-only.

Results enter the event log and observation.

The model proposes editing a file.

The Edit intent is validated.

The patch is written into the workspace.

The diff enters artifacts.

### 6. Durable loop records every boundary

Every step is not "already done" in memory.

It is a fact in events.

For example:

```text
model.requested
model.responded
intent.validated
policy.allowed
tool.started
tool.finished
artifact.saved
observation.appended
verification.started
verification.finished
```

If the worker crashes after `tool.finished` and before `observation.appended`, the next resume discovers that the tool result artifact already exists.

It does not blindly rerun the command.

It re-projects observation from the artifact.

### 7. Pause when approval is needed

Suppose the Agent wants to delete `node_modules` and reinstall dependencies.

Policy decides this is not a high-risk destructive operation, but it consumes more resources.

Automation policy requires human approval.

Harness writes:

```text
approval.requested
notification.sent
job.paused
```

The worker releases the lease.

The user clicks approve later.

The system writes:

```text
approval.granted
job.resumed
```

A new worker takes over.

It replays the session.

It confirms the workspace base has not changed.

It confirms the approval is still valid.

Then it continues.

### 8. Completion is not one sentence

After the fix is complete, Harness runs verification.

Tests pass.

It saves the final diff, test logs, and summary.

If configuration allows, it can create a PR or generate a patch artifact.

Finally, it notifies the user:

```text
The failing tests have been fixed.
base: main@abc123
modified file: src/session.ts
verification: npm test passed
artifacts: patch / test log / trace
```

It also writes:

```text
task.completed
notification.sent
```

The user sees the result.

The system keeps traceable facts.

The next trace analysis can know where the chain spent time.

The next evaluation can reuse this session.

The next regression can check whether similar tasks remain stable.

## 13. A minimum Hosted Harness interface sketch

To make the concept more concrete, we can draw a very small interface boundary.

It does not try to be complete.

It only expresses which responsibilities Hosted Harness should not mix together.

```ts
type HostedHarness = {
  schedule(trigger: AutomationTrigger): Promise<JobRef>;
  claim(jobId: string): Promise<JobLease>;
  run(lease: JobLease): Promise<RunResult>;
  resume(sessionId: string): Promise<RunResult>;
};

type HostedRuntime = {
  sessionStore: SessionStore;
  artifactStore: ArtifactStore;
  workspaceManager: WorkspaceManager;
  sandboxPool: SandboxPool;
  vault: SecretVault;
  notifier: NotificationService;
  provider: ModelProvider;
  tools: ToolRuntime;
};
```

`HostedHarness` owns lifecycle.

`HostedRuntime` provides external dependencies.

`SessionStore` is the source of truth.

`ArtifactStore` is the evidence store.

`WorkspaceManager` prepares the project workspace.

`SandboxPool` provides a controlled execution environment.

`Vault` manages secrets.

`Notifier` manages cross-time human-in-the-loop.

`Provider` and `ToolRuntime` remain the boundaries from previous chapters.

A simplified `run` can look like this:

```ts
async function runHostedJob(job: JobLease, runtime: HostedRuntime) {
  const session = await runtime.sessionStore.loadOrCreate(job.sessionId);
  const replayed = replay(session.events);

  const workspace = await runtime.workspaceManager.ensure({
    projectId: job.projectId,
    baseRef: job.baseRef,
    checkpoint: replayed.state.workspaceCheckpoint,
  });

  const sandbox = await runtime.sandboxPool.allocate({
    workspaceRef: workspace.ref,
    policy: replayed.state.sandboxPolicy,
  });

  return runDurableAgentLoop({
    session,
    replayed,
    workspace,
    sandbox,
    runtime,
    lease: job,
  });
}
```

The important part of this pseudocode is not the function names.

It is the order.

Load session first.

Then replay.

Then ensure workspace.

Then allocate sandbox.

Finally enter the durable loop.

Do not reverse it.

If you open the sandbox first, clone the repo first, call the model first, and only then remember to save the session, failure recovery becomes difficult.

The Hosted Harness discipline is:

**Establish fact boundaries first, then advance action.**

## 14. Common smells: if you see these, it is not Hosted Harness yet

The first smell is cron directly calling the Agent.

If a schedule trigger has no job identity, idempotency key, or event log, it is only a timed script.

The second smell is worker memory storing task facts.

Workers may cache.

But they cannot be the only source of truth.

The third smell is treating the sandbox directory as the session.

Sandbox can be destroyed.

Session cannot be destroyed with it.

The fourth smell is secrets directly entering the prompt or ordinary env.

If the model, stdout, artifacts, or notification can see raw secrets on any path, the boundary is broken.

The fifth smell is retrying from the beginning.

This duplicates side effects.

It also lets the model branch differently from the same historical point.

The sixth smell is notification not entering the event log.

What the user approved, when they approved it, and which action it applied to must all be auditable.

The seventh smell is artifacts only living on worker disk.

After a remote task ends, evidence must still be usable by trace, eval, user reports, and resume.

The eighth smell is Hosted Harness without clear tenant boundaries.

Once multiple users, projects, secrets, and workspaces are mixed, mistakes become very expensive.

The ninth smell is treating deployment as the last step.

Productionization is not "write the Agent, then deploy it."

It is acknowledging during Agent Harness design that the system will run across time, processes, and environments.

## 15. How this article closes the previous path

Looking back at the evolution of this series, Hosted Harness did not appear suddenly.

It is where the previous problems converge.

Article 4 said:

```text
Harness is the control system outside the model.
```

This article places that control system into a remote deployment environment.

Article 10 said:

```text
The model proposes; the system executes.
```

This article requires system execution to happen in a controlled sandbox.

Articles 13 and 14 said:

```text
Tool Runtime turns intent into observation.
Local Tool Bundle must be constrained by permission runtime.
```

This article requires tool execution to have remote workspace, artifact, and secret boundaries.

Article 16 said:

```text
Session event log is the source of truth for long tasks.
```

This article requires worker, cron, notification, and resume to revolve around session.

Article 18 said:

```text
Delegation sends out work, not control.
```

This article applies the same principle to remote workers:

workers share execution; they do not own facts or control.

The previous articles also added trace analysis, memory governance, scoped retrieval, and productized CLI.

Hosted Harness can now act as a phase-level closing:

```text
The Agent is no longer only able to complete one local task.
It starts to take a form that can be hosted, scheduled, resumed, audited, and governed.
```

This is the turn from "writing an Agent" to "operating an Agent Harness."

## Closing: hosted is not about cloud; it is about manageable lifecycle

We can compress the whole article into three sentences.

First, local CLI proves mechanism; Hosted Harness hosts lifecycle.

Second, Hosted Harness is not putting the CLI on a server. It is layering automation, session, harness, sandbox, workspace, secret, artifact, notification, and deployment.

Third, reliability for remote long tasks does not come from the worker staying alive. It comes from facts, evidence, permissions, and recovery points being persisted outside the worker.

Remote execution is not Hosted Harness.

Only when task triggers, source of truth, execution environment, evidence, approval, notification, and recovery are all persistable outside the worker has the system entered Hosted Harness.

So the memory hook for Hosted Harness is:

**The process may die, the sandbox may change, and the worker may be reassigned. As long as session, artifact, permission, and workspace identity remain, the Agent task has not truly been lost.**

At this point, the first half of the roadmap has moved from "how the model acts" to "how the system hosts action."

In the next phase, when looking at any Agent framework, we will no longer only ask whether it has a beautiful API.

We can ask more engineering-shaped questions:

```text
Where is its session source of truth?
Where is its sandbox boundary?
Is its cron idempotent?
Are its artifacts traceable?
Does its retry understand side effects?
Does its notification enter the lifecycle?
Does its deployment really make long tasks recoverable?
```

Being able to answer these questions is when you have truly started to understand Agent Harness.

## Teaching Harness Landing Point

The hosted version can grow from the semantics of `/api/runs` and SSE: a run has a `runId`, events can be consumed as a stream, session can resume, and side effects need checkpoints. A real hosted Harness is not just running the local loop on a server. Runs, workspace, event log, artifacts, and retries all need durable identities.

---

GitHub source: [00-23-hosted-harness-durable-execution.md](https://github.com/LienJack/build-harness/blob/main/docs/en/00-23-hosted-harness-durable-execution.md)
