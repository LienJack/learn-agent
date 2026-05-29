---
title: "Agent Harness 用語マップ：Intent、Observation、Event、Artifact、Snapshot、Projection、Trace の関係"
description: "Tool Runtime 以降、このシリーズはより混乱しやすい段階に入りました。"
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.png'
locale: "ja"
tags:
  - Agent
  - Harness
  - Glossary
  - 技術チュートリアル
aliases:
  - Agent Harness 用語マップ
  - Harness Glossary
---

# Agent Harness 用語マップ：Intent、Observation、Event、Artifact、Snapshot、Projection、Trace の関係

Tool Runtime 以降、このシリーズはより混乱しやすい段階に入りました。

モデルは単に質問に答えるだけではありません。tool intent を提示し、Harness が検証し、認可し、実行し、記録し、復元し、検索し、context に注入し、サブタスクを委譲します。最後には、目標が本当に完了したかも検証しなければなりません。

この時点で用語を固定しておかないと、多くの境界が少しずつ曖昧になります。

```text
observation は event に似ている。
event は log に似ている。
artifact は snapshot に似ている。
snapshot は context に似ている。
memory は retrieval に似ている。
trace は audit に似ている。
permission は governance に似ている。
```

この短い付録では、ただ 1 つのことだけを扱います。

> 00-13 から 00-23 までで共通して使う中核オブジェクトに、1 枚の地図を与える。

## 一、行動経路の中のオブジェクト

| 用語 | 固定された意味 | 典型的な利用者 |
| --- | --- | --- |
| `ToolIntent` | モデルが提示する構造化された行動意図 | Provider Runtime / Tool Runtime |
| `ToolInvocation` | Runtime が受理、検証、認可したあと、実行準備に入るツール要求 | Scheduler / Executor |
| `ToolExecution` | Tool Runtime が実際にツールを実行し、副作用を生む可能性があるプロセス | Tool Runtime / Sandbox |
| `Raw Result` | ツール実装が返す生の結果。stdout、stderr、diff、ファイルバイトなど | Normalizer / Artifact Store |
| `Observation` | モデル、ユーザー、State に向けた事実の Projection | Model / UI / State Reducer |
| `Verification Observation` | 目標が検証されたかどうかを専用に説明する observation | Final Answer / Trace |
| `Audit Event` | replay、trace、監査に向けた事実イベント | Session Store / Trace Analyzer |
| `Artifact` | 完全なログ、diff、モデル入力 Snapshot、原文証拠などの大きな証拠資料 | Artifact Store / Audit |
| `Snapshot` | ある時点の可視証拠パック、または context 証拠パック | Replay / Trace / Context Policy |
| `Projection` | 事実源から特定の利用者ビューへの投影 | Context Policy / UI / Trace |

基本的な向きは次のとおりです。

```text
ModelEvent
-> ToolIntent
-> Validation / Permission
-> ToolInvocation
-> ToolExecution
-> RawResult
-> Observation
-> Audit Event
-> State
-> ContextProjection
-> ModelInput
```

脇道の証拠を prompt に無理に押し込むのではなく、参照として保持します。

```text
RawResult -> Artifact
RetrievalResult -> AuditSnapshot
ContextProjection -> DecisionLedger
EventLog -> TraceView
CandidateMemory -> GovernanceStore
```

## 二、能力システムの中のオブジェクト

能力システムも層に分ける必要があります。

```text
Plugin Host は、外部能力がシステムに入る入口を担当する。
Registry は、登録済みの内部能力の事実を記録する。
Capability Catalog は Registry の拡張ビューであり、tool / skill / resource / prompt / channel を記録する。
Discovery Policy は Catalog から今回の Visible Set を選ぶ。
Context Policy は Visible Set、State、ルール、retrieved block を組み立てて Model Input にする。
Tool Runtime は、ある具体的な ToolIntent が実行可能かどうかだけを扱う。
```

つまり：

```text
存在することは、可視であることを意味しない。
可視であることは、実行可能であることを意味しない。
実行可能であることは、監査を迂回してよいことを意味しない。
```

## 三、制御セマンティクスにおける 3 つの語

`Permission`、`Trust`、`Governance` は混用すべきではありません。

| 用語 | 作用する層 | 例 |
| --- | --- | --- |
| `Permission` | ある具体的な intent を実行できるか | 今回 `src/auth.ts` を書き換えられるか |
| `Trust` | ある出所が能力を提供してよいか | この extension / MCP server をロードできるか |
| `Governance` | session、ユーザー、プロジェクトをまたぐポリシー、監査、ライフサイクルガバナンス | memory 書き込み、組織ポリシー、secret ライフサイクル |

extension trust は tool permission ではありません。

memory governance も、ある 1 回のツール呼び出しの承認ではありません。

## 四、完了状態は必ず verification に落とす

最終回答は検証の代わりにはなりません。

```text
Observation は、あるステップで何が起きたかを説明する。
Verification Observation は、目標が検証されたかどうかを説明する。
Final Answer は verification evidence を引用できるだけで、verification の代わりにはならない。
```

したがって「ツール実行が終わった」「モデルが直ったと言った」「検証が通った」は、3 つの異なる状態です。

Agent Harness の完了セマンティクスは、最後の状態を基準にすべきです。

---

GitHub ソース: [00-24-agent-harness-terminology-map.md](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-24-agent-harness-terminology-map.md)
