---
title: "第 17 章: 法律領域小規模モデルプロジェクト"
description: "前 16 章では、訓練、言語モデル、Tokenizer、Transformer、Hugging Face、SFT、LoRA、データ工程、RAG、蒸留、評価、安全、デプロイをそれぞれ学びました。この章では、それらを法律契約レビュー プロジェクトとして組み合わせます。"
author: LienJack
pubDate: 2026-06-01
locale: ja
tags:
  - LLM 学習
  - LLM
  - AI
---
# 第 17 章: 法律領域小規模モデルプロジェクト

## 1. この章が本当に解く問題

前 16 章では、訓練、言語モデル、Tokenizer、Transformer、Hugging Face、SFT、LoRA、データ工程、RAG、蒸留、評価、安全、デプロイをそれぞれ学びました。この章では、それらを法律契約レビュー プロジェクトとして組み合わせます。

本プロジェクトは法律助言システムではなく、弁護士の代替でもありません。これは教材工程です。契約条項を入力し、リスク提示、根拠、修正提案、不確実性説明を出力し、高リスク場面を人間レビューへ渡します。

中心的な問い:

```text
微調整、RAG、蒸留、評価をどう組み合わせて、法律契約レビュー小規模モデルを作るか。
```

## 2. 問いの連鎖

1. 契約レビューでは、一般的な会話ではなく条項リスクの識別が必要である。
2. 契約コーパスには匿名化、出所記録、リスクタグが必要である。
3. SFT はモデルに契約リスク出力形式を学ばせる。
4. RAG は条項ライブラリ、テンプレート、内部レビュー基準を根拠として提供する。
5. LoRA はドメイン微調整コストを下げる。
6. 蒸留は強いモデルのレビュー例を小さなモデルへ移す。
7. 評価、安全、model card が、プロジェクトをデモできるか、公開できるかを決める。
8. 次章の問い: 同じ工程閉ループを医学啓発アシスタントへどう移すか。

## 3. Concept Card

| 概念 | 数学的対象 | Shape | コード上の対象 | 実験で見る対象 |
| --- | --- | --- | --- | --- |
| contract clause | 契約条項テキスト | text | `clause` | リスク識別 |
| risk point | リスク構造 | JSON object | `risk_points` | issue / evidence |
| review guideline | レビュー根拠 | chunks | RAG knowledge base | citation |
| SFT sample | 指示サンプル | messages | `contract_sft.jsonl` | 出力形式 |
| human review | 人間レビュー | status | `needs_human_review` | 高リスク gate |
| model card | リリース説明 | markdown | `model_card.md` | 用途制限 |

## 4. プロジェクトディレクトリ

```text
legal_contract_review/
├── data/
│   ├── raw/
│   ├── cleaned/
│   ├── sft/
│   └── eval/
├── sft/
│   ├── build_dataset.py
│   └── train_lora.py
├── rag/
│   ├── chunk_documents.py
│   ├── build_index.py
│   └── rag_pipeline.py
├── distill/
│   ├── generate_teacher_data.py
│   └── filter_distill_data.py
├── eval/
│   ├── evaluate.py
│   ├── metrics.py
│   └── failure_cases.csv
├── reports/
│   ├── eval_report.md
│   ├── risk_report.md
│   └── model_card.md
└── README.md
```

ディレクトリ自体が学習成果です。各ファイルが前章までの能力に対応しています。

## 5. データ設計

契約レビューのデータは少なくとも 3 種類に分かれます。

```text
contract clauses: 匿名化された契約条項
review guidelines: 内部レビュー規則または公開テンプレート
risk examples: リスクレベル、リスク点、根拠、提案
```

SFT サンプル形式:

```json
{
  "id": "contract_sft_0001",
  "source_id": "contract_doc_001",
  "risk_tags": ["liability", "needs_human_review"],
  "messages": [
    {"role": "system", "content": "你是谨慎的合同风险分析助手，不提供最终法律意见。"},
    {"role": "user", "content": "分析以下条款：<CLAUSE>..."},
    {"role": "assistant", "content": "{\"risk_level\":\"medium\",\"risk_points\":[...],\"basis\":[...],\"suggestion\":\"...\",\"uncertainty\":\"需律师复核\"}"}
  ]
}
```

すべての実契約は匿名化しなければなりません。金額、日付、当事者役割はプレースホルダーとして残し、モデルが契約構造を学べるようにできます。

契約データで最も重要なのは量ではなく、出所、ラベル、境界が明確なことです。訓練可能なサンプルは少なくとも次に答えられる必要があります。

```text
この条項はどこから来たか。
匿名化済みか。
リスクタグは誰が付けたか。
回答の根拠は何か。
人間レビューが必要か。
訓練集、評価集に入れてよいか、または内部例だけに許可されるか。
```

匿名化は会社名を「某公司」に置き換えるだけでは足りません。契約には金額、口座、住所、連絡先、プロジェクト名、取引構造、履行スケジュールも含まれます。教材プロジェクトでは構造を保ち、センシティブ値をプレースホルダーに置き換えます。

```text
甲方 -> PARTY_A
乙方 -> PARTY_B
人民币 120 万元 -> AMOUNT_1
2026 年 5 月 28 日 -> DATE_1
北京市朝阳区... -> ADDRESS_1
```

これによりモデルは契約言語とリスク構造を学べますが、実主体情報を記憶しません。

### 法律資料には管轄とバージョンを記録する

契約リスクは地域と時期から独立して存在するものではありません。同じ条項でも、管轄、法規バージョン、契約類型によってリスク判断が異なることがあります。

したがって法律知識ベースとサンプルには少なくとも次を記録します。

```text
jurisdiction
source_name
source_version
published_at / effective_at
document_type
license_or_usage_note
```

資料バージョンが明確でない場合、モデルは確定的な法律結論を出すべきではありません。正しい振る舞いは次です。

```text
risk_level = "unknown"
needs_human_review = true
uncertainty = "缺少适用管辖区或资料版本，无法给出确定判断"
```

これは過度に保守的なのではなく、法律領域モデルの基本境界です。

## 6. 出力契約

契約レビューモデルは自由に書くべきではありません。固定 JSON 出力を推奨します。

```json
{
  "risk_level": "low|medium|high|unknown",
  "jurisdiction": "unknown|CN|other",
  "risk_points": [
    {
      "issue": "...",
      "why_it_matters": "...",
      "evidence": ["source_id#chunk_id"],
      "suggested_revision": "...",
      "confidence": "low|medium|high"
    }
  ],
  "uncertainty": "...",
  "legal_advice_boundary": true,
  "needs_human_review": true
}
```

形式を固定すると、評価と人間レビューを安定して行えます。

この出力契約は 3 つの目的を同時に満たします。

1. ユーザーに読めるリスク提示を与える。
2. システムが parse できる構造化フィールドを与える。
3. 監査者が追跡できる証拠鎖を与える。

したがって `risk_points` は「違約リスクがある」と一言で済ませず、issue、理由、証拠、提案に分けます。

```json
{
  "issue": "违约责任范围过宽",
  "why_it_matters": "条款要求 PARTY_A 对所有间接损失负责，可能超出常见责任边界",
  "evidence": ["guideline_002#chunk_04"],
  "suggested_revision": "建议限定为直接损失，并增加责任上限",
  "needs_human_review": true
}
```

モデルが根拠を見つけられない場合、正しい振る舞いは理由を捏造することではなく、`risk_level="unknown"` を出力し、`needs_human_review` を `true` にすることです。

ここでの `suggested_revision` は最終的な法律意見ではなく、人間レビュー用の修正方向です。モデルは「こう直せば必ず有効」と約束してはいけませんし、単一条項から案件の勝敗を判断してもいけません。

## 7. RAG 設計

知識ベースには次を含められます。

- 契約テンプレートと条項ライブラリ。
- 内部レビュー基準。
- 公開法律啓発資料。
- 承認済みの例示説明。

RAG pipeline:

```text
clause query
  -> retrieve similar clauses / guidelines
  -> build context with source ids
  -> ask model to analyze only with evidence
  -> output JSON + citations
```

関連根拠がない場合、モデルは `risk_level="unknown"` を出力し、人間レビューが必要であることを説明します。

## 8. 微調整と蒸留

訓練ルート:

```text
base instruct model
  -> LoRA SFT on approved contract examples
  -> RAG teacher generates hard cases
  -> filter distilled examples
  -> train student adapter
```

teacher に審査不能な法律結論を直接生成させてはいけません。teacher 出力には根拠、prompt version、filtering status、人間抽検結果を残します。

このプロジェクトでは、SFT、RAG、蒸留がそれぞれ別の問題を解きます。

| コンポーネント | 主な役割 | 代替できないもの |
| --- | --- | --- |
| SFT | 契約レビュー出力形式と基本表現を学ぶ | 引用が本物であることは保証できない |
| RAG | 条項ライブラリとレビュー基準の根拠を提供する | モデルが根拠を正しく使う保証はない |
| LoRA | ドメイン形式訓練のコストを下げる | 悪いデータは補えない |
| 蒸留 | 高品質レビュー例を拡張する | teacher 出力をそのまま真実にしてはいけない |
| Eval | リスク、形式、引用失敗を露出する | 失敗を自動で解決しない |

卒業プロジェクトの鍵は、各コンポーネントを単独で通すことではなく、閉ループとしてつなぐことです。

## 9. 評価設計

Eval set は少なくとも次を覆います。

- リスク識別: 主要リスクを見つけるか。
- 条項説明: リスク理由を明確に説明するか。
- 修正提案: 具体的だが過度に約束しないか。
- 引用チェック: 根拠が検索資料から来ているか。
- 拒否能力: 根拠不足時に unknown を出力するか。
- 高リスクレビュー: `needs_human_review` を付けるか。
- 形式正確率: JSON が parse できるか。

レポートでは次を比較します。

```text
base model
SFT LoRA
RAG pipeline
distilled student
```

法律評価では「リスクレベルが一致したか」だけを聞いてはいけません。モデルは high risk を正しく判断しても、理由が間違っているかもしれません。引用が存在しても、結論を支えていないかもしれません。そのため指標は分けます。

```text
json_valid_rate: 出力が parse できるか
risk_level_accuracy: リスクレベルがラベルと合うか
risk_point_recall: 重要リスク点を見つけたか
citation_support_rate: 引用がリスク点を支えるか
unknown_when_no_evidence_rate: 証拠なしで判断を拒否するか
human_review_recall: 高リスクで人間レビューを発火するか
```

失敗事例は root cause で分類します。データ欠口、検索失敗、出力形式失敗、過度な法律結論、安全境界失敗です。そうして初めて、次の一手がデータ追加なのか、RAG 改修なのか、prompt 調整なのか、製品境界修正なのか分かります。

## 10. 安全境界

必ず明確にします。

- 出力はリスク提示であり、最終的な法律意見ではない。
- 高リスク条項は人間レビューが必要である。
- 資料不足時に根拠を捏造してはいけない。
- 匿名化されていない個人情報や営業秘密データを処理しない。
- 単一条項から完全な法律結論を出さない。

安全境界は system prompt、SFT サンプル、安全 eval、model card、README に入れます。

## 11. デプロイ閉ループ

最小デモ API:

```text
POST /review-contract-clause
input: clause text + optional document metadata
output: risk JSON + citations + audit versions + latency
```

公開前に rollback 可能でなければなりません。

```text
model_version: legal-lora-v1
adapter_version: legal-adapter-v1
rag_index_version: legal-guidelines-2026-05
prompt_template_version: legal-rag-prompt-v3
safety_policy_version: legal-safety-v2
quantization: int8
rollback_target: legal-baseline-v0
```

法律プロジェクトでは監査ログが特に必要ですが、ログ自体がセンシティブ情報を含む可能性があります。教材版では匿名化後のフィールドを記録できます。

```text
request_id
model_version
adapter_version
rag_index_version
prompt_template_version
safety_policy_version
quantization
input_hash
retrieved_chunk_ids
output_json
safety_flags
needs_human_review
latency_ms
finish_reason
parse_status
```

リリースパッケージにはさらに次を残します。

```text
benchmark_report.md
deployment_manifest.json
rollback_config.json
```

これにより第 16 章の release gate は、法律モデルが「risk JSON を返せる」だけでなく、レポート、バージョン、引用、安全、rollback を検査できることを判断できます。

入力に実契約全文が含まれる場合、本番システムではログ保存期間、アクセス制御、削除メカニズムも明確にする必要があります。講座プロジェクトでは完全なコンプライアンスシステムの実装は求めませんが、学習者には、モデルデプロイは `/predict` を開くだけではないと理解してもらいます。

## 12. 継続サンプル: 違約責任条項

この章では、簡略化した 1 つの条項を中心に閉ループを走らせられます。

```text
若 PARTY_A 未按期交付，应赔偿 PARTY_B 因此产生的一切损失，包括间接损失、可得利益损失及律师费。
```

システムは次を行います。

1. 条項を匿名化し、SFT サンプルを生成する。
2. 条項ライブラリから「責任範囲」「間接損失」「責任上限」などの関連基準を検索する。
3. JSON リスク提示を出力する。
4. 検索された chunk を引用する。
5. `needs_human_review=true` を付ける。
6. eval report にリスク識別、引用サポート、形式指標を記録する。

この例は前章までをつなぎます。Tokenizer と SFT はテキスト形式を扱い、RAG は根拠を提供し、蒸留は類似ケースを拡張し、評価は JSON と citation を検証し、安全章は出力を最終法律意見として包装しないよう求め、デプロイ章はバージョンとレイテンシを記録します。

対応する `expected_output.json` fixture はまず次のように書けます。

```json
{
  "risk_level": "high",
  "jurisdiction": "unknown",
  "risk_points": [
    {
      "issue": "违约责任范围过宽",
      "why_it_matters": "条款要求赔偿一切损失，并包含间接损失、可得利益损失及律师费，可能扩大责任承担范围。",
      "evidence": ["guideline_002#chunk_04"],
      "suggested_revision": "建议限定为直接损失，并明确责任上限和除外情形。",
      "confidence": "medium"
    }
  ],
  "uncertainty": "缺少适用管辖区、合同类型和资料版本，不能给出最终法律判断。",
  "legal_advice_boundary": true,
  "needs_human_review": true
}
```

テストでは逐字一致を求めませんが、フィールドが存在し、JSON が parse 可能で、citation が実在 chunk を指し、管轄区がないとき確定的法律結論を出さないことを確認します。

## 13. 必須実験

- 匿名化済み契約条項 SFT サンプルを 30 件作る。
- 小さな条項知識ベースと RAG index を構築する。
- 契約リスク出力形式モデルを LoRA で訓練する。
- JSON 形式正確率、リスク識別、引用正確性、拒否能力を評価する。
- model card を書き、弁護士の代替ではないことと人間レビュー境界を説明する。

## 14. 失敗パターン

- 出力が法律意見のように見えるが根拠がない。
- RAG が似ているが無関係な条項を引用する。
- モデルが `medium` と `high` リスクを混同する。
- 修正提案が過度に具体的で、根拠を超える。
- 匿名化されていない契約が訓練またはログに入る。
- 人間レビュー標記が欠ける。
- 管轄区、資料バージョン、citation support がないのに最終法律結論を出す。

## 15. テストによる受け入れ

この章の tests では、少なくとも次を検証します。

1. 契約 SFT サンプル schema が合法で匿名化済みである。
2. 出力 JSON に `risk_level`、`risk_points`、`evidence`、`needs_human_review` が含まれる。
3. RAG citation が実在する契約条項またはレビュー基準 chunk を指す。
4. 根拠なしサンプルが `risk_level="unknown"` または拒否経路を発火する。
5. 出力に `jurisdiction` と `legal_advice_boundary` が含まれる。
6. Model card が用途制限と人間レビュー要件を明確にしている。

## 16. この章の記憶のアンカーと境界

この章で最も重要な一文は次です。

> 法律領域モデルの核心は、弁護士のように答えることではなく、リスク点、根拠、境界、人間レビューを追跡可能にすることである。

覚えておくこと:

1. 契約データは匿名化しなければならない。
2. リスク出力は構造化する必要がある。
3. citation はリスク点を支える必要がある。
4. 根拠、管轄区、バージョンがない場合は unknown を出力する。
5. 高リスク条項は human review に入る。

この章のプロジェクトは法律意見を代替できません。次章では同じ工程閉ループを医学啓発場面へ移します。

## 17. 次章

法律契約レビューは根拠と人間レビューを重視します。医学啓発アシスタントは危険信号、受診案内、診断の代替をしないことをより重視します。次章では同じ工程閉ループを医学領域へ移します。
