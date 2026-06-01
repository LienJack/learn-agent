---
title: "第19章：ドメインモデルの完全なエンジニアリングテンプレート"
description: "第17章と第18章では、それぞれ法律分野と医療分野のプロジェクトを扱いました。2つの領域は大きく異なりますが、エンジニアリングの骨格はよく似ています。データガバナンス、SFT、RAG、蒸留、評価、安全性、デプロイ、そして継続的な改善です。"
author: LienJack
pubDate: 2026-06-01
locale: ja
tags:
  - LLM 学習
  - LLM
  - AI
---

# 第19章：ドメインモデルの完全なエンジニアリングテンプレート

## 1. この章で本当に解決したい問題

第17章と第18章では、それぞれ法律分野と医療分野のプロジェクトを扱いました。2つの領域は大きく異なりますが、エンジニアリングの骨格はよく似ています。データガバナンス、SFT、RAG、蒸留、評価、安全性、デプロイ、そして継続的な改善です。

この章では、それらの共通部分を再利用可能なテンプレートとして抽象化します。目的は、もう1つ demo を作ることではありません。新しいドメインプロジェクトを開始し、レビューし、学習し、評価し、リリースできる工程構造を整えることです。

中心となる問いは次のとおりです。

```text
ドメインモデルプロジェクトを、どのように再利用可能なテンプレートにするか？
```

## 2. 問題の連鎖

1. 単一のドメインプロジェクトは手作業で組み立てられるが、再利用は難しい。
2. 再利用可能なテンプレートには、ディレクトリ、設定、データ契約、レポートの標準化が必要になる。
3. データバージョン、モデルバージョン、RAG index バージョンを相互に追跡できる必要がある。
4. 学習、評価、デプロイには統一されたコマンド入口が必要になる。
5. リスク、安全性、人間によるレビューをテンプレートの一部にする必要がある。
6. 継続的な改善は、回帰評価と failure cases に依存する。
7. コースの締めくくりとして、tensor の学習ループからドメインモデルの工程ループへ進む。

## 3. Concept Card

| 概念 | 数学的対象 | Shape | コード上の対象 | 実験上の対象 |
| --- | --- | --- | --- | --- |
| domain template | プロジェクト骨格 | directory tree | `domain_model_template/` | 新領域への移植 |
| config | 実験パラメータ | YAML / JSON | `configs/*.yaml` | 再現性 |
| manifest | 実行証跡 | JSON | `run_manifest.json` | バージョン追跡 |
| report chain | リリース証跡 | markdown/csv | `reports/` | go/no-go |
| release gate | リリース基準 | rules | check script | 未完成版の公開を防ぐ |
| failure loop | 改善ループ | cases -> actions | `failure_cases.csv` | 継続的改善 |

## 4. テンプレートディレクトリ

```text
domain_model_template/
├── configs/
│   ├── data.yaml
│   ├── train_lora.yaml
│   ├── rag.yaml
│   ├── eval.yaml
│   └── serving.yaml
├── data/
│   ├── raw/
│   ├── cleaned/
│   ├── sft/
│   ├── distill/
│   └── eval/
├── scripts/
│   ├── prepare_data.py
│   ├── train_lora.py
│   ├── build_rag_index.py
│   ├── generate_distill_data.py
│   ├── evaluate.py
│   ├── benchmark.py
│   ├── serve.py
│   ├── check_release_gate.py
│   └── rollback.py
├── src/
│   ├── data/
│   ├── training/
│   ├── rag/
│   ├── evaluation/
│   ├── safety/
│   └── serving/
├── tests/
│   ├── test_data_schema.py
│   ├── test_rag_pipeline.py
│   ├── test_metrics.py
│   ├── test_safety_policy.py
│   └── test_release_gate.py
├── reports/
│   ├── data_quality_report.md
│   ├── eval_report.md
│   ├── failure_cases.csv
│   ├── risk_report.md
│   ├── model_card.md
│   └── run_manifest.json
└── README.md
```

テンプレートは単なるディレクトリ一覧ではありません。各ディレクトリは、実行可能なコマンド、テスト可能な契約、またはリリース証跡のいずれかに対応しているべきです。

## 5. 設定管理

重要な実験パラメータをスクリプトの中に散らばらせてはいけません。少なくとも次の項目を設定として持たせます。

```yaml
project:
  name: domain_model_template
  domain: legal|medical|custom

base_model:
  model_id: ...
  revision: ...

data:
  train_path: data/sft/train.jsonl
  val_path: data/sft/val.jsonl
  eval_path: data/eval/eval.jsonl
  split_seed: 42

training:
  method: lora
  learning_rate: 0.0002
  batch_size: 4
  gradient_accumulation_steps: 8
  max_seq_length: 2048

rag:
  index_version: ...
  chunk_size: 512
  top_k: 5

serving:
  model_version: ...
  adapter_version: ...
  rag_index_version: ...
  prompt_template_version: ...
  safety_policy_version: ...
  quantization: ...
  rollback_target: ...
```

設定ファイルは実験を再現する入口であり、レポート生成の根拠でもあります。

設定管理で重要なのは YAML の構文ではありません。「結果に影響する選択」をスクリプトから外へ出すことです。学習、検索、評価、デプロイに影響する変更は、すべて追跡可能であるべきです。

```text
モデル：base model、revision、adapter、quantization
データ：パス、バージョン、split seed、フィルタリング規則
学習：learning rate、batch、max length、LoRA rank
RAG：chunk size、overlap、embedding model、top_k
評価：eval set、metrics、thresholds、slices
サービス：max_new_tokens、timeout、model / adapter / RAG / prompt / safety policy version、rollback target
```

レポートに指標の変化が現れたとき、設定に戻れば、どの選択が結果を変えたのか判断できます。

## 6. データバージョン管理

各学習 run では、少なくとも次のものを追跡できる必要があります。

```text
raw data version
cleaning script version
SFT dataset version
distill dataset version
eval dataset version
RAG index version
```

学習出力には `run_manifest.json` を保存することを推奨します。

```json
{
  "run_id": "2026-05-28_lora_v3",
  "base_model": "model-id@revision",
  "model_version": "domain-model-v3",
  "adapter_version": "domain-adapter-v3",
  "dataset_version": "sft_v3",
  "rag_index_version": "kb_v5",
  "prompt_template_version": "rag_prompt_v4",
  "safety_policy_version": "safety_v2",
  "quantization": "int8",
  "config_files": ["configs/train_lora.yaml", "configs/eval.yaml"],
  "benchmark_report": "reports/benchmark_report.md",
  "rollback_target": "domain-model-v2",
  "git_commit": "..."
}
```

`run_manifest.json` は、システム全体の証跡インデックスです。レポートの代わりにはなりませんが、そのレポートがどの run から来たのかを教えてくれます。manifest がないドメインモデルバージョンでは、後から次の問いに答えるのが難しくなります。

```text
この adapter はどの SFT データで学習されたのか？
評価時に使った RAG index はどれか？
model card に書かれたスコアはどの checkpoint に対応するのか？
本番のこの出力はどの prompt version から出たのか？
```

manifest のフィールドは最初から完璧である必要はありません。ただし、モデル、データ、設定、コード、評価成果物は必ずカバーする必要があります。

## 7. 統一されたコマンド入口

テンプレートは、安定したコマンド群を提供するべきです。

```bash
python scripts/prepare_data.py --config configs/data.yaml
python scripts/train_lora.py --config configs/train_lora.yaml
python scripts/build_rag_index.py --config configs/rag.yaml
python scripts/evaluate.py --config configs/eval.yaml
python scripts/serve.py --config configs/serving.yaml
```

コマンドが安定すると、CI、ドキュメント、教育、そして本番移行がすべて容易になります。

統一されたコマンド入口は、このコースを notebook からエンジニアリングへ移す役割も持ちます。Notebook は探索と教育に向いています。スクリプトは再現と自動化に向いています。成熟したプロジェクトでは両方を併用できます。

```text
notebooks/: 仕組みの説明、可視化、手作業での観察
scripts/: 固定フロー、再現可能な実行、CI からの呼び出し
src/: テスト可能なコアロジック
tests/: 工程上の契約と回帰保護
reports/: 実行結果とリリース証跡
```

重要な流れが notebook の中で手作業でしか動かせないなら、それはまだ工程ループに入っていません。

## 8. レポートチェーン

各 run は少なくとも次のものを出力します。

- `data_quality_report.md`
- `eval_report.md`
- `failure_cases.csv`
- `risk_report.md`
- `model_card.md`
- `run_manifest.json`
- `benchmark_report.md`
- `deployment_manifest.json`

レポート同士は相互参照できるべきです。eval report はデータバージョンを参照し、model card は eval report を参照し、risk report は failure cases を参照します。

## 9. テスト体系

テンプレートの tests は、コードが動くかどうかだけを見るものではありません。工程上の契約も検証します。

- データ schema。
- 匿名化・脱識別ルール。
- train/eval の漏洩がないこと。
- RAG citation が存在すること。
- 出力形式が parse 可能であること。
- 安全性サンプルで拒否または人間レビューが発火すること。
- model card の必須項目が揃っていること。

これらの tests はドメインプロジェクトのガードレールです。新しい領域を追加するたびに、まず対応するガードレールを追加する必要があります。

テンプレートテストは4種類に分けられます。

| 種類 | 例 | 防ぐ問題 |
| --- | --- | --- |
| schema tests | JSONL フィールド、config 必須項目 | データ/設定の変形 |
| split tests | `source_group` の漏洩なし | 指標の過大評価 |
| behavior tests | 拒否、citation、形式 parsing | 境界外のモデル出力 |
| release tests | report、model card、rollback target | 未完成版の公開 |

これらのテストでは、本物の大規模モデルを学習する必要はありません。小さなサンプル、fake model、ルールベースの出力で実施できるものも多くあります。重要なのは、工程上の契約を固定することです。

## 10. リリースゲート

ドメインモデルのバージョンをリリースする前に、少なくとも次を満たす必要があります。

```text
data quality report が生成済み
eval report に重大な回帰がない
safety eval が閾値を満たしている
model card が完全である
risk report がレビュー済み
rollback target が利用可能
owner が承認済み
```

いずれかが欠けている場合、そのモデルは実験段階に留めるべきです。

### release gate はスクリプトにする

リリースゲートを README に書くだけでは不十分です。テンプレートは次のような入口を提供するべきです。

```bash
python scripts/check_release_gate.py --manifest reports/run_manifest.json
```

少なくとも次をチェックします。

```text
eval_report が存在する
risk_report が存在する
model_card が存在する
run_manifest が存在する
rollback_target が空ではない
benchmark_report が存在する
safety eval が合格している
高リスク failure が新規に増えていない
model / tokenizer / adapter / RAG index / prompt / safety policy のバージョンが揃っている
```

いずれかが欠けていれば、スクリプトは非ゼロ終了コードを返すべきです。そうすれば、CI、授業課題、実プロジェクトが同じゲートを使えます。

## 11. 継続的な改善

リリース後の改善ループは次のようになります。

```text
collect failures
  -> label root causes
  -> update data / prompt / RAG / adapter
  -> run regression eval
  -> update model card and risk report
  -> release or rollback
```

すべての failure case は、何らかの action に接続される必要があります。

- データを追加する。
- prompt を変える。
- 検索を変える。
- safety policy を調整する。
- そのシナリオを製品上サポート外として明示する。

failure cases が改善システムに入らなければ、次のバージョンでも同じ形で再発します。

継続的な改善では、「失敗を見たらデータを1件足す」という短絡も避ける必要があります。各 failure case について、まず root cause を見てから action を決めます。

```text
retrieval_failure -> chunk / embedding / query / index を変える
format_failure -> prompt / SFT 形式サンプル / parser を変える
safety_failure -> safety eval / 拒否サンプル / policy を追加する
knowledge_gap -> 知識ベースまたは学習データを追加する
capacity_gap -> モデル変更、LoRA 調整、タスク複雑度の削減
product_gap -> そのシナリオを非対応として明示する
```

こうして初めて、このコースの終点は「一度動かした」ではなく、継続的に改善できるドメインモデルシステムになります。

## 12. 新しい領域へ移植する手順

テンプレートを新しい領域へ移植する場合は、次の順番で進めます。

1. intended use と out-of-scope use を明確に書く。
2. 出力契約と安全境界を定義する。
3. 20-50件の高品質な seed examples を集める。
4. 最小の RAG 知識ベースと citation ルールを作る。
5. eval set を書く。量より先に失敗境界をカバーする。
6. base model を走らせ、最初の failure cases を生成する。
7. まず prompt を直すのか、RAG を補うのか、それとも SFT / LoRA を行うのか決める。
8. model card、risk report、run manifest を生成する。
9. release gate を書き、report、rollback、安全性評価が欠けたバージョンの公開を防ぐ。

この順序では、意図的に評価と安全性を前に置いています。ドメインモデルで最も多い失敗は「モデルが話せないこと」ではありません。「もっともらしく話すが、境界と根拠が信頼できないこと」です。

90分の移植課題なら、モデルを学習せず、企業カスタマーサポートや教育QAの最小工程シェルだけを作っても構いません。

| ステップ | 成果物 |
| --- | --- |
| 1 | `intended_use.md`：できること、できないこと |
| 2 | `output_schema.json`：固定回答フィールドと citation フィールド |
| 3 | `eval.jsonl`：成功サンプル5件 + 失敗境界サンプル5件 |
| 4 | `run_manifest.json`：base model、RAG index、prompt、安全ポリシーのバージョン |
| 5 | `check_release_gate.py`：eval/model card/rollback target が欠けると失敗 |

この課題では、あえてモデルを学習しません。目的は性能を追うことではなく、学習者が法律テンプレートを「評価でき、レビューでき、ロールバックできる」新しいドメインプロジェクトへ移植できるかを確認することです。

## 13. 必須実験

- テンプレートディレクトリをコピーし、新しいドメインプロジェクトの骨格を作る。
- `configs/data.yaml`、`configs/eval.yaml`、`configs/serving.yaml` を記入する。
- モデル、データ、RAG index、設定バージョンを含む `run_manifest.json` を生成する。
- eval report、model card、rollback target が欠けている場合に失敗する最小のリリースチェックを書く。
- 5件の failure cases に対して root cause 分類を行い、次の action list を出力する。

## 14. 修了時の確認

このコースを終えた学習者は、次のものを提出できるようになっているべきです。

1. 実行可能な最小学習ループ。
2. 説明可能な mini GPT の backbone。
3. Hugging Face SFT / LoRA ワークフロー。
4. citation 付きの RAG baseline。
5. 蒸留データの生成・フィルタリングパイプライン。
6. eval runner と failure cases report。
7. model card と risk report。
8. デプロイ可能で、ロールバック可能なドメインモデルプロジェクトテンプレート。

これらの成果物は互いにつながっているべきです。学習ループがモデルを生み、SFT/LoRA が振る舞いを調整し、RAG が根拠を提供し、蒸留が能力を広げ、評価が失敗を見つけ、安全文書が境界を定義し、デプロイ設定がバージョンとロールバック経路を保持します。

最終的なリポジトリ構造は、次の形に収束できます。

```text
mini_gpt/
hf_sft_lora/
domain_project_legal/
domain_project_medical/
domain_template/
reports/
```

採点も、モデル出力の見た目だけではなく、工程ループごとに分けるべきです。

| モジュール | 配点 |
| --- | ---: |
| 学習ループと Mini GPT | 20% |
| HF / SFT / LoRA ワークフロー | 20% |
| RAG と citation support | 20% |
| Eval / safety / model card | 25% |
| Serving / manifest / release gate | 15% |

## 15. 失敗モード

- テンプレートがディレクトリだけになり、コマンドやレポートがない。
- 設定がスクリプトに散らばり、実験を再現できない。
- eval set にバージョンがなく、回帰を比較できない。
- RAG index 更新後に model card が同期されていない。
- risk report がモデルリリースより遅れている。
- すべての領域で同じ安全ポリシーを使い、領域差を無視している。
- release gate がドキュメントにしかなく、スクリプトや CI の入口がない。

## 16. テスト受け入れ条件

この章の tests では、少なくとも次を検証します。

1. テンプレートディレクトリに `configs`、`data`、`scripts`、`src`、`tests`、`reports` が含まれる。
2. 各 config が parse でき、必須フィールドを含む。
3. `run_manifest.json` がモデル、データ、RAG index、設定バージョンを記録できる。
4. 必須レポートファイルが存在し、バージョンを相互参照している。
5. リリースチェックが、eval report または rollback target を欠くバージョンを止められる。

## 17. コースの締めくくり

この道筋は、第1章の

```text
forward -> loss -> backward -> optimizer.step
```

から始まり、第19章の

```text
data -> train -> RAG -> distill -> eval -> safety -> deploy -> monitor -> rollback
```

で終わります。

その間の各章は、学習、モデリング、表現、文脈、再利用、微調整、検索、蒸留、評価、安全性、デプロイ、継続改善という、現実の工程能力を1つずつ補っています。

このコースの最後の記憶の錨は、次の一文です。

> 目的は、LLM を会話できる demo にすることではない。モデルの振る舞いを、学習でき、検索でき、評価でき、レビューでき、デプロイでき、ロールバックできるエンジニアリングシステムにすることだ。

このテンプレートを新しい領域へ移植し、データ、コード、テスト、レポート、ロールバック経路を残せるなら、このコースはもはや「LLM を学んだ」だけではありません。保守可能なドメイン小型モデル工程を始められる状態になっています。
