---
title: "Hosted Harness：Sandbox、Cron、Durable Execution とリモートデプロイ"
description: "ローカル CLI Agent をリモートのホスト環境へ移し、sandbox、cron、durable execution、workspace setup、secret boundary、artifact store、resume/retry、notification が Hosted Harness をどう構成するかを理解する。"
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.png'
locale: "ja"
tags:
  - Agent
  - Harness
  - Hosted Harness
  - Durable Execution
  - Sandbox
  - Automation
  - Deployment
aliases:
  - Hosted Harness
  - リモートホスト型 Agent Harness
  - Durable Agent Execution
---

# Hosted Harness：Sandbox、Cron、Durable Execution とリモートデプロイ

ここまで前の章を追ってきたなら、手元にはだんだん実用的になってきた CLI Agent があるはずです。

provider に接続できる。

モデルの出力を tool intent に分解できる。

Tool Runtime を通じて、ファイル操作、検索、ターミナルツールを実行できる。

observation を session に書き戻せる。

event log を使って replay できる。

局所的なタスクを sub-agent に委譲することさえできる。

この段階になると、つい次のように考えたくなります。

ローカル CLI がもう動くなら、それをサーバーに載せれば Hosted Harness になるのではないか。

たとえば worker を 1 つ立てる。

CLI コマンドを HTTP API で包む。

cron を 1 つ足す。

毎日深夜に次のように実行する。

```text
node cli-agent.js --task "このリポジトリのテスト失敗を調べて修正する"
```

一見、とても素直に見えます。

しかし、これは危険でもあります。

ローカル CLI が証明するのは、仕組みが動くことです。

モデル、loop、tools、state、permission、session という部品が 1 台のマシン上で協調できることを示してくれます。

しかし Hosted Harness が証明しなければならないのは、別のことです。

**Agent が目の前で動いていないとき、現在のターミナルにも、現在の作業ディレクトリにも、現在のプロセスメモリにも依存できないとき、それでも長いタスクを復元可能で、監査可能で、ガバナンス可能な形で完了できるか。**

この記事は「プロダクト化とホスティング」段階の締めくくりです。

ローカル Agent に新しいツールを 1 つ足す話ではありません。

特定の runtime の細部だけを議論する話でもありません。

前の記事で積み上げてきた、荷重を受ける層をまとめて扱います。

```text
Session / Harness / Sandbox
Automation / Cron
Durable Execution
Workspace Setup
Secret Boundary
Artifact Store
Resume / Retry
Notification
Deployment Topology
```

これらは一緒になって、次の問いに答えます。

> Hosted Harness は、なぜ「CLI をサーバーに置くこと」ではないのか？

答えを先に一文に圧縮すると、こうです。

**Hosted Harness はリモートの Agent プロセスではありません。時間、worker、sandbox をまたいで Agent タスクのライフサイクルをホストする制御システムです。**

この記事で完全なプラットフォームを一度に実装するわけではありません。

ここで描くのはホスティングの境界です。どの事実を worker の外側に永続化すべきか、どの action を policy に通すべきか、どの復元点に証拠が必要かを整理します。

## 一、ローカル CLI が証明できるのは仕組みであり、ホスティングではない

前と同じ例を使います。

ユーザーがローカルでこう入力します。

```text
このリポジトリの CI が落ちています。原因を特定して修正してください。
```

ローカル CLI Agent の実行の流れは、おおよそ次のようになります。

```text
プロジェクトルールを読む
-> テストを実行する
-> 失敗ログを観察する
-> 関連コードを検索する
-> ファイルを編集する
-> もう一度テストを実行する
-> 結果を要約する
```

この流れがローカルで通るだけでも、十分に価値があります。

多くの抽象が机上の空論ではないと確認できるからです。

たとえば provider contract はきれいに保たれているか。

tool intent は validate できるか。

permission gate は高リスクなコマンドを止められるか。

event log は事実を記録しているか。

context policy は長いログを、次のモデルターンで扱える observation に圧縮できるか。

ただし、ローカル CLI には隠れた前提があります。

ユーザーはたいていターミナルの前に座っています。

現在のプロセスは生きています。

現在の作業ディレクトリは存在しています。

現在の環境変数も残っています。

現在の shell のネットワーク、ファイルシステム、依存キャッシュもまだあります。

たとえタスクが失敗しても、ユーザーはターミナル出力を見て、何が起きたかをおおよそ理解できます。

このタスクがリモートのホストタスクになった瞬間、これらの前提はすべて変わります。

たとえばユーザーが automation を設定します。

```text
毎朝 8 時に main ブランチのテストを確認する。
失敗していたら、修正を試みてレポートを送る。
```

このとき Agent は、ユーザーのターミナル内ですぐに実行されるわけではありません。

将来のある時刻に scheduler から起こされるかもしれません。

リモート worker に配置されるかもしれません。

GitHub から最新コードを取得する必要があるかもしれません。

一時 workspace を作る必要があるかもしれません。

サーバー側 vault にしかない secret を使う必要があるかもしれません。

40 分間動くかもしれません。

途中で worker が preempt されるかもしれません。

途中でユーザーの承認待ちになるかもしれません。

patch、テストログ、trace、レポートを生成するかもしれません。

タスク終了後に thread、メール、Slack、PR comment でユーザーへ通知する必要があるかもしれません。

これは「CLI がサーバー上で一度動いた」という話ではありません。

ホストされた実行システムです。

ローカル CLI よりはるかに多くの問いに答えなければなりません。

```text
タスクはいつ trigger されたのか？
trigger は idempotent か？
このタスクはどの user / project / profile に属するのか？
workspace はどう準備するのか？
sandbox はどう選ぶのか？
secret はどう注入し、どう漏洩を防ぐのか？
event log はどこに保存するのか？
artifact はどこに保存するのか？
worker がクラッシュしたらどこから再開するのか？
再実行で副作用が重複しないか？
ユーザーがオンラインでないとき、どう承認を求めるのか？
実行完了をどう通知するのか？
失敗時にどう原因を帰属させるのか？
```

これらに明確な答えがなければ、ローカル CLI をサーバーに置いても、デバッグしづらい CLI になるだけです。

成功したときは自動化されているように見えます。

失敗したときは、replay できないログの断片だけを残します。

したがって Hosted Harness の第一原則は次のとおりです。

**「実行場所がリモートになった」ことを「システムがホスト化された」ことと取り違えない。**

ホスト化の核心はリモートにあることではありません。

タスクのライフサイクルが明示的にモデル化されていることです。

## 二、Hosted Harness の 5 つの境界

第 4 篇では、3 つの対象を分けました。

```text
Session：事実源
Harness：制御ループ
Sandbox：実行する手
```

Hosted Harness では、この三分法をさらに外側へ 2 層広げる必要があります。

```text
Automation：いつ、なぜタスクが trigger されるのか
Deployment：これらのコンポーネントがどこに配置され、どうスケールし、どう tenant を隔離するのか
```

つまり Hosted Harness には、少なくとも 5 つの境界があります。

```text
Automation
Harness
Session
Sandbox
Deployment
```

これらは同じものではありません。

1 つの「remote agent service」に混ぜ込むべきでもありません。

![Hosted Harness：Sandbox、Cron、Durable Execution とリモートデプロイ](assets/00-23-hosted-harness-durable-execution/mermaid-01.png)

この図で重要なのは、ノードの数ではありません。

矢印の向きです。

Automation はリポジトリを直接操作しません。

記録可能な trigger を 1 つ作るだけです。

Harness は事実を worker のメモリに隠しません。

event を Session に書き込みます。

Sandbox はタスクの事実を所有しません。

action を実行する環境にすぎません。

Deployment も業務ロジックそのものではありません。

queue、worker、vault、artifact store、sandbox pool を継続的に動かすためのインフラ層です。

これらの層を混ぜると、よくある実装は次のようになります。

```ts
cron.schedule("0 8 * * *", async () => {
  const repo = await git.clone(project.repoUrl);
  process.env.GITHUB_TOKEN = project.githubToken;

  const result = await runCliAgent({
    cwd: repo.path,
    prompt: "テストを確認して修正する",
  });

  await sendEmail(project.ownerEmail, result.summary);
});
```

このコードがまったく動かないわけではありません。

demo ではむしろ滑らかに見えるかもしれません。

しかし、重要な問いをすべて埋めてしまっています。

cron trigger に event がありません。

repo workspace にバージョン identity がありません。

secret がそのままプロセス環境に入っています。

agent の実行過程に durable checkpoint がありません。

tool の副作用が独立して記録されていません。

artifact は一時ファイルにすぎません。

worker がクラッシュした後、どこまで進んだかわかりません。

メール送信後も、それが検証済みの結果に基づくかどうかわかりません。

Hosted Harness が避けたいのは、まさに「すべての層を 1 つの async 関数に書いてしまう」衝動です。

より安定した分層は、たとえば次のようになります。

```text
Automation が JobIntent を作成する
-> Queue が Job を永続化する
-> Worker が Job を取得する
-> Harness が Session を作成または復元する
-> Workspace Setup がコード環境を準備する
-> Sandbox Pool が実行環境を割り当てる
-> Durable Loop が各ステップを進める
-> Artifact Store が証拠を保存する
-> Notification が結果を送る、またはユーザー入力を求める
```

各ステップに event があるべきです。

各ステップは復元できるべきです。

各ステップは監査できるべきです。

## 三、Cron は定時コマンドではなく、復元可能なタスクを作る

多くのシステムが初めて automation を追加するとき、cron を「定時 Bash」として扱います。

普通のスクリプトなら、それでも許容できることがあります。

しかし Agent にとって、cron は 1 本のコマンドだけを表すべきではありません。

タスク意図を表すべきです。

Agent タスクは長くなる可能性があるからです。

一時停止するかもしれません。

approval が必要になるかもしれません。

retry するかもしれません。

次の cron が来た時点でも、まだ実行中かもしれません。

そのため Hosted Harness の cron は、少なくとも 4 つの問いを扱う必要があります。

```text
schedule：いつ trigger するか
identity：誰の代理として trigger するか
idempotency：同じ時間窓ですでに trigger されていないか
handoff：trigger 後に誰が責任を引き継ぐか
```

たとえば「毎朝 8 時にテストを確認する」は、直接こう変換すべきではありません。

```text
run npm test
```

まず構造化された object になるべきです。

```ts
type AutomationTrigger = {
  automationId: string;
  scheduleWindow: {
    start: string;
    end: string;
  };
  userId: string;
  projectId: string;
  profileId: string;
  goal: string;
  idempotencyKey: string;
  notificationPolicy: {
    onSuccess: "summary";
    onFailure: "summary-and-artifacts";
    onApprovalRequired: "immediate";
  };
};
```

この object の価値は、型がきれいに見えることではありません。

システムが次の問いに答えられるようになることです。

```text
このタスクはどの automation が trigger したのか？
同じ時間窓の重複 trigger ではないか？
どのユーザー認可を使うべきか？
どのプロジェクト設定を使うべきか？
結果をどこに送るべきか？
人間の承認が必要な場合、すぐ通知すべきか？
```

cron が trigger された後、最初にすることはモデルを起動することではありません。

event を書くことです。

```text
automation.triggered
job.created
job.enqueued
```

その後ではじめて worker に入ります。

![Hosted Harness：Sandbox、Cron、Durable Execution とリモートデプロイ](assets/00-23-hosted-harness-durable-execution/mermaid-02.png)

この図では、cron はモデルを直接呼んでいません。

コマンドも直接実行していません。

「将来のある時刻に、ある作業を続けるべきだ」という意図を、復元可能な job に変えているだけです。

これが Hosted Harness における automation と、普通の cron スクリプトの違いです。

普通の cron は、タスクが短く、決定的で、同期的だと仮定します。

Agent automation は、タスクが長く、不確実で、一時停止しうると仮定しなければなりません。

したがって cron の出力は stdout ではなく、追跡可能な job lifecycle であるべきです。

この層がうまくできていないと、最もよく起きる問題は重複実行です。

たとえばある朝 8 時に scheduler がタスクを trigger します。

worker が repo の clone を始めた直後に、プロセスが再起動します。

scheduler が retry し、新しい job を作ります。

2 つの job が同じブランチを同時に修正します。

一方はテストを直します。

もう一方は古い workspace をもとに、衝突する patch を提出します。

最後にユーザーは、互いに矛盾する 2 つの通知を受け取ります。

これはモデル推論の失敗ではありません。

automation に idempotency がないことによる失敗です。

Hosted Harness は、この種の失敗をモデルの外側で止めるべきです。

## 四、リモート Sandbox：檻であり、同時に許可証でもある

ローカル CLI が最も手を抜きやすいのは、実行環境です。

ユーザーの作業ディレクトリに直接立っています。

ファイルを読む、ファイルを書く、テストを実行する。そのすべてが同じホスト上で起きます。

Hosted Harness では、このやり方はできません。

リモートのホスト環境が向き合うのは、1 人のユーザーの 1 回のコマンドではないからです。

複数ユーザー、複数プロジェクト、複数タスク、複数 worker の組み合わせです。

各タスクは、モデルが生成したコードを実行する可能性があります。

各タスクは、private repository に触れる可能性があります。

各タスクは、依存関係をインストールし、テストを実行し、ネットワークにアクセスする可能性があります。

そのため sandbox は安全装置であるだけではありません。

より積極的な役割も持ちます。

**Agent が自由に行動してよい領域を定義することです。**

sandbox がなければ、システムは action ごとにユーザーへ尋ねるしかありません。

```text
このファイルを書いてよいですか？
この依存関係をインストールしてよいですか？
このテストを実行してよいですか？
このドメインにアクセスしてよいですか？
patch を生成してよいですか？
```

承認が増えすぎると、ユーザーは疲れます。

疲れたユーザーは、Agent を使うのをやめるか、反射的にすべて承認するようになります。

どちらもシステムの価値を損ないます。

sandbox があれば、permission は「操作ごとに尋ねる」から「今回のタスク用に境界のある workspace を設定する」へ変えられます。

だから sandbox は檻であると同時に許可証でもあります。

Agent が境界を越えないよう制限します。

同時に、境界内では Agent が継続して前進することを許します。

ホストされたテスト修正タスクでは、sandbox は少なくとも次に答える必要があります。

```text
ファイルシステム：どの repo / worktree だけを見せるのか？
ネットワーク：package registry、GitHub API、内部サービスへアクセスできるのか？
プロセス：テストコマンドは最長どれくらい実行できるのか？
リソース：CPU、メモリ、ディスク、並行数の上限はいくつか？
スナップショット：失敗後に現場を保持できるのか？
リセット：次のタスクはクリーンな環境から始まるのか？
永続化：どの内容をステップ間で保持できるのか？
```

sandbox backend によってトレードオフは異なります。

ローカル権限 sandbox は起動が速く、ホストの見え方を狭めるのに向いています。

コンテナは依存関係をパッケージしやすく、プロジェクト単位の隔離に向いています。

microVM は隔離が強い一方、コストと cold start が重くなります。

ブラウザやデスクトップ sandbox は computer-use 系のタスクに向いています。

Hosted Harness は、これらの選択を Agent loop にハードコードすべきではありません。

execution backend として抽象化するべきです。

```ts
type SandboxSpec = {
  image: string;
  workspaceRef: string;
  filesystemPolicy: "repo-only" | "worktree" | "ephemeral";
  networkPolicy: {
    allowDomains: string[];
    denyAllOther: boolean;
  };
  resourceLimits: {
    cpu: number;
    memoryMb: number;
    timeoutSeconds: number;
  };
  persistence: {
    keepArtifacts: boolean;
    keepWorkspaceSnapshot: boolean;
  };
};
```

ここに prompt は出てきません。

「モデルがよいと思った」という判断も出てきません。

sandbox spec は Harness の実行契約です。

モデルはテスト実行を提案できます。

しかし、ユーザーの home ディレクトリにアクセスしてよいかどうかは決められません。

secret を stdout に出してよいかどうかも決められません。

これらの境界は、Hosted Harness の実行層が保持しなければなりません。

![Hosted Harness：Sandbox、Cron、Durable Execution とリモートデプロイ](assets/00-23-hosted-harness-durable-execution/mermaid-03.png)

この図で最も重要な境界は `Policy -> Sandbox Spec` です。

多くの人は sandbox を tool execution の内部実装だと考えます。

しかし Hosted Harness では、sandbox は policy の物理化です。

policy が「repo workspace の中でだけテストを実行できる」と言うなら、sandbox はその policy をファイルシステム、ネットワーク、リソース、プロセスの制限として実体化しなければなりません。

そうでなければ、policy は紙の上の約束にすぎません。

## 五、Workspace Setup：リモートタスクはプロジェクトの現場を最初から持っていない

ローカル CLI には自然な現場があります。

現在のディレクトリがそのままプロジェクトです。

リモート worker には、この現場がありません。

タスクを始めるたびに、まず次の問いに答える必要があります。

```text
コードをどこから取るのか？
どの commit を取るのか？
どのブランチを使うのか？
一時 worktree を作るのか？
依存関係をどうインストールするのか？
プロジェクトルールはどこにあるのか？
キャッシュは再利用できるのか？
失敗時の現場をどう保存するのか？
```

これが workspace setup です。

単なる `git clone` ではありません。

Hosted Harness が「ユーザーのプロジェクト」を「今回のタスクが操作できる workspace」へ投影する過程です。

テスト修正タスクなら、setup plan は次のようになるかもしれません。

```text
project config を読む
-> repo を取得する
-> checkout main@sha
-> task branch を作る
-> 依存関係をインストールする
-> AGENTS.md / project rules を読む
-> artifact ディレクトリを作る
-> workspace.ready event を書く
```

ここで最も重要なのは `main@sha` です。

リモートの長いタスクは、どのコード事実を基点に始まったかを必ず知る必要があります。

単に「main ブランチ」とだけ言った場合、タスクの途中で main が更新されたらどうなるでしょうか。

Agent が patch を生成するときに base commit がなければ、後続の review も replay も曖昧になります。

そのため workspace setup は event に書き込むべきです。

```json
{
  "type": "workspace.ready",
  "workspaceId": "ws_123",
  "repo": "example/app",
  "baseRef": "main",
  "baseSha": "abc123",
  "taskBranch": "agent/fix-tests-2026-05-28",
  "sandboxId": "sbx_456",
  "rules": ["AGENTS.md", ".harness/project.md"],
  "artifactRoot": "artifact://session/s23/"
}
```

こうしておけば、後続の各 tool event を同じ workspace identity に紐づけられます。

テストログはどの commit に属するのか。

patch はどの base に基づくのか。

依存関係のインストールはどの sandbox で行われたのか。

artifact はまだ残っているのか。

これらの問いに event から答えられます。

Workspace setup には、過小評価されがちなもう 1 つの点があります。

これは context policy の入力でもあります。

モデルの次のターンが見るのは「ある worker のディスクに何があるか」ではありません。

Harness が workspace の事実から投影した context です。

```text
現在のリポジトリ
現在の base commit
現在の task branch
プロジェクトルールの要約
依存関係のインストール状態
直近のテスト結果
利用できる tool の境界
```

setup が構造化されていなければ、context は shell 出力から推測するしかありません。

それではリモートタスクは非常に脆くなります。

## 六、Secret Boundary：secret は sandbox にもモデル context にも属さない

リモートのホストタスクは、避けようとしても secret に触れます。

たとえば private repository を取得するには token が必要です。

private package をインストールするには registry credential が必要です。

cloud service を呼ぶには API key が必要です。

ユーザーに通知するには webhook が必要です。

しかし Hosted Harness で最も危険な誤りの 1 つは、secret を普通の環境変数として sandbox に入れてしまうことです。

```ts
env: {
  GITHUB_TOKEN: user.githubToken,
  NPM_TOKEN: project.npmToken,
  SLACK_WEBHOOK_URL: user.webhookUrl,
}
```

これは最も簡単に見えます。

そして最も漏れやすい方法でもあります。

Agent は次を実行するかもしれません。

```bash
env
```

テストスクリプトが環境変数を出力するかもしれません。

依存関係のインストールログに token が含まれるかもしれません。

モデルが stdout を observation に要約するかもしれません。

observation がさらに messages に入るかもしれません。

最後には secret が trace、artifact、通知、さらには PR comment にまで現れるかもしれません。

だから Hosted Harness では secret boundary を硬い境界にする必要があります。

基本原則は次のとおりです。

```text
secret は vault に置く。
モデルは secret の生値を見ない。
sandbox はデフォルトで secret の生値を受け取らない。
tool は capability を通じて secret を使う。
log と artifact は redact する。
注入が必要な場合は、最小 scope と最短 lifetime にする。
```

たとえば GitHub 操作では、必ずしも token を shell に渡す必要はありません。

制御された tool を提供できます。

```text
create_pull_request
post_pr_comment
fetch_ci_status
```

これらの tool は Harness 側で vault credential を使います。

モデルは intent を提案するだけです。

Tool Runtime が intent を検証します。

tool の実行時にだけ一時的に secret を取り出します。

結果は構造化された observation として返します。

secret は sandbox stdout に入りません。

secret は messages に入りません。

secret はユーザー向けレポートにも入りません。

もちろん、sandbox 内で private package をインストールする必要が本当にあるタスクもあります。

その場合でも、一時 credential を使うべきです。

さらに domain、command、有効期限、出力の redact を制限するべきです。

![Hosted Harness：Sandbox、Cron、Durable Execution とリモートデプロイ](assets/00-23-hosted-harness-durable-execution/mermaid-04.png)

この図で最も重要なのは 2 本の破線です。

Vault はモデルに入らない。

Vault は sandbox に直接露出しない。

この 2 本を守れなければ、Hosted Harness のほかのガバナンスも弱くなります。

リモートホスティングとは、システムがユーザーの代理として行動することだからです。

ユーザーの代理として行動するには、identity と credential が必要です。

そして identity と credential が漏れたとき、Agent の問題は「間違ったコードを変更した」だけでは済みません。

システムをまたぐ権限事故になりえます。

## 七、Durable Execution：長いタスクは worker が生き続けることに賭けてはいけない

ローカル CLI の最小 loop は、次のように書けます。

```ts
while (!done) {
  const response = await model.call(messages);
  const intent = parseIntent(response);
  const result = await toolRuntime.execute(intent);
  messages.push(toObservation(result));
}
```

第 16 篇で見たように、この書き方では長いタスクの復元を支えられません。

Hosted Harness になると、その問題はさらに明確になります。

worker は信頼できる事実源ではないからです。

worker はクラッシュします。

preempt されます。

rolling deploy されます。

timeout で kill されます。

人間の承認待ちのあいだに解放されることもあります。

したがって durable execution の核心は「try/catch を増やすこと」ではありません。

各ステップを、確認可能で、復元可能で、retry または skip できる state transition にすることです。

ここでいう `durable execution` は復元 semantics を指しており、特定の workflow framework に依存しません。

queue、database、workflow engine、あるいは素朴な state machine で実装できます。重要なのは、未知の副作用を再実行せず、証拠のある境界からだけ続けることです。

これは第 16 篇の Session Replay と同じ規律を、リモート環境へ拡張したものです。

```text
Replay はローカル長期タスク復元の事実メカニズムである。
Durable execution は remote worker / queue / sandbox 環境における復元メカニズムである。
両者は同じ規律を共有する。未知の副作用を再実行せず、証拠のある境界からだけ続ける。
```

Agent loop の特殊な点は、次にあります。

モデル呼び出しも tool 実行も、普通の関数ではありません。

モデル呼び出しは異なる結果を返す可能性があります。

tool 実行には副作用がある可能性があります。

context projection はモデルが見る世界を変えます。

permission gate はタスクを一時停止させることがあります。

そのため Hosted Harness の durable loop は、少なくとも次のような形である必要があります。

```text
load session
-> acquire job lease
-> prepare workspace checkpoint
-> build context projection
-> persist model.requested
-> call model
-> persist model.responded
-> parse and validate intent
-> persist intent.validated
-> review policy
-> persist policy.decided
-> maybe pause for approval
-> execute in sandbox
-> persist tool.started
-> persist tool.finished
-> save artifacts
-> project observation
-> persist observation.appended
-> decide lifecycle state
-> release or renew job lease
```

この流れは面倒に見えます。

しかし各ステップは、1 つの復元の問いに答えています。

```text
いま worker が死んだら、次はどこから続けるのか？
```

![Hosted Harness：Sandbox、Cron、Durable Execution とリモートデプロイ](assets/00-23-hosted-harness-durable-execution/mermaid-05.png)

この図で最も重要なのは `WaitingApproval` と `Paused` です。

ローカル CLI では、これらをブロッキングとして扱いがちです。

リモート Hosted Harness では、通常の lifecycle として扱わなければなりません。

ユーザーがオンラインでないことは、タスク失敗を意味しません。

worker を解放する必要があることも、タスク失敗を意味しません。

予算が尽きたことも、タスク失敗を意味しません。

これらはすべて session の durable state です。

次に resume するとき、Harness は event log を読みます。

state を再構築します。

artifact を確認します。

workspace を再準備するか snapshot を復元します。

そのうえで次の一手を決めます。

### Retry は最初からやり直すことではない

Durable execution で最も起きやすい誤解は、retry を「最初からもう一度実行すること」と考えることです。

Agent にとって、それはたいてい間違いです。

モデル request は送ったが response がまだ永続化されていない場合、モデル呼び出しを retry すると別の intent が返るかもしれません。

tool は実行されたが `tool.finished` が書けていない場合、tool を retry すると副作用が重複するかもしれません。

通知は送ったが notification event が書けていない場合、retry によってユーザーへ重複して通知するかもしれません。

そのため retry はステップごとに分類する必要があります。

```text
pure read：retry できる
model call：retry できるが request identity を記録する
tool write：副作用の証拠を確認する必要がある
external notification：dedupe key が必要
approval request：idempotent でなければならない
workspace setup：再構築できるが base identity を保持する
```

単純な durable step は、次のように表せます。

```ts
type DurableStep = {
  id: string;
  kind:
    | "model_call"
    | "tool_execution"
    | "workspace_setup"
    | "approval_request"
    | "notification";
  idempotencyKey: string;
  retryPolicy: "safe" | "check-before-retry" | "never-auto-retry";
  beforeEvent: string;
  afterEvent: string;
  artifactRefs?: string[];
};
```

重要なのは型名ではありません。

Harness が長いタスクを、連続した関数呼び出しとして見なくなることです。

長いタスクを、復元可能なステップ列として見ることです。

各ステップには identity があります。

各ステップには証拠があります。

各ステップには retry semantics があります。

これが durable execution と普通のバックグラウンド job queue の違いです。

普通の queue は、たいてい job の成功または失敗だけを気にします。

Hosted Harness は、job 内部の Agent loop 1 ターンごとの因果境界を気にしなければなりません。

## 八、Artifact Store：リモートタスクの証拠はログだけに残してはいけない

ローカル CLI の出力は、通常ターミナルに出ます。

リモートタスクでは、そんな贅沢はできません。

ユーザーがオンラインとは限りません。

worker 終了後にローカルディスクが消されるかもしれません。

sandbox が破棄されるかもしれません。

ログシステムが rolling text しか保持しないかもしれません。

一方で Agent タスクの重要な証拠は、多くの場合かなり大きいものです。

```text
テスト stdout / stderr
完全な patch
モデル入力 snapshot
モデル出力の原文
workspace diff
依存関係インストールログ
スクリーンショット
trace
評価レポート
最終 summary
```

これらをすべて event log に詰め込むべきではありません。

messages にすべて入れるべきでもありません。

artifact store に入れるべきです。

event log は参照と hash を記録します。

artifact store は証拠資料を保存します。

observation はモデルが必要とする要約だけを持ちます。

![Hosted Harness：Sandbox、Cron、Durable Execution とリモートデプロイ](assets/00-23-hosted-harness-durable-execution/mermaid-06.png)

この図は第 16 篇の原則を引き継いでいます。

messages は事実源ではありません。

event log が事実源です。

artifact は事実の証拠です。

projection は、消費者ごとに見せる view です。

Hosted Harness における artifact store には、もう 1 つの価値があります。

notification をより誠実にできることです。

たとえばリモート automation がテスト修正に失敗したとします。

通知にこうだけ書くべきではありません。

```text
修正に失敗しました。
```

次のような情報を添えられるべきです。

```text
失敗テストの要約
重要ログ断片
完全なログ artifact
生成された patch artifact
最後の安定 checkpoint
ユーザー承認が必要な次のステップ
```

これにより、ユーザーは worker マシンを開かなくてもタスク状態を理解できます。

次回の resume も、「メール内の文字要約」に頼らず続けられます。

## 九、Notification：通知は final answer ではなく lifecycle event である

ローカル CLI の終わり方は単純です。

Agent が最後に一言こう言います。

```text
修正しました。テストも通っています。
```

リモート Hosted Harness の終わり方は、もっと複雑です。

ユーザーが画面を見ているとは限らないからです。

タスクは成功するかもしれません。

失敗するかもしれません。

一時停止するかもしれません。

承認待ちになるかもしれません。

ユーザーに次の一手を選んでもらう必要があるかもしれません。

PR を生成するかもしれません。

毎日の健康診断レポートにすぎないかもしれません。

したがって notification は、単に「final answer を送る」ものではないはずです。

lifecycle の consumer であるべきです。

つまり notification system は session event を読みます。

notification policy に基づいて何を送るかを決めます。

そして送信した通知自体も event log に書き戻します。

```text
task.completed -> send summary
task.failed -> send failure report with artifacts
approval.requested -> send immediate approval link
job.paused -> send resume reason if policy requires
verification.failed -> send diagnostics
```

なぜ通知も event にするのでしょうか。

通知そのものが副作用だからです。

重複送信されるかもしれません。

送信に失敗するかもしれません。

ユーザーがクリックするかもしれません。

後続の resume の入口になるかもしれません。

event log に入らなければ、システムは次の問いに答えられません。

```text
ユーザーに通知されたのか？
通知されたのはどのバージョンの事実か？
ユーザーが承認したのはどの action か？
その承認は現在の workspace にまだ適用できるか？
```

リモートタスクでは、notification はよく HITL と結びつきます。

たとえば Agent が高リスクなコマンドを実行したいとします。

```text
rm -rf node_modules && npm install
```

ローカル CLI なら、ターミナルで直接尋ねられます。

```text
許可しますか？
```

Hosted Harness は、ターミナルが存在するとは仮定できません。

approval request を生成する必要があります。

```json
{
  "type": "approval.requested",
  "sessionId": "s23",
  "actionId": "act_019",
  "risk": "medium",
  "reason": "CI を再現するため、依存関係をクリーンにして再インストールする必要があります",
  "expiresAt": "2026-05-28T10:00:00Z",
  "notificationRef": "notification://thread/abc"
}
```

ユーザーが承認したあと、システムは古い action をそのまま続行してはいけません。

さらに次を確認する必要があります。

```text
approval は期限切れではないか？
workspace はまだ同じ base か？
action はまだ適用可能か？
permission policy は変わっていないか？
session は別の worker によって進められていないか？
```

ここが hosted HITL がローカル prompt より複雑なところです。

ユーザーがクリックしているのは、ただのボタンではありません。

ユーザーは、context identity を持つ action に権限を与えています。

## 十、Remote Worker：worker は交換可能な実行者であり、タスクの事実源ではない

ここまでの層をつなげて見てみます。

Hosted Harness には通常、job queue と worker があります。

しかし worker の位置づけは誤解されやすいです。

多くの人は worker を「Agent が動いている場所」と見なします。

これは半分だけ正しいです。

worker は、現在 session を前に進めようとしている実行者です。

しかし session そのものではありません。

事実源でもありません。

むしろ借りてきた手のようなものです。

job を受け取る。

workspace を準備する。

sandbox を取得する。

数ステップ進める。

lease を更新する。

続けられなければ解放する。

本当に重要な事実はすべて外部に書かれます。

```text
Session Store
Artifact Store
Workspace Snapshot
Queue Lease
Notification Log
Trace Store
```

![Hosted Harness：Sandbox、Cron、Durable Execution とリモートデプロイ](assets/00-23-hosted-harness-durable-execution/mermaid-07.png)

この図では、Worker A のクラッシュ自体は災害ではありません。

災害なのは、Worker A がクラッシュしたとき、事実がそのメモリにしかないことです。

session と artifact が外部にあれば、Worker B が引き継げます。

引き継ぐとは、単に再実行することではありません。

event log を replay します。

artifact を確認します。

workspace を復元します。

最後の安定点を見つけます。

そのうえで resume gate を通して続行します。

これが Hosted Harness と「バックグラウンドで agent プロセスを走らせること」の分岐点です。

バックグラウンドプロセスは、プロセスが生き続けることを重視します。

Hosted Harness は、事実を復元できることを重視します。

プロセスは死んでもかまいません。

session は失ってはいけません。

artifact は失ってはいけません。

permission decision は失ってはいけません。

notification dedupe は失ってはいけません。

## 十一、Deployment Topology：Local CLI、Server、Hosted Harness の違い

ここまで来ると、deployment topology を 1 枚の図で整理できます。

同じ Agent でも、topology が違えば負う責任はまったく違います。

![Hosted Harness：Sandbox、Cron、Durable Execution とリモートデプロイ](assets/00-23-hosted-harness-durable-execution/mermaid-08.png)

Local CLI の強みは feedback が速いことです。

仕組みを学ぶ、tool をデバッグする、最小 loop を検証する、といった用途に向いています。

ユーザーが能動的に開始し、短時間見守るタスクにも向いています。

Server Agent は一歩進んでいます。

実行をリモートに移しています。

API、queue、worker、集中ログを持つかもしれません。

しかし session を worker メモリに置き、sandbox を一時ディレクトリとして扱い、notification を最後のメッセージとして扱っているなら、それはまだ Hosted Harness ではありません。

Hosted Harness の目印は次のとおりです。

```text
タスク trigger が記録可能である
session が復元可能である
sandbox が交換可能である
workspace が再構築可能である
secret に境界がある
artifact が追跡可能である
worker が失敗してもよい
approval が時間をまたげる
notification が dedupe 可能である
trace で原因帰属できる
deployment が governance 可能である
```

これは機能リストではありません。

ホストされた長いタスクの最低限の規律です。

### 最初から一気に作ろうとしない

これらの層を見ると、Hosted Harness は最初から重くなければならないように感じるかもしれません。

そうではありません。

最小実用の Hosted Harness は、かなり狭くてもかまいません。

たとえば 1 つの GitHub repo だけをサポートする。

cron は 1 つだけ。

Docker sandbox は 1 種類だけ。

通知方法も 1 種類だけ。

テスト修正という種類のタスクだけをサポートする。

それでも、重要な分層は守るべきです。

```text
job queue は session ではない
worker は事実源ではない
sandbox は workspace identity ではない
messages は event log ではない
secret は普通の env ではない
final answer は notification lifecycle ではない
```

これらの境界は最初から明確にしておく必要があります。

能力は少なくてかまいません。

境界は乱してはいけません。

## 十二、ホストされたテスト修正タスクはどう完走するか

ここで、この記事全体を同じ例に戻します。

ユーザーが automation を設定しています。

```text
毎朝 8 時に main ブランチを確認する。
テストが失敗していたら修正を試みる。
高リスクな操作が必要なら、承認のために通知する。
修正に成功したら patch レポートを生成する。
```

Hosted Harness の 1 回の完全な実行は、次のように展開できます。

### 1. Cron がタスクを作成する

Scheduler が時刻になって trigger します。

Agent を直接実行しません。

`AutomationTrigger` を作成します。

automation id、日付 window、project id を使って idempotency key を生成します。

Queue はこの key がすでに存在するかを確認します。

存在するなら、重複作成しません。

存在しないなら、次を書き込みます。

```text
automation.triggered
job.created
job.enqueued
```

### 2. Worker が job を取得する

ある worker が job lease を取得します。

タスクを所有するわけではありません。

一定時間だけ前に進める権利を得るだけです。

project config を読みます。

user profile を読みます。

automation policy を読みます。

その後、session を作成または復元します。

### 3. Workspace setup が現場を準備する

Harness はリポジトリを取得します。

`main@baseSha` に checkout します。

task branch を作ります。

依存関係をインストールします。

プロジェクトルールを読みます。

artifact root を作ります。

`workspace.ready` を書き込みます。

依存関係のインストールに失敗した場合、失敗ログは artifact に入ります。

session は復元可能な失敗状態に入ります。

notification policy が、すぐ報告するかどうかを決めます。

### 4. Sandbox が制御された tool を実行する

モデルが提案します。

```text
テストを実行する。
```

Provider は tool intent を返します。

Harness は schema を validate します。

Permission policy は、これが許可されたテストコマンドだと判断します。

Sandbox は制御されたリソースで実行します。

```text
npm test
```

stdout と stderr は artifact に入ります。

Tool Runtime は observation を生成します。

```text
テストに失敗しました。失敗ケースは session refresh です。
重要なエラー：expected token to persist, got undefined。
完全なログは artifact://... を参照してください。
```

### 5. Model が observation に基づいて進める

Context policy は完全なログをモデルに詰め込みません。

現在の goal、base commit、失敗要約、関連ファイル断片、利用可能な tool と permission boundary を渡します。

モデルは関連コードの検索を提案します。

検索 tool は read-only です。

結果は event log と observation に入ります。

モデルは特定のファイル修正を提案します。

Edit intent が validate されます。

Patch が workspace に書かれます。

diff は artifact に入ります。

### 6. Durable loop が各境界を記録する

各ステップは、メモリ上の「もうやった」ではありません。

event 内の事実です。

たとえば次のように記録されます。

```text
model.requested
model.responded
intent.validated
policy.allowed
tool.started
tool.finished
artifact.saved
observation.appended
verification.started
verification.finished
```

もし worker が `tool.finished` の後、`observation.appended` の前にクラッシュした場合、次の resume は tool result artifact がすでに存在することを見つけます。

コマンドを盲目的に再実行しません。

artifact から observation を再投影します。

### 7. 承認が必要なら一時停止する

たとえば Agent が `node_modules` を削除して再インストールしたいとします。

policy は、これは高危険度の破壊操作ではないが、リソースを多く消費すると判断します。

automation policy は人間の承認を要求しています。

Harness は次を書き込みます。

```text
approval.requested
notification.sent
job.paused
```

worker は lease を解放します。

ユーザーがあとで承認をクリックします。

システムは次を書き込みます。

```text
approval.granted
job.resumed
```

新しい worker が引き継ぎます。

session を replay します。

workspace base が変わっていないことを確認します。

approval がまだ有効であることを確認します。

そして続行します。

### 8. タスク終了は一言ではない

修正が終わったら、Harness は verification を実行します。

テストが通ります。

最終 diff、テストログ、summary を保存します。

設定が許せば、PR を作るか patch artifact を生成できます。

最後にユーザーへ通知します。

```text
テスト失敗を修正しました。
base: main@abc123
変更ファイル: src/session.ts
検証: npm test passed
artifact: patch / test log / trace
```

同時に次を書き込みます。

```text
task.completed
notification.sent
```

こうしてユーザーが見るのは結果です。

システムが保持するのは追跡可能な事実です。

次回の trace analysis は、チェーン全体のどこに時間がかかったかを把握できます。

次回の evaluation は、この session を再利用できます。

次回の regression は、同種のタスクがまだ安定しているかを確認できます。

## 十三、Hosted Harness の最小インターフェーススケッチ

概念をもう少し具体化するために、小さな interface boundary を描いてみます。

完全性を目指すものではありません。

Hosted Harness がどの責任を混ぜるべきではないかを示すだけです。

```ts
type HostedHarness = {
  schedule(trigger: AutomationTrigger): Promise<JobRef>;
  claim(jobId: string): Promise<JobLease>;
  run(lease: JobLease): Promise<RunResult>;
  resume(sessionId: string): Promise<RunResult>;
};

type HostedRuntime = {
  sessionStore: SessionStore;
  artifactStore: ArtifactStore;
  workspaceManager: WorkspaceManager;
  sandboxPool: SandboxPool;
  vault: SecretVault;
  notifier: NotificationService;
  provider: ModelProvider;
  tools: ToolRuntime;
};
```

`HostedHarness` は lifecycle を担当します。

`HostedRuntime` は外部依存を提供します。

`SessionStore` は事実源です。

`ArtifactStore` は証拠庫です。

`WorkspaceManager` はプロジェクトの現場を準備します。

`SandboxPool` は制御された実行環境を提供します。

`Vault` は secret を管理します。

`Notifier` は時間をまたぐ human-in-the-loop を管理します。

`Provider` と `ToolRuntime` は、前の章で扱った境界のままです。

簡略化した `run` は、次のように書けます。

```ts
async function runHostedJob(job: JobLease, runtime: HostedRuntime) {
  const session = await runtime.sessionStore.loadOrCreate(job.sessionId);
  const replayed = replay(session.events);

  const workspace = await runtime.workspaceManager.ensure({
    projectId: job.projectId,
    baseRef: job.baseRef,
    checkpoint: replayed.state.workspaceCheckpoint,
  });

  const sandbox = await runtime.sandboxPool.allocate({
    workspaceRef: workspace.ref,
    policy: replayed.state.sandboxPolicy,
  });

  return runDurableAgentLoop({
    session,
    replayed,
    workspace,
    sandbox,
    runtime,
    lease: job,
  });
}
```

この擬似コードで最も重要なのは関数名ではありません。

順序です。

まず session を load します。

次に replay します。

それから workspace を ensure します。

その後で sandbox を allocate します。

最後に durable loop に入ります。

逆にしてはいけません。

先に sandbox を開き、先に repo を clone し、先にモデルを呼び、それから session 保存を思い出すようでは、失敗時の復元が難しくなります。

Hosted Harness の性格はこうです。

**先に事実の境界を作り、その後で action を進める。**

## 十四、よくある悪い兆候：これが見えたら、まだ Hosted Harness ではない

1 つ目の悪い兆候は、cron が直接 Agent を呼ぶことです。

schedule trigger に job identity、idempotency key、event log がなければ、それは定時スクリプトにすぎません。

2 つ目の悪い兆候は、worker メモリがタスクの事実を保持していることです。

worker は cache してもかまいません。

しかし唯一の事実源になってはいけません。

3 つ目の悪い兆候は、sandbox ディレクトリが session になっていることです。

sandbox は破棄されます。

session まで一緒に破棄されてはいけません。

4 つ目の悪い兆候は、secret が prompt や普通の env に直接入ることです。

モデル、stdout、artifact、notification のどれか 1 つでも secret の生値を見られるなら、境界は破れています。

5 つ目の悪い兆候は、retry が直接最初から走ることです。

これは副作用を重複させます。

同じ履歴点でモデルが異なる分岐を生むことにもなります。

6 つ目の悪い兆候は、notification が event log に入らないことです。

ユーザーが何を、いつ、どの action に基づいて承認したかは、すべて監査可能でなければなりません。

7 つ目の悪い兆候は、artifact が worker のディスクにしかないことです。

リモートタスク終了後も、証拠は trace、eval、ユーザーレポート、resume に使える必要があります。

8 つ目の悪い兆候は、Hosted Harness に明確な tenant boundary がないことです。

複数ユーザー、複数プロジェクト、複数 secret、複数 workspace が混ざると、誤りのコストは非常に高くなります。

9 つ目の悪い兆候は、deployment を最後の手順として扱うことです。

プロダクション化は、Agent を書き終えてからデプロイすることではありません。

Agent Harness を設計する時点で、それが時間、プロセス、環境をまたいで動くことを認めることです。

## 十五、この記事はこれまでの道筋をどう締めくくるか

この連載の流れを振り返ると、Hosted Harness は突然現れたものではありません。

前に扱ったすべての問題が合流したものです。

第 4 篇ではこう述べました。

```text
Harness はモデル外部の制御システムである。
```

この記事では、その制御システムをリモートデプロイ環境に置きました。

第 10 篇ではこう述べました。

```text
モデルが提案し、システムが実行する。
```

この記事では、システムによる実行は制御された sandbox 内で行われなければならないとしました。

第 13、14 篇ではこう述べました。

```text
Tool Runtime は intent を observation に変える。
Local Tool Bundle は permission runtime の制約下で動く必要がある。
```

この記事では、tool execution が remote workspace、artifact、secret boundary を備える必要があるとしました。

第 16 篇ではこう述べました。

```text
Session event log は長いタスクの事実源である。
```

この記事では、worker、cron、notification、resume のすべてが session を中心に回る必要があるとしました。

第 18 篇ではこう述べました。

```text
Delegation で分けるのは仕事であって、制御権ではない。
```

この記事では、同じ原則を remote worker に適用しました。

worker は実行を分担しますが、事実と制御権を所有しません。

前のいくつかの記事では、trace analysis、memory governance、scoped retrieval、productized CLI も補ってきました。

しかし Hosted Harness は、ひとつの段階的な締めくくりとして位置づけられます。

```text
Agent は、もはやローカルで 1 回のタスクを完了できるだけではない。
ホストされ、スケジュールされ、復元され、監査され、ガバナンスされる形を持ち始める。
```

これは「Agent を書く」から「Agent Harness を運用する」への転換点でもあります。

## 終わりに：Hosted の核心はクラウドではなく、ホスト可能なライフサイクルである

この記事全体を 3 文に圧縮できます。

第一に、ローカル CLI は仕組みを証明し、Hosted Harness はライフサイクルをホストします。

第二に、Hosted Harness は CLI をサーバーに置くことではなく、automation、session、harness、sandbox、workspace、secret、artifact、notification、deployment を分層することです。

第三に、リモートの長いタスクの信頼性は worker が生き続けることから来るのではなく、事実、証拠、権限、復元点がすべて worker の外側で永続化されていることから来ます。

リモート化は Hosted Harness ではありません。

タスク trigger、事実源、実行環境、証拠、承認、通知、復元が worker の外側で永続化可能になってはじめて、Hosted Harness に入ります。

だから Hosted Harness の覚え方は次のように書けます。

**プロセスは死んでもよい。sandbox は差し替わってもよい。worker は再割り当てされてもよい。session、artifact、permission、workspace identity が残っている限り、Agent タスクは本当には失われていない。**

ここまでで、このルートの前半は「モデルがどう行動するか」から「システムがどう行動をホストするか」へ進みました。

次の段階で任意の Agent framework を見るとき、きれいな API があるかどうかだけを見る必要はありません。

より工学的な問いを投げられるようになります。

```text
その session の事実源はどこにあるのか？
その sandbox 境界はどこにあるのか？
その cron は idempotent か？
その artifact は追跡可能か？
その retry は副作用を理解しているか？
その notification は lifecycle に入っているか？
その deployment は本当に長いタスクを復元可能にしているか？
```

これらに答えられてはじめて、Agent Harness を本当に理解し始めたと言えます。

## 教学 Harness への落とし込み

hosted version は `/api/runs` と SSE の意味から伸ばせます。run には `runId` があり、events は stream として消費でき、session は resume でき、副作用には checkpoint が必要です。本当の hosted Harness は local loop を server で動かすだけではありません。run、workspace、event log、artifact、retry がそれぞれ durable identity を持つ必要があります。

---

GitHub ソース: [00-23-hosted-harness-durable-execution.md](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-23-hosted-harness-durable-execution.md)
