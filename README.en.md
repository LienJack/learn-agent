# learn-agent

A technical blog and knowledge base for learning AI agents, Claude Code internals, databases, Redis, and frontend engineering in one connected path.

[中文](./README.md) | [日本語](./README.ja.md) | [Read online](https://blog.lienjack.com/en/)

## What Is This?

`learn-agent` is a blog for engineers who want to understand how modern AI systems actually work. It is less about collecting isolated definitions and more about tracing the design of real systems: how a model call becomes an agent loop, how tools are selected, how context is managed, and how these ideas land in everyday software engineering.

The blog currently focuses on:

- AI agents: LLMs, prompts, RAG, agent workflows, and the mental models behind them.
- Claude Code source analysis: architecture, ReAct, prompts, context management, tools, MCP, skills, multi-agent collaboration, and planning.
- Databases: MySQL and PostgreSQL indexes, transactions, locks, logs, caches, execution flows, and architecture.
- Redis: data types, internal structures, persistence, cache failure patterns, consistency, high availability, tuning, and key design.
- Frontend engineering: using this Astro blog itself as a living example of multilingual routing, content systems, media viewing, interaction details, and static-site engineering.

If you are learning agents and want to go beyond prompt tricks or product demos, this project is for you. It puts agents back into the engineering context where they actually live: files, terminals, databases, frontend calls, task plans, failures, and recovery.

## Why Read It?

- **From concepts to source code**: start with LLM, RAG, and agent fundamentals, then move into the runtime design of Claude Code-style coding agents.
- **From source code to engineering practice**: look at tool boundaries, context budgets, task collaboration, MCP, skills, and maintainability.
- **AI plus fundamentals**: agents still need to edit databases, caches, APIs, and frontend code. The blog keeps those foundations in the same learning map.
- **Visual explanations**: many articles include diagrams and image-based walkthroughs for complex flows.
- **A living site**: the repository contains both the content and the Astro implementation, so the writing and the product experience evolve together.

## Content Map

### AI Agents

- LLM principles and capability boundaries
- How prompts shape reasoning and execution
- From chatbots to task-performing agents
- Harness, OpenClaw, Hermes, and related agent-engineering ideas
- RAG ingestion, chunking, embeddings, indexing, retrieval evaluation, and GraphRAG

### Claude Code Source Analysis

- Engineering architecture and module boundaries
- How the ReAct loop drives task progress
- Prompt composition and system instructions
- Context management, compression, and recovery
- File tools, terminal tools, and task-management tools
- MCP, skills, multi-agent collaboration, and planning

### Databases And Redis

- MySQL / PostgreSQL indexes, transactions, locks, logs, caches, and execution flows
- Buffer Pool, shared_buffers, MVCC, WAL, Checkpoint, and other core mechanisms
- Redis data types, internal data structures, expiration, eviction, and persistence
- Cache avalanche, breakdown, penetration, and MySQL / Redis consistency
- Replication, Sentinel, Cluster, slow queries, big keys, and production architecture

### Frontend And Content Engineering

- Astro 6 multilingual blog architecture
- Markdown / MDX content organization
- Article media, flowcharts, and image viewing
- RSS, Sitemap, static deployment, and content-site engineering

## Local Development

This project uses `pnpm` and Node.js `>=22.12.0`.

```bash
pnpm install
pnpm dev
```

The dev server runs at [http://localhost:4321](http://localhost:4321) by default.

Useful commands:

```bash
pnpm dev
pnpm build
pnpm preview
pnpm astro:check
pnpm test:content
```

## Project Structure

```text
src/content/blog/       Blog content
src/pages/              Astro routes
src/components/         Page and interaction components
src/layouts/            Page and article layouts
src/styles/             Global styles
public/                 Static assets
docs/                   Design, planning, and requirements docs
```

## Star History

If this project helps you understand agents, Claude Code, or engineering fundamentals, a Star would mean a lot and will keep me writing deeper.

[![Star History Chart](https://api.star-history.com/svg?repos=LienJack/learn-agent&type=Date)](https://www.star-history.com/#LienJack/learn-agent&Date)

## License

This project is open-sourced under the [MIT License](./LICENSE).
