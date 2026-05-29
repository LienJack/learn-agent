---
title: "Productized CLI: profile, extension, multi-provider"
description: "A demo CLI only has to run once. A productized CLI must make profile, configuration layers, provider switching, extension installation, capability ..."
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.png'
locale: "en"
tags:
  - Agent
  - Harness
  - Productized CLI
  - Profile
  - Extension
  - Multi Provider
  - Technical Tutorial
aliases:
  - Productized CLI
  - Agent Profile
  - Multi Provider CLI
  - Extension Runtime
---

# Productized CLI: profile, extension, multi-provider

A demo CLI only has to run once. A productized CLI must make profile, configuration layers, provider switching, extension installation, capability discovery, project instructions, runtime checks, and stable output protocols part of the same Harness discipline.

The running example is still:

```text
Help me understand why this project is failing tests, and fix it.
```

In a demo, that sentence starts a loop. In a product, it first raises invisible questions: which profile is active, what permissions it grants, which project instructions apply, whether the provider supports tool calling, whether fallback providers preserve the same event contract, and whether output is meant for a terminal, IDE, workbench, or CI host.

## Problem Chain

```text
demo CLI sends user input into an agent loop
-> options, env vars, provider config, extensions, and project instructions scatter
-> scattered configuration makes the same command behave differently
-> Profile combines policy, tools, context sources, provider preference, and output contract
-> Profile still goes through Plugin Host, Provider Runtime, Capability Discovery, and Tool Runtime
-> multi-provider uses a provider resolver and one model event contract
-> extension installation flows through manifest, trust, catalog, and discovery policy
-> productized CLI adds doctor/status, stable event output, and host protocols
```

![Productized CLI: profile, extension, multi-provider Mermaid 1](./assets/00-22-productized-cli-profile-extension/mermaid-01.png)

## 1. Why demo CLIs become hard to share

Early code is clean:

```ts
const provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY });
const tools = createLocalTools(process.cwd());
const agent = new Agent({ provider, tools });

await agent.run(process.argv.slice(2).join(" "));
```

Then comes `--model`, `--provider`, `--project-rules`, `--json`, `--mcp-config`, `--profile`, and risk flags. The user ends up redesigning the runtime at the CLI argument layer. Productization starts by collapsing those runtime intentions into profile.

## 2. Profile is runtime identity, not a theme

A profile answers:

```text
Under what identity, permission boundary, tool set, context sources, and model preference is the CLI running?
```

For example:

```text
chat: read-only Q&A
code: read/write workspace, low-risk tests allowed, high-risk commands require confirmation
review: no writes, strong citation and diff inspection
```

![Productized CLI: profile, extension, multi-provider Mermaid 2](./assets/00-22-productized-cli-profile-extension/mermaid-02.png)

## 3. Configuration layers are the first source of truth

Configuration should be mergeable, explainable, and auditable. A project file should not silently elevate user permissions. A command-line flag should not bypass the same resolver used by `doctor`. A useful merge order separates defaults, user profile, organization policy, project instructions, environment, and invocation overrides.

## 4. Multi-provider must not leak into user experience

Provider differences belong in adapters and resolvers, not in the user-facing control semantics.

```text
ModelRequest
-> Capability Need
-> Profile Preference
-> Provider Resolver
-> Provider Adapter
-> ModelEvent
-> Core Runtime
```

![Productized CLI: profile, extension, multi-provider Mermaid 3](./assets/00-22-productized-cli-profile-extension/mermaid-03.png)

The stable unit is `ModelEvent`, not provider-specific JSON.

## 5. Extension: installed is not enabled, enabled is not visible, visible is not executable

Extension lifecycle should be explicit:

```text
install
-> verify
-> trust
-> manifest
-> catalog
-> visible set
-> permission gate
-> tool runtime
```

![Productized CLI: profile, extension, multi-provider Mermaid 4](./assets/00-22-productized-cli-profile-extension/mermaid-04.png)

Trust decides whether a source may contribute capabilities. Permission decides whether one concrete intent may execute. Do not mix them.

## 6. Project instructions are not the system prompt

Project instructions are evidence and policy inputs. They should be parsed, scoped, cited, and projected. They should not overwrite global safety policy or user identity.

![Productized CLI: profile, extension, multi-provider Mermaid 5](./assets/00-22-productized-cli-profile-extension/mermaid-05.png)

## 7. `doctor` is the CLI's self-diagnostic entry

`doctor` should run the same resolver path as `run`: profile resolution, provider availability, tool visibility, extension trust, project config, output mode, and permission policy. If `doctor` and `run` disagree, users cannot trust either.

## 8. Stable output protocol

Pretty terminal output is just one projection. Productized CLI should emit stable events:

```text
runtime events
-> CLI event stream
-> TTY renderer
-> JSONL
-> Workbench
-> CI log
-> Trace store
```

![Productized CLI: profile, extension, multi-provider Mermaid 6](./assets/00-22-productized-cli-profile-extension/mermaid-06.png)

## 9. How one task flows through a productized CLI

```text
parse invocation
-> resolve profile
-> merge configuration layers
-> resolve provider
-> load trusted extensions
-> compute visible capability set
-> project context
-> start Agent Runtime
-> stream stable events
-> persist trace and artifacts
```

![Productized CLI: profile, extension, multi-provider Mermaid 7](./assets/00-22-productized-cli-profile-extension/mermaid-07.png)

## 10. Minimum landing path

Do not build the whole platform at once. Start with a typed profile file, one resolver, one event stream, one extension manifest format, and a `doctor` command that shares the same runtime path.

## 11. Productized CLI smells

### Smell 1: profile is only a model alias

A model alias does not capture policy, tools, context, output, or trust.

### Smell 2: project config can elevate user permissions

Project config may narrow behavior, not silently grant more power.

### Smell 3: extension content enters the prompt after install

Installation only places files. Trust, discovery, visibility, and permissions still have to run.

### Smell 4: provider fallback changes output semantics

Fallback should preserve `ModelEvent` semantics.

### Smell 5: JSON mode contains pretty logs

Machine output should stay parseable and stable.

### Smell 6: `doctor` and `run` use different resolver paths

They will drift and produce confusing support cases.

## 12. How to test this layer

Test profile merge order, permission narrowing, provider fallback, extension trust, visible capability computation, JSONL schema stability, and `doctor` parity.

## 13. What this layer solves

Productized CLI turns runtime power into a stable product entry. It also introduces sharper responsibility: configuration is now a fact source, provider choice is a resolver decision, and extensions have a lifecycle.

## Image Plan

```text
photo-01-profile-runtime-identity.png
photo-02-provider-resolver-stable-ux.png
photo-03-extension-lifecycle-gates.png
photo-04-cli-event-output-contract.png
```

---

GitHub source: [00-22-productized-cli-profile-extension.md](https://github.com/LienJack/build-harness/blob/main/docs/en/00-22-productized-cli-profile-extension.md)
