---
title: Text2SQL Agent、RAG、Data Agent 与 Evidence 系统设计
description: 面向金融投资数据平台，规划 Text2SQL Agent、RAG、Data Agent、Evidence Ledger、A2A 通信与生产化评测的完整章节路线。
pubDate: 2026-07-11
locale: zh
---

# 建议的 10 章结构

这版目录把主要篇幅放在 **Text2SQL Agent、RAG、Data Agent 和 Evidence** 上；A2A、生产化和面试表达作为支撑章节。

你当前项目事实基线应继续保持：已有 Next.js、NestJS、LangGraph、多数据源执行、会话绑定数据源、表级 ACL、双重 SQL Guard、SSE 和 Run Trace；真实 RAG、金融语义层、Data Agent、A2A 和生产级认证属于部分实现或演进方案。

| 章  | 章节名称                                     | 核心内容                                                     |
| -- | ---------------------------------------- | -------------------------------------------------------- |
| 1  | 项目定位、当前架构与目标架构                           | 业务背景、现状边界、为什么升级为 Data Agent + Text2SQL Agent             |
| 2  | 金融领域数据模型与语义层                             | Project、VC、融资、Token、时间、币种、指标和关系定义                        |
| 3  | Text2SQL Agent 总体设计                      | 输入输出合同、状态机、查询路由、工具边界和终态                                  |
| 4  | RAG Preparation Plane                    | Schema Catalog、Glossary、Metric、Relationship、索引和版本发布      |
| 5  | ACL-first Online RAG 与 Agentic Retrieval | Hybrid Retrieval、Value Grounding、Evidence Critic 和有界检索循环 |
| 6  | Semantic Plan、SQL 生成与执行                  | Semantic DSL、确定性编译、SQL Agent、Validator、Correction、执行网关   |
| 7  | Data Agent 总体设计                          | Research Frame、Analysis Plan、任务拆分、Agent 调度和重规划           |
| 8  | Evidence、金融计算与专业报告                       | Evidence Ledger、Claim、Quant Tools、数字校验和报告生成              |
| 9  | A2A Agent 通信设计                           | Agent Card、Task、Message、Artifact、Streaming、认证和可靠性        |
| 10 | 生产化、评测、演进路线与面试表达                         | 安全、Trace、Replay、评测、并发、迁移路线和面试讲稿                          |

---

# 各章写作 Roadmap

## 第 1 章：项目定位、当前架构与目标架构

重点回答：

* 这是一个什么金融投资数据平台；
* 为什么普通 Text2SQL 不足以支撑专业投资研究；
* 当前代码真实实现到了什么程度；
* 为什么要拆分 Data Agent 与 Text2SQL Agent；
* 当前架构如何逐步演进，而不是完全重写。

必须包含：

* 30 秒和 2 分钟项目介绍；
* 当前架构图；
* 目标总体架构图；
* 已实现、部分实现、演进方案矩阵；
* Data Agent、Text2SQL Agent、Research Agent、Market Agent 的职责边界；
* 一次端到端用户分析流程。

---

## 第 2 章：金融领域数据模型与语义层

重点回答：

* 项目、机构、人物、基金、融资轮次、Token、市场数据如何建模；
* 如何处理项目别名、机构改名和 Token Symbol 重名；
* 如何处理公告时间、事件时间、收录时间和历史时点；
* 为什么未披露金额不能当成 0；
* 如何将“融资额、投资次数、投资阶段、赛道暴露”等变成版本化指标。

必须包含：

* 核心实体关系图；
* 双时间或多时间语义；
* `knowledgeAsOf`；
* Currency Policy；
* Metric Definition；
* Relationship Contract；
* Published Semantic Bundle；
* 金融数据常见错误案例。

---

## 第 3 章：Text2SQL Agent 总体设计

重点回答：

* Text2SQL Agent 的职责和非职责；
* Data Agent 应该怎样调用它；
* 输入为什么不能只有一句自然语言；
* 为什么需要 Semantic Compile、Trusted Query、Ad-hoc SQL 三条路径；
* Text2SQL 最终为什么返回 Evidence Artifact，而不是投资观点。

必须包含：

* `FinancialQueryRequest`；
* `QuestionFrame`；
* Text2SQL Agent State；
* 四路查询路由；
* Agent Graph；
* 工具列表；
* Task 终态；
* `QueryEvidenceArtifact`；
* 正常、歧义、权限拒绝、成本超限和数据库错误路径。

---

## 第 4 章：RAG Preparation Plane

重点回答：

* 离线怎样建设可检索的 Schema 和业务知识；
* 什么内容进入权威 Catalog，什么内容进入索引；
* 为什么不能将所有内容简单切成向量 Chunk；
* Schema 变化后如何避免旧索引继续在线服务；
* Trusted Query 如何经过测试、审核和发布。

必须包含：

* Schema Introspection；
* Business Glossary；
* Metric Registry；
* Relationship Registry；
* Entity Alias；
* Value Index；
* Trusted Query Asset；
* Typed Chunk；
* Lexical/Dense Index；
* Catalog、Index、Policy 和 Semantic Version；
* 原子发布与回滚。

---

## 第 5 章：ACL-first Online RAG 与 Agentic Retrieval

重点回答：

* 在线查询怎样先做权限裁剪，再做召回；
* Lexical、Dense、Relationship、Value、Trusted Query 如何分别检索；
* RRF 在哪些范围内适用；
* 如何保证选出的 Context 覆盖指标、实体、时间、关系和过滤值；
* Evidence 不足时何时重写检索、何时澄清、何时拒绝。

必须包含：

* ACL-first Retrieval 流程；
* Query Rewrite；
* Hybrid Retrieval；
* Value Grounding；
* Domain Coverage；
* Primary Rerank；
* Optional Model Rerank；
* Evidence Critic；
* `SelectedEvidence`；
* 最多一次 Retrieval Rewrite；
* RAG Prompt Injection 防护；
* Recall、MRR、nDCG、stale rate 和 ACL violation 指标。

---

## 第 6 章：Semantic Plan、SQL 生成与执行

重点回答：

* 如何从自然语言构造结构化语义计划；
* 哪些查询由确定性编译器生成 SQL；
* 哪些查询才使用 LLM SQL Agent；
* SQL 生成后怎样检查 Schema、指标、Join、时间、币种和权限；
* 如何基于结构化错误做最多两次修复；
* 为什么 `LIMIT` 不能作为主要成本控制。

必须包含：

* `SemanticQuery` DSL；
* Deterministic Compiler；
* Trusted Query Parameter Binding；
* SQL AST/IR；
* Dialect-aware Generation；
* Unified Validation Pipeline；
* Dry-run/EXPLAIN；
* Cost Guard；
* Bounded Correction；
* Read-only Query Gateway；
* Result Validation；
* `ValidationReport`；
* 一次完整查询示例。

---

## 第 7 章：Data Agent 总体设计

重点回答：

* Data Agent 为什么是研究编排器，而不是超级 Prompt；
* 如何把复杂问题拆成结构化查询、新闻研究、市场数据和计算任务；
* 哪些任务可以并行，哪些必须有依赖；
* 什么情况下需要重新规划；
* Data Agent 为什么不能自己写 SQL。

必须包含：

* `ResearchFrame`；
* `AnalysisPlan`；
* Data Agent State；
* Capability Router；
* Task Dependency DAG；
* 并行执行；
* Budget、Deadline、Cancellation；
* Agent 选择规则；
* Evidence Coverage Check；
* 最多一次 Replan；
* 一个复杂金融问题的完整任务拆解。

---

## 第 8 章：Evidence、金融计算与专业报告

重点回答：

* 如何保证最终报告中的数字有来源；
* 如何区分 Fact、Calculation、Inference 和 Opinion；
* 新闻和数据库事实冲突时如何处理；
* 为什么同比、波动率、最大回撤等不能让 LLM 心算；
* 最终报告如何校验数字、单位、时间和引用。

必须包含：

* Evidence Ledger；
* `EvidenceArtifact`；
* `AnalysisClaim`；
* Quant Tool；
* Source Priority；
* Conflict Resolution；
* Numeric Verification；
* Claim-Evidence Validation；
* 数据缺失和不确定性；
* 专业金融报告模板；
* 一个从 Evidence 到 Claim 再到报告的示例。

---

## 第 9 章：A2A Agent 通信设计

重点回答：

* Data Agent 调 Text2SQL 为什么可以使用 A2A；
* A2A 与 MCP、普通 RPC、消息队列的边界；
* Agent 如何发现对方能力；
* 长查询如何 Streaming；
* 如何传递最终用户身份，而不是只验证 Data Agent 服务；
* 如何处理幂等、取消、重试和版本兼容。

必须包含：

* 当前最新 A2A 官方规范核验；
* Agent Card；
* Skill；
* Message；
* Task；
* Artifact；
* Task 生命周期；
* HTTP+JSON/SSE 与 gRPC 选择；
* OAuth Token Exchange；
* On-Behalf-Of；
* Idempotency Key；
* Deadline；
* Cancellation；
* Task Store；
* 大结果对象存储；
* NestJS Client/Server 结构。

---

## 第 10 章：生产化、评测、演进路线与面试表达

重点回答：

* 如何确保多 Agent 系统不会越权、泄露或无限循环；
* 如何完整追踪一次用户分析；
* 如何评测 Text2SQL、RAG、Data Agent 和 A2A；
* 并发从几十到几百、几千时如何演进；
* 当前代码怎样分阶段升级；
* 面试时怎样在 30 秒、2 分钟和 5 分钟内讲清楚。

必须包含：

* Threat Model；
* OIDC/JWT；
* 表列行权限；
* SQL AST 安全；
* Prompt Injection；
* Result Protection；
* OpenTelemetry；
* Run Replay；
* Golden Dataset；
* Offline、Shadow、Canary；
* P0—P4 演进路线；
* 30 秒、2 分钟、5 分钟讲稿；
* 20 个高频追问。

---

# 可直接复制的总控 Prompt

把下面整个代码块复制到 ChatGPT Pro。它会先生成第 1 章；之后你只需要输入“继续第 2 章”。

```text
你是一名 Principal AI Platform Architect、资深 Text2SQL/RAG 架构师、金融数据平台架构师和高级技术面试官。

我要准备一个类似 RootData 业务形态、但与 RootData 没有隶属或技术关联的金融投资数据平台项目。平台的数据对象包括项目、投资机构、基金、人物、融资轮次、Token、市场行情、项目关系、新闻公告和事件日历。

平台目标架构包括：

1. Data Agent
负责理解投资研究问题、构造 Research Frame、拆解 Analysis Plan、调用专业 Agent、融合证据、执行金融分析并生成专业报告。

2. Text2SQL Agent
负责受治理地查询结构化金融数据，完成实体解析、语义绑定、查询规划、SQL 编译或生成、验证、安全执行和结果质量检查，最终返回 Query Evidence Artifact。Text2SQL Agent 不直接生成投资结论。

3. Research / News Agent
负责查询公告、新闻、白皮书和研究文档，并返回有来源的 Document Evidence。

4. Market Data Agent
负责返回价格、市值、FDV、TVL、成交量、解锁和其他时间序列数据。

5. Quant Tools
负责收益率、CAGR、波动率、最大回撤、相关性、集中度等确定性计算。不得让 LLM 心算复杂金融指标。

6. A2A
负责独立 Agent 之间的能力发现、任务委派、状态更新和 Artifact 交付。

7. MCP、普通 RPC 或 Tool API
负责 Agent 内部访问数据库、目录、校验器、搜索和计算工具。不要将 A2A 与 MCP 混为一谈。

────────────────────────────────
一、当前项目事实基线
────────────────────────────────

必须严格区分以下标签：

【已实现】
【部分实现】
【演进方案】
【待验证】

当前事实基线如下：

1. 当前项目已有 Next.js 前端、NestJS 后端、LangGraph、Prisma/PostgreSQL 和 Redis。
2. 当前已有会话绑定数据源。
3. 当前支持 SQLite、MySQL、PostgreSQL、CSV 和 Excel 查询执行。
4. 当前已有 Workspace 和表级 ACL，采用默认拒绝策略。
5. 当前已有 Agent Graph 内和 Query Executor 前的双重 SQL Guard。
6. 当前已有 SSE 流式状态和 runId/trace。
7. 当前 Text2SQL Graph 大致包含：
   clarify
   retrieve-knowledge
   build-intent-plan
   build-semantic-query
   build-physical-plan
   generate-sql
   safety-check
   execute-sql
   format-answer
8. 当前真实 RAG 只有节点和状态骨架，没有完整的 Schema Ingestion、Lexical/Dense Retrieval、RRF、Rerank、Value Index 或 Selected Context 注入。
9. 当前 SQL Prompt 没有完整注入真实 Schema、业务指标和关系定义。
10. 当前认证主要基于请求头构造 Actor，只适合演示环境，不能描述为生产级认证。
11. 当前列级和行级权限存在接口挂钩，但没有完整生产实现。
12. 当前没有已经上线的 Data Agent、A2A、金融语义层和专业 Evidence Ledger。
13. 当前没有可信的线上 QPS、准确率提升百分比、生产事故或高并发压测结果。
14. 不得将设计文档中的未来方案写成已经上线的功能。

如果我同时上传了项目底稿，请先阅读底稿；如果没有上传，以以上事实基线为准。

────────────────────────────────
二、统一目标定位
────────────────────────────────

项目统一定位为：

“面向加密资产和一级市场投资研究的多 Agent 金融数据分析平台。”

统一职责边界：

Data Agent 负责研究与判断。
Text2SQL Agent 负责结构化数据查询与举证。
Research Agent 负责文档事实与来源。
Market Data Agent 负责时序市场证据。
Quant Tools 负责确定性计算。
A2A 负责 Agent 间任务协作。
MCP、RPC 和 Tool API 负责 Agent 访问工具与资源。

必须坚持：

1. Data Agent 不直接写 SQL。
2. Text2SQL Agent 不直接输出投资观点。
3. SQL 执行成功不代表业务语义正确。
4. LLM 不得自行决定 Workspace、Datasource 或权限范围。
5. 高频核心指标优先走确定性 Semantic Compiler。
6. 审核过的复杂查询优先走 Trusted Query Asset。
7. 只有长尾明细和探索性需求才走 Constrained SQL Agent。
8. 权限拒绝、危险 SQL、指标冲突和成本超限不得通过无限重试解决。
9. 金融数据必须处理历史时点、knowledgeAsOf、币种、来源、未披露值和实体消歧。
10. 最终报告中的核心数字必须能追溯到 Evidence Artifact。

────────────────────────────────
三、统一术语和数据合同名称
────────────────────────────────

所有章节使用以下统一名称，不能随意改名：

PublishedBundle
SchemaCatalog
BusinessGlossary
MetricDefinition
SemanticRelationship
TrustedQueryAsset
SelectedEvidence
QuestionFrame
SemanticQuery
ValidationReport
FinancialQueryRequest
QueryEvidenceArtifact
ResearchFrame
AnalysisPlan
AgentTask
EvidenceArtifact
CalculationArtifact
AnalysisClaim
FinancialAnalysisReport

关系约定：

FinancialQueryRequest
 -> Text2SQL Agent
 -> QueryEvidenceArtifact

ResearchFrame
 -> AnalysisPlan
 -> AgentTask[]
 -> EvidenceArtifact[]
 -> CalculationArtifact[]
 -> AnalysisClaim[]
 -> FinancialAnalysisReport

────────────────────────────────
四、金融领域必须处理的语义
────────────────────────────────

设计中必须考虑：

1. 核心实体：
Project
Organization
Fund
Person
FundingRound
InvestmentParticipation
Token
MarketObservation
TokenUnlock
CalendarEvent
NewsDocument
SourceEvidence
EntityAlias

2. 时间语义：
occurredAt
announcedAt
publishedAt
observedAt
recordedAt
validFrom
validTo
knowledgeAsOf

3. 金额和币种：
originalCurrency
originalAmount
reportingCurrency
conversionPolicy
fxSource
fxDate

4. 金融数据规则：
未披露金额不等于 0。
融资轮次总金额不等于某家机构的实际出资金额。
Market Cap 不等于 FDV。
Token Symbol 不能作为全局唯一标识。
当前项目分类不能直接用于历史时点分析。
历史分析必须防止 look-ahead bias。
不同时间范围、数据截止时间和非完整年度必须明确标注。

────────────────────────────────
五、10 章目录
────────────────────────────────

第 1 章：项目定位、当前架构与目标架构
第 2 章：金融领域数据模型与语义层
第 3 章：Text2SQL Agent 总体设计
第 4 章：RAG Preparation Plane
第 5 章：ACL-first Online RAG 与 Agentic Retrieval
第 6 章：Semantic Plan、SQL 生成、验证、纠错与执行
第 7 章：Data Agent 总体设计
第 8 章：Evidence、金融计算与专业报告
第 9 章：A2A Agent 通信设计
第 10 章：生产化、评测、演进路线与面试表达

整体篇幅分配要求：

第 1 章控制在总篇幅的 8% 左右。
第 2 章控制在 10% 左右。
第 3 至第 6 章是 Text2SQL 和 RAG 核心，占 40% 至 45%。
第 7 至第 8 章是 Data Agent 核心，占 25% 至 30%。
第 9 章占 8% 至 10%。
第 10 章占 10% 至 12%。

────────────────────────────────
六、各章必须覆盖的内容
────────────────────────────────

第 1 章：项目定位、当前架构与目标架构

必须回答：
1. 该金融投资数据平台解决什么业务问题。
2. 为什么普通 Text2SQL 不足以完成专业投资研究。
3. 当前系统真实实现到了什么程度。
4. 当前最大技术缺口是什么。
5. 为什么要拆分 Data Agent 和 Text2SQL Agent。
6. 各 Agent 和 Tool 的职责与禁止事项。
7. 当前架构如何演进成目标架构。

必须产出：
1. 执行摘要。
2. 当前架构 Mermaid 图。
3. 目标总体架构 Mermaid 图。
4. 当前与目标完整调用时序。
5. 【已实现】【部分实现】【演进方案】矩阵。
6. Agent 职责矩阵。
7. 一个端到端金融分析案例。
8. 30 秒和 2 分钟面试讲稿。
9. 8 个面试官追问和参考回答。

第 2 章：金融领域数据模型与语义层

必须回答：
1. 项目、机构、基金、人物、融资轮次、Token 和市场数据如何建模。
2. 如何建模机构参与融资轮次的多对多关系。
3. 如何处理项目别名、机构改名、Token Symbol 重名。
4. 如何处理事件时间、公告时间、发布时间、系统收录时间和历史有效时间。
5. 如何通过 knowledgeAsOf 防止前视偏差。
6. 如何处理未披露金额、估算值、币种和汇率。
7. 如何定义指标、维度、关系和默认过滤。
8. 如何对语义模型进行版本发布。

必须产出：
1. ER Mermaid 图。
2. 核心表或领域实体说明。
3. TypeScript 数据合同。
4. MetricDefinition 示例。
5. SemanticRelationship 示例。
6. CurrencyPolicy 和 TemporalContext。
7. PublishedBundle。
8. 至少 8 个金融数据陷阱及解决方案。
9. 技术取舍与验收指标。
10. 2 分钟面试讲稿和 8 个追问。

第 3 章：Text2SQL Agent 总体设计

必须回答：
1. Text2SQL Agent 的职责和非职责。
2. Data Agent 应怎样构造 FinancialQueryRequest。
3. 为什么输入不能只有自然语言。
4. 如何解析实体、指标、维度、时间、币种和结果形状。
5. 如何在 Semantic Compile、Trusted Query、Ad-hoc SQL、Clarify/Reject 之间路由。
6. Text2SQL Agent 的 Typed State 和节点如何设计。
7. 哪些步骤使用 LLM，哪些步骤必须确定性执行。
8. 为什么最终输出是 QueryEvidenceArtifact，而不是自然语言投资观点。

必须产出：
1. Text2SQL Agent Graph。
2. FinancialQueryRequest。
3. QuestionFrame。
4. Text2SQL State。
5. Query Route 决策表。
6. Tool 列表及输入输出。
7. QueryEvidenceArtifact。
8. 正常路径、澄清、权限拒绝、成本超限、执行失败路径。
9. 有界循环和终止条件。
10. 技术取舍、评测指标、2 分钟讲稿和 8 个追问。

第 4 章：RAG Preparation Plane

必须回答：
1. Schema、业务术语、指标、关系、SQL 资产和值索引如何离线构建。
2. 权威 Catalog 和检索索引各自保存什么。
3. 为什么不能将所有资产混入一个无类型向量索引。
4. 如何进行 Schema Introspection、Normalization 和 Drift Detection。
5. Typed Chunk 如何设计。
6. Lexical 和 Dense Index 如何建设。
7. Relationship Graph 是否需要图数据库，什么阶段才需要。
8. Trusted Query Asset 如何测试、审核和发布。
9. Catalog、Semantic、Index 和 Policy 版本如何原子切换。
10. 如何处理敏感列和高基数值索引。

必须产出：
1. Preparation Plane Mermaid 图。
2. Ingestion Pipeline。
3. SchemaCatalog 数据模型。
4. Typed RagChunk 数据模型。
5. TrustedQueryAsset 数据模型。
6. IndexVersion 和 PublishedBundle 关系。
7. PostgreSQL FTS、pgvector、Elasticsearch/OpenSearch、独立图数据库的选型比较。
8. P0、P1、P2 分阶段存储建议。
9. 发布、回滚和 Schema Drift 流程。
10. 质量指标、2 分钟讲稿和 8 个追问。

第 5 章：ACL-first Online RAG 与 Agentic Retrieval

必须回答：
1. 为什么权限必须在检索前生效。
2. 如何根据 Tenant、Workspace、Datasource、Table、Column 和 Policy Version 裁剪候选空间。
3. Query Rewrite 和 Slot Extraction 如何工作。
4. Lexical、Dense、Relationship、Value、Trusted Query 如何分别召回。
5. 不同资产类型是否应独立排序。
6. RRF 在哪些范围内使用，何时不适合。
7. 如何执行 Domain Coverage 和 Primary Rerank。
8. Optional Model Rerank 如何设置超时、预算和降级。
9. Evidence Critic 如何判断证据覆盖、冲突和版本一致性。
10. 什么时候允许 Retrieval Rewrite，什么时候要求用户澄清。
11. 如何防止 RAG Prompt Injection。
12. SelectedEvidence 如何注入 Planner 和 SQL Generator。

必须产出：
1. Online Retrieval Mermaid 图。
2. ACL-first 时序。
3. SelectedEvidence。
4. Retrieval Candidate 类型。
5. Evidence Critic 输出合同。
6. 一次正常召回和一次证据不足案例。
7. 最多一次 Retrieval Rewrite 的状态机。
8. 缓存键设计。
9. Recall@K、MRR、nDCG、stale rate、ACL violation、latency 指标。
10. 技术取舍、2 分钟讲稿和 8 个追问。

第 6 章：Semantic Plan、SQL 生成、验证、纠错与执行

必须回答：
1. 如何由 QuestionFrame 构造 SemanticQuery。
2. 哪些查询由 Semantic Compiler 确定性生成 SQL。
3. Trusted Query 如何做类型化参数绑定。
4. 哪些长尾查询才进入 Constrained SQL Agent。
5. 是否应该生成 SQL AST/IR，而不是直接返回字符串。
6. 如何处理 MySQL、PostgreSQL、SQLite、CSV/Excel 等方言差异。
7. SQL 生成后需要哪些验证器。
8. 如何检查 Join Fan-out、指标粒度、默认过滤、时间、币种和未披露值。
9. 如何使用 EXPLAIN、Dry-run、Statement Timeout 和扫描量预算。
10. 为什么 LIMIT 不能作为主要成本控制。
11. 如何将结构化 ValidationReport 交给 Corrector。
12. 为什么最多修复两次。
13. 如何设计物理只读 Query Gateway。
14. 如何校验执行结果和回答数字。

必须产出：
1. SemanticQuery DSL。
2. SQL Generation/Compile Mermaid 图。
3. Unified Validation Pipeline。
4. ValidationReport。
5. SQL Repair 状态机。
6. Query Gateway 接口。
7. Dialect Adapter。
8. 一个从自然语言到 QueryEvidenceArtifact 的完整示例。
9. 正常、语法错、字段错、Join 错、权限拒绝、成本超限案例。
10. 评测指标、2 分钟讲稿和 8 个追问。

第 7 章：Data Agent 总体设计

必须回答：
1. Data Agent 为什么是 Investment Research Supervisor，而不是超级 Prompt。
2. 如何构造 ResearchFrame。
3. 如何把复杂问题拆成 AnalysisPlan。
4. 如何选择 Text2SQL、Research、Market、Graph、Event 和 Quant 能力。
5. 哪些任务可以并行，哪些有依赖。
6. 如何向下游传递时间范围、knowledgeAsOf、币种和结果需求。
7. 如何设置 Deadline、Budget、Cancellation 和 Agent 调用次数。
8. Evidence 不足时如何重新规划。
9. 哪些情况必须向用户澄清。
10. Data Agent 为什么不能直接写 SQL或直接访问数据库。

必须产出：
1. Data Agent Graph。
2. ResearchFrame。
3. AnalysisPlan。
4. AgentTask。
5. Capability Registry。
6. Task Dependency DAG。
7. 并行与串行调度示例。
8. 最多一次 Replan 的条件。
9. 一个复杂问题的完整任务拆解。
10. 技术取舍、评测指标、2 分钟讲稿和 8 个追问。

第 8 章：Evidence、金融计算与专业报告

必须回答：
1. 所有 Agent 结果如何进入 Evidence Ledger。
2. Evidence 如何携带来源、时间、主体、质量和限制。
3. 如何区分 Fact、Calculation、Inference 和 Opinion。
4. 如何处理数据库、新闻和行情源之间的冲突。
5. 如何定义来源优先级和交叉验证策略。
6. 哪些计算必须使用确定性 Quant Tools。
7. 如何保证报告数字与 Evidence 一致。
8. 如何检查单位、百分比、排序、时间范围和非完整年度。
9. 如何标记数据缺失和不确定性。
10. 如何避免把事实分析写成个性化投资建议。

必须产出：
1. Evidence Ledger Mermaid 图。
2. EvidenceArtifact。
3. CalculationArtifact。
4. AnalysisClaim。
5. Claim-Evidence 关系图。
6. Numeric Verifier。
7. Conflict Resolution 流程。
8. 专业金融报告模板。
9. 一个 Fact、Calculation、Inference 和 Opinion 的完整示例。
10. Claim Support Rate、Numeric Consistency、Citation Coverage 等指标。
11. 2 分钟讲稿和 8 个追问。

第 9 章：A2A Agent 通信设计

必须先通过互联网核验当前最新的 A2A 官方规范和官方 SDK 状态。优先引用 A2A 官方规范和官方 GitHub，不要根据记忆硬编码协议版本。

必须回答：
1. 什么情况下使用 A2A，什么情况下使用进程内函数、RPC、MCP 或消息队列。
2. Data Agent 与 Text2SQL Agent 为什么适合 A2A。
3. Agent Card、Skill、Message、Task 和 Artifact 分别是什么。
4. Task 的状态生命周期如何映射到 Text2SQL。
5. 如何使用 HTTP+JSON、SSE 或 gRPC。
6. 如何实现 INPUT_REQUIRED 和 AUTH_REQUIRED。
7. 大型查询结果如何使用对象存储 URI 交付。
8. 如何传递调用服务和最终用户双重身份。
9. 如何使用 OAuth Token Exchange 或 On-Behalf-Of。
10. 如何处理幂等、重试、取消、Deadline、断线重连和 Task Store。
11. 如何进行 Agent Card 签名、Endpoint Allowlist 和版本兼容。
12. NestJS 如何实现 A2A Client 和 Server Adapter。

必须产出：
1. A2A 拓扑图。
2. Agent Card 示例。
3. FinancialQueryRequest 的 A2A Message 示例。
4. QueryEvidenceArtifact 的 A2A Artifact 示例。
5. Task 生命周期图。
6. OAuth 身份委托图。
7. TypeScript Client/Server 接口。
8. A2A、MCP、RPC、Kafka/NATS 的对比表。
9. 错误、重试和取消矩阵。
10. 2 分钟讲稿和 8 个追问。

第 10 章：生产化、评测、演进路线与面试表达

必须回答：
1. 多 Agent 金融数据系统有哪些主要威胁。
2. 如何设计 OIDC/JWT、Tenant、Workspace、Domain、Table、Column、Row 和 Result 权限。
3. 如何防止 Prompt Injection、RAG Injection、SQL 绕过、Artifact 篡改和缓存泄露。
4. 如何设计跨 Agent Trace 和 Run Replay。
5. 如何区分 Planning、Retrieval、SQL、Execution、Evidence 和 Report 错误。
6. 如何评测 Text2SQL、RAG、Data Agent 和 A2A。
7. 如何建设 Golden Dataset。
8. 如何执行 Offline Eval、Replay、Shadow 和 Canary。
9. 并发从 50、500 到 5000 个活跃请求时如何演进。
10. 当前 NestJS/LangGraph 项目如何按 P0 至 P4 改造。
11. 哪些复杂能力当前不应该优先建设。
12. 面试时如何讲清楚个人负责内容、技术取舍和真实边界。

必须产出：
1. Threat Model。
2. 纵深防御图。
3. OpenTelemetry Trace 图。
4. Run Replay 数据模型。
5. Text2SQL、RAG、Data Agent、A2A 分层评测表。
6. Offline/Shadow/Canary 发布流程。
7. 50/500/5000 并发演进表。
8. P0 至 P4 路线图。
9. 当前模块到目标模块迁移表。
10. 30 秒、2 分钟、5 分钟完整面试讲稿。
11. 20 个综合追问和参考回答。
12. 面试中不能过度声称的事项。

────────────────────────────────
七、每章统一输出结构
────────────────────────────────

每一章按照以下结构输出：

1. 本章执行摘要
2. 本章要解决的业务和技术问题
3. 当前实现与事实边界
4. 当前设计的主要问题
5. 目标设计
6. 核心架构或流程
7. 核心数据合同
8. 正常路径
9. 异常、拒绝和降级路径
10. 安全、性能、成本和可观测性影响
11. 技术选型与取舍
12. 可量化评测和验收指标
13. 从当前代码到目标设计的改造步骤
14. 2 分钟面试讲稿
15. 8 个面试官追问与参考回答

章节 1 和章节 10 可以根据内容调整结构，但必须保留事实边界、技术取舍、验收指标和面试讲稿。

────────────────────────────────
八、写作质量要求
────────────────────────────────

1. 使用中文。
2. 面向高级后端、AI Platform、Agent 架构和金融数据平台岗位。
3. 内容必须具体，不能停留在“引入 RAG、加强安全、增加缓存”这种空泛层面。
4. 每个核心组件都回答：
   为什么需要；
   输入是什么；
   输出是什么；
   正常流程是什么；
   失败怎么办；
   如何验证；
   有什么代价。
5. 使用准确的数据库、分布式系统、RAG、Agent 和金融数据术语。
6. 适当使用 Markdown 标题、表格、TypeScript、JSON 和 Mermaid。
7. Mermaid 必须语法清晰，不要在一张图中堆叠过多节点。
8. TypeScript Interface 应能落到 NestJS 工程中，而不是伪代码式字段列表。
9. 不要虚构当前系统已有的生产能力。
10. 不要虚构准确率、QPS、成本下降比例、线上事故或用户规模。
11. 没有依据的内容标记为【待验证】。
12. 涉及 A2A、MCP、数据库行为、框架版本、SDK 和外部标准时，查询当前最新官方资料，并引用官方来源。
13. 不要声称该项目就是 RootData，统一使用“类似 RootData 业务形态的金融投资数据平台”。
14. 不要使用无限循环 Agent。
15. 默认采用一个 Typed Orchestrator 加专业工具；只有独立部署和独立生命周期的专业 Agent 才通过 A2A 协作。
16. 每章约 2500 至 4500 个中文字符；核心章节 3 至 8 可以适度更长。
17. 避免不同章节大段重复。需要引用前文时使用“见第 X 章”并补充本章特有内容。
18. 所有合同名称必须与本 Prompt 的统一术语一致。
19. 最终材料既能用于架构评审，也能直接用于技术面试。

────────────────────────────────
九、生成方式
────────────────────────────────

每次只生成一章，不要一次输出十章。

当前回复直接生成：

第 1 章《项目定位、当前架构与目标架构》

完成后停止，等待我输入“继续第 2 章”。

后续收到“继续第 N 章”时：
1. 只生成对应章节。
2. 继承前文已经确定的术语、合同和架构边界。
3. 不重新生成目录。
4. 不重复其他章节已有的大段内容。
5. 若发现前文章节存在冲突，在章节开头增加“前文一致性修正”，明确指出并修正。
```

---

# 后续逐章命令

总控 Prompt 生成第 1 章后，依次发送：

```text
继续第 2 章。严格继承第 1 章已经确定的项目定位和职责边界。
```

```text
继续第 3 章。重点展开 Text2SQL Agent 的输入输出合同、四路查询路由、Typed State 和 QueryEvidenceArtifact。
```

```text
继续第 4 章。重点展开 RAG Preparation Plane、版本化 Catalog、Typed Chunk、索引构建和原子发布。
```

```text
继续第 5 章。重点展开 ACL-first Hybrid Retrieval、Value Grounding、Evidence Critic 和有界 Agentic Retrieval。
```

```text
继续第 6 章。重点展开 SemanticQuery、确定性编译、SQL AST、Unified Validator、成本控制和最多两次纠错。
```

```text
继续第 7 章。重点展开 Data Agent 的 ResearchFrame、AnalysisPlan、AgentTask、并行调度和有限重规划。
```

```text
继续第 8 章。重点展开 Evidence Ledger、Claim 分类、Quant Tools、Numeric Verification 和专业金融报告。
```

```text
继续第 9 章。先核验当前最新 A2A 官方规范，再展开 Agent Card、Task、Artifact、Streaming、身份委托和 NestJS 实现。
```

```text
继续第 10 章。完成生产安全、Trace、Replay、评测、并发、P0-P4 演进路线以及完整面试讲稿。
```

---

# 最终合并与一致性审校 Prompt

十章都生成完成后，将所有章节放在同一个对话中，再复制下面的 Prompt：

```text
请对已经生成的十章材料做一次 Principal Architect 级别的全局审校，并输出最终可用于面试的完整版本。

审校目标：

1. 检查所有章节是否严格区分：
   【已实现】
   【部分实现】
   【演进方案】
   【待验证】

2. 检查是否错误地将以下能力描述为已经上线：
   完整 RAG；
   Semantic Layer；
   Data Agent；
   A2A；
   生产级 OIDC；
   完整列行权限；
   高并发能力；
   已验证的准确率提升。

3. 检查职责是否一致：
   Data Agent 负责研究规划和金融分析；
   Text2SQL Agent 负责结构化查询和举证；
   Quant Tools 负责确定性计算；
   A2A 负责 Agent 间任务协作；
   MCP/RPC 负责工具访问。

4. 检查以下合同在十章中字段和命名是否一致：
   PublishedBundle
   SelectedEvidence
   QuestionFrame
   SemanticQuery
   ValidationReport
   FinancialQueryRequest
   QueryEvidenceArtifact
   ResearchFrame
   AnalysisPlan
   AgentTask
   EvidenceArtifact
   CalculationArtifact
   AnalysisClaim
   FinancialAnalysisReport

5. 检查金融语义是否一致：
   knowledgeAsOf；
   announcedAt；
   occurredAt；
   publishedAt；
   币种转换；
   未披露金额；
   总融资额与机构出资额；
   Market Cap 与 FDV；
   实体别名；
   历史分类；
   前视偏差。

6. 删除重复论述，但不要删除必要的章节上下文。

7. 检查所有 Mermaid 图的节点名称、方向和职责是否一致。

8. 检查所有 TypeScript Interface 是否可以在 NestJS/TypeScript 项目中使用：
   字段命名一致；
   枚举合理；
   可选字段合理；
   不使用无法序列化的抽象类型；
   跨服务合同有 schemaVersion。

9. 检查安全设计是否为纵深防御，而不是依赖 Prompt：
   OIDC/JWT；
   OAuth Token Exchange；
   ACL-first Retrieval；
   SQL AST；
   数据库只读账号；
   Cost Guard；
   Result Protection；
   Audit；
   Artifact Checksum。

10. 检查所有外部技术事实是否引用当前最新官方资料。
    A2A 和 MCP 优先使用官方规范。
    数据库行为优先使用官方数据库文档。
    不确定的版本信息标记为【待验证】。

11. 检查面试表达：
    项目背景清楚；
    个人技术贡献明确；
    当前不足诚实；
    目标设计有落地路线；
    没有堆砌组件；
    每个取舍都说明收益和代价。

最终输出：

A. 修正后的完整目录。
B. 统一术语表。
C. 修正后的十章完整正文。
D. 一张最终总体架构图。
E. 一张端到端调用时序图。
F. 当前实现与目标方案总矩阵。
G. P0-P4 最终演进路线。
H. 30 秒、2 分钟和 5 分钟项目讲稿。
I. 30 个综合面试追问和参考回答。
J. 一页“面试中不能过度声称的事项”。
K. 一页“白板画图顺序与讲解顺序”。

不要新增未经事实基线支持的当前能力、线上指标或生产经验。
```

---

# 推荐生成顺序

虽然目录从第 1 章开始，但为了尽快形成可面试的核心内容，可以按下面顺序让 ChatGPT Pro 生成：

```text
第 1 章
 -> 第 3 章
 -> 第 4 章
 -> 第 5 章
 -> 第 6 章
 -> 第 7 章
 -> 第 8 章
 -> 第 2 章
 -> 第 9 章
 -> 第 10 章
```

这样最先完成的是你的技术主线：

```text
项目为什么做
 -> Text2SQL Agent 怎么设计
 -> RAG 怎么建设
 -> SQL 如何可靠生成和执行
 -> Data Agent 如何规划和分析
 -> Evidence 如何保证报告可信
```

不过，如果使用上面的总控 Prompt 在同一个对话中连续生成，仍建议按照第 1 到第 10 章顺序，跨章节术语会更稳定。
