---
title: "Trace Analysis：事実ログで Agent 失敗を特定する"
description: "前の数篇で、小さな CLI Agent はかなり現実的な位置まで来た。"
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.jpg'
locale: "ja"
tags:
  - Agent
  - Harness
  - Trace Analysis
  - Observability
  - Evaluation
  - 技術チュートリアル
aliases:
  - Agent Trace Analysis
  - Agent 失敗原因の特定
  - 事実ログ診断
  - Harness 可観測性
---

# Trace Analysis：事実ログで Agent 失敗を特定する

前の数篇で、小さな CLI Agent はかなり現実的な位置まで来た。

もはや一回のモデル呼び出しではない。

provider がある。

loop がある。

core kernel がある。

intent / execution 分離がある。

tool runtime がある。

permission がある。

messages が事実源ではないと知っている。

session event log を永続化できる。

局所タスクを sub-agent に委任し、子タスク trace を父タスクへ merge できる。

これはかなり動くシステムに見える。

しかし実際にプロジェクトに入れると、すぐ新しい問題に出会う。

ユーザーが言う。

```text
このプロジェクトのテストが失敗しています。原因を見つけて直してください。
```

Agent がしばらく走る。

ファイルを読む。

テストを走らせる。

コードを変更する。

もう一度テストを走らせる。

最後にこう言う。

```text
失敗テストを修正しました。
```

しかしユーザーが再実行すると、まだ失敗している。

今度は調査が必要だ。

trace がなければ、こう推測するしかない。

```text
モデル判断が間違ったのか？
Tool が実行成功しなかったのか？
Context に重要ログがなかったのか？
権限が間違って止めたのか？
observation が間違っていたのか？
テストコマンドを間違ったディレクトリで実行したのか？
sub-agent の結論を誤って merge したのか？
```

どれもありうる。

どれも違うかもしれない。

最悪なのは、失敗をすべて一言に圧縮してしまうことだ。

```text
モデルが賢くなかった。
```

この言葉は楽だ。

しかし工学的価値はほとんどない。

本当の問題が permission、tool runtime、context projection、verification、delegation join にあるなら、モデルを変えても根本修正にはならない。

第 16 篇ではこう述べた。

```text
Session log は事実源である。
Messages は投影にすぎない。
Replay は現実世界を再実行することではなく、説明可能な state を復元すること。
```

第 18 篇ではさらに進めてこう述べた。

```text
子 Agent の trace は父タスクへ merge しなければならない。
親 Agent が外へ渡すのは局所作業であって、制御権ではない。
```

本篇が解くのは次の層の問題だ。

```text
事実ログがあるとして、それを失敗原因を特定できる trace としてどう組織するか？
```

この問いには二つの語がある。

一つは「事実」。

一つは「原因特定」。

事実ログは、システムが完全に記憶喪失ではないことを保証するだけだ。

Trace Analysis は、事実を診断可能な因果チェーンとして並べる。

ログを綺麗に印刷することではない。

各関数に `console.log` を足すことでもない。

答えるべき問いはこれだ。

```text
今回の Agent 失敗は、結局どの層で壊れたのか？
```

この記事の核心はこうだ。

```text
Event log は何が起きたかを記録する。
Trace はなぜそう起きたかを組織する。
Trace Analysis は失敗をモデル、Context、Tool、権限、観察、検証、委任境界へ帰因する。
```

一つだけ区別を覚えるなら、これだ。

```text
ログは「何が起きたか」を教える。
Trace は「どの責任チェーンが切れたか」を教える。
```

例は同じ CLI Agent のテスト修正だ。

今回は走り切れるかだけを見ない。

関心はこうだ。

```text
走り間違えた後、システムはその誤りを説明できるか？
```

## 問題の連鎖

本篇の問題の連鎖を固定する。

```text
Agent 失敗後に最終 transcript だけを見ると、問題は「モデルが間違った」に圧縮される
-> Session log は事実を記録するが、まだ診断 view ではない
-> Trace は goal、context、model decision、intent、permission、execution、observation、verification を因果チェーンにする
-> Trace Analysis は証拠に基づき、失敗をモデル、Context、Tool、権限、observation、検証、委任境界へ帰因する
-> 失敗分類はラベル貼りではなく、修正経路を指す必要がある
-> 帰因前に、モデルが当時重要事実を見ていたか確認する
-> 診断レポートには証拠参照、影響判断、修正提案を残すべきだ
-> これらの失敗サンプルは最終的に eval と regression test に入る
```

## 一、trace がなければ、失敗は「モデルが間違った」に圧縮される

最もよくある失敗現場を見る。

ユーザーが CLI Agent にタスクを渡す。

```text
このプロジェクトのテストが失敗しています。原因を見つけて直してください。
```

Agent は第一ターンでテストを実行する。

テスト出力に重要エラーがある。

```text
TypeError: expected user.id to be string, received number
```

モデルはログを見て、問題は `src/auth/session.ts` にあると判断する。

ファイルを読む。

`normalizeUser` を変更する。

もう一度テストを実行する。

テストはまだ失敗する。

しかし失敗理由は変わっている。

```text
legacy login should preserve numeric user_id for v1 API
```

Agent はこの変化に気づかない。

`user.id` type 周りの修正を続ける。

最後にこう出力する。

```text
auth session テストを修正しました。
```

しかしテストは通っていない。

分析しよう。

最終 transcript しかなければ、見えるのはたぶんこうだ。

```text
モデルは session.ts を読んだ。
モデルは normalizeUser を変更した。
モデルはテストを修正したと言った。
```

この情報は粗すぎる。

答えられない問いがある。

```text
モデルは 2 回目のテスト失敗を見たのか？
2 回目のテスト失敗は切り詰められたのか？
verification は exit code を正しく認識したのか？
モデルは二つの異なる失敗を一つに混同したのか？
Tool 実行は本当に成功したのか？
変更 diff は何か？
sub-agent が legacy API risk を発見していたのか？
親 Agent は join 時にその unknown を無視したのか？
```

trace がなければ調査は読心術になる。

最終出力を見て、モデル内部で何が起きたか想像するしかない。

しかし Agent Harness の工学目標は読心ではない。

各重要境界に証拠を残すことだ。

![Trace Analysis：事実ログで Agent 失敗を特定する Mermaid 1](assets/00-19-trace-analysis-agent-failures/mermaid-01.png)

この図で重要なのは右側のノードが多いことではない。

本当に重要なのは分岐の仕方が変わることだ。

trace がないと、失敗分析は結論から原因を逆算する。

trace があると、失敗分析は事実チェーンに沿って断点を探す。

この二つはまったく違う仕事だ。

前者は経験に依存する。

後者は証拠に依存する。

経験にも価値はある。

しかし production Harness が、事故のたびにシステムに詳しい人の勘へ依存するべきではない。

失敗現場を復盤可能、比較可能、eval に入れられる trace として組織すべきだ。

次に同種失敗が出たとき、システムは「また失敗した」だけではなく、

学習可能なサンプルを一つ増やせる。

## 二、Session log は事実源だが、まだ診断 view ではない

第 16 篇で事実源の土台を作った。

長時間タスクは messages だけを保存してはいけない。

event log を保存する必要がある。

テスト修正タスクなら event はこうなる。

```text
session.started
user.message.created
model.requested
model.responded
tool.intent.created
permission.decided
tool.started
tool.finished
observation.projected
context.projected
verification.started
verification.finished
session.completed
```

これはチャット履歴よりずっと強い。

しかし実際に event log を開くと、それが trace analysis そのものではないことに気づく。

理由は単純だ。

Event log は事実保存向け。

Trace は診断読解向け。

事実保存が気にするのは次だ。

```text
event は完全か？
順序は安定しているか？
artifact は追跡できるか？
副作用は記録されているか？
復旧時に state を再構築できるか？
```

診断読解が気にするのは次だ。

```text
目標は何か？
モデルはどの Context に基づいて判断したか？
どんな intent を出したか？
システムはなぜ許可または拒否したか？
Tool は実際に何をしたか？
observation は結果を忠実に表したか？
次ターンのモデルは何を見たか？
verification は本当に目標を検証したか？
失敗は最終的にどの層に属するか？
```

二つは依存し合うが、同じものではない。

event log は完全でも読みにくいことがある。

たとえば数千 event が時系列に並ぶ。

各 event に `id`、`seq`、`ts`、`payload` がある。

しかし失敗調査では、最初の行から最後まで読みたくない。

まず責任チェーンを見たい。

```text
Goal
-> Context Snapshot
-> Model Judgement
-> Tool Intent
-> Permission Decision
-> Execution Result
-> Observation
-> Next Context Projection
-> Verification
-> Outcome
```

これが trace の第一の役割だ。

底層 event を「一つの判断がどう action につながり、action が次の判断へどうつながったか」のチェーンへ組織する。

![Trace Analysis：事実ログで Agent 失敗を特定する Mermaid 2](assets/00-19-trace-analysis-agent-failures/mermaid-02.png)

この図には重要な境界がある。

```text
event log は入力。
trace view は投影。
```

messages がモデル向け投影であるのと同じだ。

Trace は診断システムと開発者向けの投影だ。

同じ event log から多くの trace view を生成できる。

```text
Tool call ごとに集約した trace。
モデルターンごとに集約した trace。
権限決定ごとに集約した trace。
delegation task ごとに集約した trace。
verification assertion ごとに集約した trace。
failure taxonomy ごとに集約した trace。
```

だから trace analysis をログ書き込み層に hardcode すべきではない。

Session store は事実を保存する。

Trace projector は診断 view を組織する。

Trace analyzer は帰因と提案を行う。

この三層を分けると、システムは安定する。

後から trace UI を変えたり、失敗分類を足したり、eval sample を生成したりしても、事実ログ形式を変える必要がない。

底層 event が十分なら、新しい診断 view は後から何度でも作れる。

## 三、診断可能な trace は少なくとも八つの境界をつなぐ

複雑な UI はまだ考えない。

最小データ構造だけを見る。

Agent 失敗を特定するには、trace は少なくとも八つの境界をつなげなければならない。

```text
目標
モデル判断
tool intent
権限
実行
observation
context projection
verification
```

この八つは適当に並べたものではない。

Agent が「何かをしようとする」から「実行し検証する」までの耐荷重チェーンに対応している。

ユーザー目標がなければ、何を成功と呼ぶか分からない。

モデル判断がなければ、なぜその action を出したか分からない。

Tool intent がなければ、モデルが何をしたかったか分からない。

権限決定がなければ、動作がなぜ許可または拒否されたか分からない。

実行結果がなければ、現実世界で何が起きたか分からない。

Observation がなければ、モデルが次ターンで何を見たか分からない。

Context projection がなければ、重要事実が Context に入ったか分からない。

Verification がなければ、最終成功が証明されたか分からない。

だから trace span は「ただ duration を記録するもの」ではない。

責任境界を載せるべきだ。

簡略 trace object はこう設計できる。

```ts
type TraceRun = {
  runId: string;
  sessionId: string;
  goal: GoalSnapshot;
  turns: TraceTurn[];
  outcome: TraceOutcome;
};

type TraceTurn = {
  turnId: string;
  contextSnapshotId: string;
  visibleToolsHash: string;
  modelDecision: ModelDecisionTrace;
  actions: ActionTrace[];
  verification?: VerificationTrace;
};

type ActionTrace = {
  intent: ToolIntentTrace;
  permission: PermissionTrace;
  execution: ExecutionTrace;
  observation: ObservationTrace;
  causation: {
    modelResponseEventId: string;
    toolIntentEventId: string;
    toolFinishedEventId?: string;
  };
};
```

この構造は標準解ではない。

示したいのはこうだ。

```text
trace はログライブラリの field ではなく、一回の判断チェーンを中心に組織すべきだ。
```

多くのシステムは最初に trace をこう作る。

```text
span name
start time
end time
status
attributes
```

もちろんこれらは有用だ。

latency、error、cost、call relation を見るのに役立つ。

しかし Agent 失敗分析にはもっと意味が必要だ。

Tool call が成功して返ったからといって、Agent 判断が正しいとは限らない。

モデル呼び出しが error でなくても、モデル判断が有効とは限らない。

verification command が実行成功しても、ユーザー目標を検証したとは限らない。

だから trace には「このステップがタスク意味上どの責任を持つか」を残す必要がある。

そうでなければ、どこが遅いかは分かっても、どこが間違ったかは分からない。

![Trace Analysis：事実ログで Agent 失敗を特定する Mermaid 3](assets/00-19-trace-analysis-agent-failures/mermaid-03.png)

この図は Trace Analysis の主幹になる。

Agent が失敗したら、このチェーンに沿って問う。

```text
目標は正しく保持されたか？
Context はモデルに必要事実を与えたか？
モデル判断は事実と一致したか？
intent は構造化され実行可能だったか？
権限は正しい判断をしたか？
Tool 実行は本当に完了したか？
observation は結果を忠実に投影したか？
verification はユーザー目標を検証したか？
```

八つの問いを聞くと、多くの「モデルがダメ」という結論は分解される。

本当にモデル判断ミスかもしれない。

しかしもっと具体的な Harness 問題かもしれない。

これが trace analysis の価値だ。

モデルを無罪にするためではない。

雑な帰因を拒むためだ。

## 四、テスト修正失敗の trace はどう見えるべきか

抽象チェーンを CLI Agent の例に戻す。

ユーザー目標はこうだ。

```text
現在プロジェクトの失敗テストを修正する。
```

簡略だが診断可能な trace はこう展開できる。

```text
Run 00-19-auth-test-fix

Goal:
  auth/session.test.ts の失敗テストを修正し、関連 regression が通ることを確認する。

Turn 1:
  Context:
    プロジェクトルート、package script、ユーザー目標
  Model:
    まずテストを実行して事実を得る必要がある
  Intent:
    bash: pnpm test auth/session.test.ts
  Permission:
    allow read/process, no external side effect
  Execution:
    exitCode=1, stderr artifact=test-output-001.txt
  Observation:
    TypeError: expected user.id to be string, received number

Turn 2:
  Context:
    失敗ログ要約、関連ファイル候補
  Model:
    session normalizer を読む
  Intent:
    read: src/auth/session.ts
  Permission:
    allow read
  Execution:
    ok, artifact=session-ts-002.txt
  Observation:
    normalizeUser は numeric id を保持している

Turn 3:
  Context:
    session.ts 断片、テスト失敗要約
  Model:
    normalizeUser を変更し、id を string に変換する
  Intent:
    edit: src/auth/session.ts
  Permission:
    allow workspace edit
  Execution:
    ok, artifact=patch-003.diff
  Observation:
    変更完了

Turn 4:
  Context:
    patch 要約、原始失敗要約
  Model:
    再度テストを実行する
  Intent:
    bash: pnpm test auth/session.test.ts
  Permission:
    allow
  Execution:
    exitCode=1, artifact=test-output-004.txt
  Observation:
    legacy login should preserve numeric user_id for v1 API

Turn 5:
  Context:
    2 回目の失敗要約
  Model:
    依然として user.id string 問題だと誤判定
  Intent:
    edit: src/auth/session.ts
  Permission:
    allow
  Execution:
    ok
  Observation:
    変更完了

Verification:
  command: pnpm test auth/session.test.ts
  exitCode: 1
  outcome: failed
```

この trace だけでも重要な事実が見える。

```text
2 回目の失敗はエラー種類が変わっている。
```

observation と context projection が正しければ、モデルは根因が別分岐に入ったことに気づくべきだった。

```text
旧 API と numeric user_id の互換性
```

しかし Turn 5 は古い方向の修正を続けている。

これはモデル判断ミスかもしれない。

Context projection が「エラー変化」を強調しなかったのかもしれない。

observation summary が 2 回目の失敗を 1 回目と似たものに書いてしまったのかもしれない。

Trace analyzer はすぐ決めつけてはいけない。

さらに event を見る。

```text
test-output-004.txt の原始ログは何か？
observation.projected は何を書いたか？
context.projected の messages には何が含まれていたか？
model.responded の reasoning 要約または decision 説明は何か？
verification.finished は exitCode=1 を残していたか？
```

ここで trace の価値が出る。

調査は「完全なチャット履歴を読む」ではない。

責任境界に沿って範囲を狭めることになる。

## 五、Failure Taxonomy：失敗分類はラベル遊びではなく、修正経路である

Trace Analysis には失敗分類が必要だ。

そうでないと自然言語要約を量産するだけになる。

分類の目的は事故にきれいなラベルを貼ることではない。

次にどこを修正すべきか決めることだ。

Agent Harness では少なくとも七種類の失敗がある。

```text
model_judgement_error：モデル判断ミス
context_missing：Context 欠落
tool_execution_error：Tool 実行ミス
permission_misclassification：権限誤分類
observation_projection_error：observation 投影ミス
verification_missing：検証欠落
delegation_join_error：delegation join ミス
```

この七種類は、前に作った核心境界に対応する。

修正方法も違う。

モデル判断ミスなら、prompt、Tool 説明、few-shot、モデル選択、タスク分解を直すかもしれない。

Context 欠落なら、context policy、retrieval、compaction、artifact projection を直す。

Tool 実行ミスなら、tool runtime、sandbox、cwd、timeout、引数 schema を直す。

権限誤分類なら、policy、risk classification、human-in-the-loop を直す。

Observation 投影ミスなら、result normalizer、切り詰め戦略、要約 template、エラー保真を直す。

検証欠落なら、verification plan、assertion、テストコマンド、成功判定を直す。

Delegation join ミスなら、task brief、result contract、join policy、review gate を直す。

![Trace Analysis：事実ログで Agent 失敗を特定する Mermaid 4](assets/00-19-trace-analysis-agent-failures/mermaid-04.png)

この図で重要なのは右側の修正経路だ。

修正へ導かない分類はログ装飾にすぎない。

たとえば失敗をこう判定する。

```text
model_reasoning_error
```

システムは証拠を出せるべきだ。

```text
モデルは完全な失敗ログを見ていた。
ログは legacy API 制約を明示していた。
Tool 説明は誤導していなかった。
Context は切り詰められていなかった。
それでもモデルは証拠と矛盾する変更を選んだ。
```

このとき初めてモデル判断ミスと言う資格がある。

証拠チェーンが不完全なら、保守的にこう出すべきだ。

```text
unknown または mixed failure
```

工学上、保守的な帰因は自信満々の誤帰因より重要だ。

誤帰因は最適化を間違った方向へ連れていく。

たとえば実際には verification が走っていないだけなのに、システムがモデルが弱いと言う。

チームは数日 prompt を調整する。

本当の bug はテストコマンドがずっと間違ったディレクトリで実行されていたことだった。

Trace Analysis の使命は、この無駄を減らすことだ。

## 六、モデル判断ミス：まずモデルが十分な事実を見ていたことを証明する

「モデル判断ミス」は最も口にしやすい分類だ。

しかし最後のほうで確認すべき分類でもある。

モデル判断は入力に依存するからだ。

入力が不完全なら、判断ミスは完全にはモデルの責任ではない。

テスト修正例に戻る。

2 回目のテスト失敗後、原始ログにはこうある。

```text
legacy login should preserve numeric user_id for v1 API
```

モデルが次ターンでこの文を見て、それでもすべての id を string に変換しようとするなら、判断ミスの可能性が高い。

しかし context projection がこうしか渡していなければ、

```text
auth session test still failing
```

モデルには正しい判断の機会がない。

だからモデルエラーを判定する前に、trace analyzer は少なくとも確認すべきだ。

```text
重要事実は artifact に存在するか？
重要事実は observation に入ったか？
重要事実は context projection に入ったか？
モデル応答は重要事実を引用または無視したか？
モデルの intent は可視事実と矛盾するか？
```

素朴な帰因関数で表すとこうだ。

```ts
function classifyModelError(trace: TraceTurn): FailureFinding | null {
  const facts = trace.verification?.failureFacts ?? [];
  const visible = trace.context.visibleFacts;
  const decision = trace.modelDecision;

  const missingFacts = facts.filter((fact) => !visible.includes(fact.id));

  if (missingFacts.length > 0) {
    return null;
  }

  if (contradicts(decision.intent, facts)) {
    return {
      type: "model_judgement_error",
      evidence: [
        decision.eventId,
        ...facts.map((fact) => fact.artifactRef),
      ],
      confidence: "medium",
    };
  }

  return null;
}
```

このコードで重要なのは `contradicts` の実装ではない。

前半の順序だ。

```text
まずモデルが事実を見ていたか確認する。
その後、モデルが事実に反したか判断する。
```

多くの Agent 事故は第一段階で倒れている。

モデルは直し方を知らなかったのではない。

直すための情報を見ていなかっただけだ。

これが Trace Analysis と普通のチャット復盤の違いだ。

普通の復盤はこう問う。

```text
モデルはなぜそう考えたのか？
```

Trace Analysis はまずこう問う。

```text
システムはモデルに結局何を見せたのか？
```

この問いのほうが工学的だ。

そして直しやすい。

## 七、Context 欠落：一番危険なのは「事実はログにあるが、モデルの眼前にない」こと

Context 欠落は Agent システムで非常に隠れた失敗だ。

事後にログを見ると、重要事実が確かに存在していることがある。

そこで困惑する。

```text
こんなに明らかなエラーを、モデルはなぜ見なかったのか？
```

答えはこうかもしれない。

```text
実際に見ていなかった。
```

事実が event log にあることは、context projection に入ったことを意味しない。

事実が artifact にあることは、messages に入ったことを意味しない。

事実が sub-agent transcript にあることは、親 Agent join が継承したことを意味しない。

第 16 篇で述べた。

```text
Messages は投影にすぎない。
```

Trace Analysis はこの言葉を使う必要がある。

各重要事実について三つの状態を記録すべきだ。

```text
discovered：システムはこの事実を発見したか。
projected：この事実はモデルへ投影されたか。
used：モデル決定はこの事実を使ったか。
```

たとえばこう。

```text
fact: legacy API requires numeric user_id
discovered: yes, test-output-004.txt
projected: no
used: no
```

これは典型的な context projection failure だ。

モデル判断ミスではない。

Tool 実行ミスでもない。

重要事実が次の判断入力に入らなかったのだ。

![Trace Analysis：事実ログで Agent 失敗を特定する Mermaid 5](assets/00-19-trace-analysis-agent-failures/mermaid-05.png)

この図はよくある錯覚を説明する。

```text
ログにあることは、モデルが見たことではない。
```

Context 欠落はよく次で起きる。

第一に、Tool 出力切り詰め。

テストログが長く、重要エラーが末尾にあり、切り落とされた。

第二に、要約が事実を落とす。

Observation が token 節約のため、具体 assertion を「テストはまだ失敗」と書き換えた。

第三に、compaction が新旧状態を混同する。

一回目の失敗と二回目の失敗が同じ説明に圧縮された。

第四に、retrieval が関連ファイルを取れなかった。

モデルは `session.ts` だけを見て、`legacy-login.ts` を見ていない。

第五に、delegation 結果が父 Context に入らなかった。

子 Agent は旧 API risk を見つけたが、親 Agent には「問題なさそう」だけが返った。

Trace analyzer はこれらを「モデルが気づかなかった」から分離する。

finding はこうなる。

```json
{
  "type": "context_projection_missing_fact",
  "fact": "legacy login requires numeric user_id",
  "discovered_at": "tool.finished:test-output-004",
  "missing_from": "context.projected:turn-5",
  "impact": "model continued editing the wrong normalization path"
}
```

修正方向は明確だ。

モデルを変えるのではない。

context policy を直す。

たとえばこうだ。

```text
verification failure の新しいエラー種別は、次ターン Context に強制的に入れる。
同一コマンドの前後失敗差分は明示的に標識する。
sub-agent unknowns は join summary に入れる。
```

こうして trace analysis は工学改善になる。

## 八、Tool 実行ミス：Tool が error を返すときだけが実行失敗ではない

Tool Runtime の失敗もよく誤判定される。

多くの人は Tool 実行失敗をこう考える。

```text
tool.status = error
```

しかし実システムでは、Tool failure はもっと複雑だ。

Tool は `ok` を返しても、意味的には失敗していることがある。

たとえばテストコマンド。

```text
pnpm test auth/session.test.ts
```

shell Tool が「コマンド起動に成功」だけを見ていれば、こう返すかもしれない。

```text
status: ok
```

しかし実際のプロセス exit code はこうだ。

```text
exitCode: 1
```

これは実行成功ではない。

Tool protocol 設計ミスだ。

read Tool でも同じだ。

モデルはこれを読みたい。

```text
src/auth/session.ts
```

しかし current working directory が違い、別 package の同名ファイルを読んだ。

Tool はファイル内容を返す。

status も `ok`。

だが action semantics は間違っている。

edit Tool でもある。

Patch は適用された。

しかし source ではなく generated file に適用された。

Tool は `ok` を返すかもしれない。

しかしタスクは進んでいない。

だから trace には次だけでは足りない。

```text
toolName
status
duration
```

次も保存する必要がある。

```text
cwd
resolved path
exit code
stdout/stderr artifact
side effect summary
diff artifact
expected semantic outcome
normalization rule
```

CLI Agent では、Tool 実行ミスには少なくとも次がある。

```text
コマンドを間違ったディレクトリで実行した。
コマンド引数が間違った。
Tool schema が緩すぎた。
path 解決が間違った。
timeout が成功として包まれた。
stderr が捨てられた。
patch が誤った位置に適用された。
sandbox と実 workspace が一致していない。
Tool 結果 normalization が間違った。
```

Trace analyzer は Tool 層のミスをモデル層のミスから分ける必要がある。

モデルがこう出した。

```json
{
  "tool": "bash",
  "args": {
    "cmd": "pnpm test auth/session.test.ts",
    "cwd": "/repo"
  }
}
```

これは妥当な intent だ。

しかし tool runtime が実際に実行した cwd がこうだった。

```text
/repo/packages/docs
```

帰因は tool runtime に落ちる。

モデルではない。

最小チェックはこう書ける。

```ts
function classifyExecutionMismatch(action: ActionTrace): FailureFinding | null {
  const expected = action.intent.normalizedInput;
  const actual = action.execution.resolvedInput;

  if (expected.cwd !== actual.cwd) {
    return {
      type: "tool_execution_mismatch",
      evidence: [action.intent.eventId, action.execution.eventId],
      message: "Tool の実際の実行ディレクトリが intent と一致しない",
    };
  }

  if (action.execution.exitCode && action.observation.status === "success") {
    return {
      type: "tool_result_misclassified",
      evidence: [action.execution.eventId, action.observation.eventId],
      message: "非ゼロ exit code が成功として投影された",
    };
  }

  return null;
}
```

二つ目の分岐は次の問題にもつながる。

Observation 投影ミスだ。

ただし先に思い出させる。

```text
Tool 実行は関数の戻り値ではない。
Tool 実行は intent と現実世界副作用の間にある contract である。
```

Trace Analysis はこの contract が壊れていないか確認しなければならない。

## 九、権限誤判定：allow も deny も間違いうる

権限システムの失敗はよくこう単純化される。

```text
危険動作が許可された。
```

もちろんこれは深刻だ。

しかし Agent Harness では、権限誤判定には二方向がある。

第一は誤った allow。

たとえばモデルが出す。

```text
rm -rf dist && pnpm build
```

システムが `rm -rf` の risk を認識せず、直接実行する。

これは現実副作用を生む。

第二は誤った deny。

たとえばモデルが出す。

```text
package.json を読む
```

これは低リスク read-only action だ。

しかし path policy の誤りで拒否した。

Agent は重要情報を失い、推測を始める。

最終的にタスクが失敗する。

これも権限誤判定だ。

権限の目的は一律に保守的であることではない。

risk classification が正確であることだ。

Trace には少なくとも次を残す。

```text
intent risk classification
policy input
policy decision
decision rationale
user approval state
effective permission set
escalation path
```

そうしないと後から権限層が正常だったか判断しにくい。

たとえば Tool intent。

```json
{
  "tool": "edit",
  "path": "src/auth/session.ts",
  "operation": "patch",
  "risk": "workspace_write"
}
```

権限決定。

```json
{
  "decision": "allow",
  "reason": "within workspace, user requested code fix",
  "requiresApproval": false
}
```

現在 policy が許すなら問題ない。

しかし file が次なら、

```text
scripts/deploy-prod.sh
```

同じ allow は危険だ。

Trace analyzer は見つけられる。

```text
高リスク path が人間確認を起動しなかった。
write action がユーザー目標に関連付けられていなかった。
子 Agent の越権要求を親 Agent が自動承認した。
権限拒否の理由がモデルに投影されず、同じ action を繰り返し要求した。
```

権限エラーには特に trace が必要だ。

ユーザーに見えるのは最終挙動だけだからだ。

途中で risk 判断があったかは見えない。

Trace は各 allow / deny を説明可能にすべきだ。

監査を綺麗にするためではない。

権限 policy を反復改善できるようにするためだ。

## 十、Observation 投影ミス：最悪の bug は失敗を成功として書くこと

Tool Runtime が原始結果を返した後、Harness は通常すべてをそのままモデルに渡さない。

observation projection を行う。

これは必要だ。

原始出力は長すぎ、汚く、重複し、敏感情報を含む可能性があるからだ。

しかしここは高リスク境界でもある。

observation が間違えば、モデルの次ターン判断は誤った現実に基づく。

最もよくある問題は、失敗を成功として投影することだ。

たとえば shell 実行結果がこうだ。

```text
exitCode: 1
stderr: legacy login should preserve numeric user_id for v1 API
```

しかし observation がこう書く。

```text
テスト実行が完了しました。
```

この文は間違いではない。

しかし深刻に不十分だ。

モデルはテストが通ったと誤解するかもしれない。

より隠れたものは要約の誤導だ。

原始ログ。

```text
expected string user.id in new session shape
legacy login should preserve numeric user_id for v1 API
```

Observation 要約。

```text
テストは引き続き user.id 型をめぐって失敗しています。
```

この文は二つの制約を一つに混ぜている。

モデルは一方向の修正を続けやすい。

Trace analyzer は三つを比較する必要がある。

```text
原始結果
observation
context projection
```

問いはこうだ。

```text
observation は status を保持したか？
exitCode を保持したか？
新エラーと旧エラーの差分を保持したか？
切り詰めを標識したか？
unknowns を書いたか？
高リスク情報を過剰 filter していないか？
```

Observation 投影ミスの危険はこうだ。

```text
モデルが偽の事実に基づいて真面目に推論する。
```

そのため失敗はモデル問題に見える。

しかし壊れているのは事実投影だ。

trace view では、原始結果と投影結果を横に並べるのがよい。

```text
Raw:
  exitCode=1
  stderr includes "legacy login should preserve numeric user_id"

Observation:
  "テスト実行が完了し、auth session はまだ失敗しています"

Diagnosis:
  具体 assertion がない。新旧失敗差分がない。exitCode の明示がない。
```

この種の finding は regression test に向く。

以後、shell exitCode が非 0 なら observation は必ず failure status を含む。

同じコマンドが前後で異なる失敗情報を持つなら、observation は delta を標識する。

Trace Analysis はこうして observation runtime をより信頼できるものへ押し戻す。

## 十一、検証欠落：verification がなければ、最終成功はただの宣言

Agent のコード修正タスクで、最終回答はよくこうなる。

```text
修正しました。
```

しかし工学システムはこの文を成功として扱えない。

成功は verification で証明されなければならない。

ユーザー目標がこうなら、

```text
失敗テストを修正する。
```

最小 verification は少なくとも答える。

```text
どのテストコマンドを実行したか？
どのディレクトリで実行したか？
exit code は何か？
失敗ログは何か？
原始失敗ケースを cover しているか？
追加 regression check はあるか？
```

trace に verification がなければ、タスク結果はこう扱うべきだ。

```text
unverified
```

success ではない。

このルールは重要だ。

多くの Agent が「賢く」見えるのは、自信ある要約を書けるからだ。

しかし Harness はもっと冷静であるべきだ。

検証がなければ、要約を事実へ昇格してはいけない。

Verification 欠落はよく次で起きる。

```text
モデルがテスト実行を忘れた。
Tool 予算が尽き、システムが早く終了した。
テストコマンドは失敗したが、final message は成功と言った。
関連しているが同等ではないコマンドだけを実行した。
単体テストだけを実行し、影響回帰を実行していない。
検証結果が final decision に入っていない。
```

Trace analyzer は hard check を書ける。

```ts
function classifyMissingVerification(run: TraceRun): FailureFinding | null {
  if (run.outcome.claimedSuccess && !run.outcome.verification) {
    return {
      type: "missing_verification",
      message: "Agent は成功を主張したが、trace に verification event がない",
      evidence: [run.outcome.finalMessageEventId],
    };
  }

  if (run.outcome.verification?.status === "failed" && run.outcome.claimedSuccess) {
    return {
      type: "verification_contradicted_final",
      message: "verification は失敗しているが、最終回答は成功を主張した",
      evidence: [
        run.outcome.verification.eventId,
        run.outcome.finalMessageEventId,
      ],
    };
  }

  return null;
}
```

この種の rule は LLM-as-Judge を必要としない。

構造化 trace があれば直接判断できる。

これも思い出させる。

```text
すべての eval に別のモデルが必要なわけではない。
```

Agent 失敗分析では、多くの低レベルだが高価値な問題を event と assertion だけで捕まえられる。

LLM-as-Judge は意味品質、計画合理性、結果説明の十分性を判断するのに向いている。

しかし exitCode、verification 欠落、権限状態矛盾、tool result misclassified は、まず決定的 rule で見るべきだ。

eval が安く、安定し、CI に入りやすくなる。

## 十二、Delegation Join ミス：子 Agent が見つけたことを、親 Agent が正しく使うとは限らない

第 18 篇ではこう述べた。

```text
delegation は Tool call の一種。
親 Agent が外へ渡すのは作業であって、制御権ではない。
```

Trace analysis では、この文はさらに具体的な問いになる。

```text
子 Agent の発見は、親 Agent の最終決定にどう影響したか？
```

Multi-Agent タスクでは、失敗原因の特定は単一 Agent より複雑だ。

たとえば親 Agent がテスト修正のために二つの子タスクを派遣する。

```text
test-investigator：失敗テストを再現・特定する。
legacy-api-reviewer：旧 API への影響を確認する。
```

`legacy-api-reviewer` が返す。

```text
v1 login API が numeric user_id に依存していることを発見。
normalizeUser がすべて string に変換すると旧 API を壊す。
証拠：src/routes/legacy-login.ts:42。
unknown：古い mobile client は未確認。
```

親 Agent が join 時にこう書いてしまう。

```text
旧 API の risk は見つかりませんでした。
```

そしてすべての id を string に変換し続ける。

これは子 Agent が仕事をしなかったのではない。

Tool が実行されなかったのでもない。

join ミスだ。

Trace では次が見える必要がある。

```text
親 Agent はなぜタスクを派遣したか。
子 Agent が受け取った task brief。
子 Agent の result contract。
子 Agent の evidence と unknowns。
親 Agent が join 時に何を採用したか。
親 Agent が何を無視したか。
最終決定がどの evidence を引用したか。
```

![Trace Analysis：事実ログで Agent 失敗を特定する Mermaid 6](assets/00-19-trace-analysis-agent-failures/mermaid-06.png)

この図で重要なのは Join / Review だ。

Multi-Agent は投票ではない。

親 Agent は誰が自信満々かだけを見てはいけない。

証拠を merge する必要がある。

delegation join の失敗分類には少なくとも次がある。

```text
task_brief_missing_scope：task package が重要範囲を漏らした。
subagent_context_missing_fact：子 Agent が必要 Context を受け取っていない。
subagent_result_contract_invalid：結果形式に証拠または unknowns がない。
join_ignored_evidence：親 Agent が返された証拠を無視した。
join_ignored_unknowns：親 Agent が未知を安全と扱った。
join_conflict_unresolved：複数子結果の衝突が review を起動しなかった。
permission_escalation_lost：子 Agent の権限要求が bubble しなかった。
```

これらはすべて trace を必要とする。

親 Agent の最終 messages だけを見れば、こうしかないかもしれない。

```text
旧 API を確認しました。
```

本当の診断は子タスク trace に戻る必要がある。

第 18 篇で trace merge を強調した理由もここにある。

merge がなければ、父タスク失敗時に結論の出所が分からない。

調査ミス、伝達ミス、merge ミス、無視のどれなのか判断できない。

## 十三、Trace Analyzer の pipeline：まず構造化し、次に判断し、修正提案を生成する

ここまで来ると、Trace Analysis を一つの pipeline にできる。

数千行のログをいきなりモデルに渡して、こう聞くべきではない。

```text
どこが間違ったと思いますか？
```

補助としては使える。

しかし完全に依存すると、また「モデルに推測させる」状態に戻る。

より安定した方式はこうだ。

```text
Event Log
-> Trace Projection
-> Fact Extraction
-> Rule Checks
-> Failure Classification
-> Human-readable Report
-> Eval Case Candidate
```

第一ステップは trace projection。

底層 event を turn、action、delegation task、verification、artifact に組織する。

第二ステップは fact extraction。

Tool result、テストログ、diff、子タスク結果から重要事実を抽出する。

第三ステップは rule checks。

決定的 rule で明らかな問題を捕まえる。

```text
final success without verification
non-zero exit code projected as success
permission allow without required approval
sub-agent result missing evidence
context missing discovered critical fact
```

第四ステップが failure classification。

ここでは rule と LLM を組み合わせられる。

rule は構造的矛盾を扱う。

LLM は複雑なテキスト読解、意味関係判断、説明生成を担当する。

第五ステップはレポート生成。

レポートは感情的な要約ではなく、修正経路を示す。

第六ステップは高価値失敗を eval candidate にする。

これは後続の Evaluation につながる。

![Trace Analysis：事実ログで Agent 失敗を特定する Mermaid 7](assets/00-19-trace-analysis-agent-failures/mermaid-07.png)

この pipeline の工学判断はこうだ。

```text
構造化 rule で判断できるものを LLM に推測させない。
意味説明が必要なところで LLM を導入する。
```

たとえば次は rule だ。

```text
exitCode=1 だが final claimed success
```

一方、次は LLM または domain rule の補助が必要かもしれない。

```text
モデルの修正案は legacy API 制約を本当に解決したか？
```

Trace Analyzer は失敗後だけに動く必要もない。

タスク進行中に軽量チェックを走らせてもよい。

たとえば次を検出する。

```text
同じテストが二ターン連続で失敗したが、エラー要約に差分標識がない。
```

システムは agent に促せる。

```text
今回の失敗と前回の失敗の差分を比較してから、次を決めてください。
```

これはモデルの思考を代替することではない。

Harness が事実規律を維持している。

Agent が長時間タスクになるほど、この外部規律が必要になる。

## 十四、診断レポートはチャット要約ではなく、事故復盤のように書く

Trace Analysis の出力はこうであってはいけない。

```text
今回の失敗は Context 不足が原因かもしれません。
```

ゆるすぎる。

有用な診断レポートには少なくとも次が必要だ。

```text
失敗結論
失敗分類
証拠チェーン
影響範囲
修正提案
eval に変換可能か
confidence と unknowns
```

より工学的には、Trace Analysis の出力は一段落の summary ではなく finding の集合がよい。

```ts
type TraceFinding = {
  category: FailureCategory;
  claim: string;
  evidenceRefs: string[];
  confidence: "low" | "medium" | "high";
  suggestedFixArea: string;
  unknowns: string[];
};
```

たとえばこうだ。

```text
結論：
  Agent は auth session テストを修正したと主張したが、最終 verification はまだ失敗している。

分類：
  observation_projection_error + model_judgement_error

証拠：
  test-output-004 は新しいエラーが legacy numeric user_id であることを示す。
  observation-004 は「auth session はまだ失敗」とだけ書き、新旧失敗差分を保持していない。
  turn-5 model decision は string normalization の変更を続けた。
  verification-006 exitCode=1 だが final message は成功を主張した。

影響：
  Agent は 2 回目の失敗後に誤った方向で修正を続け、成功を誤報した。

修正提案：
  verification failure observation は exitCode と重要 assertion を保持する。
  同一テストコマンドが連続失敗した場合、context projection は delta を標識する。
  final success は verification.status=passed に依存する。

Eval 候補：
  はい。「二次失敗原因が変化する」regression sample を構築できる。

未知項：
  完全な model reasoning がないため、visible context と intent に基づいてのみ判断している。
```

このレポートにはいくつかの特徴がある。

第一に、すべての責任をモデルへ押し付けていない。

第二に、trace 証拠を引用している。

第三に、実装可能な修正を出している。

第四に、unknowns を残している。

第五に、失敗を eval candidate へ変換している。

これが production trace analysis の口調だ。

冷静。

具体的。

再現可能。

急いで責任転嫁しない。

## 十五、Trace Analysis と Eval の関係：失敗サンプルは回帰できるべき

Trace Analysis は終点ではない。

次は通常 Eval だ。

一回の失敗が regression sample にならなければ、また起きやすいからだ。

たとえば次を発見した。

```text
同一テストコマンドの 2 回目の失敗原因が変わったが、Agent は delta を認識しなかった。
```

これは eval case になる。

```json
{
  "name": "auth_test_failure_delta_should_change_plan",
  "goal": "auth session テストを修正する",
  "events": [
    "first_test_failure_user_id_string",
    "edit_normalize_user",
    "second_test_failure_legacy_numeric_id"
  ],
  "assertions": [
    {
      "type": "context_contains_fact",
      "fact": "legacy numeric user_id constraint"
    },
    {
      "type": "agent_should_not_repeat_same_fix"
    },
    {
      "type": "final_success_requires_verification_passed"
    }
  ]
}
```

この eval は最終回答の良し悪しだけを問うものではない。

軌跡を評価する。

Agent が合理的なステップで進んだかを見る。

これは伝統的な unit test と違う。

伝統的な関数 test は通常こう見る。

```text
入力 -> 出力
```

Agent eval はさらに見る必要がある。

```text
入力 -> 軌跡 -> Tool 使用 -> 観察 -> 検証 -> 出力
```

Trace Analysis はこの軌跡を提供する。

だから第 19 篇と、以後の Eval / Memory Governance はつながっている。

Trace は失敗を説明する。

Eval は説明を regression 制約に変える。

Memory Governance はどの失敗経験を長期知識に保存すべきか、どれは今回 session だけのものかを決める。

trace がなければ、eval は主観的な score になりがちだ。

trace があれば、eval は確認できる。

```text
Tool sequence は妥当か。
重要事実は観察されたか。
権限は正しく扱われたか。
検証は目標を cover したか。
子タスク結果は正しく join されたか。
```

これにより Agent 最適化は「なんとなく良くなった」から「ある種の失敗が減った」へ変わる。

これが Harness Optimization の入口だ。

## 十六、最小実装：大きな platform の前に、まずローカル trace report を作る

Trace Analysis は大きな platform になりやすい。

美しい UI。

検索。

timeline。

metrics dashboard。

distributed trace。

これらは後で持てる。

しかし最小実装は最初から重くする必要がない。

CLI Agent の第一版は非常に素朴でよい。

```text
.harness/
  sessions/
    <session-id>.jsonl
  artifacts/
    <session-id>/
      test-output-001.txt
      patch-003.diff
  traces/
    <session-id>.trace.json
    <session-id>.report.md
```

一回タスク実行後に、コマンドを提供する。

```bash
harness trace analyze .harness/sessions/auth-fix.jsonl
```

それは次を行う。

```text
event log を読む。
causation/correlation で trace を組み立てる。
tool intent、permission、execution、observation、verification を抽出する。
基礎 rule を実行する。
markdown report を出力する。
任意で eval candidate を生成する。
```

擬似コードはこう書ける。

```ts
async function analyzeTrace(sessionLogPath: string): Promise<TraceReport> {
  const events = await readJsonl<SessionEvent>(sessionLogPath);
  const trace = projectTrace(events);

  const findings = [
    ...checkVerification(trace),
    ...checkObservationProjection(trace),
    ...checkContextMissingFacts(trace),
    ...checkPermissionDecisions(trace),
    ...checkDelegationJoin(trace),
    ...checkToolExecution(trace),
  ];

  const classified = classifyFindings(findings);

  return {
    sessionId: trace.sessionId,
    outcome: deriveOutcome(trace),
    findings: classified,
    evalCandidates: proposeEvalCases(trace, classified),
  };
}
```

このコードには重要な特徴がある。

```text
analyzeTrace は Tool を実行しない。
モデルに再問い合わせしない。
workspace を変更しない。
```

事実ログと artifact だけを読む。

これが trace analysis の安全境界だ。

分析中に LLM の助けで複雑なログを読む必要がある場合でも、それは別の analysis tool intent として、入力と出力を記録すべきだ。

分析段階がこっそり session 事実を変えてはいけない。

第一版レポートは数種類の rule だけでよい。

```text
最終的に成功を主張したが verification が失敗。
Tool の非ゼロ exit code が observation で成功に投影された。
重要エラーを発見したが次ターン Context に含まれない。
permission allow に risk 理由がない。
sub-agent result に evidence または unknowns がない。
join decision が子タスク unknowns を無視した。
```

これだけで多くの実問題を捕まえられる。

完全な観測 platform ができるのを待つ必要はない。

event log があれば、第一版のローカルレポートは先に走らせられる。

## 十七、よくある悪い匂い：これが出たら trace はまだ失敗診断できない

Trace system 自身にも悪い匂いがある。

第一は text transcript だけを記録すること。

履歴があるように見える。

しかし構造化 intent、permission、execution、observation がない。

不十分だ。

第二は成功経路だけを記録すること。

失敗、cancel、拒否、timeout、切り詰め、圧縮を記録しない。

その trace は物語を語れるが、事故調査はできない。

第三は causation id がないこと。

多くの event が起きたことは分かる。

だがどの model response がどの tool intent を引き起こしたか分からない。

trace が散点になる。

第四は observation が raw artifact 参照を残さないこと。

事後には要約しか見られない。

要約が忠実だったか判断できない。

第五は verification を一級 event にしないこと。

最終成功がモデル宣言になる。

これはコード修正 Agent では禁物だ。

第六は sub-agent trace を merge しないこと。

父タスクは子タスク結論だけを見る。

証拠、unknowns、権限境界が見えない。

第七は trace report に修正提案がないこと。

「失敗したかもしれない」と言うだけ。

「どの層を直すべきか」を言わない。

第八は全失敗を LLM に要約させること。

構造化矛盾に rule を使わない。

分析結果が不安定になり、regression にしにくい。

第九は trace に secret を混ぜること。

モデル入力、Tool 出力、環境変数、request header に脱敏 policy がない。

Trace は診断 tool であり、漏洩倉庫になってはいけない。

第十は trace を UI 機能として扱うこと。

timeline ページはあるが、event semantics が薄い。

見た目は professional でも、デバッグ時にはまだ推測が必要になる。

これらの背後にある問題は同じだ。

```text
trace が責任境界を中心に設計されていない。
```

八つの境界へ戻れば、多くの設計は明確になる。

```text
目標。
モデル判断。
tool intent。
権限。
実行。
observation。
context projection。
verification。
```

どの層の証拠が欠けても、その層には帰因できない。

## 十八、Trace Analysis は Memory Governance を引き出す

ここまでで、一回の失敗を説明できるようになった。

しかしまだ問いがある。

失敗分析の結果、どの事実をシステムが記憶すべきか？

今回のテスト修正から、いくつかの知識が得られる。

```text
このプロジェクトの legacy login API は numeric user_id に依存する。
auth/session.test.ts の失敗は normalizeUser によって起きたことがある。
同じテストコマンドの二次失敗原因が変わったら、delta を比較しなければならない。
final success は verification passed に依存しなければならない。
ある Tool の cwd policy は過去に誤った。
```

これらをすべて長期記憶に入れてはいけない。

あるものはプロジェクト事実。

あるものは今回タスク事実。

あるものは Harness rule。

あるものは一回限りの Tool bug。

あるものは eval に入るべき。

あるものは memory candidate ledger に入るべき。

あるものは trace にだけ残し、監査時に見るべき。

これが次の記事の Memory Governance を引き出す。

Trace Analysis は答える。

```text
今回はなぜ失敗したか？
```

Memory Governance は続けて問う。

```text
この失敗の中のどの発見が、将来自動使用される価値があるか？
```

二つを混ぜてはいけない。

trace finding が自動で長期記憶になると、システムはすぐ自己汚染する。

たとえば一時的な失敗。

```text
今日 pnpm test はネットワーク遅延で timeout した。
```

これは永久 project knowledge にすべきではない。

しかし安定事実。

```text
legacy login API は numeric user_id を必要とする。
```

これは project memory に入り、将来 auth を修正するとき retrieval されるべきかもしれない。

だから第 19 篇はここで自然に次の層へ問題を渡す。

```text
診断された事実をどうガバナンスするか？
```

これが Memory Governance だ。

## 十九、この篇を一本の耐荷重チェーンに圧縮する

最後に Trace Analysis を一つのチェーンに戻す。

第 16 篇はこう言った。

```text
Event log は事実源である。
```

第 18 篇はこう言った。

```text
Sub-agent trace は merge しなければならない。
```

第 19 篇はこう言う。

```text
Trace Analysis は事実を失敗原因の特定に組織する。
```

完全なチェーンはこうだ。

```text
ユーザー目標
-> モデル判断
-> tool intent
-> 権限決定
-> Tool 実行
-> observation 投影
-> context projection
-> verification
-> trace report
-> eval candidate
-> memory governance candidate
```

このチェーンでは各区間が壊れうる。

Trace Analysis の仕事は失敗を消すことではない。

失敗原因を特定可能にすることだ。

「モデルが間違った」をより具体的な問題へ変える。

```text
モデルは事実を見た後も判断を誤った。
重要事実が Context に入らなかった。
Tool 実行が intent と一致しなかった。
権限分類が間違った。
observation が失敗 signal を落とした。
verification がユーザー目標を検証しなかった。
親 Agent join が子タスク unknowns を無視した。
```

これらは「モデルがダメ」よりずっと役に立つ。

修正箇所を指せるからだ。

一文だけ覚えるならこれだ。

```text
Trace はログの装飾層ではなく、Harness の失敗原因の特定層である。
```

ここまでで、小さな CLI Agent は行動し、復旧し、委任できるだけでなくなった。

なぜ失敗したかを説明し始める。

しかし失敗を説明した後、システムはさらに決める必要がある。

```text
どの失敗経験を長期記憶へ入れるか？
どれは今回タスクだけの一時事実か？
どれを eval regression にするか？
どれを人間レビュー後に沈殿させるか？
```

これが次篇へつながる。

```text
Memory Governance。
```

candidate ledger から governance store へ。Agent が経験をどう保存し、自分の記憶を新しい汚染源にしないかを扱う。

## 教学 Harness への落とし込み

教学 UI の Event Timeline は trace analysis の第一版です。失敗時に final answer だけを見てはいけません。`turn_start`、`message_update`、`tool_execution_start`、`tool_execution_end`、`turn_end` を辿って replay します。これで問題が model judgment、tool arguments、tool result、context projection、persistence order のどこにあるかを切り分けられます。

---

GitHub ソース: [00-19-trace-analysis-agent-failures.md](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-19-trace-analysis-agent-failures.md)
