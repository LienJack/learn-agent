---
title: "Plugin Host：なぜ core は拡張されることを覚える必要があるのか？"
description: "第 10 篇では、とても重要な境界を一つ固定しました。"
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.jpg'
locale: "ja"
tags:
  - Agent
  - Harness
  - Plugin Host
  - Hook Kernel
  - 技術チュートリアル
aliases:
  - Plugin Host
  - Core Extension
  - Agent プラグインホスト
---

# Plugin Host：なぜ core は拡張されることを覚える必要があるのか？

第 10 篇では、とても重要な境界を一つ固定しました。

```text
モデルは Intent だけを提示する。
システムは Validate、Approve、Execute、Observe を担当する。
```

この境界があるから、小さな CLI Agent は「モデルが言ったことを、システムがそのまま実行する」ものにならずに済みます。

しかし実際に書き続けると、すぐに別の問題にぶつかります。

最初のうちは、core にすべてを直接書き込めます。

```text
1 つの provider adapter
いくつかのローカルツール
1 つの権限判定関数
1 つのイベントログ
1 つの loop
```

これは M0 では合理的です。

なぜなら M0 の目的は完全なプラットフォームを作ることではなく、まず次を証明することだからです。

```text
実際のモデルをシステムに接続できる。
ただし、モデルがシステムを乗っ取ることはない。
```

ところが M1 になると、状況が変わります。

2 つ目の provider を接続したくなります。

ファイルツール、検索ツール、ターミナルツールを独立した bundle に分けたくなります。

プロジェクト自身に特定の hook を登録させたくなります。

チーム内の内部システム、コード規約、レビュー手順、デプロイ入口を接続したくなります。

ワークスペースごとに異なる能力を有効化したくなります。

すると core は膨らみ始めます。

最初は `if` が数個増えるだけです。

しかしすぐに、こうなります。

```text
provider が openai なら、こちらを通る。
provider が anthropic なら、あちらを通る。
tool が local bundle 由来なら、ローカル権限ポリシーを使う。
tool が MCP 由来なら、先に server scope を確認する。
hook が preToolUse なら、阻断できなければならない。
hook が postToolUse なら、観察だけできる。
plugin が無効なら、その tool を公開しない。
plugin の起動に失敗しても、agent 全体を巻き込んで落とさない。
```

ここまで来ると、次のことに気づきます。

```text
core は、もはや core だけではない。
core は、あらゆる具体的能力のごみ箱になっている。
```

この記事が答えたい中心の問いは、これです。

> なぜ Agent Harness の core は拡張されることを覚えなければならないのか。そして、なぜ「拡張可能」とは境界を開放することではなく、外部能力を同じ Harness の規律へ入れることなのか。

ここで先に境界を押さえておきます。

```text
core が拡張されることを覚える、とは core が手放すことではない。
Plugin Host は、外部能力を自由にシステムへ入れる仕組みではない。
Plugin Host は、外部能力を同じ Harness の規律へ並ばせて入れる仕組みである。
```

シリーズ全体で使っている例を、そのまま続けます。

```text
ユーザーがプロジェクトルートで入力する：
このプロジェクトのテストがなぜ失敗するのか見て、直して。
```

今回は、Agent にはすでに M0 の core kernel があります。

モデルを呼び出せます。

tool intent を受け取れます。

intent と execution は分けなければならないことを知っています。

しかし今度は、新しい能力を生やしたい。

```text
provider plugin：別のモデル提供元を提供する。
local-tools plugin：read/search/shell/edit を提供する。
test-runner plugin：npm test / pytest の検出戦略を提供する。
policy plugin：プロジェクトレベルの権限 hook を提供する。
```

問題は、これらの能力がすべて core の外から来ることです。

core はどう受け入れれば、それらに汚染されずに済むのでしょうか。

これが Plugin Host が現れる理由です。

## 問題の連鎖

まず、この記事の問題の連鎖を固定します。

```text
M0 core は provider、tool、hook を直接内蔵できる
-> 能力が増えると、core は具体的なモデル、具体的な tool、具体的な戦略に汚染される
-> 汚染された core はテストしにくく、差し替えにくく、統制しにくい
-> 外部能力を plugin としてシステムへ入れる必要がある
-> plugin は core を直接変更できず、能力と lifecycle だけを宣言する
-> Plugin Host は plugin の load、validate、register、start、stop を担当する
-> Registry は外部能力を内部の統一 contract に変換する
-> Hook Kernel は拡張点を制御された阻断点に変える
-> 拡張とは Harness を迂回することではなく、同じ Harness の規律に入ることである
```

この連鎖で最も重要なのは、「plugin によってシステムが柔軟になる」ことではありません。

柔軟さは表面的な利益です。

本当の利益は、こちらです。

```text
core はすべての具体的能力を知る必要がなくなる。
core は外部能力がどのようにシステムへ入るべきかだけを知ればよい。
```

図にすると、おおよそこうなります。

![Plugin Host：なぜ core は拡張されることを覚える必要があるのか？ Mermaid 1](assets/00-11-plugin-host-core-extension/mermaid-01.png)

この図で最も重要な境界は、`Core 污染` と `Plugin Host` の間にある境界です。

Plugin Host がないとき、core はあらゆる provider、あらゆる tool、あらゆる hook を直接知ることになります。

Plugin Host があると、core が知るのは少数の安定した contract だけです。

```text
PluginManifest
ProviderContribution
ToolContribution
HookContribution
LifecycleContribution
```

plugin は多くても構いません。

contract は少なくなければなりません。

plugin は異なる出所から来ても構いません。

しかし、システムに入った後の能力の形は統一されなければなりません。

これがこの記事の主線です。

## 一、M0 core が最初から能力を内蔵すべき理由

まず、「内蔵」を急いで批判しないでください。

M0 段階では、provider、tool、hook を core に直接書くのは合理的です。

その時点では、どの境界が安定しているかを証明するだけの事実がまだありません。

最初から完全な plugin system を設計すると、システムは簡単に空洞のアーキテクチャになります。

```text
plugin interface はあるが、実在する plugin がない。
lifecycle はあるが、実在する状態がない。
hook bus はあるが、実在する阻断点がない。
registry はあるが、登録すべき実在の能力がない。
```

この早すぎる抽象化の問題は、こうです。

見た目はエンジニアリングらしいのに、実際のタスクで押し潰された経験がありません。

だから M0 の戦略は、こうあるべきです。

```text
まず核心経路を通す。
次に、どこが膨らみ始めるかを観察する。
最後に、膨らんだ場所を拡張境界として抽出する。
```

たとえば「小さな CLI Agent が失敗したテストを修復する」例では、M0 には 3 つの tool しかないかもしれません。

```text
read_file
search_text
run_command
```

provider も 1 つだけです。

hook も、とても単純な権限関数かもしれません。

```text
run_command はユーザー確認を必要とするか？
edit_file は現在のワークスペースを変更してよいか？
```

この時点で無理に plugin system を作ると、むしろ認知負荷が増えます。

読者はまだ intent/execution の分離を理解していないのに、plugin load、依存順序、起動停止状態、hook 順序、命名衝突を理解させられます。

だから M0 の単純化は誤りではありません。

意図的に変数を狭めているのです。

ただし M0 は終点ではありません。

M0 の後、本当の問題は自然に現れます。

この記事の態度もそこにあります。

```text
拡張可能にするために拡張可能にするのではない。
具体的能力が core を汚染し始めたときに、膨らんだ場所を Plugin Host として抽出する。
```

## 二、能力が増えたあと、core はどのように汚染されるのか

もう一歩だけ先に進みましょう。

ユーザーはこう言います。

```text
このプロジェクトのテストがなぜ失敗するのか見て、直して。
```

Agent は今、少し賢くなる必要があります。

固定されたコマンドを 1 つ実行するだけでは足りません。

Node プロジェクトなのか Python プロジェクトなのかを判断できなければなりません。

package manager を読めなければなりません。

複数のモデルを切り替えられなければなりません。

プロジェクトに独自の安全ポリシーを提供させられなければなりません。

コマンド実行の前後に trace を記録できなければなりません。

plugin 境界がなければ、コードは少しずつこう育ちがちです。

```ts
async function runAgent(input: string, cwd: string) {
  const provider = config.provider === "anthropic"
    ? new AnthropicProvider(config.anthropic)
    : config.provider === "openai"
      ? new OpenAIProvider(config.openai)
      : new LocalProvider(config.local);

  const tools = [
    createReadTool(cwd),
    createSearchTool(cwd),
    createShellTool(cwd),
  ];

  if (isNodeProject(cwd)) {
    tools.push(createNpmTestTool(cwd));
  }

  if (isPythonProject(cwd)) {
    tools.push(createPytestTool(cwd));
  }

  if (config.enableGithub) {
    tools.push(createGithubTool(config.githubToken));
  }

  const preHooks = [];
  if (config.askBeforeShell) preHooks.push(confirmShellHook);
  if (config.projectPolicy) preHooks.push(projectPolicyHook);
  if (config.enterprisePolicy) preHooks.push(enterprisePolicyHook);

  // ...
}
```

このコードの問題は、動かないことではありません。

おそらく、とてもよく動きます。

問題は、4 種類の変化を混ぜてしまっていることです。

```text
モデル提供元の変化
tool 能力の変化
プロジェクト戦略の変化
runtime lifecycle の変化
```

4 種類の変化がすべて `runAgent()` に入ると、core は安定した制御システムではなくなります。

具体的能力を寄せ集める組み立てスクリプトになります。

そうなるとテストも苦しくなります。

core の loop をテストしたいのに、provider 設定を処理しなければならない。

tool intent をテストしたいのに、GitHub token に影響される。

権限 hook をテストしたいのに、関係ない tool を大量に初期化しなければならない。

test runner を差し替えたいだけなのに、core ファイルを変更しなければならない。

これが core 汚染です。

汚染とは、コードが長くなることではありません。

汚染とは、責務境界が濁ることです。

Plugin Host が解くべきものは、「コードをどうディレクトリ分割するか」ではありません。

解くべきなのは、こちらです。

```text
具体的能力をどのようにシステムへ入れるか。
ただし、その具体的能力の変化を core へ感染させない。
```

## 三、Plugin Host は plugin marketplace ではなく、制御された入口である

Plugin Host と聞くと、多くの人はまず「plugin marketplace」を思い浮かべます。

たとえばユーザーが多くの plugin をインストールでき、システム能力が無限に拡張される、というものです。

この考えは間違いではありませんが、Agent Harness にとって第一の重点ではありません。

Agent Harness における Plugin Host は、まず marketplace ではありません。

まず、制御された入口です。

それが答える問いは、こうです。

```text
外部能力が core に入りたいなら、どの手順を通らなければならないか？
```

最小の答えは、こうなります。

```text
plugin を発見する
宣言を読む
contract を検証する
instance を作る
能力を登録する
lifecycle を開始する
hook gate に接続する
エラーが起きたら隔離する
停止時にリソースを片付ける
```

ここに、次の一文がないことに注意してください。

```text
plugin に core オブジェクトを直接渡して好きに変更させる。
```

これは重要です。

本物の Plugin Host は、core を自由に操作できる大きなオブジェクトとして公開すべきではありません。

```ts
plugin.activate(core);
```

`core` の中のあらゆるものに触れるなら、plugin 境界は形だけになります。

plugin は状態を直接変えるかもしれません。

plugin は tool をこっそり差し替えるかもしれません。

plugin は権限を迂回するかもしれません。

plugin は secret をログへ書くかもしれません。

plugin は hook の中で外部アクションを実行し、それを event log に通さないかもしれません。

だから、より安定したやり方はこうです。

```text
plugin は contribution だけを提出する。
host が contribution をシステムへ登録する。
```

つまり、こうです。

```ts
type PluginContribution = {
  providers?: ProviderContribution[];
  tools?: ToolContribution[];
  hooks?: HookContribution[];
  commands?: CommandContribution[];
};

type Plugin = {
  manifest: PluginManifest;
  setup(ctx: PluginSetupContext): Promise<PluginContribution>;
};
```

ここでの `PluginSetupContext` も制限されていなければなりません。

logger を提供してもよい。

設定読み取りを提供してもよい。

ワークスペース情報を提供してもよい。

登録補助関数を提供してもよい。

しかし、「好きに tool を実行する」入口を提供すべきではありません。

まして、「session state を直接変更する」入口を提供すべきではありません。

Plugin Host の第一原則は、これです。

```text
plugin は能力を宣言できる。
しかし host を飛び越えて、能力を自分で引き受けることはできない。
```

言い換えると、plugin が貢献するのは候補能力であり、実行権ではありません。

ある tool が plugin から貢献されたとしても、それはシステムの能力カタログに入ったことを意味するだけです。

その後には、まだ次の過程があります。

```text
registry による正規化
visibility / context projection
permission / hook gate
tool runtime execution
observation / event log
```

だからここでは、3 つの文を覚えておきます。

```text
registered は visible と等しくない。
visible は executable と等しくない。
executable でも audit を迂回できるわけではない。
```

これが Plugin Host と Harness の主線をつなぐ最も重要な接続です。

## 四、Plugin Host の五つの核心部品

この仕組みを宙に浮かせないために、まず Plugin Host を五つの部品へ分けます。

```text
Manifest
Loader
Registry
Lifecycle
Hook Kernel
```

この五つの部品の関係は、階層図として描けます。

![Plugin Host：なぜ core は拡張されることを覚える必要があるのか？ Mermaid 2](assets/00-11-plugin-host-core-extension/mermaid-02.png)

この図では、`外部插件` は `Core Kernel` に直接つながっていません。

必ず先に `Plugin Host` を通ります。

これが責務境界です。

`Manifest` は plugin に先に自己説明させます。

`Loader` はその説明を読み、システムに入る資格があるかを判断します。

`Lifecycle` は plugin が「発見された」状態から「実行中」、さらに「停止」へ進む過程を扱います。

`Registry` は plugin が貢献した provider、tool、hook を core が理解できる統一オブジェクトへ変換します。

`Hook Kernel` は一部の拡張点を制御された阻断点にします。

この五つが合わさって、初めて Plugin Host になります。

manifest だけで lifecycle がなければ、plugin の状態は管理できません。

registry だけで hook kernel がなければ、plugin は能力を増やせても、安全にフローへ介入できません。

hook だけで registry がなければ、hook はあちこちに散らばった callback になります。

loader が plugin を直接 core へ突っ込むなら、host はただのディレクトリスキャナです。

だから Plugin Host の難しさは、「ファイルを 1 つ読み込む」ことではありません。

難しさは、こちらです。

```text
外部能力がシステムへ入った後も、
core の contract、event、permission、lifecycle に従わせること。
```

## 五、Manifest：plugin はまず自分が何者かを明らかにしなければならない

plugin がシステムへ入る前に、最初にすることはコード実行ではありません。

最初にすることは manifest を読むことです。

manifest は plugin から host への最低限の約束です。

少なくとも、次の問いに答えるべきです。

```text
plugin の名前は何か？
version はいくつか？
どの能力を貢献したいのか？
どの設定が必要か？
どの権限が必要か？
default で有効か？
どの host capability に依存しているか？
現在の workspace で使うことを許可しているか？
```

最小の manifest は、このような形になります。

```ts
type PluginManifest = {
  id: string;
  name: string;
  version: string;
  description?: string;
  contributes?: {
    providers?: string[];
    tools?: string[];
    hooks?: HookPoint[];
  };
  requires?: {
    hostVersion?: string;
    capabilities?: string[];
  };
  permissions?: PluginPermission[];
  defaultEnabled?: boolean;
};
```

`permissions` に注意してください。

多くの plugin system は、権限問題を tool 呼び出し時まで先送りします。

しかし Agent Harness は、最後の瞬間だけで権限を見ればよいわけではありません。

plugin は setup 段階ですでに設定を読み、接続を開き、tool を発見し、event を購読するかもしれないからです。

だから manifest には静的宣言の層が必要です。

```text
この plugin は、おおよそどの能力に触れるのか。
```

たとえば、こうです。

```text
local-tools plugin は filesystem と shell を必要とする。
github plugin は network と repo metadata を必要とする。
provider plugin は model api key を必要とする。
policy plugin はプロジェクトのポリシーファイルを読む必要がある。
```

manifest は最終承認ではありません。

入場申請に近いものです。

特定の tool intent を本当に実行するときは、第 10 篇の validate、approve、execute をなお通らなければなりません。

しかし manifest がなければ、host は「この plugin が何をシステムへ持ち込もうとしているのか」すら分かりません。

それでは plugin がブラックボックスになります。

Plugin Host の第二原則は、これです。

```text
plugin は先に宣言してから実行する。
能力は先に登録してから公開する。
```

ここには、もう一つエンジニアリング上の境界を加える必要があります。

```text
manifest は静的宣言である。
setup は制限された初期化である。
tool execution は依然として Tool Runtime に属する。
```

plugin が setup でコードを実行できるからといって、tool を実行したり session を変更したりする権力を持たせてはいけません。

## 六、Loader：plugin の読み込みは require するだけではない

内部 demo だけなら、loader はとても単純にできます。

```ts
const plugin = await import(pluginPath);
```

しかし、これは Plugin Host のすべてではありません。

本物の loader は、少なくともいくつかのことを処理します。

```text
plugin の出所を探す
manifest を読む
schema を検証する
version 互換性を確認する
有効化ポリシーを確認する
権限宣言を確認する
load error を隔離する
load event を記録する
```

ここでいう「出所」は、一つだけであるべきではありません。

将来は、次のようなものがあり得ます。

```text
builtin plugin
project plugin
user plugin
enterprise managed plugin
コマンドラインで一時有効化された plugin
テスト環境の fake plugin
```

出所が異なれば、信頼レベルも異なります。

builtin plugin は default で有効にできるかもしれません。

project plugin はユーザー確認を必要とするかもしれません。

user plugin はプロジェクトをまたいで有効かもしれません。

enterprise plugin はローカル設定を上書きするかもしれません。

test fake plugin はテスト runtime の中にだけ現れるべきです。

loader が出所を記録しなければ、後続の registry、permission、audit は文脈を失います。

たとえば同じ `run_tests` tool でも、次の出所があります。

```text
builtin local-tools bundle 由来
project plugin 由来
enterprise plugin 由来
third-party plugin 由来
```

UI 上ではすべて「テストを実行」に見えるかもしれません。

しかしシステム統制上は等価に扱えません。

loader は出所を plugin record に入れるべきです。

```ts
type LoadedPlugin = {
  id: string;
  source: "builtin" | "project" | "user" | "managed" | "test";
  manifest: PluginManifest;
  module: PluginModule;
  state: "loaded" | "disabled" | "failed";
};
```

こうすれば、後で各能力が registry に入るとき、それがどこから来たかを知ることができます。

これは余分な metadata ではありません。

audit と permission の基礎です。

ここには早めに決めるべき問題もあります。

```text
project plugin は default で信頼してよいのか？
```

project plugin が現在の workspace から来るなら、それはコードリポジトリと同じく完全には信頼できないかもしれません。

M1 では、まず builtin と test fake plugin だけをサポートしてもよいでしょう。

project / user plugin をサポートするなら、allowlist、署名、sandbox、あるいは明示的な確認戦略をさらに設計する必要があります。

この点は、作者が後続で確認するのがよいでしょう。

## 七、Registry：外部能力は内部オブジェクトにならなければならない

Plugin Host が拡張能力を本当に受け止める場所は、registry です。

plugin は tool 関数を直接モデルへ渡してはいけません。

plugin は provider SDK を直接 loop へ公開してはいけません。

plugin は hook 関数を任意の場所へ直接ぶら下げてはいけません。

能力は registry へ渡さなければなりません。

registry はそれらを core の contract へ正規化します。

たとえば provider contribution は、こうです。

```ts
type ProviderContribution = {
  id: string;
  displayName: string;
  createProvider(config: ProviderConfig): ProviderAdapter;
};
```

tool contribution は、こうです。

```ts
type ToolContribution = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  risk: "read" | "write" | "execute" | "network";
  createHandler(ctx: ToolRuntimeContext): ToolHandler;
};
```

hook contribution は、こうです。

```ts
type HookContribution = {
  point: HookPoint;
  id: string;
  order?: number;
  blocking: boolean;
  run(input: HookInput): Promise<HookDecision>;
};
```

この三つの contribution に共通しているのは、次の点です。

```text
それらは直接の実行結果ではない。
登録でき、検証でき、監査できる能力記述である。
```

registry がすべきことには、次が含まれます。

```text
名前衝突を検査する
plugin の出所を記録する
能力 schema を保存する
リスクレベルを標識する
有効化 / 無効化を処理する
query interface を公開する
runtime のために利用可能な能力ビューを生成する
```

これにより、core の他の部分は能力がどの plugin から来たかを知る必要がなくなります。

runtime はこう尋ねるだけです。

```text
現在の session で使える provider はどれか？
現在のモデルに見せられる tools はどれか？
現在の hook point にある hook はどれか？
```

こうは尋ねません。

```text
この tool はどのファイルから import されたのか？
この provider はどの npm package を使っているのか？
この hook はユーザーが書いたのか、プロジェクトが書いたのか？
```

もちろん audit は出所を知る必要があります。

permission も出所を知る必要があるかもしれません。

しかしそれらの情報は registry metadata を通じて渡されるべきで、core のあちこちに plugin 分岐を書かせるべきではありません。

これが registry の価値です。

```text
「外部能力が多い」を「内部能力の形が安定している」に変える。
```

もう一つ、混同しやすい点があります。

```text
Registry はシステムにどんな能力があるかを記録する。
Capability Discovery / Context Policy は、このターンでモデルにどの能力を見せるかを決める。
Tool Runtime は、ある intent が execution になれるかを決める。
```

この三層は合体させてはいけません。

registry に tool が登録された瞬間にモデルへ直接公開すると、システムはすぐに制御不能になります。

より安定した経路は、こうです。

```text
Plugin Contribution
-> Registry
-> Capability / Context Projection
-> Visible Tool Schema
-> Model Tool Intent
-> Tool Runtime
```

## 八、Lifecycle：plugin は静的設定ではなく、生きている

plugin を語る多くのチュートリアルは registry で止まります。

まるで plugin が能力宣言の集合にすぎないかのように。

しかし Agent Harness では、plugin はしばしば生きています。

provider plugin は SDK を初期化するかもしれません。

MCP 系 plugin は子プロセスを起動したり、remote server に接続したりするかもしれません。

test plugin はプロジェクト構造を scan するかもしれません。

policy plugin は設定を読み、変更を監視するかもしれません。

telemetry plugin は出力チャネルを開くかもしれません。

だから Plugin Host には lifecycle が必要です。

最小の状態機械は、こうなります。

```text
discovered
-> loaded
-> configured
-> started
-> ready
-> stopping
-> stopped
-> failed
```

図にすると、こうです。

![Plugin Host：なぜ core は拡張されることを覚える必要があるのか？ Mermaid 3](assets/00-11-plugin-host-core-extension/mermaid-03.png)

この図の重点は状態名ではありません。

重点は、plugin が「ある / ない」の二状態だけであってはならないことです。

ある plugin は発見されたが、ポリシーで無効化されているかもしれません。

ある plugin は load に成功したが、設定が不足しているかもしれません。

ある plugin は起動に失敗したが、core 全体を巻き込むべきではないかもしれません。

ある plugin は ready だが、特定の tool handler が実行に失敗するかもしれません。

これらの状態は見える必要があります。

そうでなければ、ユーザーが「なぜこの Agent には run_tests tool が見えないのか」と言ったとき、推測するしかありません。

lifecycle があれば、システムは明確に答えられます。

```text
test-runner plugin は発見された。
manifest は合法だった。
configure 段階で失敗した。
理由は package manager が見つからなかったこと。
だから run_tests tool は登録されていない。
```

これが Harness に lifecycle が必要な理由です。

複雑なアーキテクチャを書くためではありません。

失敗を説明可能にするためです。

ここには実装上の細部もあります。

```text
能力登録は rollback できるのが望ましい。
```

plugin の起動が途中で失敗したとき、host は半分だけ登録された provider、半分だけ登録された tool、半分だけ登録された hook を残すべきではありません。

そうでないと runtime が query する能力リストは汚れた状態になります。

だから lifecycle と registry は一緒に設計すべきです。

```text
起動失敗 -> 今回の contribution を取り消す
plugin 無効化 -> plugin 能力を隠す、または取り消す
plugin 停止 -> リソースを片付け、event を記録する
```

## 九、Hook Kernel：hook は普通の event listener ではない

Plugin Host で最も壊れやすい場所は hook です。

多くのシステムの hook は、ただの event listener です。

```text
beforeRun
afterRun
onError
```

listener は event を受け取ったあと、追加処理をします。

たとえばログを記録したり、telemetry を送ったり、ヒントを表示したりします。

この種の hook は便利ですが、Agent Harness で最も重要な hook ではありません。

Agent Harness がより必要とするのは hook gate です。

つまり、特定の動作を阻断し、書き換え、確認を要求し、拒否できる制御点です。

たとえば、こうです。

```text
モデルが run_command: npm test を提示する
-> preToolUse hook が、これは読み取り性のテストコマンドだと確認する
-> allow
-> tool runtime が実行する
```

別の例です。

```text
モデルが run_command: rm -rf node_modules を提示する
-> preToolUse hook が破壊的 shell と判断する
-> ask または deny
-> ユーザーが拒否すれば、execution は発生しない
```

これは普通の event listener とはまったく違います。

普通の listener は「起きた後に知らせる」ものです。

hook gate は「起きる前に必ずここを通る」ものです。

図で見ると、よりはっきりします。

![Plugin Host：なぜ core は拡張されることを覚える必要があるのか？ Mermaid 4](assets/00-11-plugin-host-core-extension/mermaid-04.png)

この図で最も重要な責務境界は、`Hook Kernel` が `Runtime` と `Tool Runtime` の間にいることです。

tool handler の内部 callback ではありません。

event log の後ろにいる観察者でもありません。

intent が execution になる前に立っています。

つまり hook の戻り値は、runtime が理解できる decision object でなければならず、適当にログを一行出すだけでは足りません。

たとえば、こうです。

```ts
type HookDecision =
  | { type: "allow"; reason?: string }
  | { type: "deny"; reason: string }
  | { type: "ask"; question: string; risk: RiskLevel }
  | { type: "amend"; intent: ToolIntent; reason: string };
```

`amend` は非常に慎重に扱う必要があります。

intent を書き換えることは、モデルが提示した動作を変えることだからです。

hook に自由な書き換えを許すなら、元の intent、書き換え後の intent、書き換え理由をすべて event log に書かなければなりません。

そうしないと、後続の replay と audit が歪みます。

M1 段階では、`amend` をまだ実装しない選択すらあり得ます。

まず次の三つを安定させる。

```text
allow
ask
deny
```

trace、replay、diff event、policy reason がより成熟してから、amend の開放を検討すればよいです。

だから Hook Kernel の原則は、こうです。

```text
阻断できる hook は構造化された値を返さなければならない。
書き換えできる hook は差分を残さなければならない。
観察だけの hook は gate のふりをしてはいけない。
```

さらに注意すべきなのは、Hook Kernel は Permission Runtime の代替ではないことです。

より正確な関係は、こうです。

```text
Hook Kernel は拡張点を提供する。
Policy / Permission は統制判断を提供する。
Runtime は HookDecision に基づいて実行を続けるか決める。
```

## 十、Plugin Host は「小さな CLI Agent がテストを修復する」場面をどう受け止めるか

ここで、これらの概念を通しの例に戻します。

ユーザー入力は、こうです。

```text
このプロジェクトのテストがなぜ失敗するのか見て、直して。
```

Plugin Host がなければ、core はすべての判断を自分で行うかもしれません。

```text
プロジェクトタイプを識別する
テストコマンドを決める
shell を実行してよいか決める
コマンドを実行する
ログを記録する
結果をモデルへ戻す
```

Plugin Host があると、この経路はこう変わります。

```text
core は loop と intent/execution の規律を担当する
provider plugin はモデル adapter を提供する
local-tools plugin は read/search/shell/edit を提供する
test-runner plugin は project-aware な run_tests tool を提供する
policy plugin は preToolUse hook を提供する
trace plugin は postToolUse observer hook を提供する
```

ただし、どの plugin も core を迂回できません。

モデルが見るのは、やはり registry から投影された tool です。

tool execution は、やはり intent、validate、approve、execute、observe を通ります。

hook の阻断は、やはり event log に書かれます。

provider は、やはり model event と tool intent だけを返します。

完全な経路は、このように描けます。

![Plugin Host：なぜ core は拡張されることを覚える必要があるのか？ Mermaid 5](assets/00-11-plugin-host-core-extension/mermaid-05.png)

この図では、plugin が能力を貢献しています。

しかし主線は、依然として Harness の主線です。

`Provider plugin` は tool を直接実行していません。

`test-runner plugin` は出力を直接 prompt に押し込んでいません。

`policy plugin` は session state を直接変更していません。

すべてが core の contract を通じて統一パイプラインへ戻ります。

これが「拡張が規律に入る」という意味です。

もう少し圧縮すると、一文でこう言えます。

```text
plugin が拡張するのはシステム能力であって、モデルの直接権力ではない。
```

## 十一、拡張点は少なく、しかし荷重に耐えるべきである

Plugin Host を書くとき、犯しやすい間違いがあります。

```text
誰かがロジックを差し込みたい場所には、どこにでも hook を追加する。
```

これはシステムをすぐ hook の密林に変えます。

あらゆる step に before/after がある。

あらゆる object に onChange がある。

あらゆる error に onError がある。

最後には、一つの動作がどの plugin を起動するのか誰にも分からなくなります。

Agent Harness の拡張点は少なめでよい。

ただし、それぞれが荷重に耐えなければなりません。

たとえば M1 段階では、先に次の種類だけを残せます。

```text
provider 登録点
tool 登録点
preToolUse gate
postToolUse observer
contextProject hook
sessionStart/sessionEnd lifecycle
```

この中で最も重要なのは `preToolUse` です。

intent と execution の間に立っているからです。

外部世界の変化を阻断できます。

`postToolUse` も重要ですが、それはすでに起きた事実を観察するだけです。

`contextProject` は強力ですが危険でもあります。モデルが何を見るかに影響するからです。

だから context hook は ordinary observer より厳格でなければなりません。

勝手に大量のテキストを prompt に詰め込んではいけません。

構造化された context contribution を返すべきです。

```ts
type ContextContribution = {
  id: string;
  sourcePluginId: string;
  priority: number;
  tokensEstimate: number;
  content: ContextBlock;
};
```

そうしないと、plugin は context policy を突き破ってしまいます。

すべての plugin が「この情報は重要だ」と考えれば、モデルコンテキストはすぐに膨張します。

だから Hook Kernel は Context Policy と距離を保たなければなりません。

```text
Hook は context contribution を提案できる。
Context Policy は、このターンで本当に入れるかを決める。
```

plugin は prompt への自由な供給者ではありません。

候補 context の提供者にすぎません。

だから拡張点の設計では、小さな原則を守ります。

```text
plugin は候補を提案できる。
Harness が採用するかを決める。
```

これは tool intent の規律と同型です。

モデルが intent を提示しても、実行と同義ではありません。

plugin が contribution を提示しても、それが context に入ることや世界を実行することと同義ではありません。

## 十二、名前空間：能力は人間の記憶だけに衝突回避を任せられない

Plugin Host には、非常に実務的で重要な問題もあります。

名前衝突です。

二つの plugin がどちらも `run_tests` を貢献するかもしれません。

二つの provider がどちらも `default` と呼ばれるかもしれません。

二つの hook がどちらも `policy` と呼ばれるかもしれません。

registry が裸の名前だけを使うと、混乱が起きます。

最も単純な規則は、これです。

```text
外部出所には plugin namespace を使う。
内部投影では短い alias を提供してよい。
```

たとえば、こうです。

```text
local-tools.read_file
local-tools.search_text
local-tools.run_command
test-runner.run_tests
github.open_issue
```

モデルが必ず完全名を見る必要はありません。

UI も友好的な名前を表示できます。

しかし registry、audit、permission は完全な identity を保存しなければなりません。

そうしないと event log にこう書かれるだけになります。

```text
tool: run_tests
```

後から、それがどの plugin 由来なのか分かりません。

よりよい event record は、こうです。

```json
{
  "tool": "test-runner.run_tests",
  "displayName": "Run Tests",
  "sourcePlugin": "test-runner",
  "sourceKind": "project",
  "intentId": "intent_123"
}
```

これは潔癖ではありません。

replay、audit、debug の基本条件です。

Agent が間違えたとき、あなたは次を追問できる必要があります。

```text
モデルが tool を選び間違えたのか？
registry が間違った tool を公開したのか？
plugin が実装した tool の振る舞いが schema と合っていないのか？
hook が危険な動作を誤って許可したのか？
```

名前空間がなければ、これらの問題はすべて混ざります。

だから registry は少なくとも次を保存するべきです。

```text
完全な capability id
人間向け表示名
出所 plugin
出所 type
plugin version
capability version
リスクレベル
lifecycle state
```

これらの情報をすべて prompt に入れる必要はありません。

しかし event log と audit には入るべきです。

## 十三、エラー隔離：plugin の失敗はシステムの失敗であってはならない

Plugin Host はシステムを拡張可能にしますが、新しいリスクも持ち込みます。

外部能力が増えれば、失敗の出所も増えます。

plugin の manifest が間違っているかもしれません。

plugin の起動に失敗するかもしれません。

plugin が不正な schema を登録するかもしれません。

plugin の tool handler が例外を投げるかもしれません。

plugin の hook が timeout するかもしれません。

plugin の provider adapter が不正な event を返すかもしれません。

これらの error が core へ直接伝播すると、Agent はとても脆くなります。

だから Plugin Host はエラー隔離をしなければなりません。

最小規則は、こうです。

```text
load 失敗：plugin は failed になり、能力は登録されない。
start 失敗：plugin は failed になり、登録済み能力は取り消される。
単一 tool の失敗：tool observation error を返し、loop は殺さない。
hook timeout：hook type に応じて fail closed または fail open を選ぶ。
provider error：runtime error に写像し、provider raw error を漏らさない。
```

この中で hook timeout は、別に説明する価値があります。

普通の observer hook、たとえば telemetry 書き込み失敗なら、通常はユーザータスクを阻断すべきではありません。

これは fail open でよい。

```text
hook error を記録し、主流程は続ける。
```

しかし preToolUse policy hook では事情が違います。

それは安全門です。

安全門の timeout を default で通過させてはいけません。

より合理的なのは fail closed です。

```text
実行を阻断し、observation を生成し、モデルとユーザーに「権限確認が完了しなかった」と伝える。
```

この規則は、Hook Kernel の重要な判断を反映しています。

```text
すべての hook が同じ失敗戦略を持つわけではない。
阻断型 hook の失敗は、それ自体が阻断事実である。
観察型 hook の失敗は、旁路事実であり得る。
```

エラー隔離の目的は「error を飲み込む」ことでもありません。

error を、システムが説明でき、記録でき、回復できる状態へ変えることです。

plugin が失敗した後、ユーザーは次を見られるべきです。

```text
どの plugin が失敗したのか？
失敗は load / configure / start / hook / tool handler のどの段階で起きたのか？
現在の visible tool set に影響するのか？
現在の tool intent を阻断するのか？
タスクを続けられるのか？
```

これこそ Harness における Plugin Host です。

plugin が絶対に壊れないことを保証するものではありません。

plugin が壊れたあとに core を盲目にしないためのものです。

## 十四、Plugin Host と MCP、Skill の関係

この記事は Plugin Host を扱っていますが、ここまで読むと近い概念を二つ思い浮かべるかもしれません。

```text
MCP
Skill
```

確かに、それらはどちらも拡張に関係しています。

しかし境界は異なります。

MCP が主に解くのは、こちらです。

```text
外部システムが tools、resources、prompts を protocol としてどう公開するか。
```

Skill が主に解くのは、こちらです。

```text
ある種のタスクの方法論、手順制約、script、背景資料を必要に応じてどう load するか。
```

Plugin Host が主に解くのは、こちらです。

```text
core が外部能力をどう受け取り、
それらを統一 contract、registry、lifecycle、hook gate にどう組み込むか。
```

だから三者は互いの代替ではありません。

むしろ三つの異なる入口です。

```text
Plugin Host は宿主機構である。
MCP は plugin として外部 tool や resource を貢献できる。
Skill は plugin または能力 package としてタスク方法論を貢献できる。
```

Claude Code の工程テンプレートから得られる示唆もここにあります。

能力拡張は一本の道ではありません。

ある拡張は tool protocol です。

ある拡張はタスク経験です。

ある拡張は provider adapter です。

ある拡張は hook と policy です。

しかし成熟した Harness は、それらを同じ実行規律へ収束させます。

```text
発見
宣言
検証
登録
投影
実行
観察
監査
```

MCP tool がシステムへ入った後に権限を迂回できるなら、それは拡張ではなく旁路です。

Skill がシステムへ入った後に無制限に context を汚染できるなら、それは能力 package ではなく prompt の放水口です。

plugin が core state を直接変更できるなら、それは plugin ではなく未制御のコード注入です。

これが境界です。

ここで第 17 篇に向けた判断も先に置けます。

```text
Plugin Host は能力がシステムへどう入るかを解く。
Capability Discovery はこのターンのモデルがどの能力を見るべきかを解く。
Tool Runtime は能力がどう制御されて実行されるかを解く。
```

三者はつながっていますが、互いに置き換えられません。

## 十五、最小実装はどのような形になるか

ここで M1 をコード層へ落とします。

最初から完全な plugin ecosystem を作る必要はありません。

M1 の目標は、かなり控えめでよいです。

```text
builtin plugin と test fake plugin をサポートする。
provider/tool/hook の三種類の contribution をサポートする。
manifest 検証をサポートする。
registry query をサポートする。
preToolUse hook gate をサポートする。
lifecycle state と event 記録をサポートする。
```

最小ディレクトリは、このように構成できます。

```text
src/
  core/
    contracts.ts
    runtime.ts
    events.ts
    registry.ts
  plugins/
    host.ts
    manifest.ts
    lifecycle.ts
    hook-kernel.ts
    builtin/
      provider-openai.ts
      local-tools.ts
      test-runner.ts
```

最小 host の擬似コードです。

```ts
export class PluginHost {
  constructor(
    private registry: CapabilityRegistry,
    private hooks: HookKernel,
    private events: EventSink,
  ) {}

  async load(pluginModule: PluginModule, source: PluginSource) {
    const manifest = parseAndValidateManifest(pluginModule.manifest);

    this.events.append({
      type: "plugin.loaded",
      pluginId: manifest.id,
      source,
    });

    const ctx = createSetupContext({ manifest, source });
    const contribution = await pluginModule.setup(ctx);

    for (const provider of contribution.providers ?? []) {
      this.registry.registerProvider(manifest.id, source, provider);
    }

    for (const tool of contribution.tools ?? []) {
      this.registry.registerTool(manifest.id, source, tool);
    }

    for (const hook of contribution.hooks ?? []) {
      this.hooks.register(manifest.id, source, hook);
    }

    this.events.append({
      type: "plugin.ready",
      pluginId: manifest.id,
    });
  }
}
```

このコードは意図的に plugin が `runtime` を受け取れないようにしています。

`state` を直接変更させてもいません。

plugin ができることは、contribution を host に渡すことです。

host が、それをどう登録するかを決めます。

実際の実装では、ここにエラー処理と rollback も必要です。

たとえば、こうです。

```text
setup 失敗 -> plugin.failed、contribution は登録しない
登録途中の失敗 -> 登録済み contribution を取り消す
plugin 無効化 -> visible/query 結果から取り除く
```

次に、hook kernel の最小形を見ます。

```ts
export class HookKernel {
  private hooks = new Map<HookPoint, RegisteredHook[]>();

  async runPreToolUse(intent: ToolIntent): Promise<HookDecision> {
    const hooks = this.hooks.get("preToolUse") ?? [];

    for (const hook of sortByOrder(hooks)) {
      const decision = await withTimeout(
        hook.run({ intent }),
        hook.timeoutMs ?? 1000,
      );

      if (decision.type === "deny" || decision.type === "ask") {
        return decision;
      }

      if (decision.type === "amend") {
        return decision;
      }
    }

    return { type: "allow" };
  }
}
```

実際のシステムはさらに複雑になります。

しかし最小版でも、重要な境界はすでに表れています。

```text
hook は勝手に発火するものではない。
hook には point がある。
hook には順序がある。
hook には timeout がある。
hook は構造化 decision を返す。
runtime は decision に基づいて続行または停止する。
```

これで M1 の骨格を立てるには十分です。

## 十六、M1 では何をテストすべきか

Plugin Host で最もテストすべきなのは、「plugin を load できるか」ではありません。

それは入口にすぎません。

本当にテストすべきなのは境界です。

第一種のテスト：manifest 検証。

```text
id が欠けていれば失敗すべき。
不正な version は失敗すべき。
未知の hook point 宣言は失敗すべき。
危険な権限を宣言し、ポリシーが許さない場合は disabled になるべき。
```

第二種のテスト：registry 隔離。

```text
二つの plugin が同名 tool を登録しても、完全 id は衝突しない。
plugin を無効化した後、その plugin が貢献した tool は不可視になる。
plugin の起動に失敗しても、半登録能力を残さない。
runtime が query するのは統一された ToolDescriptor である。
```

第三種のテスト：hook gate。

```text
preToolUse が allow なら、Tool Runtime は実行を続ける。
preToolUse が deny なら、execution は発生しない。
preToolUse が ask なら、session は確認待ちで一時停止する。
preToolUse が timeout したら、policy hook は fail closed する。
postToolUse が timeout したら、observer hook は fail open する。
```

第四種のテスト：イベントログ。

```text
plugin.loaded が記録される。
plugin.ready が記録される。
plugin.failed が記録される。
hook decision が記録される。
blocked execution が記録される。
tool observation が sourcePlugin を保持する。
```

第五種のテスト：通し経路。

```text
fake provider が run_tests intent を提示する。
fake test-runner plugin が run_tests を提供する。
fake policy hook が npm test を allow する。
tool runtime が fake command を実行する。
observation が次のモデル入力へ戻る。
```

この種のテストは、次を証明します。

```text
plugin はシステムへ入った後も、同じ Harness pipeline を通る。
```

テストが「plugin 関数が呼ばれた」ことだけを証明しても不十分です。

証明したいのは、こちらです。

```text
plugin は core を迂回していない。
```

## 十七、よくある悪い匂い

ここまで書けば、Plugin Host の悪い匂いをいくつかまとめられます。

一つ目の悪い匂い：

```text
plugin.activate(core)
```

plugin が完全な core を受け取ると、ほぼ確実に境界を越えます。

より安定しているのは、plugin に contribution を返させることです。

二つ目の悪い匂い：

```text
hook がただの EventEmitter
```

event listening は便利ですが、gate の代わりにはなりません。

第 10 篇で述べたように、execution の前には approve が必要です。

Hook Kernel は、approve 前後の拡張点を支える層です。

三つ目の悪い匂い：

```text
tool を登録したら、そのままモデルに見せる
```

tool はまず registry、policy、context projection、または capability discovery を通るべきです。

登録済みのすべての tool が、毎ターンモデルへ公開されるべきではありません。

四つ目の悪い匂い：

```text
plugin 失敗を main loop へ直接 throw する
```

plugin 失敗は説明可能な状態と observation に変わるべきです。

core invariants を壊していない限り、session 全体を崩すべきではありません。

五つ目の悪い匂い：

```text
hook がこっそり prompt を書き換えられる
```

context contribution は Context Policy に管理されるべきです。

plugin は自分が言いたいことをモデルコンテキストへ直接差し込めません。

六つ目の悪い匂い：

```text
event log が tool 名だけを記録し、plugin の出所を記録しない
```

これは debug と replay の事実基盤を失わせます。

tool 名、人間向け表示名、完全 capability id、plugin の出所は、すべて event に入るべきです。

七つ目の悪い匂い：

```text
plugin が能力を貢献するついでに初期化動作を実行する。
```

たとえば setup 段階で shell を走らせ、機密ファイルを読み、session state を書くようなものです。

これは plugin load を隠れた execution に変えてしまいます。

M1 段階では setup をできるだけ制限し、本当に副作用のある動作は Tool Runtime または Lifecycle event へ入れるべきです。

八つ目の悪い匂い：

```text
Plugin Host を MCP / Skill の代替品として扱う。
```

Plugin Host は宿主機構です。

MCP は外部能力 protocol です。

Skill はタスク経験 package です。

それらは接続できますが、互いに飲み込むべきではありません。

## 十八、この記事は何を届けたのか

ここまでで、第 11 篇は M1 の前半を完了しました。

```text
core はすべての能力を直接内蔵しなくなる。
core は Plugin Host を通じて外部能力を受け取ることを覚える。
```

ただし、これは core を弱くすることではありません。

むしろ逆です。

Plugin Host は core を強くします。

core が具体的な provider、具体的な tool、具体的な hook の詳細に引きずられなくなるからです。

制御権を、いくつかの安定した規律へ収束させます。

```text
plugin は宣言しなければならない。
宣言は検証されなければならない。
能力は登録されなければならない。
登録には出所が付かなければならない。
hook は構造化 decision を返さなければならない。
execution は runtime を通らなければならない。
事実は event log に入らなければならない。
context は policy によって投影されなければならない。
```

これが「core が拡張されることを覚える」の本当の意味です。

core が手放すのではありません。

core が、より小さく、より安定した contract で、より多くの外部能力を管理できるようになるのです。

この篇を一文で覚えるなら、こうです。

> Plugin Host は境界を開くものではなく、外部能力を同じ Harness の規律へ並ばせて入れるものである。

次篇では、provider に沿ってさらに進みます。

provider も plugin contribution の一種になったとき、新しい問題が現れます。

```text
provider はなぜ tool intent だけを返すべきで、自分で tool を実行してはいけないのか？
```

これは私たちを Provider Runtime へ連れていきます。

つまり、モデル提供元、streaming event、tool call、error mapping、system runtime の間にある、より細かな境界です。

## 教学 Harness への落とし込み

最小 Plugin Host に marketplace は不要です。必要なのは差し替え点です。provider は `TeachingModel` を実装し、tool は `registry.register()` で入れ、permission policy は `beforeToolCall` hook で接続し、UI は tool definitions だけを読みます。core は安定し、拡張は境界で起きます。コード全体に `if/else` を散らしません。

---

GitHub ソース: [00-11-plugin-host-core-extension.md](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-11-plugin-host-core-extension.md)
