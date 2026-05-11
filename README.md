# learn-agent

用一套工程师能读懂、能复盘、能迁移的方式，系统学习 AI Agent、Claude Code 源码、数据库、Redis 和前端工程。

[English](./README.en.md) | [日本語](./README.ja.md) | [在线阅读](https://blog.lienjack.com)

## 这是什么

`learn-agent` 是一个面向工程师的技术博客和知识库。它不只记录“某个概念是什么”，更关心一个系统为什么这样设计、一次模型调用背后发生了什么、一个工具链如何拆成可理解的工程模块。

这里会持续整理这些主题：

- AI Agent：从 LLM、Prompt、RAG 到 Agent 工作流，建立完整的概念地图。
- Claude Code 源码解析：拆解架构、ReAct、Prompt、Context 管理、Tools、MCP、Skill、多 Agent 协作和 Plan。
- 数据库：围绕 MySQL、PostgreSQL 的索引、事务、锁、日志、缓存、执行流程和架构做系统梳理。
- Redis：覆盖数据类型、底层结构、持久化、缓存问题、一致性、高可用、调优和业务 key 设计。
- 前端工程：以这个 Astro 博客本身为载体，沉淀多语言站点、内容系统、图像查看、交互体验和工程化实践。

如果你正在学习 Agent，又不想停留在“提示词技巧”和“产品演示”层面，这个博客会更适合你。它尝试把 Agent 放回真实软件工程里：上下文怎么管理，工具怎么调用，任务怎么拆分，失败如何恢复，知识如何沉淀。

## 为什么值得读

- **从概念走到源码**：先建立 LLM、RAG、Agent 的基本模型，再进入 Claude Code 这类真实编程 Agent 的运行机制。
- **从源码走到工程**：不只看代码片段，也看工具边界、上下文预算、任务协作、MCP 协议和可维护性问题。
- **从 AI 回到基本功**：Agent 最终还是要改数据库、写缓存、动前端、跑命令。这里会把 MySQL、PostgreSQL、Redis 等基础能力一起补上。
- **图文结合**：文章中大量使用结构图、流程图和长图查看体验，方便把复杂链路拆开理解。
- **持续更新**：这个仓库本身就是博客源码，内容、站点体验和工程实践会一起迭代。

## 内容地图

### AI Agent

- LLM 原理与能力边界
- Prompt 如何影响模型推理和执行
- 从对话机器人到能干活的 Agent
- Harness、OpenClaw、Hermes 等 Agent 工程概念
- RAG 数据导入、分块、向量嵌入、索引优化、召回评估和 GraphRAG

### Claude Code 源码解析

- 工程架构和模块划分
- ReAct 循环如何驱动任务推进
- Prompt 编写和系统指令组织
- Context 管理、压缩和恢复策略
- 文件工具、终端工具、任务管理工具
- MCP、Skill、多 Agent 协作和 Plan 机制

### 数据库与 Redis

- MySQL / PostgreSQL 索引、事务、锁、日志、缓存和执行流程
- Buffer Pool、shared_buffers、MVCC、WAL、Checkpoint 等核心机制
- Redis 数据类型、底层结构、过期删除、内存淘汰和持久化
- 缓存雪崩、击穿、穿透，MySQL 与 Redis 一致性
- 主从复制、哨兵、Cluster、慢查询、大 key 和生产架构设计

### 前端与内容工程

- Astro 6 多语言博客架构
- Markdown / MDX 内容组织
- 文章媒体、流程图和图片查看体验
- RSS、Sitemap、静态部署与内容站点工程化

## 本地运行

项目使用 `pnpm` 和 Node.js `>=22.12.0`。

```bash
pnpm install
pnpm dev
```

开发服务器默认运行在 [http://localhost:4321](http://localhost:4321)。

常用命令：

```bash
pnpm dev
pnpm build
pnpm preview
pnpm astro:check
pnpm test:content
```

## 项目结构

```text
src/content/blog/       博客文章内容
src/pages/              Astro 页面路由
src/components/         页面组件和交互组件
src/layouts/            文章和页面布局
src/styles/             全局样式
public/                 静态资源
docs/                   设计、计划和需求文档
publish/                项目内发布中控台、skill、产物和运行记录
```

## 发布

发布入口集中在 [`publish/README.md`](./publish/README.md)。Codex 发布时请显式引用项目内 skill：

- 中文草稿：`publish/skills/publish-cn/SKILL.md`
- 英文 DEV：`publish/skills/publish-en/SKILL.md`
- 日语 Zenn：`publish/skills/publish-ja/SKILL.md`

## Star History

如果这个项目对你理解 Agent、Claude Code 或工程基础有帮助，欢迎点一个 Star。它会提醒我继续把这些知识写深一点。

[![Star History Chart](https://api.star-history.com/svg?repos=LienJack/learn-agent&type=Date)](https://www.star-history.com/#LienJack/learn-agent&Date)

## License

本项目基于 [MIT License](./LICENSE) 开源。
