---
title: "Capability Discovery：Skills、MCP、動的 Tool 公開"
description: "第 17 篇まで来ると、小さな CLI Agent は最初の「会話しかできないプログラム」ではなくなっている。"
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.jpg'
locale: "ja"
tags:
  - Agent
  - Harness
  - Capability Discovery
  - Skills
  - MCP
  - Tool Runtime
qiita_tags:
  - Agent
  - Harness
  - CapabilityDiscovery
  - Skills
  - MCP
aliases:
  - 能力発見
  - 動的 Tool 公開
  - Skills と MCP
  - Capability Discovery
---

# Capability Discovery：Skills、MCP、動的 Tool 公開

第 17 篇まで来ると、小さな CLI Agent は最初の「会話しかできないプログラム」ではなくなっている。

provider runtime がある。

tool runtime がある。

ローカル Tool bundle がある。

context policy がある。

session replay もある。

ここまでの実装に沿って機能を足していくと、自然な衝動が出てくる。

```text
Tool システムができたなら、全部の Tool を登録してしまおう。
```

ファイルを読む。

ファイルを変更する。

コードを検索する。

コマンドを実行する。

GitHub を見る。

Slack を見る。

database を見る。

design file を読む。

browser を呼び出す。

チーム規約を読み込む。

review skill を実行する。

writing skill を実行する。

deployment skill を実行する。

それぞれの能力は単体では合理的だ。

だが全部をモデルの視界に入れると、システムはすぐ不合理になる。

このターンのモデルは、すべての Tool を知る必要はない。

必要なのは、現在タスクに関係し、現在権限で許可され、現在 Context 予算に収まり、現在 Runtime 状態で実行できる小さな能力集合だ。

ここで Capability Discovery が出てくる。

解く問題は「Agent にもっと多くの能力を持たせる方法」ではない。

むしろこうだ。

> Agent の候補能力が増えていくとき、システムはどのように能力を発見し、タスクに応じて最小の可用集合だけを動的に公開し、外部能力を最終的に統一 tool pipeline に戻すのか？

シリーズ全体の例を続ける。

```text
ユーザーがプロジェクトルートで入力する：
このプロジェクトのテストがなぜ失敗しているか見て、直して。
```

初期の章なら、このタスクにはローカル Tool だけで足りるかもしれない。

```text
Read
Grep
Bash
Edit
```

しかし実プロジェクトでは、もっと多くの能力が必要になる可能性が高い。

```text
GitHub MCP：最近の PR 議論を読む。
Issue MCP：テスト失敗が既知か見る。
CI MCP：remote build log を取る。
code-review skill：チームスタイルに沿って最終 diff をレビューする。
frontend skill：frontend component 変更時に component 規約を読み込む。
test-runner skill：プロジェクト種別に応じてテストコマンドを選ぶ。
```

これらの能力は存在すべきだ。

しかし最初から全部モデルに公開すべきではない。

能力が増えるほど、制御不能点も増えるからだ。

この記事ではこの境界を明確にする。

## 問題の連鎖

本篇の問題の連鎖を固定する。

```text
Tool Runtime によりモデルは構造化 Tool call を出せる
-> Plugin Host により外部能力がシステムへ入れる
-> 能力源が増える：ローカル Tool、Skills、MCP、plugin、channel capability
-> 全部をモデルへ公開すると、Context、選択、安全性が同時に制御不能になる
-> まず Capability Catalog を作り、候補能力を記録する
-> Discovery がタスク、path、権限、予算、Runtime 状態に応じて絞り込む
-> ToolSearch / Deferred Loading により、モデルは軽量 index を見て、命中後に詳細を読み込む
-> Skills は経験パックとして必要時に読み込み、全文を常駐 Context にしない
-> MCP は外部能力 bridge として resources/prompts/tools を発見し、内部能力に map する
-> 最終的な実行 action はすべて統一 tool pipeline に入る
```

この連鎖で最も重要な語は `Skill` ではない。

`MCP` でもない。

`Visibility` だ。

可視性。

能力はシステム内に存在できる。

だが存在は可視を意味しない。

可視は実行可能を意味しない。

実行可能でも監査を迂回できるわけではない。

全体像はこうなる。

![Capability Discovery：Skills、MCP、動的 Tool 公開 Mermaid 1](assets/00-17-capability-discovery-skills-mcp/mermaid-01.png)

この図で重要なのはノード数ではない。

二つの境界だ。

第一の境界は `Capability Catalog` と `Visible Set` の間にある。

システムには多くの候補能力があってよい。

このターンでモデルが見られるのは、絞り込まれた可視集合だけだ。

ここで第 11 篇の Plugin Host と本篇の Catalog をつなぐとこうなる。

```text
Plugin Host は外部能力がシステムへ入る入口を担当する。
Registry は登録済み内部能力の事実を記録する。
Capability Catalog は Registry の拡張 view であり、tool / skill / resource / prompt / channel を統一して記録する。
Discovery Policy は Catalog からこのターンの Visible Set を選ぶ。
Context Policy は Visible Set と他の Context 材料を組み立てて Model Input にする。
Tool Runtime は具体的な ToolIntent が実行可能かだけを扱う。
```

第二の境界は `Model` と `Tool Pipeline` の間にある。

モデルがある能力を見ても、依然として intent を出せるだけだ。

実際の実行は tool pipeline が引き受ける。

この二つの境界を壊すと、危険なシステムになる。

```text
外部 MCP server が接続された瞬間、すべての Tool が prompt に入る。
プロジェクト Skill を scan した瞬間、全文が system prompt に入る。
モデルが百個の Tool を見て、名前が一番それらしいものを推測する。
実行時になって権限が許可していないと分かる。
エラー結果がまた Context に戻り、次ターンでさらに混乱する。
```

これは Agent が強くなったのではない。

Harness が盲目になったのだ。

Capability Discovery の目的は、能力が多いときでも Harness が冷静さを保つことだ。

## 一、Tool が増えるほどなぜ賢くならないのか

Tool 型 Agent を初めて作ると、多くの人は錯覚する。

```text
モデルに Tool を多く与えるほど、万能助手に近づく。
```

この錯覚は自然だ。

人間がソフトウェアを使うとき、メニューが豊富なほど能力が高そうに見えるからだ。

しかしモデルは人間ユーザーではない。

モデルは可視 UI でメニューをゆっくり眺めているのではない。

限られた Context の中で Tool 説明を読み、現在タスクに基づいて次の構造化呼び出しを生成している。

Tool が増えると、三種類の圧力が同時に生まれる。

第一は Context 圧力だ。

各 Tool には名前、説明、引数 schema、使用制限、権限ヒントが必要だ。

Tool が数十個あれば、それだけで大量の token を消費する。

さらに厄介なのは、それらの token がタスク本体の情報ではないことが多い点だ。

「使うかもしれない」メニューにすぎない。

第二は選択圧力だ。

モデルが見る Tool が多いほど、似た説明に干渉されやすい。

たとえば同時に次を見るかもしれない。

```text
grep_code
search_files
github_search
mcp__repo__search
mcp__docs__search
skill__code_review
```

どれも `search` を含む。

しかし意味は完全に違う。

あるものはローカルファイル検索。

あるものは remote repo 検索。

あるものは docs 検索。

あるものはレビュー方法を読み込むだけ。

モデルが選び間違えると、後続の推論が逸れていく。

第三は安全圧力だ。

モデルが高リスク能力を見られると、それを前提に plan を立てる可能性がある。

実行時に拒否されたとしても、システムはすでにモデルに実行不能な前提で計画させている。

これは隠れた失敗を生む。

```text
モデルは何をすべきか分からなかったのではない。
間違った可用能力集合に基づいて計画した。
```

だから Tool 可視性そのものが制御システムの一部だ。

UI 最適化ではない。

prompt 圧縮の小技でもない。

権限、Context、計画品質の共通入口だ。

CLI Agent でユーザーが「ローカルテスト失敗を修正して」と言っただけなら、第一ターンで Slack、Figma、database write、deployment Tool を見せるべきではない。

より妥当なのはまず次を公開することだ。

```text
Read
Grep
Glob
Bash(test-only)
Maybe SkillIndex
Maybe ToolSearch
```

モデルが失敗が GitHub issue や CI log に関係すると見つけてから、対応 MCP 能力を discovery で追加する。

能力は一度にモデルへ注ぎ込むものではない。

タスク証拠に応じて少しずつ現れるべきだ。

## 二、Capability は Tool ではない。まず概念を分ける

動的公開を実装する最初の一歩は、すべてを tool と呼ばないことだ。

`Tool` は実行可能な action。

`Capability` はシステムが「持っているかもしれない」と知っている能力。

両者は違う。

たとえば Skill。

```text
code-review skill
```

それ自体は必ずしも外部 action ではない。

むしろタスク経験パックだ。

```text
diff をどうレビューするか
何を先に見るか
出力フォーマットは何か
どのリスクを優先するか
どの Tool を事前承認できるか
```

MCP resource も同じだ。

```text
mcp://github/pull/123
```

これも action ではない。

外部 Context object に近い。

ただし List / Read resource Tool を通じて Context に入ることができる。

MCP prompt もある。

```text
triage_failed_ci
```

これは普通の関数ではない。

slash command や workflow template になるかもしれない。

だから Capability Catalog は「Tool 関数リスト」だけを記録してはいけない。

少なくとも次を表現できる必要がある。

```text
Tool Capability：実行できる action。
Skill Capability：読み込める方法論。
Resource Capability：参照できる外部 Context。
Prompt Capability：起動できる workflow template。
Channel Capability：現在入口が支える入出力能力。
```

すべてを無理に tool にすると、システムはぎこちなくなる。

モデルが「Tool intent を出す」ことで全てを表現しなければならなくなるからだ。

しかし Skill の読み込み、resource の読み取り、能力カタログの検索、MCP server の refresh は同じ意味ではない。

より安定した設計はこうだ。

```text
まず全候補能力を Capability Catalog に入れる。
そのうえで能力タイプに応じて、モデル視界への投影方法を決める。
```

階層図にするとこうなる。

![Capability Discovery：Skills、MCP、動的 Tool 公開 Mermaid 2](assets/00-17-capability-discovery-skills-mcp/mermaid-02.png)

図の要点は `Catalog` と `Projection` の分離だ。

Catalog はシステム事実を記録する。

Projection はこのターンでモデルに見えるものを決める。

これは前の Context Policy と同じ発想だ。

```text
すべての事実が prompt に入るべきではない。
すべての能力が tool list に入るべきではない。
```

Capability Discovery は能力側の context engineering でもある。

## 三、Skills：経験パックは常駐 prompt ではない

まず Skills を見る。

CLI Agent では、Skill は次のように置ける。

```text
.agent/skills/test-fix/SKILL.md
.agent/skills/code-review/SKILL.md
.agent/skills/frontend-component/SKILL.md
.agent/skills/release-note/SKILL.md
```

各 Skill は `SKILL.md` を含む。

frontmatter がある。

description がある。

allowed tools がある。

script があるかもしれない。

template があるかもしれない。

reference material があるかもしれない。

解く問題は「システムに関数が一つ足りない」ではない。

こうだ。

```text
タスクがある種類に属するとき、モデルはどんな経験的手順で既存 Tool を組み合わせるべきか。
```

「テスト失敗を修正する」例なら、Tool 層はモデルにこう教えるだけだ。

```text
ファイルを読める。
検索できる。
テストを実行できる。
編集できる。
```

しかし test-fix skill はこう教える。

```text
まず失敗を再現する。
いきなり広範囲にコードを変えない。
失敗テストと被テスト module を優先して読む。
各変更後は最小関連テストだけを実行する。
最後にフルテストを実行する。
失敗出力が長すぎる場合、エラー種別、ファイル、行番号、assertion 差分を残す。
```

これは Tool ではない。

経験だ。

経験を global system prompt に書くと膨らむ。

毎回ユーザーに言わせると再利用できない。

core に hardcode するとプロジェクトごとの進化に追従できない。

だから Skill の核心機構は段階的 loading だ。

```text
まず軽量 index を公開する。
命中したら本文を読み込む。
必要なら script や reference material を読む。
```

これは能力発見とよく合う。

第一ターンのモデルはすべての Skill 全文を見る必要はない。

軽量カタログだけでよい。

```text
test-fix：ローカルテスト失敗を修正する。まず再現、原因特定、最小変更、回帰検証。
code-review：diff の correctness、安全性、テスト欠落をレビューし、findings first で出力。
frontend-component：frontend component 変更時、design system、state、accessibility 制約を守る。
```

モデルが現在タスクに `test-fix` が必要だと判断する。

すると Harness が Skill loading により全文を現在タスクへ注入する。

この流れはこう描ける。

![Capability Discovery：Skills、MCP、動的 Tool 公開 Mermaid 3](assets/00-17-capability-discovery-skills-mcp/mermaid-03.png)

この図には見落としやすい点がある。

Skill の loading 自体も制御された action であるべきだ。

「ただのドキュメント」だからといって権限を迂回してはいけない。

理由は単純だ。

Skill は allowed tools を宣言するかもしれない。

Skill は動的 command を含むかもしれない。

Skill はプロジェクト内の規約、template、script を Context に読み込むかもしれない。

Skill は project repo 由来かもしれず、その repo は完全には信頼できない。

したがって Skill Runtime は少なくとも四つを行う。

```text
frontmatter を parse する。
source と policy を検証する。
軽量 index だけを discovery に使う。
命中後に本文を render し、event を記録する。
```

最小 Skill capability はこう表せる。

```ts
type SkillCapability = {
  kind: "skill";
  name: string;
  description: string;
  source: "managed" | "user" | "project" | "plugin" | "mcp";
  path?: string;
  match?: {
    paths?: string[];
    taskKeywords?: string[];
  };
  execution?: {
    mode: "inline" | "fork";
    allowedTools?: string[];
  };
  risk: "low" | "medium" | "high";
};
```

この interface で重要なのは `description`、`source`、`match`、`execution` だ。

`description` は軽量 index 内でモデルが必要性を判断するために使う。

`source` は信頼境界を決める。

`match` は path 関連またはタスク関連の動的可視性を実装する。

`execution` は現在 session に inline 注入するのか、子 Agent に fork するのかを決める。

Capability Discovery における Skills の役割はこうだ。

```text
Skill は「もっと多くの Tool」ではない。
Skill は発見可能、読み込み可能、ガバナンス可能なタスク経験パックである。
```

## 四、MCP：外部能力 bridge であって、Tool の旁路ではない

次に MCP を見る。

Skills が「経験をどう必要時に読み込むか」を解くなら、MCP はこう解く。

```text
外部システムを統一 protocol で Agent Harness に接続するにはどうするか。
```

実際の開発タスクはローカル repo だけでは完結しない。

テスト失敗は remote CI に関係するかもしれない。

失敗原因は GitHub PR 議論にあるかもしれない。

要求背景は docs system にあるかもしれない。

design change は Figma にあるかもしれない。

production error は monitoring system にあるかもしれない。

各システムごとに内蔵 Tool を書くと、core はまた汚染される。

MCP の価値は、外部システムが統一 protocol で能力を公開できることだ。

しかし、MCP server が接続されたからといって、モデルが直接 RPC を投げてよいわけではない。

これは非常に重要だ。

成熟した Harness では、MCP は六つの段階を通るべきだ。

```text
設定 merge
-> 接続と認証
-> 能力発見
-> 内部 mapping
-> 状態同期
-> 統一実行
```

MCP server が公開するのは tools だけではない。

次を公開することがある。

```text
tools：実行可能 action。
resources：読み取り可能 Context。
prompts：再利用可能 workflow template。
```

CLI Agent にとって、GitHub MCP は次を提供するかもしれない。

```text
tool: search_issues
tool: get_pull_request
resource: repo://build-harness/pr/42
prompt: summarize_failed_ci
```

これら四つがシステムに入った後、同じ裸関数にするべきではない。

より自然な mapping はこうだ。

```text
MCP tool -> Internal Tool Capability -> Visible Tool -> Tool Pipeline
MCP resource -> Resource Handle -> Context read tool または Context source
MCP prompt -> Command / Skill-like workflow template
```

図にするとこうなる。

![Capability Discovery：Skills、MCP、動的 Tool 公開 Mermaid 4](assets/00-17-capability-discovery-skills-mcp/mermaid-04.png)

この図で最も重要なのは `Map` だ。

外部 MCP tool は Harness が理解する内部 Tool に wrap しなければならない。

内部 Tool 名が必要だ。

schema が必要だ。

read-only か write かの意味が必要だ。

権限 namespace が必要だ。

error mapping が必要だ。

observation format が必要だ。

こうして初めて、MCP は旁路 RPC ではなくなる。

モデルが `mcp__github__get_pull_request` の Tool intent を出しても、Harness から見れば普通の Tool call だ。

```text
validate input
-> check visibility
-> check permission
-> run hooks
-> execute
-> truncate result
-> write observation
-> append audit event
```

実際に MCP RPC を送るのは、execution pipeline のかなり後段だ。

これは Intent / Execution 分離と一致する。

モデルが出すのはこれだ。

```json
{
  "tool": "mcp__github__get_pull_request",
  "input": {
    "number": 42
  }
}
```

システムが実行するのはこれだ。

```text
内部 tool call -> MCP adapter -> server.callTool("get_pull_request")
```

その間には完全な Harness 規律がある。

この章の MCP に対する判断は一文に圧縮できる。

```text
MCP は外部世界を接続するが、外部世界に Harness を迂回させてはいけない。
```

## 五、ToolSearch：モデルにすべての能力を暗記させず、まず検索させる

能力が増えると、「事前に visible set を選ぶ」だけでは足りない。

めったに使わない能力がある。

特定タスクでだけ必要な能力がある。

説明が長く、直接 prompt に置くには割に合わない能力がある。

そこで ToolSearch を導入できる。

ToolSearch の考え方は素朴だ。

```text
モデルは最初からすべての Tool 詳細を見る必要はない。
追加能力が必要だと気づいたとき、能力 catalog を検索できればよい。
```

人間の開発者も全コマンドマニュアルを暗記しない。

まずこう知っていればよい。

```text
GitHub 能力が必要なら Tool catalog を検索する。
プロジェクト規約が必要なら Skill catalog を検索する。
外部 resource が必要なら MCP resource を検索する。
```

ToolSearch はモデルに「勝手に Tool を探させる」ものではない。

依然として Harness が制御する。

検索結果は権限 filter を通る。

返す結果は予算制限を受ける。

高リスク能力は検索命中だけで実行可能にならない。

命中結果は全文読み込みでもない。

候補能力を次の可視性判断へ進めるだけだ。

だから ToolSearch は低リスク discovery tool になれる。

ただし返すのは候補能力であり、visible set への直接追加でも実行権限でもない。

CLI Agent では第一ターンにこれだけを公開できる。

```text
Read
Grep
Bash(test commands)
SkillSearch
ToolSearch
```

モデルがまずテストを実行する。

失敗にこう出る。

```text
CI-only snapshot mismatch, see PR #42
```

次ターンでモデルはこう提案できる。

```text
GitHub PR または CI log 関連能力を調べる必要があります。
```

そこで ToolSearch を呼ぶ。

```json
{
  "query": "GitHub PR CI logs failed checks"
}
```

Harness は小さな候補集合を返す。

```text
mcp__github__get_pull_request
mcp__github__list_check_runs
mcp__ci__get_job_log
skill__ci-failure-triage
```

そこから Discovery Policy が、現在 visible set に入れられるものを判断する。

この流れは判断経路として描ける。

![Capability Discovery：Skills、MCP、動的 Tool 公開 Mermaid 5](assets/00-17-capability-discovery-skills-mcp/mermaid-05.png)

この図で重要なのは、`ToolSearch` の後ろにも `権限と予算` があることだ。

能力を検索することは授权ではない。

能力が見つかることは、能力を実行することではない。

これが ToolSearch と普通の検索ボックスの違いだ。

普通の検索ボックスは recall だけを気にする。

Agent Harness の ToolSearch はガバナンスも気にする。

返すべきものは「候補能力 view」であり、「システムを迂回する入口」ではない。

## 六、Deferred Loading：能力説明も遅延読み込みする

ToolSearch が「能力をどう見つけるか」を解くなら、Deferred Loading は「能力詳細をいつ Context に入れるか」を解く。

これは Skills で最も分かりやすい。

`code-review` Skill の本文は数百行あるかもしれない。

checklist がある。

出力形式がある。

例がある。

script 説明がある。

毎ターン全文を入れると、prompt はすぐ物置になる。

しかし名前だけだと、モデルは正確に判断できない。

だから最も自然な構造は三層だ。

```text
directory layer：name + one-line description。
summary layer：タスクに合わせた short card。
full layer：実行時に render する完全 Skill。
```

MCP でも同じ問題がある。

一つの MCP server が数十個の tool を公開するかもしれない。

各 tool には schema がある。

各 schema は長いかもしれない。

最初から全部モデルへ送ると、Context は Tool メニューに食われる。

だから MCP tool も階層投影できる。

```text
server summary：GitHub MCP は PR、issue、check runs を問い合わせられる。
tool index：get_pull_request / list_check_runs などの短い説明。
full schema：visible set に入った Tool だけ完全 schema を注入。
```

これが Deferred Loading だ。

手抜きではない。

認めているのは次の事実だ。

```text
能力説明そのものも Context 予算の一部である。
```

最小実装はこう設計できる。

```ts
type CapabilityDescriptor = {
  id: string;
  kind: "tool" | "skill" | "resource" | "prompt";
  title: string;
  summary: string;
  source: string;
  risk: "low" | "medium" | "high";
  tokens: {
    index: number;
    full: number;
  };
  load: () => Promise<LoadedCapability>;
};

type LoadedCapability = {
  descriptor: CapabilityDescriptor;
  modelProjection: string;
  toolSchema?: unknown;
  runtimeBinding?: unknown;
};
```

ここで注目すべきは `load()` だ。

Capability Catalog は最初から全詳細を読み込む必要はない。

descriptor だけを保存できる。

Discovery Policy がある能力を関連しそうだと判断してから、より完全な projection を読み込む。

これにより、起動速度、Context 予算、能力規模を分けて管理できる。

Deferred Loading がないと悪い匂いが出る。

第一の悪い匂いは prompt の膨張だ。

毎ターン、現在タスクで使わない Tool 説明を背負っている。

第二は Tool 説明の相互汚染だ。

モデルは一つのテストを直すだけなのに、deployment、database、Slack、Figma の能力を prompt で見て、無関係な経路を計画し始める。

第三は権限意味の曖昧化だ。

モデルはある Tool 詳細を見るが、実行時には拒否される。

それを「実行失敗」と理解してしまい、「この能力は現在計画に入るべきではなかった」と理解しない。

Deferred Loading が避けたいのは、このミスマッチだ。

## 七、Discovery Policy：タスクに応じて最小可用集合を公開する

Catalog、Skill index、MCP mapping、ToolSearch、Deferred Loading があっても、核心がまだ足りない。

```text
Discovery Policy
```

これは答える。

```text
現在このターンで、どの能力がモデル視界に入るべきか？
```

この問いはモデルだけに任せられない。

モデルが判断する前に、まず何らかの能力を見る必要がある。

「最初にどの能力を見せるか」は Harness の責任だ。

Discovery Policy は少なくとも七種類の signal を見るべきだ。

第一に、タスク意図。

ユーザーの「テスト失敗を修正して」と「週報を書いて」は、必要能力がまったく違う。

第二に、現在作業ディレクトリとプロジェクト種別。

Node プロジェクトなら `npm test` が必要かもしれない。

Python プロジェクトなら `pytest` が必要かもしれない。

`.github/workflows` があれば CI 関連能力がより関係しやすい。

第三に、到達済み path。

モデルが `packages/frontend` を変更中なら、frontend Skill がより関連する。

database migration ファイルを読んだなら、database review Skill が必要かもしれない。

第四に、権限 mode。

read-only mode では file write Tool を公開すべきではない。

auto mode でも、高リスクの外部書き込み Tool を公開すべきではない。

第五に、Context 予算。

Context が上限に近いなら、Tool 詳細の公開はより保守的にすべきだ。

第六に、session 状態。

MCP server が切断されているなら、その Tool を visible set に残すべきではない。

Skill がすでに読み込み済みなら、圧縮後は要約と再読み込み入口だけでよいかもしれない。

第七に、失敗履歴。

モデルが同じ無効 Tool を三回連続で呼んだなら、Discovery Policy は優先度を下げるか、別経路を促すべきだ。

これらの signal は scoring model にできる。

最初から複雑でなくてよい。

MVP は素朴でよい。

```ts
type DiscoveryInput = {
  userGoal: string;
  cwd: string;
  touchedPaths: string[];
  permissionMode: "read-only" | "ask" | "auto";
  contextBudgetRemaining: number;
  connectedServers: string[];
  recentFailures: string[];
};

function selectVisibleCapabilities(
  catalog: CapabilityDescriptor[],
  input: DiscoveryInput
) {
  return catalog
    .filter((cap) => sourceIsAvailable(cap, input))
    .filter((cap) => permissionAllowsVisibility(cap, input))
    .map((cap) => ({
      cap,
      score: relevanceScore(cap, input) - riskPenalty(cap, input),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, visibleLimit(input))
    .map((item) => item.cap);
}
```

この擬似コードを recommendation algorithm として読まないでほしい。

示したい工学境界はこれだ。

```text
可視能力集合は Harness が計算すべきである。
catalog をそのままモデルに渡してはいけない。
```

CLI Agent の第一版 Discovery Policy は非常に控えめでよい。

```text
デフォルトでは基礎ローカル read-only Tool、テストコマンド、ToolSearch だけ公開する。
タスクが「テスト修正」を含む場合、test-fix skill index を公開する。
エラーログに PR、issue、CI などの証拠が現れたら、対応 MCP 能力の検索を許可する。
permission mode が ask なら、write Tool は見えるが実行前に承認が必要。
permission mode が read-only なら、Edit / Write は不可視。
```

これだけで多くの問題を解ける。

すべての知性がモデルから来るわけではない。

一部の知性は、Runtime が悪い選択肢を前もって取り除くことから来る。

## 八、可視性と権限は二つの門

ここは特に強調したい。

```text
Visibility は Permission の代替ではない。
Permission も Visibility の代替ではない。
```

二つは別の門だ。

第一の門はこう決める。

```text
このターンでモデルはある能力を見られるか？
```

第二の門はこう決める。

```text
モデルのこの具体呼び出しを実行してよいか？
```

第一の門だけなら、越権実行が起きる。

モデルが Tool を見たらシステムが実行する、というのは危険だ。

第二の門だけなら、誤った計画が起きる。

モデルが高リスク Tool を見て、それを前提に計画し、実行時に拒否される。タスク進行は中断される。

だから両方の門が必要だ。

図にするとこうなる。

![Capability Discovery：Skills、MCP、動的 Tool 公開 Mermaid 6](assets/00-17-capability-discovery-skills-mcp/mermaid-06.png)

この図で誤解されやすいのは `不可視` だ。

不可視は「インストールされていない」ではない。

「このターンではモデル視界に出すべきでない」というだけだ。

たとえば現在が read-only 分析 mode だとする。

`Edit` Tool はシステム内に存在するかもしれない。

しかし visible set に入るべきではない。

ユーザーが修正 mode に切り替えたら、再び現れる。

GitHub MCP がすでに接続されていても同じだ。

ローカルテスト失敗に remote 証拠がまだないなら、GitHub tool は最初は公開せず、ToolSearch 入口だけ残せる。

モデルがエラーに PR 番号を見つけてから検索で発見すればよい。

最初から全 GitHub Tool を出すより安定している。

可視性門は plan 空間を制御する。

権限門は execution 空間を制御する。

成熟した Harness はこの両方を制御しなければならない。

## 九、すべての外部能力は最終的に統一 tool pipeline に戻る

Capability Discovery を壊しやすいのは、能力ごとに旁路を作ることだ。

たとえばこうなる。

```text
Skill は独自の実行経路を持つ。
MCP は独自の実行経路を持つ。
ローカル Tool は独自の実行経路を持つ。
plugin Tool は独自の実行経路を持つ。
channel command は独自の実行経路を持つ。
```

短期的には実装が速い。

長期的には制御不能になる。

各経路が同じ問いに答え直す必要があるからだ。

```text
引数をどう検証するか？
権限をどう確認するか？
hook をどう走らせるか？
結果をどう切り詰めるか？
エラーをどう返すか？
trace をどう記録するか？
replay でどう復元するか？
ユーザー承認をどう扱うか？
```

能力ごとに独自回答を持てば、挙動は必ず分岐する。

このチュートリアルの設計原則はこうだ。

```text
能力の出所は違ってよい。
実行前には統一されなければならない。
```

つまりこうなる。

```text
Local Tool -> Internal Tool
MCP Tool -> Internal Tool
Plugin Tool -> Internal Tool
Skill Load -> Controlled Tool or Command
Resource Read -> Controlled Tool or Context Source
```

最終的には同じ execution pipeline を通る。

前に書いた pipeline だ。

```text
intent
-> validate
-> visibility check
-> permission
-> hooks
-> execute
-> observe
-> audit
```

違うのは adapter だけ。

ローカルファイル Tool の adapter は filesystem を呼ぶ。

MCP Tool の adapter は MCP server を呼ぶ。

Skill の adapter は SKILL.md を render して session に注入する。

Resource の adapter は外部 Context を読み、context projection に渡す。

主経路は変わらない。

これにより三つの利点がある。

第一に、監査が一貫する。

能力がどこから来ても、trace では統一 event が見える。

第二に、権限が一貫する。

内蔵 Tool は承認が必要で、MCP Tool は直接実行できる、という穴がなくなる。

第三に、replay が一貫する。

Session Replay はすべての外部能力呼び出しを event として扱える。能力ごとの私有履歴形式を理解する必要がない。

だから第 16 篇で event log を話した後、第 17 篇では Capability Discovery を話す。

能力が動的に変化すると、event log には「モデルが何を出し、システムが何を実行したか」だけでなく、次も記録する必要がある。

```text
当時システムはどの能力を発見していたか。
どの能力がモデルに可視だったか。
なぜある能力が読み込まれたか。
なぜある能力が拒否されたか。
```

そうでないと replay 時に Tool intent が見えても、なぜ当時その Tool が現れたか分からない。

## 十、能力変化は diff できなければならない

動的能力には新しい問題がある。

```text
能力集合は変化する。
```

MCP server は切断されるかもしれない。

MCP server は新しい tool を追加するかもしれない。

プロジェクトに Skill が追加されるかもしれない。

ユーザーが権限 mode を切り替えるかもしれない。

現在 path が backend から frontend に移るかもしれない。

ある plugin が無効化されるかもしれない。

これらはすべて visible set に影響する。

システムがメモリ内で静かに更新するだけなら、デバッグは非常に苦しくなる。

なぜこのターンでモデルは `mcp__github__list_check_runs` を見たのか？

前ターンではなぜ見えなかったのか？

なぜ `frontend-component` skill が急に有効になったのか？

なぜ `Bash` は可視から不可視に変わったのか？

これらは event にすべきだ。

Capability Discovery は capability diff を記録する必要がある。

event はこう書ける。

```ts
type CapabilityDiffEvent = {
  type: "capability.diff";
  turnId: string;
  added: string[];
  removed: string[];
  changed: Array<{
    id: string;
    before: string;
    after: string;
    reason: string;
  }>;
  policyInputs: {
    permissionMode: string;
    touchedPaths: string[];
    connectedServers: string[];
    contextBudgetRemaining: number;
  };
};
```

これはログを綺麗にするためではない。

帰因のためだ。

Agent が失敗したとき、いくつかのエラーを区別したい。

```text
モデルが Tool を選び間違えた。
Tool 実行が失敗した。
Tool はそもそも可視であるべきでなかった。
必要な Tool が発見されなかった。
Skill 説明が弱く、モデルが起動しなかった。
MCP server が切断されたのに古い Tool が残っていた。
権限 mode 変更後、visible set が refresh されなかった。
```

これらはどれも「Agent が賢くない」に見える。

しかし修正方法は完全に違う。

モデルが Tool を選び間違えたなら、Tool 説明を直すかもしれない。

Tool が可視であるべきでなかったなら、Discovery Policy を直す。

必要 Tool が発見されなかったなら、ToolSearch index を直す。

MCP 切断が残ったなら、connection state sync を直す。

Skill が起動しなかったなら、description や paths 条件を直す。

能力 diff は、これらを感覚から証拠へ変える。

## 十一、この仕組みを小さな CLI Agent に落とす

ここまでの機構を最小実装に圧縮する。

完全な ecosystem を最初から作る必要はない。

第 17 篇に対応する M6 能力は、まずこれだけでよい。

```text
CapabilityDescriptor
CapabilityCatalog
SkillLoader
MCPDiscoveryAdapter
ToolSearch
VisibleSetBuilder
CapabilityDiffEvent
```

ディレクトリはこう整理できる。

```text
src/capabilities/
  descriptor.ts
  catalog.ts
  discovery-policy.ts
  visible-set.ts
  diff.ts

src/skills/
  loader.ts
  renderer.ts
  skill-tool.ts

src/mcp/
  config.ts
  connections.ts
  discover.ts
  map-tools.ts

src/tools/
  tool-search.ts
  pipeline.ts
```

起動時、Harness は候補能力を集める。

```text
ローカル基礎 Tool を登録する。
プロジェクトとユーザー Skills を scan する。
MCP config を読み、server に接続する。
MCP tools/resources/prompts を発見する。
すべてを Capability Catalog に書く。
```

各 loop の開始前、Harness は visible set を構築する。

```text
現在タスクと session state を読む。
現在の権限 mode を読む。
到達済み path を読む。
MCP 接続状態を読む。
Context 予算を読む。
Discovery Policy を呼び、このターンの可視能力を計算する。
visible set をモデルの Tool list、SkillIndex、ResourceHandles に投影する。
capability diff を記録する。
```

モデルはこの投影に基づいてだけ行動できる。

より多くの能力が必要なら、ToolSearch または SkillSearch を呼ぶ。

検索結果も Discovery Policy に戻る。

最終的に、あらゆる実行 action は tool pipeline に入る。

sequence 図に圧縮するとこうなる。

![Capability Discovery：Skills、MCP、動的 Tool 公開 Mermaid 7](assets/00-17-capability-discovery-skills-mcp/mermaid-07.png)

この図では、モデルが二回参加する。

一回目は、現 visible set に基づいて「もっと能力を探す必要がある」と判断する。

二回目は、更新された visible set に基づいて実際の Tool call を出す。

その間の検索、絞り込み、公開は Harness が管理する。

これが動的 Tool 公開の核心だ。

無限メニューでモデルを自由探索させるのではない。

制御された入口を通じて、モデルが視界拡張を要求できるようにする。

## 十二、完全なテスト修正チェーン

話を一周させる。

ユーザー入力：

```text
このプロジェクトのテストがなぜ失敗しているか見て、直して。
```

第一ターンで Discovery Policy が公開する。

```text
Read
Grep
Glob
Bash(test-only)
ToolSearch
SkillSearch
SkillIndex: test-fix
```

モデルはまず `test-fix` を読み込む。

Harness は記録する。

```text
capability.loaded: skill__test-fix
```

Skill はまず失敗を再現せよと教える。

モデルが Tool intent を出す。

```text
Bash: npm test
```

Tool Pipeline は test-only コマンドであることを検証する。

権限は通る。

実行後の observation はこう示す。

```text
Snapshot mismatch in packages/ui/Button.test.ts
Related PR: #128
```

第二ターンで、モデルは PR Context が必要だと気づく。

ToolSearch を呼ぶ。

```json
{
  "query": "GitHub pull request 128 snapshot mismatch"
}
```

ToolSearch は候補を返す。

```text
mcp__github__get_pull_request
mcp__github__list_pull_request_comments
skill__frontend-component
```

Discovery Policy が確認する。

```text
GitHub MCP は接続済み。
現在権限は外部 read-only query を許可。
Context 予算は二つの tool schema を読み込む余裕がある。
現在到達 path は packages/ui で、frontend-component skill が関連する。
```

そこでこのターンに追加される。

```text
mcp__github__get_pull_request
mcp__github__list_pull_request_comments
frontend-component skill index
```

event log は diff を記録する。

```text
added:
  - mcp__github__get_pull_request
  - mcp__github__list_pull_request_comments
  - skill__frontend-component
reason:
  - observation mentioned PR #128
  - touched path packages/ui
```

モデルは PR を読む。

PR 議論は、component snapshot が aria-label の変更で失敗していることを示す。

モデルは関連 component と test を読む。

`frontend-component` Skill を読み込む。

Skill は制約する。

```text
snapshot だけを更新してはいけない。
まず accessibility semantics が正しいか確認する。
aria-label 変更が期待動作なら、test を更新する。
```

モデルは test を変更する。

最小テストを実行する。

さらにフルテストを実行する。

最後に結果を出力する。

この過程で能力集合は変わり続ける。

しかし変化には毎回理由がある。

外部 query は毎回 tool pipeline を通る。

Skill loading は毎回 event を記録する。

これが望ましい挙動だ。

## 十三、よくある悪い匂い

Capability Discovery を書くとき、よくある悪い匂いがいくつかある。

第一：

```text
全 Tool を一度にモデルへ詰め込む。
```

demo 段階ではよくある。

Tool が三、四個なら問題ない。

三、四十個になると、モデルはメニュー自体に引きずられる。

第二：

```text
Skill 全文を system prompt に常駐させる。
```

これでは Skill の必要時 loading の意味がなくなる。

Skill が増えるほど、main prompt は誰も維持しない手引書になる。

第三：

```text
MCP tool がモデル出力から直接 server.callTool に飛ぶ。
```

これはローカル権限、hook、監査、結果 policy を迂回している。

MCP は標準 protocol に見えるが、実際の外部システムに触れる可能性がある。

第四：

```text
ToolSearch 結果を権限 filter しない。
```

検索結果自体もモデル計画に影響する。

現在 mode で計画してはいけない能力をモデルに見せてはいけない。

第五：

```text
能力変化に event がない。
```

失敗原因の特定が難しくなる。

モデルが誤った Tool intent を出したことは分かる。

しかしなぜその Tool が見えていたか分からない。

第六：

```text
Tool 名で能力 identity を代用する。
```

`search` という名前は、ローカルファイル、GitHub、docs system、database、browser のどこから来てもおかしくない。

権限と監査は完全な能力 identity を使う必要がある。

たとえばこうだ。

```text
local__grep
mcp__github__search_issues
mcp__docs__search_pages
skill__code-review
```

第七：

```text
resources を普通の Tool 結果として雑に Context に戻す。
```

外部 resource は大きいかもしれない。

信頼できない内容を含むかもしれない。

Context Policy に入るべきであり、次ターン prompt を直接汚染してはいけない。

## 十四、最小テストはどう書くか

この仕組みはアーキテクチャ寄りに見えるが、テストできる。

第一のテスト：Skill は全文 pre-load しない。

```text
catalog に test-fix と code-review がある。
タスクがテスト失敗修正である。
モデル入力には SkillIndex の要約だけ含まれる。
SKILL.md 全文は含まれない。
モデルが load_skill(test-fix) を要求したとき、
システムが初めて test-fix 本文を注入する。
```

第二のテスト：read-only mode は write Tool を隠す。

```text
permissionMode = read-only。
catalog には Edit / Write が存在する。
visible set は Edit / Write を含まない。
ToolSearch も write Tool 詳細を返さない。
```

第三のテスト：MCP 切断で Tool を除去する。

```text
GitHub MCP が初期接続済み。
visible set は mcp__github__get_pull_request を含む。
接続が切れた後に catalog を refresh する。
capability.diff が removed を記録する。
次ターンの visible set にはその Tool がない。
```

第四のテスト：検索は授权ではない。

```text
ToolSearch が mcp__slack__send_message に命中する。
現在権限は外部 write を禁止する。
検索結果は send_message を visible set に入れない。
モデルがなお呼ぼうとした場合、permission gate が拒否 observation を返す。
```

第五のテスト：能力変化は replay 可能。

```text
テスト修正タスクを一回実行する。
event log には capability.diff が含まれる。
replay 時に各ターンの visible set を復元できる。
同じターンのモデル入力と Tool 可視集合が一致する。
```

これらのテストの目的は、モデルが必ず正しい Tool を選ぶことの証明ではない。

証明するのはこれだ。

```text
Harness が能力公開を検証可能に制御している。
```

「モデルが今回たまたま乱選しなかった」より重要だ。

## 十五、Capability Discovery が持ち込む新しい複雑さ

この層は Tool 爆発の問題を解く。

だが新しい複雑さも持ち込む。

第一に、能力 catalog 自体を保守する必要がある。

Tool、Skill、MCP、plugin、channel capability は統一記述を持つ必要がある。

説明が抽象的すぎるとモデルは見つけられない。

説明が長すぎると index が膨らむ。

第二に、可視性 policy は間違えうる。

公開が少なすぎると、モデルは手足を欠く。

公開が多すぎると、選択が混乱する。

trace と eval で継続的に校正する必要がある。

第三に、動的変化は replay に影響する。

当時の visible set を replay が記録していなければ、モデルがなぜそう行動したか再現できない。

第四に、Skills と MCP は信頼問題を持ち込む。

project Skill はモデルの挙動を変えられる。

MCP server は外部システムに触れる。

そのため Skill loading も source と policy の検証を通る必要がある。

project 内の Skill は「repo にある」だけで完全信頼してはいけない。

Capability Discovery は Permission Runtime、Hook Kernel、Session Replay と協働しなければならない。

第五に、ToolSearch は新しい入口になりうる。

検索結果がガバナンスされなければ、visible set を迂回する暗い入口になる。

だから ToolSearch は普通の helper 関数ではなく、Tool system の一部として扱う必要がある。

本篇で繰り返し強調している結論はこれだ。

```text
動的公開は制御を緩めることではない。
動的公開はより精密な制御である。
```

## 十六、前後の章との関係

第 11 篇は Plugin Host を扱った。

答えた問いはこうだ。

```text
core は外部 extension をどう受け入れ、汚染されないようにするか？
```

第 13 篇と第 14 篇は Tool Runtime と Local Tool Bundle を扱った。

答えた問いはこうだ。

```text
モデルが Tool intent を出した後、システムはどう制御して実行するか？
```

第 15 篇は Context Policy を扱った。

答えた問いはこうだ。

```text
モデルはこのターンでどんな情報を見るべきか？
```

第 16 篇は Session Replay を扱った。

答えた問いはこうだ。

```text
長時間タスクの事実源は何で、システムはどう復旧するか？
```

本篇は Capability Discovery を扱う。

答えた問いはこうだ。

```text
モデルはこのターンでどんな能力を見るべきか？
```

「情報」と「能力」は対称関係にある。

Context Policy は内容を管理する。

Capability Discovery は action 空間を管理する。

どちらも同じことをしている。

```text
すべてをモデルに詰め込まない。
```

次の Delegation Runtime に入ると、この問題はさらに大きくなる。

タスクを子 Agent に分けられるようになると、能力公開は「主モデルがこのターンで何を見るか」だけではなくなる。

さらにこうなる。

```text
子 Agent はどの能力を継承するか？
子 Agent は新しい能力を検索できるか？
子 Agent が MCP を呼ぶには主 Agent の承認が必要か？
子 Agent が結果を返すとき capability diff をどう持ち帰るか？
```

だから Capability Discovery は Delegation の前提条件だ。

主 Agent 自身の能力公開が制御不能なら、multi Agent は制御不能を拡大するだけだ。

## 十七、収束

本篇を一文に圧縮するとこうだ。

```text
Capability Discovery は Agent にもっと Tool を足すことではなく、Tool、Skill、MCP、plugin が増える中で、Harness がまず能力を発見し、タスクごとに最小可用集合を公開し、外部能力を最終的に統一 tool pipeline に戻す仕組みである。
```

Skills は経験を必要時に読み込めるようにする。

MCP は外部システムを標準化して接続できるようにする。

ToolSearch はモデルが視界拡張を要求できるようにする。

Deferred Loading は能力詳細を Context に常駐させない。

Discovery Policy は visible set を Harness の計算結果にする。

Capability diff は動的変化を監査可能、replay 可能にする。

これらの仕組みが合わさって、一つの工学的痛点を解く。

```text
能力が増えるほど、その能力をすべてモデルに消化させてはいけない。
```

モデルは次の一手を判断する。

Harness は、このターンでモデルにどの実行可能な一手を見せるかを決める。

これが動的 Tool 公開の本当の意味だ。

## 教学 Harness への落とし込み

教学プロジェクトでは、capability discovery を最小形から始められます。UI は `toolRegistry.definitions()` を表示し、model input には current registry が公開する tool schema だけを入れます。次に task type、profile、permission state で registry を絞ります。capability discovery はすべての tool を model に渡すことではなく、現在見える能力集合を管理することです。

---

GitHub ソース: [00-17-capability-discovery-skills-mcp.md](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-17-capability-discovery-skills-mcp.md)
