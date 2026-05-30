---
title: "最小 Agent Loop：単発回答から多段階の行動へ"
description: "前回までの記事では、Agent は一文の Prompt でも、より会話上手なモデルでもなく、制御されたプロセスの中でタスクを継続的に進める実行システムだと整理してきた。"
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/00-08-minimal-agent-loop/cover.jpg'
locale: "ja"
tags:
  - Agent
  - Agent Loop
  - ReAct
  - Tool Runtime
  - 技術チュートリアル
aliases:
  - 最小 Agent Loop
  - ReAct 最小閉ループ
  - 回答から行動へ
---

# 最小 Agent Loop：単発回答から多段階の行動へ

前回までの記事では、Agent は一文の Prompt でも、より会話上手なモデルでもなく、制御されたプロセスの中でタスクを継続的に進める実行システムだと整理してきた。

ここまで来ると、素朴だが重要な疑問が出てくる。

**その「継続的に進める」は、具体的にどう起きるのか？**

表面だけを見ると、答えは拍子抜けするほど単純に見える。

```text
while loop を書く。
```

しかし Agent を実際に作ったことがある人なら、危険もここに潜んでいると分かる。

`while true` は、モデルに何度もツールを呼ばせることもできるし、システムを永遠に同じ場所で回し続けることもできる。新しい観測に基づいて次の判断へ進ませることもできるし、古い誤りを雪だるま式に大きくすることもできる。ChatBot を行動するものへ変えることもできるが、予算も停止条件も状態記録もなければ、説明できないブラックボックスにもしてしまう。

だからこの記事で扱うのは、「ループ構文をどう書くか」ではない。

> なぜ最小の Agent Loop は、システムを単発回答から多段階の行動へ変えるのか？その loop は、最低限どんな工学的責務を持つべきなのか？

引き続き、前回までと同じ例を使う。

```text
ユーザーがプロジェクトディレクトリで入力する：
このプロジェクトのテストがなぜ失敗しているか見て、修正して。
```

システムが LLM を一度だけ呼ぶなら、モデルはこの一文だけをもとに推測を生成するしかない。「依存関係のバージョンを確認してください」「テスト環境の問題かもしれません」「npm test を実行してみてください」と言うかもしれない。助言として間違っているとは限らないが、実際のプロジェクトには触れていないし、観測に応じて次の判断へ進むこともない。

Agent Loop が埋めるのは、この断絶である。

```text
モデルが次の一手を判断する
-> システムが制御されたアクションを実行する
-> 実際の観測を state に書き戻す
-> モデルが新しい観測に基づいて再判断する
-> 最終結論を出せるか、停止条件に到達するまで続ける
```

これが最小 ReAct loop の骨格だ。ここでの ReAct は、まず工学的な仕組みとして捉えればよい。判断、行動、観測を閉ループにすることであって、モデルに長い私的思考を書かせることではない。

先に一文で押さえておく。

**単発回答は、現在の context の中でテキストを生成するだけである。Agent Loop は、「判断、行動、観測、再判断」という状態機械の中でモデルにタスクを進めさせる。ただし行動そのものは、あくまでシステムが制御して実行する。**

## 問題の連鎖

![単発回答が Think、Act、Observe、Final の最小閉ループへ変わる流れ](assets/00-08-minimal-agent-loop/photo-01-react-loop-from-answer-to-action.jpg)

この章の問題の連鎖は短いが、一つひとつが重い。

```text
単発回答では、実際の観測に基づいて進み続けられない
-> loop により、モデルは次の一手を繰り返し提案できる
-> tool が次の一手を実行可能な action に変える
-> observation が実行結果をモデルへ戻す
-> state がターン、messages、予算、エラー、tool result を記録する
-> 停止条件が loop の空回りを防ぐ
-> 最小 Agent Loop によって、「助言できる」から「前へ進める」へ変わる
```

最小閉ループとして描くとこうなる。

![最小 Agent Loop：単発回答から多段階の行動へ Mermaid 1](assets/00-08-minimal-agent-loop/mermaid-01.png)

この図で最も重要なのは、`Observe -> State -> Think` の経路だ。

多くの demo は `Think -> Act` だけを実装している。つまり、モデルに tool call を出させる。見た目はもう Agent らしい。しかし tool result が observation として整理されず、state に書き戻されず、次のモデル入力にならないなら、それは「モデルがファイルを読みたいと言ったので、プログラムがついでに読んだ」だけである。タスクは本当には連続していない。

Agent Loop の価値は、「モデルがツールを呼べること」ではない。

価値はここにある。

```text
tool result が次の判断を変える。
```

この一文が成立した瞬間、システムは ChatBot の世界から Agent の世界へ入り始める。

## 一、単発回答ではなぜ「テストを直す」まで届かないのか

まず、あえて最も弱いシステムから始める。

CLI を一つ書く。

```text
$ mini-agent "このプロジェクトのテストがなぜ失敗しているか見て、修正して。"
```

最初の版には、モデル呼び出しが一回だけある。

```text
user input -> provider.chat() -> model reply -> print result
```

このときモデルは、たとえば次のように答えるかもしれない。

```text
まずテストコマンドを実行して失敗ログを確認します。
次に失敗している assertion を特定します。
関連コードを修正します。
最後にテストを再実行します。
```

助言としては悪くない。問題は、ユーザーが求めているのは助言ではなく「修正して」だということだ。

実際のプロジェクトでテスト失敗を直すには、少なくとも次のような事実が必要になる。

```text
このプロジェクトはどの package manager を使うのか？
テストコマンドは何か？
どのテストが失敗しているのか？
エラーログは何と言っているのか？
関連するソースコードはどこか？
修正後に本当に通ったのか？
```

これらの事実は、ユーザーの一文にもモデルのパラメータにも入っていない。現在の作業ディレクトリ、ファイルシステム、端末出力、テストフレームワーク、プロジェクトの約束事の中にある。

単発回答の問題は「賢くない」ことではない。これらの事実を取りに行く機会がないことだ。

事実が足りない状態で助言するしかない。

Agent Loop が最初に行うのは、モデルが第一ターンでは答えを知らないと認めることだ。

これは重要だ。行動できる Agent は、毎ターン知っているふりをするのではなく、こう言える必要がある。

```text
まず観測する必要がある。
```

「失敗しているテストを直す」なら、第一ターンの妥当な判断は「原因は X です」ではなく、むしろ次のようなものになる。

```text
プロジェクト構成とテストコマンドを確認する必要がある。
```

そこでモデルは、たとえば次のような action intent を提案する。

```json
{
  "tool": "read_file",
  "input": {
    "path": "package.json"
  }
}
```

ここで主役が変わっている。

単発 ChatBot の主役は最終テキストだ。Agent Loop の主役は次の action である。

モデルは「どう直すか」の答えから始めない。「何を見る必要があるか」から始める。システムがその action を実行し、observation を得て、モデルに判断を続けさせる。

これが、回答から行動への第一歩だ。

## 二、Loop はより長い context ではなく状態機械である

![loop は無思考な while true ではなく、Ready、Thinking、Acting、Observing、Finished、Stopped を持つ状態機械である](assets/00-08-minimal-agent-loop/photo-02-state-machine-budget-stop.jpg)

多くの人は multi-step Agent を「履歴を全部モデルへ戻すもの」と捉える。

半分は正しい。

履歴を戻す必要はある。しかしより正確には、Agent Loop は状態機械である。

各ターンで、同じ種類の判断を行う必要がある。

```text
現在の state は何か？
このターンでモデルは何を見るべきか？
モデルは final を返したのか、tool intent を返したのか？
tool intent は妥当か？
実行結果はどうだったか？
その結果をどう observation にするか？
次のターンへ進むべきか？
予算、interrupt、stop に到達したか？
```

chat log は、これらを自然には答えられない。

chat log が答えるのは「これまで何を話したか」だ。状態機械が答えるべきなのは、「システムはいまどの実行段階にいて、次にどこへ遷移すべきか」である。

最小 Agent Loop は、まず四つの状態として描ける。

![最小 Agent Loop：単発回答から多段階の行動へ Mermaid 2](assets/00-08-minimal-agent-loop/mermaid-02.png)

この図は、よくある誤解をほどいている。

```text
Agent Loop は「モデルが話し続けること」ではない。
Agent Loop は「システムが複数の状態を制御された形で遷移すること」である。
```

なぜ状態機械として考える必要があるのか。

状態ごとに、許されることが違うからだ。

`Thinking` 状態では、システムはモデルを呼ぶが、外部副作用を直接発火させるべきではない。

`Acting` 状態では、システムは tool を実行するが、モデルに runtime の事実を勝手に書き換えさせるべきではない。

`Observing` 状態では、システムは tool result をモデルが読める observation に整理するが、すべての raw log を無差別に詰め込むべきではない。

`Finished` 状態では、システムは最終回答を出せるが、何を根拠に完了したのかも記録すべきである。

`Stopped` 状態では、システムはなぜ止まったのかを説明すべきであり、完了したふりをしてはいけない。

Agent Loop を状態機械として見ると、多くの工学的境界が自然に現れる。

たとえば次のようなものだ。

```text
tool call の失敗は、loop の崩壊とは別物である。
permission denied は、モデルが推測を続けるべきという意味ではない。
max turns 超過は、タスク成功を意味しない。
モデルが final と言っても、システムが必ず完了と信じるべきとは限らない。
```

これらは後続の Harness でさらに厚く扱うことになる。だが最小 Agent Loop の時点で、すでにインターフェースを残しておく必要がある。

## 三、最小 ReAct：Think、Act、Observe、Final

ここで ReAct に戻る。

用語に仕組みが埋もれないよう、まず英語の展開は忘れて四つの動作だけ覚えればよい。

```text
Think：モデルが現在の現場に基づいて次の一手を判断する。
Act：モデルが構造化された action intent を提案する。
Observe：システムが action を実行し、その結果をモデルから見える現場へ書き戻す。
Final：モデルがこれ以上行動する必要はないと判断し、最終結論を出す。
```

最小 ReAct loop は、モデルに長い「思考過程」を出させるためのものではない。ここでの `Think` は、システム状態における「判断フェーズ」に近い。モデルはテキストを返してもよいし、tool intent を返してもよい。重要なのは、外側の runtime がこの二種類の戻り値を識別し、それぞれ別の処理を行えることだ。

一回の loop は、次のような pipeline に圧縮できる。

![最小 Agent Loop：単発回答から多段階の行動へ Mermaid 3](assets/00-08-minimal-agent-loop/mermaid-03.png)

この図は、単なる `while loop` よりもいくつか多くの重要な動作を含んでいる。

1. `buildQuery(state)`：各ターンで context を組み直す。
2. `parseResponse()`：final と tool intent を区別する。
3. `validate intent`：モデルの提案を直接実行しない。
4. `make observation`：tool result を次ターンで使える事実に変える。
5. `check budgets`：loop はいつ止まるべきかを知る。

これらを取り除くと、残るのはこれだけだ。

```text
while true:
  ask model
  run whatever it says
```

それは Agent Loop ではなく、かなり危険なモデル遠隔操作装置である。

本当の最小 ReAct loop には、一つの規律が必要だ。

**モデルが次の一手を提案し、システムが制御下で次の一手を実行し、state が次の一手を記録し、停止条件が次の一手を制約する。**

この四つの責務は、どれも欠かせない。

## 四、失敗テスト修復で一周させる

この loop を小さな CLI Agent に戻してみる。

ユーザー入力はこうだ。

```text
このプロジェクトのテストがなぜ失敗しているか見て、修正して。
```

第一ターンの state には、たとえば次の情報しかない。

```text
user_goal: 失敗テストを修正する
messages: [ユーザーの元の依頼]
turn_count: 0
tool_results: []
budget: max_turns=8
```

モデルは第一ターンでいきなり答えを作るべきではない。より妥当なのは、次のような tool intent である。

```json
{
  "tool": "read_file",
  "input": {
    "path": "package.json"
  },
  "reason": "テストコマンドとプロジェクト種別を確認する必要がある"
}
```

システムは `read_file` を実行し、`package.json` を得る。しかし、それを端末に表示して終わりにしてはいけない。結果を observation に変える必要がある。

```text
Observation:
- read_file(package.json) は成功
- scripts.test = "vitest run"
- プロジェクトは pnpm を使っている
- 関連依存関係に vitest と typescript が含まれる
```

この observation が messages または state に書き戻されて初めて、第二ターンのモデルは次に何をすべきか分かる。

```json
{
  "tool": "run_command",
  "input": {
    "command": "pnpm test"
  },
  "reason": "失敗ログを再現する必要がある"
}
```

システムがテストを実行し、失敗ログを得る。

```text
Observation:
- pnpm test は exit code 1 で終了
- 失敗テスト：sum.test.ts
- エラー：expected 4, received 3
- 関連ファイルは src/sum.ts または tests/sum.test.ts の可能性がある
```

第三ターンで、モデルは observation に基づいてソースを読むべきだと判断する。

```json
{
  "tool": "read_file",
  "input": {
    "path": "src/sum.ts"
  },
  "reason": "失敗した assertion が sum の実装に関係している"
}
```

第四ターンで、モデルは edit intent を提案する。

第五ターンで、システムはテストを再実行する。

第六ターンで、モデルはテスト成功を見て final を返す。

```text
失敗していたテストを修正しました。問題は sum.ts の負数分岐の扱いにありました。
実装を調整し、pnpm test を再実行して全件通過を確認しました。
```

この経路で、モデルは各ターンで「急に賢く」なったわけではない。より多くの事実を見ただけだ。

Agent Loop の役割は、事実を戻してくることである。

より正確に言えば、こうだ。

```text
第一ターンは回答するためではなく、証拠を取りに行くためにある。
第二ターンはゼロから始めるのではなく、取った証拠に基づいて続く。
第三ターンは自由作文ではなく、observation によって絞り込まれる。
最後のターンは物語ではなく、検証結果に基づいて締める。
```

これが最小 Agent Loop のメンタルモデルである。

## 五、State：各ターンをゼロから始めない

この記事から実装オブジェクトを一つだけ覚えるなら、`state` を覚えてほしい。

最小 Agent Loop の核は `while` ではなく、各ターンで state をどう更新するかだからだ。

最小の state はかなり単純でよい。

```ts
type AgentState = {
  messages: Message[]
  turnCount: number
  maxTurns: number
  aborted: boolean
  lastObservation?: Observation
  toolResults: ToolResult[]
  finalAnswer?: string
}
```

これは最終的なコード構造の推奨ではない。最小責務を説明するための形である。

`messages` は、次ターンのモデルが見る必要のある会話と tool result を保持する。

`turnCount` は、loop が何ターン回ったかを記録する。

`maxTurns` は、無限ループを防ぐ硬い境界である。

`aborted` により、外部から安全に中断できる。

`lastObservation` は、前ターンで現実世界から返ってきた事実を保持する。

`toolResults` は、後から debug や audit するための記録を残す。

`finalAnswer` は、タスクが最終回答で終わったかどうかを示す。

ここで注意したいのは、すべてを messages に詰め込んでいないことだ。

これは重要な境界である。

```text
messages はモデルに見せる context。
state は runtime の事実。
session log は、より完全な event fact source。
```

最小実装の段階では、三者はかなり近いかもしれない。だが初日から、同じ概念ではないと知っておく必要がある。

そうしないと、後で必ず次の混乱にぶつかる。

```text
モデルに知らせるため、すべての tool log を messages に入れる。
タスクを復旧するため、messages から何が起きたかを逆算する。
context を圧縮するため、messages を要約する。
結果として session の事実源まで要約で失われる。
```

これは危険な道だ。

最小 Agent Loop は一時的に単純でよい。ただし境界を誤解してはいけない。

state の位置は、この図で覚えられる。

![最小 Agent Loop：単発回答から多段階の行動へ Mermaid 4](assets/00-08-minimal-agent-loop/mermaid-04.png)

この図は、後続章への道も少し先取りしている。

第 8 章では最小 loop だけを書くが、Context、Session Replay、Tool Runtime がどこから育つかはすでに見えている。

tool result が大きくなれば、`Context Projection` にはガバナンスが必要になる。

タスクを復旧したくなれば、`Session Log` は messages だけでは足りない。

tool が副作用を持ちはじめれば、`Intent` は検証と permission を通る必要がある。

ただし最小版では、まず一つだけ達成すればよい。

**各ターンの終了後、state は「次ターンがなぜこの形で始まるのか」を説明できなければならない。**

## 六、Act：まず fake tool で仕組みを検証する

第 8 章の成果物は最小 Agent Loop なので、最初から本物の file tool、本物の shell、本物の editor を接続したくなる。

しかし第一版では、fake tool または echo tool から始めることを勧めたい。

理由は手抜きではなく、リスクを分離するためだ。

最小 loop がまず検証すべきなのは、次の点である。

```text
モデルは構造化された tool intent を出せるか？
システムは final と tool intent を識別できるか？
tool intent は executor に受け渡されるか？
tool result は observation へ変換できるか？
observation は次ターンのモデル入力に入るか？
loop は final または予算枯渇で止まるか？
```

これらの仕組みは、「実際にファイルを読む」こととは別問題である。

第一版から本物のファイルシステムを接続すると、問題が起きたときに原因を切り分けにくい。

```text
モデルが schema 通りに出力しなかったのか？
tool parameter の parse が間違ったのか？
path permission が間違ったのか？
ファイル内容が長すぎたのか？
observation が書き戻されなかったのか？
停止条件が効かなかったのか？
```

fake tool の価値は、loop そのものを先に検証可能にすることだ。

たとえば、非常に退屈な `echo` tool を定義できる。

```text
tool: echo
input: { "text": "run tests" }
output: "echo: run tests"
```

あるいは、固定の応答を返す `fake_test` tool を定義してもよい。

```text
1 回目の呼び出し：テスト失敗を返す。エラーは sum.test.ts。
2 回目の呼び出し：テスト成功を返す。
```

そうすれば、本当にファイルを編集しなくても、loop が次のように進むか検証できる。

```text
user goal
-> モデルが fake_test を要求
-> システムが失敗 observation を返す
-> モデルが echo/read/edit のような模擬 action を要求
-> システムが action 完了 observation を返す
-> モデルが再び fake_test を要求
-> システムが成功 observation を返す
-> モデルが final を返す
```

この手順は、「Agent がもうプロジェクトを修正できる」と自分をごまかすためではない。

検証したいのは最小制御フローである。

```text
Act は本当に Observe を生むか？
Observe は本当に次の Think に影響するか？
Final は本当に loop を止めるか？
```

この仕組みが安定してから fake tool を本物の Tool Runtime に差し替えると、問題はずっと見えやすくなる。

最小 Agent の第一原則は「能力は多ければ多いほどよい」ではない。「新しい能力を足すたびに、それがどの状態遷移にぶら下がっているか分かる」ことだ。

## 七、Observe：tool result はログではなく次ターンの事実である

![raw tool result が observation、prompt context、event log へ変わる流れ](assets/00-08-minimal-agent-loop/photo-03-observation-feedback-pipeline.jpg)

多くの Agent demo にある二つ目の問題は、tool output をそのまま prompt に戻してしまうことだ。

たとえばテスト実行後、システムが長い stdout を受け取る。

```text
...数百行のログ...
FAIL tests/sum.test.ts
expected 4, received 3
...さらに stack trace...
```

最も粗い実装はこうなる。

```text
raw stdout をすべて messages に追記する。
```

短期的には動く。長期的には三つの問題が出る。

第一に、ログが長すぎて context がすぐ膨らむ。

第二に、モデルが無関係な出力に注意を奪われる。

第三に、システムが後から「この tool result は結局何を意味したのか」を判断しづらくなる。

だから最小 loop の段階でも、`Observation` という概念を導入しておくとよい。

Observation は raw log のコピーではない。「tool 実行結果をモデルが読める形にした要約 + 必要な証拠」である。

たとえば次のように設計できる。

```ts
type Observation = {
  toolName: string
  ok: boolean
  summary: string
  evidence?: string
  errorType?: string
  retryable?: boolean
}
```

テスト失敗なら、こうなる。

```text
toolName: run_command
ok: false
summary: pnpm test が失敗。失敗ケースは tests/sum.test.ts
evidence: expected 4, received 3
errorType: test_failure
retryable: true
```

これは、ログの塊よりずっと有用だ。

次ターンのモデルが本当に必要としているのは、次の事実だからだ。

```text
テストは実際に失敗した。
失敗箇所はどこか。
重要なエラーは何か。
この失敗は調査を続ける価値があるか。
```

もちろん、最小版で過剰設計する必要はない。Observation は最初は素朴でよい。ただし一つの意識は残しておく。

**Observe は tool output をモデルに投げることではない。現実世界を、次ターンの判断に必要な事実へ整理することである。**

tool result から observation への流れは、こう描ける。

![最小 Agent Loop：単発回答から多段階の行動へ Mermaid 5](assets/00-08-minimal-agent-loop/mermaid-05.png)

この図には二つの行き先がある。

```text
Observation は Prompt Context に入り、モデルの次の判断に使われる。
Observation は Event Log に入り、システムが後から復盤できる。
```

最小実装では、完全な Event Log をまだ作らなくてもよい。ただし observation を単なる prompt text として扱わないこと。将来それは trace、eval、replay の基盤になる。

## 八、停止条件：Loop は続けるべきでない時を知る必要がある

![final、maxTurns、budget、abort、invalid intent などの停止条件が loop を守る流れ](assets/00-08-minimal-agent-loop/photo-04-stop-conditions-decision-path.jpg)

Agent Loop で最も過小評価されやすいのが停止条件だ。

初めて loop を書くとき、多くの人はこう書く。

```text
モデルが tool call を返さなければ終了する。
```

これは確かに停止条件の一つだが、まったく足りない。

最小 Agent Loop でも、少なくとも五種類の停止が必要である。

```text
1. モデルが final を返す：タスクの自然終了。
2. 最大ターン数を超える：無限ループを防ぐ。
3. 予算を超える：token、時間、費用、tool call 回数が尽きる。
4. 外部中断：ユーザー取消または process abort。
5. 致命的エラー：tool unavailable、permission denied、schema の連続不正。
```

決定経路として描くと分かりやすい。

![最小 Agent Loop：単発回答から多段階の行動へ Mermaid 6](assets/00-08-minimal-agent-loop/mermaid-06.png)

この図が示すように、停止は成功終了だけではない。

専門的な Agent Loop は、少なくとも次を区別できる必要がある。

```text
完了：モデルが final を出し、必要な証拠も十分である。
取消：ユーザーまたはシステムが停止を要求した。
失敗：tool、permission、budget、model output により続行できない。
降格：上限到達後、現時点の既知事実と次の提案を出す。
```

「失敗テストを修正する」の例で、8 ターン回してもテストが通らないなら、システムは賭け続けるべきではない。

止まって、状況を明確に伝えるべきだ。

```text
完了したこと：
- package.json を読み、テストコマンドが pnpm test であると確認
- 失敗を再現し、失敗ケースが tests/sum.test.ts であると確認
- src/sum.ts を読み、一度修正を試行
- テストを再実行したが、まだ失敗している

停止理由：
- maxTurns=8 に到達

現時点で最も可能性の高い次の一手：
- tests/sum.test.ts のテスト意図を確認する
- または検索範囲を src/math/* まで広げる
```

これは完璧な結果ではないが、制御された結果である。

制御されていない Agent は、token が尽きるかユーザーの信頼が尽きるまで回り続ける。

制御された Agent は、自分の境界を認め、現場をユーザーに返す。

## 九、最小疑似コード：構文ではなく責務を見る

ここまで来れば、疑似コードを書ける。ただし、この疑似コードはこの記事の主役ではない。責務をつなげるためのものだ。

```ts
async function runAgent(userGoal: string, tools: ToolRegistry) {
  let state = initialState(userGoal)

  while (!state.aborted) {
    if (state.turnCount >= state.maxTurns) {
      return stopWithReason(state, "max_turns_exceeded")
    }

    const query = buildQueryFromState(state)
    const response = await model.generate(query)
    const decision = parseModelDecision(response)

    if (decision.type === "final") {
      return finish(state, decision.answer)
    }

    const validation = validateToolIntent(decision.toolIntent, tools)
    if (!validation.ok) {
      state = appendObservation(state, validation.asObservation())
      state.turnCount += 1
      continue
    }

    const result = await executeTool(validation.intent)
    const observation = makeObservation(result)

    state = appendObservation(state, observation)
    state = updateBudgets(state)
    state.turnCount += 1
  }

  return stopWithReason(state, "aborted")
}
```

このコードには、意図的にいくつかの境界線を残している。

`buildQueryFromState` は、モデル入力が state の projection から来ることを示す。場当たり的な文字列結合ではない。

`parseModelDecision` は、モデル出力をシステムオブジェクトとして解釈することを示す。テキストをそのまま実行しない。

`validateToolIntent` は、モデルの提案がまず protocol boundary を通ることを示す。

`executeTool` は、実行の責任がシステムにあり、モデルにはないことを示す。

`makeObservation` は、tool result を整理してから書き戻すことを示す。

`updateBudgets` は、各ターンでコストと境界を更新することを示す。

`stopWithReason` は、停止も結果であり、例外的に逃げるものではないことを示す。

最小 Agent Loop の疑似コードがこれらの責務を分けられていれば、tool が echo 一つしかなくても、多くの「かっこよく見える」demo より安定している。

## 十、Loop を tool チュートリアルにしない理由

この記事では、あえて `read_file`、`run_command`、`edit_file` の実装方法を中心に置かなかった。

それは Tool Runtime の主題だからだ。

第 8 章で答えるべきなのは、次の三つである。

```text
なぜ tool は呼ばれるのか？
呼び出し結果はどう次ターンへ入るのか？
loop はどう続行か停止かを決めるのか？
```

いま記事をコードチュートリアルにしてしまうと、読者は細部へ引っ張られやすい。

```text
ファイルはどう読むのか？
Windows path にはどう対応するのか？
subprocess stdout はどう捕まえるのか？
diff はどう書くのか？
```

どれも重要だが、Agent Loop の核心を覆い隠してしまう。

Loop の核心は状態遷移である。

```text
Think が Intent または Final を生む。
Intent が Tool Runtime に入る。
Tool Runtime が Result を生む。
Result が Observation に整理される。
Observation が State を変える。
State が次ターンの Context を生成する。
```

この経路が明確なら、後から tool がどれだけ複雑になっても、どこに接続すべきか分かる。

逆に loop の境界が曖昧なら、tool が増えるほど混乱する。

よく見るのは、次のようなコードの匂いだ。

```text
モデル出力に "npm test" が含まれていたらコマンドを実行する。
"read file" が含まれていたらファイルを読む。
tool が失敗したら error string を prompt に戻す。
モデルが DONE と言わなければ続ける。
```

これは最小 Agent Loop ではない。文字列の合言葉でつないだフローである。

demo はできるが、長持ちはしない。

## 十一、Loop によくある三つの悪い匂い

最小 loop を実装しやすくするため、早い段階から警戒したい悪い匂いを三つ挙げる。

### 1. Act だけがあり、Observe がない

システムは tool を実行できるが、次ターンのモデルが構造化結果を見られない。

症状として、モデルが同じファイルを何度も要求したり、同じコマンドを何度も実行したり、すでに分かっている事実を繰り返し尋ねたりする。

原因はたいてい次のどれかだ。

```text
tool result は UI に表示されるだけで、messages に入っていない。
tool result は messages に入るが、どの tool から来たか明確ではない。
tool result が長すぎて、肝心な事実が失われる形で切り詰められている。
```

修正は「モデルをもっと賢くする」ことではない。observation の書き戻しをきちんと作ることだ。

### 2. Continue だけがあり、Stop がない

システムは tool call を見れば続けるだけで、最大ターン数、予算、中断、失敗終了を持たない。

症状として、Agent が失敗テストに対して同じ修正を何度も試す、あるいは tool parameter がずっと不正なのにモデル修正を求め続ける。

原因は、loop が停止条件を一級の対象として扱っていないことだ。

最小版でも、次の場所は state に用意しておく。

```text
maxTurns
maxToolCalls
timeout
abort signal
invalidIntentLimit
```

最初から複雑に実装する必要はない。ただし state の中に居場所は必要である。

### 3. Messages だけがあり、State がない

システムがすべての事実を messages に詰め込み、独立した runtime state を持たない。

症状は debug の難しさとして現れる。何ターン目にどの tool を使ったのか、どの tool が失敗したのか、なぜ予算が尽きたのか、final が検証に基づいているのかが分からない。

原因は、「モデルに見せる context」と「システム自身の事実源」を混ぜていることだ。

最小版では state をメモリに置くだけでもよい。ただしフィールドは分ける。

```text
messages はモデルに見せる。
state は runtime が判断する。
event log は後から復盤する。
```

この三つを早く分けるほど、後が楽になる。

## 十二、最小 Loop から後続章へ

第 8 章は分水嶺である。

前の数章では、主にメンタルモデルを作ってきた。Agent は Prompt ではない。Agent には Model、Loop、Tools、State がある。Agent と ChatBot、Workflow、Harness には境界がある。

この章から、実際に「手書き Agent」の道へ入る。

ただし最小 Agent Loop は終点ではない。

これはシステムを一回の回答から多段階の行動へ進めるだけである。次の段階では、すぐに新しい問題が露出する。

### 1. Provider に Core を乗っ取らせない

最小 loop では `model.generate()` を呼ぶだけなので、単純に見える。

しかし本物の大規模モデルを接続すると、provider ごとに message schema、tool calling format、streaming event、error type が違う。

provider に loop を直接制御させると、core は provider の細部に汚染される。

だから後続では M0 Core Kernel が必要になる。provider は model event と tool intent だけを提供し、state、tool execution、stop condition はシステム側が握り続ける。

### 2. Intent と Execution は必ず分離する

この記事では何度も強調した。モデルが tool intent を出すことと、tool が実行済みであることは別である。

後続では、この規律をさらに厚くする。

```text
intent -> validate -> permission -> execute -> observe
```

これは Tool Runtime、Permission、Audit、Replay の基礎になる。

### 3. Context は膨らみ始める

loop が動き出すと、messages は長くなる。

ファイルを読む、テストを走らせる、コードを検索する。どれも tool result を増やしていく。

最小版では単純に追記してよいが、すぐに Context Policy が必要になる。

```text
どの observation をモデルに入れるのか？
どれを event log だけに残すのか？
長いログをどう切り詰めるのか？
古い履歴をどう圧縮するのか？
現在のタスク現場をどう途切れさせないのか？
```

### 4. Verification は完了基準になる

モデルが final を返しても、タスクが本当に完了したとは限らない。

「失敗テストを修正する」タスクで最も信頼できる完了証拠は、次である。

```text
対象テストを再実行し、通過した。
```

だから後続では Verification が必要になる。システムは「直した」というモデルの言葉を聞くだけではなく、検証証拠を記録する。

### 5. Harness はより長いライフサイクルを受け止める

最小 loop は一つの process の中で完走できる。

しかし現実のタスクは、中断され、再開され、委任され、監査され、replay され、評価される。

これらはモデル自身では扱えない。

Agent Loop は心拍である。

Harness は、その心拍を現実環境で長期に安定して動かすための外部制御システムである。

## 十三、この章の工学的境界

最後に、最小 Agent Loop の境界を数文に圧縮する。

第一に、Loop はモデルに何ターンも話させるためのものではない。観測結果によって次の判断を変えるためのものだ。

第二に、最小 ReAct loop は少なくとも `Think / Act / Observe / Final` を含む。その中で最も過小評価されやすいのは `Observe` と停止条件である。

第三に、tool call は実行そのものではない。モデルは intent を提案し、システムが検証、実行、記録、書き戻しを担う。

第四に、state は chat log ではない。messages はモデルに見せる context、state は runtime の現場、event log はより完全な事実源である。

第五に、止まれる Agent は、ただ続けるだけの Agent より信頼できる。

この章を一文で覚えるなら、こうなる。

> Agent Loop の本質は、モデルに回答の続きを無限に書かせることではない。制御された状態機械の中で、実際の観測によって次の一手を繰り返し修正させることである。

次章では、この線に沿ってさらに進む。本物の大規模モデルをシステムに接続したとき、core はどう制御権を保つべきか。つまり、モデルを loop に接続するのであって、モデルに loop を乗っ取らせない方法を扱う。

## 教学 Harness への落とし込み

この章の実装上の着地点は `runAgentLoop()` です。入力は `systemPrompt`、`messages`、`tools`、`model`、`toolRegistry`、出力はその run で増えた `newMessages` と `events` だけです。loop は HTTP、React、session file を知るべきではありません。`maxTurns` の範囲で `assistant -> toolResult -> assistant` の state transition を行い、重要な地点で event を emit します。

---

GitHub ソース: [00-08-minimal-agent-loop.md](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-08-minimal-agent-loop.md)
