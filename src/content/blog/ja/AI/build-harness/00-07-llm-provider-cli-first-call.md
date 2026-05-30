---
title: "LLM Provider 接続：CLI に最初のモデル呼び出しを完了させる"
description: "これまでの数本では、ずっと Agent と Harness の境界について話してきました。"
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/00-07-llm-provider-cli-first-call/cover.png'
locale: "ja"
tags:
  - Agent
  - LLM Provider
  - CLI Agent
  - Streaming
  - 技術チュートリアル
aliases:
  - LLM Provider 接続
  - CLI の最初のモデル呼び出し
  - Provider Contract
---

# LLM Provider 接続：CLI に最初のモデル呼び出しを完了させる

これまでの数本では、ずっと Agent と Harness の境界について話してきました。

ここでようやく、本当に動く最初のコードを書きます。小さな CLI から実際の大規模モデルを呼び出せるようにするのです。

この一歩は、あまりにも簡単に見えます。

多くの人が最初に思いつくのは、だいたいこういう形です。

```text
npm install openai
client.responses.create() を書く
ユーザー入力を送る
text を出力する
```

単なる demo を作るだけなら、もちろんこれが最速です。

ユーザーがターミナルでこう入力します。

```text
このプロジェクトのテストがなぜ失敗しているか見て、修正して。
```

プログラムはこの一文をモデルに送り、モデルは分析を返します。最初の一回が通ると、かなりの達成感があります。CLI ができた。モデルもつながった。ターミナルが文字を吐き始めた。

ただしここには、Agent Harness 全体にとって最初のアーキテクチャ上の分岐が隠れています。

私たちは「どこか一社の API を呼ぶスクリプト」を書いているのでしょうか。それとも「将来 Agent Loop、Tool Runtime、Context、Session、Permission、Eval が育っていくシステム」を書いているのでしょうか。

この二つは、初日にはほとんど同じ姿をしています。

違いは、たった一本の境界線です。

**provider はモデル能力の適配層であって、Agent core ではありません。**

この境界を引かないと、その後の複雑さはすべて core に逆流します。

```text
OpenAI の messages 形式
Anthropic の content block
ある provider の streaming event
別の provider の tool call delta
HTTP 429、529、timeout、quota exceeded
SDK が投げる固有の例外クラス
モデル名、baseURL、header、api version
```

こうしたものが少しずつ Agent Loop の中へ入り込んでいきます。

その頃には、core はもう「タスクを前へ進める runtime」ではなく、provider ごとの if-else の塊になっています。

だからこの記事で答えたい問いは、次のものではありません。

> 特定のモデル API をどう呼び出すか？

そうではなく、次の問いです。

> 実際の大規模モデルを最小 CLI に接続しながら、provider の詳細でその後の Agent アーキテクチャを汚染しないにはどうすればよいか？

引き続き同じ例を使います。ユーザーのテスト失敗修正を手伝う、小さな CLI Agent です。

ただしこの記事では、まだファイルを読ませません。コマンドも実行させません。実際にコードを直すこともしません。

最初の版でやることは三つだけです。

```text
chat：ユーザー入力をモデルへ送り、完全な回答を受け取る
stream：モデル出力をイベントストリームとしてターミナルへ表示する
error mapping：provider 固有のエラーを runtime が理解できるエラーへ写像する
```

これだけでも十分に重要です。

Agent の後続のすべての能力は、「この一回のモデル呼び出しで、いったい何が起きたのか」から始まるからです。

## 問題の連鎖

![CLI の最初のモデル呼び出しも provider contract を先に通すべき理由を説明し、provider の詳細が Agent core を汚染するのを避ける](assets/00-07-llm-provider-cli-first-call/photo-01-provider-contract-boundary.png)

この記事では、具体的なベンダー能力を比較しません。また、ある API の最新の命名を追いかけることもしません。実際のコードで使うインターフェイス項目は、実装時点の公式ドキュメントに従う必要があります。ここではまず、システムの境界を固定します。

この記事の問題の連鎖はこうです。

```text
特定の API を直接呼ぶのが最速
-> しかし provider ごとに messages、streaming、error、tool call の形式が違う
-> その差分を core に書き込むと、Agent Loop が provider の詳細で汚染される
-> だから先に統一 provider contract を定義する
-> provider adapter が統一リクエストを特定 API へ翻訳する
-> さらに特定 API のレスポンスを統一 model events へ翻訳し戻す
-> 第一版では chat、stream、error mapping だけを届ける
-> tool intent と event contract には拡張場所だけを残し、provider 内で tool は実行しない
```

図にするとこうなります。

![LLM Provider 接続：CLI に最初のモデル呼び出しを完了させる Mermaid 1](assets/00-07-llm-provider-cli-first-call/mermaid-01.png)

この図でいちばん大事なのは、「adapter を一層かぶせた」ことではありません。

いちばん大事なのは、二つの翻訳です。

```text
統一リクエスト -> provider 固有 API
provider 固有レスポンス -> 統一 model events
```

この二つの翻訳が安定していれば、後ろに来る Agent Loop は、底でどのモデルを呼んでいるかを知る必要がありません。

知るべきことは、これだけです。

```text
このモデル呼び出しが始まった。
モデルがテキストを一部出力した。
モデルが終了した。
モデルでリトライ可能なエラーが起きた。
モデルで認証エラーが起きた。
モデルが将来 tool intent を提案するかもしれない。
```

これが provider contract の価値です。

抽象化能力を見せびらかすためではありません。

後続のシステムが API の詳細を背負って走らなくて済むようにするためです。

## 一、最初のモデル呼び出しをなぜ core に直接書かないのか？

まず、いちばん書きやすい版から始めましょう。

CLI を作りたいとします。

もっとも直接的な擬似コードはこうです。

```ts
const input = await readLine("> ")

const response = await openai.responses.create({
  model: "some-model",
  input: [
    { role: "user", content: input }
  ]
})

console.log(response.output_text)
```

このコード自体に問題はありません。

むしろ最初の手触り確認としては使うべきです。API key は使えるか、ネットワークは通るか、モデルは回答できるか、ターミナル出力は正常か。

しかし、それを core の形にしてはいけません。

なぜでしょうか。

core が今後答えなければならない問いは、「OpenAI をどう呼ぶか」ではないからです。むしろ次のような問いです。

```text
このターンのユーザー目標は何か？
現在の session ではすでに何が起きたのか？
このターンでモデルに見せてよい context はどれか？
モデル出力の各イベントを event log にどう入れるか？
streaming が途中で切れたら、状態をどう締めるか？
provider がエラーを返したら、runtime はリトライするのか、降格するのか、ユーザーに設定修正を促すのか？
モデルが tool call を提案したら、誰が検証し、承認し、実行し、結果を戻すのか？
```

これらの問いは、具体的な provider とは関係ありません。

これらは Agent Runtime に属します。

provider SDK の呼び出しを core に書き込むと、core はすぐにこうなり始めます。

```ts
if (provider === "openai") {
  // OpenAI message format
  // OpenAI stream event format
  // OpenAI error classes
} else if (provider === "anthropic") {
  // Anthropic content blocks
  // Anthropic stream events
  // Anthropic error types
} else if (provider === "local") {
  // local server schema
}
```

最初はほんの三行、五行です。

しかし streaming、リトライ、usage 集計、function calling、reasoning blocks、response id、rate limit header、model fallback を足していくと、core は「provider 詳細博物館」になります。

これは抽象化への潔癖ではありません。

後続の拡張が崩れるかどうかの問題です。

小さな CLI Agent が最終的にやりたいことは、テスト失敗の修正です。

そこへ向かう過程では、次の段階を通ります。

```text
最初のモデル呼び出し
-> 複数ターンの Agent Loop
-> tool intent
-> ファイル読み取り
-> コマンド実行
-> エラー observation の回填
-> context 圧縮
-> session replay
-> permission
-> eval
```

最初の一歩で provider を core まで貫通させると、その後のすべての一歩が引きずられます。

だから第一版のコードには、とても素朴な規律が必要です。

```text
core はこのプロジェクト自身のモデル契約だけを知る。
provider adapter だけが特定 API を知る。
```

## 二、Provider は Model でも Agent Core でもない

名前づけは、人をよく迷わせます。

私たちはよく「モデルを接続する」と言うので、コードの中に `Model` クラスが現れるかもしれません。

しかし Agent システムでは、まず三つの概念を分けておくのがよいです。

```text
Model：リモートまたはローカルの推論能力
Provider：ある種のモデル能力へアクセスするための適配層
Agent Core：モデルイベントを中心にタスクを前へ進める runtime
```

`Model` は能力の出どころです。

それは OpenAI、Anthropic、Google、DeepSeek、Ollama、ローカル vLLM でもよいし、ある会社の内部モデルゲートウェイでもよいです。

`Provider` は、その能力にアクセスするためのエンジニアリング上のインターフェイスです。

base URL、header、SDK、リクエスト形式、stream event、エラー形式、モデル名のマッピングを知っています。

`Agent Core` はタスク推進システムです。

messages、session、context、loop、tool intent、tool execution、permissions、events、budget を知っています。

この三者の境界を混ぜてはいけません。

階層図にするとこうです。

![LLM Provider 接続：CLI に最初のモデル呼び出しを完了させる Mermaid 2](assets/00-07-llm-provider-cli-first-call/mermaid-02.png)

この図が表したいのは、とても硬い境界です。

```text
Adapter は provider API に依存してよい。
Core は provider contract にだけ依存できる。
```

これは、core が次のような判断を直接してはいけない、という意味です。

```text
Anthropic が content_block_delta を返したら...
OpenAI が response.output_text.delta を返したら...
ある SDK が RateLimitError を投げたら...
```

core が判断すべきなのは、次のようなことです。

```text
text_delta を受け取ったら、CLI 出力へ追記する。
message_stop を受け取ったら、このターンを終了する。
transient_error を受け取ったら、runtime policy に従ってリトライする。
auth_error を受け取ったら、設定確認をユーザーに促す。
tool_intent を受け取ったら、将来 Tool Runtime に渡す。
```

言い換えると、provider contract は「インターフェイスを一層多く書くこと」ではありません。

後続のすべての runtime 判断を provider の詳細から切り離すためのものです。

## 三、最小 Provider Contract はどんな形であるべきか？

第一版で欲張ってはいけません。

まだ Agent Loop はありません。ツールシステムもありません。context 圧縮もありません。

だから provider contract が担うべきなのは、一回のモデル呼び出しについての最小限の事実だけです。

```text
入力：このターンの messages、モデルパラメータ、abort signal、trace metadata
出力：モデルイベントストリーム
エラー：統一エラー型
```

まずは、こうしたインターフェイスのスケッチから始められます。

```ts
type Role = "system" | "user" | "assistant"

interface ChatMessage {
  role: Role
  content: string
}

interface ChatRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  maxOutputTokens?: number
  abortSignal?: AbortSignal
  metadata?: {
    sessionId?: string
    turnId?: string
  }
}

type ModelEvent =
  | { type: "message_start"; provider: string; model: string }
  | { type: "text_delta"; text: string }
  | { type: "message_stop"; usage?: TokenUsage; stopReason?: string }
  | { type: "tool_intent"; name: string; argumentsText: string; id?: string }
  | { type: "error"; error: ProviderError }

interface TokenUsage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

interface ProviderError {
  kind:
    | "auth"
    | "permission"
    | "rate_limit"
    | "quota"
    | "invalid_request"
    | "context_length"
    | "timeout"
    | "network"
    | "overloaded"
    | "server"
    | "unknown"
  retryable: boolean
  message: string
  provider: string
  requestId?: string
  statusCode?: number
  cause?: unknown
}

interface LlmProvider {
  name: string
  chat(request: ChatRequest): Promise<ChatResult>
  stream(request: ChatRequest): AsyncIterable<ModelEvent>
}

interface ChatResult {
  text: string
  usage?: TokenUsage
  stopReason?: string
  raw?: unknown
}
```

このインターフェイスは最終回答ではありません。

ただの出発点です。

それでも、ここには重要な選択がいくつか入っています。

第一に、`messages` は私たち自身のメッセージ形式です。

OpenAI の `input` でも、Anthropic の `messages + system` でも、どこかのローカルサービスの `prompt` 文字列でもありません。

Provider adapter が翻訳を担当します。

第二に、`stream()` が返すのは `ModelEvent` です。

CLI が SSE を直接解析すべきではありません。

Runtime も provider の raw stream chunk を直接受け取って判断すべきではありません。

第三に、`tool_intent` はイベント型に入れますが、第一版ではツールを実行しません。

これは拡張場所です。

後でモデルが function call / tool use / structured action を出力する可能性がありますが、provider の責務は「モデルが出した意図を統一イベントへ翻訳する」ところまでです。

ツールの実行は Tool Runtime の仕事です。

第四に、エラーをそのまま上位へ投げません。

より正確には、adapter が内部で SDK / HTTP / SSE エラーを捕まえ、それを `ProviderError` に写像できます。

Runtime が気にするのは、どの SDK のクラス名かではありません。気にするのは次のことです。

```text
これは認証エラーか？
これは権限エラーか？
これはレート制限か？
これは context が長すぎるのか？
これはリトライ可能な一時エラーか？
```

これこそ runtime が判断に使える情報です。

## 四、Messages：なぜ統一メッセージ形式は特定 API をそのまま写してはいけないのか？

最初の呼び出しでいちばん踏みやすい罠は、ある provider の messages 形式をシステム内部形式として扱ってしまうことです。

たとえば、ある API はこういう形式を使います。

```json
[
  { "role": "system", "content": "..." },
  { "role": "user", "content": "..." }
]
```

別の API では、system 指示を独立したフィールドに置きます。

また別の API では、`content` は文字列ではなく content blocks です。

```json
[
  { "type": "text", "text": "..." },
  { "type": "image", "source": "..." }
]
```

これは最も表面的な差分にすぎません。

Agent の場面に入ると、messages はさらに多くのものを担います。

```text
assistant の自然言語返信
assistant の tool intent
tool result / observation
圧縮 summary
システムイベント summary
ユーザー中断の説明
復帰後の continuation message
```

内部メッセージ形式が特定 provider と結びつくと、後で二つの問題が起きます。

第一に、provider の切り替えが非常に痛くなります。

adapter を一つ替えるだけでは済まず、runtime 全体が別のメッセージ構造を理解しなければなりません。

第二に、システム上の事実が provider の表現方法に縛られます。

たとえば、ある provider の tool call が assistant message の中の content block として表現されるとします。

だからといって、あなたのシステム内部でも tool intent を「assistant content の一つの block」として扱う必要はありません。

Harness では、tool intent はイベントとして扱うほうが自然です。

```text
model emitted tool intent
runtime validated intent
permission approved or denied
tool executed
observation appended
```

この流れは後で trace、replay、audit、eval に使われます。

provider raw JSON の塊で済ませるわけにはいきません。

だから第一版の内部 messages は素朴なままでよいです。

まだツールを接続していない CLI なら、必要な構造はこれだけです。

```ts
interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}
```

後で拡張するときに、自前の content part を導入すればよいです。

```ts
type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool_intent"; intentId: string; name: string; arguments: unknown }
  | { type: "tool_result"; intentId: string; content: string; isError?: boolean }
```

ただし、この段階では急ぎません。

最初の実践記事で守るべき原則は一つだけです。

```text
内部メッセージ形式は runtime の事実表現である。
provider メッセージ形式は adapter の伝送表現にすぎない。
```

## 五、Streaming：ターミナルが欲しいのは流れる体験、Runtime が欲しいのはイベントストリーム

![provider raw stream が adapter を通って ModelEvent に正規化され、それぞれ Runtime の記録と CLI 表示に入る様子を示す](assets/00-07-llm-provider-cli-first-call/photo-02-stream-event-normalization.png)

CLI が初めてモデルを呼ぶと、すぐに二つ目の問題にぶつかります。stream するべきかどうかです。

stream しなければ、コードは最も簡単です。

ユーザーが一文を入力し、ターミナルが数秒から数十秒止まり、その後で完全な回答を一度に表示します。

短い問答なら、それでも受け入れられます。

しかし今回の例ではこうです。

```text
このプロジェクトのテストがなぜ失敗しているか見て、修正して。
```

この記事ではまだツールを使いませんが、それでもモデルは長めの分析を出すかもしれません。

ターミナルがずっと無反応だと、ユーザーはプログラムが固まったのではないかと疑います。

だから CLI には流式出力が必要です。

ただしここにも、簡単に歪んだ実装になりやすい点があります。

```text
streaming は provider の raw event をそのまま print することではない。
streaming とは、provider adapter が raw event を runtime event へ翻訳し、そのうえで CLI が表示方法を決めること。
```

provider ごとの streaming の差はかなり大きいです。

ある provider の流式イベントはテキスト delta です。

別の provider は、まず message start を送り、その後 content block start、content block delta、content block stop、message stop を送ります。

tool call の引数が JSON 文字列の断片として流れてくることもあります。

stream に ping が混じることもあります。

エラーが通常の HTTP response ではなく stream event として現れることもあります。

CLI がこれらの raw event を直接食べると、システムはすぐに抽象境界を失います。

よりよい流れはこうです。

![LLM Provider 接続：CLI に最初のモデル呼び出しを完了させる Mermaid 3](assets/00-07-llm-provider-cli-first-call/mermaid-03.png)

この図でいちばん重要なのは `Runtime-->>CLI: print delta` です。

CLI は表示を担当します。

Provider は翻訳を担当します。

Runtime は記録と判断を担当します。

この三つの責務を混ぜてはいけません。

流式出力は UI の小さな改善ではありません。

後続のシステム全体のイベント設計に影響します。

Agent がツールを呼べるようになると、stream には文字だけでなく、次のものが出てくる可能性があります。

```text
モデル生成の開始
モデルの可視テキスト出力
モデルによる tool intent の提案
まだ増分生成中の tool parameters
モデル停止
provider が返す usage
provider 接続中断
```

第一版から stream を統一 `ModelEvent` として設計しておけば、後でツールを足すのがずっと楽になります。

第一版をただの `process.stdout.write(rawChunk)` にしてしまうと、後で大きく直すことになります。

## 六、Error Mapping：エラーは文字列ではなく Runtime の判断入力である

![raw provider error が ProviderError に写像され、停止、リトライ、圧縮、設定案内などの runtime 判断を駆動する様子を説明する](assets/00-07-llm-provider-cli-first-call/photo-03-error-mapping-decision.png)

最初のモデル呼び出しが失敗したとき、最もよくある書き方はこうです。

```ts
try {
  await provider.chat(request)
} catch (error) {
  console.error(error)
}
```

これはデバッグには役立ちますが、Agent Runtime には足りません。

runtime がエラー文字列だけを見ても、判断できないからです。

runtime には分かりません。

```text
これは API key の設定ミスで、ユーザーに設定を直してもらうべきか？
これは権限不足で、停止すべきか？
これは 429 で、退避リトライすべきか？
これは quota 切れで、リトライしても無駄か？
これはリクエストが長すぎて、圧縮を起動すべきか？
これはネットワーク timeout で、リトライすべきか？
これは provider overloaded で、後で試すか provider を切り替えるべきか？
```

これらの判断は構造化されていなければなりません。

エラー写像は、エラーを「見栄えよく包む」ためではありません。

Runtime Guardrails の最初のレンガです。

まずは小さなエラー分類を定義できます。

```text
auth：認証失敗。通常はリトライ不可で、ユーザーに key 確認を促す
permission：アカウントまたはモデル権限不足。通常はリトライ不可
rate_limit：リクエストが速すぎる。退避リトライ可能
quota：残高または枠が尽きた。盲目的にリトライすべきではない
invalid_request：リクエスト形式エラー。コードまたは context 組み立ての問題
context_length：context が長すぎる。後で compaction を起動すべき
timeout / network：ネットワークの一時問題。リトライ可能
overloaded / server：provider 側の負荷またはサービスエラー。リトライまたは fallback 可能
unknown：保守的に扱い、raw cause を記録する
```

写像できれば、runtime はより明確な策略を書けます。

```ts
function decideProviderFailure(error: ProviderError): RuntimeDecision {
  if (error.kind === "auth" || error.kind === "permission") {
    return { action: "stop", userMessage: "モデル認証情報またはモデル権限を確認してください。" }
  }

  if (error.kind === "quota") {
    return { action: "stop", userMessage: "モデル枠が不足しています。リトライでは解決しません。" }
  }

  if (error.kind === "context_length") {
    return { action: "compact_and_retry" }
  }

  if (error.retryable) {
    return { action: "retry_with_backoff" }
  }

  return { action: "stop", userMessage: "モデル呼び出しに失敗しました。ログ確認が必要です。" }
}
```

ここでは、まだ完全なリトライを実装していない点に注意してください。

この記事ではエラー写像を整えるだけで十分です。

次章で Agent Loop と Runtime Guardrails を扱うとき、リトライ、退避、budget、中断が本格的にシステムへ入ってきます。

しかしこの一歩がないと、次章では文字列を相手に判断するしかありません。

それはあまりにも脆いです。

エラーの流れを図にするとこうです。

![LLM Provider 接続：CLI に最初のモデル呼び出しを完了させる Mermaid 4](assets/00-07-llm-provider-cli-first-call/mermaid-04.png)

この図でいちばん大事なのは次の点です。

```text
provider raw error は runtime の振る舞いを直接決めない。
統一 ProviderError こそが runtime の判断入力である。
```

小さな CLI には、少しくどく見えるかもしれません。

しかしそれがテスト失敗の修正を手伝い始めたとき、「なぜ rate limit 時に狂ったようにリトライしてお金を燃やさなかったのか」の理由になります。

## 七、Tool Intent：先にインターフェイスだけを残し、Provider にツールを実行させない

この記事の題名は、最初のモデル呼び出しです。

本来なら、まだツールの話ではありません。

それでも provider contract には、先に一つ穴を残しておく必要があります。`tool_intent` です。

理由は単純です。

現代のモデル API は、多くの場合 tool use / function calling / structured output をすでにサポートしています。

provider ごとにツール意図の表現は異なります。

```text
function_call と呼ぶものがある
tool_use と呼ぶものがある
content block として表すものがある
response item として表すものがある
streaming delta の中で arguments が少しずつ組み上がるものがある
```

ツールの章になってから provider event を作り直すと、コストはさらに大きくなります。

ただし、インターフェイスを残すことはツールを実行することではありません。

ここは非常に重要です。

```text
Provider はモデルが tool intent を出したことを発見してよい。
Provider はツールを実行してはいけない。
```

なぜでしょうか。

ツール実行には Harness の一連のパイプラインが必要だからです。

```text
intent
-> schema validation
-> permission
-> sandbox / working directory
-> execution
-> truncation
-> observation
-> event log
-> context reinjection
```

これらは provider に属しません。

Provider はモデル能力の適配だけを担当します。

ある `read_file` ツールがユーザーディレクトリを読んでよいか、provider が知るべきではありません。

`bash` に人間の確認が必要かどうかも、provider が知るべきではありません。

ツール結果を次の messages へ直接差し戻すべきでもありません。

だから第一版 contract では、こういう形で予約しておけます。

```ts
type ModelEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_intent"; id?: string; name: string; argumentsText: string }
  | { type: "message_stop"; stopReason?: string }
  | { type: "error"; error: ProviderError }
```

ただし Runtime の第一版では、`text_delta` と `message_stop` だけを処理します。

`tool_intent` を受け取ったら、まず記録し、明確な unsupported を返してよいです。

```ts
if (event.type === "tool_intent") {
  throw new RuntimeError(
    "Tool intent was emitted, but Tool Runtime is not enabled in this milestone."
  )
}
```

これは未完成に見えます。

実際には、境界が明確なのです。

本篇の目標は次のとおりです。

```text
モデルが回答できる。
モデルが流式出力できる。
モデルエラーを runtime が理解できる。
モデルが将来 tool intent を出したとき、contract に置き場所がある。
```

ただしツールの実行権は、あくまで次の層に残します。

この規律は後で何度も出てきます。

**モデルが提案し、システムが実行する。**

Provider はモデル能力の適配層なので、せいぜい「モデルの提案」を翻訳するところまでです。

実行システムではありません。

## 八、CLI 第一版はどう落とし込むべきか？

ここまでの境界を、最小のファイル構造にまとめます。

急いで大きなフレームワークにする必要はありません。

第一版はとても小さくできます。

```text
src/
  cli.ts
  runtime/
    run-chat-turn.ts
  providers/
    contract.ts
    openai-provider.ts
    anthropic-provider.ts
    errors.ts
  config/
    load-provider-config.ts
```

呼び出しの流れはこうです。

```text
cli.ts
-> ユーザー入力を読む
-> load provider config
-> create provider adapter
-> runChatTurn()
-> provider.stream()
-> Runtime が ModelEvent を受け取る
-> CLI が text_delta を表示する
```

擬似コードです。

```ts
async function main() {
  const input = await readUserInput()
  const config = loadProviderConfig(process.env)
  const provider = createProvider(config)

  await runChatTurn({
    provider,
    messages: [
      {
        role: "system",
        content: "あなたは慎重な CLI プログラミングアシスタントです。まず分析し、コマンドを実行済みであるかのように装ってはいけません。"
      },
      {
        role: "user",
        content: input
      }
    ],
    onTextDelta(delta) {
      process.stdout.write(delta)
    }
  })
}
```

`runChatTurn()` は contract だけを知ります。

```ts
async function runChatTurn(args: {
  provider: LlmProvider
  messages: ChatMessage[]
  onTextDelta: (text: string) => void
}) {
  const request: ChatRequest = {
    model: "default",
    messages: args.messages,
    metadata: {
      turnId: crypto.randomUUID()
    }
  }

  for await (const event of args.provider.stream(request)) {
    switch (event.type) {
      case "message_start":
        break

      case "text_delta":
        args.onTextDelta(event.text)
        break

      case "message_stop":
        return

      case "tool_intent":
        throw new Error("Tool Runtime is not enabled yet.")

      case "error":
        throw mapProviderErrorToRuntimeError(event.error)
    }
  }
}
```

このコードの中には、provider 固有のフィールドが一つもありません。

`content_block_delta` はありません。

`response.output_text.delta` もありません。

どこかの SDK のエラークラスもありません。

それらはすべて adapter の中に閉じ込めます。

これこそが第一版で最も重要なエンジニアリング成果です。

「一文に答えられるようになった」ことではありません。

「一文に答えられるうえで、後から Agent が育つ場所も残した」ことです。

## 九、Provider Adapter の中では実際に何をするのか？

Adapter の責務は、四つの動詞に圧縮できます。

```text
normalize request
call provider
normalize stream
normalize error
```

外に対しては、同じインターフェイスを実装します。

```ts
class OpenAIProvider implements LlmProvider {
  name = "openai"

  async chat(request: ChatRequest): Promise<ChatResult> {
    // translate request
    // call OpenAI
    // translate result
  }

  async *stream(request: ChatRequest): AsyncIterable<ModelEvent> {
    // translate request
    // call OpenAI streaming API
    // yield unified ModelEvent
  }
}
```

内側では、provider のあらゆる詳細を知っていて構いません。

たとえば次のようなことです。

```text
system message はどのフィールドに置くべきか？
user message を content block にどう変換するか？
stream event のうち可視テキストはどれか？
ping / keepalive にすぎないイベントはどれか？
usage はどのイベントに現れるか？
tool call arguments は partial JSON を累積する必要があるか？
error response の request id は header にあるのか body にあるのか？
ある HTTP status はどの ProviderError.kind に写像すべきか？
```

Adapter は薄ければ薄いほどよい、というものではありません。

薄くあるべきなのは「業務判断」であり、厚くあるべきなのは「プロトコル翻訳」です。

つまりこういうことです。

```text
adapter はタスクをどう進めるかを決めない。
adapter はツールを実行してよいかを決めない。
adapter はエラーを何回リトライすべきかを決めない。

しかし provider API の差分は、adapter が真面目に消化しなければならない。
```

多くのシステムは、これと反対の失敗をします。

```text
adapter が SDK を一枚包むだけ
raw response をそのまま runtime に投げる
runtime があちこちで provider-specific なフィールドを判断する
```

これは adapter が翻訳責任を果たしていないのと同じです。

import パスの置き場所を変えただけです。

合格点の provider adapter は、runtime から provider の訛りを見えなくします。

## 十、設定と認証情報：API Key を messages と log に入れない

最初のモデル呼び出しには、もう一つとても現実的な問題があります。API key をどこに置くかです。

小さな CLI なら、最も簡単なのは環境変数です。

```text
OPENAI_API_KEY
ANTHROPIC_API_KEY
LLM_PROVIDER
LLM_MODEL
LLM_BASE_URL
```

ここでは、いくつか小さな規律を守る必要があります。

第一に、認証情報は provider config にだけ入り、messages には入りません。

「現在の設定をモデルに知らせる」ために key、base URL、organization id、header 情報を prompt に入れてはいけません。

モデルはそれを知る必要がありません。

第二に、エラーログに完全なリクエストヘッダーを出してはいけません。

Provider デバッグでは、raw request / raw response を出力したくなりがちです。

そこに Authorization header が含まれていると、その後の session log、trace、bug report がすべて汚染されます。

第三に、CLI のユーザー可視エラーと内部ログを分けます。

ユーザーが知る必要があるのはこういうことです。

```text
認証に失敗しました。OPENAI_API_KEY を確認してください。
モデル枠が不足しています。請求情報を確認するか、provider を切り替えてください。
リクエストが長すぎます。後続バージョンでは context 圧縮を起動します。
```

内部ログが知る必要があるのはこういうことです。

```text
provider
statusCode
requestId
error kind
retryable
turnId
```

しかし機密 header を出力する必要はありません。

これは provider contract の内容ではないように見えるかもしれません。

実際には、最初のモデル呼び出しで必ず確立すべきエンジニアリング習慣です。

Agent のログはどんどん増えるからです。

早い段階で縛っておかないと、後で秘密情報の漏洩を掃除するのはかなり痛くなります。

## 十一、テスト：core が正しいかを本物の API だけで判断しない

実モデルに初めて接続した後、多くの人は興奮して手動テストを続けます。

```text
hello と聞いてみる
エラーを説明してと聞いてみる
テスト失敗を直してと聞いてみる
出力が滑らかか見る
```

手動テストはもちろん必要です。

しかし core の正しさは、本物の API に依存してはいけません。

理由は単純です。

```text
本物の API は遅い
本物の API はお金がかかる
本物の API の出力は安定しない
本物の API は rate limit される
本物の API はネットワークで失敗することがある
本物の API のモデルバージョンは変わる
```

だから provider contract ができたら、fake provider を一つ用意すべきです。

```ts
class FakeStreamingProvider implements LlmProvider {
  name = "fake"

  async chat(): Promise<ChatResult> {
    return { text: "fake answer" }
  }

  async *stream(): AsyncIterable<ModelEvent> {
    yield { type: "message_start", provider: "fake", model: "fake-model" }
    yield { type: "text_delta", text: "テスト" }
    yield { type: "text_delta", text: "失敗" }
    yield { type: "text_delta", text: "では、まずログを集める必要があります。" }
    yield {
      type: "message_stop",
      stopReason: "end_turn",
      usage: { inputTokens: 10, outputTokens: 8 }
    }
  }
}
```

それを使って runtime をテストします。

```text
runChatTurn がすべての text_delta を表示する
message_stop の後に終了する
tool_intent が明確に拒否される
ProviderError が RuntimeError に写像される
AbortSignal 発火時に停止する
```

さらに実 adapter には、少量の統合テストまたは fixture テストを書きます。

```text
raw stream event -> ModelEvent
raw error body -> ProviderError
messages -> provider request
usage -> TokenUsage
```

こうすれば、本物の provider が変わっても、core の振る舞いは安定します。

これも Harness 的な考え方の早い段階での表れです。

```text
制御不能な外部システムを、テスト可能な契約の後ろに包む。
```

## 十二、この段階でよくある失敗形態

この記事のコード量は多くありませんが、失敗形態はたくさんあります。

一つ目の失敗は、「SDK をアーキテクチャだと思う」ことです。

コードのあちこちで特定 SDK を import します。

短期的にはとても速く動きます。

しかし後で provider を替えると、すべてのファイルを直すことになります。

二つ目の失敗は、「streaming を stdout trick として扱う」ことです。

受け取った chunk をそのまま表示します。

usage を記録し、stream error を処理し、tool intent を区別し、trace を作ろうとしたとき、統一イベントがないことに気づきます。

三つ目の失敗は、「エラーに message 文字列だけを残す」ことです。

ユーザーには英語の stack がそのまま見えます。

runtime もリトライすべきかどうか分かりません。

rate limit、quota、認証、context 過長が混ざり、後で guardrails が使えるデータがありません。

四つ目の失敗は、「provider がこっそりツールを実行する」ことです。

一部の provider SDK やサンプルでは tool use がとても手軽に書けるので、開発者は provider 層で直接関数を登録し、実行したくなります。

普通のチャットアプリなら便利かもしれません。

しかし Agent Harness では危険です。

ツール実行は必ず permission、sandbox、audit、event log を通らなければならないからです。

五つ目の失敗は、「raw response を session fact として扱う」ことです。

raw response は debug log に保存してもよいですが、runtime の主要な事実源にすべきではありません。

Agent が後で replay と eval を行うには、安定したシステムイベントが必要です。

```text
model_started
model_text_delta
model_stopped
provider_error
tool_intent_emitted
```

provider ごとの JSON ツリーではありません。

これらの失敗形態の背後にあるのは、実は一文です。

```text
最初のモデル呼び出しは終点ではなく、後続すべての runtime 責務への入口である。
```

## 十三、荷重を受ける経路：ユーザー入力からモデルイベントまで

この記事全体を一本の鎖に圧縮すると、こう見られます。

```text
ユーザー入力
-> CLI が読む
-> Runtime が ChatRequest を作る
-> Provider Contract が入力と出力を固定する
-> Adapter が provider API へ翻訳する
-> 実モデルが生成する
-> Adapter が ModelEvent へ翻訳する
-> Runtime がイベントを処理する
-> CLI がテキストを表示する
-> Session が将来イベントを記録する
```

図にするとこうです。

![LLM Provider 接続：CLI に最初のモデル呼び出しを完了させる Mermaid 5](assets/00-07-llm-provider-cli-first-call/mermaid-05.png)

この図には未来のノードがあります。`Tool Runtime` です。

今は灰色です。

それこそが本篇の境界です。

第 7 篇では、CLI に最初のモデル呼び出しを完了させるだけです。

第 8 篇で初めて、最小 Agent Loop に入ります。

第 10 篇で Intent / Execution 分離を扱う頃には、この灰色のノードがツール実行パイプライン全体になります。

## 十四、この篇では結局何を届けたのか？

この記事を読み終えた時点で、コードのレベルでは四つのものが届けられているべきです。

第一に、実行できる CLI です。

ユーザーはターミナルで一文を入力でき、モデルは回答を流式出力できます。

第二に、provider contract です。

core は `LlmProvider`、`ChatRequest`、`ModelEvent`、`ProviderError` だけに依存します。

第三に、少なくとも一つの本物の provider adapter です。

それは内部リクエストを特定 API へ翻訳し、さらにレスポンスを統一イベントへ翻訳し戻します。

第四に、fake provider です。

これによって runtime テストは本物のモデルに依存しなくて済みます。

範囲外のものも明確にしておく必要があります。

```text
Agent Loop は作らない。
ツールは実行しない。
context 圧縮はしない。
自動リトライ策略は作らない。
provider fallback は作らない。
session replay は作らない。
```

これらが重要でないわけではありません。

ただ、それらは provider contract の上に立つ必要があります。

最初の実践記事で全部を詰め込むと、読者は各層がなぜ現れるのかを見失います。

必要なのは、はっきりした進化の線です。

```text
最初のモデル呼び出し
-> 最小 Agent Loop
-> Intent / Execution 分離
-> Tool Runtime
-> Context Engineering
-> Session / Replay
-> Permission / Eval / Harness
```

## 結び：最初の呼び出しは通す。同時に境界も残す

最初のモデル呼び出しは、簡単に過小評価されます。

見た目には、ただこうしているだけだからです。

```text
ユーザー入力
-> API を呼ぶ
-> 出力を表示する
```

しかし Agent Harness では、それは後ろに続くシステムの形を決める作業でもあります。

最初の一歩で特定 SDK を core に書き込むだけなら、後ろにはすぐ provider 詳細の泥沼が育ちます。

最初の一歩で provider contract を定義すれば、後ろには安定した荷重面ができます。

```text
モデル供給元を置き換えられる。
streaming を統一できる。
エラーで判断できる。
tool intent を Tool Runtime へ伸ばせる。
core はタスク推進に集中できる。
```

だからこの記事の記憶点は、一文に圧縮できます。

**Provider は Agent Core ではない。Provider はモデル能力を統一イベントへ翻訳するだけで、ツール実行権も session の事実源も持たない。**

次回は、このモデル呼び出しの外側に最小 Agent Loop を足します。

つまり、次の状態から、

```text
一度聞き、一度答える
```

次の状態へ進みます。

```text
判断し、行動し、観察し、もう一度判断する
```

そのとき、最初のモデル呼び出しはシステム全体ではなく、ループの中の一ステップになります。

## 教学 Harness への落とし込み

参考プロジェクトが示す重要な順序は、内部 protocol が安定してから real provider adapter を接続することです。まず `TeachingModel.complete()` が内部の `AssistantMessage` を返す形にします。その後で OpenAI-compatible の `content`、`tool_calls`、`finish_reason` を変換します。API Key、base URL、header は config と adapter log の領域であり、messages、event log、model context に入れてはいけません。

---

GitHub ソース: [00-07-llm-provider-cli-first-call.md](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-07-llm-provider-cli-first-call.md)
