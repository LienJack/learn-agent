---
title: 'Agent 設計パラダイムシリーズガイド'
description: 'Context、memory、tools、permission、collaboration、compaction、recovery、auditable execution など、Agent システムに長く残る設計パラダイムを整理するシリーズガイドです。'
author: 'LienJack'
pubDate: '2026-06-03'
locale: 'ja'
tags:
  - 'Agent'
  - '設計パラダイム'
  - 'Context Engineering'
  - 'Harness'
aliases:
  - 'Agent 設計パラダイム'
  - 'Agent システム設計'
  - 'Agent アーキテクチャパターン'
---
# Agent 設計パラダイム連載ガイド

この連載で扱うのは、特定の Agent プロジェクトひとつよりも長期的に残るものです。

`Build Harness` は、Provider、Loop、Tool Runtime、Context Policy、Session Replay、Trace、Memory、Hosted Harness のように、エンジニアリング上の手順に沿って組み立てていくのに向いています。

一方で、ここでは複数の Agent システムをまたいでも安定して成り立つ設計パラダイムを蓄積していきます。

```text
コンテキストは messages[] ではなく、注意力のガバナンスである。
記憶はキャッシュではなく、スコープと出典を持つ知識である。
ツール呼び出しはテキストではなく、権限・因果・監査を持つイベントである。
圧縮は単なる要約ではなく、追跡可能な意味の蒸留である。
Subagent はモデルをもうひとつ起動することではなく、コンテキスト分離と責任回収の仕組みである。
```

この連載の読み方はシンプルです。各記事ではひとつのエンジニアリング抽象を取り上げ、それがなぜ現れたのかをまず問い、次に何を解決し、どのような境界を残すのか、そしてそれをどのようにデータモデルと不変条件へ落とし込むのかを分解していきます。

## 記事パス

1. [Context Manager の新しいパラダイム：Agent の注意力オペレーティングシステム](/blog/AI/agent-design-paradigms/01-context-manager-attention-os)  
   コンテキストを `messages[]` の連結から、イベント事実、状態投影、長期記憶、外部証拠、ツール環境、システム戦略が共同で関与する注意力ガバナンス層へと引き上げる。

2. [Agent の長期記憶と自己最適化パラダイム](/blog/AI/agent-design-paradigms/02-agent-long-term-memory-self-upgrade)  
   Agent の経験を追跡可能な記憶、再利用可能なスキル、テスト可能な最適化へ変換し、評価、段階的リリース、ロールバックの仕組みによって Agent を安定的に改善していく。

3. [Tool Manager の新しいパラダイム：Agent の行動オペレーティングシステム](/blog/AI/agent-design-paradigms/03-tool-manager-action-os)  
   ツールシステムを function registry から、能力、意図、権限、認証情報、サンドボックス、実行、副作用、監査を中心とする行動ガバナンス層へと引き上げる。

4. [Agent Team のタスク分配と通信プロトコル](/blog/AI/agent-design-paradigms/04-agent-team-assignment-communication)  
   Agent Team を複数 agent のトポロジー図から、タスク分配、リース、構造化通信、証拠のフィードバック、衝突処理、検証と統合を備えた協調ランタイムへと進化させる。

今後この連載では、記憶ガバナンス、協調の分離、権限戦略、監査可能な実行などのテーマを引き続き補足していく。

---

GitHub アドレス: [00-series-guide.md](https://github.com/LienJack/learn-agent/blob/main/src/content/blog/ja/AI/agent-design-paradigms/00-series-guide.md)
