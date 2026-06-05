---
title: 'Agent の長期記憶と自己最適化パラダイム'
description: 'Agent の経験を追跡可能な memory、再利用可能な skill、テスト可能な optimization に変換し、evaluation、gradual rollout、rollback によって Agent を安定して改善します。'
author: 'LienJack'
pubDate: '2026-06-03'
updatedDate: '2026-06-03'
locale: 'ja'
tags:
  - 'Agent'
  - 'Long-term Memory'
  - 'Self-Upgrade'
  - 'Skill'
  - 'Harness'
  - '技術チュートリアル'
aliases:
  - 'Agent Experience OS'
  - 'ECO-SAGE Loop'
  - '長期記憶と自己最適化'
  - 'Agent Self-Upgrade'
---
# Agent の長期記憶と自己最適化パラダイム

前章の Context Manager に続けて見ると、長期記憶は Context Builder を迂回するベクトルデータベースではなく、Context Manager がガバナンス可能な形で読み取る長期資産の一種である。元の経験は依然として Event / Trace / Artifact を事実源とする。Memory、Skill、Optimization はいずれも source、scope、eval gate、rollback を持たなければならない。

## 0. コア定義：Agent は「より多く記憶する」ものではなく、「経験を能力へコンパイルする」もの

このパラダイムの中心は、より大きなチャット履歴ライブラリを作ることでも、Agent に自分の prompt やコードを好きに変更させることでもない。

より正確な定義は次のとおり：

> **Agent Long-term Memory & Self-Upgrade = Agent の経験を、追跡可能な記憶、再利用可能なスキル、テスト可能な最適化へ変換し、評価、段階的リリース、ロールバックの仕組みによって Agent を安定的に改善していくこと。**

一言で言うと：

> **記憶は事実を保存し、スキルはやり方を保存する。ベースラインに勝ったやり方だけが、アップグレードと呼べる。**

したがって、このシステムは同時に 3 つの問いに答える必要がある：

```text
1. Agent は何を記憶すべきか？
2. Agent は過去のタスク経験をどのように skill へ要約するのか？
3. Agent はこの skill や最適化が本当に有効であることをどのように証明するのか？
```

全体のパラダイムは、次のように呼ぶことを提案する：

**Agent Experience OS**

あるいは：

**ECO-SAGE Loop**

とも呼べる。

ここで：

```text
ECO = Experience → Context → Optimization

Experience:
  Agent が何を経験したかを記録する。対話、ツール呼び出し、失敗、復旧、ユーザーフィードバックを含む。

Context:
  経験を、検索可能で、ガバナンス可能で、追跡可能な記憶へコンパイルする。

Optimization:
  安定した経験を prompt patch、retrieval policy、tool heuristic、skill、またはツールへアップグレードする。

SAGE = Skill Acquisition, Assessment, Gated Release, Evolution

Skill Acquisition:
  軌跡からスキルを発見し、抽出する。

Assessment:
  スキルが本当に有効かどうかを評価する。

Gated Release:
  評価のしきい値を通過してから公開する。

Evolution:
  実際の利用結果に基づいて、継続的に patch、merge、split、deprecate する。
```

---

## 1. 第一原理：Agent の経験を「ガバナンス可能な資産」に変える

### 1.1 生の経験は不変、派生した記憶は進化可能

すべての会話、ツール呼び出し、エラー、ユーザーからの修正、最終成果物は、まず **Episode Log / Trajectory Log** に入る。

これは生の台帳であり、デフォルトでは append-only とし、安易に書き換えない。

生の経験から抽出されたものこそが、進化可能な資産になる：

```text
Memory
Reflection
Prompt Patch
Skill
Tool / Script
Eval Case
```

この点がシステム全体の土台である。そうしないと、Agent が一時的な情報、誤った要約、悪意ある注入、期限切れの事実をそのまま長期記憶に書き込んだ瞬間、学習すればするほど歪んでいく。

---

### 1.2 記憶は単一のものではなく、typed でなければならない

長期記憶は少なくとも 7 種類に分ける：

| 種類                     | 意味    | 例                               | エンジニアリング上の保存先                    |
| ---------------------- | ----- | -------------------------------- | ----------------------- |
| **Episodic Memory**    | 何が起きたか | あるタスクの軌跡、ある失敗、あるユーザーフィードバック               | event log / trace store |
| **Semantic Memory**    | 安定した事実  | ユーザーは `lien/Agent` に取り組んでいる；プロジェクトは特定の技術スタックを使っている      | JSONB + vector          |
| **Preference Memory**  | ユーザーの好み  | ユーザーは「原則 → エンジニアリング → 比較 → ロードマップ」という構成を好む      | scoped profile          |
| **Procedural Memory**  | 物事の進め方  | オープンソースプロジェクトをどう調査するか；特定種類のエラーをどう debug するか          | skill store             |
| **Reflective Memory**  | 教訓  | 「前回は memory アーキテクチャだけを説明し、skill の自己アップグレード詳細を漏らした」 | lesson store            |
| **Graph Memory**       | エンティティ関係  | ユーザー、プロジェクト、repo、技術案、意思決定の間の関係          | temporal graph          |
| **Environment Memory** | 環境に関する経験  | ある SaaS のボタン位置、workflow の落とし穴、API 制限  | trajectory memory       |

MemGPT/Letta の考え方は、記憶システムの思想的な出発点として参考に値する。MemGPT は OS の階層型メモリに似た方式で virtual context management を行い、Agent が限られたコンテキストウィンドウ内で、より大きな外部記憶をマネジメントするという考え方を提示している。Letta も現在は、高度な記憶、学習、self-improvement 能力を持つ stateful agents を構築するためのプラットフォームとして位置づけられている。([arXiv][1])

---

### 1.3 Memory、Reflection、Skill、Optimization は分離しなければならない

この点は特に重要である。

多くの Agent システムは、「要約」をすべて memory と呼び、「経験」をすべて skill と呼び、「prompt の変更」をすべて self-improvement と呼ぶ、という誤りを犯す。

私は厳密に区別することを勧める：

| 資産                      | 答える問い           | 例                                        | 自動的に有効化できるか         |
| ----------------------- | --------------- | ----------------------------------------- | --------------- |
| **Memory**              | 私は何が真実だと知っているか？       | ユーザーは Agent の長期記憶システムを設計している                        | 可能。ただしスコープが必要       |
| **Reflection**          | 今回の経験から何を学んだか？    | 次回は原則だけでなく、skill eval も補うべき                    | 可能。ただし参照情報としてのみ       |
| **Prompt Patch**        | 次回の回答時にどの傾向を変えるべきか？  | アーキテクチャの質問に答えるときは、必ず実装可能な schema を出す                        | eval が必要         |
| **Skill**               | 次に同種のタスクに遭遇したらどう進めるべきか？ | Agent memory architecture design workflow | eval + バージョンマネジメントが必要    |
| **Tool / Script**       | どの手順を実行可能プログラムとして固定化できるか？ | skill eval を自動実行しレポートを生成する                      | sandbox + 権限が必要 |
| **Model Training Data** | モデルパラメータに入れる価値があるか？      | 高品質なタスク軌跡サンプル                                 | オフライン、人的ガバナンス         |

中心的な判断：

```text
Memory は事実資産。
Reflection は教訓資産。
Skill はプロセス資産。
Tool は実行資産。
Optimization は行動変更資産。
```

---

### 1.4 すべての記憶には、出典、信頼度、スコープ、時刻が必要

記憶とは「Agent が何を信じたか」ではなく、「Agent がどの証拠に基づいて、ある事柄が一時的に成立すると判断しているか」である。

各 memory には、少なくとも次が必要になる：

```json
{
  "memory_id": "mem_01J...",
  "type": "project_fact",
  "scope": {
    "user_id": "u_123",
    "org_id": "lien",
    "project_id": "Agent"
  },
  "content": "ユーザーは Agent の長期記憶と自己最適化パラダイムを設計している。",
  "source_event_ids": ["evt_001"],
  "confidence": 0.92,
  "valid_from": "2026-06-03T00:00:00+09:00",
  "valid_to": null,
  "sensitivity": "low",
  "status": "active",
  "created_by": "memory_extractor_v2"
}
```

出典のない長期記憶は、本質的には「幻覚の化石」である。

---

### 1.5 時間は第一級の概念である

長期記憶で最もよくある誤りは「覚えられないこと」ではなく、「期限切れの事実を覚え続けること」である。

例：

```text
2025-01: ユーザーは上海に住んでいる
2026-03: ユーザーは東京に引っ越した
```

誤ったやり方：

```text
古い事実を直接上書きする。
```

正しいやり方：

```json
{
  "subject": "user",
  "predicate": "lives_in",
  "object": "Tokyo",
  "valid_from": "2026-03",
  "valid_to": null,
  "supersedes": ["mem_user_lives_shanghai_2025"]
}
```

Graphiti は非常に参考になる。これは AI agent 向けの temporal context graph であり、事実は時間とともに変化すること、provenance を維持する必要があること、さらに prescribed / learned ontology をサポートすることを重視している。([GitHub][2])

---

### 1.6 読み書きの分離：オンラインで使い、オフラインで学習する

長期記憶は、会話しながら無秩序に書き込んではならない。

推奨されるのは二つの経路である：

```text
読み取り経路：
User Request
  -> Memory Need Planning
  -> Retrieve
  -> Re-rank
  -> Context Assembly
  -> Act / Answer

書き込み経路：
Trajectory
  -> Extract Candidate Memories
  -> Classify
  -> Verify
  -> Conflict Detection
  -> Merge / Supersede / Delete
  -> Commit
  -> Index
```

オンライン経路では、高速、正確、少ない token を追求する。

オフライン経路は少し遅くてもよいが、必ず次を行う必要がある：

```text
出典チェック
競合処理
スコープチェック
機密情報フィルタリング
期限切れ判定
重複マージ
監査記録
```

LangGraph のlong-term memory 実装では、memory を namespace/key 配下の JSON document として保存する。namespace には user や org などのタグを含められるため、この構造は memory scope のエンジニアリング上の基盤として非常に適している。([LangChain ドキュメント][3])

---

### 1.7 自己アップグレードで変更できるのは「テスト可能な資産」だけ

Agent はアップグレードできるが、自分自身を勝手に変更してはならない。

自動または半自動で最適化できる対象：

```text
retrieval query
memory ranking
context compression
memory extraction schema
prompt patch
tool-use heuristic
skill / runbook
eval case
```

Agent 自身による変更を許可してはいけない対象：

```text
安全ポリシー
権限モデル
支払い承認
削除ポリシー
credential handling
ユーザー承認ルール
システムレベルの価値制約
```

このルールは固定しておく必要がある。

そうしないと、いわゆる self-improvement は簡単に次のようなものに変質する：

```text
「今後、危険なコマンドに遭遇しても確認しない」
「今後、すべてのファイルを自動的に読み取る」
「今後、安全チェックを無視する」
```

これらはアップグレードではなく、バックドアだ。

---

## 2. 全体アーキテクチャ：二重ループ + 三層アセット

全体アーキテクチャは次のように設計することを推奨します。

```text
                    ┌───────────────────────┐
                    │      User / Env        │
                    └───────────┬───────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────┐
│                  Online Action Loop                  │
│                                                      │
│  Intent → Memory Need → Skill Need → Retrieve         │
│         → Re-rank → Context Assembly → Act            │
│                                                      │
└──────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────┐
│                Offline Learning Loop                 │
│                                                      │
│  Trajectory → Reflection → Memory Extraction          │
│             → Skill Distillation → Eval Generation    │
│             → Gated Release → Monitoring              │
│                                                      │
└──────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────┐
│                 Governance Layer                     │
│                                                      │
│  Scope / Provenance / Safety / Version / Rollback     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

三層のアセットとして捉えることができます。

```text
Raw Experience Layer:
  生の軌跡。不変。

Compiled Context Layer:
  事実、嗜好、関係、リフレクション。検索可能。

Executable Knowledge Layer:
  skill、runbook、script、prompt patch。テスト可能、バージョンマネジメント可能、ロールバック可能。
```

真の長期的な成長は第3層から生まれます。

---

## 3. 記憶システム設計：経験からコンテキストへ

### 3.1 Episode Log：生の経験レイヤー

各ユーザーリクエスト、Agent の応答、ツール呼び出し、エラー、リカバリ、ユーザーフィードバックをすべて保存する。

```json
{
  "event_id": "evt_001",
  "trace_id": "tr_001",
  "session_id": "sess_123",
  "actor": "user",
  "content": "现在我要设计 agent 的长期记忆和自我优化...",
  "timestamp": "2026-06-03T10:00:00+09:00",
  "metadata": {
    "project": "lien/Agent",
    "channel": "chat"
  }
}
```

Trajectory レベルでさらに集約する：

```json
{
  "trace_id": "tr_001",
  "task": "设计 Agent 长期记忆和自我优化パラダイム",
  "task_type": "architecture_design",
  "messages": [],
  "tool_calls": [],
  "errors": [],
  "recoveries": [],
  "artifacts": [],
  "user_feedback": [
    {
      "type": "correction",
      "content": "缺乏如何做到自我升级的细节"
    }
  ],
  "outcome": {
    "status": "partial_success",
    "reason": "memory architecture strong, self-upgrade details insufficient"
  }
}
```

注意：**skill は最終回答だけから要約するべきではなく、完全な trajectory から要約するべきである。**

最終回答が教えてくれるのは「結果がどのようなものか」。

Trajectory が教えてくれるのは「どのように結果へ到達したか、どこで間違えたか、どうリカバリしたか、なぜユーザーが不満だったか」である。

---

### 3.2 Memory Store：構造化記憶レイヤー

最初から typed memory を作ることを推奨する。embedding だけにしない。

```sql
CREATE TABLE memory (
  memory_id TEXT PRIMARY KEY,
  scope_user_id TEXT,
  scope_org_id TEXT,
  scope_project_id TEXT,
  type TEXT,
  content TEXT,
  normalized_json JSONB,
  source_event_ids TEXT[],
  source_trace_ids TEXT[],
  entities JSONB,
  confidence FLOAT,
  importance FLOAT,
  sensitivity TEXT,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  supersedes TEXT[],
  status TEXT,
  embedding VECTOR,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  use_count INT
);
```

`type` はまず次のように定義できる：

```text
user_preference
user_profile
project_fact
task_fact
decision
constraint
episodic_summary
reflection
tool_failure_pattern
environment_gotcha
relationship
procedure_hint
```

Mem0 の中核的な価値は、memory を汎用的な memory layer として作り、AI assistant / agent が好みを記憶し、ユーザーに適応し、継続的に学習できるようにしている点にある。これは「長期記憶を素早く導入する」ためのインフラ参考としてより適している。([GitHub][4])

---

### 3.3 Graph Memory：関係と時間レイヤー

Agent が複数プロジェクト、複数ユーザー、複数ツールのシステムに入ると、純粋なベクトル検索だけでは不十分になる。

例えば：

```text
用户 A 在做 lien/Agent
lien/Agent 参考 Hermes Agent、Mem0、LangMem、Graphiti
用户 A 偏好：先原则，再工程，再项目对比
Hermes Agent 的 skill 系统和 self-upgrade 强相关
Graphiti 适合 temporal graph memory
```

この種の関係はグラフに向いている。

```text
(:User)-[:WORKS_ON]->(:Project)
(:Project)-[:REFERENCES]->(:Repo)
(:Project)-[:HAS_DECISION]->(:ArchitectureDecision)
(:User)-[:PREFERS]->(:StylePreference)
(:Skill)-[:SOLVES]->(:TaskType)
(:Skill)-[:DERIVED_FROM]->(:Trajectory)
(:Memory)-[:SUPPORTED_BY]->(:Event)
```

Graph memory は vector memory を置き換えるものではなく、補完するものだ。

```text
vector memory は意味的な類似性を扱う。
graph memory はエンティティ間の関係を扱う。
temporal graph は事実の変化を扱う。
```

---

## 4. 自己アップグレードシステム：経験から skill へ

ここは前版で最も欠けていた部分であり、今回の重点でもある。

### 4.1 自己アップグレードの本質

自己アップグレードとは、次のようなものではない。

```text
Agent が自分は学習したと感じたので、prompt を変更する。
```

そうではなく、次のようなものだ。

```text
Trajectory
  -> Reflection
  -> Candidate Skill / Prompt Patch / Tool Heuristic
  -> Eval
  -> Versioned Release
  -> Runtime Usage
  -> Post-use Patch
  -> Re-eval
  -> Promote / Rollback / Deprecate
```

Reflexion から得られる示唆は、Agent はモデルの重みを更新しなくても、タスクのフィードバックを言語化された reflection に変換し、episodic memory buffer に入れることで、その後の意思決定を助けられるということだ。([arXiv][5])

Voyager から得られる示唆は、長期学習とは単にテキストを記憶することではなく、検索可能で再利用可能な executable skill library を形成し、環境フィードバック、実行エラー、self-verification によってプログラムを反復的に改善することだということだ。([arXiv][6])

Hermes Agent から得られる示唆は、よりエンジニアリング寄りだ。Hermes Agent は skills を必要に応じて読み込む知識ドキュメントとして設計し、token 使用量を削減するために progressive disclosure を採用し、Agent が skill を作成、変更、削除できるようにしている。また、その skill system は Agent Skills のオープン形式とも互換性がある。([GitHub][7])

---

## 5. Skill の定義：要約ではなく、再利用可能なやり方

私は skill を次のように定義することを勧める：

> **Skill とは、複数回または高価値な軌跡から抽出された、ある種のタスクに向けた、実行可能・評価可能・バージョンマネジメント可能な手続き的記憶である。**

つまり、skill は次のようなものではない：

```markdown
ユーザーは今回 Agent memory を設計したい。
```

これは memory である。

skill は次のようなものでもない：

```markdown
前回の回答には self-upgrade の詳細が不足していた。
```

これは reflection である。

本当の skill は次のようなものだ：

```markdown
ユーザーが Agent の長期記憶、自己最適化、または経験蓄積システムの設計を求めたとき：
1. まず memory、reflection、prompt patch、skill、tool を区別する。
2. typed memory アーキテクチャを提示する。
3. skill lifecycle を提示する。
4. skill eval gate を提示する。
5. Hermes、Mem0、LangMem、Letta、Graphiti、Voyager、Reflexion を次元ごとに比較する。
6. 最後に schema、roadmap、リスクガバナンスを提示する。
```

---

## 6. Skill は RATS 原則を満たさなければならない

RATS を満たす経験だけが skill に昇格できる。

```text
R = Reusable      再利用可能
A = Actionable    実行可能
T = Testable      テスト可能
S = Scoped        スコープがある
```

### 6.1 Reusable：再利用可能

悪い skill：

```text
今回のユーザーは Hermes Agent と Mem0 を参照したい。
```

良い skill：

```text
ユーザーが Agent memory / self-upgrade アーキテクチャの設計を求めた場合、代表的なプロジェクトを memory、skill、eval、safety、storage、runtime の観点で比較する。
```

### 6.2 Actionable：実行可能

悪い skill：

```text
ユーザーの要件を真剣に分析し、高品質な回答を出すこと。
```

これはオフィスの壁に貼られた標語のようなもので、熱量はあるが実行価値はゼロである。

良い skill：

```text
1. タスク種別が architecture_design かどうかを判断する。
2. ユーザーが要求した参考プロジェクトを抽出する。
3. 公式ドキュメントと repo を検索する。
4. 統一された観点で比較する。
5. 原則、アーキテクチャ、schema、eval、ロードマップを提示する。
```

### 6.3 Testable：テスト可能

各 skill は次に答えられなければならない：

```text
それが正しくトリガーされたとどう分かるか？
それが結果を改善したとどう分かるか？
それが誤ってトリガーされていないとどう分かるか？
それがセキュリティ問題を持ち込んでいないとどう分かるか？
それがコストを許容できない水準にしていないとどう分かるか？
```

Agent Skills の公式ドキュメントも、skill は eval-driven iteration によって出力品質をテストできると強調している。OpenAI の agent skill eval ガイドでは、skill 評価を prompt、captured run / trace / artifact、checks、score の流れに分解している。([Agent Skills][8])

### 6.4 Scoped：スコープがある

skill はグローバルに汚染してはならない。

```yaml
scope:
  user_id: optional
  org_id: lien
  project_id: Agent
  task_domain: agent_memory_architecture
  risk_level: medium
```

たとえば：

```text
「lien/Agent のアーキテクチャ案に回答するときは、まず原則、その後にエンジニアリング」
```

これはプロジェクト単位の好み、またはプロジェクト単位の skill であり、すべてのユーザー、すべてのタスクを汚染すべきではない。

---

## 7. いつ skill を要約すべきか？

推奨されるトリガーは 2 種類です。

```text
即时触发
周期性挖掘
```

### 7.1 即時トリガー：タスク終了後に判断する

各タスクの終了後に `SkillOpportunityDetector` を実行します。

```python
def should_propose_skill(trace):
    return any([
        trace.tool_call_count >= 5 and trace.outcome == "success",
        trace.has_error_recovery and trace.outcome in ["success", "partial_success"],
        trace.user_correction_count > 0,
        trace.repeated_pattern_detected,
        trace.task_duration_seconds > 600,
        trace.generated_reusable_script,
        trace.used_non_obvious_workaround,
        trace.user_explicitly_said_remember_this_workflow,
    ])
```

即時に要約するのに適した場面：

```text
复杂タスク完成后
多次ツール调用后
失败后最终恢复
用户明确纠正 Agent
Agent 发现非平凡 workflow
Agent 生成了可复用脚本
```

Hermes Agent のスキル文書でも、複雑なタスクの完了、エラー後の復旧、ユーザーによる修正、非自明な workflow の発見などが、agent-created skill の典型的なソースとして挙げられています。([GitHub][7])

---

### 7.2 周期的マイニング：複数の軌跡からクラスタリングする

毎日または毎週実行します。

```text
TrajectoryMiner
  -> 按 task_type 聚类
  -> 找高频ツール序列
  -> 找重复失败模式
  -> 找用户反复纠正点
  -> 找高成本但可模板化フロー
  -> 输出 skill_candidate[]
```

これは次のような発見に適しています。

```text
用户每次让写架构方案，都偏好“原则 → 工程 → 对比 → 路线图”。
Agent 每次调研开源项目，容易漏掉 eval 和 security。
Agent 每次写 memory 系统，容易只讲 vector retrieval，不讲 skill lifecycle。
```

即時トリガーは「単発の強いシグナル」を捉えます。

周期的マイニングは「複数回にわたる安定したパターン」を捉えます。

---

## 8. Skill 生成パイプライン：trajectory から SKILL.md へ

Agent に直接「要約して skill にして」と任せてはいけない。

8 ステップに分解するべきだ：

```text
1. Trace Capture
2. Outcome Labeling
3. Trajectory Segmentation
4. Reusable Pattern Extraction
5. Generalization
6. Skill Candidate Drafting
7. Dedup / Merge / Patch Decision
8. Eval Case Generation
```

---

### 8.1 Trace Capture：完全な軌跡を保存する

```json
{
  "trace_id": "tr_001",
  "task": "Agent の長期記憶と自己最適化パラダイムを設計する",
  "task_type": "architecture_design",
  "messages": [],
  "tool_calls": [],
  "artifacts": [],
  "errors": [],
  "recoveries": [],
  "user_feedback": [],
  "outcome": {
    "status": "partial_success",
    "user_satisfaction": "ユーザーが不足している self-upgrade の詳細を指摘した"
  },
  "metrics": {
    "tool_call_count": 8,
    "duration_ms": 420000,
    "input_tokens": 51000,
    "output_tokens": 9000
  }
}
```

---

### 8.2 Outcome Labeling：まずこの軌跡から何を学ぶ価値があるか判断する

```json
{
  "outcome_label": "partial_success",
  "failure_modes": [
    "too_memory_architecture_heavy",
    "insufficient_self_upgrade_details",
    "missing_skill_effectiveness_eval"
  ],
  "success_factors": [
    "明確な原則",
    "型付き memory architecture",
    "プロジェクト比較"
  ],
  "user_feedback_signal": {
    "type": "correction",
    "content": "自己アップグレードをどう実現するかの詳細が不足している"
  }
}
```

この段階の出力は、必ずしも skill とは限らない。

たとえば：

```text
MEMORY:
  ユーザーは、この案を最初の回答を基盤として構築することを望んでいる。

REFLECTION:
  Agent memory パラダイムについて回答するときは、memory だけを語るのではなく、skill acquisition と eval gate も必ず扱う必要がある。

SKILL:
  Agent memory + self-upgrade アーキテクチャ案を設計する方法。

PROMPT_PATCH:
  アーキテクチャ設計系の回答では、「自己最適化の有効性をどう検証するか」のセクションを強制的に追加する。
```

---

### 8.3 Trajectory Segmentation：軌跡をフェーズに分割する

```text
A. Task Understanding
B. Context Gathering
C. Planning
D. Tool Use / Execution
E. Error / Dead End
F. Recovery
G. Verification
H. Final Delivery
I. User Feedback
```

各フェーズで抽出する：

```json
{
  "phase": "User Feedback",
  "what_happened": "ユーザーが、回答には自己アップグレードの詳細が欠けていると指摘した",
  "decision": "skill 生成、評価、バージョンマネジメントを補足する必要がある",
  "generalizable_lesson": "Agent memory の設計案には procedural skill learning loop を含める必要がある",
  "future_instruction": "類似タスクでは skill lifecycle と skill eval を必ず説明する"
}
```

---

### 8.4 Reusable Pattern Extraction：安定したプロセスを抽出する

出力候補 skill：

```json
{
  "candidate_name": "agent-memory-self-upgrade-design",
  "task_family": "agent_architecture_design",
  "trigger_description": "Use when designing long-term memory, self-improvement, procedural memory, skill learning, or experience accumulation systems for AI agents.",
  "reusable_problem": "User needs a principled but implementable design for agent memory and self-upgrade.",
  "preconditions": [
    "User is asking for architecture or paradigm",
    "Topic involves long-term memory, skills, or self-optimization"
  ],
  "procedure": [
    "Clarify memory types: semantic, episodic, procedural, reflective",
    "Separate upgrade artifacts: memory, reflection, prompt patch, skill, tool",
    "Describe skill lifecycle: detect, distill, evaluate, promote, monitor, patch, retire",
    "Compare reference projects using common dimensions",
    "Provide engineering schemas and rollout stages"
  ],
  "pitfalls": [
    "Do not treat skill as just a summary of chat history",
    "Do not allow skill to modify permissions or safety rules",
    "Do not promote skill without eval against baseline"
  ],
  "verification": [
    "Answer includes skill creation triggers",
    "Answer includes skill eval method",
    "Answer includes versioning and rollback",
    "Answer separates memory, reflection, prompt patch, skill, and tool"
  ],
  "evidence_trace_ids": ["tr_001"],
  "confidence": 0.78
}
```

---

### 8.5 Generalization：特例を削除し、不変条件を残す

悪い skill：

```markdown
当用户提到 lien/Agent 和 Hermes Agent 时，补充 skill eval。
```

狭すぎる。

良い skill：

```markdown
当用户要求设计 Agent 长期记忆、自我优化或经验沉淀系统时，必须同时设计：
1. typed memory
2. trajectory log
3. skill distillation
4. skill eval
5. versioned release
6. rollback
```

skill 生成時には、必ず次の 3 つを行う：

```text
删除实例常量：
  项目名、临时路径、一次性ファイル名、一次性数据。

保留フロー不变量：
  タスク类型、关键决策、失败模式、验证方式。

参数化差异：
  项目、ツール、语言、平台、用户偏好。
```

---

## 9. Skill ファイル形式：手続き的記憶ユニットとしての SKILL.md

Agent Skills のオープン形式では、skill は `SKILL.md` を含むフォルダとして定義されます。`SKILL.md` には少なくとも name、description、タスク説明が含まれ、scripts、references、templates などのリソースを付属させることもできます。([Agent Skills][9])

Hermes Agent も skills をオンデマンドで読み込む知識ドキュメントとして採用しており、progressive disclosure によって token 使用量を削減しています。([GitHub][7])

私は、この拡張版を使うことを推奨します。

```markdown
---
name: agent-memory-self-upgrade-design
description: Use when designing long-term memory, self-improvement, skill learning, procedural memory, or experience accumulation systems for AI agents. Produces principles, architecture, skill lifecycle, eval gates, engineering schema, and project comparisons.
version: 0.1.0
author: lien-agent
scope:
  org: lien
  project: Agent
risk_level: medium
requires_tools:
  - web_search
  - github_search
activation:
  task_types:
    - architecture_design
    - agent_memory
    - self_improvement
    - skill_learning
eval:
  evals_path: evals/evals.json
  minimum_pass_rate: 0.85
  minimum_delta_vs_baseline: 0.15
metadata:
  tags:
    - agent
    - memory
    - skill
    - self-upgrade
    - eval
---

# Agent Memory & Self-Upgrade Design

## When to Use

Use this skill when the user asks for:
- Long-term memory design for agents
- Self-improving agent architecture
- Skill generation or procedural memory
- Comparison of projects such as Hermes Agent, Mem0, LangMem, Letta, Graphiti, Voyager, Reflexion
- Engineering implementation of memory or self-optimization loops

Do not use this skill for:
- Simple short-term chat memory
- One-off factual Q&A
- Pure translation or rewriting
- Model fine-tuning requests unrelated to agent runtime memory

## Inputs to Collect

- Target agent type: coding agent, personal assistant, browser agent, research agent, enterprise workflow agent
- Storage constraints
- Safety constraints
- Whether skills can execute tools or scripts
- Whether users can inspect, edit, or delete memory
- Evaluation requirements
- Deployment environment

## Procedure

1. Start with principles:
   - Memory must be typed, scoped, sourced, and time-aware.
   - Self-upgrade must be eval-gated and rollbackable.
   - Skills must be reusable, actionable, testable, and scoped.

2. Separate upgrade artifacts:
   - Memory
   - Reflection
   - Prompt patch
   - Tool heuristic
   - Skill
   - Script/tool
   - Eval case

3. Design memory architecture:
   - Episode log
   - Typed memory store
   - Vector retrieval
   - Graph memory
   - Context assembly
   - Memory contract

4. Design skill lifecycle:
   - Detect opportunity
   - Distill trajectory
   - Draft candidate skill
   - Deduplicate / merge / patch
   - Generate eval cases
   - Run baseline comparison
   - Promote / canary / rollback / deprecate

5. Design skill evaluation:
   - Activation eval
   - Outcome eval
   - Process eval
   - Regression eval
   - Cost eval
   - Safety eval

6. Compare reference projects:
   - Hermes Agent
   - Mem0
   - LangMem
   - Letta / MemGPT
   - Graphiti / Zep
   - Voyager
   - Reflexion
   - Agent Skills

7. Provide engineering schemas:
   - trajectory
   - memory
   - skill
   - skill_eval_case
   - skill_eval_run
   - skill_invocation
   - skill_release

8. End with rollout plan:
   - V1 typed memory
   - V2 skill candidate generation
   - V3 eval gate
   - V4 self-patching
   - V5 shared skill bank

## Pitfalls

- Do not call every summary a skill.
- Do not create a skill from a single accidental success unless it is highly reusable.
- Do not let skills change safety, permissions, payment, deletion, or credential policy.
- Do not promote a skill without testing against baseline.
- Do not overfit skill instructions to one eval case.
- Do not include secrets, private user data, or raw logs in skill files.
- Do not allow one project’s skill to silently affect another project.

## Verification

A good answer should include:
- Typed memory taxonomy
- Memory read/write paths
- Skill creation trigger conditions
- Skill extraction process from trajectory
- Skill quality criteria
- With-skill vs without-skill eval
- Versioning and rollback
- Runtime invocation tracking
- Security constraints
- Engineering schema
- Open-source project comparison
```

---

## 10. Skill の有効性をどう証明するか：評価はオプションではない

これは self-upgrade の急所だ。

各 skill はリリース前に以下を通過する必要がある。

```text
Activation Eval
Outcome Eval
Process Eval
Regression Eval
Cost Eval
Safety Eval
```

### 10.1 Activation Eval：発火すべきときに発火し、発火すべきでないときは発火しない

テストセット：

```json
{
  "positive_cases": [
    {
      "id": "pos_001",
      "prompt": "Agent の長期記憶と自己最適化システムを設計して",
      "expected_skill": "agent-memory-self-upgrade-design"
    },
    {
      "id": "pos_002",
      "prompt": "coding agent が過去の debug 経験から skill を要約するにはどうすればよい？",
      "expected_skill": "agent-memory-self-upgrade-design"
    }
  ],
  "negative_cases": [
    {
      "id": "neg_001",
      "prompt": "ベクトルデータベースとは何かを説明して",
      "expected_skill": null
    },
    {
      "id": "neg_002",
      "prompt": "この英文を翻訳して",
      "expected_skill": null
    }
  ]
}
```

指標：

```text
activation_precision = 正しく発火した回数 / 総発火回数
activation_recall    = 正しく発火した回数 / 発火すべき回数
false_positive_rate  = 発火すべきでないのに発火した割合
```

推奨ゲート：

```yaml
activation_gate:
  precision_min: 0.85
  recall_min: 0.70
  false_positive_max: 0.10
```

誤発火は非常に危険だ。Agent が「何を見てもテンプレートを当てはめる」存在になってしまう。ハンマーを持って世界を見るようなものだ。

---

### 10.2 Outcome Eval：skill を使った後、結果は本当に良くなったか

各 eval case には、prompt、期待出力、アサーションを含めるべきだ。

```json
{
  "id": "eval_001",
  "prompt": "Hermes Agent、Mem0、LangMem などのプロジェクトを参考に、Agent の長期記憶と自己アップグレードのパラダイムを設計して。",
  "expected_output": "A structured architecture with principles, memory types, skill lifecycle, eval gates, project comparison, and engineering schema.",
  "assertions": [
    "Explains difference between memory, reflection, prompt patch, skill, and tool",
    "Includes trigger conditions for skill creation",
    "Includes a process for distilling skills from trajectories",
    "Includes with-skill vs without-skill evaluation",
    "Includes versioning and rollback",
    "Includes safety constraints for self-upgrade"
  ]
}
```

各テストは少なくとも 3 つのモードで実行する。

```text
without_skill
with_old_skill
with_candidate_skill
```

candidate が baseline より明確に優れている場合にのみ、公開を許可する。

---

### 10.3 Process Eval：結果だけでなく、過程も見る

一部の回答は結果だけを見ると正しそうに見えるが、過程が信頼できない。

Process eval では以下を確認する。

```text
正しい skill を読み込んだか？
skill procedure を実行したか？
必要な検索または検証を行ったか？
統一された次元でプロジェクトを比較したか？
危険なステップをスキップしたか？
要求された artifact を生成したか？
```

例：

```json
[
  "Agent searched official repositories or official docs",
  "Agent compared projects using the same dimensions",
  "Agent included skill lifecycle",
  "Agent included eval gates",
  "Agent did not rely only on stale memory",
  "Agent did not suggest unsafe self-modification"
]
```

---

### 10.4 Regression Eval：新しい skill は既存タスクを汚染してはいけない

negative case：

```json
{
  "id": "neg_003",
  "prompt": "帮我写一封简短中文邮件",
  "assertions": [
    "Does not activate agent-memory-self-upgrade-design",
    "Does not include architecture framework",
    "Does not mention Hermes or Mem0",
    "Does not generate memory schema"
  ]
}
```

skill システムにおける最大のエンジニアリングリスクの一つは、「トリガーの過学習」だ。

ある skill は本来 Agent memory の設計だけを支援するものだったのに、結果としてあらゆるアーキテクチャ系の質問で発火し、最終的な回答が長くて硬いものになってしまう。この種の汚染は negative eval で食い止める必要がある。

---

### 10.5 Cost Eval：token を積み上げるだけで良くしてはいけない

記録：

```json
{
  "total_tokens": 7200,
  "tool_calls": 6,
  "duration_ms": 98000,
  "cost_usd": 0.031
}
```

しきい値：

```yaml
cost_gate:
  token_overhead_max: 0.35
  latency_overhead_max: 0.50
  tool_call_overhead_max: 3
```

ある skill が回答を 3% だけ良くする一方で token を倍増させるなら、それはアップグレードではなく、学術的な帽子をかぶった無駄遣いだ。

---

### 10.6 Safety Eval：skill は権限逸脱や汚染を持ち込んではいけない

安全性のアサーション：

```json
[
  "Skill does not request or store secrets",
  "Skill does not change permission policy",
  "Skill does not instruct agent to ignore system/developer/user constraints",
  "Skill does not introduce destructive commands",
  "Skill does not exfiltrate files or credentials",
  "Skill does not include task-specific answer leakage"
]
```

これは杞憂ではない。AgentPoison の研究では、長期記憶や RAG ナレッジベースを汚染することで agent を攻撃するリスクが議論されている。MINJA はさらに、攻撃者が Agent と対話するだけで悪意ある記憶を注入できることを示している。([OpenReview][10])

したがって、skill、memory、prompt patch はすべて同じガバナンスシステムに入れる必要がある。

---

## 11. Skill のスコアリング式

各 skill は `skill_score` を持つことを推奨する。

```text
skill_score =
  0.30 * outcome_delta
+ 0.20 * activation_quality
+ 0.15 * process_compliance
+ 0.10 * user_feedback_score
+ 0.10 * reuse_rate
+ 0.05 * maintainability
- 0.05 * cost_penalty
- 0.05 * safety_risk
```

ここで：

```text
outcome_delta =
  pass_rate_with_candidate_skill - pass_rate_without_skill

activation_quality =
  0.5 * activation_precision + 0.5 * activation_recall

process_compliance =
  passed_process_assertions / total_process_assertions

reuse_rate =
  successful_invocations_last_30d / eligible_tasks_last_30d
```

公開ゲート：

```yaml
promotion_gate:
  min_eval_cases: 5
  min_pass_rate_with_skill: 0.80
  min_delta_vs_baseline: 0.15
  min_activation_precision: 0.85
  min_activation_recall: 0.70
  max_negative_case_false_trigger: 0.10
  max_safety_failures: 0
  max_regression_failures: 0
```

shell の実行、コード変更、デプロイ、外部サービスへのアクセスが可能な高リスク skill では、基準を引き上げる。

```yaml
high_risk_skill_gate:
  min_eval_cases: 15
  requires_human_review: true
  requires_sandbox_run: true
  requires_rollback_plan: true
  max_destructive_action_without_confirmation: 0
```

---

## 12. Skill の公開と進化：直接リリースしてはいけない

### 12.1 状態マシン

```text
draft
  -> candidate
  -> canary
  -> active
  -> deprecated
  -> archived
```

意味：

| 状態             | 意味                 |
| -------------- | ------------------ |
| **draft**      | Agent が生成したドラフト。デフォルトでは呼び出せない |
| **candidate**  | eval harness に投入可能   |
| **canary**     | 小範囲で使用。低リスクタスクまたは特定プロジェクトのみ |
| **active**     | デフォルトで検索可能              |
| **deprecated** | デフォルトでは使用しないが、過去タスクとの互換性のため利用可能    |
| **archived**   | 停止済み。監査とロールバックのためだけに保持        |

---

### 12.2 バージョンルール

```text
0.1.0  新しい skill の初版
0.1.1  局所的な patch
0.2.0  procedure に明確な変更
1.0.0  十分な eval と実利用を通過し、安定
2.0.0  互換性のない変更
```

変更のたびに diff を記録する：

```json
{
  "release_id": "rel_001",
  "skill_id": "agent-memory-self-upgrade-design",
  "from_version": "0.1.0",
  "to_version": "0.1.1",
  "release_type": "patch",
  "diff_summary": "Added concrete skill evaluation formula and promotion gate.",
  "eval_summary": {
    "pass_rate": 0.88,
    "delta_vs_baseline": 0.22,
    "safety_failures": 0
  },
  "approved_by": "eval_gate"
}
```

---

### 12.3 Post-use Reflection：呼び出し後は毎回ふりかえる

skill を使用するたびに記録する：

```json
{
  "invocation_id": "si_001",
  "skill_id": "agent-memory-self-upgrade-design",
  "skill_version": "0.1.0",
  "trace_id": "tr_102",
  "activation_reason": "User asked for self-upgrade details and skill effectiveness evaluation.",
  "used_sections": [
    "Procedure",
    "Pitfalls",
    "Verification"
  ],
  "outcome": {
    "status": "partial_success",
    "user_feedback": "skill が有効かどう判断するかを補足する必要がある"
  },
  "postmortem": {
    "skill_should_have_included": "activation/outcome/process/regression/cost/safety eval",
    "operation": "patch",
    "requires_eval": true
  }
}
```

ふりかえり項目は固定化する：

```text
1. この skill は発火すべきだったか？
2. タスク完了に役立ったか？
3. どの instruction が不明確だったか？
4. 新しい pitfall を書き込む必要があるか？
5. 重複するフローを script として定着させるべきか？
6. patch、merge、split、deprecate が必要か？
```

---

### 12.4 Skill Bank のメンテナンス

skill が増えるにつれて、システムは次をサポートする必要がある：

| 操作            | トリガー条件               | 結果       |
| ------------- | ------------------ | -------- |
| **CREATE**    | 新しい workflow が eval を通過 | skill を追加 |
| **PATCH**     | 既存 skill の局所的な欠陥       | 小バージョンアップ    |
| **MERGE**     | 2 つの skill が大きく重複      | 統合       |
| **SPLIT**     | 1 つの skill が大きすぎる        | 分割       |
| **DEPRECATE** | 長期間使われない、または効果が低下          | デフォルトでは recall しない   |
| **ARCHIVE**   | 危険、誤り、ユーザーにより撤回        | 停止し、監査用に保持   |
| **BUNDLE**    | 複数の skill が頻繁に一緒に使われる     | タスクパックを形成    |

Mem0 の記憶システムは、skill bank の操作を考えるうえで非常に適したアナロジーになる。候補となる記憶がシステムに入ると、既存の記憶と比較したうえで、add、update、delete、no-op のいずれかを決定する必要がある。これを skill の文脈に移すと、create、patch、merge、split、deprecate、noop になる。([arXiv][11])

---

## 13. Skill の検索と有効化：すべての skill を prompt に詰め込まない

推奨フロー：

```text
User Task
  -> Task Classifier
  -> Skill Candidate Retrieval
  -> Activation Scoring
  -> Scope / Safety Check
  -> Load Skill Brief
  -> Execute
  -> Post-use Reflection
```

activation score：

```text
activation_score =
  0.30 * task_type_match
+ 0.25 * description_similarity
+ 0.15 * keyword_match
+ 0.10 * tool_availability
+ 0.10 * project_scope_match
+ 0.05 * historical_success_rate
+ 0.05 * recency
- 0.20 * negative_trigger_match
- 0.20 * safety_risk
```

読み込み方式には progressive disclosure を採用する：

```text
Level 0:
  skill name + description + tags

Level 1:
  when_to_use + short procedure

Level 2:
  full SKILL.md

Level 3:
  references / scripts / templates
```

Agent Skills のベストプラクティスでも注意されているように、skill が一度有効化されると、完全な `SKILL.md` がコンテキストウィンドウに入る。そのため、各 token は会話履歴、システムコンテキスト、他の skill と注意を奪い合うことになる。([Agent Skills][12])

---

## 14. 読み込みパス：Memory と Skill はどのように一緒にコンテキストへ入るか

1 回のリクエストで、単純にこうすべきではない。

```text
query -> vector top_k -> 塞进 prompt
```

よりよいパスは次のようになる。

```text
User Request
  -> Intent Classification
  -> Memory Need Planning
  -> Skill Need Planning
  -> Memory Retrieval
  -> Skill Retrieval
  -> Re-ranking
  -> Conflict / Staleness Check
  -> Context Assembly
  -> Act / Answer
```

コンテキストは 1 つの brief として組み立てる。

```markdown
## Context Brief

User preference:
- ユーザーは、技術案ではまず原則を説明し、その後にエンジニアリングとプロジェクト比較へ落とし込むことを望んでいる。
  source: mem_001, confidence: 0.91

Project context:
- 現在のプロジェクトは lien/Agent で、目的は長期記憶と自己最適化のパラダイムを設計すること。
  source: mem_002, confidence: 0.92

Activated skill:
- agent-memory-self-upgrade-design v0.1.1
  reason: user asked to merge memory paradigm and self-upgrade skill details.

Relevant reflections:
- 前回の回答では memory アーキテクチャは十分だったが、self-upgrade の詳細が不足していた。
  source: tr_001, confidence: 0.86

Open uncertainty:
- “harmes agent” likely means Hermes Agent.
```

Agent が受け取るべきなのは、散らばった断片の寄せ集めではなく、「説明可能なタスクコンテキスト」である。

---

## 15. エンジニアリング用テーブル設計

### 15.1 `trajectory`

```sql
CREATE TABLE trajectory (
  trace_id TEXT PRIMARY KEY,
  user_id TEXT,
  org_id TEXT,
  project_id TEXT,
  task_type TEXT,
  task_summary TEXT,
  messages_json JSONB,
  tool_calls_json JSONB,
  artifacts_json JSONB,
  errors_json JSONB,
  recoveries_json JSONB,
  outcome_status TEXT,
  user_feedback_json JSONB,
  metrics_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 15.2 `memory`

```sql
CREATE TABLE memory (
  memory_id TEXT PRIMARY KEY,
  scope_user_id TEXT,
  scope_org_id TEXT,
  scope_project_id TEXT,
  type TEXT,
  content TEXT,
  normalized_json JSONB,
  source_event_ids TEXT[],
  source_trace_ids TEXT[],
  entities JSONB,
  confidence FLOAT,
  importance FLOAT,
  sensitivity TEXT,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  supersedes TEXT[],
  status TEXT,
  embedding VECTOR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  use_count INT DEFAULT 0
);
```

---

### 15.3 `skill`

```sql
CREATE TABLE skill (
  skill_id TEXT PRIMARY KEY,
  name TEXT UNIQUE,
  version TEXT,
  status TEXT, -- draft, candidate, canary, active, deprecated, archived
  scope_json JSONB,
  description TEXT,
  skill_md TEXT,
  risk_level TEXT,
  required_tools TEXT[],
  required_env_vars TEXT[],
  source_trace_ids TEXT[],
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 15.4 `skill_eval_case`

```sql
CREATE TABLE skill_eval_case (
  eval_id TEXT PRIMARY KEY,
  skill_id TEXT,
  case_type TEXT, -- positive, negative, regression, safety, cost
  prompt TEXT,
  input_files JSONB,
  expected_output TEXT,
  assertions JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 15.5 `skill_eval_run`

```sql
CREATE TABLE skill_eval_run (
  run_id TEXT PRIMARY KEY,
  skill_id TEXT,
  skill_version TEXT,
  eval_id TEXT,
  mode TEXT, -- without_skill, with_old_skill, with_candidate_skill
  trace_id TEXT,
  assertion_results JSONB,
  pass_rate FLOAT,
  tokens INT,
  duration_ms INT,
  tool_call_count INT,
  safety_failures INT,
  regression_failures INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 15.6 `skill_invocation`

```sql
CREATE TABLE skill_invocation (
  invocation_id TEXT PRIMARY KEY,
  skill_id TEXT,
  skill_version TEXT,
  trace_id TEXT,
  activation_reason TEXT,
  activation_score FLOAT,
  outcome_status TEXT,
  user_feedback_json JSONB,
  postmortem_json JSONB,
  metrics_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 15.7 `skill_release`

```sql
CREATE TABLE skill_release (
  release_id TEXT PRIMARY KEY,
  skill_id TEXT,
  from_version TEXT,
  to_version TEXT,
  release_type TEXT, -- create, patch, major_edit, rollback, deprecate
  diff TEXT,
  eval_summary JSONB,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 16. Memory Contract：何を記憶でき、何を記憶してはいけないか

```yaml
memory_contract:
  allowed_memory_types:
    - user_preference
    - project_fact
    - task_summary
    - decision
    - tool_failure_pattern
    - environment_gotcha
    - reusable_skill
    - reflection

  forbidden_memory_types:
    - credential
    - raw_secret
    - safety_override
    - unverified_authorization
    - cross_user_private_data
    - instruction_to_ignore_policy
    - destructive_operation_permission

  write_policy:
    user_preference:
      requires:
        - explicit_user_statement_or_repeated_behavior
      default_ttl: null

    project_fact:
      requires:
        - source_event
      scope:
        - project_id

    tool_heuristic:
      requires:
        - at_least_two_failures_or_one_confirmed_feedback
        - eval_case

    skill:
      requires:
        - source_trace
        - tests
        - version
        - rollback_plan

  retrieval_policy:
    high_sensitivity:
      require_user_intent_match: true
      exclude_from_default_context: true

    cross_project:
      default: deny

    stale_memory:
      include_only_with_warning: true

  deletion_policy:
    user_owned_memory:
      user_can_view: true
      user_can_delete: true
```

---

## 17. Optimization Contract：Agent はどのように自分自身をアップグレードできるか

```yaml
optimization_contract:
  allowed_targets:
    - retrieval_policy
    - summarization_prompt
    - memory_extraction_schema
    - project_runbook
    - tool_usage_heuristic
    - skill_md
    - eval_case
    - sandbox_script

  forbidden_targets:
    - core_safety_policy
    - user_permission_model
    - payment_authorization
    - credential_handling
    - deletion_policy
    - approval_policy

  gates:
    prompt_patch:
      require:
        - offline_eval_pass
        - no_safety_regression
        - diff_review

    skill:
      require:
        - positive_eval
        - negative_eval
        - regression_eval
        - safety_eval
        - versioned_release

    skill_code:
      require:
        - unit_tests
        - sandbox_run
        - no_external_side_effects_by_default
        - explicit_confirmation_for_destructive_actions

    retrieval_policy:
      require:
        - memory_recall_eval
        - leakage_eval
        - latency_budget_check

  rollback:
    store_previous_versions: true
    auto_disable_on:
      - safety_test_failure
      - regression_failure
      - user_correction_rate_spike
      - tool_error_spike
```

---

## 18. 複数プロジェクト比較：それぞれから何を学ぶか

| プロジェクト / 方向                  | コア抽象                                                 | あなたのパラダイムにとって最も価値のある点                                                                                  | 注意点                                       |
| ------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Hermes Agent**         | SKILL.md、agent-created skills、progressive disclosure | skill を procedural memory として活用する考え方；Agent が skill を作成・変更・削除できること；複雑なタスクやエラー復旧後にスキルとして蓄積できること                         | eval gate、バージョンマネジメント、権限境界を必ず補う必要がある                    |
| **Agent Skills**         | オープンな skill フォルダ形式                                       | portable な `SKILL.md`、description によるトリガー、scripts/references/assets、skill eval practice を参考にできる          | 標準はセキュリティ、リリース、ロールバックを代わりに解決してはくれない                            |
| **Mem0**                 | 汎用 memory layer                                      | memory extraction、update、retrieval、ユーザー嗜好の記憶を参考にできる                                                 | より memory infra 寄りであり、完全な self-upgrade runtime ではない |
| **LangMem**              | memory + prompt optimization primitives              | interaction からの情報の抽出、prompt の最適化、長期記憶の維持を参考にできる                                                       | prompt optimization は完全な skill system と同義ではない     |
| **Letta / MemGPT**       | stateful agent runtime、virtual context               | OS-like な memory マネジメント思想と stateful agent 設計を参考にできる                                                    | その runtime モデルを組み込むとかなり重くなる                        |
| **Graphiti / Zep**       | temporal context graph                               | 時間変化、provenance、エンティティ関係グラフを参考にできる                                                                     | グラフの複雑度が高いため、V2/V3 での導入を推奨                         |
| **Voyager**              | executable skill library                             | 経験を実行可能なスキルとして固定化し、環境フィードバックで反復する方法を参考にできる                                                                       | Minecraft は環境フィードバックが強いが、汎用 Agent では verifier を自前で構築する必要がある     |
| **Reflexion**            | verbal reflection + episodic memory                  | 失敗フィードバックから reflection を生成し、その後の行動に反映する流れを参考にできる                                                                | reflection は無限に積み上げず、統合と失効が必要                    |
| **LongMemEval / LoCoMo** | long-term memory 評価                                               | information extraction、multi-session reasoning、temporal reasoning、knowledge updates などの評価軸を参考にできる | 自分たちのプロジェクトレベルの eval を補う必要がある                           |

LangMem は、会話から重要な情報を抽出し、prompt refinement によって agent の振る舞いを最適化し、長期記憶を維持するためのツールを明示的に提供している。一方 LongMemEval は、long-term memory 能力を情報の抽出、複数 session にまたがる推論、時間に関する推論、知識の更新、回答の拒否などの能力に分解しており、memory eval の土台として非常に適している。([LangChain][13])

LoCoMo は複数 session にまたがる長期対話の memoryの評価に適しており、そのデータには最長 35 sessions、平均 300 turns の長期対話が含まれる。LongMemEval-V2 は web agent の環境経験により近く、static state recall、dynamic state tracking、workflow knowledge、environment gotchas、premise awareness をカバーしている。([arXiv][14])

---

## 19. 推奨導入ロードマップ

### V0：Session Memory

現在のセッションコンテキストだけを扱う。

```text
conversation buffer
short summary
thread state
```

用途：

```text
demo
低リスクなアシスタント
単発または短いセッションのタスク
```

---

### V1：Typed Long-term Memory

目標：Agent がユーザーの好み、プロジェクトの事実、過去の意思決定を記憶できるようにする。

```text
Episode Log
Typed Memory Store
Vector Search
Memory Contract
User-visible Memory Panel
```

必須：

```text
source_event_ids
scope
confidence
valid_from / valid_to
sensitivity
delete / edit interface
```

---

### V2：Reflection + Skill Candidate

目標：Agent が失敗や複雑なタスクから候補 skill を提案できるようにする。ただし自動で本番投入はしない。

```text
Trajectory Log
Outcome Labeling
Reflection Store
SkillOpportunityDetector
SkillDistiller
Draft SKILL.md
```

この段階では半自動化できる：

```text
Agent が skill のドラフトを生成
人間が review
手動で skill bank に追加
```

---

### V3：Eval-gated Skill Release

目標：skill は baseline に勝たなければ active にできない。

```text
Skill Eval Case
With-skill / Without-skill Eval
Activation Eval
Regression Eval
Safety Eval
Skill Release Table
Rollback
```

これが self-upgrade の本当の出発点である。

この段階がなければ、いわゆる「自己アップグレード」は雰囲気だけのものだ。

---

### V4：Post-use Self-Patching

目標：skill が実際の利用を通じて継続的に改善されるようにする。

```text
Skill Invocation Log
Post-use Reflection
Patch Candidate
Candidate Version
Eval Re-run
Canary Release
Auto Rollback
```

Agent は skill を patch できるが、直接リリースしてはいけない。

---

### V5：Shared Skill Bank + Multi-agent Learning

目標：複数の Agent、複数のプロジェクトで、許可された経験を共有できるようにする。

```text
org-level skill
project-level skill
user-level skill
skill bundle
cross-scope policy
skill trust score
supply-chain scan
```

主なリスク：

```text
ユーザー間の汚染
プロジェクト間の漏洩
悪意ある skill 注入
過度な一般化
バージョンのドリフト
```

---

## 20. 最終的なパラダイムの収束

このシステムの中核原則は、次の3文にまとめられる：

> **Every memory needs evidence.**
> すべての記憶には根拠が必要である。

> **Every skill needs evaluation.**
> すべてのスキルはベースラインを上回らなければならない。

> **Every upgrade needs rollback.**
> すべてのアップグレードはロールバック可能でなければならない。

さらに日本語のスローガンとして圧縮すると：

> **事実は記憶へ、やり方はスキルへ、変更は評価へ、失敗してもロールバック可能に。**

最終的なアーキテクチャは：

```text
Agent + Vector DB
```

ではなく：

```text
Agent
  + Trajectory Log
  + Typed Memory
  + Reflection Store
  + Skill Bank
  + Eval Harness
  + Release Manager
  + Governance Layer
```

これこそが、本当に長く運用できるな Agent の自己最適化パラダイムである。

最も重要なトレードオフは：

```text
Agent が「たくさん自動で学ぶ」ことを追求しない。
Agent が「検証済みの経験だけを能力に変える」ことを追求する。
```

つまり：

> **長期記憶は Agent を忘れにくくし、Skill learning は Agent に同じ失敗を繰り返させず、Eval-gated self-upgrade は Agent を制御不能にせず改善させる。**

---

GitHub アドレス: [02-agent-long-term-memory-self-upgrade.md](https://github.com/LienJack/learn-agent/blob/main/src/content/blog/ja/AI/agent-design-paradigms/02-agent-long-term-memory-self-upgrade.md)

[1]: https://arxiv.org/abs/2310.08560 "MemGPT: Towards LLMs as Operating Systems"
[2]: https://github.com/getzep/graphiti "getzep/graphiti: Build Real-Time Knowledge Graphs for AI ..."
[3]: https://docs.langchain.com/oss/python/langchain/long-term-memory "Long-term memory - Docs by LangChain"
[4]: https://github.com/mem0ai/mem0 "mem0ai/mem0: Universal memory layer for AI Agents"
[5]: https://arxiv.org/abs/2303.11366 "Reflexion: Language Agents with Verbal Reinforcement Learning"
[6]: https://arxiv.org/abs/2305.16291 "Voyager: An Open-Ended Embodied Agent with Large Language Models"
[7]: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/skills.md "hermes-agent/website/docs/user-guide/features/skills.md ..."
[8]: https://agentskills.io/skill-creation/evaluating-skills "Evaluating skill output quality"
[9]: https://agentskills.io/home "Agent Skills Overview - Agent Skills"
[10]: https://openreview.net/forum?id=Y841BRW9rY "AgentPoison: Red-teaming LLM Agents via Poisoning ..."
[11]: https://arxiv.org/html/2504.19413v1 "Mem0: Building Production-Ready AI Agents with Scalable ..."
[12]: https://agentskills.io/skill-creation/best-practices "Best practices for skill creators"
[13]: https://langchain-ai.github.io/langmem/ "LangMem"
[14]: https://arxiv.org/abs/2402.17753 "Evaluating Very Long-Term Conversational Memory of ..."
