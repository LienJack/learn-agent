---
title: "Productized CLI：profile、extension、multi-provider"
description: "ここまで来ると、私たちの小さな CLI Agent は、最初の「一度だけ動く demo」ではなくなっています。"
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.jpg'
locale: "ja"
tags:
  - Agent
  - Harness
  - Productized CLI
  - Profile
  - Extension
  - Multi Provider
  - 技術チュートリアル
aliases:
  - 製品化 CLI
  - Agent Profile
  - Multi Provider CLI
  - Extension Runtime
---

# Productized CLI：profile、extension、multi-provider

ここまで来ると、私たちの小さな CLI Agent は、最初の「一度だけ動く demo」ではなくなっています。

provider runtime があります。

tool runtime があります。

plugin host があります。

capability discovery があります。

session replay があります。

モデルは intent だけを提示できることを知っています。

ツールは validate、permission、execute、observe を通らなければならないことを知っています。

外部能力が統一 tool pipeline を迂回してはいけないことも知っています。

自分のマシンで実験ツールを作るだけなら、ここまででも十分立派です。

次のように入力できます。

```text
このプロジェクトのテストがなぜ失敗しているか見て、直して。
```

Agent はテストを実行し、ファイルを読み、エラーを検索し、コードを変更し、もう一度テストを実行できます。

小型 Claude Code の原型のようです。

しかし、これを他人に使ってもらおうとした瞬間、問題の種類が急に変わります。

他人はこう聞くだけではありません。

```text
この Agent は一度動くか？
```

こう聞きます。

```text
別々のプロジェクトではどう使うのか？
```

こう聞きます。

```text
会社プロジェクトと個人プロジェクトで権限を変えられるか？
```

こう聞きます。

```text
デフォルトではどのモデルを使うのか？
```

こう聞きます。

```text
チーム extension をインストールできるか？
```

こう聞きます。

```text
provider を切り替えると、なぜツール挙動、出力形式、エラーメッセージまで変わるのか？
```

これが第 22 篇で答える問題です。

> demo CLI は一度動けばよい。製品化 CLI は profile、設定層、provider 切り替え、extension インストール、能力発見、プロジェクト指令、実行前チェック、安定出力プロトコルを、同じ Harness 規律の中に入れなければならない。

シリーズ全体の貫通例を続けます。

```text
ユーザーがプロジェクトルートで入力する：
このプロジェクトのテストがなぜ失敗しているか見て、直して。
```

demo 段階では、この文は loop を起動すればよいだけでした。

製品化段階では、同じ文の背後でより多くの見えない問いに答える必要があります。

現在使っている profile はどれか？

この profile はファイル変更を許すか？

このプロジェクトには独自の指令があるか？

プロジェクトは test-fix skill を登録しているか？

ユーザーは GitHub MCP extension をインストールしているか？

現在 provider は tool calling をサポートしているか？

fallback provider は同じ tool intent を受けられるか？

出力は人間向けの TTY なのか、それとも IDE / Workbench / CI host が解析するイベントストリームなのか？

これらの問いにシステムが明示的に答えなければ、製品化 CLI はコマンドライン引数と環境変数の偶然の組み合わせに戻ります。

今日は使えるかもしれません。

しかし他人が安定して使うのは難しいです。

この篇の中核結論を先に置きます。

```text
Productized CLI は demo を npm package に包むことではない。
Productized CLI は runtime 能力を、設定可能、拡張可能、検査可能、置換可能、host が消費可能な製品入口へ投影することである。
```

ここで最も重要な語は `profile` です。

しかし profile はテーマスキンではありません。

「デフォルトモデル名」でもありません。

まして、適当に組み合わせた prompt 群でもありません。

Agent Harness において profile は、ガバナンス可能な実行意図のまとまりを表すべきです。

```text
policy + tool bundle + context source + provider preference + output contract
```

つまり profile が答えるのは「見た目がどうか」ではありません。

答えるのは次です。

```text
この CLI は今、どんな身分、どんな権限、どんな能力、どんな context、どんなモデル好みで動くのか？
```

これが demo CLI と製品化 CLI の分岐点です。

## 問題の連鎖

まず、この篇の問題連鎖を固定します。

```text
demo CLI は 1 回のユーザー入力を agent loop に送るだけでよい
-> 能力が増えるにつれ、起動引数、環境変数、provider 設定、extension、プロジェクト指令が散らばり始める
-> 散らばった設定は、同じコマンドでもマシン、プロジェクト、provider ごとに挙動が不一致になる
-> 明示的な Profile が必要で、policy、tool bundle、context source、provider preference を組み合わせる
-> Profile は Plugin Host、Provider Runtime、Capability Discovery、Tool Runtime を迂回してはいけない
-> 設定層は merge 可能、説明可能、監査可能でなければならず、単に後勝ちで上書きしてはいけない
-> multi-provider は provider resolver と統一 model event contract を通じて動かなければならない
-> extension インストールは manifest、trust、capability catalog、discovery policy に入らなければならない
-> 製品化 CLI には doctor/status、安定イベント出力、host/workbench protocol も必要である
-> 最終的にユーザーが見るのは安定した CLI だが、内部は同じ Harness control system のままである
```

この連鎖で最も過小評価されやすいのは「安定性」です。

多くの demo が失敗するのは、モデルが賢くないからではありません。

環境が安定していないからです。

同じコマンドでも、A プロジェクトではデフォルトで書き込み可能、B プロジェクトではデフォルトで read-only。

同じコマンドでも、primary provider ではテストを直せるが、fallback provider では tool call 形式が変わる。

同じ extension でも、昨日はインストール後 tools が自動で見えたが、今日は path 変更で skill が発火しない。

同じ出力でも、端末ではきれいに見えるが、IDE host は進捗とツールイベントを解析できない。

これらは製品化 CLI が解決すべき問題です。

モデル問題ではありません。

Harness 入口層の問題です。

全体図にすると、おおよそこうです。

![Productized CLI：profile、extension、multi-provider Mermaid 1](assets/00-22-productized-cli-profile-extension/mermaid-01.png)

この図で最も重要なのは、モジュールが多いことではありません。

本当に重要なのは、CLI が loop を直接起動しなくなることです。

まず設定を解析します。

次に profile を決めます。

provider preference を解決します。

extension をロードします。

能力の可視集合を計算します。

最後にタスクを Agent Runtime へ渡します。

つまり：

```text
製品化 CLI の入口は model.call() ではない。
製品化 CLI の入口は、実行身分の解決である。
```

## 一、demo CLI はなぜ書くほど他人に渡しにくくなるのか

最も素朴な demo から始めます。

最初の CLI は、引数がこれだけかもしれません。

```bash
agent "このプロジェクトのテストがなぜ失敗しているか確認して、修正してください"
```

内部コードも直感的です。

```ts
const provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY });
const tools = createLocalTools(process.cwd());
const agent = new Agent({ provider, tools });

await agent.run(process.argv.slice(2).join(" "));
```

このコードの問題は 1 日目にはありません。

1 日目には明快です。

証明したいのは：

```text
モデルをツールにつなげられる。
ツール結果をモデルに戻せる。
loop を続けられる。
```

しかし 2 日目には `--model` を足します。

3 日目には `--dangerously-auto-approve` を足します。

4 日目には `--project-rules` を足します。

5 日目には `--provider anthropic` を足します。

6 日目には `--load-skill code-review` を足します。

7 日目には `--json` を足します。

8 日目には `--mcp-config` を足します。

9 日目には `--profile code` を足します。

すると CLI 入口はこうなり始めます。

```bash
agent \
  --provider openai \
  --model gpt-x \
  --fallback-provider anthropic \
  --allow-tool read,grep,bash,edit \
  --deny-command "rm -rf" \
  --project-rules .agent/rules.md \
  --skill test-fix \
  --mcp-config .agent/mcp.json \
  --json \
  "このプロジェクトのテストがなぜ失敗しているか確認して、修正してください"
```

もちろんこれでも動きます。

しかし、これはもう製品ではありません。

一時的な実行スクリプトです。

ユーザーは内部詳細を知りすぎる必要があります。

provider 名を知る必要があります。

どの tools を開くべきか知る必要があります。

どの skill をロードすべきか知る必要があります。

プロジェクトルールファイルをどこに置くか知る必要があります。

出力を誰が消費するか知る必要があります。

これは非常に現実的な問題を生みます。

```text
同じタスクのために、ユーザーが CLI 引数層で runtime をもう一度設計する必要がある。
```

これは Harness の目標と矛盾します。

Harness は本来、実行境界をエンジニアリングするためのものです。

最終入口で境界をすべてユーザーに返すなら、複雑さを別の場所へ移しただけです。

したがって製品化 CLI の第一歩は、さらに引数を増やすことではありません。

引数の背後にある実行意図を profile に収束させることです。

## 二、profile はテーマスキンではなく実行身分である

多くの製品で profile は単なる好み設定です。

たとえばテーマ色。

言語。

デフォルトフォントサイズ。

もちろんそれらも profile と呼べます。

しかし Agent CLI で profile がそれだけを表すなら、もったいなさすぎます。

Agent CLI で本当にリスクがあり、本当に差異があり、本当に安定再利用が必要なのは、UI 好みではありません。

実行身分です。

たとえば同じユーザーでも、3 種類の profile が必要かもしれません。

```text
chat：read-only Q&A。ファイルを変更せず、コマンドを実行しない。
code：現在 workspace の読み書き、低リスクテストコマンド実行を許す。高リスクコマンドは確認が必要。
review：diff とファイルのみ読む。書き込み禁止。findings first で出力する。
```

この 3 つは同じ binary を使うかもしれません。

同じ provider を使うかもしれません。

しかし同じ Agent ではありません。

実行身分が違うからです。

`chat` profile の仕事は回答です。

`code` profile の仕事は修正です。

`review` profile の仕事はレビューです。

見える tool 集合が異なります。

ロードするプロジェクト指令が異なります。

権限ポリシーが異なります。

出力形式も異なるかもしれません。

したがって profile は少なくとも 5 種類の内容を含むべきです。

```text
policy：何を許し、何を禁止し、何に確認が必要か。
tool bundle：デフォルトでどのローカル tool、MCP tool、extension tool を有効にするか。
context source：どのユーザールール、プロジェクトルール、skill、記憶、検索源をロードするか。
provider preference：優先 provider、モデル、能力要件、fallback 戦略。
output contract：TTY、JSON、IDE host、CI 向けの安定出力プロトコル。
```

profile を型にすると、おおよそこうです。

```ts
type AgentProfile = {
  id: string;
  description: string;
  policy: PolicyRef;
  toolBundles: ToolBundleRef[];
  contextSources: ContextSourceRef[];
  providerPreference: ProviderPreference;
  outputContract: OutputContractRef;
  extensionAllowlist: ExtensionRef[];
};
```

この型で最も重要なのはフィールド名ではありません。

provider SDK オブジェクトを直接入れていないことです。

ツール実行関数も直接入れていません。

profile が記述するのは「実行意図」です。

実際に provider をロードするのは Provider Runtime に任せます。

実際に tool をロードするのは Plugin Host と Tool Runtime に任せます。

可視能力を決めるのは Capability Discovery に任せます。

profile はそれらを乗っ取りません。

profile はこれらの層の選択を、再利用可能な身分として組み合わせるだけです。

図にするとこうです。

![Productized CLI：profile、extension、multi-provider Mermaid 2](assets/00-22-productized-cli-profile-extension/mermaid-02.png)

この図が表したいのは：

```text
profile は新しい runtime 層ではない。
profile は既存 runtime への組み合わせ宣言である。
```

言い換えると、profile は実行身分を選びます。

身分を実行するわけではありません。

profile が tool を直接実行するなら、それは tool runtime になります。

profile が model を直接呼ぶなら、それは provider runtime になります。

profile が各ターンの tool 可視性を直接決めるなら、capability discovery を飲み込みます。

それらは望むものではありません。

必要なのは次です。

```text
Profile は身分を選ぶ。
Runtime は身分を実行する。
Trace は身分がどう効いたかを証明する。
```

「失敗テストを直す」例に戻ります。

ユーザーが次を実行したとします。

```bash
harness --profile code "このプロジェクトのテストがなぜ失敗しているか確認して、修正してください"
```

システムは `code` を文字列スイッチとして扱うべきではありません。

次を解決すべきです。

```text
現在 workspace の読み書きが許されている。
現在 test 関連コマンドを実行できる。
現在 destructive shell は確認が必要。
現在 test-fix skill と local-tool bundle を優先ロードする。
現在 provider は tool calling と streaming をサポートするモデルを優先する。
現在出力は TTY event stream として表示するが、内部には構造化イベントを保持する。
```

これが profile の価値です。

「コード Agent がほしい」というユーザーの口語習慣を、Harness が実行可能、監査可能、再利用可能な実行身分に変えます。

## 三、設定層：製品化 CLI の第一の事実源

profile は組み合わせを解決します。

では profile 自体はどこから来るのでしょうか。

ここで設定層に入ります。

demo CLI は通常、環境変数だけを読みます。

たとえば：

```text
OPENAI_API_KEY
ANTHROPIC_API_KEY
AGENT_MODEL
```

製品化 CLI は環境変数だけに頼れません。

環境変数は平坦すぎるからです。

secret を置くには適しています。

一時的 override にも適しています。

しかし複雑なポリシーを表すには向きません。

たとえば：

```text
現在プロジェクトのデフォルトは code profile。
このプロジェクトは deploy コマンドの自動実行を禁止する。
このチームは GitHub MCP の read-only access だけを許可する。
現在 session は一時的に review profile へ切り替える。
CI mode では JSONL 出力が必須で、対話承認は禁止。
```

これらは孤立した変数の集まりではありません。

出所があります。

優先順位があります。

merge ルールがあります。

衝突説明があります。

製品化 CLI は少なくとも次の設定層を区別すべきです。

```text
組み込みデフォルト層：システム内蔵の安全デフォルト。
ユーザー層：ユーザーのグローバル好み、provider credential 参照、常用 profile。
プロジェクト層：リポジトリ内指令、許可 extension、プロジェクト tool policy。
session 層：今回実行の一時 mode、出力先、権限スイッチ。
コマンドライン層：ユーザーが明示的に渡した一回限り override。
環境層：secret と deployment environment 注入。
```

重要なのは層数が多いことではありません。

最終設定値の各々が次に答えられることです。

```text
どこから来たのか？
なぜこの値なのか？
誰が誰を上書きしたのか？
この上書きは許可されているのか？
```

したがって設定 merge は単にこうすべきではありません。

```ts
const config = {
  ...defaults,
  ...userConfig,
  ...projectConfig,
  ...envConfig,
  ...cliFlags,
};
```

このコードは簡潔に見えます。

しかし説明能力がありません。

ユーザーがこう聞いたとき：

```text
なぜこのプロジェクトでは自動 edit できないのか？
```

システムはこうしか言えません。

```text
最終結果がそうなっている。
```

これは不十分です。

製品化 CLI には設定 provenance が必要です。

つまり各値の出所記録です。

次のように抽象化できます。

```ts
type ConfigValue<T> = {
  value: T;
  source: "default" | "user" | "project" | "session" | "flag" | "env";
  path: string;
  reason?: string;
};

type ResolvedConfig = {
  activeProfile: ConfigValue<string>;
  permissionMode: ConfigValue<PermissionMode>;
  providerPreference: ConfigValue<ProviderPreference>;
  enabledExtensions: ConfigValue<string[]>;
  outputMode: ConfigValue<OutputMode>;
};
```

これにより `harness doctor` は問題を説明できます。

たとえば：

```text
activeProfile = code
  source: project
  path: .harness/config.yaml

permissionMode = ask
  source: user
  path: ~/.harness/config.yaml
  reason: project cannot escalate permission mode above user default
```

ここには重要なガバナンス点があります。

```text
すべての高優先層が低優先層を上書きできるわけではない。
```

たとえばプロジェクト設定が、ユーザーの read-only mode を強制的に自動変更 mode に引き上げるべきではありません。

コマンドライン引数も、組織ポリシーを迂回できるとは限りません。

環境変数は、名前が偶然存在するだけで高リスク tool を有効化すべきではありません。

組織またはホスト側 governance policy があるなら、それは上限として仲裁に参加すべきです。

ユーザー、プロジェクト、flag は境界を狭められますし、許可範囲内で実行方式を選べます。

しかし governance policy を越えて権限拡大することはできません。

したがって設定層は「merge」だけでは足りません。

「仲裁」も必要です。

意思決定経路として描くとこうです。

![Productized CLI：profile、extension、multi-provider Mermaid 3](assets/00-22-productized-cli-profile-extension/mermaid-03.png)

この図で最も重要なのは `合并仲裁` です。

設定層が単純な優先順位 stack ではないことを示します。

製品化 CLI の第一の事実源です。

設定層に provenance がなければ、後の profile、provider、extension は診断しにくくなります。

なぜある extension がロードされたか分かりません。

なぜモデルが fallback provider に切り替わったか分かりません。

なぜある tool がこのターンで見えないか分かりません。

最後にユーザーはすべてを「モデルが不安定」と見なします。

しかし本当に不安定なのは入口設定です。

## 四、multi-provider：provider 詳細をユーザー体験に漏らしてはいけない

第 12 篇ですでに述べました。

```text
provider は model event と tool intent だけを返す。
provider は tool を実行してはいけない。
provider は session state を持ってはいけない。
provider は loop を続けるかどうかを決めてはいけない。
```

製品化 CLI では、この規律をさらに外へ広げる必要があります。

runtime 内部だけが provider に汚染されなければよいわけではありません。

ユーザー体験も provider に汚染されてはいけません。

つまり、ユーザーは provider を切り替えるたびに CLI 全体を学び直すべきではありません。

たとえば次の体験はどれも悪いです。

```text
provider A では tool 名が read_file、provider B では file_read。
provider A では token event を出すが、provider B では raw chunk を出す。
provider A の rate limit メッセージは説明的だが、provider B は SDK error をそのまま投げる。
provider A は tool streaming をサポートするが、provider B はしないので CLI の進捗表示が消える。
provider A では review profile が使えるが、provider B では profile 設定フィールドが無効になる。
```

これらは provider 詳細の漏れです。

multi-provider の目標は「たくさんのモデルに接続できる」ことではありません。

本当の目標は：

```text
複数 provider を切り替えても、Harness の制御セマンティクスが変わらない。
```

これには Provider Resolver が必要です。

Provider Resolver は adapter ではありません。

adapter は、ある provider の request と response を内部 contract に翻訳します。

resolver は profile、タスク、能力要件、コスト、可用性、fallback 戦略に基づき、このターンでどの provider を使うかを選びます。

次のように考えられます。

```text
Profile：code task に適した provider が必要。
Runtime：このターンには streaming、tool calling、大きめ context が必要。
Config：ユーザーは provider A を優先し、rate limit 時は provider B へ fallback。
Resolver：このターンは provider A を選ぶ。失敗時は説明可能な規則で切り替える。
```

型ではこう表せます。

```ts
type ProviderPreference = {
  primary: ProviderSelector;
  fallbacks: ProviderSelector[];
  requiredCapabilities: ProviderCapability[];
  costCeiling?: CostPolicy;
  latencyPreference?: "low" | "balanced" | "quality";
};

type ProviderCapability =
  | "streaming"
  | "tool-intent"
  | "structured-output"
  | "large-context"
  | "vision";

type ProviderResolution = {
  selectedProvider: string;
  selectedModel: string;
  reason: string;
  missingCapabilities: ProviderCapability[];
  fallbackChain: string[];
};
```

ここには非常に重要な境界があります。

```text
ProviderCapability は内部能力セマンティクスである。
provider SDK の私有フィールドではない。
```

profile を次のように書いてはいけません。

```yaml
openai:
  response_format: json_schema
anthropic:
  tool_choice: auto
```

これは profile を provider 詳細に直接依存させます。

よりよい方式は：

```yaml
profile: code
provider:
  require:
    - streaming
    - tool-intent
    - structured-output
  prefer:
    quality: high
    latency: balanced
```

具体的な provider が structured output をどう表すかは、provider adapter が処理します。

CLI 層は実行要求だけを表現します。

これは第 12 篇の原則と一致します。

```text
provider 私有形式は provider runtime で止める。
profile と CLI は内部 capability だけを見る。
```

multi-provider のもう 1 つの要点は fallback です。

fallback は単なる catch 後のモデル切り替えではありません。

primary provider が rate limit で失敗したとき backup provider に切り替えるのは、一見合理的です。

しかし一連の問題を引き起こします。

backup provider は現在 tools schema をサポートするか？

backup provider は同じ streaming event をサポートするか？

backup provider は現在 context 長を受けられるか？

backup provider の安全ポリシーは一致するか？

fallback 後、event log はどう記録するか？

ユーザー出力には切り替えが起きたことを表示するか？

これらに統一回答がなければ、fallback は新たな不安定性を作ります。

フローにするとこうです。

![Productized CLI：profile、extension、multi-provider Mermaid 4](assets/00-22-productized-cli-profile-extension/mermaid-04.png)

この図で最も重要なのは、2 つの provider が最後に `ModelEvent` へ合流することです。

provider raw chunk に合流するのではありません。

SDK 私有オブジェクトに合流するのでもありません。

if/else 分岐群に合流するのでもありません。

provider 詳細が Core へ漏れれば、multi-provider はシステムを裂きます。

provider 詳細が CLI ユーザー体験に漏れれば、multi-provider はユーザーを設定エンジニアにしてしまいます。

製品化 CLI がやるべきことは逆です。

```text
内部は統一 contract。
外部は統一体験。
中間で provider adapter と resolver が差異を引き受ける。
```

## 五、extension：インストールは有効化ではなく、有効化は可視ではなく、可視は実行可能ではない

第 11 篇で Plugin Host を扱ったとき、境界を明確にしました。

```text
拡張は core を開放することではない。
拡張は外部能力を同じ Harness 規律に入れることである。
```

製品化 CLI では、この境界はより具体的になります。

ユーザーが本当に extension をインストールするからです。

たとえば：

```bash
harness extension install github
harness extension install playwright
harness extension install team-code-style
```

これは普通の plugin system のように見えます。

しかし Agent CLI の extension は普通の CLI plugin より敏感です。

extension がもたらす可能性があるものは：

```text
新しい tool。
新しい MCP server。
新しい Skill。
新しい Hook。
新しい project instruction。
新しい provider adapter。
新しい権限 preset。
新しい output renderer。
```

どれもモデル行動に影響し得ます。

したがって extension のライフサイクルは install / uninstall だけでは足りません。

少なくとも次の段階に分けるべきです。

```text
discover：インストール可能な extension を見つける。
install：ローカルまたはプロジェクト範囲へダウンロードしてインストールする。
verify：出所、バージョン、署名、checksum を検証する。
trust：ユーザーまたは組織ポリシーが信頼可否を決める。
load：Plugin Host が manifest を解析する。
contribute：provider/tool/hook/skill/context/output 能力を宣言する。
catalog：Capability Catalog に入る。
visible：Discovery Policy を通って今回可視になる。
execute：Tool Runtime と権限門を通って実行される。
audit：event が session log と trace に入る。
```

最も重要な 3 文は次です。

```text
インストールは有効化ではない。
有効化は可視ではない。
可視は実行可能ではない。
```

インストールはファイルが存在するだけです。

有効化は、システムが能力提供を許すことです。

可視は、このターンのモデルがその一部能力を見られることです。

実行可能は、具体的な intent が権限、引数、リスク、ユーザー承認を通過することです。

これらの段階を混ぜると、extension は安全穴になります。

たとえばプロジェクトに extension が含まれている。

ユーザーが clone すると CLI が自動ロードする。

extension が `deploy_production` tool を宣言する。

モデルはテスト修正中にそれを見る。

tool 引数には権限確認がない。

このとき extension system は能力を拡張しているのではありません。

モデルに迂回路を開いています。

製品化 CLI はこれを避ける必要があります。

extension manifest は宣言であるべきです。

実行ではありません。

たとえば：

```ts
type ExtensionManifest = {
  id: string;
  version: string;
  source: "builtin" | "user" | "project" | "organization";
  contributes: {
    providers?: ProviderContribution[];
    tools?: ToolContribution[];
    skills?: SkillContribution[];
    hooks?: HookContribution[];
    contextSources?: ContextSourceContribution[];
    outputRenderers?: OutputRendererContribution[];
  };
  trust: TrustRequirement;
  permissions: PermissionDeclaration[];
};
```

この manifest は Plugin Host に入ります。

Plugin Host は形の検証を担当します。

Capability Catalog は候補能力を記録します。

Discovery Policy は今回可視な能力を決めます。

Tool Runtime は実行を担当します。

Audit は記録を担当します。

extension 自体がこれらの層を越えてはいけません。

ライフサイクルを図にするとこうです。

![Productized CLI：profile、extension、multi-provider Mermaid 5](assets/00-22-productized-cli-profile-extension/mermaid-05.png)

この図は第 11 篇と第 17 篇をつなぎます。

Plugin Host は extension がシステムへどう入るかを解決します。

Capability Discovery は extension 能力がいつモデル視野に入るかを解決します。

Tool Runtime は extension tool をどう実行するかを解決します。

Profile は、どの種類の extension が現在の実行身分へデフォルト参加できるかを決めます。

たとえば `code` profile は次を許すかもしれません。

```text
local-tools
test-runner
project-skills
github-readonly
```

しかし次は許しません。

```text
deploy-production
database-write
cloud-admin
```

`review` profile は GitHub read-only を許すかもしれません。

しかし Edit は許しません。

`research` profile は Web と citation tools を許すかもしれません。

しかし workspace 変更は許しません。

これが profile と extension の関係です。

```text
extension は候補能力を提供する。
profile は実行身分のデフォルト境界を定義する。
discovery は今回の可視集合を決める。
permission は具体的呼び出しが着地できるか決める。
```

4 層のどれも欠けてはいけません。

したがって `extensionAllowlist` は trust / enable の前提条件にすぎません。

今回の visible set でも、具体的 tool intent の permission allow でもありません。

## 六、プロジェクト指令：リポジトリルール全文を system prompt に詰め込まない

製品化 CLI では非常に現実的なニーズにも出会います。

```text
各プロジェクトには独自ルールがある。
```

たとえば：

```text
このリポジトリは pnpm を使う。
テストコマンドは pnpm test。
generated ファイルを変更しない。
React コンポーネントはプロジェクト内 design system を使う。
API エラー形式は { code, message } でなければならない。
commit 前に typecheck を実行する。
```

demo CLI が最もやりがちなのは、起動時にプロジェクトルールファイルを読み、system prompt に直接連結することです。

初期には受け入れられます。

しかし製品化後は問題になります。

第一に、プロジェクトルールは長い可能性があります。

全文を system prompt に入れると、タスク context を圧迫します。

第二に、プロジェクトルールの一部は特定 path でだけ関連します。

フロントエンドコンポーネント規則が backend migration file に影響すべきではありません。

第三に、プロジェクトルールは profile と衝突する可能性があります。

プロジェクトが「自動修正可」と言っても、ユーザーの現在 profile は `review` かもしれません。

第四に、プロジェクトルールは信頼できない可能性があります。

リポジトリファイル自体が prompt injection を含むかもしれません。

したがってプロジェクト指令は context source として扱うべきです。

無条件の system prompt ではありません。

Context source には出所、範囲、信頼度、発火条件が必要です。

たとえば：

```ts
type ContextSource = {
  id: string;
  source: "builtin" | "user" | "project" | "extension";
  trust: "trusted" | "workspace" | "untrusted";
  appliesTo?: PathPattern[];
  profileScope?: string[];
  loader: ContextLoader;
  projection: "summary" | "full" | "handle";
};
```

ここで `projection` が重要です。

一部のプロジェクト指令は要約して常駐できます。

一部は handle だけを渡し、モデルが必要時に読むべきです。

一部は path が当たるまで context に入れるべきではありません。

これは Skill の progressive disclosure と同じ思想です。

すべての経験を常駐させない。

正しい時点で現れさせる。

「失敗テストを修正する」例では、CLI 起動時に軽量なプロジェクト指令要約をロードできます。

```text
プロジェクトは pnpm を使う。
テストコマンドは pnpm test を優先する。
変更前に関連テストを読む。
dist/ と generated/ を編集しない。
```

Agent が `packages/frontend` 内のコンポーネントファイルを読んだら、フロントエンド規則を有効化します。

Agent がデータベース migration を読んだら、DB 規則を有効化します。

Agent がファイル編集準備をしたら、禁止 path ポリシーを permission gate に渡します。

これは「プロジェクトルール全文を prompt に入れる」よりずっと堅いです。

モデルが見るのは現在タスクに関連するルールです。

Harness はルールの出所と適用範囲を保存します。

権限システムはルール内の硬い境界を実行します。

プロジェクト指令は、もはや大きな prompt ではありません。

profile と context policy が共同管理する実行入力になります。

## 七、実行チェック：`doctor` は製品化 CLI の自己診断入口

CLI が製品化段階に入ると、多くの問題はユーザータスクが失敗してから露出すべきではありません。

たとえば：

```text
provider credential が欠けている。
デフォルト profile が存在しない。
extension はインストール済みだが信頼されていない。
MCP server 設定 path が間違っている。
プロジェクトルールファイルの解析に失敗した。
permission mode と profile が衝突している。
現在 provider が tool-intent をサポートしない。
JSON output mode なのに対話承認が存在する。
```

これらが Agent loop 内で初めて爆発すると、体験は悪くなります。

ユーザーはまたモデルが変なことをしたと思います。

しかし実際には起動環境が満たされていません。

したがって製品化 CLI には `doctor` または `status` が必要です。

装飾コマンドではありません。

実行前チェックです。

`doctor` が確認すべきなのは、Harness が現在 profile で正常に動けるかです。

たとえば：

```bash
harness doctor --profile code
```

出力は単にこうであってはいけません。

```text
OK
```

層ごとに報告すべきです。

```text
Config: OK
Profile: code resolved from project
Provider: primary available, fallback configured
Extensions: github-readonly trusted, playwright disabled
Capabilities: Read/Grep/Bash/Edit visible under ask mode
Context: project instructions loaded, frontend skill conditional
Output: tty interactive, json events disabled
Warnings:
  - CI MCP is configured but not reachable
```

これによりユーザーは実行前にシステム状態を知れます。

より重要なのは、host もシステム状態を知れることです。

第 22 篇は CLI 自体の実行だけではありません。

M7/M11 の CLI Host + Workbench への準備でもあります。

Workbench は人間向け端末文字列を読んで Agent 状態を理解することはできません。

安定プロトコルが必要です。

そのため `doctor` は構造化出力もサポートするとよいです。

```bash
harness doctor --profile code --json
```

返すのはログの束ではありません。

安定した schema です。

この schema は IDE、Workbench、CI、remote host が消費できます。

たとえば：

```ts
type DoctorReport = {
  ok: boolean;
  profile: {
    id: string;
    source: string;
    warnings: Diagnostic[];
  };
  providers: ProviderDiagnostic[];
  extensions: ExtensionDiagnostic[];
  capabilities: CapabilityDiagnostic[];
  output: OutputDiagnostic;
};
```

背後にある製品化原則は次です。

```text
人間向け UI は美しくできる。
機械向け UI は安定していなければならない。
```

CLI に TTY テキストしかなければ、Workbench は文字列解析に頼るしかありません。

それは非常に脆いです。

CLI に安定イベントプロトコルがあって初めて、Workbench は Agent 実行過程を可視化ワークベンチに変えられます。

## 八、安定出力プロトコル：端末レンダリングは出力の 1 つの projection にすぎない

demo CLI の出力は通常こうです。

```text
Assistant: テストを確認します。
Running: npm test
...
失敗原因は...
```

人間には十分です。

しかし製品化 CLI には複数の消費者がいます。

人間は端末で見ます。

IDE はサイドバーで見ます。

Workbench はタスクタイムラインで見ます。

CI はログシステムで見ます。

remote host は web UI で見ます。

CLI が自由テキストだけを出すなら、これらの消費者は推測するしかありません。

したがって製品化 CLI は出力を 2 層に分けるべきです。

```text
Event Stream：安定した構造化イベント。事実出力。
Renderer：イベントを TTY、JSONL、Workbench UI、CI log にレンダリングする。
```

これは Session Replay の思想と一致します。

事実源は event です。

UI は projection にすぎません。

最小イベントプロトコルは次を含められます。

```ts
type CliEvent =
  | { type: "session.started"; sessionId: string; profile: string }
  | { type: "provider.selected"; provider: string; model: string; reason: string }
  | { type: "assistant.delta"; text: string }
  | { type: "tool.intent"; tool: string; intentId: string }
  | { type: "tool.approval.requested"; intentId: string; risk: string }
  | { type: "tool.started"; intentId: string }
  | { type: "tool.finished"; intentId: string; exitCode?: number }
  | { type: "capability.visible_set.changed"; added: string[]; removed: string[] }
  | { type: "diagnostic.warning"; message: string }
  | { type: "session.finished"; outcome: "completed" | "failed" | "needs-user" };
```

ここで急いで完全設計にする必要はありません。

まず事実と rendering を分けることが重要です。

端末 UI は `tool.started` を spinner として表示できます。

Workbench は timeline node として表示できます。

CI は grouped log として表示できます。

JSONL はそのまま 1 行 1 イベントで出せます。

しかしイベント自体は安定しています。

図にするとこうです。

![Productized CLI：profile、extension、multi-provider Mermaid 6](assets/00-22-productized-cli-profile-extension/mermaid-06.png)

この図で最も重要なのは、`Runtime` が漂亮なテキストを直接出力すべきではないことです。

Runtime は事実 event を出します。

Renderer が美化を担当します。

こうすると別の利点もあります。

```text
multi-provider が出力 protocol に影響しない。
extension が勝手に print して JSON を壊さない。
profile が output contract を選べる。
host が Agent 状態を安定解析できる。
```

extension が進捗を出す必要があるなら、構造化 event を提出すべきです。

直接 `console.log` してはいけません。

そうしないと機械出力を壊します。

これが製品化 CLI と demo CLI の違いです。

demo CLI は「動いているように見える」を追求します。

製品化 CLI は「誰が消費しても理解できる」を追求します。

## 九、同じタスクは製品化 CLI でどう進むか

すべての層を「失敗テストを直す」貫通例へ戻します。

ユーザー入力：

```bash
harness --profile code "このプロジェクトのテストがなぜ失敗しているか確認して、修正してください"
```

製品化 CLI の第一歩はモデル呼び出しではありません。

まず設定を解析します。

プロジェクト設定のデフォルト profile も `code` であることを見つけます。

コマンドラインが明示的に `code` を指定しており、衝突はありません。

ユーザーのグローバルポリシーは、高リスクコマンドに確認を要求します。

プロジェクトルールは `generated/` の変更を禁止します。

extension 設定では `test-runner` と `github-readonly` が有効です。

provider preference は streaming と tool-intent のサポートを要求します。

出力先は対話 TTY で、内部には JSON event stream を保持します。

第二歩で、Provider Resolver が provider を選びます。

primary provider が利用可能です。

primary provider は tool-intent、streaming、現在 context length をサポートします。

`provider.selected` event を記録します。

第三歩で、Extension Runtime が信頼済み extension をロードします。

`test-runner` は project-aware test command skill を提供します。

`github-readonly` は read-only MCP tools を提供します。

それらは Capability Catalog に入ります。

しかしまだ全部がモデルに可視ではありません。

第四歩で、Capability Discovery がこのターンの visible set を計算します。

失敗テスト修正タスクでは、デフォルトで次を露出します。

```text
Read
Grep
Bash(test commands with approval)
Edit(with workspace policy)
SkillSearch
ToolSearch
```

GitHub MCP はまだ visible set に入りません。

現在、リモート PR や CI が必要だという証拠がないからです。

第五歩で、Agent Runtime が loop を開始します。

モデルはテスト実行の tool intent を提示します。

Tool Runtime がコマンドを検証します。

Permission Gate は `pnpm test` が低リスクテストコマンドだと判断します。

実行後 observation が書き戻されます。

第六歩で、モデルは失敗ログに基づいて関連コードを検索します。

ファイルを読みます。

フロントエンドコンポーネントテストの失敗だと分かります。

path がフロントエンド project instruction に命中します。

Capability Discovery は frontend component skill を可視集合に追加します。

第七歩で、モデルが edit intent を提示します。

権限確認で対象が `generated/` 内ではないことを確認します。

edit を実行します。

event が session log に入ります。

第八歩で、モデルが再びテストを実行します。

テストは通ります。

Renderer が人間向け要約を出力します。

Event stream が `session.finished` を出力します。

全体の過程は時系列図にできます。

![Productized CLI：profile、extension、multi-provider Mermaid 7](assets/00-22-productized-cli-profile-extension/mermaid-07.png)

この図で最も重要なのは：

```text
profile 解決は loop より前に起きる。
extension contribution は discovery より前に起きる。
provider 選択は model request より前に起きる。
出力 protocol は最後の文字列連結ではなく、runtime event から始まる。
```

順序が逆になると、システムは脆くなります。

たとえば loop を先に起動し、後から extension を発見する。

モデルの第 1 ターンでは正しい能力が見えません。

先に provider を呼び、後から tool-intent 非対応だと分かる。

システムは途中で失敗するしかありません。

先に自由テキストを出力し、後から Workbench に解析させようとする。

脆いログ解析に頼るしかありません。

製品化 CLI の安定性は、これらの前置解決から来ます。

## 十、最小導入：一度に完全プラットフォームにしない

ここまで話すと、Productized CLI が巨大システムに見えがちです。

しかしこのシリーズの原則を保ちます。

```text
各篇は、最小の検証可能な増分だけを進める。
```

第 22 篇の最小導入に plugin marketplace は不要です。

アカウントシステムも不要です。

クラウド同期も不要です。

完全な Workbench も不要です。

demo CLI を安定入口 protocol を持つローカル製品へアップグレードすればよいです。

最小ファイル境界は次のようにできます。

```text
src/cli/
  main.ts
  args.ts
  output.ts
  doctor.ts

src/config/
  defaults.ts
  loader.ts
  merge.ts
  provenance.ts

src/profile/
  profile.ts
  resolver.ts
  builtin-profiles.ts

src/provider/
  resolver.ts
  capabilities.ts

src/extensions/
  manifest.ts
  loader.ts
  trust.ts

src/events/
  cli-events.ts
  renderers/
    tty.ts
    jsonl.ts
```

第一歩は内蔵 profiles を作ることです。

たとえば：

```ts
const builtinProfiles: AgentProfile[] = [
  {
    id: "chat",
    description: "読み取り専用のQ&A。外部アクションは実行しない",
    policy: "readonly",
    toolBundles: ["read-only"],
    contextSources: ["user", "project-summary"],
    providerPreference: {
      primary: { family: "general" },
      fallbacks: [],
      requiredCapabilities: ["streaming"],
    },
    outputContract: "tty-interactive",
    extensionAllowlist: [],
  },
  {
    id: "code",
    description: "修复代码、运行测试、受控修改工作区",
    policy: "workspace-edit-ask",
    toolBundles: ["local-code-tools"],
    contextSources: ["user", "project", "conditional-skills"],
    providerPreference: {
      primary: { family: "code" },
      fallbacks: [{ family: "general" }],
      requiredCapabilities: ["streaming", "tool-intent"],
    },
    outputContract: "tty-events",
    extensionAllowlist: ["test-runner", "github-readonly"],
  },
];
```

第二歩は設定解析と provenance です。

たとえば：

```ts
const resolved = resolveConfig({
  defaults: loadDefaultConfig(),
  user: await loadUserConfig(),
  project: await loadProjectConfig(cwd),
  session: sessionOverrides,
  flags: parsedFlags,
  env: process.env,
});

const profile = resolveProfile(resolved.activeProfile.value, {
  builtinProfiles,
  userProfiles: resolved.userProfiles.value,
  projectProfiles: resolved.projectProfiles.value,
});
```

第三歩は provider resolver です。

たとえば：

```ts
const providerResolution = await resolveProvider({
  preference: profile.providerPreference,
  availableProviders: providerRegistry.list(),
  required: profile.providerPreference.requiredCapabilities,
  diagnostics: true,
});
```

第四歩は extension manifest loader です。

最初はローカルディレクトリだけをサポートします。

manifest 読み取りだけをサポートします。

trust 状態だけをサポートします。

リモートインストールは急ぎません。

たとえば：

```ts
const extensions = await loadEnabledExtensions({
  config: resolved.enabledExtensions.value,
  trustStore,
  cwd,
});

for (const extension of extensions) {
  pluginHost.register(extension.manifest.contributes);
}
```

第五歩は CLI event stream です。

重要ステップはすべて event を出します。

たとえば：

```ts
events.emit({
  type: "profile.resolved",
  profile: profile.id,
  source: resolved.activeProfile.source,
});

events.emit({
  type: "provider.selected",
  provider: providerResolution.selectedProvider,
  model: providerResolution.selectedModel,
  reason: providerResolution.reason,
});
```

第六歩は `doctor` です。

同じ resolver を再利用します。

agent loop を起動しないだけです。

これは重要です。

`doctor` に別の設定ロジックを持たせてはいけません。

doctor と run が別々の resolver を使うと、最悪の状況になります。

```text
doctor は問題なしと言う。
run はまだ失敗する。
```

したがって最小実装の荷重経路は次であるべきです。

```text
args -> config resolver -> profile resolver -> extension loader -> provider resolver -> capability bootstrap -> event output -> agent runtime
```

doctor はこの同じ経路で早めに止まるだけです。

## 十一、製品化 CLI の悪いにおい

この種のシステムで壊れやすい場所は、モデル呼び出しではありません。

入口層に少しずつ迂回路が生えるところです。

### 悪いにおい一：profile が単なる model alias

`code` profile が単にこれだけなら：

```yaml
model: some-code-model
```

権限を表していません。

tool 集合を表していません。

context source を表していません。

output protocol を表していません。

これは Agent profile ではありません。

単なるモデル別名です。

モデル別名はもちろん有用です。

しかしそれを profile と呼んではいけません。

そうしないと、後続のすべての本番化能力が model config に詰め込まれます。

最後に provider 設定が新しいゴミ箱になります。

### 悪いにおい二：プロジェクト設定がユーザー権限を引き上げられる

プロジェクト設定は境界を狭められるべきです。

しかしユーザー境界を静かに広げるべきではありません。

ユーザーの global mode が read-only なら、プロジェクト設定が自動で write を有効化してはいけません。

組織ポリシーがある種類の extension を無効にしているなら、プロジェクトが再び開いてはいけません。

そうでないと、ユーザーがリポジトリを clone しただけで、リポジトリ設定により Agent の挙動が変わる可能性があります。

これは Agent CLI では非常に危険です。

### 悪いにおい三：extension インストール後に自動で prompt に入る

インストールはファイルが存在するだけです。

有効化は contribution を許すことです。

可視化は discovery を通す必要があります。

実行は permission を通す必要があります。

インストール後に extension のすべての tools を直接モデルへ渡すなら、Capability Discovery を迂回しています。

第 17 篇で述べた tool overload 問題を再び作ります。

### 悪いにおい四：provider fallback が出力セマンティクスをこっそり変える

fallback は起きてよいです。

しかし記録されなければなりません。

出力 event セマンティクスも変わらないことを保証しなければなりません。

fallback 後に `tool.intent` が出なくなったり、tool call が provider raw chunk になったりすると、host は解析能力を失います。

fallback によってユーザー体験が別製品になってはいけません。

### 悪いにおい五：JSON mode に漂亮なログが混ざる

これは CLI 製品で特によくある問題です。

開発時の便利さから、ある extension や adapter にこう書いてしまう。

```ts
console.log("starting provider...");
```

TTY では問題ありません。

JSONL では災害です。

機械消費者は不正な行を読みます。

したがって製品化 CLI には統一 event bus が必要です。

すべての出力は renderer を通ります。

### 悪いにおい六：doctor と run が解析経路を共有しない

`doctor` が手書きのチェック群にすぎないなら、すぐ古くなります。

本当に信頼できる doctor は、同じ config/profile/provider/extension resolver を呼ぶべきです。

そして結果を診断レポートとしてレンダリングします。

そうでなければ doctor は気休めです。

## 十二、この篇はどうテストすべきか

第 22 篇に対応するテスト重点はモデル効果ではありません。

入口層の決定性です。

第一類テスト：profile 解析。

```text
default/user/project/flag の多層設定を与える。
ユーザーが code profile を選ぶ。
システムは正しい policy、tool bundle、context source、provider preference、output contract を解決する。
```

第二類テスト：設定 provenance。

```text
プロジェクト設定が permission を read-only から auto-edit へ引き上げようとする。
システムは引き上げを拒否し、diagnostics に出所を説明する。
```

第三類テスト：provider resolver。

```text
primary provider が tool-intent capability を欠く。
システムは要件を満たす fallback を選ぶ。
fallback がない場合は doctor 段階でエラーにし、loop に入らない。
```

第四類テスト：extension trust。

```text
インストール済みだが信頼されていない extension は能力を提供してはいけない。
信頼済み extension は catalog に入れる。
ただしその tool はなお discovery と permission を通る必要がある。
```

第五類テスト：JSONL 出力の純粋性。

```text
--json mode では stdout の各行が合法な CliEvent JSON である。
人間向けログは stderr または TTY renderer にだけ入り、JSONL に混ざらない。
```

第六類テスト：doctor と run の一致。

```text
doctor が使う resolved profile、provider resolution、extension diagnostics は、
run 起動前に使う結果と一致しなければならない。
```

第七類テスト：同一タスクの provider 間セマンティクス安定性。

```text
fake provider A と fake provider B が異なる raw 形式を返す。
Provider Runtime は同じ ModelEvent と ToolIntent に正規化する。
CLI 出力 event は同一 schema を保つ。
```

これらのテストは「モデルがテストを直した」より刺激的ではありません。

しかし製品化 CLI の実リスクにより近いです。

ユーザーは毎日、複雑な推論失敗に遭うわけではありません。

設定、provider、extension、output protocol、環境差には毎日遭います。

ここを安定させて初めて、Agent は製品らしくなります。

## 十三、この層が解決するもの、導入するもの

この篇をまとめます。

Productized CLI が解決するのは「Agent が考えられるか」ではありません。

前の記事ですでに model、loop、tool、context、session、capability、delegation を解決しました。

この篇が解決するのは：

```text
これらの runtime 能力を、実ユーザーと host に向けて安定した製品入口としてどう公開するか。
```

散らばった CLI flags を profile に収束します。

provider 切り替えを resolver に収束します。

extension インストールを manifest、trust、catalog、discovery、permission に収束します。

プロジェクト指令を context source に収束します。

端末出力を event stream と renderer に収束します。

実行環境問題を doctor に収束します。

新しい複雑さも導入します。

第一に、設定システム自体が複雑になります。

そのため provenance と診断が必要です。

第二に、profile が何でも入れる箱として乱用される可能性があります。

そのため profile は実行身分だけを表し、能力を実行しません。

第三に、multi-provider は能力差をもたらします。

そのため provider capability は内部セマンティクスで表す必要があります。

第四に、extension は trust 問題をもたらします。

そのためインストール、有効化、可視、実行可能を分ける必要があります。

第五に、host/workbench は安定 protocol を必要とします。

そのため Runtime event と Renderer を分ける必要があります。

これはちょうど次篇につながります。

CLI が製品入口として動けるようになったら、次の一歩はローカル CLI に能力を積み続けることではありません。

次は Harness をより遠い環境へ置くことです。

```text
Sandbox、Cron、durable execution、リモート deployment。
```

つまり Hosted Harness です。

そのとき、profile はリモートタスクの実行身分になります。

extension trust は deployment 境界になります。

provider resolver は scheduling 戦略になります。

event stream は remote observability protocol になります。

そして本篇の Productized CLI は、Hosted Harness に入る前の最後のローカル入口規律です。

この篇を一文で覚えるなら：

```text
製品化 CLI は Agent をコマンドに包むことではなく、Agent の実行身分、能力境界、モデル好み、拡張出所、出力 protocol をすべて説明可能な Harness 入口にすることである。
```

## 教学 Harness への落とし込み

教学プロジェクトを productize するときは、複雑な platform より先に profile と stable output を足します。profile は provider、default tools、permission mode、output renderer を決めます。CLI や API の出力は human-readable log と machine-readable JSONL を分けます。これで同じ Harness を local interaction、CI smoke test、documentation に使えます。

---

GitHub ソース: [00-22-productized-cli-profile-extension.md](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-22-productized-cli-profile-extension.md)
