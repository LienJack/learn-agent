---
title: "0 から 1 へ Agent と Harness を構築する"
description: "会話できる CLI アシスタントから、制御可能で観測可能な Agent Harness へ育てる実践的な工程ガイド。"
author: LienJack
pubDate: 2026-05-29
heroImage: './assets/cover.png'
locale: "ja"
tags:
  - Agent
  - Harness
  - チュートリアル
aliases:
  - Agent Harness チュートリアル
  - Build Harness
---

# 0 から 1 へ Agent と Harness を構築する

このシリーズは、Agent Harness を 0 から作るための実践的なエンジニアリングガイドです。巨大なフレームワークから始めるのではなく、会話できる CLI アシスタントから出発し、agent loop、tools、context、memory、permission、trace、eval、sub-agent、automation へ少しずつ育てていきます。

中心にある問いはシンプルです。LLM が「次に何をするか」を判断するだけなら、その外側にはどんなシステムが必要なのか。長いタスクを安定して進めるには、実行、状態、権限、観測、復旧、拡張、監査を担う制御層が必要になります。その制御層が Harness です。

ChatGPT、Claude、Cursor、Claude Code を使ったことがあり、「Agent はなぜ作業できるのか」「モデルの外側では何が起きているのか」と感じたことがあるなら、このシリーズはその疑問を工程として分解していきます。

## Agent とは何か？

Agent は単なる prompt ではありません。モデル、ループ、ツール、状態、ポリシーが組み合わさったシステムです。モデルが次の一手を判断し、ループがタスクを進め、ツールが外部世界に触れ、状態が事実を記録し、ポリシーが安全性と制御を保ちます。

Agent の主要な要素は次の通りです。

- **Model**：次に何をするかを判断する。
- **Loop**：単発の回答を複数ステップの行動へ変える。
- **Tools**：ファイル、検索、コマンド、API、成果物を扱う。
- **State**：メッセージ、イベント、観測、成果物、判断を記録する。
- **Policy**：context、権限、安全性、予算、復旧を管理する。

これらが観測可能、復旧可能、拡張可能、監査可能、プロダクトとして運用可能になると、Agent は **Harness** へ進化します。Harness はモデル外部の制御システムです。

## 誰に向いているか

Python または TypeScript を読み書きでき、HTTP API、JSON、CLI、Git、SQLite などの基本的な部品に慣れている開発者向けです。AI 研究者である必要はありません。LLM を実際に動くシステムへ組み込む方法を知りたい人に向いています。

## 章一覧

### 第 0 章：Agent の基本モデルと Harness の進化

1. [Agent の基本定義：なぜ一文の Prompt ではないのか？](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-01-agent-not-a-prompt.md)  
   Agent を prompt ではなく runtime system として捉え直します。loop、tools、state、control がなぜ必要なのかを最初に整理します。

2. [Agent の構成モデル：Model、Loop、Tools、State](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-02-agent-components.md)  
   Agent を最小構成へ分解します。model、loop、tools、state がどのように協調し、再現可能な動作を作るのかを学びます。

3. [システム境界：ChatBot、Workflow、Agent、Harness の違い](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-03-chatbot-workflow-agent-harness.md)  
   ChatBot、Workflow、Agent、Harness の違いを整理します。どの問題にどのアーキテクチャを使うべきか判断しやすくなります。

4. [Harness の基本定義：モデル外部の制御システム](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-04-harness-control-system.md)  
   Harness をモデル外部の制御層として定義します。実行、権限、監査、復旧、プロダクト動作を誰が所有するのかを明確にします。

5. [Agent の進化パス：Chat Agent -> Tool Agent -> Runtime Agent -> Managed Agent](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-05-agent-evolution-path.md)  
   chat から tool、runtime、managed agent へ進む道筋を追います。各段階で増える能力と、その背景にある工程上の圧力を説明します。

6. [手書き Agent の意味：フレームワーク抽象の背後にある最小メカニズムを理解する](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-06-handwrite-agent-meaning.md)  
   最小の Agent を自分で書く意味を扱います。仕組みを理解すると、フレームワークを盲信せず、必要な抽象だけを選べます。

7. [LLM Provider の接続：CLI で最初のモデル呼び出しを完了する](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-07-llm-provider-cli-first-call.md)  
   実際の provider を CLI に接続し、最初のモデル呼び出しを完成させます。ここから概念が実行可能なコードへ変わります。

8. [最小 Agent Loop：単発回答から多段階の行動へ](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-08-minimal-agent-loop.md)  
   一度きりの回答を、観測と停止条件を持つ multi-step loop へ変えます。Agent がタスクを進める最小の形を作ります。

9. [M0 Core Kernel：本物の大規模モデルをシステムへ接続する。ただしシステムを乗っ取らせない](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-09-m0-core-kernel.md)  
   モデルを system に接続しながら、制御権を core に残す設計を学びます。events、state、runtime boundary が中心です。

10. [Intent / Execution の分離：モデルが提案し、システムが実行する](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-10-intent-execution-separation.md)  
    モデルの intent と実際の execution を分離します。この境界があるからこそ、権限確認、監査、replay、debug が可能になります。

### 第 2 章：拡張境界

11. [Plugin Host：なぜ core は拡張される力を持つべきなのか？](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-11-plugin-host-core-extension.md)  
    Harness に plugin boundary が必要な理由を扱います。provider、tool、policy、workflow を拡張しながら、core を安定させます。

12. [Provider Runtime：なぜ provider は tool intent だけを返すべきなのか？](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-12-provider-runtime-tool-intent.md)  
    provider runtime の責任範囲を定義します。provider は text と tool intent を返せますが、実行権限は Harness に残します。

### 第 3 章：実行と現場制御

13. [Tool Runtime：tool intent から observation へ](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-13-tool-runtime-observation.md)  
    tool intent を構造化された observation へ変換する流れを作ります。安全な実行、結果整理、エラーの帰属が主題です。

14. [Local Tool Bundle：ファイル、検索、ターミナル、権限 Runtime](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-14-local-tool-bundle-permission-runtime.md)  
    file、search、terminal などの実用的な local tools を追加します。焦点は実行能力ではなく、risk、permission、output contract です。

15. [Context Policy：このラウンドでモデルは何を見るべきか？](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-15-context-policy-model-input.md)  
    各 turn でモデルに何を見せるべきかを設計します。良い context policy は精度、コスト、安全性、debuggability に効きます。

16. [Session Replay：なぜイベントログは長時間タスクの事実源なのか？](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-16-session-replay-event-log.md)  
    chat history ではなく event log を事実源にします。長いタスクには replay、resume、audit が可能な記録が必要です。

### 第 4 章：能力、協調、診断

17. [Capability Discovery：Skills、MCP、動的なツール公開](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-17-capability-discovery-skills-mcp.md)  
    Agent に今必要な能力だけを公開する設計を扱います。Skills、MCP、tool discovery により、拡張性と制御性を両立します。

20. [Memory Governance：candidate ledger から governance store へ](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-20-memory-governance-candidate-ledger.md)  
    memory を単なる保存領域ではなく、管理されるデータとして扱います。候補、承認、鮮度、削除により長期記憶を保ちます。

21. [Scoped Retrieval：境界付き検索から audit snapshot へ](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-21-scoped-retrieval-audit-snapshot.md)  
    retrieval を明示的で監査可能な操作にします。どの証拠を使ったのか、なぜ許可されたのかを snapshot として残します。

### 第 5 章：用語整理

24. [Agent Harness 用語マップ：Intent、Observation、Event、Artifact、Snapshot、Projection、Trace の関係](https://github.com/LienJack/build-harness/blob/main/docs/ja/00-24-agent-harness-terminology-map.md)  
    シリーズ全体の概念を用語マップとして整理します。設計、debug、議論で迷わないための共通語彙を作ります。
