---
title: 'Claude Code ソースコード解説シリーズ 第8章: ターミナルツール'
description: 'Claude Code がターミナルコマンドを実行し、権限を守りながら結果をループに戻す仕組みを解説します。'
author: LienJack
pubDate: 2026-05-03
heroImage: './assets/05-2-cover-terminal-tool.jpg'
locale: 'ja'
tags:
  - Claude-Code
  - Agent
  - ソースコード解説
  - Tools
  - Bash
  - PowerShell
aliases:
  - Claude Code ターミナルツール
  - Claude Code コマンド実行
---
# 《Claude Code ソースコード解析シリーズ》第8章｜端末ツール

Claude Code のツール一覧を見た多くの人は、`Bash` を非常に地味なツールだと思うだろう。

> モデルにシェルコマンドを1個実行させるだけだろ？

この理解は半分しか合っていない。

Claude Code が単なるチャットボットで終わるなら、ここまで重厚な端末ツールは確かに必要ない——モデルが質問に答えるだけで十分だ。しかし、実際のコードリポジトリに入って作業するとなると話は変わる。コードを修正したらテストを走らせ、プロジェクトの状態を確認するには `git status` を叩き、サービスを立ち上げるには `npm run dev` を実行し、ビルドを検証するには `bun test`、`pytest`、`cargo test` を回す。

これらの操作は「ファイルを読む」「ファイルを書く」ではカバーできない。実行権限をローカル環境に委ねる必要がある。

要するに、端末ツールが解決する核心的な課題はこうだ。

> エージェントは「このコマンドを実行したい」という一言を、スキーマ・権限制御・進捗表示・出力取得・サンドボックス・バックグラウンドタスクのライフサイクルを備えた制御可能な実行ユニットに、どう変換するのか？

この記事を理解しやすくするために、一貫した具体例を置いておこう。

```text
ユーザー: ログイン失敗の問題を修正してほしい。
```

信頼できる Claude Code であれば、高い確率で次のような連鎖をたどる。

```text
Glob / Grep で認証関連ファイルを特定
-> Read でコアロジックを読む
-> Edit でコードを修正
-> Bash でテストを実行して検証
-> Bash で git diff / git status を確認
```

この連鎖の中で、`Bash` は後半に登場することが多い。これは `Read`、`Grep`、`Edit` の代わりではなく、プロジェクト環境そのものにしか答えられないことに使われる。

- このテスト群は本当にパスするのか？
- ビルドスクリプトは最後まで走り切るのか？
- 今の git ワークスペースはどんな状態か？
- ローカルサービスは起動しているのか？
- スクリプトを実行したら実際に何が出力されるのか？

だから端末ツールは「万能の入り口」ではない。エージェントと実マシンをつなぐ、最も危険で、最も価値のある一本の橋なのだ。

![05.2终端工具-命令执行 図 1](./assets/05-2-terminal-tools-mermaid-01.png)

## 1. なぜモデルに自由にシェルを実行させてはいけないのか

最も単純な実装は、もちろんこうだ：

```ts
exec(modelGeneratedCommand)
```

しかし、これはエージェントシステムにおいてほぼ最も危険な設計である。シェルコマンドは狭義の API ではない。`Read` ツールはせいぜいファイルをひとつ読むだけ、`Grep` ツールはテキストを検索するだけ、`Edit` ツールは明示的なファイルパスと置換内容を持つ。ではシェルコマンドは？ できることが多すぎる：

```bash
cat package.json
npm test
rm -rf dist
curl https://example.com/install.sh | bash
git reset --hard
python script.py
```

読み取りだけのものもあれば、ファイルへの書き込み、テストの実行、ネット経由のダウンロード、リモートコードの実行まである。さらに厄介なのは、シェルコマンドは組み合わせられることだ：

```bash
ls && git push
cat file | xargs rm
make test && npm publish
```

前半だけを見て判断すると、システムは容易に迂回される。（権限チェックが最初のコマンドだけを見て通過させ、後ろに `&& rm -rf /` が続けば一巻の終わりだ。）

だから Claude Code は `BashTool` を単なる `exec()` のラッパーとして書くわけにはいかない。まず次の問いに答えなければならない：

```text
入力は合法か？
このコマンドは読み取り専用か、検索か、書き込みの可能性があるか？
現在のパーミッションモードは許可しているか？
allow / ask / deny ルールにヒットするか？
ユーザー確認は必要か？
サンドボックスに入れるべきか？
コマンドの実行が長引いた場合、バックグラウンド化するか？
出力が長すぎる場合の処理は？
実行後、cwd は変わるか？
結果をどのようにモデルのコンテキストに戻すか？
```

これこそが、ソースコード上で `BashTool` が重厚に見える理由だ——本当にラップしているのは一つのコマンドではなく、実行のライフサイクル全体なのである。

## 2. BashTool の入力：コマンドだけでなく、説明・タイムアウト・バックグラウンド実行・sandbox も

`BashTool` のメインエントリポイントは以下にあります。

```text
packages/builtin-tools/src/tools/BashTool/BashTool.tsx
```

`buildTool()` によって正式な Tool として定義されており、単なる寄せ集めの関数ではありません。

モデルから見える入力スキーマの主な構成は次のとおりです。

```ts
{
  command: string
  timeout?: number
  description?: string
  run_in_background?: boolean
  dangerouslyDisableSandbox?: boolean
}
```

各フィールドがいずれも実行上の問題に対応しています。

`command` は実際に実行するコマンドです。説明は不要でしょう。

`description` は人間とモデルの両方に向けた短い説明文です。ソースコード上では、能動態でコマンドが何をするかを記述し、「複雑」「リスク」といった曖昧な表現を避けるよう要求されています。たとえば以下のように書きます。

```text
ls -> List files in current directory
git status -> Show working tree status
npm install -> Install package dependencies
```

これは飾りではありません。ターミナルコマンドは往々にして長く入り組んでおり、UI 上での折りたたみ表示、権限確認のポップアップ、タスクリストのいずれにおいても、人間が一読して理解できる要約が必要になるからです。

`timeout` は最大実行時間を制御します。デフォルト値は `getDefaultTimeoutMs()` から取得され、最大値は `getMaxTimeoutMs()` によって制限されます。モデルが無限待機になるコマンドを渡してセッションを停止させてしまうのを防ぐためです（おわかりでしょう、`while true; do sleep 1; done` のようなもので Agent が一発で死にます）。

`run_in_background` は、このコマンドをそのままバックグラウンドタスクに回せることを示します。dev サーバーの起動、長時間ビルド、ログ監視など、メインループをブロックすべきでない処理に適しています。

`dangerouslyDisableSandbox` は非常にセンシティブな脱出口です。ポリシーが許可している場合に、このコマンドを sandbox に入れないよう明示的に要求するものです。名前にわざわざ `dangerously` と付けているのは、呼び出し側への警告です。これは通常のスイッチではなく、有効にしたら自己責任である、と。

入力スキーマから読み取れることがある。Claude Code における Bash の位置づけは「テキストの実行」ではなく、「管理可能なアクションの実行」である。

## 3. BashTool が読み取り専用と見なされる条件

ターミナルツールで最初に解決すべき問いは次のとおりです。

> どのコマンドを安全な観察操作と見なし、どのコマンドを副作用の可能性がある操作と見なすべきか？

ソースコードには関連する概念が二つあり、混同しやすいため注意が必要です。

- `isSearchOrReadCommand()`：主に UI の折りたたみや表示に使われ、コマンドを検索・読み取り・一覧表示のいずれかに分類する。
- `isReadOnly()`：並列実行の安全性とパーミッション判定に使われ、本当に読み取り専用の制約を満たすコマンドだけを読み取り専用と見なす。

`BashTool.tsx` では、Claude Code はよく使われるコマンドを以下のグループで管理しています。

```text
検索系：find、grep、rg、ag、ack、locate、which、whereis
読み取り系：cat、head、tail、wc、stat、file、strings、jq、awk、cut、sort、uniq、tr
一覧表示系：ls、tree、du
意味的に中立なコマンド：echo、printf、true、false、:
```

たとえば次のようなコマンドは

```bash
rg "login" src
```

検索コマンドとして認識されます。

次のようなコマンドは

```bash
cat package.json | jq '.scripts'
```

読み取り / 分析コマンドとして認識されます。

しかし、次のような場合は

```bash
cat package.json | sh
```

もはや読み取り専用とは見なせません。後半の `sh` は入力を実行してしまうため、`package.json` に悪意のあるスクリプトが仕込まれている可能性も否定できないからです。

ソースコードの判定ロジックは控えめに設計されています。パイプラインや `&&`、`||`、`;` で分割したあと、すべての非中立的なセグメントが検索・読み取り・一覧表示のいずれかに属している場合に限り、コマンド全体を「読み取りまたは検索」として折りたたみ対象にします。未知のコマンドや副作用の可能性があるコマンドが一つでも含まれていれば、通常の Bash コマンドとして扱うようにフォールバックします。

さらに、実際の読み取り専用パーミッションの判定は次のファイルで行われます。

```text
packages/builtin-tools/src/tools/BashTool/readOnlyValidation.ts
```

ここではより詳細な許可リスト（allowlist）がチェックされます。たとえば以下のようなものです。

- `git status`、`git diff` といった git の読み取り専用コマンド
- `rg` の安全なパラメータ
- `fd` の安全なパラメータ
- `docker`、`gh`、`pyright` など外部ツールの読み取り専用サブコマンド
- 出力リダイレクト、パス制約、UNC パスのリスク、`sed` の特殊ケース

Claude Code は「コマンド名のホワイトリスト」のような粗い方法で安全性を判断しているわけではない。引数、リダイレクト、パス、そして組み合わせの構造までさらにチェックする。（つまり、「何をしようとしているか」ではなく、「実際に何が実行されるか」を見ているのだ。）

これは、ドキュメントで一貫して言及されている指針とも符合する。`Read`、`Glob`、`Grep` が使える場面では専用ツールを優先し、Bash はテスト、ビルド、git、サービスの起動といった、本当にシェルが必要な場面に限定すべきだ、という指針である。

## 4. 権限チェック：BashTool は自己判断しない

`BashTool` の権限エントリポイントは非常に短い：

```ts
async checkPermissions(input, context) {
  return bashToolHasPermission(input, context)
}
```

実際に複雑なロジックが存在するのは以下のファイル群だ：

```text
packages/builtin-tools/src/tools/BashTool/bashPermissions.ts
src/utils/permissions/bashClassifier.ts
src/utils/permissions/shellRuleMatching.ts
```

このレイヤーでは、1 行のシェルコマンドを Claude Code の権限システムに投入する：

```text
permission mode
-> deny / ask / allow ルール
-> 読み取り専用コマンドは自動許可
-> Bash 安全分類
-> 複合コマンドの分割
-> ユーザー確認の提案
-> sandbox 関連の自動許可ポリシー
```

興味深い細かい点がある：`preparePermissionMatcher()` は `parseForSecurity(command)` を使ってコマンドを解析する。

複合コマンドの場合：

```bash
ls && git push
```

`ls` だけにマッチさせるわけにはいかない。ソースコードはサブコマンドを分解し、`git push` も権限ルールのマッチング対象に含める。これにより、ユーザーやポリシーが `Bash(git push:*)` のようなルールを設定していれば、複合コマンドの前半部分が安全に見えるからといってチェックをすり抜けることはない。

では、解析に失敗したらどうなるか？

Claude Code の戦略は fail-safe だ。解析できなかったものを安全だと偽ってはならない。matcher により保守的な結果を返させ、セキュリティフックが発動する余地を残す。

この背後にある原則はシンプルだ：

> シェル文字列の解析が難しいほど、自動的に信頼してはいけない。

（この原則は、実はセキュリティレイヤー全体の基調をなすものだ——誤って許可するより、誤って拒否する方を選べ、という考え方である。）

## 5. Bash の安全性：実行前判定は常に半歩手前まで

Claude Code には Bash に対する静的な安全判定が数多く組み込まれている。

たとえば `bashPermissions.ts` では、過度に広範なルール提案を制限し、次のような指定を回避する。

```text
Bash(sh:*)
Bash(bash:*)
Bash(env:*)
Bash(sudo:*)
```

こうしたルールが一度保存されてしまえば、任意のコマンドをラッパー経由で実行するのとほぼ同義になる。率直に言って、`exec()` を直接開放するのと大差ない。

`readOnlyValidation.ts` にも安全面のコメントが随所にある。たとえば `fd` の `--exec` / `--exec-batch` は安全なパラメータとして扱われていない。これらは検索結果に対して任意のコマンドを実行してしまうからだ。`xargs` の一部のパラメータについても、GNU getopt のオプショナル引数のセマンティクスによって、検証器と実際の実行時の振る舞いに食い違いが生じる可能性があるため、特に注意が払われている。

これらの細部から見えてくるのは、Claude Code の Bash 安全性が「危険コマンドのブラックリスト」一辺倒ではないということだ。むしろ、次のような階層的な判定の積み重ねになっている。

```text
コマンドはパース可能か？
サブコマンドは何か？
危険なシェルラッパーが使われていないか？
出力リダイレクトはあるか？
読み取り専用の allowlist に含まれるコマンド・パラメータか？
Git の内部パスに書き込もうとしていないか？
シンボリックリンクを作成しようとしていないか？
ユーザー設定のルールに抵触していないか？
```

しかし、静的判定をどれだけ緻密に積み上げても、シェルには依然として次の本質的な問題がつきまとう。

> コマンドが走り始めてしまえば、スクリプトの実行、子プロセスの起動、動的パスの読み書きなど、実行前の文字列解析では完全に予測しきれない挙動が数多く発生しうる。

これが次のレイヤーである sandbox へとつながっていく。

## 6. Sandbox：権限の代替品ではなく、実行時の境界

`BashTool` が sandbox に入るかどうかは、次の関数が判断する：

```text
packages/builtin-tools/src/tools/BashTool/shouldUseSandbox.ts
```

ロジックは4段階に圧縮できる：

```text
sandbox はグローバルで有効か？
dangerouslyDisableSandbox が明示され、かつポリシーが許可しているか？
input.command は存在するか？
コマンドが excludedCommands に該当するか？
```

すべて通過したら `true` を返す。

これは、Claude Code の sandbox が「このコマンドは危険だから入れる」という発想ではなく、むしろ次のような姿勢であることを示している：

```text
デフォルトで入れる。
明示的に設定された例外だけ入れない。
```

実際の実行時には、sandbox は `src/utils/Shell.ts` の中でコマンド構築に関与する：

```text
provider.buildExecCommand(command)
-> shouldUseSandbox が true
-> SandboxManager.wrapWithSandbox(...)
-> spawn(wrappedCommand)
```

つまり、sandbox はコマンド実行後に監査するのではなく、`spawn` の前にコマンドを別の実行形態へと包み込む。

ここで、特に区別すべき2層のガードレールがある：

```text
権限システム：このコマンドを実行するかどうか？
sandbox：このコマンドが実行されたあと、最大どこまで触れうるのか？
```

権限システムは「認可」、sandbox は「隔離」である。認可で隔離を代替することはできない——実行前の推論には常に死角がある。隔離で認可を代替することもできない——そもそもモデルに実行させるべきでない操作は存在する。（両方必要であり、どちらか一方では成立しない。）

全体の流れはおおむね次のようになる：

![05.2终端工具-命令执行 図 2](./assets/05-2-terminal-tools-mermaid-02.png)

これが、端末ツールと sandbox の章が密接に関係している理由である。`BashTool` は操作の入口であり、sandbox は操作が着地する際の境界なのだ。

## 7. 本当の実行：各コマンドは新しいシェルプロセス

`BashTool.call()` は最終的に `runShellCommand()` へ入り、さらに以下を呼び出します。

```text
src/utils/Shell.ts
```

コア関数は次のとおりです。

```ts
exec(command, abortSignal, 'bash', options)
```

ここではエンジニアリング的にいくつかの処理が行われます。

**第一に、シェルプロバイダの選択。**

Claude Code はまず `CLAUDE_CODE_SHELL` を優先し、次にユーザーの `SHELL` 環境変数、さらに `zsh` / `bash` の順で探します。ただし、サポート対象は bash / zsh のような POSIX シェルだけです。理由は単純で、BashTool のパース、安全性判定、コマンド構築のすべてが POSIX シェルのセマンティクスを前提としているためです。

**第二に、実際に実行するコマンドの構築。**

`provider.buildExecCommand()` が生のコマンドを実行可能な形にラップし、さらにカレントディレクトリ（cwd）を別途記録します。コマンド実行後、Claude Code は一時 cwd ファイルを読み取り、作業ディレクトリが変化したかどうかを判定し、グローバルな cwd 状態を更新します。

これが、Claude Code 内で以下のコマンドを実行したときに、

```bash
cd packages/builtin-tools
```

後続のコマンドが新しいディレクトリに追随する仕組みです。通常の `child_process.spawn` では cwd の変更が親プロセスに自動反映されることはありませんが、Claude Code は追加の cwd 追跡ファイルを通じてこの状態を取り戻しています。（プロセス分離と状態同期の矛盾を解決する、ちょっとした巧妙な小技です。）

**第三に、出力の処理。**

stdout と stderr は `TaskOutput` に流れ込みます。通常、出力はタスク出力ファイルに書き込まれ、プログレスポーリングが毎秒末尾を読み取ります。呼び出し側が `onStdout` を提供している場合は、パイプモードでリアルタイムに stdout を取得することも可能です。

**第四に、環境変数の設定。**

実行時にはいくつかのランタイム環境変数が注入されます。たとえば次のようなものです。

```text
GIT_EDITOR=true
CLAUDECODE=1
SHELL=<現在のシェル>
```

`GIT_EDITOR=true` は非常に重要です。`git commit` のようなコマンドが突然エディタを開き、端末セッションをブロックしてしまうのを防ぎます。（これがないと、モデルが `git commit` を呼び出した際に vim の中で固まってしまい、まったく使い物になりません。）

## 8. 長いコマンドでメインループをブロックしない：進捗表示、バックグラウンドタスク、出力パス

ターミナルツールにはもう一つ現実的な問題がある。

> モデルが `npm install` や `npm run dev`、`pytest` を実行したとき、メインループはどれだけ待てばいいのか？

Claude Code の対処は単純な「待つ」ではない。

`BashTool` にはいくつかの重要な定数がある。

```text
PROGRESS_THRESHOLD_MS = 2000
ASSISTANT_BLOCKING_BUDGET_MS = 15000
```

コマンドが開始されてから 2 秒以内に終了しなければ、UI は進捗表示を始める。`TaskOutput` が毎秒出力ファイルをポーリングし、末尾数行を progress として UI に返す。

さらに時間がかかる場合、たとえば assistant モードで 15 秒を超えると、メインエージェントがそのままブロックされるべきではない。ソースコードでは、バックグラウンド化可能なコマンドをバックグラウンドタスクに変換する。

```text
フォアグラウンド shellCommand が実行中
-> registerForeground
-> ブロック予算超過、またはユーザーが手動でバックグラウンド化
-> backgroundExistingForegroundTask / spawnShellTask
-> backgroundTaskId を返す
-> メインループは継続
```

モデルが受け取る結果には次のように表示される。

```text
Command running in background with ID: ...
Output is being written to: ...
```

ここでエージェントは引き続きファイルを読んだりコードを修正したりでき、後ほどタスク出力機構を通じてバックグラウンドタスクの結果を取得する。

これはターミナルツールと Task ツールの接点でもある。

- `BashTool` は実際のシェルプロセスを起動する。
- `LocalShellTask` は長いコマンドをタスクのライフサイクルに組み込む。
- `TaskOutput` は出力の永続化とポーリングを担う。
- `tool_result` は消費可能なサマリーをモデルに返す。

Claude Code は単に「コマンドを実行できる」のではない。コマンドを管理可能なランタイムオブジェクトとして扱っているのだ。

## 9. 出力が長すぎる場合の対処

ターミナル出力は簡単に爆発します。

例：

```bash
npm test
pytest -vv
cat large.log
```

すべての出力をそのままモデルのコンテキストに詰め込むと、トークンを浪費するだけでなく、本当に有用な情報が埋もれてしまいます。

`BashTool` には何層かの出力ガバナンスが組み込まれています。

**第一**に、ツールレベルで `maxResultSizeChars` が設定されています。ソースコードでは BashTool に `30_000` が指定されており、この閾値を超えると大規模結果向けの処理に分岐します。

**第二**に、進捗更新では直近の出力のみを表示します。`onProgress(lastLines, allLines, totalLines, totalBytes, isIncomplete)` が UI や呼び出し元に対して、現在の総行数・総バイト数・現在の断片が不完全かどうかを通知します。

**第三**に、本当に大きな出力はディスクに永続化され、モデルに返す際には「ここではプレビューのみを提示し、完全な内容は特定のパスにあります」といった形式のメッセージに再構築されます。

対応するロジックは以下にあります：

```text
src/utils/toolResultStorage.ts
packages/builtin-tools/src/tools/BashTool/BashTool.tsx
```

この設計がもたらす極めて重要な効果は次のとおりです：

> モデルは出力が切り捨てられたこと、そして完全な出力がどこにあるかを把握しており、「すべて見た」と誤認することがない。

これは、単純に末尾を切り落とすよりはるかに安全です。（エージェントシステムによっては、長すぎる出力を黙って切り捨ててしまい、モデルはどれだけの情報が失われたかすら知らないままになります。このような暗黙の切り捨て（silent truncation）こそがバグの温床です。）

## 10. PowerShellTool：同じターミナルでも、Bash の焼き直しではない意味論

元のファイルにはたった二行しか書かれていなかった。

```text
- Bash
- PowerShell
```

これが、Claude Code のターミナルツールにおけるもう一つの軸、Windows / PowerShell を示している。

`PowerShellTool` のエントリポイントは次の場所にある。

```text
packages/builtin-tools/src/tools/PowerShellTool/PowerShellTool.tsx
```

`BashTool` とよく似ており、以下のような構成を備えている。

```ts
{
  command: string
  timeout?: number
  description?: string
  run_in_background?: boolean
  dangerouslyDisableSandbox?: boolean
}
```

さらに、次の要素も共通している。

- `isSearchOrReadCommand()`
- `isReadOnly()`
- `checkPermissions()`
- `call()`
- バックグラウンドタスク
- 出力の切り詰め
- サンドボックスのエントリポイント

しかし、PowerShell は Bash の単なる皮を張り替えたものではない。

PowerShell には独自のコマンド意味論がある。

```text
Get-Content
Get-ChildItem
Select-String
Invoke-WebRequest
Invoke-Expression
Start-Process
Remove-Item
```

エイリアスも存在する。

```text
ls -> Get-ChildItem
cat -> Get-Content
rm -> Remove-Item
```

そのため Power​ShellTool には、専用のパーサー、読み取り専用判定、セキュリティルール、権限マッチングが必要になる。

関連するソースコードは以下のとおりである。

```text
packages/builtin-tools/src/tools/PowerShellTool/powershellPermissions.ts
packages/builtin-tools/src/tools/PowerShellTool/powershellSecurity.ts
packages/builtin-tools/src/tools/PowerShellTool/readOnlyValidation.ts
src/utils/powershell/parser.ts
```

例えば `powershellSecurity.ts` では、以下のような項目を特にチェックします。

- `Invoke-Expression` —— PowerShell における eval 相当
- 動的なコマンド名
- `-EncodedCommand` のような意図を隠蔽するパラメータ
- 入れ子での `pwsh` / `powershell` 起動
- ダウンロード後に実行する cradle パターン
- `Start-Process -Verb RunAs` のような権限昇格パス
- COM オブジェクト、モジュールロード、危険なスクリプトブロック

これらはいずれも、Bash のセキュリティモデルでは直接カバーできないものです（PowerShell のアタックサーフェスは Bash とはまったく異なり、単純に置き換えるだけでは防御が成立しません）。

もう一つ、プラットフォーム境界として重要な点があります。ネイティブ Windows 上ではサンドボックスが利用できません。企業ポリシーでサンドボックスが必須とされ、かつ unsandboxed なコマンドが許可されていない場合、`PowerShellTool` は暗黙に回避するのではなく、実行を拒否します。

ソースコード中のメッセージも明確です。

```text
Enterprise policy requires sandboxing, but sandboxing is not available on native Windows.
Shell command execution is blocked on this platform by policy.
```

これは、Claude Code のクロスプラットフォームな端末ツールに対する姿勢が「とりあえず動けばいい」ではないことを示しています。つまり、

> シェルが異なればセマンティクスも異なり、プラットフォームが異なれば利用できるセキュリティ機能も異なる。これらをまったく同一のものとして扱うことはできない。

という考え方です。

## 11. 端末ツールが専用ツールを置き換えるべきでない理由

ここまで読んで、当然湧いてくる疑問があります。

> Bash で何でもできるなら、Read、Glob、Grep、Edit、Write はなぜ必要なのか？

答えは、「できる」ことと「適している」ことは別だからです。

Bash でファイルを読むのはもちろん可能です。

```bash
cat src/auth.ts
```

しかし `Read` ツールは、より多くのガバナンスを提供します。

- これが読み取り専用の操作であることを把握している
- 読み取りサイズとページネーションを制御する
- readFileState を更新する
- 画像などのマルチモーダルファイルに対応する
- Edit に対して「既読済み」のベースラインを確立する
- UI 上でファイル閲覧として表示する

Bash で検索もできます。

```bash
rg "login" src
```

しかし `Grep` / `Glob` は、モデルに対してより構造化され、より制御された検索入口を提供し、権限管理や結果の制限も容易になります。

Bash でファイルを書き込むのももちろん可能です。

```bash
python - <<'PY'
...
PY
```

しかしこれは、`Edit` / `Write` が持つ diff、ファイル履歴、権限、LSP、IDE 表示の連携をすべて迂回してしまいます。（平たく言えば、Bash でファイルを書き込むことは、ファイルガバナンス層をすべて飛ばして、ディスクに直接むき出しで書き込むのと同じです。動きはしますが、問題が起きても追跡のしようがありません。）

つまり、Claude Code のツール選定には、次の暗黙の原則が貫かれています。

```text
狭い操作には専用ツールを優先し、
専用ツールでは表現できないプロジェクト環境の振る舞いだけを端末ツールに委ねる。
```

端末ツールが強力であればあるほど、それを正しい位置に据えることが重要になります。

## 12. Bash / PowerShell をエージェントのメインループに戻す

最後に、ターミナルツールを Claude Code のランタイム全体の中に位置づけてみる。

一回のコマンド実行は、おおよそ以下の流れをたどる。

```text
モデルが tool_use を生成
-> BashTool / PowerShellTool が入力を検証
-> 権限システムが allow / ask / deny を判定
-> 読み取り専用と安全分類で自動許可を試行
-> shouldUseSandbox がサンドボックスに入れるか判断
-> Shell.exec がコマンドを組み立てて spawn
-> TaskOutput が stdout / stderr を収集
-> 長いコマンドはバックグラウンドタスクへ
-> 巨大な出力は永続化して preview を生成
-> tool_result がモデルに戻る
-> モデルが結果をもとに次の手を決める
```

この一連の流れは、なぜターミナルツールがエージェントハーネスの中核層であるかを説明している。

モデル自身は実際にテストを走らせることも、実際にサービスを起動することもできない。モデルが発するのは意図だけだ。その意図を実際にマシン上で実行するのが、Claude Code のツールランタイムである。

BashTool / PowerShellTool の価値は、最もオープンで最も危険な「コマンド実行」という行為を、説明可能・承認可能・隔離可能・観測可能・回復可能なエンジニアリングフローへと分解するところにある。

## 13. 一行で覚える

一行だけ覚えるなら、こう言える。

> Claude Code のターミナルツールは `exec()` のラッパーではない。シェルコマンドを Agent のメインループに接続する実行ランタイムである。手前にはスキーマ、読み取り専用判定、パーミッション機構が配置され、中間層には sandbox と shell provider、後段には進捗表示、バックグラウンドタスク、出力切り捨て、そして tool_result が控えている。

まさにこの理由から、Bash / PowerShell は Claude Code のなかでも最も「本物のエンジニアリングシステム」に近いツールのひとつである。
