---
title: "M0 Core Kernel：実モデルをシステムへ接続し、システムを乗っ取らせない"
description: "これまでの記事では、Agent と Harness の考え方を整理してきました。"
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/00-09-m0-core-kernel/cover.jpg'
locale: "ja"
tags:
  - Agent
  - Harness
  - Core Kernel
  - Provider
  - Agent Runtime
  - 技術チュートリアル
qiita_tags:
  - Agent
  - Harness
  - CoreKernel
  - AgentRuntime
  - 技術チュートリアル
aliases:
  - M0 Core Kernel
  - Agent Core Kernel
  - 本物の大規模モデル接続
---
# M0 Core Kernel：実モデルをシステムへ接続し、システムを乗っ取らせない

前の章では、Agent と Harness の考え方を整理してきました。

エージェントはプロンプトではなく、`Model + Loop + Tools + State` で構成される実行システムであることがわかります。また、ハーネスは別のより賢いエージェントではなく、モデルの外部にある制御システムであることもわかっています。さらに遡って、読者は通常、最初の実際のプロジェクト フォークに遭遇します。```text
现在要把真实大模型接进来了。
到底应该先写一个 provider 调用，还是先写 core contracts？
```多くのプロジェクトは前者を選択します。

まず、OpenAI、Anthropic、Gemini、または任意のプロバイダーの API に接続します。ストリーム出力が可能。ツール呼び出しを解析する機能。端末で回答を印刷できます。次に、ツールの実行を簡単に接続します。

このようにして、実行可能なデモをすばやく作成できます。```text
用户输入：帮我修复测试失败
-> provider 请求大模型
-> 模型返回 tool call
-> 程序执行 shell
-> 把结果拼回下一轮
```この道は短期的には楽しいです。

しかし、これには隠れた問題があります。システムの中心は、簡単に `runtime` から `provider` へ滑ってしまいます。

最初は、プロバイダーはテキストを返すだけです。その後、プロバイダーはツール呼び出しを返します。その後、プロバイダーの応答形式によってツール オブジェクトがどのようなものになるかが決まります。その後、エラー処理、ストリーミング、メッセージ、ツールの結果、コンテキスト構造はすべてプロバイダーに関連付けられるようになりました。最終的には、エージェント コア全体が独自のコントラクトを中心に展開しているのではなく、特定の企業のモデル API の戻り形式を中心に展開していることがわかります。

これは M0 コア カーネルが解決するものです。

M0 は、この記事における最小マイルストーン名であり、業界標準の成熟度評価ではありません。アーキテクチャを大きくするためのものでもありません。むしろ M0 は、システムを最小だが安定したカーネルへ絞り込むためのものです。```text
真实模型可以接进来。
但真实模型不能接管系统边界。
Provider 是能力入口，Core Kernel 才保存系统边界。
```チュートリアル全体から同じ例を引き続き使用してみましょう。```text
帮我看看这个项目为什么测试失败，并把它修好。
```パート 7 では、まず CLI に最初のモデル呼び出しを完了させます。パート 8 では、単一の回答を最小のエージェント ループに押し込みます。パート 9 までに、問題は次のようになります。

> 実際の大規模モデルがテキスト、ストリーミング イベント、ツール インテントを返し始めたとき、コアはそれに導かれるのではなく、どのようにしてそれをキャッチするのでしょうか?

この記事は、完全なツール ランタイムの作成を急いでいるわけではありません。また、権限システムの構築を急いでいるわけでもありません。それは後の章です。

この記事では、M0 コア カーネルの境界設計のみを扱います。```text
contracts
registry
event bus
conversation state
runtime facade
```この5つの言葉は建築カタログのように聞こえますが、決して飾りではありません。彼らはそれぞれ、本当の質問に答えます。```text
contracts：provider 和 runtime 说同一种内部语言
registry：能力先登记，不能临时乱接
event bus：发生过什么必须变成事实流
conversation state：模型看到的是状态投影，不是全部事实
runtime facade：外部 CLI 调 runtime，而不是直接调 provider
```最初に一文:

**M0 Core Kernel の役割は、実モデルの出力をシステム内部イベントへ翻訳し、実行、状態、ログの制御権を runtime に残し続けることです。**

## 質問チェーン

![実 provider はモデルイベントとツールインテントだけを返し、実行権は core/runtime 側に残ることを説明する図](assets/00-09-m0-core-kernel/photo-01-core-provider-boundary.jpg)

この記事の質問チェーンは次のとおりです。```text
mock provider 能验证 loop，但不能暴露真实模型接入的复杂度
-> 真实 provider 会带来 streaming、tool call、错误、usage 和格式差异
-> 如果 core 直接依赖 provider 响应格式，系统边界会被模型 API 穿透
-> 所以必须先定义稳定 contracts，把 provider 输出归一成 ModelEvent 和 ToolIntent
-> ToolIntent 只是行动提议，执行、状态更新和事件日志仍由 runtime 控制
-> runtime 通过 registry 管能力，通过 event bus 记录事实，通过 state reducer 得到当前现场
-> CLI 和未来上层产品只调用 runtime facade，不直接碰 provider 和工具细节
```最初の概要図を描きます。

![M0 Core Kernel：実モデルをシステムへ接続し、システムを乗っ取らせない Mermaid 1](assets/00-09-m0-core-kernel/mermaid-01.png)

この図で最も重要なのは、モジュールの数ではなく、2 つの境界です。

第一に、プロバイダーが返してよいのは `ModelEvent` だけです。プロバイダーはシステムに「モデルがテキストを生成した」「モデルが tool intent を提案した」「モデルが final できると判断した」と報告できます。ただし、状態を直接変更したり、ツールを直接実行したりしてはいけません。

第二に、runtime はファクトログを持ちます。モデル出力、tool intent、ツール結果、状態変化、エラー、usage はすべて event bus に入るべきです。その後の state と context は、これらのイベントから折り畳まれるか投影されます。

この 2 つの境界が守られている場合、真のモデルへの接続は、コアの再書き込みではなく、プロバイダー アダプターを置き換えるだけになります。

## 一、なぜ M0 は「まず API を通す」ではないのか

コード インパルスの観点からは、プロバイダーを最初に記述するのが自然です。

まずこう書きたくなるかもしれません。```ts
async function callModel(prompt: string) {
  const response = await client.messages.create({
    model: "some-model",
    messages: [{ role: "user", content: prompt }],
  });

  return response.text;
}
```CLI は質問に答えることができます。

次にストリーミングを追加します。```ts
for await (const chunk of stream) {
  process.stdout.write(chunk.text);
}
```次のステップでツール呼び出しを追加します。```ts
if (chunk.tool_call) {
  await runTool(chunk.tool_call.name, chunk.tool_call.args);
}
```この時点で、デモにはすでにエージェントの雰囲気が漂っています。

しかし、危険はここからも始まります。

このコードは次の 3 種類の責任を組み合わせているためです。```text
provider protocol：怎么请求某个模型 API
agent semantics：模型输出到底表示什么
runtime authority：谁有权执行工具、更新状态、记录事实
```小規模なデモでは、3 つが混在していても問題ありません。プロバイダー、ツール、タスク、出力形式が 1 つしかないためです。

実際のプロジェクトに入ると、すぐに責任が生じます。

たとえば、2 番目のプロバイダーに接続すると、次の情報が表示されます。```text
有的 provider 把 tool call 放在 message content block 里
有的 provider 把 tool call 放在 function_call 字段里
有的 provider streaming 时先给 id，再分片给 args
有的 provider 错误分成 rate limit、overloaded、bad request、context length
有的 provider usage 最后才给
有的 provider 支持并行 tool call，有的默认顺序不同
```コアがプロバイダーの元の構造を直接使用する場合、次の違いがシステム全体に浸透します。```text
loop 要识别每家 provider 的工具格式
tool runtime 要知道 provider 的 tool id 规则
state 里保存 provider 私有字段
event log 里混着供应商响应对象
context builder 要按供应商历史格式拼 messages
测试要 mock 每家 provider 的返回形状
```現時点では、プロバイダーはアダプテーション層ではなくなります。

システムセンターとなります。

これはまさに M0 が阻止しようとしていることです。

本物のモデルを受け入れないわけではありません。代わりに、M0 を実際のモデルに接続する必要があります。実際のモデルがなければ、次のストリーミング、ツールの意図、エラー マッピング、使用法、およびコンテキストの圧力は単なる机上の言葉にすぎません。

ただし、接続方法を逆にする必要があります。```text
不是让 core 适配 provider。
而是让 provider 适配 core。
```言い換えれば、コアは最初に独自の内部言語を定義します。プロバイダー アダプターは、外部 API を内部言語に変換する役割を果たします。

契約というのはそのためにあるのです。

## 2. コアカーネル 「コア」とはどこにあるのでしょうか?

`Kernel` という言葉を聞くと、オペレーティング システムのカーネルを容易に思い浮かべます。このたとえをここで少し借用することはできますが、過度に神聖視しないでください。

このチュートリアルでは、Core Kernel は完全な OS ではなく、複雑なフレームワークでもありません。これは、Agent Harness における最小の安定した責任セットにすぎません。```text
1. 定义系统内部事件和对象
2. 接收 provider 输出，并归一成内部事件
3. 接收用户输入，并写入事件流
4. 根据事件流折叠出 conversation state
5. 从 registry 读取可用能力
6. 暴露一个 runtime facade 给 CLI 和上层调用
```何に対して責任が無いのでしょうか？```text
不负责把所有工具都实现完
不负责复杂权限审批
不负责长期记忆
不负责多 agent 协作
不负责远程沙箱
不负责生产级 eval
```これらは重要ですが、M0 の一部ではありません。

M0 の目標は、「1 ステップで正しく実行する」ことではなく、後続のすべてのレイヤーにブレのないベースを提供することです。

M0 は小さなコントロール サーフェスと考えることができます。

![M0 Core Kernel：実モデルをシステムへ接続し、システムを乗っ取らせない Mermaid 2](assets/00-09-m0-core-kernel/mermaid-02.png)

この図では、`Contracts` が中央のハード境界です。プロバイダーは、その応答をステートに直接詰め込みません。 CLI はプロバイダーを直接呼び出しません。このツールは、イベント ログ書き込みメッセージをバイパスしません。

これは、M0 と簡易デモの違いでもあります。

通常、単純なデモの中心は `while` です。```text
while true:
  call model
  if tool call: run tool
  else: print answer
```M0 の中心は一連のコントラクトです。```text
UserInputEvent
ModelEvent
ToolIntent
Observation
StateDelta
RuntimeEvent
```これは、インターフェイス名が適切であるためではなく、後続のアクセス許可、再生、圧縮、評価がすべてこれらのオブジェクトにかかるためです。

M0 にこれらのオブジェクトがない場合、レイヤーが追加されるたびに一時的な構造が追加されます。結局のところ、システムは表面では実行できますが、内部には真実の情報源がありません。

## 3. コントラクト: モデル出力は最初にシステム オブジェクトになる必要があります

最も重要な契約から始めましょう。

実際のモデルは多くのものを返します。```text
文本 token
thinking 或 reasoning 片段
tool call id
tool name
tool args
stop reason
usage
error
provider request id
stream done signal
```これらのものをそのままランタイムに組み込むことはできません。

Core に必要なのは、より安定したレイヤーです。```ts
type ModelEvent =
  | ModelTextDelta
  | ModelToolIntent
  | ModelUsage
  | ModelFinal
  | ModelError;

type ModelTextDelta = {
  type: "model.text.delta";
  runId: string;
  text: string;
};

type ModelToolIntent = {
  type: "model.tool.intent";
  runId: string;
  intentId: string;
  toolName: string;
  input: unknown;
  providerRef?: {
    provider: string;
    rawId?: string;
  };
};

type ModelFinal = {
  type: "model.final";
  runId: string;
  reason: "stop" | "tool_intent" | "length" | "error";
};
```この疑似コードの焦点は、フィールドが完全かどうかではなく、方向です。```text
provider 原始响应
-> provider adapter
-> core ModelEvent
```コアに入ると、ランタイムは `ModelEvent` のみを認識します。

これにより、いくつかの利点がもたらされます。

まず、ループはプロバイダーの詳細を気にしません。

あるプロバイダーが `tool_use` というツールを呼び出し、別のプロバイダーが `function_call` というツールを呼び出した場合、これはアダプターにのみ影響します。ループにはまだ `model.tool.intent` が表示されます。

第 2 に、ツールの実行はプロバイダーに関連付けられていません。

`intentId` は、コアのツール インテント ID です。 `providerRef.rawId` は、バックフィルを容易にするために元の ID を保持できますが、実行層はそれをシステムの信頼できるソースとして信頼できません。

第三に、イベント ログを安定させることができます。

今日モデルを変え、明日 SDK をアップグレードし、明後日ストリーミング形式が変わるかもしれません。それでもアダプターが同じ `ModelEvent` を出力する限り、履歴イベント全体が無効になることはありません。

第 4 に、テストを簡素化できます。

M0 のコア テストでは、実際の API の完全な応答をモックする必要はありません。 `ModelEvent` に直接フィードできます。```ts
const events: ModelEvent[] = [
  { type: "model.text.delta", runId, text: "我需要先运行测试。" },
  {
    type: "model.tool.intent",
    runId,
    intentId: "intent_1",
    toolName: "run_tests",
    input: { command: "npm test" },
  },
  { type: "model.final", runId, reason: "tool_intent" },
];
```これがコントラクトの価値です。コントラクトは、プロバイダー SDK からコア セマンティクスを抽象化します。

ここでは 1 つの境界を特に強調する必要があります。

**ToolIntent は ToolExecution ではありません。 **

このモデルは次のことを提案しています。```json
{
  "toolName": "run_tests",
  "input": {
    "command": "npm test"
  }
}
```これは、モデルが次にテストを実行する必要があると考えていることを意味します。

テストが実行されたことを示すものではありません。

また、このコマンドの実行を許可しなければならないという意味でもありません。

これは、ツールの結果がプロバイダー自体によって書き戻されるという意味ではありません。

ToolIntent はシステム内の単なるアプリケーション フォームです。

第 10 回の記事では、`Intent / Execution` の分離について具体的に説明します。この記事ではまず、M0 の契約では 2 つのタイプを分離する必要があるという基礎を築きます。

このステップを分離しないと、後で権限を追加するのが面倒になります。なぜなら、システムはすでに「モデルが実行すると言っている」と「システムが実行した」という混合オブジェクトでいっぱいだからです。

## 4. プロバイダー: これはシステム センターではなく、翻訳レイヤーです。

実際のプロバイダーの責任は非常に狭いはずです。```text
接收 core 的 ModelRequest
调用外部模型 API
把外部响应翻译成 ModelEvent stream
把 provider 错误映射成 core 错误
把 usage、latency、request id 作为事件或 metadata 返回
```次のことを行うべきではありません。```text
不决定哪些工具真正执行
不直接修改 conversation state
不直接追加 session event log
不决定权限
不决定任务是否完成
不把 provider 私有 messages 格式暴露给上层
```次のようにプロバイダー インターフェイスを圧縮できます。```ts
type ModelProvider = {
  name: string;
  capabilities: ProviderCapabilities;

  stream(request: ModelRequest): AsyncIterable<ModelEvent>;
};

type ModelRequest = {
  runId: string;
  messages: ModelMessage[];
  tools: ModelToolSchema[];
  signal?: AbortSignal;
  metadata?: Record<string, string>;
};
```このインターフェースには重要なポイントがあります。```text
Provider 输入和输出都是 core 类型。
````ModelMessage`は某SDKの`MessageParam`ではありません。 `ModelToolSchema` は、特定のプロバイダーのオリジナルのツール定義ではありません。これらはコアによって定義された中間形式です。

アダプターは内部で変換できます。```text
core ModelRequest
-> provider-specific request
-> provider-specific stream
-> core ModelEvent
```ただし、変換がコアの外部に漏れることはできません。

この設計は小さなゲートウェイに似ています。もちろんゲートウェイは外部プロトコルを理解する必要がありますが、その背後にあるシステム全体へ外部プロトコルが散らばってはいけません。

より明確に確認するには、タイミング図を使用します。

![M0 Core Kernel：実モデルをシステムへ接続し、システムを乗っ取らせない Mermaid 3](assets/00-09-m0-core-kernel/mermaid-03.png)

この写真で最も重要なことは、`Provider Adapter -> Runtime Facade` が戻ってきたことです。

「処理されたツールの結果」ではなく、`ModelEvent stream` を返します。

モデルがテキストを返す場合、ランタイムはテキスト デルタを CLI にレンダリングし、イベント ストリームに書き込むことができます。

モデルがツール インテントを返した場合、ランタイムはそのインテントをイベント ストリームに書き込み、後続のツール ランタイムにその処理方法の決定を任せる必要があります。

モデルがエラーを返した場合、ランタイムはループ全体に例外を発生させるのではなく、そのエラーを起因するイベントに変換する必要があります。

これは、「システムを乗っ取らせずに、実モデルをシステムへ接続する」ための実装上の第一層です。

プロバイダーは強力ですが、単なる外部機能アダプターにすぎません。

## 5. レジストリ: アビリティは最初に登録する必要があり、実行中に推測することはできません。

実際のモデルは、どのようなツールが利用可能であるかを知っている場合にのみツール インテントを生成できます。

多くの最小限のエージェント デモでは、ツールをマップとして作成します。```ts
const tools = {
  read_file,
  run_command,
  edit_file,
};
```次に、ツールの説明をプロンプトに入力します。

M0 ではこれでは不十分です。

コアにはレジストリが必要ですが、それは形式的に見せるためではなく、「機能」にシステム内で安定したアイデンティティを与えるためです。

ツールには少なくとも次の情報が必要です。```ts
type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  risk: "read" | "write" | "execute" | "network";
  isReadOnly: boolean;
  isConcurrencySafe: boolean;
  visibility: ToolVisibilityPolicy;
};
```M0 は完全な権限を実装する必要はありませんが、これらのフィールド用の場所が必要です。

次のツールのランタイム、権限、およびコンテキスト ポリシーによって次のことが要求されるためです。```text
这个工具叫什么？
它的输入结构是什么？
它能不能展示给模型？
它属于观察类动作还是修改类动作？
它能不能并发？
它产生的结果应该怎么回填？
它是否需要用户确认？
```M0 にレジストリがない場合、後者の問題があちこちに散在することになります。

プロバイダーはレジストリからツール スキーマを読み取る必要もありますが、方向に注意してください。```text
registry 定义工具能力
context builder 选择本轮可见工具
provider adapter 把可见工具 schema 转成 provider 格式
model 只基于可见工具提出 intent
```の代わりに：```text
provider 想支持什么工具
core 就跟着变成什么样
```画像で修正できます。

![M0 Core Kernel：実モデルをシステムへ接続し、システムを乗っ取らせない Mermaid 4](assets/00-09-m0-core-kernel/mermaid-04.png)

この図には見落とされやすい点があります。```text
模型看到的工具 schema，只是 registry 的投影。
```レジストリには多くのツールが存在する可能性があります。現在のラウンドのすべてがモデルに表示されるわけではありません。 M0 は、`run_tests` または `echo` ツールを 1 つだけ登録し、その後、`read_file`、`grep`、`edit_file`、および `bash` を徐々に追加できます。

ツールの可視性自体は制御システムの一部です。

ツールを実行する予定がない場合は、最初からモデル メニューに入らないことが最善です。

これは「信頼性のないモデル」ではなく、通常のエンジニアリングの境界です。モデルは可視性のない機能を呼び出すことができず、システムは無意味な拒否や即時注入のリスクから解放されます。

## 6. イベント バス: ファクトは最初にログに記録される必要があります

実際のモデルに接続すると、システムは多くの中間状態の生成を開始します。```text
用户输入了什么
runtime 开始了一次 run
provider 开始请求
模型输出了一段文本
模型提出了工具意图
provider 返回 usage
工具意图被接受或拒绝
工具开始执行
工具结束执行
conversation state 发生变化
run 完成或中断
```これらがメモリ変数に分散されているだけであれば、システムは短期的には実行可能です。

ただし、再生、監査、評価、復元はできず、デバッグも困難です。

したがって、M0 は非常に小さなイベント バスを確立する必要があります。

ここでのイベント バスは、必ずしも複雑なメッセージ キューである必要はありません。 M0 には同期追加専用ログのみが存在する可能性があります。```ts
type RuntimeEvent =
  | UserMessageEvent
  | RunStartedEvent
  | ModelEvent
  | ToolIntentRegisteredEvent
  | StateUpdatedEvent
  | RunFinishedEvent;

type EventBus = {
  append(event: RuntimeEvent): void;
  subscribe(handler: (event: RuntimeEvent) => void): () => void;
  snapshot(): RuntimeEvent[];
};
```重要なのは技術的な実装ではなく、実際のルートです。```text
所有重要事实先进入事件流。
State 从事件流折叠出来。
UI 从事件流渲染出来。
Trace 和 eval 也从事件流读取。
```このルートは、「状態を直接変更する」こととは大きく異なります。

状態を直接変更するコードは通常次のようになります。```ts
state.messages.push(modelMessage);
state.lastToolCall = toolCall;
state.status = "running_tool";
```短期的には便利ですが、問題は次のとおりです。```text
谁改的？
为什么改？
改之前是什么？
这次修改来自模型、工具还是用户？
如果要重放，顺序是什么？
如果出错，能不能定位哪一步错？
```イベント ストリームのコードはもう少し冗長です。```ts
eventBus.append({
  type: "model.tool.intent",
  runId,
  intentId,
  toolName: "run_tests",
  input: { command: "npm test" },
});

state = reduceConversationState(eventBus.snapshot());
```この書き方は M0 では余分な手順のように見えますが、後で命を救うことになります。

なぜなら、エージェントの失敗が最終回答時にのみ発生することはほとんどないからです。

これはどの中間段階でも発生する可能性があります。```text
provider 把工具参数流式拼错了
adapter 把 stop reason 映射错了
registry 给了模型不该看的工具
runtime 把 tool intent 当成已执行
state reducer 漏掉了 observation
context builder 把旧错误日志当成当前事实
```イベント フローがなければ、システムは最終的なトランスクリプトから推測することしかできません。

イベント フローを特定のレイヤーに帰属させることができるのは、イベント フローの場合のみです。

## 7. 会話の状態: 状態は事実の投影であり、事実そのものではありません

![イベントログ、状態、コンテキストプロジェクション、ModelRequestの責任関係の説明](assets/00-09-m0-core-kernel/photo-02-event-state-projection.jpg)

M0 のもう 1 つの重要な境界は `conversation state` です。

多くの最小限の実装では、メッセージがすべての状態として扱われます。```ts
const messages = [
  { role: "user", content: "帮我修测试" },
  { role: "assistant", content: "我需要运行测试" },
  { role: "tool", content: "测试失败日志..." },
];
```これは確かに現状の一部です。

しかし、それが状態全体ではありません。

実際の CLI エージェントは、少なくとも次のことも知っておく必要があります。```text
当前 runId
当前轮次
当前预算
可见工具
已提出但尚未执行的 tool intent
最新 usage
当前任务状态
是否被中断
哪些事件已经投影给模型
哪些工具结果被截断
哪些信息只留在 runtime 不给模型
```したがって、M0 の状態は、イベント ストリームから折り畳まれた実行シーンに似ています。```ts
type ConversationState = {
  conversationId: string;
  status: "idle" | "running" | "waiting_for_tool" | "completed" | "failed";
  turn: number;
  messages: ModelMessage[];
  pendingToolIntents: ToolIntent[];
  visibleTools: ModelToolSchema[];
  usage: UsageSummary;
  lastError?: RuntimeError;
};

function reduceConversationState(events: RuntimeEvent[]): ConversationState {
  return events.reduce(applyEvent, initialState());
}
```ここで最も重要なことは次のとおりです。```text
State 可以重建。
Event log 才是事实源。
```状態はランタイムが迅速な決定を下すためのものです。

コンテキストは、モデルがこのラウンドで必要な情報を確認するためのものです。

イベントログは実際に起こったことを記録するものです。

この 3 つを「大きなメッセージ配列」に混在させることはできません。

次のように描画できます。

![M0 Core Kernel：実モデルをシステムへ接続し、システムを乗っ取らせない Mermaid 5](assets/00-09-m0-core-kernel/mermaid-05.png)

この画像は後続の章にとって非常に重要です。

なぜなら、後でコンテキスト エンジニアリングについて話すときに、この連鎖に繰り返し戻ることになるからです。```text
Event Log 是发生过什么。
State 是当前任务现场。
Context 是本轮模型应该看见什么。
```M0 がこれら 3 つを分離すると、後続の圧縮、取得、メモリ、再生のためのスペースが確保されます。

M0 がこれらをメッセージに混在させると、後続のすべての機能が「プロンプトで解決策を見つける」ことになります。

これは、多くのエージェントのデモが成長しない理由でもあります。

## 8. ランタイム ファサード: CLI は実行を開始するだけで、内部の詳細は引き継ぎません。

![CLI、ランタイム ファサード、レジストリ、プロバイダー アダプター間の呼び出し境界を説明する](assets/00-09-m0-core-kernel/photo-03-runtime-facade-registry.jpg)

コントラクト、レジストリ、イベント バス、ステートを使用すると、最終的に外部の入り口が必要になります。

この入り口は実行時のファサードです。

Facade の目標は、内部をブラック ボックスとして隠すことではなく、上位レベルの呼び出し元がプロバイダー、イベント バス、ステート リデューサー、およびレジストリを直接操作できないようにすることです。

最小限のインターフェイスは次のように単純なものにすることができます。```ts
type AgentRuntime = {
  send(input: UserInput): AsyncIterable<RuntimeOutput>;
  getState(): ConversationState;
  getEvents(): RuntimeEvent[];
};

type RuntimeOutput =
  | { type: "text.delta"; text: string }
  | { type: "tool.intent"; intent: ToolIntent }
  | { type: "status"; status: ConversationState["status"] }
  | { type: "error"; error: RuntimeError };
```CLI で必要なのは以下のみです。```ts
for await (const output of runtime.send({ text: userText })) {
  render(output);
}
```以下のことは行わないでください。```text
直接调用 provider.stream()
直接拼 provider messages
直接执行 tool intent
直接改 conversation state
直接写 event log 的内部字段
```これは潔癖症ではありません。

これは、同じコアが将来さらに多くのエントリを提供できるようにするためです。```text
CLI
测试脚本
本地 TUI
远程 API
自动化任务
多 agent 调度器
```CLI が初日からプロバイダーを直接呼び出す場合、今後ポータルが追加されるたびに、一連のプロバイダー呼び出し、イベント処理、およびステータス更新ロジックをコピーする必要があります。

実行時のファサードがあり、入り口はユーザーとの対話のみを担当します。コアは実行時のセマンティクスを担当します。

このため、M0 の「コア」を最初に行う必要があります。

これにより、後続の製品フォームを同じ操作チェーンに接続できるようになります。

## 9. M0 に対して「修復テスト」を実行します。

ここで、これらの概念を固定例に戻します。

ユーザーは CLI で次のように入力します。```text
帮我看看这个项目为什么测试失败，并把它修好。
```M0 にはまだ完全なファイル ツールも実際の編集ツールもありません。閉じたループを検証するためのテスト ツールまたはエコー ツールのみを登録できます。

しかし、実際のモデルはすでに入手されています。

M0 の実行は次のように発生する可能性があります。```text
1. CLI 调 runtime.send(user input)
2. runtime append UserMessageEvent
3. state reducer 生成当前 ConversationState
4. context projection 构建 ModelRequest
5. provider adapter 调真实模型
6. 模型流式返回 text delta
7. runtime append model.text.delta，并渲染给 CLI
8. 模型返回 tool intent：run_tests
9. runtime append model.tool.intent
10. state 进入 waiting_for_tool
11. runtime 输出 tool.intent 给上层或后续 Tool Runtime
```この時点で、M0 の目標は達成されました。

実際にはまだテストが実行されていないことに注意してください。

これは欠陥ではありません。

これは意図的な境界線です。

M0 が証明したいのは、「エージェントがテストを修正できる」ということではなく、次のことです。```text
真实模型已经能接入 core。
模型输出已经被归一成系统事件。
tool intent 没有穿透 runtime 直接执行。
conversation state 能从事件流得到。
CLI 通过 facade 看到流式输出和 tool intent。
```これが次回の記事で`Intent / Execution`分離を書き続ける前提となります。

M0 が `run_tests` を直接実行する場合、短期的にはより完成度が高いように見えますが、パート 10 には明確なエントリ ポイントがありません。さらに悪いことに、システムは初日から「モデルが意図を提案する」と「システムがアクションを実行する」が同じレイヤーで混在することになります。

M0 は、しっかりとした境界線を確立するよりも、むしろゆっくりと一歩を踏み出す必要があります。

これは、耐荷重リンク図に含めることができます。

![M0 Core Kernel：実モデルをシステムへ接続し、システムを乗っ取らせない Mermaid 6](assets/00-09-m0-core-kernel/mermaid-06.png)

この図の最後のノードは非常に重要です。M0 の終了ステータスは「ツールが実行された」ではなく、「システムがツールのインテントを安定して受信した」ことです。

ここが第9条と第10条の境目です。

## 10. M0 の最小ディレクトリはどのようになりますか?

記事が概念だけで終わることを避けるために、M0 を最小限のディレクトリとして想像します。

大規模なプロジェクトを最初からコピーする必要はありません。非常に小さいサイズに保つことから始めることができます。```text
src/
  contracts/
    events.ts
    model.ts
    tools.ts
    state.ts
  providers/
    provider.ts
    openai.ts
    anthropic.ts
    mock.ts
  registry/
    tool-registry.ts
    provider-registry.ts
  runtime/
    event-bus.ts
    state-reducer.ts
    context-projection.ts
    agent-runtime.ts
  cli/
    main.ts
```ここにはいくつかのトレードオフがあります。

まず、`contracts`を単独で配置します。

それはすべての層が依存する内部言語だからです。プロバイダー、ランタイム、レジストリ、および CLI はすべてコントラクトを参照できます。ただし、コントラクトはプロバイダー SDK、ファイル システム、または端末 UI に依存すべきではありません。

次に、`providers` は単なるアダプターです。

`openai.ts` または `anthropic.ts` は複雑な場合があり、ストリーミング、再試行、エラー マッピング、ツール呼び出しのシャーディングを処理できます。ただし、出力はコア `ModelEvent` である必要があります。

3 番目に、`runtime` は制御フロー センターです。

これは、実行の開始、イベントの追加、状態の削減、コンテキストの構築、プロバイダーの呼び出し、プロバイダー イベントのイベント バスへの書き込みを担当します。

4 番目に、`registry` は機能ディレクトリです。

M0 にテスト ツールが 1 つしかない場合でも、レジストリを使用する必要があります。このように、ローカル ツール、MCP、スキル、サブエージェントは後から追加され、リンクを公開するためにツールをひっくり返す必要はありません。

5 番目に、`cli` は薄いままです。

CLI はプロバイダーのプライベート形式について認識すべきではなく、メッセージ自体を管理すべきでもありません。ユーザー入力を受け取り、ランタイムを呼び出し、ランタイム出力をレンダリングするだけです。

M0 の最小限のコア疑似コードは次のように記述できます。```ts
async function* send(input: UserInput): AsyncIterable<RuntimeOutput> {
  const runId = ids.run();

  eventBus.append({
    type: "user.message",
    runId,
    text: input.text,
  });

  eventBus.append({
    type: "run.started",
    runId,
  });

  const state = reduceConversationState(eventBus.snapshot());
  const request = buildModelRequest(state, registry.visibleTools(state));

  for await (const event of provider.stream(request)) {
    eventBus.append(event);

    if (event.type === "model.text.delta") {
      yield { type: "text.delta", text: event.text };
    }

    if (event.type === "model.tool.intent") {
      yield {
        type: "tool.intent",
        intent: toToolIntent(event),
      };
    }
  }

  eventBus.append({
    type: "run.finished",
    runId,
  });
}
```このコードはまだ未熟ですが、方向性は明確になっています。```text
用户输入变事件。
状态从事件来。
请求从状态投影来。
provider 返回事件。
事件进入 event bus。
runtime output 给 CLI 渲染。
```プロバイダーがツールを実行する方法はありません。

また、CLI が状態を変更することもできません。

これがM0の最低限の規律です。

## 11. M0 は何を測定する必要がありますか?

M0 テストの焦点は、「モデルが賢いかどうか」ではありません。実際のモデルの出力は確率的なものであり、コア単体テストの主な基礎として使用することはできません。

M0 は契約を測定し、権利を管理する必要があります。

例えば：```text
provider adapter 能把 raw streaming chunks 映射成 ModelEvent
runtime 会把 user input 写成 UserMessageEvent
model text delta 会进入 event bus 并输出给 CLI
model tool intent 会进入 pendingToolIntents，而不是被直接执行
state reducer 可以从事件流重建当前状态
runtime facade 不暴露 provider 私有响应对象
registry 只把 visible tools 投影给 provider request
provider error 会变成 RuntimeEvent，而不是未捕获异常
```テストケースとして書くことができます:```ts
it("records tool intent without executing it", async () => {
  const provider = new FakeProvider([
    {
      type: "model.tool.intent",
      runId: "run_1",
      intentId: "intent_1",
      toolName: "run_tests",
      input: { command: "npm test" },
    },
  ]);

  const runtime = createRuntime({ provider, tools: [runTestsTool] });
  const outputs = await collect(runtime.send({ text: "修复测试" }));

  expect(outputs).toContainEqual({
    type: "tool.intent",
    intent: expect.objectContaining({ toolName: "run_tests" }),
  });

  expect(runTestsTool.execute).not.toHaveBeenCalled();
  expect(runtime.getState().pendingToolIntents).toHaveLength(1);
});
```このテストは直観に反するように思えるかもしれません。

ツールを実行したくないですか?

はい、でも M0 では密かにではありません。

M0 のテストでは、第 10 条の境界が存在することを確認する必要があります。```text
模型可以提议。
系统尚未执行。
执行必须走下一层 runtime discipline。
```このテストが失敗した場合、M0 がプロバイダーまたはデモの喜びによって侵入されたことを意味します。

別のステータス テストを作成します。```ts
it("rebuilds conversation state from events", () => {
  const events: RuntimeEvent[] = [
    { type: "user.message", runId: "r1", text: "修复测试" },
    { type: "run.started", runId: "r1" },
    { type: "model.text.delta", runId: "r1", text: "我先运行测试。" },
    {
      type: "model.tool.intent",
      runId: "r1",
      intentId: "i1",
      toolName: "run_tests",
      input: { command: "npm test" },
    },
  ];

  const state = reduceConversationState(events);

  expect(state.status).toBe("waiting_for_tool");
  expect(state.pendingToolIntents[0].toolName).toBe("run_tests");
});
```このテストで証明されることは次のとおりです。```text
状态不是随手改出来的。
状态可以从事实流重建。
```このプロパティは、後で再生、デバッグ、評価、再開を行うときにますます重要になります。

## 12. いくつかの一般的な失敗の形式

境界を太く書くために、いくつかの反例を見てみましょう。

### 1. プロバイダーは最終的な回答と副作用を直接返します。

まずい書き方は次のようなものです。```text
provider 返回了答案。
同时内部已经执行了工具。
runtime 只看到最终文本。
```これは最もトラブルが少ない方法ですが、システムは完全に制御を失います。

ランタイムは、モデルがツールを実行した理由、ツールのパラメーターが何であるか、アクセス許可が必要かどうか、結果が切り捨てられたかどうか、またはエラーが発生した場所がわかりません。

このようなシステムは監査が困難です。

### 2. ツール呼び出し ID が直接システム ファクト ソースになる

プロバイダーによっては、ツール呼び出しに ID を与える場合があります。

この ID は保存できますが、コアの信頼できる唯一の情報源にすることはできません。

コアは独自の `intentId` を生成する必要があり、プロバイダー ID は `providerRef` だけです。

そうしないと、プロバイダーの変更、履歴の再生、および複数のプロバイダーからの出力のマージ時にシステム ID が混乱します。

### 3. メッセージはログ、ステータス、コンテキストを同時に処理します

最も一般的なデモの作成方法は、`messages` 配列です。

ユーザーメッセージ、モデルメッセージ、ツールの結果、システムステータス、エラー、デバッグ情報がすべて詰め込まれています。

これは短いミッションの場合に非常に便利です。

長いタスクでは、三重の問題になります。```text
日志不可审计
状态不可重建
上下文不可裁剪
```M0 は少なくともイベント ログ、状態、およびコンテキスト投影を分離する必要があります。

### 4. レジストリが欠落しており、ツールの説明がプロンプトに散在しています。

ツールの説明がプロンプト内の単なるテキストである場合、システムは現在どのような機能が使用可能であるかを認識することが困難になります。

モデルには古いツールの説明が表示される場合があります。

ランタイムは、レジストリに存在しないツールを実行する可能性があります。

許可レベルで判断できる安定したオブジェクトはありません。

したがって、ツールの説明をプロンプトに投影できますが、ソースはレジストリである必要があります。

### 5. CLI バイパス ランタイム

迅速な開発のために、CLI はプロバイダーを直接呼び出します。

これにより、最初のバージョンは非常に高速に実行されますが、将来的にはエントリごとに実行セマンティクスを再実装する必要があります。

さらに悪いことに、テストではコアの動作ではなく CLI の動作が測定されます。

M0 では、CLI を交換できるほど十分に薄くする必要があります。今日はターミナル、明日は TUI、明後日は HTTP API です。コアの実行セマンティクスは変更されません。

## 十三、M0 と前後の章の関係

M0 をチュートリアル セット全体に戻すと、その位置は明らかです。

以前の記事では、精神的な質問に答えました。```text
Agent 不是 prompt。
Agent 有 Model、Loop、Tools、State。
Harness 是模型外部控制系统。
Agent 会自然长成 Harness。
```第 7 章は実際の戦闘に入ります。```text
先让 CLI 能调真实模型。
```パート 8 動かしてみよう:```text
从单次回答变成最小 loop。
```第 9 条、つまりこの記事は、「リアル モデル アクセス」を「継続的に進化するコア」に変えることに関するものです。```text
provider 输出被归一成系统事件。
tool intent 被接住但不执行。
state 从 event log 来。
runtime facade 成为唯一入口。
```第 10 章は自然に続けることができます。```text
既然 M0 已经能接住 ToolIntent，
下一步就要把 Intent 和 Execution 分开。
```この道を元に戻すことはできません。

最初にユニバーサル ツール エグゼキューターを作成し、その後コントラクトの追加に戻ると、多くのオブジェクトが混在していることがわかります。

最初にプロバイダーにツール呼び出しを引き継がせてから、戻ってランタイムを追加すると、実行権限がプロバイダーの応答形式によって定義されていることがわかります。

つまり、M0 は一歩遅く見えても、実際には後半の進化を加速させます。

これにより、各レイヤーが何を拾い、何を渡し、何を触れないかがわかります。

## 14. 要約: 実モデルは中心ではなく能力である

この記事はいくつかの文に要約できます。

まず、実際の大規模モデルを接続する必要があります。これは、モック プロバイダーがストリーミング、ツールの意図、エラー マッピング、使用法、およびプロバイダーの違いを公開できないためです。

第二に、実行、状態、イベントログ、機能レジストリはすべて runtime に属するべきなので、実モデルにシステムを乗っ取らせてはいけません。

第三に、プロバイダーの責任は、ツールを直接実行したり状態を変更したりするのではなく、外部モデルの応答をコア `ModelEvent` に変換することです。

第四に、M0 Core Kernel を支えるポイントは `contracts / registry / event bus / conversation state / runtime facade` です。

5つ目は、M0の完了ステータスは「ツールが実行された」ではなく、「システムがモデルイベントとツールインテントを安定して受け取り、ランタイムでの実行権を維持した」ことです。

これを一文で覚えてください。

> プロバイダーはモデル機能をシステムに導入し、コア カーネルはシステム境界を独自に管理します。

次の記事では、引き続きこの境界をたどっていきます。```text
模型提议，系统执行。
Intent / Execution 必须分离。
```この線を明確に引くことによってのみ、次のツール ランタイム、権限、サンドボックス、監査、および再生がパッチではなく、自然に成長したエンジニアリング レイヤーになります。

## 教学 Harness への落とし込み

教学版の M0 Kernel は薄くできます。shared protocol、event types、loop contract、tool contract、session contract だけでも十分です。原則は、model は system に入るが system を所有しないことです。`MockModel` も real provider も `TeachingModel` の実装にすぎません。`ToolRegistry` を迂回したり、session を直接書いたり、UI の event 表示を決めたりできません。

---

GitHub ソース: [00-09-m0-core-kernel.md](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-09-m0-core-kernel.md)
