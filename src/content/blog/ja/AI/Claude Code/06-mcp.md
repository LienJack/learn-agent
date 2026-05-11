---
title: 'Claude Code ソースコード解説シリーズ 第10章: MCP'
description: 'Claude Code が MCP サーバーを統合し、外部ツールとリソースをランタイム能力として扱う方法を示します。'
author: LienJack
pubDate: 2026-05-03
heroImage: './assets/06-cover-mcp-bridge.jpg'
locale: 'ja'
tags:
  - Claude-Code
  - Agent
  - ソースコード解説
  - MCP
  - Tools
aliases:
  - Claude Code MCP
  - Claude Code MCP 統合
---
# 『Claude Code ソースコードリーディング』第10章｜MCP

前章の Tools では、Claude Code のコアとなる設計をすでに見てきた。

> モデルは直接コンピュータを操作するのではなく、行動の意図だけを出力する。実際にアクションを実行するのは Claude Code のツールシステムである。

ここまでで、Claude Code はファイルを読み書きし、コマンドを実行し、コードを検索できるようになった。では、なぜ MCP が必要なのか？

MCP はすでに拡張レイヤーの文脈で触れた。外部システムがツール、リソース、プロンプトを統一プロトコルで公開できるようにする仕組みだ。ここでは概念自体の説明は繰り返さず、Claude Code が MCP を自前のメインツールパイプラインにどう組み込んでいるかだけを見ていく。

実際の開発はローカルリポジトリの中だけで完結するものではないからだ。

開発タスクは次のような外部システムと頻繁に関わる。

- GitHub の Issue や PR
- Jira の要件
- Slack での議論
- Figma のデザインカンプ
- Postgres / MySQL データベース
- Sentry / Datadog による監視
- 内部ドキュメント、ナレッジベース、業務 API

システムを接続するたびに Claude Code へ組み込みツールをハードコードしていては、すぐに制御不能になる。ツールは増え続け、権限管理は煩雑になり、接続方式は断片化し、チームは自分たちのプライベートシステムを標準化して組み込めなくなる。

MCP が解決しようとしているのはまさにこの問題だ。

ただし、本章で「MCP とは何か」を漠然と紹介するつもりはない。関心があるのは Claude Code のソースコード実装だけだ。

> Claude Code は外部の MCP サーバーを、どうやってモデルが安全に呼び出せ、UI が表示でき、権限システムが統制でき、メインループがそのまま進行できる内部 Tool へと変換するのか？

このパイプラインを具体的にするために、一貫した例を据えておく。

```text
ユーザーが Claude Code に 2 つの MCP サーバーを設定した。

1. slack：リモート MCP、search_messages や send_message などのツールを提供
2. postgres：ローカル stdio MCP、list_tables や query などのツールを提供

ユーザーの指示：
「昨日の Slack で注文タイムアウトに関するやり取りを調べて、
　データベースと突き合わせて、最近の失敗注文の分布を見てほしい」
```

このタスクは表面的には一度の会話だが、その裏では Claude Code に多くの仕事が求められる。

起動時に MCP 設定を読み込み、`slack` と `postgres` という2つのサーバーがあることを認識する。リモート接続とローカル子プロセス接続をそれぞれ確立し、各サーバーに対し、公開している tools、prompts、resources を問い合わせる。これらの外部機能を Claude Code の内部ツールとして取り込み、`AppState.mcp` と現在のツールプールに同期する。モデルが `mcp__slack__search_messages` を呼び出す際も、統合された権限チェックを経由し、実際の実行時にリクエストを MCP JSON-RPC に変換して Slack MCP サーバーへ送信する。結果が返ってきたら、それを Claude Code の `tool_result` にラップし、次のモデル推論ラウンドに進む。

この一連のチェーンが、Claude Code の MCP 実装である。

![06.MCP 図 1](./assets/06-mcp-mermaid-01.png)

この章の核心的な結論を先に示しておく：

> Claude Code の MCP はバイパス RPC ではなく、メインパス統合である。まず MCP サーバーを Claude Code 自身の `Tool` / `Command` / `Resource` に変換し、既存のツールプール、権限、状態、UI、Telemetry、割り込み、メインループを再利用する。

## 1. MCP はなぜ単なる「RPC を送るだけ」では済まないのか

最もシンプルな MCP クライアントは、ごく薄く作れる。

```text
サーバー設定を読み込む
-> サーバーに接続する
-> tools/list を呼ぶ
-> tools/call を呼ぶ
-> 結果をモデルに返す
```

デモだけであれば、これで十分だ。

しかし Claude Code は、そう単純にはいかない。チャットボックスではなく、実際のエンジニアリング環境で長期稼働する Agent Harness だからだ。

外部ツールを接続した途端、問題は一気に複雑になる。

第一に、サーバーはどこから来るのか。

MCP サーバーの出自は多岐にわたる。ユーザーの個人設定、プロジェクト共有設定、プラグイン、企業ポリシー、claude.ai コネクター、さらには Claude Code 自身に組み込まれた機能まである。これらの出自を区別なく混在させるわけにはいかない。

第二に、サーバーにはどう接続するのか。

ローカルデータベース向け MCP は stdio かもしれないし、Slack MCP は HTTP かもしれない。過去には SSE もサポートしており、ブラウザ制御 MCP に至っては Claude Code のプロセス内部で直接動作する。

第三に、ツール名をどう扱うか。

Slack MCP が `send_message` を公開し、別の IM MCP も同名のツールを公開しているとしよう。モデルから見えるツール名が衝突してはいけないし、パーミッションシステムも「これはどちらの send_message なのか」を明確に区別できなければならない。

第四に、接続状態をどう管理するか。

リモートトークンは期限切れになるし、サーバーは切断されるし、ツール一覧は変わり、リソースも更新される。MCP は起動時に一度スキャンして終わりではなく、生きた接続の集合なのだ。

第五に、セキュリティ境界はどこにあるのか。

外部 MCP サーバーはメッセージを送信し、データベースを照会し、内部ネットワークにアクセスできる。MCP という肩書きがあるからといって、Claude Code が既存のパーミッション、フック、監査をバイパスすることを許してはならない。

だからこそ、Claude Code の MCP モジュールは六層構造に成長した。

```text
設定層：どの MCP サーバーが存在するかを決める
-> 接続層：各サーバーにどう接続するか、接続できているかを決める
-> 検出層：tools / prompts / resources を取得する
-> マッピング層：外部の機能を内部の Tool / Command / Resource にラップする
-> 状態層：接続と機能を AppState.mcp に同期する
-> 実行層：汎用ツールパイプラインを再利用し、実際に呼び出す段階で初めて MCP RPC を送信する
```

以下、このチェーンに沿って分解していく。

## 2. 設定層：Claude Code が最初に生成する「最終サーバー一覧」

MCP の最初のステップは接続ではなく、設定のマージです。

Claude Code の MCP サーバーには多数の供給元があるためです。

- ユーザーレベル設定：例 `~/.claude/settings.json`
- プロジェクトレベル設定：例 プロジェクトルートの `.mcp.json`
- ローカルプロジェクト設定：例 `.claude/settings.local.json`
- プラグイン付属の MCP サーバー
- claude.ai コネクター
- エンタープライズ管理設定：例 `managed-mcp.json`
- ランタイム動的注入による組み込み MCP

ユーザー視点では、次の一行を実行しただけかもしれません。

```bash
claude mcp add postgres -- npx -y postgres-mcp-server
```

あるいは、プロジェクトに `.mcp.json` を置いただけかもしれません。

```json
{
  "mcpServers": {
    "postgres": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "postgres-mcp-server"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    }
  }
}
```

しかしソースコード上で Claude Code が行うのは「JSON ファイルを一つ読む」ことではなく、複数の供給元から得た設定を合成し、最終的に利用可能な一つの一覧に仕上げることです。

主なエントリーポイントは次の二つです。

```text
src/services/mcp/config.ts

getClaudeCodeMcpConfigs()
getAllMcpConfigs()
```

この層では主に四つの処理が行われます。

実装全体を貼る必要はありません。`getAllMcpConfigs()` のメインパスを押さえておけば十分です。

```text
エンタープライズ MCP が存在する場合
→ そのまま getClaudeCodeMcpConfigs() に委譲

それ以外の場合：
→ claude.ai コネクターを事前起動して取得
→ ローカル / プロジェクト / ユーザー / プラグインの設定を並列読み取り
→ claude.ai コネクターにポリシーフィルターを適用
→ URL シグネチャに基づいて重複コネクターを除去
→ claude.ai を最下位優先度として最終サーバー一覧をマージ
```

この経路には見落とされがちなポイントが 2 つある。

1 つ目は、`claude.ai` コネクタの取得が先行起動される Promise であり、ローカル設定やプラグインキャッシュの読み込みと並列実行するためのものだという点だ。MCP 設定の読み取りは純粋なローカル I/O ではなく、ネットワーク呼び出しを伴う可能性がある。つまりこの段階で、すでに起動パフォーマンスへの配慮が始まっている。

2 つ目は、重複排除が単なるキー上書きではないという点だ。コメントに明記されているように、`slack` と `claude.ai Slack` のようなキー同士が衝突することはない。そのため、URL シグネチャに基づくコンテンツレベルの重複排除が必要になる。

端的に言えば、設定レイヤーが答えようとしている問いは次のとおりだ。

> 同じ外部機能が異なる経路から Claude Code に入り込む可能性がある。システムは最終的にモデルへ公開するサーバーリストが、クリーンで統制可能、かつ重複のないものであることを保証しなければならない。

### 1. 異なるスコープの設定をマージする

Claude Code の公式利用体験において、MCP 設定には少なくとも `local`、`project`、`user` の 3 種のスコープが存在する。

平たく言えば：

- `local`：現在のプロジェクト内で自分にだけ有効。プライベートな設定や機密クレデンシャルに適する。
- `project`：`.mcp.json` に書き込まれ、チーム共有向け。
- `user`：プロジェクトをまたいで有効。個人で常用するツール向け。

同名のサーバーが複数のスコープに現れた場合、Claude Code は安定した優先順位を持たなければならない。さもなければ、ユーザーは最終的にどれに接続されたのか永遠にわからない。

ソースコード上の設定レイヤーはこれら出所の異なる設定を、次の形に統合する役割を担っている。

```text
Record<string, ScopedMcpServerConfig>
```

つまり：

```text
serverName -> 出所とスコープ情報を伴うサーバー設定
```

### 2. プロジェクトレベルの `.mcp.json` には承認が必要

プロジェクトレベルの MCP 設定は便利だが、危険でもある。

なぜなら `.mcp.json` はリポジトリにコミットされうるからだ。プロジェクトを clone すると、その中に誰かが書いた MCP サーバー設定が同梱されている可能性がある。Claude Code がそれを確認なしに起動すれば、プロジェクトリポジトリがローカルマシンで起動するプロセスや接続先サービスに干渉することを許してしまう。

そのため、Claude Code はプロジェクトレベルの MCP 設定に対して承認機構を備えている。

この点は重要だ。MCP のセキュリティは、ツール呼び出しの瞬間から始まるのではなく、「そのサーバーをランタイムに乗せてよいか」という段階から始まっている。

### 3. 組織設定が排他モードに移行する場合

組織管理の MCP 設定が存在する場合、Claude Code はより強いポリシー制御に入る。

この設計は、MCP が Claude Code において個人向けの玩具的な機能ではなく、組織ガバナンスのレイヤーとして機能するよう意図されていることを示している。

組織は以下を決定できる：

- 利用を許可する MCP server
- 使用を禁止する server
- 優先するソース
- 統一認証を必須とする機能

### 4. マージ後の重複排除とポリシーフィルタ

プラグイン、ユーザー設定、claude.ai connector が同一または類似の server を指す場合がある。Claude Code は重複を排除し、同じ機能がモデルに重複して露出するのを防ぐ必要がある。

マージ完了後、さらに allowlist / denylist によるポリシーフィルタを通過する。

このポリシーフィルタは単なる server 名での判定ではない。新しいソースコード中の `filterMcpServersByPolicy()` は内部で `isMcpServerAllowedByPolicy()` を呼び出し、server の種類に応じて異なる次元で判定を行う：

```text
stdio server：command の配列でマッチ可能
remote server：URL パターンでマッチ可能
型不明：名前マッチにフォールバック
SDK server：CLI 側でのポリシー適用を免除（CLI は spawn / network に関与しないため）
```

これは「server 名による allowlist」よりも信頼性が高い。server 名は任意に付けられるが、実際のリスクを決めるのは「どのコマンドを起動するか」「どの URL に接続するか」「どの権限を取得するか」だからだ。言い換えれば、MCP 設定レイヤーは次の三つを同時に処理している：

```text
ソースの優先順位
内容の重複排除
ポリシーフィルタリング
```

したがって、設定レイヤーが最終的に出力するのは「読み込まれたすべての設定」ではなく：

> scope マージ、プロジェクト承認、組織ポリシー、重複排除、ポリシーフィルタを経た最終的な MCP server マップである。

![06.MCP 図 2](./assets/06-mcp-mermaid-02.png)

このレイヤーが解決するのは：

> 外部機能が Claude Code に入る前に、それがどこから来たのか、どの scope に属するのか、許可されているのかを確認することである。

## 3. 接続層：同じ MCP でも、Claude Code は複数の transport をサポート

サーバー一覧を取得したら、次のステップは接続だ。

主要なエントリポイント：

```text
src/services/mcp/client.ts

connectToServer()
```

この関数は単なる `new Client()` ではない。どちらかといえば接続ファクトリであり、キャッシュも備えている：

```text
serverName + serverConfig
-> MCPServerConnection
```

ここで最も重要なのは戻り値だ。

Claude Code が返すのはむき出しの MCP クライアントではなく、状態を持つ接続オブジェクトである：

```text
MCPServerConnection

connected
failed
needs-auth
disabled
pending
```

なぜこのようにモデル化するのか？

MCP サーバーは「存在するか、しないか」の二択ではないからだ。以下のような多くの中間状態がありうる：

- ローカルコマンドが存在せず、起動に失敗した。
- リモートサーバーが 401 を返し、OAuth が必要。
- 企業ポリシーによって特定のサーバーが無効化された。
- 再接続中。
- 接続済みだが、ツール一覧がまだリフレッシュされていない。

これらの状態はすべて、UI、AppState、ツールプール、メインループから認識される必要がある。

### 1. stdio：ローカルサーバーは子プロセス

最も一般的なローカル MCP は stdio だ。

そのモデルは次のようなイメージに近い：

```text
Claude Code が子プロセスを起動する
-> 子プロセスの stdin で JSON-RPC を受信
-> 子プロセスの stdout で JSON-RPC を返す
-> stderr はログ出力に使われる
```

たとえば Postgres MCP の場合：

```text
command: npx
args: ["-y", "postgres-mcp-server"]
env: { DATABASE_URL: "..." }
```

接続層が行うべきこと：

- 最終的な command / args / env の組み立て。
- 子プロセスの起動。
- stderr のキャプチャ。
- MCP Client transport の確立。
- サーバープロセス終了時のリソースクリーンアップ。
- 必要に応じた `SIGINT -> SIGTERM -> SIGKILL` の段階的シャットダウン。

これはもはや単なる「リクエスト送信」ではなく、ローカルプロセスのライフサイクルマネージャーである。

### 2. HTTP / SSE / WebSocket：リモートサーバーにはネットワークと認証のガバナンスが必要

リモート MCP は HTTP、SSE、WebSocket といった transport を使用する。Claude Code の現在の公式ドキュメントによれば、リモート HTTP が推奨オプションであり、SSE は依然として実装および互換性パスの中にあるものの、ドキュメント上ではすでに deprecated と明記されている。

たとえば Slack MCP の場合：

```json
{
  "type": "http",
  "url": "https://example.com/mcp/slack",
  "headers": {
    "Authorization": "Bearer ${SLACK_MCP_TOKEN}"
  }
}
```

この種の接続では、対処すべき問題がより多くなる：

- URL とヘッダー内の環境変数展開
- 接続タイムアウト
- プロキシ設定
- 401 認証失敗
- OAuth ログイン
- HTTP / SSE セッション失效時の復旧
- ネットワーク切断後の再接続

そのため `connectToServer()` は、`config.type` に応じて異なる transport を選択し、それらの違いを統一的な `MCPServerConnection` に収束させる。

![06.MCP 図 3](./assets/06-mcp-mermaid-03.png)

`connectToServer()` の完全な実装は長大なので、本記事では重要な分岐のみを抜粋する：

```text
serverRef.type === "sse"
-> ClaudeAuthProvider、headers、proxy、timeout、SSE transport を組み立てる

serverRef.type === "ws"
-> websocket の headers、proxy agent、TLS オプションを組み立てる

組み込みの Chrome / Computer Use MCP
-> createLinkedTransportPair()
-> in-process transport を使用

stdio または type 未宣言
-> StdioClientTransport(command, args, env, stderr: "pipe")

その後：
-> new MCP Client({ name: "claude-code", capabilities: roots / elicitation })
-> client.connect(transport)
-> connection timeout の Promise と競合させる
-> 成功時は connected を返し、失敗時は failed / needs-auth などのステータスにラップする
```

このパスから、いくつかの実装詳細が見えてくる。

第一に、`connectToServer` はメモ化されている。Claude Code は、同じ server と config の組み合わせが重複して接続されるのを避けたい。とりわけ、子プロセスを起動する stdio タイプの server ではそれが重要になる。

第二に、リモート transport は単なる `fetch(url)` ではない。auth provider、ヘッダー、プロキシ、タイムアウト、step-up 検出、User-Agent などをすべて詰め込んでいる。

第三に、組み込み MCP と stdio MCP は上位レイヤーでは同じ抽象として扱われる。Chrome MCP は `createLinkedTransportPair()` 経由でプロセス内 transport を使うが、その後は通常の MCP client と変わらず扱われる。

第四に、接続自体にタイムアウト保護が設けられており、失敗時は単に throw されるのではなく、接続状態としてラップされ、`/mcp` や AppState、ツールプールで利用される。

### 3. 組み込み MCP：サーバーのように見えて、実際は同一プロセス内

Claude Code にはもう一種類、特殊な MCP が存在する。組み込み MCP だ。

たとえば：

- `claude-in-chrome`
- `computer-use`

これらは上位レイヤーでは MCP server のように振る舞うが、必ずしも外部プロセスを起動するわけではない。ソースコード上では、プロセス内 transport のペアを生成し、client 側と server 側を直接つなぎ合わせている。

次のように理解すればよい：

```text
clientTransport.send(message)
-> queueMicrotask()
-> serverTransport.onmessage(message)
```

`InProcessTransport.ts` の核心は 3 行に圧縮できる：

```text
createLinkedTransportPair()
-> 互いに peer を保持する 2 つの Transport を生成
-> send(message) 時に queueMicrotask で peer.onmessage へ配送
```

ネットワークパケットは送らず、stdio へのシリアライズも行わない。ただ JSON-RPC メッセージを非同期で相手側の `onmessage` に配送するだけだ。しかし、MCP SDK が求める `Transport` インターフェースを実装しているため、上位レイヤーはこれが同一プロセス内通信であることを一切知る必要がない。

この実装方式の利点は以下の通りである。

- 上位層からは依然として標準の MCP Client に見える。
- ケイパビリティは MCP の tools/resources/prompts ディスカバリを通じて取得される。
- 追加の IPC や子プロセスが不要。
- 組み込み機能と外部 MCP が同一のアダプタロジックを共有できる。

これは Claude Code の設計思想をよく表している。

> transport は異なっていても、上位層のオブジェクトは統一されなければならない。

### 4. 接続層の本当の責務

つまり接続層が解決するのは「ソケットの開き方」ではない。本質は次のとおりである。

> サーバーがローカルプロセス由来か、リモートサービス由来か、プロセス内実装由来かを問わず、それを状態を持ち、再接続可能で、認証可能で、クリーンアップ可能なひとつの `MCPServerConnection` に仕立て上げる。

## 4. 発見層：MCPサーバーが公開するのはツールだけではない

接続が確立されても、Claude Code がすぐにサーバーをモデルに渡せるわけではない。

能力の検出（ディスカバリー）を行う必要がある。

MCPサーバーが公開できる能力は主に3種類ある：

- `tools`：モデルが呼び出せるアクション。データベース検索、メッセージ送信、Issue検索など。
- `prompts`：ユーザーが選択できるプロンプトテンプレート。Claude Code ではスラッシュコマンドにマッピングされることが多い。
- `resources`：参照可能なコンテキストリソース。Issue、ドキュメント、データベーススキーマなど。

対応するソースコードのエントリポイントは以下のように把握しておくとよい：

```text
fetchToolsForClient()
fetchCommandsForClient()
fetchResourcesForClient()
```

プロトコルの観点では、これらはおおよそ以下に対応する：

```text
tools/list
prompts/list
resources/list
```

ただし、Claude Code はこれらの生の結果をそのままモデルに渡すわけではない。まず自身のランタイムオブジェクトに変換する。

## 5. マッピング層：MCP tool は Claude Code 独自の Tool としてラップされる

これは Claude Code の MCP 実装を理解するうえで最も重要なステップである。

MCP server が返す tool は、おおむね次のような形をしている。

```json
{
  "name": "search_messages",
  "description": "Search Slack messages",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" }
    },
    "required": ["query"]
  }
}
```

Claude Code がこれをそのまま `search_messages` として露出させると、ふたつの問題が生じる。

第一に、名前の衝突が起きやすい。

データベース MCP にも `search` があるかもしれないし、GitHub MCP にも `search` があるかもしれない。内部ツールにも類似の名前が存在しうる。

第二に、権限の記述が難しい。

ユーザーや組織が許可したいのは、抽象的な `send_message` ではなく「Slack server の `send_message`」だからだ。

そこで Claude Code は、MCP tool を次のようにリネームする。

```text
mcp__<server>__<tool>
```

たとえば：

```text
mcp__slack__search_messages
mcp__slack__send_message
mcp__postgres__list_tables
mcp__postgres__query
```

この命名は、以下のようなユーティリティ関数によって行われる。

```text
src/services/mcp/mcpStringUtils.ts

getMcpPrefix(serverName)
buildMcpToolName(serverName, toolName)
getToolNameForPermissionCheck(tool)
```

この命名規則は単なる細部ではない。MCP を Claude Code の権限体系に組み込むための鍵である。

### MCP Tool の内部構造

MCP tool は最終的に Claude Code の `Tool` としてラップされる。

率直に言えば、それはもはや単なる外部プロトコル上の JSON schema ではなく、組み込みツールと同じインターフェースを持つ。

```text
name
description()
prompt()
inputJSONSchema
checkPermissions()
call()
userFacingName()
mcpInfo
```

このステップは次のように捉えるとわかりやすい。

```text
MCP 生 tool
-> mcp__server__tool という名前空間を付与
-> serverName / toolName を mcpInfo に保存
-> Claude Code Tool プロトコルを再利用
-> call() 内部で MCP callTool に再度変換
```

ソースコードレベルでもう一つ見落としやすいポイントがある。`src/tools/MCPTool/MCPTool.ts` それ自体は非常に薄いテンプレートツールにすぎないということだ。`name: "mcp"`、`isMcp: true`、passthrough input schema、passthrough permission、UI 描画フック、そして空の `call` シェルを定義しているだけである。実際に呼び出し可能な `mcp__server__tool` は `fetchToolsForClient()` の中で動的に生成されるオブジェクトで、`...MCPTool` によりテンプレートの振る舞いを継承しつつ、name、description、prompt、schema、permission、call、表示名を上書きしている。

したがって、より正確な理解は次のようになる。

```text
MCPTool が統一的な外殻を提供する。
client.ts が tools/list の戻り値にもとづいて具体 Tool を動的に生成する。
```

このアダプター的な書き方により、すべての MCP ツールがツールシステムから `isMcp` として認識されるとともに、それぞれの外部ツールが独自の schema、description、annotations を保持できる。

![06.MCP 図 4](./assets/06-mcp-mermaid-04.png)

`fetchToolsForClient()` の本質は一行一行の実装ではなく、次の変換チェーンにある。

`client.type` が `connected` でない
-> 空のツールリストを返す

`client` が `tools` capability をサポートしている
-> `tools/list` を送信
-> 返された tool リストをクリーンアップ
-> 各 MCP tool に対して：
   -> `buildMcpToolName(server, tool)`
   -> `mcpInfo` を保存: `{ serverName, toolName }`
   -> `inputSchema` が `Tool.inputJSONSchema` になる
   -> `annotations` が `isReadOnly` / `isDestructive` / `isOpenWorld` にマッピングされる
   -> `call()` 内部で `ensureConnectedClient()`
   -> その後 `callMCPToolWithUrlElicitationRetry()` に進む

この経路の中で情報量の多いポイントが四つある。

第一に、MCP tool の schema はそのまま `inputJSONSchema` に入る。これが、モデルが構造化パラメータで外部ツールを呼び出せる理由である。

第二に、`annotations.readOnlyHint` は `isReadOnly()` と `isConcurrencySafe()` にマッピングされる。端的に言えば、MCP server が提供する tool annotation が Claude Code のスケジューリングと権限制御のセマンティクスに影響を与える。

第三に、`mcpInfo` には常に server の元の名前と tool の元の名前が保持される。特定の SDK モードで `name` から `mcp__` プレフィックスを省略できる場合でも、権限チェックは常に完全修飾名に対して行われる。

第四に、実際の呼び出しは `client.client.callTool()` を直接叩くのではなく、まず `ensureConnectedClient()` を実行し、その後に `callMCPToolWithUrlElicitationRetry()` へ進む。ここで abort signal、progress、elicitation、AppState がすべて引き渡される。

この層の意義は次のとおりである：

> Claude Code は MCP のために別の実行システムを用意しておらず、MCP tool を通常の Tool に見せかけることで、既存の主要経路を再利用している。

## 6. prompts と resources も Claude Code の対話面に入る

MCP は tool call だけではない。

Claude Code は MCP の prompts と resources にもマッピングを行っている。

### 1. MCP prompts はスラッシュコマンドになる

MCP server は prompt テンプレートを公開できる。

たとえば GitHub MCP は次のようなものを公開するかもしれない：

```text
review_pr
summarize_issue
list_open_prs
```

Claude Code はこうした prompt をコマンド候補に変換する。形式は以下のようになる：

```text
/mcp__github__review_pr
```

これにより、ユーザーはモデルが自動的にツールを呼び出すのを待つだけでなく、スラッシュコマンドを通じて特定の MCP server が提供するワークフローテンプレートを能動的に起動できる。

ここでの設計上の境界は明確だ：

- tools はモデルによる自動呼び出し寄り。
- prompts はユーザーによる能動的な選択寄り。

### 2. MCP resources は参照可能なコンテキストになる

MCP resources はむしろ「外部システム内のコンテキストオブジェクト」に近い。

たとえば：

```text
@github:issue://123
@postgres:schema://orders
@docs:file://api/authentication
```

Claude Code は利用可能な resources をリソースインデックスに登録し、ユーザーがファイルを参照するのと同じ感覚でそれらを参照できるようにする。

これは Tools の章で触れたコンテキスト管理ともつながる：

> Tool はモデルを行動させるもの、Resource はモデルにコンテキストを補うもの。

server が resources をサポートしている場合、Claude Code は MCP resources の一覧表示と読み取りの機能も自動的に提供する。一部のリソースはさらに MCP skills へと派生し、より上位の再利用可能なワークフローに入っていくこともある。

![06.MCP 図 5](./assets/06-mcp-mermaid-05.png)

つまり、Claude Code の MCP 接続面には実質三層ある：

```text
tools：モデルが何をできるか
prompts：ユーザーがどのフローを起動できるか
resources：モデルがどの外部コンテキストを読み取れるか
```

## 7. 状態層：MCP は生きた接続であり、AppState に同期すべき

MCP サーバーを起動時に一度スキャンするだけなら、Claude Code に複雑な状態層は不要だ。

しかし、実際の MCP サーバーは変化する：

- リモートトークンの期限切れ。
- Slack MCP の切断。
- Postgres MCP の子プロセス終了。
- サーバーからの `tools/list_changed` 通知。
- resources リストの更新。
- ユーザーが `/mcp` で OAuth を完了。
- 企業ポリシーやプラグイン状態の変更。

そのため、Claude Code には MCP 接続を長期管理する場が必要になる。

主要なエントリポイント：

```text
src/services/mcp/useManageMCPConnections.ts
```

このモジュールは、MCP 接続プールを `AppState.mcp` に同期させる責務を担う。

`AppState.mcp` は四つのテーブルとして捉えられる：

```text
mcp.clients
mcp.tools
mcp.commands
mcp.resources
```

すなわち：

- 現在存在するサーバー接続。
- 各サーバーの現在の状態。
- 現在発見されている MCP ツール。
- 現在発見されている MCP コマンド。
- 現在発見されている MCP リソース。

この四つのテーブルは、MCP 接続結果の共有された真実の源泉である。接続層の責務は特定のサーバーに接続することだけであり、ツールプール、スラッシュコマンド、リソース参照、UI、`/mcp` ページ、実行パイプラインはすべて `AppState.mcp` から同一の真実を参照しなければならない。そうしなければ、あるサーバーが切断された後、UI は切断済みと表示しているのにモデルのツールプールには古いツールが残留する、といった事態が起こる。

### なぜ状態をここまで細かく分割するのか

接続状態と能力状態は別物だからだ。

あるサーバーは接続済みでも、まだ `tools/list` を完了していないかもしれない。

あるサーバーはツールが正常でも、resources をサポートしていないかもしれない。

あるサーバーは OAuth 失敗により `needs-auth` 状態にあるかもしれない。この場合、UI はユーザーにログインを促す必要があり、ツールプールはそれを正常利用可能なツールとして扱ってはならない。

サーバーとの接続が切れることがある。しかし、古い tools をツールプールから削除しなければ、モデルは利用できなくなったツールを呼び続けてしまう可能性がある。

そのため Claude Code は、単に `mcpClients` の配列を管理するだけでは不十分で、clients、tools、commands、resources をそれぞれ分離して同期する必要がある。

tools の更新時には重要な細かな制御がある。状態層は server prefix を基準に、同一サーバーの古いツールを削除してから、再検出された新しいツールを挿入する。つまり、名前が `mcp__<server>__` で始まる古い Tool を先に取り除き、その後に新しいリストを書き込む。こうすることで、`tools/list_changed` や再接続の後にサーバー側で削除されたツールがあった場合でも、古いツールが AppState に残り続けてモデルが誤って呼び出すことを防げる。

### list_changed が再検出をトリガーする

MCP サーバーはクライアントに対して、ツール一覧が変更されたことを通知できる。

Claude Code は `tools/list_changed` のような通知を受け取ると、次の 3 つの処理を行う。

```text
fetchTools のキャッシュをクリア
-> fetchToolsForClient() を再実行
-> updateServer() で AppState.mcp.tools に書き戻し
```

これにより、MCP の機能は動的なものになる。

たとえば Slack MCP サーバーに `summarize_channel` ツールが新しく追加された場合でも、Claude Code はセッション全体を再起動することなく、ツール一覧を更新できる。

実際のソースコードでは、tools、prompts、resources のいずれにも、対応する `list_changed` ハンドラが登録されている。これらは次のように統一的に理解できる。

```text
tools/list_changed を受信
-> fetchToolsForClient のキャッシュを削除
-> fetchToolsForClient() を再実行
-> updateServer({ tools: newTools })

prompts/list_changed を受信
-> fetchCommandsForClient のキャッシュを削除
-> MCP prompts を再取得
-> 存在する場合は MCP skills をマージ
-> updateServer({ commands })

resources/list_changed を受信
-> fetchResourcesForClient のキャッシュを削除
-> resources を再取得
-> MCP_SKILLS が有効であれば MCP skills と commands もリフレッシュ
-> updateServer({ resources, commands })
```

これは、MCP の tool、prompt、resource が静的な配列ではなく、キャッシュされ、無効化され、再検出され、状態に書き戻される動的なケイパビリティセットであることを示している。

特に resource の部分は、MCP スキルとコマンドを同時にリフレッシュする。率直に言えば、Claude Code の設計において、MCP resource は単なる「モデルに読ませる資料」ではなく、より上位のスキル検出への入力にもなり得るのだ。

### 切断が再接続と状態リフレッシュをトリガーする

接続レイヤーはさらに、client に `onclose` を設定する。

接続が切断されると、Claude Code は以下を実行する。

- サーバー状態を pending / reconnecting に更新する。
- 古い接続キャッシュをクリアする。
- 指数バックオフで再接続を試行する。
- 再接続に成功すれば tool / command / resource を再検出する。
- 再接続に失敗すれば状態を failed として記録する。

![06.MCP 図 6](./assets/06-mcp-mermaid-06.png)

状態レイヤーの本質的価値は次のとおりだ。

> MCP は一度きりの設定ではない。変化し、無効化され、回復し、ツールプールに影響を与える実行時接続の集合体である。

## 8. 実行層：モデルが MCP を呼び出すときも、エントリポイントは `runToolUse`

ここまでで、MCP ツールはすでに Claude Code 内部の `Tool` に変換されている。

したがって、モデルが実際に次のような出力を行った場合：

```json
{
  "type": "tool_use",
  "name": "mcp__slack__search_messages",
  "input": {
    "query": "订单超时 yesterday"
  }
}
```

Claude Code は MCP 専用のバイパス経路を通ったりはしない。

通常のツール実行パイプラインにそのまま流れ込む：

```text
src/services/tools/toolExecution.ts

runToolUse()
```

実行チェーンはおおむね次のようになる：

```text
モデルが tool_use を出力
-> runToolUse()
-> findToolByName()
-> streamedCheckPermissionsAndCallTool()
-> MCPTool.call()
-> ensureConnectedClient()
-> callMcpTool()
-> mcpClient.callTool()
-> 対象 MCP Server
-> content / structuredContent / _meta を返す
-> tool_result にラップ
-> QueryEngine に戻り次のラウンドへ
```

このチェーンで本質的に重要なのは最初の 3 ステップだ。

### 1. `findToolByName()` はツールの出自を気にしない

`runToolUse()` はまず、モデルが出力したツール名を取得する：

```text
mcp__slack__search_messages
```

次に、現在利用可能なツールプールから検索する：

```text
findToolByName(toolUseContext.options.tools, toolName)
```

MCP ツールが検出層で内部 `Tool` にラップされていれば、ここで必ず見つかる。

メインループは、そのツールが Slack MCP 由来なのか、Postgres MCP 由来なのか、それとも組み込みの BashTool なのかを知る必要はない。

### 2. 権限チェックは引き続き統合パイプラインを通る

ツールが見つかった後も、Claude Code は次の処理を進む。

```text
streamedCheckPermissionsAndCallTool()
```

つまり、MCP tool も以下のステップを経由する。

- スキーマ検証
- フック
- 権限チェック
- ユーザー確認
- 実行中断
- 結果処理
- UI 表示

MCP はツールシステムをバイパスしない。

### 3. 実際に MCP RPC が発行されるのはかなり後段

実行が MCP Tool 自身の `call()` に入って初めて、MCP プロトコル呼び出しに突入する。

下位レイヤーはおおよそ以下の場所。

```text
packages/mcp-client/src/execution.ts

callMcpTool()
```

このレイヤーで MCP SDK が呼び出される。

```text
mcpClient.callTool({
  name: tool,
  arguments: args,
  _meta: meta
})
```

同時に以下も引き継がれる。

- abort signal
- progress callback
- timeout
- meta

サーバーがエラーを返した場合、Claude Code はそれを明示的な MCP tool call error としてラップし、意味不明な JSON-RPC エラーがそのまま上位レイヤーに漏れ出ることはない。

「エントリポイントが依然として汎用ツールパイプラインである」ことを把握するために、`toolExecution.ts` 全体を貼る必要はない。MCP に特別なショートカットは存在しないと理解しておけば十分だ。

```text
runToolUse()
-> findToolByName()
-> streamedCheckPermissionsAndCallTool()
-> checkPermissionsAndCallTool()
   -> input schema 検証
   -> validateInput
   -> runPreToolUseHooks
   -> canUseTool / permission dialog
   -> tool.call()
   -> post-hook
-> tool_result がメッセージストリームに戻る
```

ここでの `tool` が `mcp__slack__search_messages` であれば、組み込みの `Read` や `Bash` と同様に `streamedCheckPermissionsAndCallTool()` へ流れ込む。`isMcp` はこのパイプラインに付随するメタ情報にすぎず、別の実行経路を通るわけではない。

これはまさに、MCP がなぜ `Tool` としてラップされるのかを示している。このパイプラインに入りさえすれば、スキーマ検証、フック、権限、進捗表示、エラー回填、UI 表示が自動的に得られるのだ。

![06.MCP 図 7](./assets/06-mcp-mermaid-07.png)

このレイヤーが意味すること：

> MCP 呼び出しは外から見れば外部 RPC だが、Claude Code 内部では、まず一度「普通のツール呼び出し」として扱われる。

実際に MCP RPC を発行する下位レイヤーの関数は、次のように圧縮できる：

```text
callMcpTool()
-> mcpClient.callTool({ name, arguments, _meta }, { signal, timeout, onprogress })
-> result.isError なら McpToolCallError に変換
-> 401 なら McpAuthError に変換
-> それ以外は content / _meta / structuredContent を返す
```

このレイヤーこそ、プロトコル層が実際に動く場所である。ここに至ってようやく、Claude Code は内部の `Tool` 呼び出しを MCP の `callTool` リクエストに还原する：

```text
内部 Tool name: mcp__slack__search_messages
MCP 本来の tool name: search_messages
arguments: モデルが生成し、スキーマ検証を通過したパラメータ
_meta: Claude Code が付加する toolUseId などのメタ情報
```

同時に、以下の三つの工学的境界を処理する：

- `signal`：ユーザー中断やセッション中断時に呼び出しをキャンセルできる。
- `timeout`：外部サーバーが停止した場合でも、ランタイムを無期限に待機させない。
- `isError / 401`：プロトコルから返されたエラーを、Claude Code が理解できるエラー型に変換する。

## 9. 権限レイヤー：`mcp__server__tool` がセキュリティガバナンスの鍵

多くの人は MCP を「動的プラグイン」として捉えがちだ。

しかし Claude Code において、MCP ツールは単なる動的追加ツールではなく、必ず権限の名前空間に組み込まれなければならない。

二つのツールがあるとしよう：

```text
mcp__slack__send_message
mcp__discord__send_message
```

どちらも `send_message` という名前だが、リスクはまったく異なる。片方は社内 Slack にメッセージを送り、もう片方は外部コミュニティチャンネルに送るかもしれない。

権限システムはこれらを区別できなければならない。

これこそが、Claude Code がサーバーから返された生のツール名をそのまま使わず、完全修飾名を構築する理由だ。

権限チェック時にシステムが見ているのは：

```text
send_message
```

ではなく：

```text
mcp__slack__send_message
```

なのである。

これによって、よりきめ細かなガバナンスが実現できる：

```text
許可 mcp__postgres__list_tables
確認 mcp__postgres__query
禁止 mcp__slack__send_message
許可 mcp__slack__search_messages
```

さらに、これはフックシステムとも連携できる。

たとえば、すべての Slack MCP 書き込み操作は次のパターンでマッチする：

```text
mcp__slack__send_.*
```

すべての MCP ツールは次のパターンでマッチする：

```text
mcp__.*
```

設計の観点から見ると、`mcp__server__tool` は三つの課題を同時に解決している：

1. ツール名の衝突を防ぐ。
2. モデルに明確な出自を示す。
3. 権限とフックが外部機能を正確にマッチできるようにする。

ここでは二つの関数名だけを覚えておけば十分だ：

```text
buildMcpToolName(serverName, toolName)
-> mcp__server__tool を生成する

getToolNameForPermissionCheck(tool)
-> ツールが mcpInfo を持っていれば、それを使って完全修飾名を再構築する
-> そうでなければ tool.name を使う
```

ここで注意すべきは `getToolNameForPermissionCheck()` だ。権限チェックでは単純に `tool.name` を使うのではなく、`mcpInfo` から完全修飾名を再構築するほうが優先される。これにより、MCP ツールがあるモードでプリフィクスのない表示名（たとえば `Write`）を使っていたとしても、組み込みの `Write` に対する拒否ルールが誤ってマッチすることがない。

さらに権限マッチングは、`toolMatchesRule()` によって MCP の権限ルールを次の 2 段階の粒度で扱う。

```text
mcp__slack__send_message
-> Slack の send_message に完全一致

mcp__slack または mcp__slack__*
-> Slack サーバー配下のすべてのツールに一致
```

つまり、Claude Code の MCP 権限は「外部ツールはすべて確認を求める」といった大雑把なものではなく、サーバーとツールの 2 レベルで精緻に制御できるようになっている。

これこそが、MCP が Claude Code のツールシステムに安全に組み込まれるための鍵である。

## 10. 認証レイヤー：`needs-auth` はエラーではなく、ランタイムの状態である

リモート MCP サーバーは多くの場合、認証を必要とする。

たとえば Slack、GitHub、Jira、Figma といったサービスには、単一のローカルコマンドだけでアクセスすることはできない。通常は OAuth、Bearer トークン、企業 IdP、あるいはその他の認証方式が求められる。

Claude Code の接続レイヤーは、リモート認証に失敗した際に、単純に「接続失敗」を投げたりはしない。

より適切な状態は次のとおりだ。

```text
needs-auth
```

これは以下を意味する。

```text
サーバーは存在する
設定も存在する
しかし現在のユーザーはまだ認証を完了していない
```

これは `failed` とは異なる。

- `failed` は、コマンドが存在しない、ネットワークが到達不能、サーバーがクラッシュした、といった状況に近い。
- `needs-auth` は「ユーザーがログインすれば続行できる」という状況に近い。

この状態のモデル化は UI とインタラクションに影響を及ぼす。

- `/mcp` はユーザーを認証完了へ導ける。
- AppState は、あるサーバーがログインを必要としていることを表示できる。
- ツールプールは、未認証のツールを通常の利用可能ツールとして扱わない。
- 認証完了後に再接続し、tools/resources/prompts を再検出できる。

したがって、認証レイヤーの中核は「どうやってトークンを取得するか」ではなく、次の一点にある。

> 認証の失敗は、単なる例外としてではなく、Agent Runtime が理解できる状態として表現されなければならない。

## 11. リソースツール：MCP Resource に List / Read Tool が必要な理由

MCP resources は**コンテキスト**であり、アクションではありません。

ではなぜ Claude Code には、MCP Resources を List / Read するツールが存在するのでしょうか。

それは、モデルが外部コンテキストを**発見し、読み取る**手段を必要とするからです。

ユーザーは次のように明示的に入力できます：

```text
@postgres:schema://orders
```

しかし、モデルはタスクの途中で次のような情報を必要とする場合があります：

```text
現在どの MCP resource が利用可能か？
特定の resource の内容は何か？
```

そのため、MCP server が resources をサポートしている場合、Claude Code はリソースの一覧取得と読み取りの機能を自動的に提供します。

これはファイルシステムにおける `Glob` / `Read` とよく似ています：

- ファイルはツールの実行結果ではありませんが、モデルはファイルを発見し読み取る必要があります。
- Resource はツールによるアクションではありませんが、モデルは外部コンテキストを発見し読み取る必要があります。

次のように捉えるとわかりやすいでしょう：

```text
MCP Resource
-> 外部システム内の参照可能なコンテキスト

ListMcpResourcesTool / ReadMcpResourceTool
-> Claude Code がモデルに提供するリソースの発見・読み取りインターフェース
```

これこそが、MCP を単なる「外部ツールプロトコル」として理解すべきではない理由です。Claude Code において、MCP は以下の三層を同時に接続しています：

- **アクション**：tools を通じて
- **コンテキスト**：resources を通じて
- **ワークフローテンプレート**：prompts を通じて

## 12. 組み込みツールとの関係：MCP は拡張であり、代替ではない

MCP を理解する上で、もう一つ避けるべき誤解がある。

> MCP があれば、Claude Code の組み込みツールは重要ではなくなるのか？

違う。

組み込みツールと MCP ツールでは、担う役割が異なる。

組み込みツールは、いわば Claude Code のコアとなる身体能力だ。

- ファイルの読み取り
- ファイルの書き込み
- 検索
- シェルの実行
- タスク管理
- 計画の維持

MCP ツールは、いわば外部器官インターフェースだ。

- Slack の参照
- Jira の参照
- GitHub の操作
- データベースの読み取り
- Figma との接続
- 内部 API の呼び出し

これらは最終的に統一されたツールプロトコルに統合されるが、その出自とガバナンスの重点は異なる。

![06.MCP 図 8](./assets/06-mcp-mermaid-08.png)

つまり、MCP の意義は組み込みツールを代替することではない。Claude Code を「ローカルのプロジェクト環境しか操作できない」状態から、「外部のエンジニアリング世界にガバナンスを効かせながら接続できる」状態へと拡張することにある。

## 13. MCP モジュールが重厚に見える理由

プロトコルだけを見れば、MCP は難しくない。

```text
initialize
tools/list
tools/call
resources/list
resources/read
prompts/list
prompts/get
```

しかし Claude Code の MCP 実装が重厚に見えるのは、プロトコルの構文ではなく、ランタイムガバナンスを解決しているからだ。

最低限、以下の処理を同時にこなす必要がある。

- マルチスコープ設定
- プロジェクト設定の承認
- エンタープライズポリシー
- プラグイン注入
- claude.ai コネクター
- stdio / HTTP / SSE / WS / インプロセス transport
- OAuth および `needs-auth`
- 接続キャッシュ
- 自動再接続
- `list_changed` リフレッシュ
- tools / prompts / resources の 3 系統ディスカバリ
- `mcp__server__tool` 名前空間
- Tool ラッピング
- AppState 同期
- パーミッションとフック
- tool result ラッピング
- 中断、タイムアウト、進捗、エラーハンドリング

これが、薄い SDK ラッパーには見えない理由だ。

より正確に言えば、次のようになる。

> Claude Code の MCP モジュールとは、「外部機能取り込み層 + 接続ライフサイクル管理 + 機能ディスカバリ層 + パーミッション名前空間層 + Tool アダプター層」の複合体である。

## 14. Claude Code の MCP 実装を一枚の全体図にまとめる

完全なフローは以下の図として記憶するとよいでしょう。

![06.MCP 図 9](./assets/06-mcp-mermaid-09.png)

テキストのチェーンだけを抜き出すと、次のようになります。

```text
MCP 設定のマージ
-> connectToServer で接続確立
-> fetchTools / fetchCommands / fetchResources でケイパビリティ発見
-> Tool / Command / ServerResource にラップ
-> useManageMCPConnections で AppState.mcp に書き込み
-> runToolUse で汎用ツール実行チェーンを再利用
-> MCPTool.call 内部で callMcpTool を呼び出し
-> MCP サーバーが結果を返す
-> tool_result が次の会話ターンに渡る
```

## 15. ソースコードリーディングの入り口

ソースコードを追うなら、次の順序をおすすめする。

1. `src/services/mcp/config.ts`

   MCP 設定がどのソースからシステムに流入し、どのようにマージ、承認、重複排除、フィルタリングされるかを見る。

2. `src/services/mcp/client.ts`

   `connectToServer()` が stdio、HTTP、SSE、WebSocket、組み込み MCP、認証失敗、接続状態をどのように扱うかを見る。

3. `src/services/mcp/InProcessTransport.ts`

   組み込み MCP がプロセス内トランスポートを通じて、どのように標準 MCP サーバーを装うかを見る。

4. `src/services/mcp/mcpStringUtils.ts`

   `mcp__server__tool` という名前空間がどのように生成され、権限チェックがなぜこの名前に依存するかを見る。

5. `src/services/mcp/useManageMCPConnections.ts`

   MCP コネクションプールがどのように `AppState.mcp` に同期され、`list_changed`、切断、再接続をどう処理するかを見る。

6. `src/services/tools/toolExecution.ts`

   MCP ツールが最終的に `runToolUse()` から統一ツール実行パイプラインに入る理由を見る。

7. `packages/mcp-client/src/execution.ts`

   本物の `callMcpTool()` がどのように MCP SDK を呼び出し、シグナルを渡し、タイムアウトを処理し、エラーをラップするかを見る。

これらのファイルを読むときは、関数そのものだけを見てはいけない。関数を読むたびに、次の四つの問いを立てる。

```text
どのような入力を受け取るか？
どのようなランタイムオブジェクトを生成するか？
どのような状態を書き込むか？
その出力は次のどのレイヤーが消費するか？
```

こうすることで、MCP のソースコードは関数名の羅列に散らばらず、一本の実行チェーンとしてつながって見えてくる。

## 16. まとめ

Claude Code の MCP 実装は、一言でまとめると次のようになる。

> MCP とは、Claude Code が外部システムを Agent Harness に接続するための標準化された拡張レイヤーである。設定ガバナンス、トランスポート接続、機能検出、内部 Tool マッピング、AppState 同期、統一されたツール実行を通じて、外部サーバーを呼び出し可能・承認可能・再接続可能・監査可能なランタイム機能へと変える。

これこそが、一般的な「プラグインシステム」との違いでもある。

通常のプラグインシステムは、せいぜい「機能の入り口がいくつか増える」程度のものだ。一方、Claude Code の MCP はメインループへと通じる正規の道のようなものである。外部機能はまず `Tool` / `Command` / `Resource` にならなければならず、その上で権限、状態、UI、実行パイプラインを経由して初めて、現実世界に影響を及ぼせるようになる。

本章を理解しておけば、この後登場する Skill、マルチ Agent、Plan と MCP の境界もより明確になるだろう。

- MCP が解決するのは「外部機能をいかに標準化して接続するか」である。
- Skill が解決するのは「特定のタスク種別に対する方法論をいかに再利用するか」である。
- Agent 協調が解決するのは「複雑なタスクをいかに複数の実行者に分割するか」である。
- Plan が解決するのは「実行前にいかに意図をレビュー可能なステップへと変換するか」である。

MCP は Claude Code の拡張機能のすべてではない。しかし、Claude Code がローカルツールから外部世界へと踏み出すための、最初の扉なのだ。
