---
title: "Session Replay：なぜ event log は長時間タスクの事実源なのか？"
description: "多くの人が Agent に永続化を足すとき、最初に自然と messages を保存しようとする。"
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.png'
locale: "ja"
tags:
  - Agent
  - Harness
  - Session
  - Replay
  - Durable Execution
  - 技術チュートリアル
aliases:
  - Session Replay
  - event log の事実源
  - Agent 長時間タスク復旧
---

# Session Replay：なぜ event log は長時間タスクの事実源なのか？

多くの人が Agent に永続化を足すとき、最初に自然と `messages` を保存しようとする。

これはとても合理的に見える。

モデルが毎ターン見るものは messages だからだ。

ユーザー入力は messages にある。

モデル回答も messages にある。

Tool 結果も messages に差し戻される。

そこで最小版は簡単にこう書ける。

```ts
await fs.writeFile(
  "session.json",
  JSON.stringify({ messages }, null, 2)
);
```

すると少し安心する。

session ファイルができた。

履歴もある。

プロセスが落ちても続けられる。

しかし実際に長いタスクを走らせると、その自信はすぐ壊れる。

ここでも前の記事と同じ例を使う。

```text
ユーザー：このプロジェクトのテストが失敗しています。原因を見つけて直してください。
```

CLI Agent が作業を始める。

プロジェクト構造を読む。

テストを実行する。

失敗ログを見る。

関連コードを検索する。

ファイルを変更する。

もう一度テストを実行する。

ここで、ごく普通の事故が起きる。

プロセスが落ちる。

あるいはユーザーが中断する。

あるいは端末が切れる。

あるいは Tool コマンドが timeout する。

あるいは Context が埋まり、システムが圧縮する。

ここからタスクを復旧したい。

問題はこうだ。

システムはどこから復旧すべきか？

messages だけを保存していると、表面上は履歴がある。

だが次の問いには必ずしも答えられない。

```text
モデルは前ターンでどんな intent を出したのか？
その intent は権限承認を通ったのか？
Tool は本当に実行開始したのか？
Tool は実行途中で失敗したのか、完了したが書き戻しに失敗したのか？
ファイルはすでに変更されたのか？
テストコマンドはすでに実行されたのか？
ユーザーはどの動作を拒否したのか？
Context 圧縮時にどの原始事実が落ちたのか？
最後の安定 checkpoint はどこか？
次に進むと現実世界への副作用を重複させないか？
```

これが第 16 篇の問題だ。

長時間タスクはメモリ内の messages だけでは支えられない。

「チャット履歴を保存する」だけでも足りない。

Agent が実際のエンジニアリング環境に入ると、事実源は別の形を取らなければならない。

この記事の核心はこうだ。

```text
Session log は事実源であり、messages は投影にすぎない。
Replay は現実世界を再実行することではなく、event で説明可能な state を復元すること。
Resume は勇敢に続けることではなく、続けてよいかを保守的に確認すること。
```

少し重く聞こえる。

ゆっくり分解する。

まず、この記事で繰り返し出てくる三つの保存対象を分ける。

| オブジェクト | 保存するもの | 保存しないもの |
| --- | --- | --- |
| Session Store | session メタデータ、状態 snapshot、resume gate 結果 | 完全な巨大ログ |
| Event Log | 重要な事実 event：intent、permission、execution、observation、verification | 任意のチャット転写 |
| Artifact Store | 完全 stdout、stderr、diff、モデル入力 snapshot、長文証拠 | タスクを続けるかの決定 |

Replay の目的は、タスクを自動で続行することではない。

まず「安全に続けられるか」を判断可能な状態にする。

## 問題の連鎖

この記事の問題の連鎖を固定する。

```text
長時間タスクはメモリ上の messages だけを保存してはいけない
-> messages はモデル入力の投影であり、事実源ではない
-> クラッシュ、中断、圧縮、Tool の半実行があると、messages だけでは副作用境界を判断できない
-> append-only event log で intent、permission、execution、observation、verification を記録する必要がある
-> Replay は event から state を復元し、現実世界を再実行しない
-> Resume は gate を通して続行可否を確認する
-> Artifact Store は長いログ、diff、モデル入力 snapshot、大きな証拠を保存する
-> この事実チェーンは trace、eval、durable execution を支える
```

## 一、長時間タスクで一番怖いのは失敗ではなく、失敗後に何が起きたか説明できないこと

最小 Agent Loop から見る。

前の記事で単発モデル呼び出しを ReAct loop に拡張した。

```text
Think
-> Act
-> Observe
-> Think
-> ...
-> Final
```

demo なら、おそらくこう書ける。

```ts
let messages = [userMessage];

while (true) {
  const response = await provider.chat({ messages });

  if (response.type === "final") {
    messages.push(response.message);
    break;
  }

  const result = await toolRuntime.execute(response.toolCall);

  messages.push(response.message);
  messages.push(toToolMessage(result));
}
```

このコードは動く。

Agent Loop の基本形を説明するには十分だ。

しかし致命的な前提がある。

```text
タスク全体が一つのプロセス内で順調に完了する。
```

現実のタスクはそんなに協力的ではない。

たとえば CLI Agent がテストを修正中だとする。

最初に実行する。

```text
pnpm test auth
```

テストは失敗する。

モデルはログを見て、読むべきだと判断する。

```text
src/auth/session.ts
```

そして edit intent を出す。

システムは権限検査を通す。

Tool がファイル変更を開始する。

その瞬間、プロセスが落ちる。

復旧時に messages だけを見ると、こう見えるかもしれない。

```text
assistant: src/auth/session.ts を変更します
tool: 変更成功
```

あるいはこうかもしれない。

```text
assistant: src/auth/session.ts を変更します
```

圧縮後には一文だけ残るかもしれない。

```text
以前 auth テストを調べ、session ロジックを修正しようとしていました。
```

三つのケースで復旧戦略はまったく違う。

最初は、ファイルが本当に変更済みか確認する必要がある。

二つ目は、Tool が実行開始したか確認する必要がある。

三つ目は、intent の構造すら失われている可能性がある。

システムが何が起きたか説明できないなら、推測するしかない。

Agent のタスク復旧で一番危険なのは、推測で続けることだ。

![Session Replay：なぜ event log は長時間タスクの事実源なのか？ Mermaid 1](assets/00-16-session-replay-event-log/mermaid-01.png)

この図で重要なのは「プロセスが落ちる」ことではない。

クラッシュ自体は普通だ。

本当の問題は、クラッシュが二種類のものを切断することだ。

第一はメモリ状態。

たとえば `turnCount`、予算、現在の pending intent、実行中 Tool。

第二は説明チェーン。

つまりシステムがどうやって次を知るかだ。

```text
モデルが何を言ったか
システムが何を許可したか
Tool が何をしたか
現実世界がどう変わったか
次のターンでモデルが何を見るべきか
```

`messages` は説明チェーンの一部を保存できる。

しかし復旧のために設計されていない。

次ターンのモデル入力のために設計されている。

この二つの目的は違う。

次ターンのモデル入力は「今、十分に使える」ことを目指す。

復旧の事実源は「当時何が起きたか」を目指す。

前者は圧縮できる。

後者はできるだけ追跡可能でなければならない。

前者は並べ替えられる。

後者は因果順序を保たなければならない。

前者は要約だけでもよい。

後者は要約がどの event に由来するか説明できなければならない。

だからここから概念を立てる。

```text
Session は messages ではない。
Session は一つの長時間タスクの event ledger である。
```

## 二、messages は投影であり、事実源ではない

Session Replay を理解するには、まず三つの語を分ける。

```text
Event Log
State
Messages
```

これらはよく混同される。

しかし長時間 Agent では、混同すると事故が起きる。

`Event Log` は事実源だ。

起きた event を記録する。

たとえば次のようなものだ。

```text
ユーザーが目標を提出した
モデルが Tool intent を出した
システムが権限決定をした
Tool が実行開始した
Tool が observation を返した
Context が圧縮された
予算により一時停止した
検証コマンドが通った
タスクが完了とマークされた
```

`State` は event から畳み込まれる現在状態だ。

たとえば次のもの。

```text
現在ターンはいくつか
予算をどれだけ使ったか
タスクは running / paused / failed / completed のどれか
pending intent は何か
最後の Tool 結果は何か
どのファイルが変更されたか
どの検証コマンドが通ったか
```

`Messages` は state と event から投影され、モデルに見せる Context だ。

たとえば次のもの。

```text
ユーザー目標
最近数ターンの会話
重要 Tool 結果の要約
現在の進捗
次の制約
必要なコード断片
```

三者の関係はこうあるべきだ。

```text
Event Log -> State -> Messages
```

こうではない。

```text
Messages -> State -> Event Log
```

messages を事実源にすると、システムはモデル入力フォーマットに縛られる。

モデル入力は token 節約のため切り詰められる。

ノイズ削減のため要約される。

効果を上げるため再構成される。

汚染防止のため一部 Tool 出力が filter される。

安全のため内部 policy が隠される。

これらはモデル呼び出しには合理的だ。

しかし復旧と監査にとっては事実ではない。

Tool の原始出力が 3000 行あるかもしれない。

messages には重要な 10 行だけが残る。

次のモデルターンにはその 10 行で十分かもしれない。

しかし後でテストが失敗したら、開発者は知る必要がある。

```text
原始コマンドは何か
exit code は何か
完全 stderr は切り詰められたか
切り詰め閾値はいくつか
要約はどう生成されたか
モデルが見たのは要約か原文か
```

これらは messages に依存して保存されるべきではない。

event log にあるべきだ。

![Session Replay：なぜ event log は長時間タスクの事実源なのか？ Mermaid 2](assets/00-16-session-replay-event-log/mermaid-02.png)

この図には重要な責任境界がある。

`Messages` は一番右にある。

中心ではない。

多くの投影の一つにすぎない。

同じ Event Log から messages も投影できる。

trace パネルも投影できる。

監査レポートも投影できる。

eval サンプルも投影できる。

resume checkpoint も投影できる。

messages しかなければ、他の view はすべて「チャット履歴から推測する」に退化する。

成熟した Harness はこの退化を避ける必要がある。

だから Session Store はより正確にはこう定義できる。

```text
Session Store は event を保存する。
Context Builder は messages を生成する。
Replay Runner は event から state を再構築する。
```

この三つの役割は代替できない。

Session Store はモデルが好む言い回しを気にするべきではない。

Context Builder は事実を捏造してはいけない。

Replay Runner は現実世界への副作用を再実行してはいけない。

これがこの記事で最も重要な工学規律だ。

## 三、event log は何を記録すべきか？

「event を記録する」は簡単に言える。

実際にコードを書くとき難しいのは粒度だ。

粗すぎると復旧時に説明できない。

細かすぎるとログが膨らみ、読み書きが複雑になり、プライバシーとコストも重くなる。

CLI Agent がテストを修正する経路を使って、最小 event チェーンを見てみる。

```text
UserMessage
SessionStarted
ModelRequested
ModelResponded
ToolIntentCreated
PolicyDecided
ToolStarted
ToolFinished
ObservationProjected
ContextCompacted
VerificationStarted
VerificationFinished
SessionPaused
SessionResumed
SessionCompleted
```

これらの名前は標準解ではない。

ただし一つの原則を示している。

```text
復旧、監査、予算、権限、Context、検証に影響する境界は、すべて event に落とすべきだ。
```

たとえばモデル呼び出し。

完全 prompt を永久保存する必要はないかもしれない。

プライバシー、secret、大量コードを含む可能性があるからだ。

しかし最低限、次を保存すべきだ。

```text
model name
request id
input token estimate
output token count
context snapshot id
visible tool list hash
start time
end time
status
error taxonomy
```

そうすれば復旧やデバッグ時に、当時モデルがどんな Context と Tool 可視性の下で判断したかが分かる。

Tool 呼び出しも同じだ。

Tool event は単なる文字列を保存するだけでは足りない。

少なくとも次に答えられる必要がある。

```text
Tool 名は何か
引数は何か
引数検証は通ったか
権限決定は何か
実行環境は何か
副作用はあったか
出力は切り詰められたか
モデルに返した observation は何か
原始結果はどこにあるか
```

最小 event object はこう書ける。

```ts
type SessionEvent =
  | UserMessageEvent
  | ModelRequestEvent
  | ModelResponseEvent
  | ToolIntentEvent
  | PolicyDecisionEvent
  | ToolExecutionEvent
  | ObservationEvent
  | ContextCompactionEvent
  | VerificationEvent
  | LifecycleEvent;

type BaseEvent = {
  id: string;
  sessionId: string;
  seq: number;
  ts: string;
  type: string;
  causationId?: string;
  correlationId?: string;
};

type ToolExecutionEvent = BaseEvent & {
  type: "tool.finished";
  toolCallId: string;
  toolName: string;
  status: "ok" | "error" | "timeout" | "cancelled";
  exitCode?: number;
  artifactRefs: string[];
  observationRef: string;
  sideEffect: "none" | "workspace" | "network" | "external";
};
```

ここには重要なフィールドがいくつかある。

`seq` は順序だ。

replay が発生順に state を再構築できる。

`causationId` は原因だ。

この event がどの event によって起きたかを示す。

たとえば `tool.started` は `tool.intent.created` によって起きる。

`correlationId` は同じ一連の動作の関連だ。

たとえば一つの model intent、権限決定、Tool 実行、観察結果は同じ tool call に属する。

`artifactRefs` は外部成果物への参照だ。

event log に完全な大ファイル、大ログ、diff を直接詰める必要はない。

安定参照を保存できる。

```text
artifact://session/abc/test-output-003.txt
artifact://session/abc/patch-004.diff
artifact://session/abc/model-input-007.json
```

これにより event log と artifact store がつながる。

event log は「何が起きたか」を記録する。

artifact store は「当時の証拠材料」を保存する。

両方が揃って、長時間タスクの事実基盤になる。

![Session Replay：なぜ event log は長時間タスクの事実源なのか？ Mermaid 3](assets/00-16-session-replay-event-log/mermaid-03.png)

図で見落としやすい点がある。

`Observation` も event だ。

Tool の原始結果と、モデルが見た observation は同じものではない。

Tool の原始結果は長く、汚く、Context に入れてはいけない情報を含むかもしれない。

Observation は Harness が洗浄、切り詰め、要約、リスク注記をしたうえでモデルに投影する版だ。

このステップを記録しないと、replay 時に答えられない。

```text
モデルは当時、結局何を見ていたのか？
```

この問いは、ほぼすべての Agent 失敗分析の出発点だ。

## 四、Replay は世界をもう一度走らせることではない

ここが最も誤解されやすい。

Replay と聞くと、多くの人はこう考える。

```text
当時の各ステップをもう一度実行する。
```

普通の純関数プログラムなら、それでよいかもしれない。

しかし Agent では通常危険だ。

Agent の多くのステップには副作用があるからだ。

ファイル読み取りはまだよい。

ファイル書き込みは違う。

コマンド実行も違う。

外部 API 呼び出しはさらに違う。

もし replay が本当に再実行するなら、

```text
edit_file
run_shell
send_email
create_ticket
deploy_service
```

それは replay ではない。

世界を再び変えている。

問題がいくつも起きる。

ファイルが重複変更されるかもしれない。

テストが異なる依存状態で実行されるかもしれない。

外部接口が重複リクエストを受けるかもしれない。

ユーザーが拒否した動作が再度発火するかもしれない。

古い危険コマンドがもう一度走るかもしれない。

だから Agent Harness での Replay のデフォルト意味はもっと保守的であるべきだ。

```text
event の順序に従って説明可能な state を再構築する。
すでに起きた現実世界への副作用は再実行しない。
```

言い換えると、Replay の入力は event log。

Replay の出力は state、trace、messages projection、診断 view。

新しい Tool 副作用ではない。

```ts
function replay(events: SessionEvent[]): ReplayedSession {
  let state = initialSessionState();

  for (const event of events.sort(bySeq)) {
    state = reduceSessionEvent(state, event);
  }

  return {
    state,
    messages: projectMessages(state),
    trace: projectTrace(state),
    pendingActions: derivePendingActions(state),
  };
}
```

この擬似コードに `executeTool` はない。

そこが重要だ。

Replay は Tool を走らせない。

Replay は履歴 event を state に畳み込む。

ある Tool が当時実行済みなら、replay は当時残された `tool.finished` event と artifact を読む。

モデルが当時 intent を返したなら、replay は当時の `model.responded` event を読む。

context compaction が起きたなら、replay は圧縮 event、要約、置換前内容の参照を読む。

こっそりもう一度モデルに問い合わせてはいけない。

こっそり shell を再実行してもいけない。

これが Session Replay と Agent Loop の違いだ。

![Session Replay：なぜ event log は長時間タスクの事実源なのか？ Mermaid 4](assets/00-16-session-replay-event-log/mermaid-04.png)

この図で重要なのは `Resume Gate` だ。

Replay と Resume の間には門が必要だ。

Replay は state を再構築するだけ。

Resume が行動を続ける。

二つを混ぜると、システムは復旧時に自動で前へ走る。

それは危険だ。

復旧は「前回の while loop の続き」ではない。

新しい判断の瞬間だ。

システムは先に確認しなければならない。

```text
workspace は前回記録と一致しているか？
pending intent はまだ有効か？
ユーザー権限はまだ有効か？
予算は残っているか？
外部世界は変わっている可能性があるか？
Context 圧縮後の state は続行に十分か？
```

これらを検査して初めて、新しい Agent Loop を始められる。

だからこう言う。

```text
Replay は説明の再構築。
Resume は保守的な続行。
```

## 五、Resume は保守的に：続ける前に最後の安定点を探す

よくある誤りは Resume をこう書くことだ。

```ts
const { messages } = await loadSession(sessionId);
runAgentLoop({ messages });
```

自然に見える。

だが一番重要な問いを飛ばしている。

```text
前回はどの境界で止まったのか？
```

長時間タスクでは、どこでも続けてよいわけではない。

続けるのに適した場所は安定点だ。

安定点は通常、いくつかの条件を満たす。

```text
半実行中の Tool がない
未落盤の event がない
未確認の権限決定がない
workspace 副作用が記録されている
モデルが次に見る observation が生成済み
session state を event から完全に再構築できる
```

次のチェーンを見る。

```text
ToolIntentCreated
-> PolicyApproved
-> ToolStarted
-> ToolFinished
-> ObservationProjected
```

`ToolIntentCreated` の後で止まったなら、Tool はまだ実行されていない。

復旧時には権限検査をやり直せる。

`PolicyApproved` の後で止まったなら、Tool はまだ開始していない。

承認がまだ有効か、特にユーザー許可の時効を確認する必要がある。

`ToolStarted` の後で止まったなら、最も厄介だ。

Tool はファイルを変更済みかもしれないが、event が書き終わっていない。

復旧時に直接再実行してはいけない。

workspace と artifact をまず確認する必要がある。

`ToolFinished` の後で止まり、observation がまだ生成されていないなら、

Tool 結果 artifact から observation を再生成できる。

`ObservationProjected` の後で止まっているなら、

かなりよい続行点だ。

現実世界の副作用が発生済みで、モデルが次に見る観察も記録されているからだ。

![Session Replay：なぜ event log は長時間タスクの事実源なのか？ Mermaid 5](assets/00-16-session-replay-event-log/mermaid-05.png)

この状態図は、最初から複雑な workflow engine を実装せよという意味ではない。

ただ一つを思い出させる。

復旧は、自分がどの event 境界で止まったかを知らなければならない。

境界が分からないなら、続行が安全だと装ってはいけない。

CLI Agent では、保守的な resume flow はこうなる。

```ts
async function resumeSession(sessionId: string) {
  const events = await sessionStore.readEvents(sessionId);
  const replayed = replay(events);

  const gate = await evaluateResumeGate({
    state: replayed.state,
    workspace: await inspectWorkspace(),
    policy: await loadCurrentPolicy(),
    artifacts: await artifactStore.checkRefs(replayed.state.artifactRefs),
  });

  if (!gate.ok) {
    return pauseForUser(gate.reason, gate.recoveryOptions);
  }

  return runAgentLoop({
    sessionId,
    initialState: replayed.state,
    initialMessages: replayed.messages,
  });
}
```

ここで `evaluateResumeGate` が鍵だ。

これはモデル判断ではない。

Harness 判断だ。

resume のリスクは「次に何をするか」だけではない。

「続けると副作用を重複させないか、越権しないか、古い事実に基づいて動かないか」でもある。

これは Harness の lifecycle 責任だ。

モデルは説明を手伝える。

しかし単独で決めてはいけない。

## 六、Context 圧縮は messages をさらに事実源に向かなくする

前の Context 管理で述べたように、長時間タスクは token 圧力を生み続ける。

ファイルを読み、テストを実行し、検索し、変更し、検証する。各ステップで Context は増える。

だから成熟した Agent は圧縮が必要だ。

たとえば次を行う。

```text
長い Tool 結果を切り詰める
古いファイル内容を要約に置き換える
複数ターンの履歴を進捗に圧縮する
重複検索結果を参照へ折り畳む
完全ログを artifact に置き、モデルには重要断片だけ見せる
```

これらはモデル呼び出しには有用だ。

しかし messages をさらに事実源に向かなくする。

圧縮には三つの問題がある。

第一に、圧縮は有損だ。

モデルの次ターンに不要な詳細は移動されるかもしれない。

だがデバッグ時にちょうどその詳細が必要になることがある。

第二に、圧縮は解釈的だ。

要約は原始事実ではない。

システムまたはモデルによる事実の再表現だ。

第三に、圧縮は event の形を変える。

ある `tool_result` が次に置き換わるかもしれない。

```text
テストはまだ失敗しており、重要エラーは TypeError: user.id should be string。
```

続行には十分でも、監査には足りない。

だから圧縮自体も event にする。

```text
ContextCompactionStarted
ContextCompactionFinished
CompactionInputRefs
CompactionOutputSummary
CompactionPolicy
ReplacedMessageRange
```

これにより replay 時に分かる。

```text
どの原始内容が圧縮されたか
圧縮結果は何か
その後モデルが見たのは要約か原文か
要約はどの artifact に対応するか
```

![Session Replay：なぜ event log は長時間タスクの事実源なのか？ Mermaid 6](assets/00-16-session-replay-event-log/mermaid-06.png)

この図で重要なのは二重書き込み境界だ。

圧縮サマリーは messages に入る。

圧縮 event と参照は event log に入る。

要約だけを残すと、システムは「連続して見えるが、実際には歪む」。

原文だけを残し、要約しなければ、token に潰される。

正解は二択ではない。

```text
モデルには使える投影を見せる。
システムには事実チェーンを残す。
```

これが Session Replay と Context Engineering の接点だ。

Context はモデルがこのターンで適切な情報を見る責任を持つ。

Session は、それらの情報がどこから来たかをシステムが知る責任を持つ。

## 七、Artifact は Context を正直に保つ

event log を無限に膨らませるべきではない。

毎回の Tool 出力、ファイル snapshot、モデル入力、コマンドログをそのまま JSONL に詰めると、システムはすぐ遅く脆くなる。

だから Session Store には通常 Artifact Store が必要だ。

簡単に言うとこうだ。

```text
event log は索引、因果、状態境界を保存する。
artifact は大きな証拠材料を保存する。
```

CLI Agent のテスト修正例では、artifact には次が含まれる。

```text
テストコマンドの完全 stdout / stderr
ファイル読み取り snapshot
検索結果原文
patch diff
モデル入力 snapshot
圧縮前 messages 断片
圧縮後サマリー
検証レポート
```

event log には参照を保存する。

```json
{
  "type": "tool.finished",
  "toolName": "run_tests",
  "status": "error",
  "exitCode": 1,
  "artifactRefs": [
    "artifact://session/s1/tool-003-stdout.txt",
    "artifact://session/s1/tool-003-stderr.txt"
  ],
  "observationRef": "artifact://session/s1/observation-003.md"
}
```

この方法の価値は「よりエレガント」だからではない。

Context を正直に保つことにある。

モデルが次の要約を見たとする。

```text
テスト失敗、重要エラーは user.id の型不一致。
```

システムは追跡できる。

```text
この要約はどのコマンドから来たか
コマンドはどの作業ディレクトリで実行されたか
exit code は何か
完全ログはどこか
要約は切り詰められたか
後で新しいテストがこの事実を上書きしたか
```

artifact がなければ、要約は Context 上に浮かぶ「聞いた話」になりやすい。

artifact があれば、要約は追跡可能な投影になる。

これが Context の正直さの核心だ。

モデルは毎ターン完全証拠を見る必要はない。

だがシステムは証拠がどこにあるか知っていなければならない。

## 八、失敗、中断、承認、予算はすべて event にすべき

多くの session log の第一版は成功経路だけを記録する。

これは復旧を危険にする。

長時間タスクで本当に重要なのは、しばしば「うまくいかなかった」部分だからだ。

Tool failure を記録する。

ユーザー中断を記録する。

権限拒否を記録する。

予算枯渇を記録する。

Context 圧縮失敗を記録する。

モデルの不正構造返却を記録する。

検証失敗を記録する。

これらが event に落ちていなければ、復旧時に起きなかったものとして扱われる。

たとえばユーザーがあるコマンドを拒否した。

```text
rm -rf dist && pnpm build
```

拒否 event が保存されていないと、復旧後にモデルが似たコマンドを再提案するかもしれない。

システムもそれが繰り返しの迷惑だと分からない。

正しい event チェーンはこうなる。

```text
ToolIntentCreated
PolicyDecisionRequested
UserApprovalRequested
UserApprovalDenied
IntentRejected
ObservationProjected
```

こうすれば次ターンのモデルは知る。

```text
ユーザーは dist を掃除するコマンドを拒否しました。破壊的でない案を探してください。
```

監査層も見られる。

```text
システムは拒否された動作を実行していない。
```

予算枯渇も同じだ。

ループがただ止まるだけなら、ユーザーには「Agent が動いていない」と見える。

予算 event が明確なら、システムは説明できる。

```text
読込、検索、一回の修正、二回の検証を完了しました。
現在 token 予算上限に達しました。
続行前に Context を圧縮するか、追加予算を確認してください。
```

失敗 event はノイズではない。

長時間タスク lifecycle の一部だ。

Agent の信頼性は、失敗を消すことではない。

失敗に境界、説明、復旧ルートを持たせることだ。

## 九、Replay できない副作用は明示的に標識する

Replay は現実世界を再実行しない。

しかし Resume 後、システムは新しい動作を続ける可能性がある。

そのため event log は副作用タイプを区別できなければならない。

Tool は大まかに次のように分けられる。

```text
pure：純計算、外部副作用なし
read：環境を読むが変更しない
workspace-write：現在 workspace を変更する
external-write：外部システムに書く
network：ネットワークにアクセスする
process：プロセスを起動する
```

副作用タイプによって復旧戦略は違う。

純計算は再計算できる。

読み取りは必要なら再読込できるが、世界が変わっている可能性を認める必要がある。

workspace 書き込みは diff、file hash、Git 状態を確認しなければならない。

外部書き込みは通常自動 retry できない。

network request は冪等性を見る必要がある。

プロセス実行は、コマンドがまだ動いているか、すでに出力を出したかを見る必要がある。

これは過剰設計ではない。

Tool が現実世界に入った後の基本会計だ。

システムが Tool の副作用有無を知らないなら、安全に復旧できない。

Tool protocol には次のフィールドを足せる。

```ts
type ToolRisk = {
  sideEffect:
    | "none"
    | "read"
    | "workspace-write"
    | "external-write";
  idempotency: "safe" | "conditional" | "unsafe";
  resumePolicy:
    | "replay-from-event"
    | "rerun-after-check"
    | "require-user-confirmation"
    | "never-rerun";
};
```

これら三つのフィールドは Session Replay に直接影響する。

`resumePolicy` が `replay-from-event` なら、復旧時は既存 event だけを読む。

`rerun-after-check` なら、復旧前に環境確認が必要だ。

`require-user-confirmation` なら、ユーザーに聞く必要がある。

`never-rerun` なら、システムは履歴表示だけで、自動重複はできない。

CLI Agent では、`read_file` は通常再読込できる。

`grep` は再実行できるが、結果は変わっているかもしれない。

`edit_file` は盲目的に繰り返せない。

`bash` はコマンドによる。

`git diff` は比較的安全だ。

`pnpm test` は再実行できるが、それは新しい検証であって、歴史 replay ではないと記録する。

この境界は非常に重要だ。

```text
履歴 event を replay することは、履歴 action を繰り返すことではない。
```

## 十、最小 Session Store は素朴でよい

ここまで読むと、Session Replay は重いシステムに聞こえるかもしれない。

しかし第一版は DB も分散 workflow engine も複雑な UI も不要だ。

小さな CLI Agent の最小実装は素朴でよい。

```text
.agent/
  sessions/
    s_2026_05_28_001/
      events.jsonl
      artifacts/
        tool-001-stdout.txt
        tool-001-stderr.txt
        patch-002.diff
        observation-002.md
      snapshots/
        state-010.json
```

`events.jsonl` は append-only。

一行一 event。

event には増分 `seq` を持たせる。

大きい内容は artifacts に置く。

一定 event ごとに state snapshot を書く。

復旧時にはこうする。

```text
最新 snapshot を読む
snapshot 以降の event を読む
再 reduce する
artifact 参照を確認する
messages 投影を生成する
resume gate に入る
```

擬似コードは次のとおり。

```ts
async function appendEvent(event: SessionEvent) {
  const line = JSON.stringify(event) + "\n";
  await fs.appendFile(sessionEventsPath(event.sessionId), line);
}

async function loadForReplay(sessionId: string) {
  const snapshot = await loadLatestSnapshot(sessionId);
  const events = await readEventsAfter(sessionId, snapshot?.seq ?? 0);
  const state = replayFrom(snapshot?.state ?? initialState(), events);

  return {
    state,
    events,
    messages: projectMessages(state),
  };
}
```

実装上の注意点がある。

第一に、append-only は上書きより安全だ。

session ファイルを上書きしていると、プロセスが落ちたとき半端な JSON が残る可能性がある。

JSONL の append は復旧しやすい。

第二に、event には順序番号が必要だ。

timestamp だけでは足りない。

同じミリ秒に複数 event がありうる。

第三に、snapshot は最適化であり、事実源ではない。

snapshot と event log が矛盾したら、event log を信じる。

第四に、artifact は存在と hash を検査する。

そうしないと replay 時に、失われたか改ざんされた証拠を参照する可能性がある。

第五に、投影は再構築可能でなければならない。

messages が唯一の保存版であってはいけない。

cache はしてよいが、event と state から再生成できる必要がある。

これが最小版の Session Store だ。

華やかではない。

だが Agent を「一回きりのプロセス」から「復旧可能な長時間タスク」へ進めるには十分だ。

## 十一、Session Replay と Durable Execution の関係

Roadmap ではこの領域を Harness Architecture と Durable Execution の近くに置いている。

理由は単純だ。

長時間タスクがプロセス、時間、worker を跨いで続く必要が出たら、実行過程をメモリだけに置けない。

Durable Execution が気にするのは次だ。

```text
各ステップを確実に記録できるか
失敗後にどこまで進んだか分かるか
retry 可能なステップを retry できるか
retry 不能なステップを skip または人手処理できるか
復旧後に進められるか
```

Agent Harness の特殊性は、ステップの中にモデル判断が混ざることだ。

モデル判断は普通の関数ではない。

Tool 実行も普通の関数ではない。

Context 投影はモデルが見る世界を変える。

だから Agent の durable loop は少なくともこう分解する必要がある。

```text
checkpoint context
-> call model
-> persist model event
-> validate intent
-> persist policy decision
-> execute tool
-> persist tool result
-> project observation
-> persist observation
-> decide next lifecycle state
```

各矢印は潜在的なクラッシュ点だ。

各クラッシュ点で答えられなければならない。

```text
直前ステップは完了したか？
完了証拠はどこか？
retry できるか？
retry は副作用を重複させないか？
復旧には人の確認が必要か？
```

だから Session Replay は Durable Agent Loop の土台だ。

event log がなければ、durable execution は「次回も続けられるといいな」という願いだけになる。

event log があって初めて、retry、復旧、監査、remote worker を語る資格が生まれる。

## 十二、Replay は Eval と Trace の事実基盤にもなる

Session Replay の直接用途は復旧だ。

しかし長期的な価値は復旧だけではない。

Trace Analysis と Eval の事実基盤にもなる。

Agent が失敗したとき、難しいのは「失敗したか」ではない。

```text
失敗はどの層で起きたのか？
```

モデル判断が間違ったのか？

Tool schema が緩すぎたのか？

権限 policy が危険動作を通したのか？

Context が重要ログを切り落としたのか？

圧縮サマリーがモデルを誤導したのか？

Tool 実行は失敗したのに observation が成功と書いたのか？

検証コマンドを間違ったディレクトリで走らせたのか？

ユーザー中断後にシステムが誤って続けたのか？

これらの問いは event chain で答える必要がある。

最終回答しかなければ、eval は「良い/悪い」しか判断できない。

session event log があれば、失敗を具体層に帰属できる。

```text
provider
context
tool validation
permission
execution
observation
verification
lifecycle
```

これは改善方法を変える。

以前なら失敗時にこう考える。

```text
prompt が足りなかったのか？
```

event log があれば、こう分かるかもしれない。

```text
モデルは実は正しい intent を出していた。
権限層が誤って拒否した。
```

またはこうかもしれない。

```text
Tool は成功した。
しかし observation が重要エラーを切り詰めた。
```

またはこうかもしれない。

```text
モデルはテスト実行を要求した。
だが verification 層が失敗 exit code を戻さなかった。
```

この場合、prompt 修正は正解ではない。

Harness を直すべきだ。

だから Session Replay は周辺機能ではない。

Agent システム全体の事実基盤になっていく。

復旧にも使う。

デバッグにも使う。

監査にも使う。

評価にも使う。

multi Agent handoff でも使う。

子 Agent が返した結果が主 session の event chain に戻らなければ、それは単なるテキスト要約だからだ。

テキスト要約は人が読む助けになる。

だがシステムの事実源にはなれない。

## 十三、よくある誤解：チャット履歴を保存すれば十分

最後に誤解をまとめて消す。

第一の誤解：

```text
messages を保存することが session を保存することだ。
```

違う。

messages はモデル入力投影。

session は event の事実チェーン。

相互参照はできるが、代替はできない。

第二の誤解：

```text
Replay は Tool をもう一度実行することだ。
```

違う。

Replay のデフォルトは読み取り専用の state 再構築だ。

Tool の再実行は Resume 後の新しい動作であり、gate、権限、副作用検査を通る必要がある。

第三の誤解：

```text
Git があれば session log は不要だ。
```

不十分だ。

Git はファイル差分を教えてくれる。

しかしモデルがなぜ変更したか、権限がどう通ったか、Tool 出力は何か、ユーザーが何を拒否したか、Context がどう圧縮されたか、検証コマンドがどう生成されたかは教えてくれない。

Git は workspace 事実の一部だ。

Agent 実行事実の全部ではない。

第四の誤解：

```text
ログは完全であればあるほどよい。
```

これも違う。

event log は因果と境界を完全に記録するべきだ。

だが大きな内容は artifact に置くべきだ。

敏感情報には脱敏、参照、アクセス制御が必要だ。

事実源は「何でも詰め込む」ではない。

「重要事実を追跡可能にする」ことだ。

第五の誤解：

```text
復旧時にモデルへ完全履歴を読ませれば、自分で判断する。
```

これは危険だ。

モデルは説明に参加できる。

しかし復旧 gate は Harness が制御しなければならない。

復旧には副作用、権限、予算、状態整合性が関わる。

これは言語判断の問題ではない。

システム制御の問題だ。

## 十四、この篇を一本の耐荷重チェーンに圧縮する

記事全体を一つのチェーンに圧縮するとこうだ。

```text
実タスクが event を生む
-> event が Session Log に append される
-> 大きな証拠が Artifact Store に入る
-> Reducer が event から State を畳み込む
-> Projection が State から Messages を生成する
-> Replay が event で説明を再構築する
-> Resume Gate が続行可否を判断する
-> 新しい Agent Loop は安全境界からだけ続く
```

このチェーンは前の記事をつなげる。

Intent / Execution 分離はこう教えた。

```text
モデルは提案し、システムが実行する。
```

Context Policy はこう教えた。

```text
モデルは毎ターン適切な情報だけを見るべきだ。
```

Lifecycle はこう教えた。

```text
長時間タスクは停止、失敗、中断、復旧を持つ。
```

Session Replay はこの三つを一つの工学規律にまとめる。

```text
復旧と説明に影響する境界は、すべて event にする。
```

この規律があって初めて、Agent はローカルの一回きりプロセスから、ホストされた長時間タスクへ進める。

次は外側へ広げる。

session が復旧できるようになると、次の問題が出てくる。

```text
Agent の能力はどこから来るのか？
Skills、MCP、plugin、動的 Tool 公開は、どう同じ制御 pipeline に入るのか？
```

つまり Capability Discovery だ。

能力は動的に発見できる。

しかし制御境界は動的に消えてはいけない。

---

GitHub ソース: [00-16-session-replay-event-log.md](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-16-session-replay-event-log.md)
