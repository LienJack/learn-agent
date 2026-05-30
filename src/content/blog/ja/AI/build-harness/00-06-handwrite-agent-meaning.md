---
title: "Agent を手書きする意味：フレームワーク抽象の背後にある最小メカニズムを理解する"
description: "ここまでの 5 本では、Agent を「魔法のようなモデル能力」から「説明可能な実行システム」へ引き戻してきた。"
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/00-06-handwrite-agent-meaning/cover.png'
locale: "ja"
tags:
  - Agent
  - Harness
  - Agent Loop
  - Agent Framework
  - 技術チュートリアル
aliases:
  - なぜ Agent を手書きするのか
  - フレームワーク抽象の背後にある最小メカニズム
  - 最小 Agent を手書きする
---

# Agent を手書きする意味：フレームワーク抽象の背後にある最小メカニズムを理解する

ここまでの 5 本では、Agent を「魔法のようなモデル能力」から「説明可能な実行システム」へ引き戻す、ということを続けてきた。

ここまでで、いくつかの基本的な判断軸が見えている。

```text
Agent は、ただ長い Prompt ではない。
Agent は少なくとも Model、Loop、Tools、State から成る。
ChatBot、Workflow、Agent、Harness は能力の階層ではなく、境界の選び方である。
Harness はモデルの外側にある制御システムである。
Agent は Chat -> Tool -> Runtime -> Managed という圧力の経路に沿って Harness を育てていく。
```

これらが成り立つなら、次に自然に出てくる問いはこうだ。

**LangGraph、CrewAI、ADK、さまざまな Agent SDK がすでにあるのに、なぜわざわざ一度手で書く必要があるのか。**

これはとても現実的な問いだ。

目的が素早く demo を作ることだけなら、もちろんフレームワークを使うほうが速い。フレームワークは、node、edge、tool binding、memory interface、state graph、multi-Agent orchestration、可視化 trace、deployment entry point まで用意してくれる。`while` loop から始める必要も、自分で `ToolIntent` を定義する必要も、message history や tool result の書き戻しを手で実装する必要もない。

だからこの記事は、「フレームワークを使うな」と説得するためのものではない。

むしろ逆だ。成熟したプロジェクトでは、最終的にはフレームワーク、プラットフォーム、既存 runtime に反復的なエンジニアリング作業を任せるべきことが多い。問題はここにある。

```text
最小メカニズムを自分で書いたことがないと、
フレームワークが省いてくれているのが反復作業なのか、
それとも重要な境界を隠しているのかを判断しにくい。
```

これが Agent を手で書く本当の意味だ。

それはフレームワークを置き換えるためでも、「ゼロから車輪を作るほうが純粋だ」と証明するためでもない。目的は、次のようなエンジニアリング判断力を得ることにある。

```text
いつなら安心してフレームワークを使えるのか。
いつならフレームワークのデフォルト抽象を迂回すべきなのか。
いつならフレームワークの上に自分の Harness 層を拡張すべきなのか。
いつなら問題はフレームワークではなく、そもそも底層メカニズムをモデル化できていないことなのか。
```

引き続き、同じ通し例を使う。

```text
このプロジェクトのテストがなぜ失敗しているのか見て、修正してほしい。
```

今回はいきなり完全なコードを書くのではなく、もっと手前にある問いに先に答える。

> Agent フレームワークを読み解くために、最低限どのメカニズムを自分の手で実装すべきなのか。

## 問題の連鎖

![フレームワーク抽象、底層メカニズム、エンジニアリング判断の関係を説明する：フレームワークは素早い開始を助け、最小メカニズムの手書きは境界を見えるようにする](assets/00-06-handwrite-agent-meaning/photo-01-framework-mechanism-judgement.png)

まず、この文章の問題の連鎖を固定しておく。

```text
フレームワークを直接使えば素早く始められる
-> しかしフレームワークは loop、tool、state、context、permission を抽象の内側に隠す
-> demo が順調なとき、その抽象は心地よい
-> だが tool の暴走、context の爆発、permission 承認、eval 回帰にぶつかると
-> 底層で実際に何が起きているかを知る必要がある
-> 最小 Agent を手で書くのは、その抽象境界を見えるようにするためである
-> 境界が見えて初めて、いつフレームワークを使い、迂回し、拡張するかを判断できる
```

この連鎖でいちばん重要なのは、最後の 2 行だ。

手で書くこと自体が目的ではない。目的は判断力だ。

まず図で関係を描く。

![Agent を手書きする意味：フレームワーク抽象の背後にある最小メカニズム Mermaid 1](assets/00-06-handwrite-agent-meaning/mermaid-01.png)

フレームワークが最も得意なのは、よくある経路を短くすることだ。

最小システムを手で書くことが最も得意なのは、隠れている境界を浮かび上がらせることだ。

この 2 つの目標は矛盾しない。本当に危ないのは、この 2 つを次の一文に混ぜてしまうことだ。

```text
フレームワークがすでに包んでくれているのだから、底層を理解しなくてよい。
```

普通の CRUD フレームワークでは、この言い方が成り立つ場面もある。データベース接続プールの内部を知らなくても、ORM で業務機能を書くことはできる。しかし Agent システムでは、底層メカニズムが頻繁に業務面へせり出してくる。モデル出力は決定的なプログラムではなく、tool 実行は外部世界を変え、context は毎ラウンド変化し、permission と evaluation はプロダクトリスクに直結するからだ。

だから Agent フレームワークは魔法の箱ではないし、Harness のすべてでもない。

それは、不確実性を整理するためのエンジニアリング文法に近い。

文法は速く書く助けにはなる。しかし、どの不確実性をモデルに渡し、どの不確実性をコード、ポリシー、テスト、Harness に引き戻すべきかまでは決めてくれない。フレームワークは Harness の一部能力を提供するかもしれないが、境界選択を自動的に完了してくれるわけではない。

## 1. フレームワークを直接使うと何が解決されるのか

まずは公平に見よう。

フレームワークに価値があるのは、Agent システムには実際に大量の反復作業があるからだ。

ゼロから CLI Agent を作ると、たとえ最小版でも、すぐに次の作業にぶつかる。

```text
モデル API をラップする
messages を維持する
loop を実装する
tool schema を定義する
tool call を解析する
tool を実行する
結果をモデルへ書き戻す
streaming output を扱う
error retry を扱う
state を記録する
最大ラウンド数を制限する
一部の action の前にユーザー確認を求める
```

これらはかなり細かく、面倒な作業だ。

フレームワークは多くの boilerplate を省いてくれる。

たとえば、最小の「テスト修正」Agent をフレームワーク上で書くなら、おそらく次のように考える。

```text
Agent を作る
read_file / grep / bash / edit tool を登録する
task を渡す
loop と tool call はフレームワークに任せる
最終回答を受け取る
```

これは自然な考え方だ。

フレームワークは多くの低レベル詳細から解放してくれるので、まず「タスクが通るか」に集中できる。チームの初期探索では、これはとても重要だ。最初からタスク境界がどこにあるか分かるとは限らないし、ユーザーが本当に何を求めているかも分からないからだ。

一度きりの内部 demo を作るなら、たとえば次のようなものだ。

```text
issue を入力する
Agent にいくつかのファイルを読ませる
修正案を生成する
```

この場合、フレームワークはとても適しているかもしれない。

固定されたリサーチパイプラインを作る場合も同じだ。

```text
資料を検索する
要約する
クロスチェックする
レポートを生成する
```

フレームワークは orchestration の作業をかなり省ける。

複数ステップの業務自動化でも同じだ。

```text
CRM を読む
メールを生成する
承認を待つ
送信する
ログを記録する
```

フレームワーク内の graph、node、edge、tool、checkpoint といった抽象は有用だ。

だから問いは「フレームワークに価値があるか」ではない。

問いはこうだ。

**フレームワークのおかげで素早く動き始めたあと、それがあなたの代わりにどんな判断をしたのかをまだ見えているか。**

その判断には、たとえば次が含まれる。

```text
各ラウンドでモデルはどの messages を見るのか。
tool schema はどのようにモデルへ公開されるのか。
tool result はそのまま書き戻されるのか、要約されるのか。
tool failure は 1 つの observation として扱われるのか。
同じ tool を連続で呼べるのか。
context が長くなりすぎたとき、どう圧縮されるのか。
final answer の判断は誰が担当するのか。
permission は呼び出し前に止めるのか、実行時に止めるのか。
trace は各ステップを復元できるのか。
eval が失敗したとき、原因を帰属できるのか。
```

これらの判断が見えないなら、フレームワークは tool から black box に変わる。

black box は順風の経路では快適だ。

しかし Agent システムの問題は、たいてい逆風の経路で起きる。

## 2. 順調な demo と本物のタスクの間にある 4 つの落とし穴

引き続き「失敗しているテストを直す」CLI Agent を例にする。

順調な demo は、たいてい次のように見える。

```text
ユーザー：テストを直して
Agent：package.json を読む
Agent：npm test を実行する
Agent：失敗したファイルを読む
Agent：コードを変更する
Agent：もう一度テストを実行する
Agent：テストが通ったので完了
```

この流れは、一見すると信頼できるシステムのように見える。

しかし実際のプロジェクトで最初に起きる失敗は、「モデルがコードを書けない」ではなく、もっとエンジニアリング寄りの問題であることが多い。

### 1. Tool の暴走：モデルが「呼べる」を「呼ぶべき」と解釈する

モデルに多くの tool を渡すと、モデルは tool 空間を行動空間として扱い始める。

それ自体は間違っていない。Agent の価値は、モデルが現場に応じて tool を選べることにある。

問題は、tool 空間に境界がないと、モデルがいくつかの暴走行動を起こしやすいことだ。

```text
同じファイルを何度も読む
検索範囲が広すぎる
重いコマンドを実行する
証拠がないままファイルを編集する
bash を万能 tool として扱う
専用 tool を迂回して危険な shell を実行する
```

たとえばテストコマンドを探すために、次の操作を連続で行うことがある。

```text
read_file(package.json)
grep("test")
bash("find . -name package.json")
bash("cat package.json")
read_file(package.json)
```

最終結果だけを見ると、それでもテストコマンドを見つけたように見えるかもしれない。

しかしシステムの視点では、この軌跡にはにおいがある。

これは、Agent が「自分は何をすでに読んだか」を安定して記録していないか、context がその事実をモデルに投影できていないか、あるいは tool menu が広すぎて、モデルが単純なタスクを探索的行動に変えてしまったことを示している。

最終回答だけを見るなら、問題ないように見える。

trace を見るなら、Harness から漏れているものがあると分かる。

### 2. Context 爆発：Tool 結果が推論より速く窓を埋める

テスト修正では大量の context が発生する。

```text
プロジェクト構造
package.json
テスト失敗ログ
関連するソースコード
テストファイル
過去の変更 diff
再実行したテストの出力
エラースタック
```

フレームワークのデフォルトが、すべての tool result をそのまま messages に詰め戻す方式なら、短いタスクでは耐えられても、長いタスクではすぐに崩れる。

次のラウンドでモデルが見るのは、混ざり合った大量の材料になる。

```text
古いエラーログ
新しいエラーログ
切り詰められた検索結果
すでに関係なくなったファイル断片
モデル自身が前ラウンドで書いた長い説明
tool が返した重複内容
```

このときモデルが「賢くない」のではない。現場が汚染されているのだ。

モデルは今本当に直すべき failure を忘れるかもしれないし、古いログにもとづいて、すでに直した問題をさらに変更し続けるかもしれない。

context 爆発は単なる token 問題ではない。

本質的には「現場管理」の問題だ。

```text
現在のタスクにまだ必要な事実はどれか。
どの observation はすでに古くなったのか。
どの結果は state に圧縮すべきなのか。
どの生の証拠は session log に残すべきなのか。
どの内容は UI にだけ表示し、モデル入力には入れるべきでないのか。
```

最小の context builder を手で書いたことがないと、すべての問題を次の一言に還元しがちだ。

```text
モデルの context が足りない。
```

しかし Agent では、context は大きければよいとは限らない。

混乱した大きな context は、明晰な小さな context より危険なことが多い。

### 3. Permission 承認：たくさん聞けば安全になるわけではない

多くの人は、初めて permission を追加するとき、それをポップアップにする。

```text
Agent が npm test を実行しようとしています。許可しますか？
Agent が src/foo.ts を読もうとしています。許可しますか？
Agent が src/foo.ts を編集しようとしています。許可しますか？
Agent が npm test を実行しようとしています。許可しますか？
```

これはまったく承認しないよりは安全だ。しかしすぐに別の問題になる。

ユーザーは疲れる。

ユーザーが疲れると、すべてに「許可」を押すようになる。

その時点で承認システムは、見た目として存在していても実質的には失効している。

さらに悪いことに、システムがリスクレベルを区別していない場合、ファイル読み取り、テスト実行、ファイル書き込み、削除、ネットワークアクセスがすべて同じ確認体験になる。するとユーザーは、どの action が本当に危険なのか判断できない。

だから permission system は「ポップアップを増やすこと」ではない。

少なくとも次に答える必要がある。

```text
この action は read-only、write、execute、network、credentials、delete のどれに属するのか。
現在の working directory 境界内にあるのか。
project rule によってすでに許可または拒否されているのか。
ユーザー確認が必要なのか。
確認時にどの証拠を表示すべきなのか。
ユーザーが拒否したあと、次のラウンドでモデルにどんな observation を見せるべきなのか。
```

フレームワークが提供する permission 抽象が `confirmToolCall()` だけなら、それで十分な場合と、自分の policy layer へ拡張すべき場合を判断できなければならない。

これが最小の permission gate を手で書く意味だ。

将来ずっと自分で承認 UI を書くためではない。

承認が runtime 経路のどこに掛かるべきかを知るためだ。

### 4. Eval 回帰：最終回答が正しいことは、Harness が壊れていないことを意味しない

Agent の evaluation は薄く作られがちだ。

多くのチームはまず、次のようなテストを書く。

```text
失敗するプロジェクトを入力する
最終出力に「テストが通った」が含まれることを期待する
```

これはもちろん有用だが、まったく十分ではない。

同じ最終結果でも、過程はまったく違う可能性があるからだ。

```text
経路 A：ログを読む -> ファイルを特定する -> 小さく変更する -> テストを実行する -> 通る
経路 B：リポジトリ全体を検索する -> 大量の無関係なファイルを読む -> 推測で変更する -> たまたまテストが通る
経路 C：テストを飛ばす -> 直接完了したと主張する
経路 D：危険なコマンドを実行する -> 変更すべきでないファイルを変更する -> 結果として通る
```

evaluation が最終回答だけを見るなら、A、B、C、D はほとんど同じに見えるかもしれない。

しかし Harness の視点では、健全な軌跡は A だけだ。

だから成熟した evaluation は trajectory を見る。

```text
どの tool を使ったのか。
tool の順序は妥当だったのか。
必要な証拠を読んだのか。
権限を越えたのか。
重複した無効行動があったのか。
結果を検証したのか。
失敗時に、model、tool、context、permission、environment のどこに原因を帰属できるのか。
```

フレームワークは trace を提供するかもしれない。

しかしその trace がこれらの問いに答えられるかは、記録している event の粒度に依存する。

自分で event stream を一度設計したことがないと、「ログがある」ことを「評価可能である」ことと勘違いしやすい。

実際には違う。

ログは原材料であり、evaluation には帰属可能な event object が必要だ。

## 3. 最小 Agent を手で書くことは、完全なフレームワークを書くことではない

![最小 CLI Agent を手で書いたときの閉ループを描き、モデル意図、権限ポリシー、tool 実行、observation の書き戻し、state 更新を強調する](assets/00-06-handwrite-agent-meaning/photo-02-minimal-cli-agent-loop.png)

ここまで来ると、別の極端に振れやすい。

```text
フレームワークが境界を隠すなら、ゼロから完全な Agent フレームワークを実装すべきなのか。
```

その必要はない。

少なくとも学習段階では、最小 Agent を手で書く目的は完全性ではなく、可視化だ。

手で書くべきなのは、隠されると判断力に影響する最小メカニズムである。

「テスト失敗を直す」CLI Agent なら、最初の最小システムはかなり小さくできる。

```text
モデル呼び出しインターフェース
while loop
tool registry
3 つの tool：read_file、grep、run_command
messages list
event log
最大ラウンド数
簡単な permission gate
final 判定
```

最初は実際の編集をサポートしなくてもよい。

まず Agent に次をできるようにする。

```text
package.json を読む
テストコマンドを実行する
失敗ログで言及されたファイルを読む
修正案を出す
```

次のステップで `edit_file` を追加する。

さらに次のステップで diff、approval、再テスト、context 圧縮を追加する。

最小システムを手で書く価値は、層を 1 つ足すたびに、前の層ではなぜ足りないのかを自分の目で見られることにある。

たとえば event log がないと、debug は最終 messages を print することに頼るしかないと分かる。

event log を追加すると、自然に次を区別するようになる。

```text
モデルが何を言ったのか
tool が実際に何を実行したのか
tool が何を返したのか
次のラウンドでモデルが何を見たのか
```

tool schema がないと、モデルの自然言語を信頼できる形で parse するのが難しいと分かる。

schema を追加すると、自然にこう理解する。

```text
tool call は tool 実行ではなく、tool intent にすぎない。
```

permission gate がないと、モデルが shell を実行できる時点で、すべてのリスクを prompt に押し込まなければならないと分かる。

permission gate を追加すると、自然にこう理解する。

```text
安全性はモデルの自律ではなく、runtime constraint である。
```

context builder がないと、messages はすぐにゴミ山になると分かる。

context builder を追加すると、自然にこう理解する。

```text
context は履歴記録ではなく、このラウンドの投影である。
```

これが「手で書く」ことの境界だ。

すべてを production grade に書き切るためではない。いくつかの荷重がかかる点を、自分の手で触るためである。

## 4. 最小メカニズム 1：モデル出力を action ではなく intent として扱う

1 つだけ手で書けるとしたら、私はまずこれを書く。

```text
モデルは tool intent を出力し、システムが tool action を実行する。
```

これは Agent engineering の最初の境界線だ。

最小 CLI Agent では、モデルは次のように出力できる。

```json
{
  "type": "tool_intent",
  "tool": "run_command",
  "args": {
    "cmd": "npm test"
  }
}
```

しかしこれは、`npm test` がすでに実行されたことを意味しない。

実際に実行する前に、システムは少なくとも次を行う必要がある。

```text
tool が存在するか確認する
args が schema に合っているか検証する
command が許可されているか判断する
working directory と timeout を決める
command を実行する
stdout / stderr / exit code を記録する
結果を observation に整形する
```

この経路は次のように描ける。

![Agent を手書きする意味：フレームワーク抽象の背後にある最小メカニズム Mermaid 2](assets/00-06-handwrite-agent-meaning/mermaid-02.png)

この図が頭に入ると、フレームワークを見る目はまったく変わる。

次のように問うようになる。

```text
フレームワーク内の tool call object はどこにあるのか。
validation はフレームワークが行うのか、自分が行うのか。
permission hook は実行前にあるのか、実行後にあるのか。
tool result の raw value と、モデルに渡す observation は分かれているのか。
失敗結果は state に入るのか。
```

これらの問いは、システムが安全に実プロジェクトへ入れるかどうかを決める。

最小の型設計は次のようになる。

```ts
type ToolIntent = {
  type: "tool_intent";
  id: string;
  tool: string;
  args: unknown;
};

type PolicyDecision =
  | { type: "allow"; reason: string }
  | { type: "ask"; prompt: string }
  | { type: "deny"; reason: string };

type Observation = {
  intentId: string;
  ok: boolean;
  summary: string;
  data?: unknown;
  truncated?: boolean;
};
```

ここで、モデル出力、permission decision、tool result を 1 つの object に混ぜていない点に注意してほしい。

これは型の潔癖さではない。

失敗を帰属できるようにするためだ。

`npm test` が実行されなかった場合、理由は次のどれかかもしれない。

```text
モデルがテスト実行 intent を出さなかった
モデルが間違った command を提案した
引数 validation に失敗した
permission が拒否した
command が timeout した
テスト自体が失敗した
結果が truncation され、モデルが誤読した
```

これらの失敗は、修正方向がまったく違う。

object を分けて初めて、帰属先が生まれる。

## 5. 最小メカニズム 2：Loop は `while true` ではなく state machine である

多くのチュートリアルは Agent Loop を次のように書く。

```ts
while (true) {
  const response = await model(messages);
  if (response.final) break;
  const result = await runTool(response.tool);
  messages.push(result);
}
```

このコードは中心的な直感を表しているが、現実の境界までは表せない。

テストを直せる CLI Agent の loop は、少なくとも次を知る必要がある。

```text
現在が何ラウンド目か
すでに中断されたか
budget がどれだけ残っているか
前ラウンドでどの tool を使ったか
失敗が繰り返されているか
context 圧縮が必要か
すでに検証証拠があるか
```

そうでないと、失敗経路で簡単に空回りする。

たとえばテストが失敗し続けているのに、モデルが毎ラウンドこう言うとする。

```text
もう一度 npm test を実行して確認します。
```

loop state がなければ、システムはそのまま従うしかない。

loop state があれば、システムは次を検知できる。

```text
同じ command が 3 回連続で失敗している
その間にコード変更はない
次のラウンドで同じ command を続けるべきではない
この observation をモデルに返すべきである
```

だから最小 loop は単なる繰り返し構造ではなく、状態遷移であるべきだ。

![Agent を手書きする意味：フレームワーク抽象の背後にある最小メカニズム Mermaid 3](assets/00-06-handwrite-agent-meaning/mermaid-03.png)

この図の各 node は、最初はとても単純でよい。

最初の `CheckBudget` は最大ラウンド数だけでよい。

最初の `Compact` は何もしなくてもよい。「圧縮が必要だが未実装」と記録するだけでよい。

最初の `Permission` は、`read_file` は許可、`run_command` は確認、`edit_file` は禁止、というだけでもよい。

重要なのは、一度にすべてを書き切ることではない。

重要なのは、初日からこれらの state が存在すると認めることだ。

フレームワークを使う場合も同じだ。

すべての state を自分で管理する必要はない。しかし、フレームワークの state machine がどこにあり、重要な node に hook できるかは知っておく必要がある。

フレームワークが「Agent を実行して結果を受け取る」interface しか公開せず、loop 内部を観察させてくれないなら、それは demo には向いていても、高リスクなエンジニアリングタスクを担うには向かないかもしれない。

## 6. 最小メカニズム 3：Tools は関数リストではなく protocol boundary である

最小 Agent demo では、tool はたいてい次のように書かれる。

```ts
const tools = {
  read_file: async ({ path }) => fs.readFile(path, "utf8"),
  run_command: async ({ cmd }) => exec(cmd),
};
```

もちろん、これは動く。

しかし tool の最も重要な部分が省略されている。

tool は単なる関数ではない。tool は、モデルの行動が現実世界に入る前の protocol boundary である。

tool は少なくとも次を説明する必要がある。

```text
name：モデルがそれをどう参照するか
description：モデルがいつ使うべきか
schema：引数構造は何か
risk：read、write、execute、network、delete のどれか
visibility：このラウンドでモデルに見せるか
permission：呼び出し前に承認が必要か
execute：どう実行するか
serialize：結果をどう observation に変換するか
```

これらが明示されていない場合、消えるわけではない。prompt、業務コード、フレームワークの default value に散らばるだけだ。

たとえば `run_command`。

それが単なる関数なら、モデルはあらゆることをそれに任せようとするかもしれない。

```text
cat package.json
grep -R "foo" .
python - <<EOF ...
sed -i ...
rm ...
curl ...
```

システムは、それぞれの shell call の意味を把握しにくい。

しかし同時に専用 tool を提供するなら、話は変わる。

```text
read_file
search_text
run_test
edit_file
```

さらに `run_command` の visibility と permission を制限すれば、モデルはより制御しやすい行動空間へ誘導される。

これが tool design の要点だ。

```text
tool menu は強ければ強いほどよいのではなく、タスクの意味に近いほどよい。
```

「テストを直す」タスクでは、万能の `bash` より `run_test` を優先的に公開するほうがよいことが多い。

`run_test` なら自然に次を記録できるからだ。

```text
テスト command
exit code
失敗したテスト名
ログ truncation の状態
実行時間
検証証拠が生成されたか
```

一方、`bash("npm test")` は command と大量の stdout にすぎない。

どちらもテストは実行できる。

しかし前者のほうが Harness に入りやすい。

これはフレームワーク抽象で見落とされがちな点だ。tool は「能力が多いほどよい」のではなく、「semantic boundary が明確なほどよい」。

## 7. 最小メカニズム 4：State、Context、Memory、Session を messages に混ぜない

Agent を手で書くとき、いちばん手を抜きやすい場所は messages だ。

最初は何でもそこに入れてしまう。

```text
ユーザー入力
モデル回答
tool call
tool result
error
ファイル内容
テストログ
圧縮 summary
plan
```

これは便利だ。

しかしすぐに、messages があまりに多くの責務を同時に担っていることに気づく。

```text
モデルに見せる context
debug log
event の fact source
state storage
UI transcript
evaluation input
```

これは問題を起こす。

なぜなら、それぞれの要求が違うからだ。

```text
Session log は、起きたことをできるだけ忠実に記録すべきである。
State は、現在のタスク現場を表すべきである。
Context は、このラウンドでモデルが見るべきものを選ぶべきである。
Memory は、タスクをまたいで再利用可能な経験を保存すべきである。
UI transcript は、人間が読みやすいべきである。
Eval trace は、機械が帰属しやすいべきである。
```

すべてを messages に詰め込むと、同時には満たせない目標を背負うことになる。

```text
完全であり、短くもある。
人間向けであり、モデル向けでもある。
生の証拠を残し、要約にも圧縮する。
復元可能であり、いつでも切り捨て可能でもある。
```

より安定した分け方はこうだ。

![Agent を手書きする意味：フレームワーク抽象の背後にある最小メカニズム Mermaid 4](assets/00-06-handwrite-agent-meaning/mermaid-04.png)

最初の版からここまで完全である必要はない。

しかし少なくとも、頭の中では次を分けておくべきだ。

```text
messages は fact source ではない。
messages はこのラウンドでモデルに渡す projection である。
```

例を挙げよう。

tool が `npm test` を実行し、2000 行のログを返したとする。

Session event log は、raw output のファイルパス、exit code、truncation policy、summary、duration を記録できる。

State は次を記録できる。

```text
現在テストが失敗している
失敗したテスト名は should parse empty input
error は expected [] to equal null
関連ファイルは parser.ts の可能性がある
```

Context builder はモデルに次だけを渡せる。

```text
テスト command は失敗し、失敗 case は should parse empty input。
重要な error：expected [] to equal null。
完全なログは保存済みで、現在は関連 snippet だけを表示している。
```

UI は、より読みやすい折りたたみログを表示できる。

Eval trace は、この検証失敗が「テスト実行は成功したが assertion が失敗した」ことを記録できる。

同じ tool result でも、層ごとに形が違う。

これを一度手で書いておくと、後でどんなフレームワークの memory / state / checkpoint / context API を見ても、何を問うべきか分かる。

統一された `messages` parameter にごまかされなくなる。

## 8. 最小メカニズム 5：Evaluation は最終回答ではなく、失敗帰属である

Agent を手で書くうえで最後に必要なメカニズムは、最小 evaluation だ。

ここでいう evaluation は複雑な benchmark ではない。

最初の版では、次に答えられればよい。

```text
この Agent はなぜ失敗したのか。
```

たとえば 3 つの小さなローカルプロジェクトを用意する。

```text
case-1：テスト command の依存が足りない。Agent はまず environment 問題を報告すべき。
case-2：明確な assertion failure がある。Agent は source を読んで小さな修正を提案すべき。
case-3：テストログが非常に長い。Agent は truncation し、重要な error を残すべき。
```

そして各 run の trajectory を記録する。

最終回答だけでなく、次の事実を見る。

```text
テストを実行したか。
package.json を読んだか。
失敗ログが指すファイルを読んだか。
変更前に十分な証拠を集めたか。
変更後に再検証したか。
意味のない command を繰り返したか。
scope 外の無関係な directory にアクセスしたか。
```

この種の evaluation は、trace を明確に設計するよう強制する。

trace に `ToolStarted`、`ToolFinished`、`PolicyDecision`、`Observation`、`VerificationEvidence` がなければ、これらの問いに答えられないからだ。

だから最小 eval は余計な作業ではない。

それは逆に Harness を形作る。

閉ループとして理解できる。

![Agent を手書きする意味：フレームワーク抽象の背後にある最小メカニズム Mermaid 5](assets/00-06-handwrite-agent-meaning/mermaid-05.png)

この図は、「モデルを固定し、Harness だけを変える」ことで Agent の性能が大きく上がる場合がある理由も説明している。

多くの失敗はモデル能力の問題ではなく、システムが現場を間違ってモデルに渡している、tool boundary が広すぎる、結果の書き戻しが乱雑すぎる、verification gate が薄すぎる、といった問題だからだ。

trace と帰属がなければ、反射的にモデルを替えたくなる。

trace と帰属があれば、本当に直すべきものが次だと分かるかもしれない。

```text
run_command の output truncation policy
read_file の cached projection
重複 tool call に対する guardrail
edit_file 前の diff approval
final answer 前の verification gate
```

これが最小 eval を手で書く価値だ。

すべての問題をモデルのせいにしなくなる。

## 9. フレームワークを見るときは、何を抽象化し、何を公開しているかを見る

これらの最小メカニズムを持ったうえでフレームワークに戻ると、より落ち着いて見られる。

次のような問いだけでは終わらない。

```text
このフレームワークは tool calling をサポートしているか。
このフレームワークは memory をサポートしているか。
このフレームワークは multi-agent をサポートしているか。
```

もっと細かく問うようになる。

```text
loop は誰が制御しているのか。
各ラウンドの model input に介入できるか。
tool intent と execution result は分離されているか。
tool visibility と execution permission は分離されているか。
context compaction はいつ起きるのか。
checkpoint が保存するのは messages か、event log か。
trace は trajectory level の evaluation を支えられるか。
human approval は callback なのか、完全な policy layer なのか。
sub-agent は permission と budget を継承するのか。
```

これらの問いこそ、フレームワークが本物のタスクを受け止められるかを決める。

たとえば graph フレームワークは、決定的な flow を表すのに向いている。

```text
run tests -> if fail -> inspect -> patch -> verify
```

しかし各 node の内部がさらに自由な Agent であるなら、tool permission、context feedback、stop condition はやはり管理しなければならない。

別の例として、multi-agent フレームワークでは複数の role を簡単に作れる。

```text
planner
coder
reviewer
tester
```

しかし session log、artifact、permission inheritance、return format、failure attribution がなければ、multi-Agent は不確実性をより多くの場所へ分散するだけだ。

さらに、memory フレームワークが long-term memory interface を提供している場合でも、次を問う必要がある。

```text
どんな内容を memory に書き込んでよいのか。
誰が書き込みを承認するのか。
memory には source と confidence があるのか。
expiration と conflict をどう扱うのか。
sensitive information が保存されないか。
```

これらは「フレームワークにその機能があるか」だけでは答えられない。

Harness の問題だからだ。

フレームワークは hook を提供できる。しかしエンジニアリング判断までは代わりに行えない。

## 10. いつフレームワークを使い、迂回し、拡張するのか

![フレームワークを直接使うべきとき、拡張すべきとき、局所的な抽象を迂回して自前の Harness 境界を作るべきときを decision path で説明する](assets/00-06-handwrite-agent-meaning/photo-03-framework-boundary-decision.png)

ここで冒頭の問いに戻れる。

フレームワークに反対しているわけでも、手書きを神格化しているわけでもないなら、どう選べばよいのか。

簡単な decision table を使える。

![Agent を手書きする意味：フレームワーク抽象の背後にある最小メカニズム Mermaid 6](assets/00-06-handwrite-agent-meaning/mermaid-06.png)

もう少し直接言う。

### フレームワークを直接使うのに向いている場面

タスクが次の条件に合うなら、フレームワークを直接使うのはたいてい合理的だ。

```text
flow boundary が明確
tool risk が低い
state lifecycle が短い
failure cost を許容できる
context scale が大きくない
複雑な permission が不要
evaluation は final artifact だけ見ればよい
```

たとえば内部 knowledge Q&A、軽量なリサーチ要約、固定 flow のレポート生成、低リスクなデータ整理。

この場合、底層メカニズムを手で書くことは、単に速度を落とすだけかもしれない。

### フレームワークを拡張するのに向いている場面

タスクが実際のエンジニアリング環境に触れ始めているが、フレームワークが十分な hook を公開しているなら、その上で拡張できる。

```text
custom tool permission
custom context projection
custom trace event
custom checkpoint
custom evaluation
custom human approval
```

たとえばチーム内部の code assistant、制限付きリポジトリの修復、小規模な自動開発タスク。

この場合、フレームワークは一般的な orchestration を担当し、あなたは Harness の重要な境界を担当する。

### 局所的な抽象を迂回するのに向いている場面

タスクが高リスク、長期実行、強い audit を必要とし、かつフレームワークの default abstraction が重要な control point を塞いでいるなら、局所的な抽象を迂回すべきだ。

注意したいのは、「局所的に迂回する」のであって、「全面的に書き直す」ことではない。

たとえば次のようにできる。

```text
フレームワークの tool result feedback が制御不能なら、自前の tool runtime を作る。
フレームワークの memory write が広すぎるなら、default memory を無効にする。
フレームワークの checkpoint が messages しか保存しないなら、自前の session event log を作る。
フレームワークの approval が薄すぎるなら、外側に policy harness を追加する。
```

この場合でも、フレームワークは model adapter、graph orchestration、UI、deployment に使える。

しかし core safety boundary と fact source は、自分の手元に置く必要がある。

### 完全に最小システムを手で書くのに向いている場面

学習段階、architecture validation 段階、framework selection 段階では、最小システムを完全に手で書くのが向いている。

本当に出力したいものは production framework ではなく、判断地図だからだ。

```text
このタスクで最も制御すべき点はどこか。
フレームワークの default abstraction はそれらを覆えているか。
どこには自分たちの protocol が必要か。
どこはフレームワークに任せられるか。
```

本チュートリアルが第 7 篇からやるのも、まさにこれだ。

まず最小 CLI Agent を書く。それはフレームワークより強いからではなく、小さく、荷重がかかる点をすべて見られるからだ。

## 11. 最小手書きロードマップ

「Agent を手で書く」が大きすぎる話に聞こえないよう、道筋をいくつかの小さな段階に圧縮しておく。

### 第 1 歩：Provider はモデル適配層にすぎない

まず 1 回だけ本物のモデル呼び出しを接続する。

目的は Agent を作ることではない。モデル vendor の詳細を provider に閉じ込めることだ。

```text
input: messages
output: model event
```

この時点では provider に tool を実行させない。

provider は外部 API を統一 event に適配するだけでよい。

### 第 2 歩：Loop は final と tool intent だけを扱う

次に最小 loop を追加する。

```text
input を構築する
モデルを呼び出す
final なら終了する
tool intent なら runtime に渡す
observation を記録する
次のラウンドへ進む
```

最初の版は賢さを求めない。

「モデル判断 -> システム実行 -> observation feedback -> 継続判断」が閉じることを証明できればよい。

### 第 3 歩：Tool Runtime は 3 つの tool だけをつなぐ

最初につなぐのは次だけにする。

```text
read_file
search_text
run_test
```

あえて最初から万能 shell を渡さない。

これにより、より semantic な tool protocol を設計せざるをえなくなる。

### 第 4 歩：State は event log から fold する

各ステップで event を書く。

```text
UserMessage
ModelEvent
ToolIntent
PolicyDecision
ToolResult
Observation
VerificationEvidence
```

そのうえで、event から現在の state を fold する。

最初の reducer は素朴でよい。読んだファイル、直近の失敗、最後の検証結果だけを記録する。

しかしこの構造は、後で自然に replay と eval へつながる。

### 第 5 歩：Context Builder は messages ではない

各モデル呼び出しの前に、入力を明示的に構築する。

```text
system rule
user goal
current state summary
recent observations
available tools
necessary evidence snippets
```

デフォルトで全ログを詰め込まない。

このステップで、本当の意味で Context Engineering が理解できる。

### 第 6 歩：Permission はまず 3 段階にする

最初の版はこれだけでよい。

```text
read：許可
run_test：確認
edit：禁止または確認
```

そこに working directory boundary を追加する。

これだけでも permission system がどこに掛かるべきかが見える。

### 第 7 歩：Verification Gate でモデルの空口完了宣言を禁止する

最後に次の rule を追加する。

```text
検証証拠がなければ「修正完了」と宣言できない。
```

「テスト修正」タスクでは、verification evidence は次のいずれかでよい。

```text
テスト command の exit code が 0
またはユーザーが未検証結果を明示的に受け入れた
```

この rule によって、Agent は「まとめを書くのがうまいもの」から「現実の証拠を尊重するもの」へ変わる。

## 12. 手で書いたあとに使うフレームワークは、より安定する

これらのメカニズムを実際に手で書いたあとでフレームワークを使うと、心構えが変わる。

フレームワークを自動運転として扱わなくなる。

組み合わせ可能なエンジニアリング部品の集合として扱うようになる。

安心して任せられる場所が分かる。

```text
model API adaptation
node orchestration
tool schema generation
streaming output
basic checkpoint
visual trace
deployment worker
```

同時に、自分で見張るべき場所も分かる。

```text
tool risk classification
permission policy
context projection
raw event log
eval attribution
final verification gate
long-term memory governance
```

これが「フレームワーク抽象の背後にある最小メカニズムを理解する」という意味だ。

将来フレームワークを使わないためではない。

フレームワークを使うときに、見えない default value にシステムの運命を預けないためだ。

Agent engineering では default value が重要だ。

しかし本物のタスクが長く、高価で、危険になると、default value は明示的に検査されなければならない。

最小システムを手で書くことは、default value を分解して見るプロセスである。

## 13. この章で残すエンジニアリング境界

最後に、この章を数文に圧縮する。

第一に、フレームワークが解決するのは、よくある経路の効率問題である。

第二に、手で書くことが解決するのは、隠れた境界の理解問題である。

第三に、本物の Agent の失敗は、モデルが推論できないからではなく、tool、context、permission、state、verification、evaluation といった外側のメカニズムを十分にモデル化できていないことから起きる場合が多い。

第四に、最小 Agent を手で書くのはフレームワークを置き換えるためではなく、次を知るためである。

```text
フレームワークの抽象はどこまでか。
自分の Harness はどこから始まるべきか。
```

次の記事では、正式にコード側の最初の一歩へ入る。

```text
LLM Provider 接続：CLI で最初のモデル呼び出しを完了する
```

その記事では、あえて 1 つの小さなことだけを行う。本物のモデルを CLI に接続することだ。

最初から tool や loop には入らない。

Provider の最初の境界は次だからだ。

```text
Provider はモデル呼び出しだけを担当し、tool 実行も task world の管理も担当しない。
```

この章を一言で覚えるなら、こうなる。

> Agent を手で書くのは、フレームワークを使わないためではなく、フレームワークがどのエンジニアリング責務を隠しているのかを見抜くためである。

## 教学 Harness への落とし込み

手書きの最小目標はかなり具体的にできます。`protocol.ts`、`message.ts`、`model.ts`、`mockModel.ts`、`loop.ts`、`tools.ts`、`sessionStore.ts` です。完全さは目的ではありません。framework が隠しがちな判断、つまり message の model 化、tool call の回填、error を observation として扱うか、session をどこから復元するかを見えるようにします。

---

GitHub ソース: [00-06-handwrite-agent-meaning.md](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-06-handwrite-agent-meaning.md)
