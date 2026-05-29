---
title: "Delegation Runtime：タスクを外へ渡しても、制御権を失わない"
description: "ここまで来ると、小さな CLI Agent はもう会話するだけのモデルの殻ではない。"
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.png'
locale: "ja"
tags:
  - Agent
  - Harness
  - Delegation Runtime
  - Sub-Agent
  - Multi-Agent
  - 技術チュートリアル
aliases:
  - Delegation Runtime
  - Agent タスク委任
  - Sub-Agent 制御権
  - Multi-Agent 委任 Runtime
---

# Delegation Runtime：タスクを外へ渡しても、制御権を失わない

ここまで来ると、小さな CLI Agent はもう会話するだけのモデルの殻ではない。

provider に接続できる。

モデル出力を intent に分解できる。

tool runtime がある。

permission がある。

event log を記録できる。

messages が事実源ではないことを知っている。

session replay は現実世界を再実行することではなく、event で説明可能な state を復元することだと知っている。

ここでユーザーが少し現実的なタスクを出す。

```text
このプロジェクトのテストが失敗しています。原因を見つけて直してください。
ついでに古い API への影響がないかも確認してください。
変更が権限ロジックに関わるなら、安全性チェックも一度お願いします。
```

一つの Agent でも最初から最後までできる。

先にテストを走らせる。

失敗ログを読む。

call chain を検索する。

コードを変更する。

もう一度テストを走らせる。

古い API を見る。

security risk を確認する。

しかしすぐ三つの問題が見える。

第一は Context だ。

テストログ、call chain、古い API、権限ロジック、security checklist、失敗 path、除外 path をすべて main Context に詰め込むと、主 Agent の注意はどんどん散る。

本来は「最小修正は何か」を判断すべきなのに、Context は「さっき検索したファイル」「どのテストログが切り詰められたか」「無関係 module がなぜ根因ではないか」で埋まる。

第二は並行性だ。

古い API 互換性、失敗テストの再現、権限リスクの確認は、必ずしも直列である必要はない。

すべてを主 Agent が自分でやると遅い。

遅いだけならまだよい。

もっと悪いのは、主 Agent が進行速度のために、本来独立して検証すべきことを飛ばしがちになることだ。

第三は制御権だ。

タスクをいくつかの sub-agent に渡すと、一見賢く見える。

```text
一つはテストを調べる。
一つは call chain を調べる。
一つは security を調べる。
一つは修正を担当する。
```

しかし単に「複数のモデルを呼ぶ」だけなら、システムは一つの制御可能な Agent から、複数の制御不能な複製になる。

誰がファイルを変更できるのか？

誰がコマンドを実行できるのか？

誰がネットワークで docs を調べられるのか？

誰がユーザー承認を求められるのか？

誰が最終案を決めるのか？

誰が結果を mainline に merge するのか？

どの子 Agent は失敗後 retry すべきで、どれは諦めるべきか？

二つの子 Agent の結論が衝突したら、どちらを聞くのか？

ある子 Agent が裏で危険なコマンドを実行したら、父 Agent はまだそれを知っているのか？

これが第 18 篇の問題だ。

この記事は「Multi-Agent は格好いい」という話ではない。

「役割演技の専門家たち」をどう設計するかでもない。

答える問いはこれだ。

```text
タスクが大きくなったとき、局所作業をどう外へ渡し、
それでも父 Agent が制御権、責任チェーン、最終判断を保つのか？
```

この層をこう呼ぶ。

```text
Delegation Runtime
```

核心はこうだ。

```text
delegation は Tool call の一種である。
sub-agent は制御された実行体である。
父 Agent が外へ渡すのは局所タスクであって、最終制御権ではない。
```

ここでの「制御権」はもう少し具体的に言う。

```text
父 Agent は final decision を保持する。
父 Agent は write 権限を与えるか、変更を受け入れるかの権限を保持する。
父 Agent は join authority を保持する。
子 Agent は task package が授与した局所探索権だけを持つ。
```

硬く聞こえるかもしれない。

順に分解する。

## 問題の連鎖

本篇の問題の連鎖を固定する。

```text
単一 Agent は小タスクを完了できる
-> タスクが大きくなると、主 Context が探索ノイズで汚染される
-> 一部の局所タスクは自然に並列化または独立検証できる
-> 直接複数モデルを呼ぶと、Tool 境界、権限境界、trace 境界、結果 contract を失う
-> delegation は特殊な tool intent として model 化する必要がある
-> 父 Agent は task package で目標、Context、Tool、権限、予算、出力形式を規定する
-> 子 Agent は制御された実行体であり、構造化 observation と証拠だけを返す
-> 父 Agent が join / review を担当し、最終判断と merge 制御権を保持する
```

## 一、タスクが大きくなると、単一 Agent が最初に失うのは主線である

いつもの例から始める。

ユーザーがプロジェクトルートで入力する。

```text
このプロジェクトのテストが失敗しています。原因を見つけて直してください。
```

最小 Agent Loop はこう動く。

```text
Think
-> run tests
-> observe failure
-> read file
-> search callers
-> edit file
-> run tests again
-> final
```

小タスクではこの流れでよい。

失敗原因が一ファイルにあるなら、主 Agent が全部やれる。

しかし現実のテスト失敗はそうとは限らない。

たとえば失敗ログが指す。

```text
auth/session.test.ts
```

主 Agent が読むと、問題は三方向に関係しそうだと分かる。

```text
session refresh ロジック
legacy login API 互換性
cookie / token の権限境界
```

三つとも調べる必要がある。

しかも調べ方が違う。

`session refresh` は実装定位に近い。

`legacy login API` は互換性監査に近い。

`cookie / token` は security check に近い。

主 Agent が全部自分でやると、主 Context はこうなる。

```text
ユーザー目標
テスト失敗ログ
session.ts コード
login.ts コード
古い API route
frontend call site
test mock
security checklist
大量の検索結果
大量の無関係ファイル
何度かの誤仮説
何度かの Tool 切り詰め
```

表面上はより多くの情報を握っている。

実際には判断空間が汚れている。

毎ターン、モデル呼び出しのたびに、この情報の山から焦点を探し直さなければならない。

Context が長くなるほど、モデルは二つのことをしやすい。

第一に、最初のユーザー目標を忘れる。

第二に、局所発見を全体事実と誤認する。

複雑なタスクでよく起きる現象はこれだ。

```text
Agent は何もしていないわけではない。
局所作業をしすぎて、かえって主線を失った。
```

Multi-Agent の第一の価値は並列性ではない。

ノイズ隔離だ。

子 Agent はある方向に深く検索し、試し、除外できる。

父 Agent はその中間過程をすべて継承する必要はない。

父 Agent が受け取るべきなのは構造化結論だ。

```text
何を調べたか。
何を発見したか。
証拠はどこか。
何を除外したか。
まだ不確かなことは何か。
次に何をすべきか。
```

これは実際のチームに似ている。

同僚に午後の `rg` コマンドと失敗仮説を全部読ませてほしいとは思わない。

聞きたいのはこうだ。

```text
call chain は確認しました。
古い API の入口は二つだけです。
そのうち一つはまだ古い session shape に依存しています。
証拠は routes/legacy-login.ts:42 です。
session refresh を変えるなら、このフィールドを残す必要があります。
```

これが有効な委任だ。

「知能を複製する」ことではない。

「高ノイズの探索を低ノイズの証拠へ圧縮する」ことだ。

問題の連鎖として描くとこうなる。

![Delegation Runtime：タスクを外へ渡しても、制御権を失わない Mermaid 1](assets/00-18-delegation-runtime-control/mermaid-01.png)

図の向きに注目してほしい。

タスクは父 Agent から出る。

結果は父 Agent に戻る。

制御権は父 Agent から移動していない。

これが本文の主線だ。

## 二、sub-agent をモデル複製として扱うのが、Multi-Agent の最初の罠

多くのシステムは sub-agent を初めて実装すると、非常に直接的に書く。

擬似コードはこうだ。

```ts
async function delegate(prompt: string) {
  return provider.chat({
    messages: [
      { role: "system", content: "You are a helpful sub-agent." },
      { role: "user", content: prompt },
    ],
  });
}
```

このコードは動きそうに見える。

父 Agent は prompt を生成する。

```text
legacy login API が影響を受けるか確認してください。
```

そしてシステムがもう一度モデルを呼ぶ。

モデルは分析を返す。

父 Agent は分析を Context に戻す。

demo は順調だ。

だがこれは Delegation Runtime ではない。

ただの nested LLM call だ。

欠けているものがある。

第一に、タスク object がない。

この委任の名前は何か？

どの問題を解くのか？

完了基準は何か？

結果フォーマットは何か？

失敗時に retry、degrade、主 Agent へ戻す、どれを選ぶのか？

第二に、Context policy がない。

子 Agent は空白から始めるのか、父 Context を継承するのか？

どのファイル要約を与えるのか？

どの event log を与えるのか？

どのユーザー制約を与えるのか？

何を与えてはいけないのか？

第三に、Tool 境界がない。

ファイルを読めるのか？

テストを実行できるのか？

ファイルを変更できるのか？

ネットワークに出られるのか？

さらに sub-agent を派生できるのか？

第四に、権限継承がない。

父 Agent がすでに得た権限を子 Agent は自動継承するのか？

父 Agent が plan 段階で read-only 権限しかないなら、子 Agent は書けるのか？

ユーザーが `pnpm test auth` だけを承認した場合、子 Agent は `rm -rf dist` を実行できるのか？

第五に、結果 contract がない。

子 Agent が自然言語の長文を返したとき、父 Agent はどう信頼して merge するのか？

証拠はあるか？

confidence はあるか？

修正提案はあるか？

risk statement はあるか？

「調べたが分からなかった」という正直な結論はあるか？

第六に、trace merge がない。

子 Agent はどのファイルを読んだのか？

どのコマンドを実行したのか？

どんなエラーに遭遇したのか？

その Tool call はどの親タスクに属するのか？

最終 trace で「この結論はどの子タスク由来か」を見られるのか？

第七に、失敗回収がない。

子 Agent が timeout したら？

ユーザーに cancel されたら？

結果フォーマットが不合格なら？

別の子 Agent と衝突したら？

実行途中でプロセスが落ちたら？

これらに答えていないなら、sub-agent は協調に見えるだけだ。

本当に事故が起きると、システムはよりデバッグしにくい状態になる。

だから Delegation Runtime の第一原則はこうだ。

```text
sub-agent を別のモデル呼び出しとして扱わない。
制御された Tool 実行として扱う。
```

つまり `delegate` という動作そのものが Tool Runtime の validate、permission、audit、observation flow に入る。

違いは executor が制御された agent runtime であることだけだ。

この意味は具体的だ。

普通の Tool call には intent がある。

delegation にも intent が必要だ。

普通の Tool call は validate される。

delegation も validate される。

普通の Tool call は permission を通る。

delegation も permission を通る。

普通の Tool call は execute される。

delegation も execute される。

普通の Tool call は observe される。

delegation も observe される。

普通の Tool call は event log に入る。

delegation も event log に入る。

違いはこれだけ。

```text
普通の Tool の実行体は関数、コマンド、MCP server。
delegation の実行体は別の制御された Agent runtime。
```

pipeline 図で見るとこうだ。

![Delegation Runtime：タスクを外へ渡しても、制御権を失わない Mermaid 2](assets/00-18-delegation-runtime-control/mermaid-02.png)

この図が Tool Invocation Pipeline に似ているのは意図的だ。

delegation は Tool system の外の近道ではない。

Tool system 内にある特殊だが制御すべき Tool だ。

## 三、task package：父 Agent が外へ送るのは一文ではない

delegation が Tool call なら、その入力は自然言語一段落だけであってはいけない。

task package が必要だ。

形式主義ではない。

父 Agent、子 Agent、permission system、event log、reviewer が同じことを知るためだ。

```text
この委任は何を完了すべきか、
どの境界内で完了すべきか、
どの形式で戻るべきか、
誰が merge 責任を持つか。
```

最小 task package はこう書ける。

```ts
type DelegationIntent = {
  id: string;
  title: string;
  parentSessionId: string;
  parentTurnId: string;
  role: "explorer" | "worker" | "reviewer" | "tester" | "security";
  objective: string;
  scope: {
    files?: string[];
    directories?: string[];
    symbols?: string[];
    commands?: string[];
  };
  contextPolicy: {
    mode: "clean" | "summary" | "fork";
    includeEvents: string[];
    includeArtifacts: string[];
    excludeSecrets: boolean;
  };
  toolPolicy: {
    allowedTools: string[];
    disallowedTools: string[];
    permissionMode: "readonly" | "default" | "ask";
  };
  outputContract: {
    format: "finding-report" | "patch-proposal" | "test-report";
    requiredFields: string[];
  };
  budgets: {
    maxTurns: number;
    maxToolCalls: number;
    timeoutMs: number;
  };
};
```

これは最終 API ではない。

delegation が答えるべき問いを書き出しているだけだ。

テスト修正の例に戻る。

父 Agent が古い API 互換性を調べたい。

prompt だけならこうなる。

```text
古い API が影響を受けるか調べて。
```

これは緩すぎる。

よりよい task package はこうだ。

```json
{
  "id": "check-legacy-login-compat",
  "title": "旧ログイン API 互換性の確認",
  "role": "explorer",
  "objective": "session refresh 修正が legacy login API を壊すか確認する",
  "scope": {
    "directories": ["src/routes", "src/auth", "tests/auth"],
    "symbols": ["legacyLogin", "createSession", "refreshSession"]
  },
  "contextPolicy": {
    "mode": "summary",
    "includeEvents": ["failed-test-observation", "candidate-root-cause"],
    "includeArtifacts": ["auth-test-log"],
    "excludeSecrets": true
  },
  "toolPolicy": {
    "allowedTools": ["read_file", "search_text"],
    "disallowedTools": ["edit_file", "run_command", "network_fetch"],
    "permissionMode": "readonly"
  },
  "outputContract": {
    "format": "finding-report",
    "requiredFields": [
      "checked_paths",
      "evidence",
      "compatibility_risk",
      "recommendation",
      "unknowns"
    ]
  },
  "budgets": {
    "maxTurns": 6,
    "maxToolCalls": 20,
    "timeoutMs": 180000
  }
}
```

この task package はいくつかのことを明確にする。

子 Agent に「適当に見て」と言っていない。

互換性探索だけをさせる。

write 権限を与えない。

コマンド実行権限も与えない。

結果に証拠を要求する。

Tool call 予算を制限する。

unknowns を残す。

unknowns は重要だ。

多くの子 Agent 出力は完全そうに装う。

しかし父 Agent が本当に知る必要があるのはこれだ。

```text
どの path を調べたか。
どの path は未調査か。
どの結論に証拠があるか。
どれが推測にすぎないか。
```

task package の価値はここにある。

「ちょっと見て」を検証可能な work unit に変える。

子 Agent が `checked_paths` なしで結果を返したら、runtime は出力不合格と判定できる。

子 Agent が `edit_file` を呼ぼうとしたら、permission は直接拒否できる。

子 Agent が `maxToolCalls` を超えたら、runtime は停止できる。

子 Agent が scope 拡大を必要とするなら、勝手に越境するのではなく、父 Agent に返す必要がある。

これが制御権が父 Agent に残っている第一の証拠だ。

```text
子 Agent は task package が規定した境界内でだけ作業できる。
```

## 四、Context 隔離：父 Agent の頭を丸ごとコピーしない

delegation の第二の重要問題は Context だ。

sub-agent を考えると、多くの人はこう問う。

```text
子 Agent は父 Agent の完全 Context を見るべきか？
```

固定の答えはない。

Context 戦略はタスクによる。

大きく三つの mode がある。

第一は clean context。

子 Agent はきれいな Context から始め、task package と少量の必要事実だけを受け取る。

この mode は read-only 探索、独立レビュー、ドキュメント調査に向く。

利点はノイズが少ないこと。

父 Agent の誤仮説を継承しない。

欠点は調査を重複しやすいこと。

第二は summary context。

父 Agent は現在 session を子タスク向けの要約に折り畳む。

子 Agent は完全 transcript を見ず、関連事実、除外済み path、重要ファイル、現在仮説だけを見る。

この mode は多くのエンジニアリング委任に向く。

重複コストを clean より抑えられる。

完全 fork より控えめだ。

第三は fork context。

子 Agent は父 session の現在 Context prefix を継承し、自分の task instruction を追加する。

この mode は複数方向の並列検証に向く。

たとえば父 Agent が失敗テスト、関連ファイル、候補根因をすでに理解している。

同時に三つの修正方向を検証したい。

```text
方向 A：session refresh 条件が間違っている。
方向 B：test mock が実際の挙動と合っていない。
方向 C：legacy login API が古い field に依存している。
```

この場合 fork は重複説明を減らせる。

しかし risk も大きい。

父 Agent の偏りを継承するからだ。

父 Agent の候補根因が最初から間違っていれば、三つの fork は全てその前提に沿って探索しかねない。

だから Delegation Runtime は父 Context の完全コピーをデフォルトにすべきではない。

Context 戦略を明示的に選ぶべきだ。

判断はこうできる。

```text
子タスクに独立視点が必要 -> clean
子タスクに現在主線の事実が必要 -> summary
子タスクに完全な作業現場が必要 -> fork
```

CLI Agent では、デフォルトは summary がよりおすすめだ。

Harness の核心取捨にちょうど合うからだ。

```text
必要な事実は十分に与える。
中間ノイズは隔離する。
父 Agent の最終総合権を残す。
```

Context 隔離は第 16 篇の session replay と強く関係する。

事実源が messages なら、父 Agent が子 Agent に clean projection を作るのは難しい。

messages には混ざっている。

```text
ユーザーメッセージ
モデル推論痕跡
Tool 結果
圧縮サマリー
一時仮説
撤回済み判断
```

事実源が event log なら、runtime はより適切な delegated context を投影できる。

```text
関連ユーザー目標
関連 Tool observation
関連 artifact
承認済み plan
現在候補根因
risk boundary
```

つまりこうだ。

```text
Session log は delegation の Context 材料庫。
Delegation Runtime は session log の投影 consumer の一種。
```

図にするとこうなる。

![Delegation Runtime：タスクを外へ渡しても、制御権を失わない Mermaid 3](assets/00-18-delegation-runtime-control/mermaid-03.png)

ここで踏みやすい罠がある。

子 Agent の完全 transcript をデフォルトで父 Agent に戻してはいけない。

父 Agent が必要とするのは observation だ。

すべての中間チャット記録ではない。

子 Agent が 50 ファイルを検索したとしても、父 Agent が 50 ファイル内容を見る必要はない。

必要なのはこれだ。

```text
checked_paths
evidence
excluded_paths
finding
confidence
next_step
```

完全 transcript は trace に保存できる。

しかし main Context は構造化結果と必要証拠だけを受け取るべきだ。

これが Context 隔離の本当の利点だ。

## 五、Tool 継承：子 Agent は父 Agent の全能力を自動で持つべきではない

delegation で最も危険なのは、子 Agent の考え違いではない。

子 Agent が持つべきでない能力を持つことだ。

父 Agent が広めの権限 mode にいて、すでに次をできるとする。

```text
ファイルを読む
コードを検索する
テストを実行する
ファイルを編集する
shell を実行する
MCP にアクセスする
```

そこで security check のために子 Agent を派す。

security check は本来 read-only であるべきだ。

子 Agent が父 Agent の全 Tool を自動継承すると、レビュー中にコードを変更してしまう可能性がある。

二つの境界が壊れる。

第一に、role 境界。

reviewer が worker になってはいけない。

第二に、責任境界。

父 Agent は意見を集めているだけのつもりなのに、子 Agent がすでに workspace を変えている。

だから Delegation Runtime は Tool 継承を明示 policy にする必要がある。

よくある戦略は三つ。

```text
intersection：子 Agent Tool = 父 Tool ∩ role が許す Tool
subset：父 Agent が明示的に Tool subset を与える
isolated：子 Agent は自分の固定 Tool set を使い、父 Tool を継承しない
```

デフォルトで一番安定するのは intersection だ。

二つを同時に満たすからだ。

```text
子 Agent は父 Agent の現在権限を超えられない。
子 Agent は role 定義権限も超えられない。
```

たとえば父 Agent は read、search、test run、edit ができる。

しかし `security-reviewer` role は read と search だけを許す。

実際の Tool set はこうなる。

```text
read_file
search_text
```

父 Agent が plan mode にあり read-only 探索だけなら、

`worker` role が通常は edit 可能でも、現在は edit できない。

父 Agent の phase が副作用を許していないからだ。

このルールは非常に重要だ。

```text
子 Agent の権限上限は、父 Agent の現在 control plane より高くなってはいけない。
```

そうでないと delegation は権限迂回の裏口になる。

父 Agent は plan 段階でファイルを書けない。

そこで worker を派して書かせる。

これは当然あってはならない。

同様に、父 Agent の network access が無効なら、子 Agent が自分の MCP server でこっそりネットワークに出てはいけない。

父 Agent が `pnpm test auth` の実行だけ承認されているなら、子 Agent が `pnpm test -- --runInBand --updateSnapshot` に拡大してはいけない。

Tool 継承では required capability も扱う必要がある。

父 Agent が `test-runner` を派したいとする。

この role には `run_command` が必要だ。

しかし現在 permission mode は readonly。

runtime は黙って degraded し、test-runner に完了を装わせてはいけない。

説明可能な delegation error を返すべきだ。

```text
test-runner を起動できません：
この role は run_command を必要としますが、
現在の父 session 権限は readonly です。
選択肢：
1. explorer に変更し、read-only のテスト設定分析を行う；
2. ユーザーにテスト実行権限を申請する；
3. 実行段階に入ってから test-runner を派す。
```

このエラーは悪いことではない。

システムの制御境界を守っている。

## 六、権限境界：高リスク action は父 Agent へ bubble させる

delegation の権限問題は「どの Tool を与えるか」だけではない。

もっと細かい問題がある。

```text
子 Agent が高リスク action を起動したとき、誰が承認するのか？
```

最も保守的な答えはこうだ。

```text
すべての高リスク action は父 Agent またはユーザーへ bubble しなければならない。
```

子 Agent は要求できる。

自分で承認してはいけない。

たとえば `worker` 子 Agent がテスト修正中に database schema を変更する必要がありそうだと気づく。

元の task package はこうだった。

```text
auth/session.ts の session refresh bug を修正する。
```

schema 変更は明らかに越境だ。

このとき子 Agent は直接実行してはいけない。

permission escalation を返すべきだ。

```json
{
  "type": "permission_escalation",
  "reason": "現在の修正は session テーブル構造の変更を必要とする可能性があります",
  "requested_action": "edit_file: prisma/schema.prisma",
  "risk": "database migration と旧環境互換性に影響する可能性があります",
  "options": [
    "現在 scope を維持し、schema を変えない修正を探す",
    "一時停止して schema 変更についてユーザー確認を求める",
    "父 Agent に再計画させる"
  ]
}
```

父 Agent が受け取って初めて決める。

```text
越境を拒否する。
再委任する。
Plan に入る。
ユーザーに聞く。
```

これは普通の Tool permission と同じ流れだ。

モデルが intent を出す。

システムが intent を検査する。

高リスク action は approve に入る。

実行後 observation を生成する。

delegation は「intent を出す実行者」が子 Agent に変わっただけだ。

権限システムはそのために無効になってはいけない。

状態機械で見ると分かりやすい。

![Delegation Runtime：タスクを外へ渡しても、制御権を失わない Mermaid 4](assets/00-18-delegation-runtime-control/mermaid-04.png)

この図では `NeedsApproval` が重要だ。

子 Agent は独立主権体ではない。

自分の小世界で risk を承認してはいけない。

高リスク action は主 control plane に戻る。

これが「父 Agent が制御権を失わない」第二の証拠だ。

## 七、結果 contract：子 Agent が返すのは作文ではない

委任でよくある失敗は、子 Agent が真面目そうだが使えない自然言語を返すことだ。

たとえばこう。

```text
関連コードを確認しました。全体として大きな問題はなさそうです。
legacy login API は影響を受けないはずです。
session refresh の修正を続けることをおすすめします。
```

証拠がない。

どの path を調べたかない。

「大きな問題はなさそう」の根拠がない。

事実と判断が分かれていない。

父 Agent がこれをそのまま信じると、システムは脆くなる。

だから子 Agent の出力には contract が必要だ。

role ごとに contract は違ってよい。

`explorer` は finding report を返せる。

```ts
type FindingReport = {
  taskId: string;
  status: "completed" | "partial" | "blocked";
  checkedPaths: string[];
  findings: Array<{
    claim: string;
    evidence: Array<{
      file: string;
      line?: number;
      snippet?: string;
    }>;
    confidence: "low" | "medium" | "high";
  }>;
  excludedPaths: Array<{
    path: string;
    reason: string;
  }>;
  risks: string[];
  unknowns: string[];
  recommendation: string;
};
```

`tester` は test report を返せる。

```ts
type TestReport = {
  taskId: string;
  command: string;
  exitCode: number;
  passed: boolean;
  failingTests: string[];
  relevantOutput: string;
  environmentNotes: string[];
};
```

`reviewer` は review findings を返せる。

```ts
type ReviewReport = {
  taskId: string;
  verdict: "pass" | "needs_changes" | "blocked";
  findings: Array<{
    severity: "low" | "medium" | "high";
    title: string;
    file?: string;
    line?: number;
    body: string;
  }>;
  residualRisk: string[];
};
```

これらの構造は、記事を工学っぽく見せるためではない。

join の前提だ。

父 Agent が結果を merge するとき、問うべきなのはこれではない。

```text
子 Agent は何と言ったか？
```

こうだ。

```text
status は何か？
何を調べたか？
証拠はどこか？
結論の confidence はどれくらいか？
unknowns はあるか？
越境要求はあるか？
提案は他の結果と衝突していないか？
```

これが result contract の意味だ。

父 Agent が blind trust ではなく review できるようにする。

## 八、Join / Review：父 Agent は証拠を merge するのであって、投票するのではない

Multi-Agent は「いくつかの Agent が投票する」と誤解されやすい。

たとえば三つの子 Agent が返る。

```text
テスト Agent：修正は有効。
互換性 Agent：古い API に問題なし。
security Agent：明確な risk なし。
```

父 Agent がこうまとめる。

```text
三者とも同意したので、タスク完了。
```

これは危険だ。

Agent は本当の独立専門家委員会ではない。

同じ誤仮説を共有しているかもしれない。

同じファイルを漏らしているかもしれない。

task package の書き方が悪く、そもそも検査範囲が不完全だったかもしれない。

だから join は投票ではない。

join は証拠 merge だ。

父 Agent が行うべきことはこれだ。

```text
各子結果をユーザー目標へ map する。
証拠が重要 risk を cover しているか確認する。
unknowns が結論に影響するか確認する。
結果同士が衝突していないか確認する。
続行、再委任、ユーザー確認、終了のどれを選ぶか決める。
```

テスト修正例に戻る。

三つの子タスクが返る。

```text
test-runner:
  auth tests passed
  full suite not run

legacy-api-explorer:
  checked src/routes/legacy-login.ts and tests/legacy-login.test.ts
  found one old field dependency
  recommends preserving session.legacyId

security-reviewer:
  checked token refresh and cookie flags
  unknown: did not inspect production proxy config
```

父 Agent は単に完了と言えない。

判断すべきことはこうだ。

```text
局所 auth テストは通った。
古い API に互換性制約が一つあり、修正では legacyId を削除できない。
security review では直接 risk は見つからないが、production proxy config は未確認。
次の action は：
1. legacyId を保持する；
2. legacy login テストを実行する；
3. final で proxy config 未確認を宣言する、または deployment config を確認する read-only タスクをさらに派す。
```

join の結果は、追加委任かもしれない。

修正を狭めることかもしれない。

ユーザーへの質問かもしれない。

現在証拠で十分と判断することかもしれない。

このステップは父 Agent が行う必要がある。

父 Agent は完全なユーザー目標、現在 plan、権限 Context、最終出力責任を持っているからだ。

これが Delegation Runtime と handoff の違いだ。

`delegation` はこうだ。

```text
父 Agent が子 Agent を呼び、局所タスクを完了させる。
子 Agent が結果を返す。
父 Agent が主線の責任を続ける。
```

`handoff` はこうだ。

```text
現在タスクの主体が変わる。
制御権が別 Agent に渡る。
以後の複数ターンをその Agent が担当する。
```

本篇で扱うのは delegation だ。

handoff ではない。

ユーザーが最初にテスト修正を頼み、途中で会社全体の SSO 設計が必要になったなら、それは handoff かもしれない。

しかし古い API 確認、テスト実行、security review は delegation に向く。

主線は依然としてこれだからだ。

```text
現在プロジェクトのテスト失敗を修正する。
```

## 九、Trace merge：子 Agent の痕跡は父タスクへ戻らなければならない

第 16 篇で、長時間タスクの事実源は event log であるべきだと述べた。

Delegation Runtime も event log に書く必要がある。

そうしないと Multi-Agent が出た瞬間、trace が割れる。

父 Agent の trace にはこうしか見えない。

```text
delegated to security-reviewer
security-reviewer says OK
```

これでは足りない。

本当の trace は少なくとも次に答えられるべきだ。

```text
父 Agent はなぜこのタスクを派したか？
task package は何だったか？
子 Agent はどんな Context projection を受け取ったか？
どの Tool を使ったか？
どの Tool が拒否されたか？
どんな構造化結果を返したか？
父 Agent はどう join したか？
最終判断はどの子結果を引用したか？
```

event log にはこういう event がありうる。

```ts
type DelegationEvent =
  | { type: "delegation.proposed"; intent: DelegationIntent }
  | { type: "delegation.validated"; taskId: string }
  | { type: "delegation.started"; taskId: string; agentId: string }
  | { type: "delegation.tool_event"; taskId: string; eventId: string }
  | { type: "delegation.permission_escalated"; taskId: string; request: unknown }
  | { type: "delegation.completed"; taskId: string; result: unknown }
  | { type: "delegation.failed"; taskId: string; error: unknown }
  | { type: "delegation.joined"; taskId: string; decision: unknown };
```

`delegation.tool_event` に注目してほしい。

子 Agent の Tool event は失われてはいけない。

ただしすべてを父 Agent messages に汚染させてもいけない。

trace に入り、observation projection を通じて父 Context に入るべきだ。

trace と context の分担はこうだ。

```text
trace は完全で監査可能な事実を保存する。
context は現在判断に必要な事実だけを投影する。
```

後で問題が起き、ユーザーがこう聞いたとする。

```text
なぜ古い API は影響を受けないと言ったのですか？
```

システムは trace に戻って見られるべきだ。

```text
legacy-api-explorer はどのファイルを調べたか。
証拠は何か。
unknowns はあったか。
父 Agent は join 時に unknowns を無視したか。
```

答えがこうなら、

```text
子 Agent は task package の scope 漏れにより、ある path を調べていなかった。
```

これは task package 設計問題だ。

答えがこうなら、

```text
子 Agent は risk を見つけたが、父 Agent が join で採用しなかった。
```

これは join/review 問題だ。

答えがこうなら、

```text
子 Agent が越権要求を出し、permission が誤って承認した。
```

これは権限治理問題だ。

trace merge がなければ、すべてがこうなる。

```text
モデル判断が間違った。
```

粗すぎる。

Harness の目標は失敗を帰因可能にすることだ。

Delegation Runtime もこの規律を引き継ぐ必要がある。

## 十、失敗回収：子 Agent の失敗は主タスクの失敗ではない

現実の委任では、子 Agent はよく失敗する。

timeout する。

予算上限に達する。

出力フォーマットが不合格になる。

権限拒否に遭う。

証拠を見つけられない。

別の子 Agent と結論が衝突する。

裏で実行途中に cancel される。

これらの失敗で主タスクがそのまま壊れるべきではない。

Delegation Runtime は失敗を分類する必要がある。

代表的には五種類ある。

第一は validation failure。

task package が不正。

role が存在しない、scope が空、output contract が field を欠く、など。

これは起動前に止めるべきだ。

第二は capability failure。

role が必要とする Tool が現在使えない。

たとえば test-runner は run_command が必要だが、現在 readonly。

これは父 Agent に戻し、改派、権限申請、延期を選ばせる。

第三は runtime failure。

子 Agent 実行中に timeout、crash、model error が起きる。

retry してもよいし、partial result に degrade してもよい。

第四は contract failure。

子 Agent が自然言語を返したが output contract を満たしていない。

出力修正を求めてもよいし、transcript を父 Agent に渡して保守的に処理してもよい。

第五は semantic conflict。

複数の子結果が衝突する。

legacy-api-explorer は古い API に問題なしと言い、reviewer は互換性 risk があると言う。

これは技術エラーではない。

父 Agent が証拠を再検討し、必要なら仲裁的タスクを派す必要がある。

失敗回収の要点はこれだ。

```text
主タスク状態は、子タスク状態の単純な足し算ではない。
```

一つの子タスクが失敗しても、主タスクは続けられる。

一つの子タスクが成功しても、主タスクが完了とは限らない。

父 Agent は失敗タイプに応じて action を選ぶ。

decision path で表すとこうなる。

![Delegation Runtime：タスクを外へ渡しても、制御権を失わない Mermaid 5](assets/00-18-delegation-runtime-control/mermaid-05.png)

ここで重要なのは `父 Agent Join` だ。

子タスクが成功しても失敗しても、父 Agent の main loop に戻る。

次を決めるのは父 Agent。

子 Agent が主タスクの運命を自分で決めるのではない。

## 十一、最小実装：delegation を特殊 Tool にする

ここまでの仕組みを最小実装に圧縮する。

完全な Multi-Agent platform は作らない。

team、mailbox、remote agent、A2A も作らない。

最小 Delegation Runtime だけを作る。

```text
父 Agent は delegate_task を呼べる。
delegate_task は構造化 task package を受け取る。
runtime は task package と権限を検証する。
runtime は隔離された子 Context を作る。
子 Agent は制限された Tool set で実行する。
結果は contract に従って返る。
父 Agent が review して loop を続ける。
すべての event は session log に入る。
```

Tool 定義はこうなる。

```ts
const delegateTaskTool = defineTool({
  name: "delegate_task",
  description: "Run a bounded sub-agent task and return a structured result.",
  inputSchema: DelegationIntentSchema,
  async execute(intent, runtime) {
    const validated = validateDelegationIntent(intent, runtime.state);
    const permission = await checkDelegationPermission(validated, runtime.permission);

    if (!permission.allowed) {
      return delegationObservation({
        status: "rejected",
        reason: permission.reason,
        suggestedActions: permission.suggestedActions,
      });
    }

    const childContext = buildChildContext({
      parentLog: runtime.eventLog,
      policy: validated.contextPolicy,
      intent: validated,
    });

    const childTools = resolveChildTools({
      parentTools: runtime.tools,
      role: validated.role,
      toolPolicy: validated.toolPolicy,
      permissionMode: permission.childPermissionMode,
    });

    const childRun = await runtime.subAgentRunner.run({
      intent: validated,
      context: childContext,
      tools: childTools,
      outputContract: validated.outputContract,
      budgets: validated.budgets,
    });

    return normalizeDelegationResult(childRun, validated.outputContract);
  },
});
```

この擬似コードには重要点がある。

`validateDelegationIntent` は起動前に誤りを止める。

子 Agent が動いてから task package に scope がないと気づくべきではない。

`checkDelegationPermission` は delegation を権限システムに入れる。

これは普通の内部呼び出しではない。

新しいモデルを起動し、ファイルを読み、Tool を実行する可能性があるので、承認が必要だ。

`buildChildContext` は event log から Context を投影する。

messages を直接コピーしない。

`resolveChildTools` は Tool 継承と role trimming を行う。

子 Agent が受け取るのは制限された Tool set だ。

`subAgentRunner.run` は制御された実行体だ。

budgets、abort、trace、lifecycle が必要だ。

`normalizeDelegationResult` は結果を observation にする。

父 Agent が見るのは構造化結果であり、未処理 transcript ではない。

この構造を Agent Loop に戻すと、流れはだいたいこうなる。

```ts
while (!state.done) {
  const modelEvent = await provider.next(projectContext(state));

  if (modelEvent.type === "delegate_intent") {
    const observation = await toolRuntime.execute({
      toolName: "delegate_task",
      input: modelEvent.intent,
    });

    state = appendObservation(state, observation);
    continue;
  }

  if (modelEvent.type === "tool_intent") {
    const observation = await toolRuntime.execute(modelEvent.intent);
    state = appendObservation(state, observation);
    continue;
  }

  if (modelEvent.type === "final") {
    state.done = true;
  }
}
```

見えてきただろうか。

`delegate_intent` と `tool_intent` は loop 内で非常によく似ている。

これが本篇で繰り返し強調していることだ。

```text
delegation は Tool call の一種である。
```

## 十二、完全なテスト修正チェーン：父 Agent が仕事を渡しつつ制御を保つ方法

最後に完全な例でつなぐ。

ユーザー入力：

```text
このプロジェクトのテストが失敗しています。原因を見つけて直してください。
ついでに古い API と権限ロジックを壊さないことも確認してください。
```

父 Agent は第一ターンで急いで worker を派さない。

まず最小テストを実行する。

```text
pnpm test auth
```

Observation は示す。

```text
auth/session.test.ts fails:
expected refresh token to keep legacy session id
received undefined
```

父 Agent は `src/auth/session.ts` を読み、候補根因を形成する。

```text
最近の session refresh が session object を再構築しているが、
legacyId を保持していない。
```

このまま自分で調べてもよい。

しかしタスクは三方向に分かれた。

```text
legacy API が legacyId に依存しているか確認する。
最小修正でどの field を保持すべきか確認する。
権限と token の security boundary が影響を受けるか確認する。
```

父 Agent は三つの delegation intent を出す。

一つ目。

```text
legacy-api-explorer
src/routes と tests/auth を read-only 検索
checked_paths、evidence、compatibility_risk を出力
```

二つ目。

```text
patch-planner
session refresh の最小修正点を read-only で分析
patch proposal を出力し、直接変更しない
```

三つ目。

```text
security-reviewer
cookie flags、token reuse、permission boundary を read-only で確認
review findings と unknowns を出力
```

runtime は三つを検証する。

```text
現在 phase は delegation を許すか。
各 role の Tool set は父権限内か。
Context projection は secret を除外しているか。
```

三つの子 Agent が実行される。

父 Agent は切り離されて待つわけではない。

task id を知っている。

```text
task-legacy-api
task-patch-plan
task-security-review
```

状態も見られる。

```text
running
completed
blocked
```

結果が戻ると、父 Agent は join する。

legacy-api-explorer が返す。

```text
legacy login はまだ session.legacyId を読む。
証拠：src/routes/legacy-login.ts
推奨：refreshSession は legacyId を保持する。
```

patch-planner が返す。

```text
最小変更は rebuildSession で preservedFields を spread すること。
createSession を書き換えない。
```

security-reviewer が返す。

```text
token reuse の新しい risk は見つからない。
unknown：production proxy cookie rewrite は未確認。
```

父 Agent は merge して実行判断をする。

```text
refreshSession を変更し、legacyId を保持する。
schema は変えない。
token 生成ロジックは変えない。
変更後に auth と legacy-login テストを実行する。
final で proxy rewrite は今回の確認範囲外と明記する。
```

続いて父 Agent 自身が edit intent を出す。

Tool Runtime が validate、permission、execute、observe を行う。

テストが通ったら、父 Agent はさらに reviewer を派せる。

```text
diff が session refresh だけに触れているか、
legacyId 保持目標に合っているか review する。
```

reviewer は diff を read-only で見る。

pass または findings を返す。

父 Agent の final はこうなる。

```text
何を修正したか。
なぜその変更にしたか。
どのテストが通ったか。
どの risk を確認したか。
どの範囲は未確認か。
```

この流れで、子 Agent は多くのことをした。

しかし制御権はずっと父 Agent にある。

父 Agent が何を派すか決めた。

父 Agent がどれだけ Context を与えるか決めた。

父 Agent がどの Tool を与えるか決めた。

父 Agent が結果を review した。

父 Agent が証拠を merge した。

父 Agent が最終修正を実行した。

父 Agent がユーザーに責任を持つ。

これが Delegation Runtime の完全な手触りだ。

## 十三、よくある悪い匂い：出たら制御権が漏れている

Delegation Runtime を書くとき、明確な悪い匂いがある。

第一は、子 Agent が自由に Tool を選べること。

task package が「security risk を確認」と言っただけで、子 Agent が edit するか、shell を走らせるか、ネットワークに出るかを自分で決めるなら、それは委任ではない。

権限を渡している。

第二は、子 Agent transcript を直接 main Context に詰めること。

透明に見えるが、主線を汚染する。

完全 transcript は trace に入れる。

main Context が受け取るべきなのは構造化 observation だ。

第三は、父 Agent が join せず、子 Agent の結論をそのまま転述すること。

父 Agent が message relay になる。

本当の父 Agent は証拠を review し、衝突を扱い、次を決める。

第四は、子 Agent が無限にさらに子 Agent を派せること。

recursive delegation は depth、budget、permission inheritance がないとすぐ制御不能になる。

デフォルトでは子 Agent の再派生は禁止するべきだ。

許す場合も明確な depth limit と parent approval が必要だ。

第五は、すべての子 Agent が worker であること。

explorer、reviewer、tester、security が全員 file write できるなら、名前が違うだけの全権限複製だ。

role が Tool 境界に落ちていなければ意味がない。

第六は、失敗が成功に包まれること。

子 Agent が証拠を見つけられず、「問題は見つかりませんでした」と書く。

危険だ。

見つからなかったことは、存在しないことではない。

output contract は次を許す必要がある。

```text
partial
blocked
unknown
out_of_scope
```

第七は、trace merge がないこと。

問題が起きた後に「ある子 Agent がそう言った」しか見えない。

これは delegation が本当に Harness に入っていない証拠だ。

単なる UI 機能になっている。

## 十四、境界：delegation しないほうがよい時

Delegation Runtime は有用だ。

だがすべてのタスクを分けるべきではない。

とても小さなタスクは分けない。

一つのテスト失敗の根因が一つの assertion にあるなら、三つの子 Agent を派すのは overhead だ。

高度に結合した書き込みタスクを自由並列にしない。

複数 Agent が同じファイルを同時に変更するようなケースだ。

runtime に強い conflict management がないなら、父 Agent が直列実行するほうがよい。

結果 contract がないタスクは分けない。

子 Agent が何を返すべきか言えないなら、まず派さない。

検証不能な自然言語が返る可能性が高い。

権限境界が曖昧なタスクは分けない。

子 Agent が書けるのか、実行できるのか、ネットワークに出られるのか分からないなら、まず role と Tool 境界を定義する。

ユーザー意図を継続的に引き継ぐ必要があるタスクも、delegation とは限らない。

handoff かもしれない。

たとえばユーザーが「テスト修正」から「会社統一 SSO 接続案を設計して」に切り替えた場合だ。

これはタスク主体が変わったと認めるほうがよい。

現在のテスト修正の子問題だと装い続けるべきではない。

Delegation Runtime の境界は一文にできる。

```text
タスクが現在目標に属し続け、局所探索・検証・レビューを隔離して完了できるなら delegation を使う。
タスク主体が変わり、別 Agent が継続責任を持つ必要があるなら handoff を検討する。
```

## 十五、前後の章との関係

第 16 篇は Session Replay を扱った。

解いたのは次だ。

```text
長時間タスクの事実源はどこか？
失敗後にどう復旧するか？
messages はなぜ投影にすぎないのか？
```

Delegation Runtime は直接それに依存する。

子タスク、子 Context、子 trace、子結果はすべて event log に戻る必要があるからだ。

event log がなければ、delegation は復旧も帰因も難しい。

第 17 篇で扱った Capability Discovery / Skills / MCP は、次を解いた。

```text
システムにはどんな能力があるか？
どの能力が skill 由来か？
どの能力が MCP 由来か？
これらの能力をどう発見、宣言、制約するか？
```

Delegation Runtime はこれらの capability を消費する。

子 Agent の role と Tool 境界は、最終的に capability registry に落ちるからだ。

`security-reviewer` が特定の MCP security scanner を使えるかは prompt の推測で決めるべきではない。

能力宣言、権限 policy、task package scope から来るべきだ。

第 18 篇自身が解くのは次だ。

```text
タスクをどう外へ渡すか、
Context をどう隔離するか、
権限をどう継承するか、
結果をどう merge するか、
失敗をどう回収するか。
```

この後、システムはさらに production らしいものを持つ。

たとえば trace analysis。

Multi-Agent が出ると、失敗帰因がより複雑になるからだ。

答えなければならない。

```text
父 Agent がタスク分解を間違えたのか？
子 Agent が証拠を調べ間違えたのか？
権限 policy が広すぎたのか？
join が unknowns を無視したのか？
output contract が緩すぎたのか？
```

memory governance も続く。

子 Agent の発見がすべて長期記憶に入るべきではないからだ。

あるものは今回タスクだけの一時事実だ。

あるものだけが session を跨いで再利用できる project knowledge だ。

Delegation Runtime は終点ではない。

Agent を「単一スレッドで作業する」から「制御された局所作業を組織できる」へ進める始まりだ。

## 十六、最小記憶点

Multi-Agent はより多くのモデルではない。

Multi-Agent はより多くの coordination 問題だ。

Delegation Runtime が解くのは「いくつかの Agent を一緒に話させる方法」ではない。

解くのはこれだ。

```text
局所タスクを制御された実行体に渡しながら、
父 Agent が目標、権限、状態、証拠 merge、最終責任を持ち続ける方法。
```

一文だけ覚えるならこれだ。

```text
delegation は Tool call の一種である；
父 Agent が外へ渡すのは作業であって、制御権ではない。
```

こう理解すると、多くの設計は自然に位置づく。

```text
task package は prompt の飾りではなく、実行 contract である。
Context 隔離は token 節約ではなく、主線を守ること。
Tool 継承はデフォルトコピーではなく、権限 intersection。
result contract はフォーマット潔癖ではなく、join の前提。
trace merge はログ芸ではなく、失敗帰因の基盤。
失敗回収は耐障害性の付加機能ではなく、長時間 Runtime の基本責務。
```

ここまでで小さな CLI Agent はタスクを外へ渡せるようになった。

しかしまだ production 環境に入ったとは言えない。

タスクが分けられ、長くなり、復旧し、review されると、別の問題がますます明確になる。

```text
システムが失敗したとき、事実ログからどの仕組みが壊れたかをどう定位するのか？
```

これが次の記事群へつながる。

```text
Trace Analysis。
```

つまり Harness が動くだけでなく、なぜ間違って動いたかを説明できるようにする。

---

GitHub ソース: [00-18-delegation-runtime-control.md](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-18-delegation-runtime-control.md)
