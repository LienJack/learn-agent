---
title: "Agent の進化経路：Chat Agent -> Tool Agent -> Runtime Agent -> Managed Agent"
shortTitle: "Agent の進化経路：4 段階のロードマップ"
description: "Agent は Chat から Tool、Runtime、Managed へ進むにつれて、現実のリスクを受け止める制御層を増やしていく。重要なのは能力の序列ではなく、どの現実リスクに触れているかで Harness の厚みを決めることだ。"
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/00-05-agent-evolution-path/cover.png'
locale: "ja"
tags:
  - Agent
  - Harness
  - Runtime
  - Managed Agent
  - 技術チュートリアル
aliases:
  - Agent の進化経路
  - Chat Agent から Managed Agent へ
  - Agent が Harness に育つまで
---

# Agent の進化経路：Chat Agent -> Tool Agent -> Runtime Agent -> Managed Agent

Agent のアーキテクチャ図を初めて見ると、多くの人は自然にこう感じる。 **なぜ「会話できるモデル」だったものが、最後には Harness 全体になっていくのか。** 最初は小さな CLI アシスタントを作りたいだけだったはずだ。ユーザーが一文を入力し、モデルが一文で答える。うまく動いたら、いくつかのツールを足す。ところがその先に進むと、Runtime、Session、Permission、Sandbox、Trace、Eval、Deployment といったものが急に現れる。

それらは、まるでアーキテクトが最初から描いていた巨大な設計図のように見える。しかし実際の進化はたいてい違う。現実のプロジェクトは、タスクに押されながら少しずつ責任を増やしていく。

```text
まず答えられるようにする
-> 次に行動できるようにする
-> さらに安定して行動できるようにする
-> 他の人にも安全に使えるようにする
-> 気づくと、モデルの外側に Harness の責任が育っている
```

この文章の中心問題はこれだ。

> Agent はどのように自然に Harness へ育つのか。

前の記事と同じ例を使う。小さな CLI Agent を作っていて、ユーザーがプロジェクトディレクトリでこう入力する。

```text
このプロジェクトのテストが失敗している理由を調べて、修正して。
```

システムが会話しかできなければ、考えられる原因を説明するだけだ。ツールを呼べるなら、ファイルを読み、テストを実行し、コードを編集する。長く走るなら、予算、エラー、中断、復旧を管理しなければならない。実ユーザーに渡すなら、sandbox、permission、context policy、evaluation、deployment まで扱う必要がある。これが Chat Agent から Managed Agent へ向かう道だ。4 つの並列した名前ではなく、エンジニアリング上の圧力が層ごとに見えるようになる道である。

## 問題の連鎖

![Chat Agent から Managed Agent、そして Harness へ自然に進化する経路の全体像](assets/00-05-agent-evolution-path/photo-01-four-stage-evolution.png)

まず問題の連鎖をまっすぐに並べる。

```text
Chat Agent は messages と model call だけを管理する
-> ユーザーが「作業して」と求め始めるため Tool Agent が必要になる
-> ツールは実環境に触れ、失敗、コスト、長時間タスクを持ち込む
-> そこで Runtime Agent が予算、中断、エラー復旧、session log を管理する
-> 複数ユーザー、複数プロジェクト、複数環境で使うなら
-> Managed Agent が sandbox、permission、context policy、memory、eval、trace、deployment scheduling を管理する
-> これらの制御層を合わせたものが Harness の原型になる
```

図にすると、おおよそ次のようになる。

![Agent の進化経路：Chat Agent -> Tool Agent -> Runtime Agent -> Managed Agent Mermaid 1](assets/00-05-agent-evolution-path/mermaid-01.png)

この図で重要なのは段階名ではなく、各段階で新たに増えるシステム責任だ。Chat Agent の責任は狭い。messages を維持し、モデルを呼び、テキストを返す。Tool Agent は言語の世界から一歩外へ出る。モデルが行動意図を出し、システムがツールを実行し、結果を返す。Runtime Agent は、行動は失敗し、タスクは長くなり、予算は尽き、ユーザーは中断し、プロセスは落ちる、という事実を受け入れる。Managed Agent はさらに、実ユーザーはデモを自分のノート PC だけで動かすわけではなく、異なるリポジトリ、権限、組織フローの中に Agent を置く、という事実を受け入れる。

だから Harness は、どこかから急に設計された「大きなアーキテクチャ」ではない。Agent をより現実的な環境に置くたび、外側に育たざるを得なかった制御層である。

ここで先に確認しておきたい。これら 4 段階は成熟度ランキングではない。

Chat Agent が低級で Managed Agent が高級、という話ではない。たとえばブログのタイトルを書き換えるだけの Chat Agent でも、境界が明確で、出力が安定し、使い心地がよければ、それは良いシステムだ。逆に Managed Agent を名乗る平台でも、過大な権限を持ち、audit も verification も recovery point もなければ危険である。

したがってこの進化経路は、すべての Agent が最後まで進むべきアップグレード手順ではなく、リスク圧力モデルとして理解したほうがよい。

Agent がどの層で止まるべきかは、名前ではなく、どの現実リスクに触れるかで判断する。

```text
外部システムに触れるか。
実際の状態を変更するか。
多くのターンを走るか。
セッションをまたいで継続するか。
複数ユーザーに提供するか。
認証情報や権限に触れるか。
audit と regression が必要か。
```

「はい」が増えるほど、責任は prompt と model から Harness へ移る必要がある。

進化の圧力は 4 本の軸として描ける。

![能力順位ではなくリスク圧力の増加として Agent の進化を見る](assets/00-05-agent-evolution-path/mermaid-02.png)

この図は重要な現象を説明する。同じプロダクトの中に、異なる層の Agent が同時に存在しうるということだ。

小さな Claude Code でも、ユーザーが「このエラーを説明して」と聞くときは Chat Agent の経路でよい。ファイルを読んで要約してほしいなら Tool Agent の経路になる。テストを修正し、継続的に検証してほしいなら Runtime Agent の経路になる。定期実行、remote sandbox、multi-user permission、regression eval まで持つようになって初めて、Managed Agent / Harness の境界に入る。

つまり進化経路を「すべてのシステムが最後まで上がるべき階段」と読むべきではない。より正確にはこう読む。

```text
各タスク経路は、自分が触れるリスク圧力に応じて制御層の厚さを選ぶ。
```

## 1. Chat Agent：まずシステムが答えられるようにする

![リスク圧力の増加として見る Agent 進化](assets/00-05-agent-evolution-path/photo-02-risk-pressure-axes.png)

話は最も単純な形から始まる。Chat Agent の構造はたいてい素朴だ。

```text
user input
-> messages.append(user)
-> call model
-> messages.append(assistant)
-> output answer
```

これは裸の LLM 呼び出しより一歩進んでいる。対話履歴を管理し始めているからだ。ユーザーは続けて質問できる。

```text
このエラーはどういう意味？

まずどのファイルを見るべき？

依存バージョンの問題なら、どう調べればいい？
```

Chat Agent は前の文脈を次のターンに持ち込める。完全な一問一答ではなく、最小限の session を持つ。しかし世界はまだテキストの中だけだ。

CLI Agent の例で、ユーザーがこう言う。

```text
このプロジェクトのテストが失敗している理由を調べて、修正して。
```

Chat Agent はこう答えるかもしれない。

```text
まずテストコマンドを実行し、失敗ログを確認してください。
次に stack trace から関連ファイルを特定します。
assertion failure なら expected value と actual value を比較します。
```

この答えは必ずしも間違っていない。問題は、実際には何もしていないことだ。リポジトリを読んでいない。テストを走らせていない。実際のエラーを見ていない。ファイルを開いていない。修正が成功したかも検証していない。

これが Chat Agent の境界である。 **会話は管理できるが、現実環境には触れられない。**

概念説明、草稿作成、文章要約が目的なら、この境界で十分なことも多い。だがユーザーが「修正して」と言った瞬間、Chat Agent の問題が見え始める。第一に、助言を進捗のように語りやすい。モデルが「まずテストログを確認します」と言っても、システムは確認していない。第二に、事実を想像で補完しやすい。プロジェクト構造が与えられていないのに、React、Node、Python、Rails などを推測してしまう。第三に、閉ループで検証できない。「修正後にテストを実行してください」と言えても、テストが通ったかは分からない。

Chat Agent のエンジニアリング上の価値はこう言える。

```text
messages と model call の基本ループを作る。
```

一方で残る核心問題はこうだ。

```text
モデルは次に何をすべきかを言えるが、その次の一歩を実際に起こせない。
```

ここから Tool Agent が必要になる。最小の Chat Agent は次のように書ける。

```ts
type Message = {
  role: "user" | "assistant"
  content: string
}

async function chat(input: string) {
  messages.push({ role: "user", content: input })

  const answer = await model.complete({ messages })

  messages.push({ role: "assistant", content: answer })

  return answer
}
```

この擬似コードで重要なのは構文ではなく責任境界だ。messages を管理し、モデルを呼び、テキストを返すだけである。tool protocol も execution layer も permission も recovery もない。この段階でモデルに「テストを実行したふり」をさせると、システムは危険になる。ユーザーには自信のある説明が見えるが、背後には検証可能な行動がないからだ。

最初の進化は「prompt を強くする」ことではない。モデルの出力を「回答テキスト」から「行動意図」へ変えることだ。

## 2. Tool Agent：モデルの意図を制御された行動へ変える

Tool Agent が現れるのは、ユーザーが「やり方を教えて」だけでは満足しないからだ。ユーザーが本当に求めるのはこういうことだ。

```text
あなたがやって。
```

CLI Agent では、少なくとも次の操作が必要になる。

```text
ファイルを読む
コードを検索する
コマンドを実行する
ファイルを編集する
実行結果をモデルへ返す
```

このときモデルの出力は自然言語だけでは足りない。構造化された行動意図を表現する必要がある。モデルは単にこう言うべきではない。

```text
package.json を確認する必要があります。
```

代わりに、次のような intent を出すべきだ。

```json
{
  "tool": "read_file",
  "args": {
    "path": "package.json"
  }
}
```

ここが重要な転換点である。この瞬間から Agent の中心ループはこう変わる。

```text
モデルが次の一歩を判断する
-> tool intent を出す
-> Runtime が tool と args を検証する
-> Tool Executor が実行する
-> Observation を message stream に戻す
-> モデルが結果を見て次を判断する
```

実行過程を図にするとこうなる。

![Agent の進化経路：Chat Agent -> Tool Agent -> Runtime Agent -> Managed Agent Mermaid 3](assets/00-05-agent-evolution-path/mermaid-03.png)

この図で最も重要な境界は、`Model -> Loop` と `Loop -> Tools` の分担である。モデルは意図を出すだけだ。Loop と Tool Runtime が、その意図を実行してよいか、どう実行するか、結果をどう書き戻すかを決める。

この境界がないと、Tool Agent はすぐに「モデルが shell を吐き、システムがそのまま実行する」形へ退化する。そこにはいくつもの問題がある。

まず、引数が制御できない。モデルは半端なコマンド、間違ったパス、誤ったツール名、自然言語が混じった引数を出すかもしれない。だから各ツールには schema が必要だ。

```ts
type ToolCall = {
  name: string
  args: unknown
}

type Tool = {
  name: string
  description: string
  inputSchema: JsonSchema
  execute(args: unknown, ctx: ToolContext): Promise<ToolResult>
}
```

次に、権限が制御できない。同じ shell command でも `npm test` と `rm -rf .` は同じリスクではない。同じファイル操作でも、ソースコードを読むことと設定ファイルを書き換えることは違う。Tool Agent は「ツールが呼ばれたか」だけではなく、次を判断しなければならない。

```text
このツールは存在するか。
引数は正しいか。
現在の session でこのツールを使ってよいか。
この操作にユーザー確認は必要か。
実行結果を切り詰めるべきか。
失敗をモデルへどう表現するか。
```

さらに、状態も制御しなければならない。ツール実行結果は端末に表示されるだけでは足りない。次のモデルターンが読める observation にならなければ、モデルは現実環境で何が起きたか分からない。

「テスト失敗を修正する」タスクでは、最初のツール呼び出しはこうかもしれない。

```text
run_tests -> 失敗ログを返す
```

次のターンでモデルは失敗ログを見て、こう判断する。

```text
src/auth/session.ts を読む必要がある。
```

さらにその次にファイルを読んだあと、こう判断するかもしれない。

```text
token の期限境界判定を修正する必要がある。
```

Tool Agent が Chat Agent より増やすものはこう整理できる。

```text
messages だけでなく、tool schema、tool execution、observation feedback を持つ。
```

ただし Tool Agent には、よく軽視される制御点がもう一つある。ツール可視性だ。

安全性は、モデルがツールを呼んだあとに実行可否を判断するだけでは足りない。もっと早い門がある。

```text
このターンでモデルにどのツールを見せるべきか。
```

モデルがあるツールを見えなければ、そのツールを前提にタスクを計画しない。現在の session が read-only mode なら、`edit_file`、`write_file`、`run_destructive_command` をモデルに公開すべきではない。ユーザーが「失敗ログを説明して」と聞いているだけなら、すべての MCP tool、browser tool、deployment tool、database tool を見せる必要もない。

ツール一覧は能力の展示棚ではない。モデルがこのターンで持つ行動空間である。

これは安全、コスト、品質の 3 つに効く。危険なツールが常に見えていると、モデルはそれを計画に組み込むかもしれない。tool schema は context を消費するため、ツールが多いほど token cost と選択難度が上がる。ツールが多すぎると、モデルは本来ファイルを読むべき場面で検索し、本来テストを走らせる場面で無関係なツールを呼び、本来終わるべき場面で探索を続ける。

したがって成熟した Tool Agent の印は「多くのツールを登録していること」ではない。動的にツールを裁断できることだ。

```text
タスク段階に応じて裁断する。
権限モードに応じて裁断する。
作業ディレクトリに応じて裁断する。
ユーザー確認状態に応じて裁断する。
context budget に応じて裁断する。
ツールの履歴上の振る舞いに応じて裁断する。
```

これが Tool Agent が Runtime Agent へ進む理由でもある。ツールが増えるほど、可視性、予算、失敗モード、履歴の振る舞いを管理する必要が出てくる。そうでなければ、ツールシステムは「Agent が行動できるようにするもの」から「Agent を迷子にしやすくするもの」へ変わる。

## 3. Runtime Agent：長いタスクを制御、復旧、復盤できるようにする

Tool Agent は「行動できるか」を解決する。Runtime Agent が解決するのは、 **行動過程を安定して継続できるか** である。

demo では、よく次のような単純な loop を書く。

```ts
while (true) {
  const event = await model.next(state)

  if (event.type === "final") break

  if (event.type === "tool_call") {
    const result = await tools.execute(event)
    state.messages.push(result)
  }
}
```

理解しやすいが、すぐ壊れる。モデルがいつまでも final を出さない場合はどうするのか。ツールが詰まったらどうするのか。あるターンの出力が長すぎて context を押しつぶしたらどうするのか。テストが 5 分走り続けたらどうするのか。ユーザーが中断して、あとで再開したい場合はどうするのか。システムが落ちたあと、どのファイルを変更したかをどう復盤するのか。

これらはモデルが「もっと賢く」なれば自動で解ける問題ではない。Runtime の責任である。Runtime Agent は Tool Agent に少なくとも次の責任を足す。

```text
turn limit：最大何ターン走れるか
token budget：context と generation の予算
time budget：tool と task の timeout
error policy：retry するエラーと止めるエラーの分類
interrupt：ユーザー中断と cancellation
session log：イベントの永続記録
replay：ログからの復旧と復盤
compaction：context 圧縮
```

この時点で Agent loop は単純な `while true` ではなく、制御された state machine に近づく。

![Agent の進化経路：Chat Agent -> Tool Agent -> Runtime Agent -> Managed Agent Mermaid 4](assets/00-05-agent-evolution-path/mermaid-04.png)

この図で重要なのは状態数ではない。Agent が「lifecycle」を持ち始めることだ。Chat Agent には入力と出力がある。Tool Agent には tool call と tool result がある。Runtime Agent には start、pause、resume、fail、finish がある。

lifecycle があるなら、budget を毎ターン確認しなければならない。

```ts
function canContinue(session: SessionState) {
  if (session.turns >= session.maxTurns) return false
  if (session.tokensUsed >= session.tokenBudget) return false
  if (Date.now() > session.deadline) return false
  if (session.interrupted) return false
  return true
}
```

これはモデルの自由を奪うためではない。タスクに予測可能な実行境界を与えるためだ。

error recovery も同じである。ツール失敗は必ずしもタスク失敗ではない。`read_file` の失敗はパス間違いかもしれない。`run_tests` の失敗は、そもそも解決すべき対象かもしれない。`edit_file` の失敗はファイルが並行変更されたせいかもしれない。`bash` の timeout は、より小さなコマンドに分けるべきという信号かもしれない。

Runtime はすべてのエラーをモデルに丸投げしてはいけないし、すべてを黙って retry してもいけない。より安定した実行層は、結果を event として表現する。

```ts
type RuntimeEvent =
  | { type: "model_started"; turn: number }
  | { type: "tool_requested"; call: ToolCall }
  | { type: "tool_succeeded"; result: ToolResult }
  | { type: "tool_failed"; error: ToolError; recoverable: boolean }
  | { type: "budget_exceeded"; kind: "turn" | "token" | "time" }
  | { type: "interrupted"; reason: string }
  | { type: "final"; content: string }
```

イベント化すると、session log と replay の土台ができる。Agent がコードを変更して失敗したとき、ユーザーが知りたいのは単なる謝罪ではない。

```text
申し訳ありません。完了できませんでした。
```

```text
どのファイルを読んだのか。
どのコマンドを実行したのか。
どこを変更したのか。
どのステップで失敗したのか。
復旧できるのか。
今の worktree はどんな状態なのか。
```

これが Runtime Agent の重要な変化である。 **Agent は次の一歩を生成するだけでなく、復盤できる実行軌跡を残さなければならない。**

Claude Code のようなシステムでは特に重要だ。コード変更は一回のテキスト生成ではなく、filesystem、git worktree、test command、user confirmation の間で起きる。session log がなければ、Agent が落ちた瞬間に現場が切れる。replay がなければ、失敗が model judgement、tool execution、Runtime feedback のどこで起きたか分からない。interrupt がなければ、ユーザーは Agent が走り続けるのを見るしかない。compaction がなければ、長いタスクは context window に飲み込まれる。

Runtime Agent は Tool Agent が長タスクへ入ったとき、必然的に現れる。解決する問題はこうだ。

```text
行動はできるが、行動過程が制御できない。
```

そして次の問題を残す。

```text
この Runtime を、異なるユーザー、異なるプロジェクト、異なる権限環境で使うなら、外側の境界を誰が管理するのか。
```

ここから Managed Agent が出てくる。

## 4. Managed Agent：Agent を実組織と実環境に入れる

Runtime Agent は長いタスクを走らせられる。しかし多くの場合、まだ暗黙の前提を持っている。

```text
Agent は信頼されたローカル単一ユーザーの一時的環境で走る。
```

実運用では、この前提はすぐ崩れる。CLI Agent は会社のコードベースに入るかもしれない。CI、Web、IDE、Slack、Cron から起動されるかもしれない。複数ユーザーに同時提供されるかもしれない。社内文書、issue system、deployment platform、secret manager と接続するかもしれない。不信なコマンドを sandbox で動かす必要があるかもしれない。実行 trace を platform に渡して evaluation する必要があるかもしれない。

この段階の問いは「このターンをどう走らせるか」ではなく、次のようになる。

```text
誰が実行を許可するのか。
どの環境で実行するのか。
どのファイルとネットワークにアクセスできるのか。
どの secret を使えるのか。
コードを変更できるのか。
memory はどこから来るのか。
context policy は誰が定義するのか。
効果をどう評価するのか。
失敗時に誰へ通知するのか。
batch deployment と upgrade は可能か。
```

これらを合わせた範囲が Managed Agent である。Managed Agent は「より賢い Agent」ではない。platform によって托管、治理、観測、配布される Agent である。Runtime Agent が 1 回のタスク lifecycle を管理するなら、Managed Agent は system capability としての Agent lifecycle を管理する。

分層図にするとこうなる。

![Agent の進化経路：Chat Agent -> Tool Agent -> Runtime Agent -> Managed Agent Mermaid 5](assets/00-05-agent-evolution-path/mermaid-05.png)

重要なのは、Managed Agent が Agent を governance 可能な外殻に入れることだ。entrypoint はどこから起動されるかを決める。policy は何をしてよいかを決める。sandbox はどこで実行するかを決める。runtime はどう継続するかを決める。observability と eval はうまく動いたかを決める。deployment はどう公開、更新、rollback するかを決める。

sandbox は誤解されやすい。多くの人は sandbox を安全機能と考える。もちろん安全機能だが、それだけではない。sandbox は再現可能な実行環境でもある。ユーザーのローカルで自由に走るなら、node version、dependency cache、environment variable、file permission は毎回違うかもしれない。同じタスクが今日は手元で通り、明日は CI で落ちる。Managed Agent はこうした環境差を収束させる必要がある。だから sandbox、container、workspace、permission、secret scope は一緒に現れる。

permission も同じだ。Tool Agent の段階でも tool permission はあった。しかし Managed Agent の permission はさらに外側にある。

```text
このツールを呼び出せるか。
```

```text
このユーザーはこのプロジェクトでこの Agent を起動できるか。
この Agent はこの repository にアクセスできるか。
この session は file write できるか。
この command には human confirmation が必要か。
この task は network を使えるか。
この secret を sandbox へ注入できるか。
```

この層がないと、Agent は組織環境で曖昧な super permission の入口になる。見た目はモデルが働いているだけだが、実際にはすべての境界が「知能」という言葉の下に隠れる。これはエンジニアリング上、受け入れられない。

eval も重要だ。単発の CLI demo なら、人間が見てよし悪しを判断できる。しかし Managed Agent は継続的に改善される。model が変わる。prompt が変わる。tool policy が変わる。context policy が変わる。sandbox image が更新される。どの変更も結果に影響しうる。

eval がなければ、システムは次を判断できない。

```text
前バージョンより良くなったのか。
誤ってファイルを変更しやすくなっていないか。
コストは上がっていないか。
特定の repository で退化していないか。
危険な権限をより頻繁に求めていないか。
```

だから Managed Agent には trace と evaluation が必要になる。Trace は「専門的に見せるため」のものではない。1 回の Agent run を検査可能な event chain に分解するためのものだ。Eval は多くの event chain を比較可能な品質信号に変える。Agent が個人ツールから platform capability へ変わると、これらは optional ではなくなる。

## 5. Harness：別の Agent ではなく、モデル外側の制御システム

ここまで来ると、Harness を振り返りやすくなる。最初にこう言っても正しい。

```text
Harness はモデル外部の制御システムであり、Execution、Tools、Context、Lifecycle、Observability、Verification、Governance を担当する。
```

ただしこの言い方だけでは抽象的だ。進化経路に沿って見ると、意味がはっきりする。Chat Agent には messages が必要だ。Tool Agent には tool protocol と execution pipeline が必要だ。Runtime Agent には budget、error、interrupt、session log、replay が必要だ。Managed Agent には sandbox、permission、context policy、memory、eval、trace、deployment が必要だ。

これらはモデルそのものの一部ではない。モデルは自然にそれらを管理しないし、prompt の中へ押し込むべきでもない。prompt が影響できるのは、このターンでモデルがどう判断するかだけだ。Harness が扱うのは、モデル外側の現実制約である。

承重する流れを書くとこうなる。

```text
ユーザー目標
-> Managed Policy が起動可否を判断する
-> Sandbox が実行環境を用意する
-> Runtime が session を作る
-> Context Builder が model input を組む
-> Model が次の intent を出す
-> Tool Runtime が検証して実行する
-> Observation が session log に入る
-> Runtime が継続、停止、復旧、終了を判断する
-> Trace / Eval が品質信号を記録する
```

図にするとこうなる。

![Agent の進化経路：Chat Agent -> Tool Agent -> Runtime Agent -> Managed Agent Mermaid 6](assets/00-05-agent-evolution-path/mermaid-06.png)

この図が示すのは Harness の位置だ。Harness はモデルの横にもう一つ「総指揮モデル」を置くことではない。決定的なエンジニアリング制御層の集合である。モデルは与えられた context の中で次の一歩を判断する。Harness はその一歩を次の性質を持って起こす。

```text
実行可能
制約可能
記録可能
復旧可能
評価可能
配布可能
```

だから Agent が触れる環境が現実に近く、権限が大きいほど Harness は重要になる。Agent が会話だけなら Harness は薄くてよい。ファイルを読み、コードを変更し、コマンドを走らせるなら、Harness は tool risk を受け止めなければならない。長時間自律的に走るなら lifecycle risk を受け止める必要がある。複数ユーザー、複数プロジェクト、複数入口で使うなら governance risk を受け止める必要がある。

Harness はアーキテクチャ潔癖ではない。Agent がおもちゃ環境を出たあと、システムが生き残るために育つ骨格である。

## 6. 4 段階それぞれの失敗形態

進化経路を理解するには、新しい能力だけでなく、各層が欠けたときの失敗を見たほうがよい。

Chat Agent の典型的な失敗は、「助言」を「完了」のように語ることだ。筋の通った調査手順を出しても、実際のプロジェクトは何も変わっていない。ユーザーに経験がなければ、Agent がすでに確認したと誤解するかもしれない。したがって Chat Agent の境界は明確でなければならない。

```text
答えられることは、実行できることを意味しない。
```

Tool Agent の典型的な失敗は、ツールの暴走だ。モデルが危険なコマンドを出し、システムに permission check がない。モデルが間違った引数を出し、ツールが default value で実行してしまう。ツールが数万行のログを context にそのまま戻す。ツール失敗が構造化されず、モデルが推測を続ける。したがって Tool Agent の境界はこうだ。

```text
ツールはモデルの手足ではなく、Runtime が管理する protocol 化された能力である。
```

Runtime Agent の典型的な失敗は、プロセスの暴走だ。loop が長すぎる。retry に上限がない。ユーザーが中断できない。context が汚れていく。session が落ちたあと復旧できない。どのファイルを変えたか説明できない。したがって Runtime Agent の境界はこうだ。

```text
長タスクは while true ではなく、pause、resume、replay できる lifecycle である。
```

Managed Agent の典型的な失敗は、platform 境界の暴走だ。Agent が過大な権限を持つ。sandbox と実環境が混ざる。共有すべきでない memory がユーザー間で共有される。model update 後の退化に誰も気づかない。trace がなく原因が追えない。deployment と rollback の戦略がない。したがって Managed Agent の境界はこうだ。

```text
Agent は自由に放たれるプロセスではなく、governance、observability、evaluation の下に置かれる platform capability である。
```

この 4 つの失敗形態は、各層の追加機構が飾りではないことを示している。すべて前の層で実際に露出した失敗を受け止めるためのものだ。

## 7. 実装では、最初から大きな平台にしない

最後に Harness まで育つなら、最初から Managed Agent platform を作るべきなのか。必ずしもそうではない。この文章が強調しているのは「自然に育つ」ことであって、「最初から全部積む」ことではない。

小さな CLI Agent なら、段階的に制御層を増やすほうが安定する。

第一段階では Chat Agent だけを作る。provider contract、messages、streaming output を通す。複雑なツールを急がず、まず確認する。

```text
モデル入出力の境界は明確か。
message history は制御できているか。
error はユーザーに理解できるか。
```

第二段階で Tool Agent を足す。最初は read-only tool から始める。`read_file`、`list_files`、`search` のようなものだ。observation feedback が安定してから、write tool や shell tool を足す。この段階の重点はツール数ではなく tool protocol である。

```text
schema は厳密か。
permission は階層化されているか。
tool result は構造化されているか。
output は truncation と summary を持つか。
```

第三段階で Runtime Agent を足す。loop に turn limit、timeout、interrupt を入れる。次に event を session log へ書く。最後に replay、compaction、recovery、より細かい error policy を考える。この段階の重点は lifecycle である。

```text
なぜタスクは続くのか。
なぜ停止するのか。
どこで失敗したのか。
ユーザーは中断できるか。
クラッシュ後に何が起きたか分かるか。
```

第四段階で Managed Agent を作る。システムが他人に使われ始めたり、実組織のリソースへ接続し始めたりしてから、より完全な managed layer が必要になる。この段階の重点は governance と operation である。

```text
sandbox はどう隔離するか。
permission はどう承認するか。
memory はどう分域するか。
trace はどう収集するか。
eval はどう regression するか。
deployment はどう canary と rollback を行うか。
```

保守的な実装経路は次のように書ける。

```ts
interface AgentHarness {
  provider: ModelProvider
  tools: ToolRegistry
  runtime: RuntimeController
  sessionStore: SessionStore
  policy?: PolicyEngine
  sandbox?: SandboxManager
  telemetry?: TraceSink
  evals?: EvalRunner
}
```

多くのフィールドが optional である点に注意したい。重要ではないからではない。タスクの現実性に応じて段階的に導入すべきだからだ。自分のローカルで文章整理を手伝うだけの Agent なら managed layer は薄くてよい。会社のコードベースで自動 PR を開く Agent なら managed layer は省けない。

判断基準はアーキテクチャ図の美しさではない。

```text
この Agent は今どの現実リスクに触れているか。
どのリスクが人間の見守りだけでは解決できなくなったか。
どのリスクをシステム機構で受け止める必要があるか。
```

進化経路からアーキテクチャを逆算すると、概念の完全性のためにコンポーネントを積みすぎずに済む。同時に、リスクがすでに出ているのに prompt がすべてを解くと pretending することも避けられる。

## 8. さらに一層見る：復旧可能、評価可能、委派可能

![復旧可能、評価可能、委派可能が Managed Agent の改善 flywheel を作る様子](assets/00-05-agent-evolution-path/photo-03-eval-and-handoff-flywheel.png)

Chat、Tool、Runtime、Managed の 4 段階だけを見ると、進化は「機能が増えること」のように見えるかもしれない。もう一層深く見ると、実際に現れているのは 3 つのエンジニアリング性質である。

```text
復旧可能
評価可能
委派可能
```

### Session log は普通のログではない

Runtime Agent で最も重要な対象の一つが session log である。

これは debug output でも terminal transcript でもない。Agent の event ledger である。少なくとも次を記録するべきだ。

```text
ユーザー入力
モデル意図
ツール呼び出し
ツール結果
permission decision
budget event
context compaction
verification result
final state
```

session log がなければ、「復旧可能」はただのスローガンになる。システムが落ちたあと、モデルがどの事実を見て、どのツールを実行し、どのファイルを変え、どの操作が拒否され、最後の安定地点がどこだったか分からないからだ。

session log にはもう一つの価値がある。eval と audit が共通の事実基盤を持てることだ。messages だけを保存すると、多くの重要事実が消える。messages はモデルに見せる context projection であり、切り詰め、圧縮、並べ替えが起きる。session log はできるだけ event causality を残すべきだ。

```text
ModelIntent -> PolicyDecision -> ToolExecution -> Observation -> Verification
```

この因果鎖が明確であるほど、システムは「今回の失敗はどの層で起きたのか」に答えやすくなる。

### Sandbox は檻であり、許可証でもある

Managed Agent で誤解されやすいもう一つの対象が sandbox だ。

多くの人は sandbox を安全隔離としてだけ見る。もちろん安全機構である。file scope、environment variable、network、process、credential、副作用の半径を制限する。しかし sandbox には 2 つ目の価値がある。再現性だ。

毎回、清潔で記述可能で再構築可能な環境でタスクを実行できれば、verification result に意味が出る。そうでなければ、モデルが今日あなたのローカルでは通ったが明日別のマシンでは落ちたとき、コード問題なのか依存問題なのか環境問題なのか判断しにくい。

sandbox には 3 つ目の価値もある。活性である。

sandbox がないシステムは、安全のために頻繁にユーザーへ尋ねるしかない。

```text
このファイルを読んでよいですか。
このコマンドを実行してよいですか。
この cache directory に書いてよいですか。
この port へアクセスしてよいですか。
```

質問が多すぎると、ユーザーは疲れる。全部拒否するか、機械的に許可するかのどちらかになる。どちらも安全ではない。

境界の明確な sandbox があれば、システムは境界内でより自律的に動ける。

```text
この directory 内の read-only 操作は自動許可する。
この temporary worktree 内の test command は自動許可する。
network policy 外の access は拒否する。
実 repository へ write する前に diff を生成して確認する。
```

つまり sandbox は檻であり、許可証でもある。Agent を制御された領域に閉じ込めると同時に、その領域内ではユーザーをむやみに中断せず、継続的に行動できるようにする。

### Eval flywheel：採点ではなく Harness を改善する

Managed Agent の eval も、最終 score だけとして理解すべきではない。

より価値があるのは次の閉ループである。

```text
trace が軌跡を捕まえる
-> 結果と経路を判断する
-> model、tool、context、sandbox、permission、verifier のどこに原因があるか帰属する
-> regression case を作る
-> Harness を修正する
-> 同じ task batch を再実行する
```

これが eval flywheel である。

目的はモデルが「賢い」かどうかを証明することではない。Harness 改善に取っかかりを作ることだ。たとえば失敗タスクで最終回答は間違っていたが、trace を見るとモデルの初期判断は正しく、tool output が truncation されたために重要な error が落ちていた。ならば直すべきは model prompt ではなく Tool Result Policy である。

別の失敗では tool result は完全だったが、モデルが同じファイルを 3 回読んでいた。これは loop state が重複行動を記録していないか、context projection が「すでに読んだ事実」をモデルに見せていないということだ。直すべきは Runtime Guardrail または Context Policy である。

さらに別の失敗では、モデルは正しい変更を出したが、関連テストを実行せずに完了を宣言した。これは Verification Gate の問題だ。

trajectory level の evaluation だけが、失敗をこうした修正可能な工程問題に分解できる。そうでなければ、システムが得る結論は曖昧な一言だけになる。

```text
今回の Agent はうまくできなかった。
```

この結論は改善の役に立ちにくい。

### Sub-agent handoff はモデルを増やすことではない

最後は委派である。

Managed Agent は sub-agent を導入しがちだ。しかし sub-agent は「モデルを何体か呼んで role play させる」ことではない。本当の handoff では、次のような工程オブジェクトを渡す。

```text
task intent
known facts
constraints
available tools
permission boundary
budget
risk
intermediate artifacts
open questions
return format
```

子 Agent は context を分離できる。しかし責任を分離して消すことはできない。tool permission は主 Agent の権限境界を継承するか、さらに狭めるべきだ。出力も単なる summary ではなく、evidence、operations、risk、next steps を含むべきである。

これも multi-agent がシステムを Harness へ押し出す理由だ。task を委派し始めると、必ず次に答えなければならない。

```text
誰が委派を承認したのか。
子 Agent は何を見られるのか。
子 Agent はどのツールを呼べるのか。
子 Agent の結果は main session にどう入るのか。
子 Agent が失敗した場合、責任はどう主 flow に戻るのか。
```

これらに答えがなければ、multi-agent は 1 つの Agent の不確実性を複数に増やすだけになる。

## 9. 4 段階を一文に圧縮する

最後に、この道をもう一度圧縮する。

Chat Agent が解決するのはこれだ。

```text
モデルに継続対話させる方法。
```

Tool Agent が解決するのはこれだ。

```text
モデルの次の意図を制御された行動に変える方法。
```

Runtime Agent が解決するのはこれだ。

```text
多段階の行動を、予算、エラー、中断、復旧の下で安定して走らせる方法。
```

Managed Agent が解決するのはこれだ。

```text
Agent を実ユーザー、実プロジェクト、実権限、実評価体系の中で托管する方法。
```

Harness はこれら制御責任の集合である。

```text
モデルは次の一歩を判断する。Harness はその一歩が現実世界で、より制御可能、監査可能、復旧可能、検証可能に起きるようにする。
```

だから Agent は最初から複雑なシステムとして設計されるわけではない。現実環境に何度もぶつかることで、Chat から Tool へ、Tool から Runtime へ、Runtime から Managed へ育っていく。これは後で ETCLOVG の 7 層 Harness を読むための重要な背景でもある。Execution、Tools、Context、Lifecycle、Observability、Verification、Governance は 7 つの抽象分類ではない。どれもこの進化経路の中で、現実のタスクに押し出された工程責任である。

## 教学 Harness への落とし込み

この章は教学プロジェクトの milestone として読めます。まず CLI/API が答える。次に `MockModel` が tool を呼ぶ。次に tool result を loop に戻す。次に session を永続化する。最後に UI と event timeline で実行過程を見せる。各 step で増やす工程圧力は一つだけにします。provider、permission、frontend、persistence を一度に足さないことで、進化パスが commit 可能な段階になります。

---

GitHub ソース: [00-05-agent-evolution-path.md](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-05-agent-evolution-path.md)
