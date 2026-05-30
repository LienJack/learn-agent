---
title: "Provider Runtime：なぜ provider は tool intent だけを返すべきなのか"
description: "前回までの記事群で、私たちは土台となる規律を一つ固めました。"
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.jpg'
locale: "ja"
tags:
  - Agent
  - Harness
  - Provider Runtime
  - Tool Intent
  - AI SDK
  - 技術チュートリアル
aliases:
  - Provider Runtime Tool Intent
  - Provider は Tool Intent だけを返す
  - AI SDK Bridge
---

# Provider Runtime：なぜ provider は tool intent だけを返すべきなのか

前回までの記事群で、私たちは土台となる規律を一つ固めました。

```text
モデルが提案し、システムが実行する。
```

第 7 篇では、最初の provider 接続を扱いました。

第 9 篇では、M0 Core Kernel を扱いました。

第 10 篇では、`Intent / Execution` の分離を集中的に分解しました。

第 11 篇では、外部能力がシステムへ入る入口を Plugin Host に絞り込みました。

ここから一歩進むと、問題は一気に現実的になります。

```text
もう一つの provider を呼ぶだけではない。
本物のモデル、本物の streaming、本物の function calling、本物のツール引数の増分を扱う。
```

このとき、多くの人は自然に「とても手触りのよい」実装を書きたくなります。

たとえば、小さな CLI Agent にある AI SDK を接続するとします。

ユーザー入力はこうです。

```text
このプロジェクトのテストがなぜ失敗しているのか見て、直して。
```

モデルは streaming の中でツール呼び出しを返します。

```json
{
  "toolName": "bash",
  "input": {
    "command": "npm test"
  }
}
```

SDK は、ツール呼び出しをすでに包んでくれているように見えます。

SDK によっては、ツール定義の中に `execute` 関数を直接書くことさえできます。

すると、コードはとても誘惑的になります。

```ts
const result = await streamText({
  model,
  messages,
  tools: {
    bash: tool({
      description: "Run a shell command",
      inputSchema: z.object({
        command: z.string(),
      }),
      execute: async ({ command }) => runShell(command),
    }),
  },
});
```

このコードは動かすと気持ちがいい。

モデルが `bash` を提案する。

SDK が `execute` を呼ぶ。

コマンドが実行される。

結果がモデルに返る。

ターミナルには「テストを直せる」Agent が現れ始める。

しかし、これこそ第 12 篇で分解したい罠です。

**provider runtime がツール実行を担当した瞬間、それはもはや provider runtime ではなく、システム内部に半分の Agent が生えた状態になります。**

core を迂回します。

state を迂回します。

permission を迂回します。

audit を迂回します。

retry を迂回します。

replay を迂回します。

最後に、Harness 全体は二つの loop を持つようになります。

```text
core の中に一つの loop がある。
provider runtime の中にも、こっそり別の loop がある。
```

この記事が答えたい中心の問いはこれです。

> provider を本物のモデルにつないだあと、なぜ streaming、errors、tool-call delta を model events と tool intent に正規化するだけで、自分ではツールを実行してはいけないのか？

ここでいう「tool intent だけを返す」とは、Provider Runtime が一種類のイベントしか返せないという意味ではありません。

もちろん、テキスト、reasoning delta、finish、usage、provider error も返します。

この言葉が本当に強調したいのは、次の点です。

```text
Provider Runtime はモデルイベントを返してよい。
ただし、ツールに関する出力は ToolIntent で止まらなければならない。
Core を飛び越えて、直接 ToolExecution になってはいけない。
```

先に結論を置きます。

```text
Provider Runtime はモデルプロトコルの適配層である。
Tool Runtime こそが実行層である。
Core Kernel こそが状態、権限、イベント、リプレイの事実源である。
```

これは抽象に潔癖なだけの話ではありません。

小さな CLI Agent が実際にテストを直し始めたときにも、各ステップを誰が提案し、誰が承認し、誰が実行し、誰が記録し、誰が再生できるのかを失わないための設計です。

## 問題の連鎖

この記事の問題の連鎖はこうです。

```text
本物の provider は text、reasoning、tool-call delta、finish、usage、error を返す
-> AI SDK / provider SDK は便利なツール実行入口を提供しがちである
-> provider runtime が直接ツールを実行すると、隠れた Agent loop になる
-> 隠れた loop は core の state、permission、audit、retry、replay を迂回する
-> だから provider runtime はプロトコル正規化だけを行わなければならない
-> モデル出力は ModelEvent と ToolIntent に翻訳される
-> ToolIntent は core のイベントログと tool pipeline に入る
-> Tool Runtime が validate、permission、execute、observe を担当する
-> provider は置き換えられてよいが、実行セマンティクスは置き換えられてはいけない
```

全体図にすると、こうなります。

![Provider Runtime：なぜ provider は tool intent だけを返すべきなのか Mermaid 1](assets/00-12-provider-runtime-tool-intent/mermaid-01.png)

この図で最も重要なのは、モジュールの数ではありません。

最も重要なのは、この切断された辺です。

```text
Provider Runtime -X-> Tool Execution
```

provider runtime はモデル出力を見ることができます。

モデル出力に含まれるツール呼び出し形式を理解する必要もあります。

しかし、そのツール呼び出しを直接外部アクションに変えてはいけません。

ツール呼び出しをシステム内部の `ToolIntent` に翻訳するところまでです。

本当の実行は、core の tool pipeline に戻らなければなりません。

この設計の代償は、adapter を一層余分に書くことです。

しかし得られるものは大きい。

```text
モデル provider は差し替えられる。
AI SDK は差し替えられる。
streaming 形式は差し替えられる。
ツール実行、権限監査、状態リプレイは差し替えられないまま保てる。
```

これが Provider Runtime の位置です。

## 一、provider は最も「半分の Agent」へ膨らみやすい

まず、最もよくある開発経路から始めます。

すでに CLI Agent があります。

ユーザー入力を読めます。

モデルを呼べます。

最小限の loop があります。

次に、ツール呼び出し能力を持たせたくなります。

そこでモデルに tools を渡します。

```ts
const tools = {
  readFile: {
    description: "Read a file from the workspace",
    inputSchema: z.object({
      path: z.string(),
    }),
  },
  bash: {
    description: "Run a shell command",
    inputSchema: z.object({
      command: z.string(),
    }),
  },
};
```

モデルはツール定義を見たあと、適切なタイミングでツール呼び出しを返します。

「失敗しているテストを直す」というタスクなら、最初のラウンドはおそらくこうです。

```json
{
  "toolName": "bash",
  "input": {
    "command": "npm test"
  }
}
```

ここまでは正常です。

モデルは次の一手を提案しただけです。

本当の分岐は次のコード行で起きます。

provider runtime の中で直接実行するのか。

```ts
if (part.type === "tool-call") {
  const result = await tools[part.toolName].execute(part.input);
  providerMessages.push(toToolResult(part, result));
}
```

それとも core に渡すのか。

```ts
if (part.type === "tool-call") {
  emit({
    type: "tool_intent",
    intent: normalizeToolIntent(part),
  });
}
```

この二つのコードの差は、とても小さく見えます。

一つ目のほうが便利です。

二つ目のほうが少し冗長です。

しかし、この二つはまったく違うシステムを表しています。

一つ目は provider runtime を実行者にします。

二つ目は provider runtime を適配層のまま保ちます。

一つ目を選ぶと、provider runtime はすぐに膨らみ続けます。

ツールレジストリを知る必要が出ます。

どのツールが読み取り専用かを知る必要が出ます。

`bash` のリスクレベルを知る必要が出ます。

ユーザーが自動実行を許しているかを知る必要が出ます。

コマンドの timeout を知る必要が出ます。

stdout を切り詰める必要が出ます。

ツール結果を provider 独自のメッセージ形式へ戻す必要が出ます。

ツール失敗を処理する必要が出ます。

次のモデル呼び出しを続けるかどうかも決める必要が出ます。

ここまで来ると、それはもう単なる provider runtime ではありません。

provider adapter の中に、隠れた ReAct loop を書いてしまっています。

### 隠れた loop の危険

隠れた loop でいちばん問題なのは「コード重複」ではありません。

権限の位置が移動してしまうことです。

もともとのシステム設計はこうでした。

```text
Core Runtime が一回のタスクをどう進めるかを決める。
Provider Runtime はモデルとの通信だけを担当する。
Tool Runtime は制御された実行だけを担当する。
Event Log は何が起きたかを記録する。
```

provider runtime が自分でツールを実行すると、流れはこうなります。

```text
Provider Runtime がモデルイベントを受け取る
-> 直接ツールを実行する
-> 結果を provider messages に直接詰める
-> モデル呼び出しを続ける
-> 最後に最終回答だけを core に渡す
```

Core が見えるのは「モデル呼び出しが終わった」という事実だけです。

途中で何が起きたかは見えません。

たとえばユーザーがこう聞いたとします。

```text
さっきなぜ src/parser.ts を変更したの？
```

core は答えられないかもしれません。

実際の実行は provider runtime の内部で起きたからです。

別の例として、テスト失敗後に provider runtime が自動で `npm install` を実行したとします。

core のログには「provider request succeeded」だけが残るかもしれません。

しかし次のことは記録されません。

```text
モデルが npm install を提案した
システムがそのコマンドを検証したか
権限確認でユーザーに尋ねたか
実行時の cwd はどこだったか
stdout は切り詰められたか
exit code は何だったか
どれくらい時間がかかったか
lockfile が変わったか
```

デモなら致命傷ではないかもしれません。

Harness にとっては致命傷です。

なぜなら Harness の価値は、次の問いに答えられることにあるからです。

```text
何が起きたのか？
なぜ許可されたのか？
どこで失敗したのか？
復旧できるのか？
再生できるのか？
評価できるのか？
```

provider runtime が core を迂回した瞬間、これらの問いに対する統一された信頼できる事実源はなくなります。

## 二、Tool Call、Tool Intent、Tool Execution は三つの別物

境界を保つには、まず三つの言葉を分ける必要があります。

多くのフレームワーク文書では、これらをまとめて tool calling と呼びます。

しかし Harness では、次の三つのオブジェクトとして扱うほうがよい。

```text
Tool Call：provider または SDK が返す生のツール呼び出し片。
Tool Intent：core 内部で処理できる行動提案。
Tool Execution：runtime が実際にツールを実行して起こす外部アクション。
```

この三つは、存在する層が違います。

![Provider Runtime：なぜ provider は tool intent だけを返すべきなのか Mermaid 2](assets/00-12-provider-runtime-tool-intent/mermaid-02.png)

この図で重要なのは、層の間の翻訳です。

`Tool Call` は provider の言葉です。

たとえば、こういう形かもしれません。

```json
{
  "id": "call_abc",
  "type": "function",
  "function": {
    "name": "read_file",
    "arguments": "{\"path\":\"package.json\"}"
  }
}
```

あるいは、こういう形かもしれません。

```json
{
  "type": "tool_use",
  "id": "toolu_123",
  "name": "read_file",
  "input": {
    "path": "package.json"
  }
}
```

streaming では、最初に小さな断片として来ることもあります。

```json
{
  "type": "tool-call-delta",
  "toolCallId": "call_abc",
  "toolName": "bash",
  "argsTextDelta": "{\"command\":\"npm"
}
```

そして次の断片が続きます。

```json
{
  "type": "tool-call-delta",
  "toolCallId": "call_abc",
  "argsTextDelta": " test\"}"
}
```

これらは provider events です。

まだシステム内部の行動オブジェクトではありません。

Provider Runtime がやるべきことは、これらを安定した `ToolIntent` に畳み込むことです。

```ts
type ToolIntent = {
  id: string;
  providerCallId?: string;
  toolName: string;
  input: unknown;
  rawInputText?: string;
  source: {
    provider: string;
    model: string;
    requestId?: string;
    streamIndex?: number;
  };
  status: "proposed";
};
```

このオブジェクトには重要な点がいくつかあります。

第一に、`Execution` ではなく `Intent` と呼んでいます。

これは、モデルが行動要求を提案しただけだという意味です。

第二に、`providerCallId` は保持しますが、provider の生形式を core の主要データ構造にはしません。

core は出所を追跡できますが、出所の形式には依存しません。

第三に、`rawInputText` を保存できるようにしています。

これは streaming では重要です。

一部の provider は、ツール引数を文字列の増分として出します。

JSON が閉じる前に、runtime は実行を急いではいけません。

第四に、状態は `proposed` に留まります。

後続の `validated`、`approved`、`executed`、`observed` は provider runtime が設定すべきではありません。

### 名前が重要な理由

多くのアーキテクチャバグは、曖昧な名前から始まります。

provider が返すものを `ToolInvocation` と呼ぶと、自分たちを誤解させやすくなります。

```text
invocation というなら、もう呼び出されたのか？
```

`ToolCall` と呼ぶと、provider 独自形式と混ざりやすくなります。

`ToolIntent` は、意図的に距離を取る名前です。

```text
これはモデルの行動意図にすぎない。
```

小さな CLI Agent にとって、この距離は実用的です。

モデルがこう提案したとします。

```json
{
  "toolName": "bash",
  "input": {
    "command": "rm -rf node_modules && npm install"
  }
}
```

システムは、JSON が有効だからという理由だけで実行すべきではありません。

まず、これを次のように記録すべきです。

```text
モデルが高リスクの bash intent を提案した。
```

そのうえで後続の検証、権限、承認へ渡します。

## 三、AI SDK Bridge：橋は借りても、制御権を渡してはいけない

この記事のタイトルには、Provider Runtime と AI SDK Bridge が含まれています。

なぜわざわざ「Bridge」と言うのでしょうか。

現代的な SDK は、すでに多くの便利な能力を持っているからです。

通常、次のものを提供します。

```text
統一された provider 接続
generateText / streamText のような高レベル API
streaming parts
tool call と tool-call delta
finish reason
usage
error parts
telemetry
多段階の tool calling まで
```

これらの能力は、私たちにとってとても有用です。

provider adapter で重複して書く作業を大きく減らしてくれます。

しかし、ここで境界を明確にしておく必要があります。

```text
AI SDK は provider bridge として使ってよい。
Harness の実行 core になってはいけない。
```

言い換えると、プロトコル正規化のために使うことはできます。

しかし、ツール実行の権限を渡してはいけません。

AI SDK Bridge は Provider Runtime の一つの実装になれます。

しかし、新しい Core ではありません。

新しい Tool Runtime でもありません。

Harness の新しい制御面でもありません。

### 二つの接続方式

一つ目は「SDK がツール実行を管理する」方式です。

疑似コードはこうなります。

```ts
await streamText({
  model,
  messages,
  tools: {
    readFile: tool({
      inputSchema: readFileSchema,
      execute: async (input) => fileSystem.read(input.path),
    }),
    bash: tool({
      inputSchema: bashSchema,
      execute: async (input) => shell.run(input.command),
    }),
  },
  stopWhen: isStepCount(5),
});
```

これは一般的なアプリケーションでは便利です。

たとえば天気を答えるチャットボットなら、モデルが `getWeather` を呼び、SDK が関数を実行し、天気を返します。

しかし、このチュートリアルの Harness では、この接続は広すぎます。

SDK tool に `execute` をぶら下げた瞬間、ツール実行ライフサイクルが SDK に包まれるからです。

もちろん、`execute` の中に手作業でログ、権限、監査を足すことはできます。

しかしそれは、Harness の core control point を provider bridge の中へ押し戻すことになります。

最後には、すべての provider bridge が tool runtime を複製することになります。

二つ目は「SDK は tool intent だけを出力する」方式です。

疑似コードはこうなります。

```ts
const result = streamText({
  model,
  messages,
  tools: describeToolsForModel(toolRegistry),
});

for await (const part of result.fullStream) {
  switch (part.type) {
    case "text":
      yield modelTextDelta(part);
      break;

    case "tool-call-delta":
      toolCallAssembler.push(part);
      break;

    case "tool-call":
      yield toolIntentEvent(normalizeToolCall(part));
      break;

    case "finish":
      yield modelFinish(part);
      break;

    case "error":
      yield providerError(part);
      break;
  }
}
```

ここでも SDK は provider 抽象化を助けてくれます。

しかし、ツールは実行しません。

標準化された stream parts を取り出しやすくしてくれるだけです。

そのあと Provider Runtime が、それらの parts をこのチュートリアル独自の `ModelEvent` と `ToolIntent` にさらに翻訳します。

SDK は stream parts を提供できます。

しかし、イベントの所有権は Core に戻さなければなりません。

Bridge の正しい位置はここです。

```text
Bridge は翻訳者であって、代理人ではない。
```

### なぜ SDK の多段階ツール実行をそのまま信頼しないのか？

SDK が悪いからではありません。

むしろ、多くの SDK のツール実行設計は成熟しています。

アプリケーション開発者にとって、ツール関数を SDK に渡すと、tool call から tool result までの循環を素早く完成できます。

問題は、ここで私たちが作っているものが Harness だということです。

Harness の使命は「できるだけ早く答えを得る」ことではありません。

長いタスクを、制御可能で、観測可能で、復旧可能な事実の連鎖へ分解することです。

「失敗しているテストを直す」のようなタスクでは、一つのツール実行は普通の関数呼び出しではありません。

それは次のことをし得ます。

```text
ユーザープロジェクト内の機密ファイルを読む
ローカル shell を実行する
ワークスペースを変更する
依存関係をインストールする
長い時間を消費する
大量の出力を生む
権限確認を発生させる
後続コンテキストを変える
テストと replay に影響する
```

こうしたアクションを provider SDK の生成ステップの中に隠してはいけません。

Harness の公開された実行パイプラインを通過させる必要があります。

そうすることで、あとから次のものを追加できます。

```text
permission policy
hook gate
sandbox
audit ledger
result budget
observation truncation
retry classifier
session replay
eval trace
```

これらは「あればうれしい」ものではありません。

Agent をホストできるかどうかの核心です。

## 四、Streaming Runtime：イベントは流れてよいが、実行は先走ってはいけない

provider runtime で最も複雑なのは、たいてい通常テキストではありません。

テキストは扱いやすい。

```text
モデルが token delta を出す
CLI が token delta を表示する
event log が text_delta を記録する
```

本当に厄介なのは、streaming tool call です。

多くの provider や SDK は、ツール呼び出しを複数の streaming fragment に分けます。

たとえば、モデルが実行したいものがこれだとします。

```bash
npm test -- --runInBand
```

stream は完全な JSON を一度に渡してくれないかもしれません。

こう見えることがあります。

```text
tool-call-start: id=call_1 name=bash
tool-call-delta: {"command":"npm
tool-call-delta:  test
tool-call-delta:  -- --runInBand"}
tool-call-end
```

この時点で provider runtime がすべきことは三つです。

第一に、delta を保存する。

第二に、引数が完全になるまで待つ。

第三に、`ToolIntentProposed` を産出する。

最初の delta を見た瞬間に実行してはいけません。

引数はまだ完全ではありません。

たまたま JSON として parse できた瞬間に実行してもいけません。

モデルはまだ後続 delta を出す可能性があります。

まして、半分の引数を streaming 中に shell へ渡すなど論外です。

これは常識のように聞こえます。

しかし「streaming しながら実行したい」という誘惑は、まさにここで生まれます。

その誘惑に耐える必要があります。

![Provider Runtime：なぜ provider は tool intent だけを返すべきなのか Mermaid 3](assets/00-12-provider-runtime-tool-intent/mermaid-03.png)

このシーケンス図で最も重要なのは、provider runtime が途中で二度踏みとどまることです。

部分引数を cache してよい。

完全な input を parse してよい。

しかし、結果は core に送るだけです。

実行は Tool Runtime で起きなければなりません。

### なぜ streaming delta をイベントモデルに入れるのか？

ここには一つ細部があります。

すべての tool-call delta をイベントログに書くべきでしょうか。

答えはシステムの段階によります。

M2 では、すべての delta を長期的な事実として保存しない選択もできます。

しかし provider runtime は、少なくともそれらを内部の一時状態へ変換し、完全な intent が現れたときに十分な source 情報を記録する必要があります。

たとえば、こうです。

```ts
type ToolIntentProposedEvent = {
  type: "tool_intent.proposed";
  intent: ToolIntent;
  assembledFrom?: {
    eventCount: number;
    firstOffset: number;
    lastOffset: number;
    hadRepair?: boolean;
  };
};
```

そうすれば、あとで debug するときに分かります。

```text
この intent は一つの完全な tool-call event から来たのか。
それとも複数の delta から組み立てられたのか。
組み立て中に JSON repair が起きたのか。
provider stream が中断されたのか。
```

これは失敗の帰属に関わります。

たとえば、モデルが JSON の半分を返したところで接続が切れたとします。

それは tool execution failure ではありません。

permission denial でもありません。

provider stream incomplete です。

標準的なイベント分類がなければ、eval には「task failed」としか見えません。

しかし本当の修正方向はまったく違います。

だから `tool_intent.delta` を長期イベントログに入れるかどうかは、後の段階で決めてもよい。

M2 でより重要なのは、次の三点です。

```text
完全な intent は追跡可能でなければならない。
delta assembly は black box になってはいけない。
半分の引数が実行を引き起こしてはいけない。
```

## 五、エラー写像：provider error は tool error ではない

provider runtime が膨らみやすいもう一つの場所は、エラー処理です。

本物の provider を接続すると、多くのエラーに出会います。

```text
authentication failure
insufficient balance
rate limit
overloaded
timeout
context length exceeded
bad request
model unavailable
stream interrupted
tool call JSON malformed
unsupported tool schema
```

これらの一部は provider に属します。

一部は request construction に属します。

一部は model output に属します。

一部は tool intent parsing に属します。

しかし、どれも tool execution error ではありません。

たとえば `rate_limit`。

これはモデル呼び出しが制限されたという意味です。

`bash` ツールが失敗したという意味ではありません。

あるいは `tool_call_json_malformed`。

これはモデルまたは provider が parse できないツール引数を返したという意味です。

`readFile` の実行が失敗したという意味ではありません。

provider runtime が自分でツールを実行していると、これらのエラーは簡単に混ざります。

```text
モデルが完全なツール引数を返さなかった
-> ツール実行が失敗した
-> Agent がモデルに修正を求め続ける
```

正しい分類はこうです。

```text
provider stream incomplete
-> runtime が、モデル呼び出しを retry するか、モデルに intent の再発行を求めるか、このラウンドを終了するかを決める
```

そのため Provider Runtime には error taxonomy が必要です。

M2 では、簡略化した設計としてこう始められます。

```ts
type ProviderErrorKind =
  | "auth"
  | "rate_limit"
  | "quota"
  | "timeout"
  | "overloaded"
  | "bad_request"
  | "context_length"
  | "stream_interrupted"
  | "unsupported_feature"
  | "malformed_tool_call"
  | "unknown";
```

そして統一イベントへ写像します。

```ts
type ProviderErrorEvent = {
  type: "provider.error";
  kind: ProviderErrorKind;
  retryable: boolean;
  provider: string;
  model: string;
  requestId?: string;
  message: string;
  raw?: unknown;
};
```

重要なのは enum がどれだけ完全かではありません。

重要なのは、エラーの所有者を正しく保つことです。

![Provider Runtime：なぜ provider は tool intent だけを返すべきなのか Mermaid 4](assets/00-12-provider-runtime-tool-intent/mermaid-04.png)

この図で最も重要なのは左側の分岐です。

多くのものが「失敗」と呼ばれますが、層が違えばシステムが取るべき行動もまったく違います。

provider error は retry や fallback を必要とするかもしれません。

intent parse error は、モデルに tool intent の再発行を求める必要があるかもしれません。

tool error は observation としてモデルへ返るべきです。

permission deny は governance event として記録されるべきです。

validation error は実行を止めるべきです。

これらを provider runtime の catch block 一つに畳み込むと、後に信頼できる Harness は残りません。

エラー分類は見た目のためではありません。

後続の判断に明確な根拠を与えます。

```text
retry
fallback
compact
ask user
fail run
```

### fallback もこっそりツールを実行してはいけない

M2 Provider Runtime では fallback にも出会います。

たとえば primary provider が rate limit に当たり、backup provider に切り替える場合です。

あるいは現在のモデルが特定の tool schema をサポートせず、別モデルへ downgrade する場合です。

ここにも悪い設計の誘惑があります。

```text
fallback は provider runtime の近くにあるのだから、
ここで tool execution loop も閉じてしまおう。
```

だめです。

fallback が影響するのはモデル呼び出しの経路だけです。

ツール実行の所有権には影響しません。

モデルが provider A から来ても provider B から来ても、出力は同じ種類の `ModelEvent` と `ToolIntent` でなければなりません。

そのあと同じ tool pipeline を通ります。

より正確にはこうです。

```text
Provider Runtime は、異なる provider の出力を統一イベントへ流し込む。
Provider Resolver / Runtime Policy は、このラウンドでどの provider を選ぶかを決める。
Tool Runtime は、依然として独立に実行を所有する。
```

こうして初めて、後続の product CLI は profile、capability、cost、latency、fallback policy に基づいてモデルを選べます。

しかも provider 独自形式を Core に漏らさずに済みます。

これも provider runtime の価値です。

```text
provider の差異は外側に留める。
provider の差異を実行システムへ持ち込まない。
```

## 六、Core は完全な荷重経路を見る必要がある

ここで全体の鎖をつなぎます。

私たちの CLI Agent はユーザーの要求を受け取ります。

```text
このプロジェクトのテストがなぜ失敗しているのか見て、直して。
```

M2 のあと、一回の run はこう見えるべきです。

```text
CLI がユーザー goal を受け取る
-> Core Runtime が run を作る
-> Context Projection がこのラウンドのモデル入力を組み立てる
-> Provider Runtime が本物のモデルを呼ぶ
-> Provider Runtime が streaming events を正規化する
-> モデルが ToolIntent: bash npm test を提案する
-> Core が tool_intent.proposed を記録する
-> Tool Runtime がコマンドを検証する
-> Permission Runtime が許可するか決める
-> Bash Executor が制御された cwd で実行する
-> Observation が exit code、stdout、stderr、truncation を記録する
-> Core が Observation を次ラウンドの messages へ投影する
-> Provider Runtime が再びモデルを呼ぶ
```

この鎖は少し長い。

しかし、長いのには理由があります。

各区間が一つの監査質問に答えます。

```text
誰が提案したのか？ モデル。
誰が翻訳したのか？ Provider Runtime。
誰が記録したのか？ Core Event Log。
誰が承認したのか？ Permission Runtime。
誰が実行したのか？ Tool Runtime。
誰が観測したのか？ Observation Builder。
誰がフィードバックしたのか？ Core Context Projection。
```

図にするとこうです。

![Provider Runtime：なぜ provider は tool intent だけを返すべきなのか Mermaid 5](assets/00-12-provider-runtime-tool-intent/mermaid-05.png)

この図で最も重要なのは、loop がどこで閉じるかです。

loop は Core で閉じます。

provider ではありません。

モデル呼び出しは loop の一ステップにすぎません。

ツール実行も loop の一ステップにすぎません。

state projection、event logging、permissions、observations がそれらをつなぎます。

provider runtime がモデル呼び出しとツールを自分で loop させると、Core はただの殻になります。

それは Harness ではありません。

core という名前を着た provider agent にすぎません。

### Core はなぜ先に intent を記録しなければならないのか？

こう聞く人がいるかもしれません。

```text
ツールが終わってから tool_result を一つ記録すればよいのでは？
途中の tool_intent.proposed は本当に必要なのか？
```

必要です。

intent はモデル行動の証拠です。

execution はシステム行動の証拠です。

observation は外部世界から返った証拠です。

この三つは混ぜられません。

たとえば、モデルがこう提案します。

```text
npm test を実行する
```

システムが実際にはこう実行します。

```text
pnpm test
```

これは妥当かもしれません。

プロジェクトの package manager が pnpm で、runtime がコマンドを正規化したのかもしれません。

しかし、それは見える必要があります。

あるいは、モデルがこう提案します。

```text
git reset --hard
```

システムは拒否します。

これは tool failure ではありません。

permission denial です。

最終結果だけを記録しているとします。

```text
実行されなかった。
```

それでは、モデルが危険な行動を提案したという証拠を失います。

後の trace analysis、policy tuning、eval dataset は、すべてこうした中間事実に依存します。

## 七、Provider Runtime の最小インターフェース

ここまで来ると、境界をコードに落とせます。

M2 に巨大な provider framework は必要ありません。

Provider Runtime の責務を、いくつかの interface に狭めるだけで十分です。

まず入力を定義します。

```ts
type ModelRequest = {
  runId: string;
  turnId: string;
  model: string;
  messages: ModelMessage[];
  tools: ModelToolDescription[];
  options: {
    temperature?: number;
    maxOutputTokens?: number;
    abortSignal?: AbortSignal;
  };
};
```

ここで `tools` は、モデルから見えるツール説明だけです。

実行関数は含みません。

こうあるべきです。

```ts
type ModelToolDescription = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
};
```

こうではありません。

```ts
type WrongModelToolDescription = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  execute: (input: unknown) => Promise<unknown>;
};
```

この境界は小さいですが、極めて重要です。

provider に渡すツール説明は、モデルに「どんな行動を提案できるか」を伝えるだけです。

「その行動をどう実行するか」は provider に渡しません。

次に出力を定義します。

```ts
type ModelEvent =
  | ModelStarted
  | ModelTextDelta
  | ModelReasoningDelta
  | ToolIntentDelta
  | ToolIntentProposed
  | ModelFinished
  | ProviderError;
```

核になるのは `ToolIntentProposed` です。

```ts
type ToolIntentProposed = {
  type: "tool_intent.proposed";
  id: string;
  turnId: string;
  intent: {
    toolName: string;
    input: unknown;
    providerCallId?: string;
  };
  provider: {
    name: string;
    model: string;
    requestId?: string;
  };
};
```

Provider Runtime の主 interface はこうできます。

```ts
interface ProviderRuntime {
  stream(request: ModelRequest): AsyncIterable<ModelEvent>;
}
```

この interface に何がないかに注意してください。

```text
executeTool()
runLoop()
continueUntilDone()
approveTool()
appendToolResult()
```

これらが重要ではないからではありません。

別の層に属しているからです。

provider runtime は、ユーザーが `bash` を許可しているかを知るべきではありません。

ツール結果をどう切り詰めるかも知るべきではありません。

タスクが終わったかどうかを決めるべきでもありません。

モデルイベントを忠実に翻訳すればよいのです。

### Tool result はどう provider に戻るのか？

ここで実務的な疑問が出ます。

provider runtime がツールを実行しないなら、ツール結果は最終的にどうやってモデルへ戻るのでしょうか。

答えはこうです。

```text
Core が Observation を次ラウンドの ModelMessage へ投影する。
Provider Runtime はその messages を送るだけである。
```

つまり provider runtime は、内部の `ModelMessage` を provider が求めるメッセージ形式へ翻訳してよい。

ある provider はこういう形を必要とします。

```json
{
  "role": "tool",
  "tool_call_id": "call_abc",
  "content": "test failed..."
}
```

別の provider は content block を必要とします。

```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_123",
  "content": "test failed..."
}
```

この翻訳は provider runtime の責務です。

ただし注意してください。翻訳しているのは、Core がすでに受け入れた `Observation` です。

自分でツールを実行して得た結果ではありません。

したがって、message projection は次のように層化できます。

```ts
const messages = contextProjection.buildModelMessages({
  sessionEvents,
  currentState,
  providerCapabilities,
});

for await (const event of providerRuntime.stream({
  messages,
  tools: describeToolsForModel(toolRegistry),
})) {
  await core.handleModelEvent(event);
}
```

ツール結果がモデルへ戻る経路は残っています。

所有権が Core に戻っているだけです。

## 八、provider 私有形式から内部イベントへ

ここから Provider Runtime adapter を具体的に見ます。

通常、それは四つの小さな部品を含みます。

```text
Request Builder：内部 ModelRequest を provider request へ翻訳する
Stream Normalizer：provider chunks を ModelEvent へ翻訳する
Tool Call Assembler：tool-call delta を組み立てる
Error Mapper：SDK / HTTP error を ProviderError へ翻訳する
```

層の図にするとこうです。

![Provider Runtime：なぜ provider は tool intent だけを返すべきなのか Mermaid 6](assets/00-12-provider-runtime-tool-intent/mermaid-06.png)

この図で最も重要なのは、Provider Runtime が真ん中にいることです。

左右を少しずつ理解する必要があります。

左側では、Core の内部イベントを理解します。

右側では、provider または AI SDK の streaming fragment を理解します。

しかし、外部アクションは一つも所有しません。

### Request Builder

Request Builder は、システム内部の request を provider request に翻訳します。

扱うのは次のものです。

```text
messages format
system / developer / user / assistant / tool message projection
tool schema expression
model options
provider-specific headers or options
capability flags
```

しかし、次のことを決めるべきではありません。

```text
このラウンドで bash を使えるか
どのファイルを読めるか
ツール結果が信頼できるか
履歴をどれだけ context に入れるか
```

それらは Provider Runtime に入る前に、Core、Context Policy、Tool Visibility が決めるべきです。

Request Builder は、すでに決められた入力を、特定の provider が理解できる形式へ翻訳するだけです。

### Stream Normalizer

Stream Normalizer は provider stream を内部イベントへ翻訳します。

たとえば、こうです。

```text
text delta -> model.text_delta
reasoning delta -> model.reasoning_delta
finish reason -> model.finished
usage -> model.usage
tool-call delta -> tool_intent.delta または assembler input
tool-call complete -> tool_intent.proposed
error part -> provider.error
```

この component は、大きな switch として書き始めても構いません。

初期段階ではそれで十分です。

ただし、出力は安定した内部イベントでなければなりません。

provider の raw chunk を Core まで漏らしてはいけません。

raw は debug attachment として保存できます。

しかし Core の業務判断は、内部イベントだけに依存すべきです。

あとで作者が確認する必要のある境界もあります。

```text
provider が reasoning summary を返すなら、表示可能イベントとして扱ってよい。
ただし、表示不可のモデル内部推論を Core の事実源として扱ってはいけない。
```

### Tool Call Assembler

Tool Call Assembler は、Provider Runtime の中で最も「stateful」に見える部分です。

provider call id ごとに delta を集める必要があります。

たとえば、こうです。

```ts
class ToolCallAssembler {
  private calls = new Map<string, PartialToolCall>();

  push(delta: ProviderToolCallDelta): ToolIntentDelta | ToolIntentProposed {
    const current = this.merge(delta);

    if (!current.isComplete) {
      return {
        type: "tool_intent.delta",
        providerCallId: current.id,
        toolName: current.toolName,
        rawInputText: current.rawArgs,
      };
    }

    return {
      type: "tool_intent.proposed",
      id: createIntentId(),
      intent: {
        toolName: current.toolName,
        input: parseJson(current.rawArgs),
        providerCallId: current.id,
      },
      provider: current.provider,
    };
  }
}
```

ここでの state は一時的な parse state です。

session state ではありません。

conversation state でもありません。

tool execution state でもありません。

だから Provider Runtime の中に存在してかまいません。

ただし目的は一つだけです。

```text
provider delta を完全な intent に組み立てる。
```

### Error Mapper

Error Mapper は、異なる provider の error を統一します。

たとえば、こうです。

```text
HTTP 401 -> auth / retryable false
HTTP 429 -> rate_limit / retryable true
HTTP 529 -> overloaded / retryable true
context window exceeded -> context_length / retryable false until compacted
SDK abort -> aborted / retryable depends on caller
malformed tool args -> malformed_tool_call / retryable maybe
```

これにより Core は統一された判断を下せます。

```text
retry
fallback
compact context
ask user for config
end run
record failure
```

provider runtime がこれらの error をそのまま外へ throw すると、Core は各 SDK の例外型を知る必要が出ます。

それは第 7 篇で話した provider pollution に戻ることです。

実装時には、`malformed_tool_call` をさらに分解してもよいでしょう。

```text
provider_stream_incomplete
intent_parse_failed
malformed_tool_call
```

これらはすべて、tool execution failure とは違います。

## 九、provider はなぜ state を持てないのか

Provider Runtime がツールを実行しないだけでは足りません。

長期 state も持ってはいけません。

ここでいう state とは、次のようなものです。

```text
session event log
conversation state
tool result history
permission decisions
budget usage
retry history
context compaction decision
```

これらはすべて Core または上位 Runtime に属します。

Provider Runtime は一時的な state を持ってよい場合があります。

```text
現在の stream の tool-call delta buffer
現在 request の provider request id
現在 response の usage accumulator
```

しかし、それらの state は一つの provider request が終われば終わるべきです。

次のようにしてはいけません。

```ts
class ProviderRuntime {
  private messages: Message[] = [];
  private toolResults: ToolResult[] = [];
  private permissions: PermissionDecision[] = [];
  private turnCount = 0;
}
```

これは provider の中にまた Agent が生える形です。

正しい形は、よりこういうものです。

```ts
class AiSdkProviderRuntime implements ProviderRuntime {
  async *stream(request: ModelRequest): AsyncIterable<ModelEvent> {
    const providerRequest = this.buildRequest(request);
    const stream = this.aiSdk.stream(providerRequest);

    for await (const part of stream) {
      yield* this.normalize(part);
    }
  }
}
```

Provider Runtime は stateless、少なくとも request-scoped であるべきです。

「これはテスト修復の三ラウンド目だ」と知る必要はありません。

「このモデル request の入力と出力は何か」だけを知ればよいのです。

### session state はなぜ provider に置けないのか？

session state は provider をまたぐものだからです。

今日は provider A を使います。

次のラウンドでは rate limit のため provider B に fallback します。

session state を provider A adapter の中に置くと、システムは切り替えにくくなります。

より現実的には、こうです。

```text
第 1 ラウンドは model A で失敗ログを読む
第 2 ラウンドは model B で修正方針を判断する
第 3 ラウンドは model A で patch を生成する
```

provider がどう切り替わっても、session は連続していなければなりません。

連続性の唯一の事実源は、Core の event log と state reducer です。

provider runtime 内部の messages 配列ではありません。

## 十、Replay：古い intent はなぜ再実行されてはいけないのか

Provider Runtime が intent だけを返すべき理由には、もう一つ重要なものがあります。

replay です。

長いタスクのシステムでは、必ず replay が必要になります。

腕前を見せるためではありません。

debug が必要になるからです。

```text
なぜ今回のテスト修復は失敗したのか？
モデルが間違ったツールを選んだのか？
権限が厳しすぎたのか？
provider が中断したのか？
ツール出力を切り詰めすぎたのか？
context が重要な情報を漏らしたのか？
```

provider runtime が自分でツールを実行していると、replay は扱いにくくなります。

たとえば session はこう見えます。

```text
provider call
内部で bash を実行
内部で readFile を実行
内部で edit を実行
最後に answer を返した
```

しかし event log には、それぞれの intent、permission、execution、observation が残っていません。

作業時の context を再構成できません。

さらに危険なのは、一部の replay 経路がツールを再度発火させる可能性があることです。

たとえば古い session にこうあります。

```text
モデルが提案：一時ファイルを削除する
provider runtime が実行：rm -rf tmp/cache
```

replay が単に provider loop を再実行するだけなら、削除がもう一度起こるかもしれません。

これは明らかに許容できません。

正しい replay semantics はこうです。

```text
イベントを再生し、外部世界を再実行しない。
```

古い `ToolIntent` は replay できます。

古い `PermissionDecision` も replay できます。

古い `ToolExecutionStarted` も replay できます。

古い `Observation` も replay できます。

しかし replay は、古い intent を見たからといってツールをもう一度実行してはいけません。

そのためには、intent、execution、observation が最初から別々のイベントである必要があります。

provider runtime が intent だけを返すことは、このイベントチェーンを分離可能、監査可能、再生可能にするための条件です。

## 十一、完全なテスト修復ラウンド

次に、実行例を一つ見ます。

ユーザーは CLI にこう入力します。

```text
このプロジェクトのテストがなぜ失敗しているのか見て、直して。
```

Core は run を作ります。

```json
{
  "type": "run.started",
  "runId": "run_001",
  "goal": "失敗しているテストを修正する"
}
```

Context Projection がモデル入力を構築します。

Provider Runtime がモデルを呼びます。

モデルは最初に短いテキストを出します。

```text
まずテストを実行して、現在の失敗情報を確認します。
```

Provider Runtime は次を発行します。

```json
{
  "type": "model.text_delta",
  "text": "まずテストを実行して、現在の失敗情報を確認します。"
}
```

次にモデルはツール呼び出しを提案します。

provider の生 stream はこうかもしれません。

```json
{
  "type": "tool-call",
  "id": "call_1",
  "toolName": "bash",
  "input": {
    "command": "npm test"
  }
}
```

Provider Runtime は実行しません。

ただ次を発行します。

```json
{
  "type": "tool_intent.proposed",
  "intent": {
    "toolName": "bash",
    "input": {
      "command": "npm test"
    },
    "providerCallId": "call_1"
  }
}
```

Core はそれをイベントログに書きます。

Tool Runtime が schema validation を行います。

Permission Runtime が判断します。

```text
npm test は読み取り/実行系のコマンドである。
作業ディレクトリはプロジェクト内である。
ファイルは変更しない。
自動許可できる。
```

次に Bash Executor が実行します。

Observation Builder は次を収集します。

```json
{
  "exitCode": 1,
  "stdout": "...",
  "stderr": "Expected 4, received 5",
  "truncated": false
}
```

Core は次を書き込みます。

```json
{
  "type": "tool.observed",
  "toolName": "bash",
  "exitCode": 1
}
```

次ラウンドのモデル入力で、Provider Runtime はすでに投影された tool result message を見ます。

それを provider 形式に翻訳するだけです。

その結果がどう実行されたかは気にしません。

モデルはさらにこう提案します。

```text
tests/sum.test.ts と src/sum.ts を読む。
```

Provider Runtime は二つの `ToolIntent` を出し続けます。

Core は並列読み取りを許可するかどうかを決めます。

Tool Runtime は二つの read を実行します。

Observation がログに入ります。

モデルはファイル内容に基づいて edit intent を提案します。

この時点で、Permission Runtime はユーザー確認を求めるかもしれません。

このすべてを provider runtime が知る必要はありません。

それが負う責務は一つだけです。

```text
モデル出力を忠実にシステムイベントへ翻訳する。
```

## 十二、よくある悪い匂い

Provider Runtime を書くとき、次の匂いが出たらすぐ立ち止まるべきです。

### 悪い匂い一：provider adapter に `execute` が現れる

provider adapter の中に次が現れ始めたら、

```ts
await tool.execute(input)
```

基本的に境界が壊れています。

この `execute` が provider SDK 内部のネットワーク要求だけを行う場合を除き、provider runtime の中でツールを呼んではいけません。

ツール実行は Tool Runtime で起きるべきです。

### 悪い匂い二：provider adapter が `messages` を保持している

Provider Runtime が長期的な独自の `messages` 配列を持ち、各ツール呼び出し後に tool result を自分で push しているなら注意が必要です。

これは session state が provider に吸収され始めているということです。

Provider Runtime は `messages` を入力として受け取ってよい。

しかし messages の事実源になってはいけません。

### 悪い匂い三：provider adapter が loop を続けるかどうかを決める

provider runtime の中に次が現れたら、

```ts
while (step < maxSteps) {
  callModel();
  executeTools();
}
```

それはもう provider runtime ではありません。

Agent Runtime です。

loop control は Core に属します。

provider runtime は、Core が明示的に開始した一つの model request、または一つの stream だけを扱います。

### 悪い匂い四：provider raw chunk を core event として保存する

debug のために raw chunk を保存するのは構いません。

しかし event log の主イベントが provider raw object なら、後で非常に面倒になります。

provider が変わると、古い session と新しい session の event shape が違ってしまうからです。

eval と replay が vendor format に縛られます。

### 悪い匂い五：ツール結果の切り詰めが provider runtime で起きる

ツール結果の切り詰めは「モデル入力に合わせる」ことのように見えます。

しかし実際には Observation Policy と Context Projection に属します。

provider runtime は provider capability に基づいて最後の形式変換を行ってよい。

しかし「stdout をどれだけ残すか」「エラーログをどう要約するか」「二回目の read が必要か」は provider adapter が決めるべきではありません。

### 悪い匂い六：fallback 後に provider 選択の証拠が失われる

fallback が起きたなら、システムは次を説明できるべきです。

```text
なぜ provider A から provider B に切り替えたのか？
rate limit が理由だったのか？
context length が理由だったのか？
required capability が満たされなかったのか？
fallback 後に使った model はどれか？
この切り替えは trace に入ったのか？
```

これらが provider adapter の中に隠れると、後続の trace と eval はモデル経路の変化を見られません。

fallback はモデル呼び出し経路を変えることがあります。

しかしイベントのセマンティクスは変えてはいけません。

### 悪い匂い七：provider capability が profile / CLI を直接汚染する

provider capability は有用です。

たとえば、そのモデルが tool calls、JSON schema、reasoning summary、vision input、parallel tool calls をサポートしているかどうかです。

しかし、これらの能力はまず Provider Runtime によって内部 capability へ正規化されるべきです。

profile、CLI、resolver は、特定 provider の私有フィールドに直接依存すべきではありません。

## 十三、最小テストはどう書くべきか

M2 のこの層のテストは、「モデルが回答できる」ことだけを測るべきではありません。

境界を測る必要があります。

第一のテスト：provider tool call が intent に正規化される。

```ts
it("normalizes provider tool calls into tool intent events", async () => {
  const provider = fakeProvider([
    providerToolCall({
      id: "call_1",
      name: "bash",
      input: { command: "npm test" },
    }),
  ]);

  const events = await collect(providerRuntime.stream(request));

  expect(events).toContainEqual({
    type: "tool_intent.proposed",
    intent: {
      toolName: "bash",
      input: { command: "npm test" },
      providerCallId: "call_1",
    },
  });
});
```

第二のテスト：provider runtime はツールを実行しない。

```ts
it("does not execute tools inside provider runtime", async () => {
  const toolExecutor = vi.fn();

  await collect(providerRuntime.stream({
    ...request,
    tools: describeToolsForModel(registry),
  }));

  expect(toolExecutor).not.toHaveBeenCalled();
});
```

この種のテストは重要です。

機能を測っているのではありません。

アーキテクチャの規律を測っています。

第三のテスト：tool-call delta は完全になってから proposed intent を出さなければならない。

```ts
it("assembles streamed tool call deltas before proposing intent", async () => {
  const events = await collect(providerRuntime.stream(deltaRequest));

  expect(events.map((event) => event.type)).toEqual([
    "model.started",
    "tool_intent.delta",
    "tool_intent.delta",
    "tool_intent.proposed",
    "model.finished",
  ]);
});
```

第四のテスト：provider error と tool error を混ぜない。

```ts
it("maps provider errors without creating tool observations", async () => {
  const events = await collect(providerRuntime.stream(rateLimitedRequest));

  expect(events).toContainEqual(
    expect.objectContaining({
      type: "provider.error",
      kind: "rate_limit",
      retryable: true,
    })
  );

  expect(events.some((event) => event.type === "tool.observed")).toBe(false);
});
```

第五のテスト：provider runtime は session state を持たない。

```ts
it("keeps provider runtime request-scoped", async () => {
  const first = await collect(providerRuntime.stream(firstRequest));
  const second = await collect(providerRuntime.stream(secondRequest));

  expect(first).not.toDependOn(second);
  expect(providerRuntime).not.toExposeSessionMessages();
});
```

第六のテスト：tool result は Core が投影してから provider に渡される。

```ts
it("sends projected observations as model messages without executing tools", async () => {
  const messages = contextProjection.buildModelMessages({
    sessionEvents: [
      toolObservedEvent({
        providerCallId: "call_1",
        content: "npm test failed with exit code 1",
      }),
    ],
  });

  const providerRequest = requestBuilder.build({
    ...request,
    messages,
  });

  expect(providerRequest).toContainProviderToolResultMessage();
  expect(toolExecutor).not.toHaveBeenCalled();
});
```

これらのテストは、コードに冷静さを保たせます。

誰かが tool execution を provider runtime に押し込もうとした瞬間、テストは不自然になり始めます。

それこそが良いテストの価値です。

## 十四、この記事はいったい何を届けたのか

この記事は完全な Tool Runtime を届けるものではありません。

完全な Permission Runtime を届けるものでもありません。

届けたのは、M2 Provider Runtime の境界です。

```text
Provider Runtime ができること：
- 本物のモデルを呼ぶ
- AI SDK または provider SDK に適配する
- モデルから見える tool schema を送る
- text / reasoning / finish / usage を正規化する
- tool-call delta を組み立てる
- ToolIntent を産出する
- provider error を写像する
- fallback 後の出力も統一された ModelEvent に合流させる

Provider Runtime がしてはいけないこと：
- ツールを実行する
- session state を持つ
- loop を続けるかどうかを決める
- 権限承認を行う
- ツール結果を切り詰める
- 最終 observation を書き込む
- provider raw object を core event として扱う
- provider 私有形式を Core へ貫通させる
```

これが解決する問題はこうです。

```text
本物の provider はシステムへ接続できる。
しかし provider がシステムを乗っ取ってはいけない。
```

新しく持ち込む複雑さはこうです。

```text
標準の ModelEvent、ToolIntent、ProviderError、stream assembler が必要になる。
```

これは自然に次の記事へつながります。

```text
provider が tool intent だけを返すなら、
Tool Runtime はどうやって intent を observation に変えるのか？
```

次の記事では、第三章の硬い部分に入ります。

```text
Tool Runtime：tool intent から observation へ。
```

そのとき、`validate -> permission -> execute -> observe` を本当に展開します。

この記事が残す記憶点は、とても単純です。

**provider はモデルの翻訳官であって、ツールの実行官ではありません。**

## 教学 Harness への落とし込み

real model を接続するとき、provider runtime は format adapter に徹します。provider の tool-call 表現を内部の `ToolCallContent` に変換し、内部の `ToolResultMessage` を provider が求める tool message へ戻します。file を読まず、command を実行せず、tool の許可も判断しません。これにより provider を変えても loop、tools、session に影響しません。

---

GitHub ソース: [00-12-provider-runtime-tool-intent.md](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-12-provider-runtime-tool-intent.md)
