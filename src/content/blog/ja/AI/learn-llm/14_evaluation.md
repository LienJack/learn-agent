---
title: "第 14 章: モデル評価"
description: "第 13 章では蒸留後の student を得ました。しかしモデルが「話せる」ことは、モデルが「信頼できる」ことと同じではありません。LLM プロジェクトで最も危険なのは、見栄えのよい数例を評価の代わりにし、平均点で高リスク失敗を隠すことです。"
author: LienJack
pubDate: 2026-06-01
locale: ja
tags:
  - LLM 学習
  - LLM
  - AI
---
# 第 14 章: モデル評価

## 1. この章が本当に解く問題

第 13 章では蒸留後の student を得ました。しかしモデルが「話せる」ことは、モデルが「信頼できる」ことと同じではありません。LLM プロジェクトで最も危険なのは、見栄えのよい数例を評価の代わりにし、平均点で高リスク失敗を隠すことです。

この章で補う能力は、モデル品質を、繰り返し実行でき、説明でき、失敗事例まで追跡できる評価システムへ分解することです。

中心的な問い:

```text
モデルは話せるように見える。では、本当に良くなったことをどう証明するのか。
```

## 2. 問いの連鎖

1. training loss の低下は、モデルが訓練目標により適合したことだけを示す。
2. Eval set は、テストする実能力とリスク境界を定義する。
3. 指標は出力を比較可能な数字に変えるが、その数字はサンプルまで追跡できなければならない。
4. 自動評価は形式、引用、検索、一部の事実チェックに向いている。
5. 人間による採点は、安全性、完全性、専門性、境界判断に向いている。
6. 平均点より failure-case table の方が、次のデータと訓練を導く。
7. 次章の問い: 評価で高リスク境界が見えた後、それを安全、コンプライアンス、model card にどう書き込むか。

## 3. Concept Card

| 概念 | 数学的対象 | Shape | コード上の対象 | 実験で見る対象 |
| --- | --- | --- | --- | --- |
| eval item | テストサンプル | dict | `EvalExample` | gold / rubric |
| prediction | モデル出力 | text / JSON | `Prediction` | 出力 parse |
| metric | 採点関数 | scalar | `metrics.py` | slice score |
| rubric | 採点基準 | levels | `rubric.md` | 人間評価の一貫性 |
| slice | サンプル部分集合 | tags | `risk_tags` | 高リスク性能 |
| report | 証拠サマリ | markdown/json | `eval_report.md` | 回帰比較 |

## 4. Eval Set 設計

評価セットは訓練セットから適当に抜き出すものではありません。能力、リスク、失敗境界を覆う必要があります。

```text
capability: モデルが何をできるべきか
format: 出力がプログラムで parse できるか
grounding: 回答が根拠に支えられているか
refusal: 資料不足時に拒否できるか
safety: 越境助言を避けられるか
robustness: 入力にノイズがあるとき安定するか
```

各 eval サンプルには少なくとも次を含めます。

```json
{
  "id": "eval_0001",
  "input": "...",
  "expected_behavior": "指出风险并引用来源；资料不足则拒答",
  "gold_facts": ["..."],
  "required_citations": ["doc_001#chunk_03"],
  "risk_tags": ["contract", "needs_human_review"],
  "rubric": "legal_contract_risk_v1"
}
```

最も起きやすい誤りは、eval set を「訓練セットの holdout 比率」として扱うことです。ドメインモデルにとって eval set は製品受け入れチェックリストに近いものです。答えられるかだけでなく、根拠不足、高リスク、厳格形式、ユーザー誘導、長文脈圧力の中で制御を失わないかを問う必要があります。

そのため eval set のサンプル出所は明示的に階層化するのが望ましいです。

```text
normal capability cases: 目標シナリオの通常問題
hard capability cases: 多段推論または長文脈を必要とするタスク
negative cases: 知識ベースに答えがない、または根拠不足
format cases: JSON / citations / fields が必須
safety cases: 法律、医療、プライバシー、越境助言
regression cases: 過去に失敗し、修正済みで、再び壊れてはいけないサンプル
```

最初から大きな eval set を作ろうとしないでください。教材プロジェクトでは 20-50 件の高品質サンプルから始められますが、各サンプルに `id`、出所、期待される振る舞い、リスクタグ、採点基準が必要です。小さくても監査可能な eval set は、来歴不明の大きな表より価値があります。

評価サンプルも訓練漏洩を避けなければなりません。第 9、13 章では `source_group` による分割を強調しました。評価でも同じです。同じ契約、同じ医学資料、同じ teacher 生成バッチが訓練と評価の両方にあると、指標は不自然に高くなります。

## 5. 指標層

タスクごとに必要な指標は違います。

- 形式正確率: JSON が parse できるか、フィールドが揃っているか。
- 引用正確率: 引用が存在し、回答を支えているか。
- 事実正確率: 回答の事実が gold または根拠と一致しているか。
- 拒否正確率: 無回答/高リスク問題を拒否できるか。
- Recall: RAG が答えを含む chunk を検索できたか。
- 人間採点: 専門性、完全性、リスク表現、使いやすさ。

平均点には必ず slice score を組み合わせます。

```text
overall_score
by_domain
by_risk_tag
by_prompt_type
by_document_source
by_answerability
```

そうしないと、普通のサンプルではよいが高リスクサンプルでは悪いモデルを見落とします。

実用的な指標表は 3 層に分けられます。

| 層 | 例 | 役割 |
| --- | --- | --- |
| 構造指標 | JSON parse rate、フィールド完全率 | 出力が下流システムへ入れるか判断する |
| 根拠指標 | citation existence、citation support、retrieval recall | 回答が追跡可能か判断する |
| 振る舞い指標 | refusal accuracy、risk flag recall、human score | モデルがタスク境界に合っているか判断する |

指標設計では「精密に見えるが実は違う」数字を避けます。たとえば citation existence は引用文字列があることだけを示し、引用が本当に回答を支えているとは限りません。JSON parse rate は形式が parse 可能なことだけを示し、内容が正しいとは限りません。レポートには各指標が何を測り、何を測らないかも書くべきです。

### 指標は release gate にする

評価はきれいな表を作るだけではありません。ドメインモデルには少なくともリリース基準が必要です。

```text
json_valid_rate >= 0.98
citation_support_rate >= 0.90
unknown_when_no_evidence_rate >= 0.95
high_risk_unsafe_answer_rate == 0
privacy_leak_rate == 0
p95_latency_ms <= target
```

閾値はプロジェクト段階に応じて調整できますが、事前に明記しなければなりません。そうしないと平均点が上がったときに高リスク退化を無視しがちです。

release gate は「出せない」条件をプログラムとレポートにするものです。最後の会議で感覚的に決めるものではありません。

## 6. 自動評価

自動評価は、プログラムで検証できる対象に向いています。

```text
parse_json(output)
check_required_fields(output)
check_citation_exists(output, knowledge_base)
check_answer_contains_refusal(output)
check_retrieved_gold_chunk(top_k)
```

事実判断にはルール、gold facts、検索根拠、judge model を補助的に使えますが、judge model を唯一の証拠にしてはいけません。高リスク場面では人間の抽検または全検が必要です。

### Judge model には校准が必要

LLM-as-judge は事実サポート、回答の完全性、安全境界の判断を補助できますが、真理として扱ってはいけません。

少なくとも小さな校准セットを作ります。

```text
人間が 20-50 件をラベル付けする
judge model が採点する
judge と人間の一致を比較する
judge が誤判定しやすいタイプを記録する
```

judge が長く、礼儀正しく、専門家らしい回答を好む場合、流暢だが根拠のない出力を過大評価する可能性があります。高リスクの法律/医療サンプルでは、人間の抽検または全検経路を残す必要があります。

## 7. 人間採点

人間採点には rubric が必要です。「よさそうか」という感覚に頼ってはいけません。

```text
5: タスクを完全に満たし、事実は根拠に支えられ、境界表現も明確
4: 小さな問題はあるが、使用には影響しない
3: 部分的に正しいが、重要な根拠または境界が欠けている
2: 明確な誤りがあり、人間の修正が必要
1: 危険、幻覚、越境、または形式が使えない
```

複数人で採点する場合は disagreement を記録します。分歧が大きいサンプルは、タスク定義または rubric が不明確であることを示す場合があります。

## 8. Eval Runner

最小評価 runner:

```text
load eval set
for each example:
    build prompt
    run model / RAG pipeline
    parse output
    compute automatic metrics
    save prediction
aggregate metrics
write eval_report.md
write failure_cases.csv
```

各評価では必ず次を保存します。

- model id / adapter id / checkpoint。
- tokenizer と chat template のバージョン。
- RAG index バージョン。
- generation config。
- eval set バージョン。
- predictions 原文。

predictions 原文がない report は監査できません。

監査可能な prediction record は次のようになります。

```json
{
  "eval_id": "eval_0001",
  "model_id": "legal-student-v2",
  "input": "...",
  "raw_output": "...",
  "parsed_output": {"risk_level": "medium"},
  "metrics": {
    "json_valid": true,
    "citation_exists": true,
    "refusal_correct": false
  },
  "latency_ms": 842,
  "generation_config": {"temperature": 0.2, "max_new_tokens": 512}
}
```

`raw_output` と `parsed_output` の両方を保存してください。parse 後の JSON だけでは、モデルが形式を回避した、説明を混ぜた、複数段落を出したといった重要な失敗手がかりを失います。原文だけでは指標集計が不便です。

教材プロジェクトの runner は、最初は本物の LLM の代わりにローカル fake model やルール関数を使って構いません。重要なのは、`load -> predict -> parse -> score -> aggregate -> report` という評価骨格を通すことです。

## 9. 失敗事例表

失敗事例表には少なくとも次を含めます。

```text
eval_id
input
expected_behavior
model_output
metric_failures
risk_tags
suspected_root_cause
next_action
```

よくある root cause:

- データ欠口: 訓練データに似たタスクがない。
- 検索失敗: RAG が正しい資料を見つけていない。
- Prompt 制約が弱い: モデルが自由に書いている。
- モデル容量不足: student が複雑な推論を学べない。
- 安全サンプル不足: 拒否境界が曖昧。

失敗事例表はレポートの付録ではなく、次の作業の入口です。各失敗事例は行動に対応させます。

```text
data_gap -> 訓練または蒸留サンプルを追加
retrieval_gap -> chunk / embedding / top_k / query rewrite を調整
prompt_gap -> 出力契約または拒否条件を強化
metric_gap -> 評価ロジックを修正し、漏判を避ける
safety_gap -> safety eval と human review を追加
product_gap -> このシナリオは非対応と明確化
```

失敗事例を归因できない場合、復盤に必要な証拠が足りません。その場合はログを増やし、中間検索結果を保存し、人間 review を追加します。すぐに「もう一度訓練してみる」べきではありません。

## 10. 回帰評価

データ、prompt、adapter、RAG index、decoding パラメータを変えるたび、同じ regression eval を実行します。レポートは次に答える必要があります。

```text
どの指標が良くなったか。
どの指標が悪化したか。
どの高リスクサンプルがまだ失敗しているか。
新しい形式エラーを導入したか。
コスト、レイテンシ、拒否率に trade-off があるか。
```

平均点が最高のバージョンだけを公開してはいけません。ドメインモデルでは、正確率、拒否率、レイテンシ、安全性の間で取捨選択が必要になることが多いです。

回帰評価レポートには、新バージョンの点数だけでなく「変化方向」を含めるとよいです。

| metric | old | new | delta | gate |
| --- | ---: | ---: | ---: | --- |
| json_valid_rate | 0.96 | 0.99 | +0.03 | pass |
| citation_support_rate | 0.84 | 0.81 | -0.03 | review |
| high_risk_refusal_rate | 0.92 | 0.88 | -0.04 | fail |

これにより trade-off が見えます。あるバージョンは平均点が高くても、高リスク拒否を壊しているかもしれません。ドメインプロジェクトでは、そのバージョンは leaderboard 数字がきれいでも失敗扱いにすべきです。

## 11. 継続実験: 5 件のサンプルから始める

この章の最小実験は 5 件の eval item だけでも構いません。

1. 通常の回答可能な質問。
2. JSON 形式が必要な契約リスク質問。
3. 指定資料の引用が必須の質問。
4. 知識ベースに答えがない質問。
5. 高リスクの医療または法律質問。

この 5 件について、それぞれ prediction、自動指標、失敗理由を保存します。その後、2 つのモデルバージョンを手動で作ります。

```text
base: 自由文を出力し、形式と citation がよく失敗する
student: 構造は安定したが、高リスクサンプルで過度に答える可能性がある
```

実際のモデルを訓練しなくても、評価システムの価値は観察できます。単に「効果はまあまあ」と言うのではなく、モデルがどこで具体的に壊れているかを教えてくれます。

## 12. 必須実験

- `eval_runner.py` を書き、固定 eval set を走らせる。
- `metrics.py` を書き、形式正確率、引用存在率、拒否正確率を計算する。
- `eval_report.md` と `failure_cases.csv` を生成する。
- base / SFT / LoRA / RAG / distilled student を比較する。
- 高リスク slice を作り、法律/医療の拒否と人間レビュー提示を個別に報告する。
- release gate 閾値ファイルを書き、高リスク失敗または p95 レイテンシ超過時に公開チェックが失敗することを検証する。

## 13. 失敗パターン

- 訓練サンプルを eval として使う: 指標が不自然に高くなる。
- 平均点だけを見る: 高リスク失敗が埋もれる。
- judge model が校准されていない: 自動採点は客観的に見えるが、実際は特定の書き方に偏る。
- predictions を保存しない: 復盤できない。
- eval set が小さすぎる: 1 件のサンプル変動で結論が変わる。
- コストとレイテンシを無視する: 効果はよいがデプロイできない。

## 14. テストによる受け入れ

この章の tests では、少なくとも次を検証します。

1. eval item schema が合法で、id が一意である。
2. `eval_runner.py` が predictions、metrics、report を出力する。
3. JSON 形式指標が合法/不合法出力を正しく識別する。
4. citation 指標が、存在しない引用または回答を支えない引用を検出できる。
5. regression report が 2 つのモデルバージョンの指標差分を比較できる。

## 15. この章の記憶のアンカーと境界

この章で最も重要な一文は次です。

> 評価はモデルが「よさそう」に見えることを証明するものではなく、能力、失敗、リスク、回帰を繰り返し確認できる証拠鎖にするものである。

覚えておくこと:

1. eval set は製品受け入れチェックリストであり、訓練セットの holdout 比率ではない。
2. 平均点には slice score を組み合わせる。
3. 自動指標は構造と一部の根拠を測れるが、人間のリスク判断を代替できない。
4. failure cases は次のデータ、RAG、prompt、安全戦略の入口である。
5. regression eval は、新バージョンが 1 つの問題を直しながら別の問題を壊すことを防ぐ。

この章では完全なリリース境界は定義していません。次章では安全、コンプライアンス、モデルカードに進みます。

## 16. 次章

評価は、モデルがどの場面で答えるべきでないか、警告すべきか、人間に渡すべきかを明らかにします。次章では安全、コンプライアンス、model card に入り、これらの境界をリリース前に必須の文書とテストとして書き込みます。
