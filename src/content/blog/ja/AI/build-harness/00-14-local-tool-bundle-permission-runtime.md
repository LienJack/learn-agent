---
title: "Local Tool Bundle：ファイル、検索、ターミナルと権限ランタイム"
description: "ここまで来ると、多くの人は Agent のローカル能力を、直感的な関数群として書きたくなります。"
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.jpg'
locale: "ja"
tags:
  - Agent
  - Harness
  - Tool Runtime
  - Permission
  - Local Tools
  - 技術チュートリアル
qiita_tags:
  - Agent
  - Harness
  - ToolRuntime
  - Permission
  - LocalTools
aliases:
  - Local Tool Bundle
  - ローカルツールバンドル
  - ファイル検索ターミナル権限ランタイム
---

# Local Tool Bundle：ファイル、検索、ターミナルと権限ランタイム

ここまで来ると、多くの人は Agent のローカル能力を、とても直感的な関数の集合として書きたくなります。

```text
read(path)
write(path, content)
edit(path, old, new)
search(pattern)
bash(command)
```

これは一見とても合理的です。

小さな CLI Agent がテスト失敗を直すなら、当然ファイルを読む必要があります。

当然コードを検索します。

当然ファイルを変更します。

当然テストを実行します。

こうした能力がなければ、それは話せるコード相談役にすぎません。

こうした能力を持ったとき、初めて本当に作業できる開発アシスタントらしくなります。

しかし危険も、まさにここから現れます。

ファイル、検索、ターミナルは、ローカル Agent が最初に必要とする能力です。

同時に、実ファイルを壊し、プライベート情報を漏らし、コマンドを誤実行し、コンテキストを汚染しやすい入口でもあります。

境界のない `read` は、`.env`、SSH key、個人設定をモデルのコンテキストへ読み込んでしまうかもしれません。

基線のない `write` は、ユーザーがたった今手で変更したファイルを上書きするかもしれません。

広すぎる `search` は、リポジトリ内のログ、ビルド成果物、依存ディレクトリをすべてコンテキストに詰め込んでしまうかもしれません。

むき出しの `bash` は、`npm test` から `curl | bash` へ、さらに `git reset --hard` へ滑っていくかもしれません。

だからこの記事で答えたい中心問題は、次の問いではありません。

> Agent にはどんなローカルツールが必要なのか？

そうではなく、次の問いです。

> なぜ Local Tool Bundle は便利関数の集合ではなく、リスク分類、作業ディレクトリ境界、権限ポリシー、出力予算、監査イベントを備えた、制御された能力群でなければならないのか？

シリーズ全体と同じ例を使い続けます。

ユーザーがプロジェクトルートで CLI Agent にこう言います。

```text
帮我看看这个项目为什么测试失败，并把它修好。
```

Agent が本当にこの仕事を最後までやるなら、おそらく次のような動作の鎖をたどります。

```text
搜索测试失败相关文件
-> 读取 package.json、测试文件、源代码
-> 运行测试拿到失败日志
-> 编辑一个源文件
-> 再运行测试
-> 查看 git diff 和 git status
-> 给用户总结修改
```

この鎖は普通の開発フローに見えます。

しかし Agent Harness の中では、単なる普通の開発フローではいけません。

ガバナンス可能なランタイムパイプラインに変わる必要があります。

なぜなら各ステップで、モデルが実プロジェクトに触れる可能性があるからです。

そして各ステップで、実プロジェクトを変更してしまう可能性もあるからです。

## 問題の連鎖

まず、この記事の問題の連鎖を固定します。

```text
本地 Agent 最先需要 read / write / edit / search / bash
-> 这些工具同时也是破坏文件和泄漏信息的入口
-> 不能把它们实现成一组裸函数
-> 每个工具都要声明动作语义、风险等级、工作目录边界和输出预算
-> 模型只提交结构化 intent
-> Tool Runtime 做 schema、语义、路径、权限、预算、审计
-> 不同工具走不同风险策略：读、搜、写、执行不能混在一起
-> observation 回到模型时必须是事实摘要，而不是无限日志
-> Local Tool Bundle 才能成为 Harness 的受控手脚
```

全体図にすると、この記事で扱うのは第 10 篇のツール実行パイプラインにおけるローカル能力層です。

![Local Tool Bundle：ファイル、検索、ターミナルと権限ランタイム Mermaid 1](assets/00-14-local-tool-bundle-permission-runtime/mermaid-01.png)

ここで最も過小評価されやすいのが、中央の `Local Tool Bundle` です。

これはツール一覧ではありません。

ローカル能力が Agent ループへ入るためのプロトコル層です。

プロトコル層は、次のことを知らなければなりません。

```text
这个动作读什么？
这个动作写什么？
它是否会启动子进程？
它是否可能联网？
它是否在当前工作目录内？
它输出多大？
它能不能并发？
它失败后如何变成 observation？
它是否需要人工确认？
它执行前后应该写入哪些审计事件？
```

これらの問いにツール層で答えられなければ、後続の Permission、Audit、Replay、Evaluation はすべて空論になります。

## 一、なぜローカルツールを裸の関数群にしてはいけないのか

まず、最も書きやすいバージョンを見てみます。

```ts
const tools = {
  read: async ({ path }) => fs.readFile(path, "utf8"),
  write: async ({ path, content }) => fs.writeFile(path, content),
  search: async ({ query }) => exec(`rg ${query}`),
  bash: async ({ command }) => exec(command),
}
```

このバージョンの長所は明らかです。

少ない。

速い。

動く。

デモなら、モデルにファイルを読ませ、コードを検索させ、テストを走らせるには十分です。

しかしタスクを実リポジトリに変えると、問題もすぐに現れます。

### 1. 裸の関数には動作の意味がない

`write(path, content)` は新規ファイル作成なのか、既存ファイルの上書きなのか。

`bash(command)` はテスト実行なのか、ディレクトリ削除なのか。

`search(query)` はプロジェクトソース内を探すのか、home ディレクトリ全体を探すのか。

これらは実装詳細ではありません。

ツールを自動許可できるかどうかを決めます。

並列実行できるかどうかを決めます。

diff を表示すべきかどうかを決めます。

監査ログに何を記録するかを決めます。

裸の関数は、システムに「どうやるか」だけを伝えます。

「これは何の動作か」は伝えません。

Agent Harness が必要としているのは関数の山ではなく、意味を持つ動作オブジェクトの集合です。

### 2. 裸の関数には作業ディレクトリ境界がない

ユーザーは Agent に、現在のプロジェクト内のテスト失敗を直してほしいと頼んでいます。

つまり、デフォルトの世界は現在の workspace であるべきです。

しかし `read` が任意のパスを受け取れるなら、モデルは次のようなものを読んでしまう可能性があります。

```text
/Users/me/.ssh/id_rsa
/Users/me/.env
/Users/me/Library/Application Support/...
/private/tmp/...
```

これは必ずしもモデルの悪意ではありません。

エラーログに絶対パスが出ていたので、つい読みに行っただけかもしれません。

しかしシステムにとって、結果は同じように危険です。

だから Local Tool Bundle には、`cwd`、`workspaceRoots`、`allowedRoots`、`deniedPaths` といった境界概念が必要です。

パスは文字列ではありません。

パスは権限オブジェクトです。

### 3. 裸の関数には出力予算がない

モデルがこう尋ねたとします。

```text
读一下 package-lock.json
```

ツールが全文をそのまま返すと、数十万行の依存ロックファイルがコンテキストに入ります。

モデルがこう尋ねたとします。

```text
搜索 error
```

ツールがすべての一致を返すと、ログ、ビルド成果物、依存ディレクトリのノイズが本当の手がかりを埋もれさせます。

モデルが実行します。

```text
npm test
```

出力が長すぎると、失敗箇所が間違った位置で切り捨てられるかもしれません。

ツール出力は、完全であればあるほどよいわけではありません。

出力は予算で制御され、かつモデルに次のことを伝えなければなりません。

```text
你看到的是完整输出，还是 preview？
总共有多少行？
是否被截断？
下一步应该如何继续读取？
```

そうでなければ、モデルは不完全な観察を完全な事実として扱います。

この種の silent truncation は、Agent システムでは非常に致命的です。

### 4. 裸の関数には監査イベントがない

ユーザーがこう聞いたとします。

```text
你刚刚改了哪些文件？
```

裸の関数では、モデルの記憶に頼って答えるしかありません。

ユーザーがこう聞いたとします。

```text
为什么你执行了这个命令？
```

裸の関数には、モデルの元の intent、権限判断、実際のコマンド、終了コード、出力要約が記録されていません。

明日 session replay を作るとしても、裸の関数では、どの動作が再実行でき、どの動作は当時の observation だけを再生すべきか分かりません。

だからローカルツールはイベントを書かなければなりません。

ログをきれいにするためではありません。

Agent の行動を説明し、復元し、評価し、責任追跡できるようにするためです。

## 二、Local Tool Bundle はどんな形であるべきか

Local Tool Bundle には、少なくとも三種類の基礎能力が含まれます。

```text
文件工具：Read / Edit / Write
搜索工具：Glob / Grep
终端工具：Bash
```

システムによっては、さらに次のものを追加します。

```text
List / Tree
Patch
Delete
Move
Open
TaskOutput
```

ここでの `Patch` は、ファイルツールを迂回する近道として理解すべきではありません。

むしろ `Edit` のバッチ形態として見る方が適切です。依然として書き込みツールであり、観察済みのファイル状態に基づく必要があり、diff を生成し、permission、audit、replay に入る必要があります。

ただし、私たちの小さな CLI Agent では、まず `Read / Edit / Write / Glob / Grep / Bash` をはっきり作れれば十分です。

重要なのは数ではありません。

重要なのは、各ツールが統一された contract を持つことです。

ローカルツール定義は、少なくとも次の問いに答えるべきです。

```ts
type LocalToolDefinition = {
  name: string
  description: string
  inputSchema: JsonSchema
  outputSchema?: JsonSchema
  category: "file" | "search" | "terminal"
  risk: "read" | "search" | "write" | "execute"
  isReadOnly: boolean
  isConcurrencySafe: boolean
  requiresWorkspace: boolean
  validateInput(input: unknown, context: ToolContext): Promise<ValidationResult>
  checkPermission(input: unknown, context: ToolContext): Promise<PermissionDecision>
  call(input: unknown, context: ToolContext): Promise<ToolObservation>
}
```

この定義は裸の関数よりずっと重く見えます。

しかし各項目は、後で荷重を受ける重要な点です。

`name` と `description` はモデルに公開するために使います。

`inputSchema` はモデル出力を構造化 intent に収束させるために使います。

`category` と `risk` は権限とスケジューリングに入るために使います。

`isReadOnly` は自動許可できるか、並列実行できるかを決めます。

`requiresWorkspace` はプロジェクトルート内で実行しなければならないかを決めます。

`validateInput` はパス、引数、意味の検証を行います。

`checkPermission` はポリシー判断と人間の確認を行います。

`call` だけが、実際にファイルシステムやターミナルに触れる場所です。

言い換えると、こうです。

```text
函数只是最后一步。
工具定义才是完整能力。
```

Local Tool Bundle は、モデルに万能 shell を持たせるためのものではありません。

むしろ高い意味を持つ動作を Bash から分離し、権限、監査、復元がつかめる足場を作るためのものです。

この層は、次のような分層図として描けます。

![Local Tool Bundle：ファイル、検索、ターミナルと権限ランタイム Mermaid 2](assets/00-14-local-tool-bundle-permission-runtime/mermaid-02.png)

この図では、モデルはファイルシステムに直接触れていません。

モデルが触れているのはツール契約です。

ファイルシステムに触れるのは `Executor` だけです。

そして `Executor` の前には schema、検証、権限、予算があります。

これが第 10 篇の規律をローカルツールに落とし込んだ形です。

```text
模型提议。
系统执行。
工具运行时负责中间所有边界。
```

## 三、リスクは一つのスイッチではなく、動作の意味ごとに層化される

ローカルツールで最も犯しやすい間違いは、権限を一つの総スイッチにしてしまうことです。

```text
allow tools
deny tools
```

これは粗すぎます。

同じツールでも、リスクはまったく異なるからです。

`Glob("**/*.ts")` と `Write("src/auth.ts")` は同じ階層ではありません。

`Read("src/sum.ts")` と `Read(".env")` も同じ階層ではありません。

`Bash("npm test")` と `Bash("rm -rf dist")` はさらに別物です。

Local Tool Bundle は、少なくともリスクをいくつかの層に切る必要があります。

```text
R0: 纯元信息动作，例如查看工具列表、读取会话状态
R1: 项目内只读动作，例如 Glob、Grep、Read 普通源码
R2: 项目内写动作，例如 Edit、Write
R3: 本地执行动作，例如 Bash 运行测试、构建、脚本
R4: 高风险执行动作，例如删除、重置、安装、联网、提权、写配置
R5: 禁止动作，例如读取 secrets、越界路径、危险 shell 包装器
```

実システムではもっと細かくしてもかまいません。

しかし最低でも「読む、探す、書く、実行する、危険な実行、禁止」という分類は必要です。

これは権限を複雑にしたいからではありません。

Agent が毎ステップでユーザーを止めずに済むようにするためです。

すべてのツールで確認が必要なら、Agent は面倒な存在になります。

すべてのツールを自動許可するなら、Agent は危険な存在になります。

リスク分類の目的は、よくある低リスク動作を滑らかに通し、高リスク動作では明確に止まることです。

![Local Tool Bundle：ファイル、検索、ターミナルと権限ランタイム Mermaid 3](assets/00-14-local-tool-bundle-permission-runtime/mermaid-03.png)

ここには混同しやすい点が二つあります。

第一に、リスク等級はツール名だけで決まるものではありません。

`Read` は通常低リスクですが、`.env` を読むなら高リスクです。

`Bash` は通常高リスクですが、`git status` はほぼ読み取り専用と見なせるかもしれません。

`Grep` は通常低リスクですが、検索範囲が境界を越えれば拒否すべきです。

第二に、リスク等級は最終判断ではありません。

リスク等級は入力にすぎません。

最終判断では、さらに次のものを組み合わせます。

```text
当前 permission mode
用户规则
项目规则
命令行参数
workspace 边界
是否启用 sandbox
是否处于自动模式
是否已有会话级临时授权
```

したがって Permission Runtime は単にこうであってはいけません。

```ts
if (tool.risk === "write") ask()
```

本来はこうであるべきです。

```text
静态工具风险
-> 运行时输入风险
-> 路径和命令语义
-> 当前策略
-> 用户确认或拒绝
-> 审计事件
```

だからこそ Local Tool Bundle は Permission Runtime と一緒に設計しなければなりません。

ツールだけ作って権限を作らなければ、ツールは裸で走ります。

権限だけ作ってツールの意味を理解しなければ、権限は目が見えません。

## 四、ファイルツール：Read / Edit / Write は cat / sed / echo ではない

まずファイルツールを見ます。

テスト失敗を直す Agent にとって、ファイルツールは最も基本的な手です。

`package.json` を読みます。

失敗したテストを読みます。

ソースコードを読みます。

一、二行のロジックを変更します。

新しいテストファイルを作るかもしれません。

最も簡単な実装は、モデルに shell を組み立てさせることです。

```bash
cat src/sum.ts
sed -i 's/old/new/g' src/sum.ts
cat <<'EOF' > src/sum.ts
...
EOF
```

しかしこれでは、ファイルツールで最も重要なガバナンスの鎖を迂回してしまいます。

Agent Harness では、ファイルツールは三つの意味に分けるべきです。

```text
Read：建立观察基线
Edit：基于已读基线做局部替换
Write：创建新文件或完整重写
```

この三つの名前は普通に見えます。

しかし背後には、まったく異なる三つのリスクモデルがあります。

### 1. Read の要点は内容を読むことではなく、基線を作ること

`Read` は表面上 `cat` に似ています。

しかし Agent の中では、少なくとも次のことを行う必要があります。

```text
规范化路径
检查 workspace 边界
检查 read deny 规则
识别文件类型
控制文件大小和 token 上限
支持 offset / limit
给模型返回带行号内容
记录 readFileState
写入 audit event
```

ここで最も重要なのは `readFileState` です。

それは次の内容を記録します。

```text
读过哪个文件
读到的内容
读取时的 mtime
读取范围
是否完整读取
```

なぜこれが重要なのでしょうか。

後続の `Edit` と `Write` は、すでに観察したファイルバージョンに基づかなければならないからです。

モデルが `src/sum.ts` を読んでいないのに、いきなりこう言ったとします。

```json
{
  "tool": "Edit",
  "input": {
    "file_path": "src/sum.ts",
    "old_string": "return a - b",
    "new_string": "return a + b"
  }
}
```

システムはそれを信じるべきではありません。

推測かもしれません。

記憶違いかもしれません。

別ファイルの内容をこのファイルの内容だと思い込んでいるかもしれません。

信頼できるファイルツールは、次を要求すべきです。

```text
先 Read，建立基线。
再 Edit，基于基线修改。
```

### 2. Edit の要点は変更できることではなく、精確に変更できること

`Edit` は「42 行目を変える」を受け取るべきではありません。

行番号は脆すぎます。

ファイルがフォーマットされるかもしれません。

ユーザーがたった今一行挿入したかもしれません。

前回の編集で後続の行番号が変わったかもしれません。

より安定した方式は、次の形です。

```json
{
  "file_path": "src/sum.ts",
  "old_string": "export function sum(a: number, b: number) {\n  return a - b\n}\n",
  "new_string": "export function sum(a: number, b: number) {\n  return a + b\n}\n"
}
```

つまり `old_string -> new_string` です。

これはモデルに、次を表現させます。

```text
我具体要替换哪一段当前文件内容。
```

実行前に、ツールは次を確認すべきです。

```text
目标文件是否在 workspace 内
文件是否已经 Read
文件在 Read 后是否被别人修改
old_string 是否存在
old_string 是否唯一
new_string 是否真的不同
写入是否需要权限确认
```

`old_string` が複数回出現するなら、デフォルトでは拒否すべきです。

モデルが明示的に `replace_all` を宣言した場合は別です。

そうでなければ、システムが最初の一致を勝手に置換するのは、ランダムにコードを変えるのと同じです。

### 3. Write の要点は便利さではなく、高リスクであること

`Write` は濫用されやすいツールです。

モデルがファイルを読んだあと、局所変更が面倒だと感じ、ファイル全体を再生成して丸ごと上書きする。

これは楽に見えます。

しかしリスクは高いです。

```text
可能丢掉注释
可能丢掉空白风格
可能改坏 import 顺序
可能覆盖用户中途修改
可能制造巨大 diff
```

したがって `Write` の位置づけは狭くあるべきです。

```text
创建新文件
完整重写确实比局部修改更清晰
用户明确要求生成完整文件
```

対象ファイルが既に存在するなら、それでも先に `Read` が必要です。

それでも readFileState を確認する必要があります。

それでも diff を生成する必要があります。

それでも書き込み権限判断に入る必要があります。

`Write` は近道ではありません。

高リスクのファイルツールです。

### 4. ファイルツールの完全な流れ

ファイルツールを「テスト失敗を直す」タスクに入れると、健全な流れは次のようになります。

![Local Tool Bundle：ファイル、検索、ターミナルと権限ランタイム Mermaid 4](assets/00-14-local-tool-bundle-permission-runtime/mermaid-04.png)

この流れの各ステップは、具体的なリスクに答えています。

パスチェックは境界越えを防ぎます。

読み取り予算はコンテキスト爆発を防ぎます。

readFileState は盲目的な書き込みと汚れた書き込みを防ぎます。

一意な文字列は誤変更を防ぎます。

diff summary は、ユーザーとモデルに実際の変更を知らせます。

監査イベントは、あとで振り返れるようにします。

ファイルツールが `fs.readFile` と `fs.writeFile` だけなら、これらの能力はすべて失われます。

## 五、検索ツール：Glob / Grep は「より速い Read」ではない

検索ツールは、ファイル書き込みより安全に見えます。

少なくともファイルは変更しないからです。

しかし検索ツールも、無制限に開いてよいわけではありません。

検索は Agent が「何を見るか」を決めるからです。

それはモデルの次の判断を形作ります。

悪い検索結果はモデルを誤った方向へ連れていきます。

大きすぎる検索結果はコンテキストを埋め尽くします。

境界を越えた検索は、モデルに入れるべきでない内容を持ち込みます。

したがって検索ツールのリスクはファイル破壊ではなく、次のものです。

```text
泄漏
噪音
上下文污染
搜索范围失控
```

### 1. Glob は「どのファイルにありそうか」を解く

テスト失敗を直すとき、モデルはよく最初にこう尋ねます。

```text
有哪些测试文件？
有哪些 sum 相关文件？
有没有 vitest / jest 配置？
```

このとき `Glob` は `bash ls` や `find` より適しています。

意味が狭いからです。

```json
{
  "pattern": "**/*sum*.ts"
}
```

システムは次を明確に理解できます。

```text
这是按文件名和路径模式找候选文件。
它不读取文件内容。
它应该限制在 workspace 内。
它应该默认忽略 node_modules、dist、.git、coverage。
它应该限制返回数量。
```

`Glob` の observation は候補リストであるべきで、完全な内容ではありません。

候補リストにも予算が必要です。

命中が多すぎるなら、モデルにパターンを絞るよう促すべきです。

数千のパスをすべて返すべきではありません。

### 2. Grep は「どのファイルに手がかりが含まれるか」を解く

`Grep` はファイル内容を読みますが、普通の `Read` ではありません。

出力は一致片であるべきです。

たとえば、次の入力です。

```json
{
  "pattern": "sum\\(",
  "path": "src"
}
```

返す内容は次のようになります。

```text
src/sum.ts:12:export function sum(...)
tests/sum.test.ts:3:import { sum } from "../src/sum"
tests/sum.test.ts:8:expect(sum(1, 2)).toBe(3)
```

これはリポジトリ全体を直接読むより、ずっと安全です。

しかし `Grep` でも制御が必要です。

```text
搜索根目录
包含/排除模式
最大匹配数
每个匹配上下文行数
二进制文件跳过
隐藏目录策略
secrets 路径拒绝
```

そうしなければ、モデルは広すぎるキーワードで大量の無関係な内容を拾ってしまいます。

### 3. 検索ツールの権限で重要なのは範囲と予算

検索は一般に読み取り専用と見なせます。

しかし読み取り専用は無リスクを意味しません。

`Grep("OPENAI_API_KEY", "/Users/me")` は読み取り専用です。

しかし明らかに自動許可すべきではありません。

だから検索権限では二つを見る必要があります。

```text
搜哪里？
搜什么？
```

プロジェクトソースの検索は通常低リスクです。

`.env`、鍵ファイル、全ディスクパス、高感度ディレクトリを検索するなら、拒否または確認すべきです。

普通の業務キーワード検索は通常低リスクです。

しかし `AKIA`、`PRIVATE KEY`、`password=` のような明らかな secret pattern を検索するなら、敏感情報ポリシーを発火させるべきです。

ここに検索ツールとファイルツールの違いがあります。

```text
文件工具的风险重点是单个路径和写入。
搜索工具的风险重点是范围扩散和结果泄漏。
```

### 4. 検索は Read を導くべきで、Read の代わりではない

検索結果が示せるのは「ここが関係ありそう」ということだけです。

ファイルの読み取りを代替することはできません。

`Grep` がこう返したとしても、

```text
src/sum.ts:12:return a - b
```

モデルはこの一行だけを根拠に `Edit` を呼ぶべきではありません。

完全な文脈がないからです。

readFileState も作っていません。

健全な流れは次のようになります。

```text
Grep 找到候选
-> Read 读取具体文件
-> Edit 基于已读基线修改
```

この規律は誤変更の確率を大きく下げます。

![Local Tool Bundle：ファイル、検索、ターミナルと権限ランタイム Mermaid 5](assets/00-14-local-tool-bundle-permission-runtime/mermaid-05.png)

検索ツールは、モデルがより速く「推測」するためのものではありません。

モデルが間違ったものを読む回数を減らすためのものです。

## 六、ターミナルツール：Bash は最も有用で、最も危険なローカル能力

コード Agent にローカルツールを一つだけ渡すなら、多くの人は Bash を選ぶでしょう。

Bash はあまりに強力だからです。

それは次のことができます。

```text
运行测试
构建项目
查看 git 状态
启动 dev server
调用包管理器
运行脚本
读取文件
搜索文本
修改文件
联网下载
删除目录
提交代码
发布包
```

これこそが Bash 最大の問題です。

強力すぎるのです。

`Read` のリスクはパス治理を中心にできます。

`Edit` のリスクはファイル基線治理を中心にできます。

`Grep` のリスクは検索範囲治理を中心にできます。

しかし `Bash` の入力は shell 文字列です。

文字列の中には、パイプ、リダイレクト、変数、サブコマンド、論理演算、スクリプトインタプリタ、環境変数、ダウンロード実行が入り得ます。

だから Bash を「万能ツール」として扱うべきではありません。

小さな実行ランタイムとして扱うべきです。

### 1. Bash の入力は command だけではない

健全な Bash tool input は、次だけであるべきではありません。

```json
{
  "command": "npm test"
}
```

次のものも含むべきです。

```json
{
  "command": "npm test -- --runInBand",
  "description": "Run the test suite",
  "timeoutMs": 120000,
  "runInBackground": false,
  "cwd": "."
}
```

`description` は権限確認、ログ、UI、監査で使います。

`timeoutMs` はコマンドが無限に止まるのを防ぎます。

`runInBackground` は dev server、watcher、長いビルドがメインループを塞がないようにします。

`cwd` はコマンドをどの作業ディレクトリで実行するかを明確にします。

これらのフィールドは飾りではありません。

shell コマンドを文字列から、ガバナンス可能な実行単位に変えるものです。

### 2. Bash 権限は最初の単語だけを見てはいけない

危険なコマンドの多くは、最初の単語からは見えません。

たとえば、次のコマンドです。

```bash
cat package.json | sh
```

最初の単語は `cat` です。

しかし後ろで `sh` を実行しています。

別の例です。

```bash
ls && git reset --hard
```

前半は無害な `ls` です。

後半はワークツリーをリセットします。

さらに別の例です。

```bash
rg deprecated src > report.txt
```

検索に見えます。

しかし出力リダイレクトがあり、ファイルを書きます。

だから Bash 権限では少なくとも次を行う必要があります。

```text
尽量解析 shell 字符串
拆分复合命令
识别管道和重定向
识别脚本解释器
识别危险子命令
识别只读命令和只读参数
解析失败时 fail-safe
```

ここでの解析はリスクヒューリスティックであり、「shell を完全理解する」ことではありません。

複雑な shell 自体がリスク信号です。

ここには一つの下限があります。

```text
shell 字符串越看不懂，越不能自动信任。
```

parser が理解できないなら、安全なふりをするべきではありません。

より保守的な ask または deny に入るべきです。

### 3. Bash の読み取り専用判定は近似にすぎない

いくつかのコマンドは、近似的に読み取り専用と見なせます。

```text
ls
pwd
git status
git diff
rg
cat
head
tail
wc
```

しかしこれは引数と組み合わせ構造を合わせて見なければなりません。

`rg "foo" src` は通常読み取りです。

`rg "foo" src --files-with-matches | xargs rm` は違います。

`git diff` は通常読み取りです。

`git checkout -- file` は書き込みます。

`python -c "print(1)"` は無害に見えます。

しかし `python script.py` は何でもできます。

したがって Bash の読み取り専用判定は、永遠に一部の信号にすぎません。

権限の代わりにはなりません。

sandbox の代わりにもなりません。

### 4. Sandbox は権限の代替ではない

ターミナルツールにとって、権限と sandbox は異なる二層のガードレールです。

権限はこう答えます。

```text
这条命令要不要执行？
```

Sandbox はこう答えます。

```text
这条命令执行以后，最多能碰到什么？
```

この二つは互いに代替できません。

コマンドが明らかに危険なら、

```bash
rm -rf /
```

sandbox が有効だからといって自動許可すべきではありません。

コマンドが正常に見える場合でも、

```bash
npm test
```

権限が許可したからといって、完全に隔離なしで実行すべきでもありません。

テストスクリプトは任意コードを実行できるからです。

一時ファイルを書くかもしれません。

環境変数を読むかもしれません。

ネットワークリクエストを起動するかもしれません。

プロジェクト内の postinstall やカスタムスクリプトを発火させるかもしれません。

したがってターミナルツールの健全な考え方は、次です。

```text
先判断是否应该执行。
再尽量用运行时边界限制它能影响什么。
```

![Local Tool Bundle：ファイル、検索、ターミナルと権限ランタイム Mermaid 6](assets/00-14-local-tool-bundle-permission-runtime/mermaid-06.png)

### 5. Bash 出力は全文ログではなく observation にならなければならない

テスト出力は簡単に長くなります。

ビルド出力も簡単に長くなります。

Bash が stdout と stderr をそのままモデルコンテキストへ詰め込むと、Agent はすぐにログで溺れます。

だから Bash observation は次を含むべきです。

```text
command
cwd
exitCode
duration
stdoutPreview
stderrPreview
truncated
fullOutputPath
summaryHint
```

出力が切り捨てられていないなら、そのことをモデルに伝えます。

出力が切り捨てられたなら、モデルに次を伝えます。

```text
这里只是 preview。
完整输出保存在哪里。
建议下一步如何读取关键部分。
```

モデルにとって最も怖いのは、自分が知らないことを知らない状態です。

静かに裁断されたエラーログを見たモデルは、その断片を中心に誤った推論をするかもしれません。

出力予算は token 節約のためだけではありません。

observation の真実性を見えるようにするためです。

## 七、ファイル、検索、ターミナル三種類のツールのリスク差

ここで三種類のツールを横に並べて見ます。

どれもローカルツールです。

しかしリスクの形は完全に異なります。

| ツール種別 | 典型動作 | 主なリスク | 中核制御点 |
| --- | --- | --- | --- |
| ファイル読み取り | Read | 境界外読み取り、secrets 漏洩、コンテキスト爆発 | パス境界、deny ルール、サイズ予算、ページング |
| ファイル変更 | Edit / Write | ユーザー変更の上書き、誤った位置の変更、巨大 diff | readFileState、一意一致、書き込み権限、diff |
| 検索 | Glob / Grep | 範囲拡散、結果ノイズ、敏感一致の漏洩 | workspace root、ignore ルール、結果上限、敏感語ポリシー |
| ターミナル | Bash | 任意実行、ネットワーク、削除、長時間プロセス、出力爆発 | shell 解析、権限確認、sandbox、timeout、バックグラウンドタスク、出力永続化 |

この表の要点は次です。

```text
不要用同一种权限逻辑治理所有工具。
```

ファイル読み取りはファイル変更ではありません。

ファイル変更はターミナル実行ではありません。

検索はファイル全文の読み取りではありません。

ターミナルは「より汎用的なファイルツール」ではありません。

すべてを Bash に押し込むと、システムはこれらの意味を失います。

すべてをツール名だけで許可しても、システムはこの差異を失います。

Local Tool Bundle がやるべきことは、こうした差異をツールプロトコルへ符号化することです。

## 八、作業ディレクトリ境界：パスは文字列ではなく権限オブジェクト

ローカルツールランタイムには、明確な workspace 概念が必要です。

少なくとも次を含みます。

```ts
type WorkspaceScope = {
  cwd: string
  roots: string[]
  allowedPaths: string[]
  deniedPaths: string[]
  ignoreGlobs: string[]
}
```

パスはツールに入る前に、そのまま使ってはいけません。

先に次を行います。

```text
展开 ~ 和相对路径
规范化路径
解析 symlink 策略
检查是否在 allowed root 内
检查是否命中 denied path
检查是否是特殊文件或设备文件
检查是否是 secrets 或配置敏感路径
```

多くの安全事故はパス処理の中に隠れています。

たとえば、次のようなものです。

```text
../../.ssh/id_rsa
src/../.env
symlink 指向 workspace 外
绝对路径指向用户 home
网络路径触发凭据泄漏
```

普通の `fs.readFile` は、これらの問いに答えてくれません。

Local Tool Runtime が答えなければなりません。

私たちの CLI Agent なら、デフォルトポリシーは単純でかまいません。

```text
只允许当前项目根目录内的读写搜索。
默认忽略 .git、node_modules、dist、coverage。
读取明显 secrets 路径时 deny。
写入配置、锁文件、隐藏目录时 ask。
访问 workspace 外路径时 deny，除非用户显式授权。
```

完璧ではありません。

しかし「パス文字列を fs に渡す」よりはずっと強いです。

## 九、権限はポップアップではなく、決定記録である

多くの人は権限システムをポップアップとして理解します。

モデルが危険な動作を実行しようとするので、ユーザーにこう尋ねるウィンドウを出す。

```text
Allow Bash("npm install")?
```

ポップアップは権限システムの UI 結果の一つにすぎません。

本当の Permission Runtime は、決定オブジェクトを生成すべきです。

```ts
type PermissionDecision =
  | {
      type: "allow"
      reason: string
      source: "policy" | "session" | "user" | "default"
    }
  | {
      type: "ask"
      reason: string
      prompt: string
      suggestedRule?: string
    }
  | {
      type: "deny"
      reason: string
    }
```

このオブジェクトは監査イベントに書き込むべきです。

なぜなら、あとで次を知る必要があるからです。

```text
这次动作为什么被允许？
是默认只读放行？
是项目策略允许？
是用户临时同意？
是用户保存了规则？
还是系统误判？
```

権限システムの産物は「通す」または「通さない」ではありません。

説明可能な決定です。

### 1. ツール可視性と実行承認は二つの門

権限には重要な分層がもう一つあります。

```text
模型能不能看到这个工具？
模型提出这个工具 intent 时，这次 intent 能不能执行？
```

この二つの門は同じではありません。

現在のモードが Bash を禁止しているなら、モデルにはそもそも Bash を見せない方がよいです。

モデルが Bash を見れば、Bash を前提に計画します。

計画が終わってから拒否すると、ターンを浪費し、モデルが回り道に陥りやすくなります。

モデルが `Read` を見ているとしても、すべてのパスを読めるわけではありません。

単回実行では、なおパスとポリシーを確認する必要があります。

したがって権限ランタイムには、少なくとも二層があります。

```text
Tool Visibility Gate：本轮暴露哪些工具
Tool Execution Gate：本次 intent 是否允许执行
```

![Local Tool Bundle：ファイル、検索、ターミナルと権限ランタイム Mermaid 7](assets/00-14-local-tool-bundle-permission-runtime/mermaid-07.png)

これが「権限は最後のポップアップではない」という意味です。

ツールを公開すること自体が権限です。

単回承認は第二層にすぎません。

### 2. deny は allow より重くなければならない

権限ルールで最も危険なのは、複数の来源が互いに上書きする状況です。

たとえば、次のような場合です。

```text
用户全局允许 Bash(npm test)
项目策略拒绝 Bash(npm publish)
会话临时允许 Bash(npm *)
```

allow が deny を気軽に上書きできるなら、安全境界は広いルールで破られます。

したがって保守的な原則は次です。

```text
更具体的 deny 优先于 allow。
策略级 deny 优先于用户临时 allow。
解析失败时不要走 allow。
```

これはユーザーに逆らうためではありません。

広い承認が過大な能力面を開くのを避けるためです。

特に Bash ではそうです。

次のようなルールは非常に危険です。

```text
Bash(*)
Bash(sh:*)
Bash(bash:*)
Bash(curl:*)
```

一見、手間を省くだけに見えます。

実際には権限システムに穴を開けるのと同じです。

## 十、出力予算：Observation はモデルに対して誠実でなければならない

ローカルツールの出力には二種類の読者がいます。

一つはモデルです。

モデルは推論を続けるために十分な事実を必要とします。

もう一つはユーザーです。

ユーザーは Agent が何をしたのか、結果はどうだったのか、リスクはどこにあるのかを知る必要があります。

この二種類の出力は、必ずしも同じではありません。

たとえば `Read` がファイルを読んだ場合です。

モデルは具体的なコード行を見る必要があるかもしれません。

UI では「src/sum.ts を読んだ」と表示すれば十分かもしれません。

たとえば `Bash` がテストを走らせた場合です。

モデルは失敗スタックの重要部分を見る必要があります。

ユーザーはコマンド、終了コード、通ったかどうかを見ればよいかもしれません。

したがって observation は生出力であるべきではありません。

構造化された事実であるべきです。

```ts
type ToolObservation = {
  tool: string
  status: "ok" | "error" | "denied"
  summary: string
  data?: unknown
  preview?: string
  truncated?: boolean
  fullOutputRef?: string
  auditId: string
}
```

各フィールドには意味があります。

`summary` はモデルの素早い理解を助けます。

`data` は構造化情報です。

`preview` は有限のテキストです。

`truncated` はモデルが完全な内容を見たかどうかを伝えます。

`fullOutputRef` は後続で読むための参照です。

`auditId` は observation と監査の鎖をつなぎます。

ツールが失敗した場合も observation に変える必要があります。

例外でメインループを直接壊すべきではありません。

たとえば、次のようなものです。

```text
Edit failed: old_string was found 3 times.
```

これはシステムクラッシュではありません。

モデルが次のターンで修正できる事実です。

もう一度 Read し、より長い old_string を提示できます。

これが Tool Runtime の価値です。失敗も消費可能にしなければなりません。

## 十一、監査イベント：「提案、決定、実際に起きたこと」の差を記録する

監査イベントはログ潔癖ではありません。

Agent システムにおける最も基本的な事実問題を解きます。

```text
模型提议了什么？
系统决定了什么？
实际执行了什么？
结果是什么？
这些东西之间是否一致？
```

一つのローカルツール呼び出しでは、少なくとも三種類のイベントを書けます。

```text
tool_intent.created
permission.decided
tool_execution.completed
```

さらに細かくしてもかまいません。

```text
tool.validation.failed
tool.permission.requested
tool.permission.denied
tool.execution.started
tool.execution.progress
tool.execution.completed
tool.output.truncated
file.diff.created
```

テスト失敗を直すタスクでは、監査の鎖はたとえば次のようになります。

```json
{
  "event": "tool_intent.created",
  "tool": "Edit",
  "input": {
    "file_path": "src/sum.ts",
    "old_string_hash": "sha256:...",
    "new_string_hash": "sha256:..."
  }
}
```

```json
{
  "event": "permission.decided",
  "tool": "Edit",
  "decision": "ask",
  "reason": "write source file in workspace"
}
```

```json
{
  "event": "tool_execution.completed",
  "tool": "Edit",
  "status": "ok",
  "diff_stat": {
    "files": 1,
    "insertions": 1,
    "deletions": 1
  }
}
```

ここで必ずしも完全な `old_string` と `new_string` をすべてのログへ書く必要はありません。

監査にも敏感情報への配慮が必要です。

hash、パス、diff stat、要約を記録できます。

完全な内容が必要な場合は、制御された保存とアクセス戦略を持つべきです。

監査はすべてを dump することではありません。

重要な事実を追跡可能にすることです。

## 十二、同じテスト修正タスクで、Local Tool Bundle はどう働くか

ここで、すべての仕組みをつなげます。

ユーザーはこう言います。

```text
帮我看看这个项目为什么测试失败，并把它修好。
```

健全な Local Tool Bundle は、Agent に次のような流れを歩かせます。

### 1. まず検索し、盲目的に読まない

モデルは次を提案します。

```json
{
  "tool": "Glob",
  "input": {
    "pattern": "**/*test*.ts"
  }
}
```

Tool Runtime は次を行います。

```text
schema 校验
workspace root 限制
ignore node_modules/dist/coverage
结果数量预算
只读自动放行
写 audit
```

返す内容は次のようになります。

```text
找到 tests/sum.test.ts、src/sum.ts 相关路径。
```

### 2. 次に重要ファイルを読み、基線を作る

モデルは次を提案します。

```json
{
  "tool": "Read",
  "input": {
    "file_path": "tests/sum.test.ts"
  }
}
```

Runtime はパス、サイズ、権限を確認します。

読み取り後、`readFileState` に書き込みます。

モデルはさらに `src/sum.ts` を読みます。

ここまで来ると、grep 片だけを根拠に推測しているのではなく、対象ファイルの完全な文脈を持っています。

### 3. テストを実行し、実際の失敗を得る

モデルは次を提案します。

```json
{
  "tool": "Bash",
  "input": {
    "command": "npm test -- --runInBand",
    "description": "Run the test suite"
  }
}
```

Runtime は次を行います。

```text
解析命令
识别 npm test 为项目脚本执行
根据策略 ask 或 allow
设置 timeout
可能进入 sandbox
捕获 stdout/stderr
输出太长则持久化并返回 preview
```

モデルは次を見ます。

```text
测试失败：expected 3, received -1。
```

### 4. ファイル編集は、必ず既読バージョンに基づく

モデルは次を提案します。

```json
{
  "tool": "Edit",
  "input": {
    "file_path": "src/sum.ts",
    "old_string": "return a - b",
    "new_string": "return a + b"
  }
}
```

Runtime はすぐには書きません。

次を確認します。

```text
src/sum.ts 是否在 workspace 内
是否已经 Read
Read 后文件是否改变
old_string 是否唯一
写权限是否需要确认
```

通過して初めて書き込みます。

書き込み後は diff summary を返します。

### 5. もう一度検証し、「変更成功」だけを信じない

モデルは再びテストを実行します。

通ったら、さらに git diff を確認します。

最後にユーザーへまとめます。

```text
失败原因是 sum 函数把加法写成了减法。
我修改了 src/sum.ts 的返回表达式。
测试已通过。
```

この流れの要点は、ツール呼び出し回数ではありません。

各ステップが事実を残していることです。

![Local Tool Bundle：ファイル、検索、ターミナルと権限ランタイム Mermaid 8](assets/00-14-local-tool-bundle-permission-runtime/mermaid-08.png)

これが、制御された能力層としての Local Tool Bundle の姿です。

## 十三、最小実装：まず contract を安定させる

この記事はコード実装の章ではありません。

しかし最小の着地点は書けます。

まず統一 intent を定義します。

```ts
type ToolIntent = {
  id: string
  tool: string
  input: unknown
  createdAt: string
  modelMessageId: string
}
```

次に実行コンテキストを定義します。

```ts
type ToolContext = {
  cwd: string
  workspaceRoots: string[]
  permissionMode: "default" | "acceptEdits" | "plan" | "bypass"
  readFileState: Map<string, ReadFileSnapshot>
  outputBudget: {
    maxChars: number
    maxLines: number
  }
  audit: AuditWriter
}
```

さらに実行パイプラインを定義します。

```ts
async function runLocalTool(intent: ToolIntent, context: ToolContext) {
  const tool = registry.get(intent.tool)

  if (!tool) {
    return observationError(intent, "Unknown tool")
  }

  const validation = await tool.validateInput(intent.input, context)

  if (!validation.ok) {
    await context.audit.write("tool.validation.failed", {
      intentId: intent.id,
      reason: validation.reason,
    })

    return observationError(intent, validation.reason)
  }

  const decision = await tool.checkPermission(validation.input, context)

  await context.audit.write("permission.decided", {
    intentId: intent.id,
    tool: tool.name,
    decision: decision.type,
    reason: decision.reason,
  })

  if (decision.type === "deny") {
    return observationDenied(intent, decision.reason)
  }

  if (decision.type === "ask") {
    return observationNeedsApproval(intent, decision)
  }

  try {
    await context.audit.write("tool.execution.started", {
      intentId: intent.id,
      tool: tool.name,
    })

    const observation = await tool.call(validation.input, context)

    await context.audit.write("tool.execution.completed", {
      intentId: intent.id,
      tool: tool.name,
      status: observation.status,
      truncated: observation.truncated ?? false,
    })

    return observation
  } catch (error) {
    await context.audit.write("tool.execution.failed", {
      intentId: intent.id,
      tool: tool.name,
      message: String(error),
    })

    return observationError(intent, String(error))
  }
}
```

この関数は魔法のようなことをしていません。

第 10 篇の規律を固定しているだけです。

```text
intent
-> validate
-> permission
-> execute
-> observe
-> audit
```

Local Tool Bundle のすべてのツールは、このパイプラインを通ります。

ツールごとの差異は、`validateInput`、`checkPermission`、`call` に置きます。

統一性と差異性は、このように分離されます。

## 十四、よくある悪い匂い

ローカルツールを書くとき、よくある悪い匂いがいくつかあります。

### 1. Bash にすべてのツールを代替させる

最も典型的なのは、次の形です。

```text
读文件用 cat
搜索用 rg
编辑用 sed
写文件用 echo >
```

これはファイル基線、diff、読み書き権限、出力予算をすべて迂回します。

Bash はテスト、ビルド、プロジェクトスクリプト、git 状態、サービス起動のために残すべきです。

狭い動作は、まず専用ツールを使うべきです。

### 2. Edit が先行 Read を要求しない

モデルがファイルを読まずに編集できるなら、システムは推測を奨励していることになります。

当たったときは賢く見えます。

外れたときは直接ファイルを壊します。

### 3. 検索結果に上限がない

検索ツールが結果を返しすぎると、モデルはノイズに埋もれます。

さらに悪いのは、出力予算で切り捨てられたとき、モデルが大量の結果をまだ見ていないことを知らない場合です。

検索 observation には必ず次が必要です。

```text
matchedCount
returnedCount
truncated
nextSuggestion
```

### 4. Bash 解析に失敗しても自動許可する

shell 文字列の解析に失敗したとき、楽観的であってはいけません。

保守的であるべきです。

分からなければ ask または deny です。

### 5. 権限ポップアップが reason を記録しない

ユーザーが allow を押した。

しかしシステムは、なぜ ask したのか、ユーザーがどの範囲に同意したのか、ルールを保存したのかを記録していない。

後で監査すると、「ユーザーが押した」しか残りません。

それでは足りません。

権限判断は構造化されなければなりません。

### 6. ツール失敗が Agent を直接中断する

ツール失敗は、まず observation に変わるべきです。

たとえば、次のようなものです。

```text
文件不存在
old_string 不唯一
命令超时
输出太长
权限拒绝
```

これらはすべて、モデルが次のターンで処理できます。

ランタイム自身の不整合、データ破損、復旧不能なエラーだけが中断すべきです。

## 十五、この記事と後続章の関係

Local Tool Bundle は、Tool Runtime の最初の本物の能力群です。

前方では次を受けます。

```text
第 10 篇：模型提议，系统执行。
```

この規律を、ローカルファイル、検索、ターミナルに落とし込みます。

後方では次を支えます。

```text
Permission / Safety
Context Engineering
Audit / Replay
Evaluation
MCP / Skill / Plugin
Multi-Agent Delegation
```

なぜでしょうか。

後続のすべての高度な能力は、最終的に同じ問題に出会うからです。

```text
某个模型或子 Agent 想接触真实世界。
系统怎么治理这次接触？
```

ローカルツールは、最も早く、最も小さく、最も具体的な答えです。

ローカルツールに境界がなければ、MCP を接続してもリスクが遠隔へ広がるだけです。

Bash に監査がなければ、Multi-Agent は責任追跡をさらに難しくするだけです。

Read/Edit に基線がなければ、長期タスクの復元後にユーザー変更を上書きしやすくなります。

だからこの記事は、見た目にはファイル、検索、ターミナルの話をしています。

本質的には、Agent Harness の「手」をシステムがどう支えるべきかを話しています。

## 十六、一文で覚える

この記事は一文に圧縮できます。

> Local Tool Bundle は read/write/search/bash の関数集合ではなく、Agent がローカル環境に触れるときの制御された能力層である。各動作は schema、パス境界、リスク分類、権限判断、出力予算、監査イベントを通り、最後に observation としてモデルへ戻る。

さらに短くすると、こうです。

```text
Read 建基线。
Search 缩范围。
Edit 小心改。
Write 少用。
Bash 要审批、隔离、限时、截断、审计。
```

ここまでできて初めて、私たちの小さな CLI Agent は「ツール意図を提案できる」段階から、「ローカル能力を安全に使える」段階へ進みます。

次のステップでは、システムはこれらのローカルツールを、より完全な Permission、Hook、Context、Replay の仕組みに接続していけます。

## 教学 Harness への落とし込み

参考プロジェクトの三つの tool、`list_files`、`read_file`、`write_note` で第一版には十分です。焦点は path boundary です。すべての path は `resolveInsideWorkspace()` を通し、write は制御された directory だけに許可し、failure は読める observation として返します。これが動いてから shell、edit、search など高リスク tool を追加します。

---

GitHub ソース: [00-14-local-tool-bundle-permission-runtime.md](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-14-local-tool-bundle-permission-runtime.md)
