# AI 陪伴系统 Agent Runtime 设计说明

面向：LD / Boss
目的：说明这套 AI 陪伴系统为什么不能只做成“用户消息 -> MQ -> Agent -> 回复”，而应该设计成一套可抢占、可恢复、可审计、可持续沉淀记忆的 Agent Runtime。

---

## 一、结论先行

这套设计的核心不是“多 Agent 很炫”，也不是“引入一个 Event Bus”。真正要解决的是 AI 陪伴产品最关键的用户体验问题：

1. 用户发消息后，系统要马上有反应，不能长时间无反馈。
2. 用户中途改口、追问、打断时，新意图必须立刻生效。
3. 大模型、记忆检索、搜索、图片生成等慢任务不能串行阻塞主对话。
4. 旧任务即使后来完成，也不能把过期结果继续展示给用户。
5. 陪伴产品必须能长期记住用户，但记忆要可追溯、可纠错、可删除。

因此，我们推荐把系统设计成：

```text
用户输入
  -> TurnController 识别新一轮意图并抢占旧任务
  -> Event Store 记录事实
  -> Outbox 可靠投递
  -> Work Bus 分发给不同 Agent 并行处理
  -> Result Gate 校验结果是否仍然有效
  -> Client Projection 投影成前端可见事件
  -> SSE / WebSocket 实时返回给用户
  -> Reflection Agent 后台沉淀长期记忆
```

一句话概括：

> Event Bus 在这里不是普通消息队列，而是 AI 陪伴系统的运行时中枢，负责快速响应、任务抢占、多 Agent 并行、结果隔离、前端投影和长期记忆沉淀。

---

## 二、为什么不能只做普通 MQ

普通 MQ 解决的是“把任务从 A 投递给 B”。但 AI 陪伴系统面对的是连续对话，用户的意图会随时变化。

如果只做成普通 MQ，会出现几个典型问题：

| 问题 | 用户感受 | 后果 |
| --- | --- | --- |
| LLM 推理慢 | 用户发完消息后长时间没反馈 | 陪伴感下降，像在等工单 |
| 用户打断旧回答 | 系统还在继续回答上一个问题 | 用户觉得 AI 没听懂 |
| 多个 Agent 并行返回 | 旧搜索、旧记忆、旧图片混入新对话 | 对话污染，信任下降 |
| 前端直接订阅内部事件 | 页面出现大量执行细节 | 体验混乱 |
| 记忆直接自动写入 | 把临时情绪或错误推断记成长期事实 | 陪伴关系变得冒犯或不可靠 |

所以 Event Bus 不能只承担“异步投递”，还必须承担运行时治理能力：

- 哪个用户意图是当前有效意图。
- 哪些任务应该继续，哪些任务应该失效。
- 哪些结果可以展示，哪些结果只能归档。
- 哪些记忆可以写入，哪些记忆需要候选、审核或用户确认。
- 前端应该看到什么，而不是看到所有内部事件。

---

## 三、设计理念

### 1. 用户体验优先：先响应，再慢慢完成

AI 陪伴产品里，“马上被回应”比“几秒后一次性给出完整答案”更重要。

因此系统要拆成快车道和慢车道：

| 车道 | 目标 | 做什么 |
| --- | --- | --- |
| 快车道 | 100ms-300ms 内有反馈 | 创建 turn、返回 ACK、显示正在理解或正在处理 |
| 中速车道 | 300ms-1000ms 内补上下文 | 召回最近对话、基础记忆、用户偏好 |
| 慢车道 | 不阻塞前台 | 搜索核验、图片生成、长期记忆总结、关系状态更新 |

用户看到的是：

```text
“我明白，我先切到你这个新问题。”
“我先继续陪你聊，图片在后台生成，完成后发给你。”
“我先基于已有上下文回答，搜索结果回来后再补充。”
```

这比让用户盯着空白界面等待大模型完整推理更符合陪伴产品的体验。

### 2. 打断不是简单 cancel，而是版本隔离

用户发来新消息时，我们不能只依赖取消 HTTP 请求。因为旧任务可能已经在：

- LLM 推理中。
- 搜索资料中。
- 图片生成中。
- Memory Agent 抽取记忆中。
- 前端已经收到部分 token。

真正可靠的方式是给每一轮用户输入创建新的 `turn_id` 和 `intent_version`。

当新消息到来：

```text
旧 turn -> 标记为 superseded
新 turn -> 成为 active_turn
intent_version -> 递增
旧任务 -> 允许继续完成，但结果不能再展示给用户
```

也就是说，我们不强求所有旧任务物理停止，而是保证旧任务的输出在逻辑上失效。

这是 AI 陪伴系统可打断体验的核心。

### 3. 所有结果必须过 Result Gate

每个 Agent 返回结果前，都要检查：

- 当前会话的 `active_turn_id` 是否还是自己所属的 turn。
- 当前 `intent_version` 是否一致。
- 当前 run 是否已经被 supersede / cancel。

只有通过 Result Gate 的结果，才能进入前端事件流。

这样可以保证：

- 旧 LLM 不能继续吐 token 给用户。
- 旧 Research 不能把过期证据混入新回答。
- 旧 Media 不能自动把过期图片展示出来。
- 旧 Memory 抽取结果不能直接写入长期记忆。

这个机制决定了产品在高并发、多 Agent、用户频繁打断时是否可靠。

### 4. 内部事件和前端事件必须分开

内部系统会产生大量事件：

```text
memory.retrieve.requested
memory.retrieve.completed
research.search.requested
media.generate.progress
reflection.summarize.completed
```

这些事件是给系统看的，不应该直接给用户看。

前端应该只看到整理后的 `client_event`：

```text
client.ack
client.typing.started
client.message.delta
client.message.completed
client.task.progress
client.image.ready
client.warning
client.error
```

这样做有两个好处：

1. 产品体验稳定，用户看到的是“对话”和“任务进度”，不是后端流水账。
2. 后端可以自由调整 Agent、队列和事件类型，不会直接破坏前端协议。

### 5. 记忆系统不是普通 RAG

普通 RAG 解决的是：

```text
用户问问题 -> 查文档 chunk -> 拼上下文 -> 回答
```

AI 陪伴系统要解决的是：

- 用户是谁。
- 用户最近在关注什么。
- 用户长期目标有没有变化。
- 用户喜欢什么沟通方式。
- 哪些记忆已经过期。
- 哪些记忆不能随便提。
- 这条记忆来自哪次对话。
- 用户纠错后，旧记忆如何失效。

所以我们需要的是 Memory System，而不是简单向量库。

推荐的记忆层次：

| 记忆层 | 作用 |
| --- | --- |
| Raw Episode | 保存原始对话片段，保证可追溯、可删除、可重新抽取 |
| Working Memory | 当前会话短期状态，例如最近几轮、当前任务、等待中的工具 |
| Episodic Memory | 重要事件记忆，例如用户正在设计某个产品 |
| Semantic Memory | 稳定事实，例如用户长期目标、项目背景 |
| Preference Memory | 用户偏好，例如回答风格、技术深度 |
| Relationship Memory | 陪伴关系状态，例如信任边界、沟通节奏、近期关注点 |
| Memory Summary | 下次对话可快速注入的用户状态摘要 |

长期记忆不能每句话都写，也不能直接由主对话 Agent 随意写入。推荐流程是：

```text
OBSERVE  原始消息入库
EXTRACT  后台抽取候选记忆
POLICY   判断是否敏感、是否值得保存、是否冲突
MERGE    合并重复记忆，处理过期和纠错
STORE    写入长期记忆
INJECT   下次对话按需召回
```

这能保证陪伴系统既“记得住”，又“不乱记”。

---

## 四、推荐架构

整体架构如下：

```text
用户消息 / 打断 / 上传图片 / 工具确认
        |
        v
Interaction Gateway
        |
        |-- 立即 ACK
        v
TurnController
        |
        |-- 创建新 turn_id
        |-- intent_version + 1
        |-- supersede 旧 active turn
        v
Event Store + Outbox
        |
        v
Durable Work Bus
        |
        |-- Conversation Agent：主陪伴、组织回答、流式输出
        |-- Memory Agent：记忆召回、候选抽取、冲突处理
        |-- Research Agent：搜索、核验、证据包
        |-- Media Agent：图片、语音、多媒体异步任务
        |-- Reflection Agent：后台总结、长期记忆沉淀
        |-- Safety / Policy Agent：安全、敏感记忆、工具审批
        v
Result Gate
        |
        |-- 检查 active_turn_id / intent_version / run status
        v
Client Projection
        |
        v
SSE / WebSocket
```

### 核心组件职责

| 组件 | 职责 |
| --- | --- |
| Interaction Gateway | 接收用户输入、上传、确认、取消等交互 |
| TurnController | 管理当前有效意图，负责打断和抢占 |
| Event Store | 记录系统事实，支持回放、审计和排查 |
| Outbox | 保证数据库写入和消息投递一致 |
| Work Bus | 分发慢任务，支持重试和并行 |
| Agent Workers | 各自处理对话、记忆、搜索、媒体、总结等任务 |
| Result Gate | 防止旧任务污染新对话 |
| Client Projection | 把内部事件转换成用户可理解的前端事件 |
| Memory System | 管理短期记忆、长期记忆、偏好和关系状态 |

---

## 五、需要哪些 Agent

第一版不要追求十几个 Agent。建议按产品价值逐步建设。

### MVP 必需 Agent

| Agent | 价值 | 第一版能力 |
| --- | --- | --- |
| Fast Response / Router | 保证用户马上有反馈 | 快速 ACK、轻量意图判断、分发任务 |
| Conversation Agent | 用户感知到的主陪伴能力 | 流式回答、整合上下文、必要时追问 |
| Memory Agent | 陪伴产品的核心差异化 | 召回最近上下文、用户偏好、基础长期记忆 |
| Reflection Agent | 后台沉淀长期记忆 | 对话后总结，生成 memory candidate |

### 后续增强 Agent

| Agent | 适用场景 |
| --- | --- |
| Research Agent | 事实核验、外部资料检索、证据包生成 |
| Media Agent | 图片、语音、视频等慢任务 |
| Safety / Policy Agent | 敏感内容、记忆审批、高风险工具确认 |

重点不是 Agent 数量，而是每个 Agent 是否有清晰边界：

- Conversation Agent 负责“怎么和用户说”。
- Memory Agent 负责“该记住什么、该召回什么”。
- Research Agent 负责“事实依据是什么”。
- Reflection Agent 负责“对话结束后沉淀什么”。
- Policy Agent 负责“什么不能直接做”。

---

## 六、关键技术决策

### 1. Postgres Event Store 是事实来源，MQ 只是投递层

用户消息进入时，应在一个数据库事务里写入：

```text
conversation_turn
conversation.active_turn_id
event_log
outbox
```

这样可以避免两类经典问题：

```text
数据库写成功，但 MQ 投递失败
MQ 投递成功，但数据库事务回滚
```

MQ 可以替换，事件事实不能丢。

### 2. Redis Streams 可以作为 MVP Work Bus

MVP 阶段可以用 Redis Streams，因为它支持：

- append-only stream。
- consumer group。
- ack。
- pending message 重试。
- 实现成本低。

但不要用裸 Redis Pub/Sub 承担可靠任务队列。Pub/Sub 更适合在线通知，不适合作为可恢复、可审计、可重试的事实链路。

生产增强阶段可以按规模替换为：

- NATS JetStream。
- RocketMQ。
- Kafka。

这类替换不应影响上层 Agent 设计，因为 Agent 依赖的是事件协议，不是具体 MQ。

### 3. SSE 更适合第一版文本流式输出

第一版推荐用 SSE 承载前端文本流和任务进度：

- 简单。
- 支持 `Last-Event-ID` 断线续传。
- 很适合单向 token streaming。
- 比 WebSocket 更容易做网关、回放和排查。

如果后续需要强双向实时交互，再引入 WebSocket。

### 4. 事件 Envelope 必须统一

所有内部事件都要带统一信封，例如：

```text
event_id
event_type
conversation_id
turn_id
run_id
user_id
correlation_id
causation_id
intent_version
priority
idempotency_key
ttl_ms
deadline_at
payload
created_at
```

这些字段的价值不是“规范好看”，而是为了实现：

- 全链路追踪。
- 幂等消费。
- 结果隔离。
- 超时降级。
- 审计回放。
- 后续扩容。

---

## 七、MVP 落地建议

### 第一阶段：快响应和可打断

目标：先保证用户体验底座成立。

必做能力：

- 用户消息进入后 300ms 内返回 `client.ack`。
- 每个 conversation 只有一个 `active_turn`。
- 新消息自动 supersede 旧 turn。
- Conversation Agent 流式输出前必须检查 Result Gate。
- 旧 turn 的结果不能进入 `client_event`，只能归档或隔离。

验收标准：

```text
用户连续发 3 条消息，只有最后一条可以继续流式输出；
前两条即使后台任务完成，也不会再污染前端对话。
```

### 第二阶段：基础记忆系统

目标：让系统开始具备陪伴产品的长期感。

必做能力：

- 原始消息写入 Raw Episode。
- Memory Agent 返回最近上下文和基础用户偏好。
- Reflection Agent 在后台生成候选记忆。
- 长期记忆先进入 candidate，不直接全自动写入。
- 支持用户纠错后让旧记忆 deprecated 或设置 `valid_to`。

验收标准：

```text
系统能记住用户长期目标和稳定偏好；
但不会把临时闲聊、错误推断、敏感信息直接写成长期事实。
```

### 第三阶段：多 Agent 并行

目标：让主对话、记忆、搜索、媒体任务并行，而不是串行等待。

必做能力：

- Conversation Agent 可以先基于已有上下文回复。
- Memory Agent 迟到后不会打断当前输出。
- Research Agent 返回 evidence pack，由主 Agent 决定如何合并。
- Media Agent 用 `client.task.progress` 展示进度。

验收标准：

```text
搜索、记忆、图片等慢任务不会阻塞陪伴聊天；
慢任务完成后也必须经过 Result Gate 再展示。
```

### 第四阶段：生产增强

目标：支撑更高并发、更复杂业务和更强合规要求。

可增强方向：

- Redis Streams 替换为 NATS JetStream / RocketMQ / Kafka。
- Event Store 分区和归档。
- Memory Agent 独立扩容。
- Projection Worker 独立部署。
- Safety / Policy Agent 完整化。
- 记忆导出、删除、用户确认和审计后台。

---

## 八、业务价值

### 1. 用户体验更像“陪伴”，不是“问答工具”

快响应、可打断、任务进度可见，会让用户感觉系统一直在线、一直在听，而不是发完问题后等待一个黑盒结果。

### 2. 降低多 Agent 并行带来的混乱

没有 Result Gate 和 turn 版本隔离，多 Agent 越多，越容易出现旧结果污染新对话。这个架构先把隔离机制建好，后续加 Agent 才不会失控。

### 3. 记忆能力可以长期演进

通过 Raw Episode、Candidate、Policy、Merge、Summary 的链路，记忆系统可以逐步从“最近上下文”演进到“长期关系理解”，而不是一开始就把所有内容塞进向量库。

### 4. 技术选型可渐进，不被单一 MQ 绑定

第一版用 Postgres + Redis Streams + SSE 就能落地。后续如果用户量增长，可以替换消息中间件和拆分 Worker，但核心事件协议、Result Gate 和 Memory 流程可以保持稳定。

### 5. 方便排查、审计和复盘

Event Store、Outbox、Agent Run、Client Event、Quarantined Result 这些结构让系统具备可观测性。出现“为什么这句话发出来了”“为什么这条记忆被保存了”时，可以追溯来源。

---

## 九、主要风险与控制方式

| 风险 | 可能后果 | 控制方式 |
| --- | --- | --- |
| 架构过早复杂化 | MVP 迟迟出不来 | 第一版只做 Conversation / Memory / Reflection，其他 Agent 延后 |
| 只做 MQ 不做版本隔离 | 用户打断后旧结果继续出现 | 强制引入 `turn_id + intent_version + Result Gate` |
| 长期记忆自动乱写 | 用户觉得被误解或冒犯 | 先写 candidate，再做 policy / merge / 用户确认 |
| 前端直接消费内部事件 | UI 混乱，协议不稳定 | 内部事件统一投影成 `client_event` |
| 慢任务阻塞主回复 | 陪伴感下降 | 快车道 / 中速车道 / 慢车道拆分 |
| Agent 之间强耦合 | 后续难扩展 | 使用 topic / subscription 和统一事件协议 |
| MQ 投递与数据库状态不一致 | 丢任务或重复任务 | Event Store + Outbox + Agent Inbox 幂等 |

---

## 十、建议的第一版技术栈

```text
语言：Go
数据库：PostgreSQL
任务流：Redis Streams
前端实时：SSE
向量检索：pgvector
可靠投递：Outbox Pattern
幂等消费：Agent Inbox
运行状态：conversation / turn / agent_run / event_log / client_event
```

这个技术栈的优点是：

- 工程复杂度可控。
- 能快速验证核心体验。
- 后续可以平滑替换消息系统。
- 不会一开始就被复杂图数据库、多模型辩论、全自动记忆等能力拖慢。

---

## 十一、最终判断

这套方案的关键价值，不是“用了 Event Bus”，而是把 AI 陪伴系统从一次性问答改造成了一个可持续运行的 Agent Runtime。

它解决的是陪伴产品的底层问题：

- 用户随时会打断。
- 意图随时会变化。
- 慢任务必须并行。
- 旧结果不能污染当前对话。
- 长期记忆必须可靠、克制、可追溯。
- 前端体验必须稳定，而不是暴露后端复杂度。

最重要的 6 个设计原则：

1. `turn_id + intent_version` 是打断隔离核心。
2. 内部可靠事件流和前端实时流必须分开。
3. Agent 之间通过 topic / subscription 协作，不要互相强耦合。
4. 所有 Agent 输出前必须经过 Result Gate。
5. Postgres `event_log` 是事实来源，MQ 只是投递层。
6. 长期记忆必须异步、可追溯、可失效、可纠错。

最后一句话：

> 我们不是为了炫技去做多 Agent 和 Event Bus，而是为了让 AI 陪伴系统在真实用户连续对话、频繁打断、慢任务并行和长期记忆沉淀的场景下，依然保持稳定、可信、可演进。
