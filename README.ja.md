# learn-agent

AI Agent、Claude Code のソースコード解析、データベース、Redis、フロントエンド開発をつなげて学ぶための技術ブログ兼ナレッジベースです。

[中文](./README.md) | [English](./README.en.md) | [オンラインで読む](https://blog.lienjack.com/ja/)

## これは何か

`learn-agent` は、現代の AI システムをきちんと理解したいエンジニア向けのブログです。単発の用語解説ではなく、実際のシステムがどのように設計されているのかを追いかけます。モデル呼び出しがどう Agent のループになるのか、ツールはどう選ばれるのか、コンテキストはどう管理されるのか、そしてそれらが日々のソフトウェア開発にどう接続されるのかを扱います。

主なテーマは次のとおりです。

- AI Agent：LLM、Prompt、RAG、Agent ワークフローと、その背後にある考え方。
- Claude Code ソース解析：アーキテクチャ、ReAct、Prompt、Context 管理、Tools、MCP、Skill、マルチ Agent 協調、Plan。
- データベース：MySQL と PostgreSQL のインデックス、トランザクション、ロック、ログ、キャッシュ、実行フロー、アーキテクチャ。
- Redis：データ型、内部構造、永続化、キャッシュ障害パターン、一貫性、高可用性、チューニング、key 設計。
- フロントエンド開発：この Astro ブログ自体を題材に、多言語ルーティング、コンテンツシステム、画像閲覧、インタラクション、静的サイト開発を扱います。

Agent を学びたいけれど、プロンプトの小技やデモだけで終わりたくない人に向けています。Agent を、ファイル、ターミナル、データベース、フロントエンド、タスク計画、失敗からの復旧といった本物の開発現場の中に戻して考えるための場所です。

## 読む価値

- **概念からソースコードへ**：LLM、RAG、Agent の基礎から始め、Claude Code のようなコーディング Agent の実行時設計へ進みます。
- **ソースコードから実践へ**：ツール境界、コンテキスト予算、タスク協調、MCP、Skill、保守性まで見ます。
- **AI と基礎力を一緒に学ぶ**：Agent は最終的にデータベース、キャッシュ、API、フロントエンドを触ります。そのための基礎も同じ地図の中で整理します。
- **図で理解する**：複雑な処理の流れは、構造図やフロー図を使って分解します。
- **成長するサイト**：このリポジトリには記事と Astro 実装の両方が含まれており、文章とサイト体験を一緒に改善していきます。

## コンテンツマップ

### AI Agent

- LLM の原理と能力の境界
- Prompt が推論と実行に与える影響
- チャットボットから作業する Agent へ
- Harness、OpenClaw、Hermes などの Agent 工学の考え方
- RAG のデータ取り込み、チャンク分割、埋め込み、インデックス、検索評価、GraphRAG

### Claude Code ソース解析

- 工程アーキテクチャとモジュール境界
- ReAct ループがタスクを進める仕組み
- Prompt 構成とシステム指示
- Context 管理、圧縮、復旧戦略
- ファイルツール、ターミナルツール、タスク管理ツール
- MCP、Skill、マルチ Agent 協調、Plan

### データベースと Redis

- MySQL / PostgreSQL のインデックス、トランザクション、ロック、ログ、キャッシュ、実行フロー
- Buffer Pool、shared_buffers、MVCC、WAL、Checkpoint などの主要メカニズム
- Redis のデータ型、内部データ構造、有効期限、メモリ淘汰、永続化
- キャッシュ雪崩、ホットキー問題、キャッシュ貫通、MySQL / Redis 一貫性
- レプリケーション、Sentinel、Cluster、スロークエリ、big key、本番アーキテクチャ

### フロントエンドとコンテンツ開発

- Astro 6 による多言語ブログ構成
- Markdown / MDX コンテンツ管理
- 記事メディア、フロー図、画像ビューア
- RSS、Sitemap、静的デプロイ、コンテンツサイトの開発

## ローカル開発

このプロジェクトは `pnpm` と Node.js `>=22.12.0` を使用します。

```bash
pnpm install
pnpm dev
```

開発サーバーはデフォルトで [http://localhost:4321](http://localhost:4321) で起動します。

よく使うコマンド：

```bash
pnpm dev
pnpm build
pnpm preview
pnpm astro:check
pnpm test:content
```

## プロジェクト構成

```text
src/content/blog/       ブログ記事
src/pages/              Astro ルート
src/components/         ページとインタラクション用コンポーネント
src/layouts/            ページと記事のレイアウト
src/styles/             グローバルスタイル
public/                 静的アセット
docs/                   デザイン、計画、要件ドキュメント
```

## Star History

Agent、Claude Code、またはソフトウェア開発の基礎を理解する助けになったら、Star をもらえるとうれしいです。より深い記事を書き続ける励みになります。

[![Star History Chart](https://api.star-history.com/svg?repos=LienJack/learn-agent&type=Date)](https://www.star-history.com/#LienJack/learn-agent&Date)

## License

このプロジェクトは [MIT License](./LICENSE) のもとで公開されています。
