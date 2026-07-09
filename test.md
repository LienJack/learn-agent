# AI 陪伴系统 Event Bus、Agent 编排与记忆设计方案

这套设计的核心目标不是“多 Agent 很炫”，而是四件事：

1. 用户一发消息，系统马上有反应。
2. 用户中途打断时，新意图立刻抢占旧任务。
3. 大模型慢推理时，记忆、搜索、图片、总结等任务可以并行跑。
4. 旧任务即使后来完成，也不能污染新对话。

所以这里的 Event Bus 不应该只是 MQ，而应该是一个 **可抢占、可恢复、可审计、可投影到前端的 Agent Runtime 事件层**。

---

## 一、总体结论

推荐把 AI 陪伴系统做成下面这个形态：

```text
用户消息 / 打断 / 上传图片 / 工具确认
        |
        v
Interaction Gateway
        |
        |-- 立即 ACK：模板 / 小模型 / 快速意图识别
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
        |-- Research Agent：资料检索、事实核验、证据包
        |-- Media Agent：图片、语音、多媒体异步任务
        |-- Reflection Agent：后台总结、长期记忆沉淀
        |-- Safety/Policy Agent：安全、敏感记忆、工具审批
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

一句话概括：

> 用户输入先进入可抢占的 TurnController；慢任务通过 Event Bus 分发给多个 Agent；所有 Agent 输出都必须经过 Result Gate；前端只看到整理后的 client_event；对话结束后再异步沉淀长期记忆。

---

## 二、核心设计目标

| 目标 | 设计手段 |
| --- | --- |
| 快响应 | 用户消息进入后立即写入事件、创建 turn，并通过 `client.ack` 给前端反馈 |
| 能打断 | 每轮用户输入都有新的 `turn_id` 和 `intent_version`，新 turn 抢占旧 turn |
| 慢任务并行 | Memory / Research / Media / Reflection 不串行阻塞主回复 |
| 旧结果不污染 | 所有输出前经过 Result Gate，旧 turn 的结果只能丢弃或进入 quarantine |
| 可恢复 | 内部事件进入 append-only `event_log`，前端事件进入 `client_event`，支持回放 |
| 可审计 | 每个结果都有 `correlation_id` / `causation_id` / `source_event_id` |
| 记忆可追溯 | 长期记忆保留来源 episode、置信度、有效期和冲突状态 |

---

## 三、Event Bus 不是一个 MQ，而是四层事件系统

### 1. Control Bus：负责抢占

Control Bus 只处理最高优先级的控制事件：

```text
user.message.created
user.interrupt.requested
user.cancel.requested
user.confirmation.approved
user.confirmation.rejected
turn.started
turn.interrupted
turn.superseded
run.supersede.requested
```

它的职责是：

1. 创建新的 `turn_id`。
2. 更新 `conversation.active_turn_id`。
3. 递增 `intent_version`。
4. 标记旧 turn / run 为 `superseded`。
5. 立即产生前端 ACK。
6. 把慢任务投递到 Work Bus。

这里不要跑大模型，也不要做复杂检索。Control Bus 只服务一个目标：**让新意图尽快成为当前意图**。

### 2. Durable Work Bus：负责 Agent 干活

Work Bus 处理耗时任务：

```text
conversation.compose.requested
memory.retrieve.requested
memory.extract.requested
research.search.requested
media.generate.requested
reflection.summarize.requested
```

MVP 可以用 Redis Streams。它适合做 append-only 事件流和 consumer group 消费。生产增强可以考虑 NATS JetStream、RocketMQ 或 Kafka。

不要用裸 Redis Pub/Sub 承担可靠任务队列。Pub/Sub 更适合“在线实时通知”，不适合作为可恢复、可审计、可重试的事实链路。

### 3. Event Store + Outbox：负责事实

Postgres 里的 `event_log` 才是事实来源，MQ 只是投递层。

用户消息进入时，推荐一个事务里同时写：

```text
conversation_turn
conversation.active_turn_id
event_log
outbox
```

这样避免：

```text
数据库写成功，但 MQ 投递失败
MQ 投递成功，但数据库事务回滚
```

### 4. Client Realtime Bus：负责用户看见什么

前端不要直接订阅内部 Work Bus。内部事件太细、太乱，也包含很多用户不需要看见的执行细节。

内部事件应该投影成前端事件：

```text
client.ack
client.typing.started
client.message.delta
client.message.completed
client.task.progress
client.memory.hint
client.image.ready
client.warning
client.error
```

前端推荐用 SSE 做文本流式输出。每条 `client_event` 都有递增 ID，断线重连时通过 `Last-Event-ID` 从上次位置继续补发。

---

## 四、统一事件 Envelope

所有事件都必须有统一信封。不要让每个 Agent 自己发一套格式。

```json
{
  "event_id": "evt_01JZ...",
  "event_type": "memory.retrieve.requested",
  "event_version": 1,

  "conversation_id": "conv_123",
  "turn_id": "turn_008",
  "run_id": "run_mem_001",
  "user_id": "user_001",

  "correlation_id": "corr_abc",
  "causation_id": "evt_user_msg_001",
  "parent_event_id": "evt_router_001",

  "topic_type": "agent.memory",
  "topic_source": "conv_123/turn_008",

  "intent_version": 8,
  "run_epoch": 1,
  "priority": 60,

  "producer": "router",
  "target_agent": "memory",
  "idempotency_key": "memory.retrieve:conv_123:turn_008:v8",

  "ttl_ms": 30000,
  "deadline_at": "2026-07-01T12:00:30Z",

  "payload": {
    "query": "用户当前问题和最近上下文",
    "top_k": 8,
    "memory_types": ["working", "episodic", "semantic", "preference", "relationship"]
  },

  "created_at": "2026-07-01T12:00:00Z"
}
```

关键字段：

| 字段 | 作用 |
| --- | --- |
| `event_id` | 全局唯一，幂等基础 |
| `event_type` | 事件类型 |
| `conversation_id` | 会话隔离 |
| `turn_id` | 一轮用户输入隔离 |
| `run_id` | 某个 Agent 的执行实例 |
| `correlation_id` | 一次用户请求的全链路追踪 |
| `causation_id` | 当前事件由哪个事件触发 |
| `intent_version` | 打断隔离核心 |
| `run_epoch` | 同一 turn 内重试或重规划版本 |
| `priority` | 抢占调度 |
| `idempotency_key` | 防重复执行 |
| `ttl_ms` / `deadline_at` | 超时降级和过期丢弃 |

---

## 五、Topic 与 Stream 设计

### Topic 模型

推荐使用：

```text
Topic = topic_type + "/" + topic_source
```

例子：

```text
user.input/conv_123
turn.control/conv_123
agent.conversation/conv_123/turn_008
agent.memory/conv_123/turn_008
agent.research/conv_123/turn_008
agent.media/conv_123/turn_008
agent.reflection/conv_123
client.events/conv_123
```

这样每个 Agent 不需要知道其他 Agent 的地址，只需要订阅自己关心的 topic。

### Redis Streams MVP 拆分

```text
stream:control
stream:agent:conversation
stream:agent:memory
stream:agent:research
stream:agent:media
stream:agent:reflection
stream:client:events:{conversation_id}
stream:deadletter
```

Consumer Group：

```text
group:conversation-workers
group:memory-workers
group:research-workers
group:media-workers
group:reflection-workers
```

---

## 六、可打断设计：核心不是 cancel，而是版本隔离

用户打断时，不能只依赖取消 HTTP 请求。因为旧任务可能已经：

```text
LLM 正在推理
工具正在执行
图片正在生成
Research Agent 正在查资料
Memory Agent 正在抽取候选记忆
前端已经收到部分 token
```

正确做法是：

```text
新 turn 到来
  |
  |-- 旧 active_turn 标记为 superseded
  |-- 旧 agent_run 标记为 superseded / cancel_requested
  |-- 广播 turn.interrupted
  |-- 新 turn 立刻成为 active_turn
  |-- 旧 run 后续结果允许完成，但不能展示
  |-- 旧结果进入审计日志或 quarantined_result
```

### 用户发新消息时的流程

```text
T+0ms    Gateway 收到 user.message.created
T+20ms   TurnController 查询旧 active_turn
T+40ms   创建 turn_009，intent_version = 9
T+60ms   旧 turn_008 -> superseded
T+80ms   追加 turn.interrupted / turn.started
T+100ms  追加 client.ack
T+120ms  投递 conversation.compose.requested
T+150ms  投递 memory.retrieve.requested
```

前端感知是：

```text
“好的，我先切到你这个新问题。”
```

### 三种取消语义

| 类型 | 含义 | 场景 |
| --- | --- | --- |
| `pause` | 暂停，等待用户确认后继续 | 删除记忆、发外部消息、付款、敏感工具 |
| `cancel` | 尽力取消底层任务 | 图片生成、搜索、长推理 |
| `supersede` | 旧任务不一定停止，但结果失效 | 用户新消息打断旧回答 |

AI 陪伴最常见的是 `supersede`，不是硬取消。

### Result Gate

所有 Agent 结果要展示给用户前，都必须经过 Result Gate。

```go
func CanEmit(ctx RunContext) bool {
    active := conversationRepo.GetActiveTurn(ctx.ConversationID)

    if active.TurnID != ctx.TurnID {
        return false
    }

    if active.IntentVersion != ctx.IntentVersion {
        return false
    }

    if runRepo.IsSuperseded(ctx.RunID) {
        return false
    }

    return true
}
```

含义：

```text
旧 LLM 即使继续吐 token，也不能进入 client_event
旧 Research 即使查完，也不能影响新回答
旧 Media 即使生成图片，也不能自动展示
旧 Memory 抽取结果只能进入 candidate 或 quarantine
```

---

## 七、需要哪些 Agent

不要一开始就做十几个 Agent。MVP 先做“快响应 + 主对话 + 记忆 + 后台总结”，再逐步扩展。

### 1. Fast Response / Router

这不一定是大模型 Agent，可以是规则、小模型或轻量分类器。

职责：

```text
立即 ACK
判断是否是打断
判断是否需要记忆
判断是否需要搜索 / 图片 / 工具
生成任务事件
```

输入事件：

```text
user.message.created
user.interrupt.requested
user.attachment.uploaded
```

输出事件：

```text
client.ack
conversation.compose.requested
memory.retrieve.requested
research.search.requested
media.generate.requested
```

设计重点：

```text
它必须非常快，不能等主 LLM。
```

### 2. Conversation Agent

这是用户感知到的“主陪伴 Agent”。

职责：

```text
情绪陪伴
日常聊天
组织长回复
整合 Memory / Research / Media 的结果
必要时追问
流式输出
```

不应该负责：

```text
直接查全部资料
直接写长期记忆
直接做复杂检索
直接管理图片生成
直接管理 MQ 重试
```

输入事件：

```text
conversation.compose.requested
memory.retrieve.completed
research.evidence.ready
media.generate.completed
turn.interrupted
```

输出事件：

```text
conversation.delta.generated
conversation.completed
client.message.delta
client.message.completed
memory.extract.requested
reflection.summarize.requested
```

打断要求：

```text
每次 flush token 前检查 Result Gate。
如果 turn 被 superseded，停止继续向 client_event 写入。
```

### 3. Memory Agent

这是 AI 陪伴的核心竞争力。

职责：

```text
最近上下文召回
长期记忆召回
用户画像召回
偏好召回
关系状态召回
候选记忆抽取
记忆冲突检测
记忆过期、降权、删除
```

输入事件：

```text
memory.retrieve.requested
memory.extract.requested
memory.delete.requested
conversation.completed
user.correction.created
```

输出事件：

```text
memory.retrieve.completed
memory.write.candidate
memory.write.completed
memory.conflict.detected
memory.summary.updated
```

Memory Agent 返回的不是原始聊天记录，而是结构化 Memory Pack。

```json
{
  "profile_facts": [
    {
      "fact": "用户正在设计 AI 陪伴系统，重点关注 Event Bus、Agent 编排、快速响应、可打断和记忆系统。",
      "confidence": 0.93,
      "source_event_ids": ["evt_101", "evt_203"],
      "valid_from": "2026-07-01",
      "scope": "product_design"
    }
  ],
  "recent_context": [
    {
      "summary": "用户强调不要把 Event Bus 做成普通 MQ，而要做成 Agent Runtime。",
      "source_event_ids": ["evt_155"]
    }
  ],
  "relationship_state": {
    "tone_preference": "技术深入、结构化、少空话",
    "current_focus": ["AI 陪伴", "可打断架构", "长期记忆"]
  }
}
```

### 4. Reflection Agent

后台 Agent，不直接抢前台响应。

职责：

```text
对话结束后总结
提取长期记忆候选
更新用户画像
更新关系状态
发现偏好变化
合并重复记忆
处理冲突记忆
生成下次可用摘要
```

输入事件：

```text
conversation.completed
client.message.completed
memory.extract.requested
```

输出事件：

```text
memory.write.candidate
memory.summary.updated
reflection.completed
```

设计重点：

```text
长期记忆写入不要阻塞前台聊天。
```

### 5. Research Agent

当用户问事实、资料、新闻、项目调研时启用。

职责：

```text
网页搜索
资料检索
事实核验
引用整理
搜索结果去重
生成 evidence pack
```

输入事件：

```text
research.search.requested
research.verify.requested
user.attachment.uploaded
```

输出事件：

```text
research.source.found
research.evidence.ready
research.search.completed
research.search.failed
```

Research Agent 不直接回复用户。它只把 evidence pack 交给 Conversation Agent。

### 6. Media Agent

负责图片、语音、视频等慢任务。

职责：

```text
图片生成
图片理解
语音转文字
语音合成
多媒体结果入库
异步进度通知
```

输入事件：

```text
media.generate.requested
media.analyze.requested
user.attachment.uploaded
turn.interrupted
```

输出事件：

```text
media.generate.started
media.generate.progress
media.generate.completed
media.generate.failed
client.image.ready
```

用户体验：

```text
“我先继续陪你聊，图片我在后台生成，完成后发给你。”
```

### 7. Safety / Policy Agent

陪伴产品建议尽早有这个能力，即使 MVP 可以先做规则版。

职责：

```text
敏感内容识别
高风险工具审批
敏感记忆写入审批
删除 / 导出记忆权限检查
未成年人 / 自伤 / 医疗 / 法律等边界处理
```

输入事件：

```text
memory.write.candidate
tool.call.requested
user.message.created
```

输出事件：

```text
policy.approved
policy.rejected
policy.needs_user_confirmation
client.warning
```

---

## 八、Agent 消费协议

所有 Agent Worker 使用同一个消费协议：

```text
1. 从 Work Bus 拉事件
2. 写 agent_inbox，防重复消费
3. 检查 turn 是否仍 active
4. 创建或更新 agent_run
5. 执行业务逻辑
6. 定期发 heartbeat / progress
7. 输出 completed / failed / superseded
8. ack MQ 消息
```

`agent_inbox` 示例：

```sql
CREATE TABLE agent_inbox (
    agent_type      TEXT NOT NULL,
    event_id        TEXT NOT NULL,
    status          TEXT NOT NULL,
    first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at    TIMESTAMPTZ,
    PRIMARY KEY (agent_type, event_id)
);
```

消费时：

```sql
INSERT INTO agent_inbox(agent_type, event_id, status)
VALUES ($1, $2, 'processing')
ON CONFLICT DO NOTHING;
```

插入失败说明重复投递，直接 ack。

---

## 九、核心表设计

### conversation

```sql
CREATE TABLE conversation (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    active_turn_id  TEXT,
    intent_version  BIGINT NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### conversation_turn

```sql
CREATE TABLE conversation_turn (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    status          TEXT NOT NULL,
    intent_version  BIGINT NOT NULL,
    user_message    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

状态机：

```text
created
  -> active
  -> completed
  -> interrupted
  -> superseded
  -> failed
```

### agent_run

```sql
CREATE TABLE agent_run (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    turn_id         TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    agent_type      TEXT NOT NULL,
    status          TEXT NOT NULL,
    intent_version  BIGINT NOT NULL,
    run_epoch       BIGINT NOT NULL DEFAULT 1,
    input_event_id  TEXT,
    output_event_id TEXT,
    started_at      TIMESTAMPTZ,
    heartbeat_at    TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    error_code      TEXT,
    error_message   TEXT
);
```

状态机：

```text
queued
  -> running
  -> streaming
  -> waiting_tool
  -> paused
  -> completed
  -> failed
  -> cancelled
  -> superseded
```

### event_log

```sql
CREATE TABLE event_log (
    event_id        TEXT PRIMARY KEY,
    event_type      TEXT NOT NULL,
    event_version   INT NOT NULL DEFAULT 1,
    conversation_id TEXT,
    turn_id         TEXT,
    run_id          TEXT,
    user_id         TEXT,
    correlation_id  TEXT,
    causation_id    TEXT,
    producer        TEXT NOT NULL,
    intent_version  BIGINT,
    run_epoch       BIGINT,
    payload         JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### outbox

```sql
CREATE TABLE outbox (
    id              BIGSERIAL PRIMARY KEY,
    event_id        TEXT NOT NULL UNIQUE,
    topic           TEXT NOT NULL,
    payload         JSONB NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    retry_count     INT NOT NULL DEFAULT 0,
    next_retry_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at    TIMESTAMPTZ
);
```

### client_event

```sql
CREATE TABLE client_event (
    id              BIGSERIAL PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    turn_id         TEXT NOT NULL,
    event_type      TEXT NOT NULL,
    payload         JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_event_conv_id
ON client_event(conversation_id, id);
```

SSE 输出：

```text
id: 10291
event: client.message.delta
data: {"turn_id":"turn_008","text":"我先帮你拆一下 Event Bus..."}

id: 10292
event: client.task.progress
data: {"task":"memory.retrieve","status":"completed"}
```

### quarantined_result

旧 turn 的结果不能直接丢得无影无踪。建议进入隔离表，方便排查、审计，也可作为低风险候选材料。

```sql
CREATE TABLE quarantined_result (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    turn_id         TEXT NOT NULL,
    run_id          TEXT NOT NULL,
    reason          TEXT NOT NULL,
    payload         JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 十、记忆系统设计

AI 陪伴的记忆不是普通 RAG。

普通 RAG 解决的是：

```text
用户问问题 -> 查文档 chunk -> 拼上下文 -> 回答
```

AI 陪伴需要解决的是：

```text
用户是谁
最近发生了什么
用户长期目标有没有变化
用户讨厌什么语气
哪些事实已经过期
哪些记忆不能随便提
哪些记忆需要用户确认
这条记忆来自哪次对话
```

所以你需要 Memory System，而不是单纯向量库。

### 1. 记忆分层

```text
Raw Message / Episode
        |
        v
Working Memory
        |
        v
Episodic Memory
        |
        v
Semantic Memory
        |
        v
Preference Memory
        |
        v
Relationship Memory
        |
        v
Memory Summary / User State
```

### 2. Raw Episode

保存原始对话和事件片段。

```sql
CREATE TABLE memory_episode (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    turn_id         TEXT NOT NULL,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    source_event_id TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

作用：

```text
可追溯
可删除
可重新抽取
防止摘要漂移
给长期记忆提供证据
```

### 3. Working Memory

短期记忆，只服务当前会话或当前任务。

包含：

```text
最近 N 轮对话
当前用户情绪
当前任务状态
未完成任务
正在等待的工具结果
active_turn_id
intent_version
```

可以放在 Redis / Postgres / checkpoint 表里。

### 4. Episodic Memory

事件型记忆，记录用户经历和重要互动。

```json
{
  "type": "episode",
  "content": "用户在 2026-07-01 设计 AI 陪伴架构，核心关注 Event Bus、多 Agent、可打断和记忆系统。",
  "source_turn_id": "turn_008",
  "importance": 0.86
}
```

### 5. Semantic Memory

事实型记忆。

```sql
CREATE TABLE memory_fact (
    id                TEXT PRIMARY KEY,
    user_id           TEXT NOT NULL,
    subject           TEXT NOT NULL,
    predicate         TEXT NOT NULL,
    object            TEXT NOT NULL,
    confidence        NUMERIC NOT NULL,
    valid_from        TIMESTAMPTZ,
    valid_to          TIMESTAMPTZ,
    source_event_ids  TEXT[] NOT NULL,
    status            TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

示例：

```text
subject: 用户
predicate: 正在设计
object: AI 陪伴系统
valid_from: 2026-07-01
status: active
```

### 6. Preference Memory

偏好记忆。

```sql
CREATE TABLE memory_preference (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    preference_type TEXT NOT NULL,
    value           TEXT NOT NULL,
    strength        TEXT NOT NULL,
    evidence        JSONB,
    status          TEXT NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

例子：

```text
preference_type: answer_style
value: 技术细节多、架构化、不要太空
strength: high
```

### 7. Relationship Memory

陪伴产品必须有关系记忆。

它记录：

```text
用户和 AI 的关系状态
用户偏好的沟通方式
用户最近情绪节奏
用户反复关心的问题
用户对 AI 的信任边界
```

示例：

```json
{
  "user_id": "user_001",
  "style_preference": "技术深入、结构化、不要空泛",
  "recent_focus": ["AI 陪伴架构", "Agent Event Bus", "记忆系统"],
  "sensitivity": {
    "needs_fast_response": true,
    "dislikes_waiting": true
  }
}
```

### 8. 记忆写入流程

不要每一句话都写长期记忆。正确流程：

```text
OBSERVE
  原始消息入库，形成 episode

EXTRACT
  Reflection Agent 后台抽取候选记忆

POLICY
  判断是否值得保存、是否敏感、是否需要确认、是否冲突

MERGE
  合并重复记忆，处理 contradicted / deprecated

STORE
  写 episode / fact / preference / relationship / summary

INJECT
  下次对话按需召回，形成 Memory Pack
```

候选表：

```sql
CREATE TABLE memory_candidate (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    source_event_id TEXT NOT NULL,
    memory_type     TEXT NOT NULL,
    content         JSONB NOT NULL,
    confidence      NUMERIC NOT NULL,
    importance      NUMERIC NOT NULL,
    sensitivity     TEXT NOT NULL DEFAULT 'normal',
    status          TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 9. 什么时候写长期记忆

应该写入：

| 类型 | 例子 |
| --- | --- |
| 长期目标 | “我要做 AI 陪伴产品” |
| 稳定偏好 | “我喜欢你回答技术细一点” |
| 重要关系 | “这是我的合伙人” |
| 重要事件 | “我已经完成 MVP” |
| 用户纠错 | “不是这个项目，是另一个项目” |

不应该写入：

| 类型 | 例子 |
| --- | --- |
| 临时闲聊 | “今天有点累” |
| 一次性任务 | “帮我查这个链接” |
| 不确定推断 | “用户可能喜欢某种风格” |
| 敏感信息 | 除非用户明确要求保存 |

### 10. 为什么需要 `valid_from / valid_to`

陪伴系统里，用户会变。

```text
2026-06-01：用户喜欢 A
2026-07-01：用户说不喜欢 A 了，改喜欢 B
```

不要简单覆盖旧事实。应该：

```text
旧事实 valid_to = 2026-07-01
新事实 valid_from = 2026-07-01
```

这样系统既知道当前偏好，也能追溯偏好变化过程。

---

## 十一、低延迟策略

低延迟不是“用一个更快的大模型”，而是把链路拆成快车道和慢车道。

### 快车道

目标：100ms 到 300ms 内让用户看到反馈。

做：

```text
写入 user.message.created
创建 turn
更新 active_turn_id
返回 client.ack
显示 typing / task status
轻量意图识别
```

不做：

```text
长推理
全量记忆检索
网页搜索
图片生成
复杂工具调用
长期记忆写入
```

### 中速车道

目标：300ms 到 1000ms 内补齐上下文。

做：

```text
recent context 召回
top-k 长期记忆召回
用户画像摘要
轻量安全判断
```

如果 Memory Agent 超过 800ms 还没返回，Conversation Agent 可以先用 recent context 回复。迟到的记忆只用于补充或下一轮。

### 慢车道

目标：不阻塞前台。

做：

```text
Research Agent 搜索和核验
Media Agent 图片生成
Reflection Agent 总结
长期记忆抽取和合并
```

---

## 十二、Backpressure 与优先级

AI 陪伴会遇到：

```text
用户连续发消息
多个 Agent 并行跑
LLM token 流太快
前端断线
图片任务很慢
```

建议：

### 每个 conversation 只有一个 active turn

```text
conversation.active_turn_id 只能有一个
新 turn 一定 supersede 旧 turn
```

### 每个用户限制并发 run

```text
conversation_agent: 1
memory_agent: 2
research_agent: 2
media_agent: 1
reflection_agent: low priority
```

### Token delta 批量写入

不要每个 token 写一次数据库。

```text
每 50ms 或每 20 tokens flush 一次 client_event
```

### 优先级

| 事件 | 优先级 |
| --- | --- |
| `user.interrupt.requested` | 100 |
| `user.message.created` | 90 |
| `client.ack` | 90 |
| `conversation.compose.requested` | 70 |
| `memory.retrieve.requested` | 60 |
| `research.search.requested` | 50 |
| `media.generate.requested` | 40 |
| `reflection.summarize.requested` | 10 |

核心原则：

```text
打断 > 新消息 > 前端 ACK > 主回复 > 记忆召回 > 搜索 > 图片 > 后台总结
```

---

## 十三、MVP 推荐实现

### 技术栈

```text
Go
PostgreSQL
Redis Streams
SSE
pgvector
Worker Pool
Outbox Pattern
Agent Inbox Idempotency
```

### 第一版不要做太复杂

MVP 必做：

```text
1. conversation / turn / event_log / outbox
2. SSE client_event
3. TurnController 抢占
4. Result Gate
5. Conversation Agent 流式回复
6. Memory Agent recent context + top-k memory
7. Reflection Agent 生成 memory_candidate
```

MVP 暂缓：

```text
复杂图数据库
全自动长期记忆写入
多个大模型互相辩论
复杂媒体生成流水线
跨端主动推送
```

### 第一阶段：打通快响应和可打断

验收标准：

```text
用户发消息后 300ms 内看到 client.ack
同一 conversation 永远只有一个 active_turn
用户连续发 3 条消息，只有最后一条能继续流式输出
旧 turn token 不能进入 client_event
旧 run 结果进入 quarantined_result
```

### 第二阶段：接入基础记忆

验收标准：

```text
每轮原始消息写入 memory_episode
Memory Agent 能返回 recent_context 和 profile_facts
Reflection Agent 只写 memory_candidate，不直接乱写长期事实
用户纠错后，旧 memory_fact 被 deprecated 或 valid_to 截止
```

### 第三阶段：多 Agent 并行

验收标准：

```text
Conversation Agent 可以先回复
Memory Agent 迟到后不会打断当前输出
Research Agent 返回 evidence pack 后可被主 Agent 合并
Media Agent 慢任务通过 client.task.progress 展示
```

### 第四阶段：生产增强

可逐步增加：

```text
Redis Streams -> NATS JetStream / RocketMQ / Kafka
SSE Gateway 独立部署
Projection Worker 独立部署
Event Store 分区
Memory Agent 独立扩容
Safety / Policy Agent 完整化
记忆导出、删除和用户确认
```

---

## 十四、一次完整时序

### 普通问题

```text
T+0ms
user.message.created

T+20ms
TurnController 创建 turn_008，intent_version=8

T+60ms
client.ack
“我明白，我先帮你整理。”

T+80ms
memory.retrieve.requested
conversation.compose.requested

T+300ms
Memory Agent 返回 recent memory

T+600ms
Conversation Agent 开始输出 client.message.delta

T+1200ms
Research Agent 返回 evidence

T+2000ms
Conversation Agent 合并 evidence 继续输出

T+4000ms
client.message.completed

T+4500ms
reflection.summarize.requested
memory.extract.requested
```

### 用户中途打断

```text
Conversation Agent 正在输出 turn_008
  |
  v
用户发新消息
  |
  v
user.message.created turn_009
  |
  v
TurnController:
  - turn_008 -> superseded
  - active_turn_id = turn_009
  - intent_version = 9
  |
  v
广播 turn.interrupted
  |
  |-- Conversation Agent 停止输出旧 token
  |-- Memory Agent 丢弃旧结果或降级为 candidate
  |-- Research Agent 结果进入 quarantine
  |-- Media Agent 尽力 cancel
  |
  v
client.ack
“好的，我先切到你这个新问题。”
```

---

## 十五、Agent-native 检查清单

### Parity：用户能做的，Agent 也能做

```text
用户可以删除记忆 -> Agent 必须有 delete_memory 能力，但要经过确认
用户可以编辑偏好 -> Agent 必须能更新 preference，并保留来源
用户可以取消任务 -> Agent Runtime 必须支持 cancel / supersede
```

### Granularity：工具是原子能力，不是巨大工作流

推荐工具：

```text
read_memory
write_memory_candidate
approve_memory
delete_memory
emit_client_event
publish_event
complete_task
search_sources
create_media_task
```

不要做成：

```text
analyze_user_and_chat_and_write_memory_and_generate_image()
```

### Composability：新能力优先通过 prompt + event 添加

例如未来新增“日程 Agent”：

```text
订阅 schedule.extract.requested
输出 schedule.candidate.created
需要用户确认后再写入日程
```

不需要改 Conversation Agent 的核心逻辑。

### Completion Signal：Agent 必须显式完成

每个 Agent run 应该有类似：

```text
complete_task(status, summary, output_event_id)
```

不要靠“没有新 token”或“超时”猜测完成。

---

## 十六、最终建议

你真正要实现的不是：

```text
用户消息 -> MQ -> Agent -> 回答
```

而是：

```text
用户消息
  -> TurnController 抢占
  -> Event Store 记录事实
  -> Outbox 可靠投递
  -> Work Bus 分发任务
  -> 多 Agent 并行处理
  -> Result Gate 校验版本
  -> Client Projection 投影前端事件
  -> SSE/WebSocket 实时展示
  -> Reflection 后台沉淀记忆
```

最重要的 6 个原则：

1. `turn_id + intent_version` 是打断隔离核心。
2. 内部可靠事件流和前端实时流必须分开。
3. Agent 之间通过 topic / subscription 通信，不要互相 HTTP 强耦合。
4. 所有 Agent 输出前必须经过 Result Gate。
5. Postgres `event_log` 是事实来源，MQ 只是投递层。
6. 长期记忆必须异步、可追溯、可失效、可纠错。

一句话版本：

> 把 Event Bus 做成 Agent Runtime 的中枢神经：它负责抢占、并行、隔离、投影和记忆沉淀，而不是只负责把消息从 A 发到 B。

---

## 参考方向

- OpenHands Events：typed event framework 和 append-only event log 思路。
- AutoGen Topic and Subscription：topic/subscription 的多 Agent 通信模型。
- LangGraph Interrupts / Persistence：interrupt、checkpoint、resume、短期状态与长期 store。
- Redis Streams：MVP 阶段的 append-only stream 和 consumer group。
- NATS JetStream：生产级持久化消息、consumer ack、at-least-once delivery。
- MDN Server-Sent Events：SSE `id` 和断线重连。
- Zep / Graphiti：temporal knowledge graph、episode provenance、随时间变化的事实。
