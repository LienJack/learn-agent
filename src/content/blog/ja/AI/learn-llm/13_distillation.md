---
title: "第 13 章: 小規模モデルの蒸留"
description: "RAG によって強いモデルは外部根拠に基づいて回答できます。しかし強いモデルを毎回呼び出すと、高価で、遅く、制御しにくい場合があります。ドメインプロジェクトでは、強いモデルが特定タスクで示す振る舞いを、より小さく、安く、デプロイしやすい student model へ移したいことがよくあります。"
author: LienJack
pubDate: 2026-06-01
locale: ja
tags:
  - LLM 学習
  - LLM
  - AI
---
# 第 13 章: 小規模モデルの蒸留

## 1. この章が本当に解く問題

RAG によって強いモデルは外部根拠に基づいて回答できます。しかし強いモデルを毎回呼び出すと、高価で、遅く、制御しにくい場合があります。ドメインプロジェクトでは、強いモデルが特定タスクで示す振る舞いを、より小さく、安く、デプロイしやすい student model へ移したいことがよくあります。

蒸留は「大きなモデルのすべての能力をコピーする」ことではありません。明確なタスク分布上で、teacher の出力、選好、確率情報を student の訓練信号に変換することです。

中心的な問い:

```text
大きなモデルは効果がよいが高すぎる。検証可能なドメイン能力を小さなモデルへどう移すのか。
```

## 2. 問いの連鎖

1. Teacher model は複雑な問いに答えられるが、呼び出しコストが高い。
2. Student model は安いが、元の能力は不足している。
3. Response distillation は teacher が生成した回答で student を訓練する。
4. Logit distillation は teacher の確率分布を使って、より細かい教師信号を与える。
5. Preference distillation はペアの選好を使い、よりよい回答を選ぶことを student に教える。
6. 蒸留データでは hallucination、形式エラー、越境助言をフィルタしなければならない。
7. 次章の問い: 蒸留後、student が本当に良くなったことをどう証明するのか。

## 3. Concept Card

| 概念 | 数学的対象 | Shape | コード上の対象 | 実験で見る対象 |
| --- | --- | --- | --- | --- |
| teacher | 強いモデル | function | `teacher.generate` | データ生成 |
| student | 小さなモデル | parameters | `student_model` | 微調整 |
| response | テキスト教師信号 | messages | `distill.jsonl` | 品質フィルタ |
| logits | 確率分布 | `(B, T, V)` | `teacher_logits` | KL loss |
| preference | 選好ペア | pair | `chosen/rejected` | ranking ability |
| filter | 品質ゲート | rules/model/human | `filter.py` | 通過率 |

## 4. Response Distillation

最も一般的な蒸留方法は、teacher に回答を生成させ、その回答を SFT データとして student を訓練する方法です。

```text
prompt + retrieved context
  -> teacher answer
  -> filter / edit / approve
  -> SFT example
  -> student fine-tune
```

サンプルには生成元を記録しなければなりません。

```json
{
  "id": "distill_0001",
  "teacher_model": "teacher-model-id",
  "teacher_prompt_version": "rag_prompt_v3",
  "generation_config": {"temperature": 0.2, "top_p": 0.9},
  "filter_status": "approved",
  "messages": [...]
}
```

teacher と prompt のバージョンを記録しなければ、将来 student がなぜその回答スタイルを学んだのか説明できません。

Response distillation の品質は、teacher 出力が student に学ばせるのに適しているかに依存します。Teacher が長く、流暢で、専門家らしく答えることは、訓練に適していることを意味しません。訓練サンプルは安定し、検証可能で、目標形式に合い、拒否と境界ケースを含むべきです。そうでなければ student が学ぶのは teacher の口調であり、デプロイ可能なドメイン能力ではありません。

蒸留サンプルには、できれば次を同時に残します。

```text
prompt
retrieved_context / citations
teacher_response
teacher_model
teacher_prompt_version
generation_config
filter_status
review_notes
source_group
```

これらのフィールドは後続のフィルタ、分割、評価に使われます。

## 5. Logit Distillation

Response distillation は student に 1 つの目標回答だけを与えます。Logit distillation は、teacher の語彙上の soft distribution も student に学ばせようとします。

```text
teacher_logits: FloatTensor[B, T, V]
student_logits: FloatTensor[B, T, V]

teacher_probs_T = softmax(teacher_logits / temperature)
student_log_probs_T = log_softmax(student_logits / temperature)

loss = CE(student_logits, hard_labels)
     + lambda * temperature^2 * KL(teacher_probs_T || student_probs_T)
```

PyTorch ではよく次の形を使います。

```python
kl = F.kl_div(
    student_log_probs_T,
    teacher_probs_T,
    reduction="batchmean",
)
```

ここでは KL の向きが重要です。student の分布を teacher の分布に近づけたいからです。

soft distribution は「どの誤答が正解に近いか」を表現できます。しかしはるかに高価です。大きな語彙 logits を保存するかオンライン計算する必要があり、teacher のバイアスや誤った自信も取り込みます。

Logit distillation の境界も明確です。

1. teacher と student の tokenizer が異なる場合、語彙分布を直接そろえるのは難しい。
2. `(B, T, V)` logits を完全保存するとコストが高い。
3. top-k logits だけを保存する、または訓練時にオンラインで teacher に問い合わせる方法がある。
4. teacher の soft distribution にも誤った自信が含まれることがある。
5. 高リスク領域では、teacher 確率が高いからといって出力を事実として扱ってはいけない。

教材プロジェクトでは、まず response distillation を実装し、logit distillation は発展実験として扱います。

## 6. Preference Distillation

teacher が標準回答を直接出すのではなく、2 つの回答を比較する場合もあります。

```json
{
  "prompt": "...",
  "chosen": "更好、更安全、更有依据的答案",
  "rejected": "更差、幻觉或越界的答案",
  "reason": "chosen 引用了证据，rejected 编造了来源"
}
```

選好データは、悪い回答を避けるようモデルを訓練するのに向いています。特に安全、拒否、形式安定性に向いています。ただし、訓練目標がより複雑になるため、本講座の主線の最初の一歩ではありません。

## 7. 蒸留データのフィルタリング

Teacher 出力をそのまま信用してはいけません。少なくとも次をフィルタします。

- 質問に答えているか。一般論の説明になっていないか。
- 与えられた資料に支えられているか。
- 実在する出所を引用しているか。
- 出力形式に従っているか。
- プライバシー、法律/医療の越境助言、危険な助言を含まないか。
- 必要な不確実性を表現しているか。

フィルタは 3 層にできます。

```text
rule filter: schema、長さ、センシティブ語、citation existence
model filter: レビューモデルに support と risk を判定させる
human review: 高リスクサンプルを人間が抽検または全検する
```

フィルタは「見た目がきれいな」回答だけを残すべきではありません。ドメイン student には次も学ばせる必要があります。

```text
資料不足時に拒否する
高リスク時に人間へ回す
引用がないとき結論を出さない
形式が不完全なとき修正または拒否する
```

フィルタ過程ですべての拒否、失敗、境界サンプルを削除すると、student は過度に自信を持ちます。よい蒸留データセットは、正しい回答と安全境界の両方を含むべきです。

蒸留サンプルのライフサイクルは次のように固定できます。

```text
eval gap
  -> teacher prompt
  -> teacher response
  -> rule/model/human filter
  -> approved distill jsonl
  -> student SFT / LoRA
  -> same eval set comparison
```

フィルタ出力は passed/failed だけにせず、少なくとも拒否理由を記録します。

| reject_reason | 例 |
| --- | --- |
| `no_citation` | 回答は完整だが出所がない |
| `unsupported_claim` | 引用が結論を支えていない |
| `unsafe_advice` | 法律/医療の越境助言 |
| `bad_format` | JSON が parse できない、またはフィールド欠落 |
| `privacy_risk` | 匿名化されていない個人情報を復唱している |
| `over_confident` | 資料不足なのに確定的結論を出している |

### teacher 自身を唯一のレビュアーにしない

よくある誤りは次です。

```text
teacher が回答を生成する
-> teacher が回答の良し悪しを判断する
-> 通過サンプルで student を訓練する
```

これでは teacher の盲点がそのまま student に渡ります。より安定したフィルタでは次を混ぜます。

```text
ルールチェック: schema、citation、長さ、センシティブフィールド
根拠チェック: 回答が context に支えられているか
モデル補助: 別の judge model が scoring を補助
人間抽検: 高リスクサンプルは必ず人間が見る
```

特に法律・医療場面では、teacher 出力が専門家らしく見えるほど、根拠捏造や越境助言を見落としやすくなります。

## 8. Student 訓練

Student 訓練は本質的には SFT / LoRA に戻ります。

```text
distilled dataset
  -> train/val/test split by source
  -> SFT or LoRA
  -> compare base / teacher / student
```

base student を対照として残す必要があります。そうでなければ student が良くなったのか、元モデルが最初からできていたのか判断できません。

## 9. 比較評価

蒸留レポートでは、少なくとも 3 者を比較します。

```text
base student: 蒸留前の小モデル
teacher: 蒸留データを生成した大モデル
student: 蒸留後の小モデル
```

平均点だけでなく、slice も見ます。

- 通常タスク。
- 長文脈タスク。
- 無回答/拒否タスク。
- 高リスク法律/医療タスク。
- 厳格形式タスク。

優秀な student は必ずしも teacher を超える必要はありません。しかし目標コストのもとで teacher に近づき、base student を明確に上回るべきです。

蒸留評価ではコストとレイテンシも記録します。Student の目標は通常、teacher を絶対的に上回ることではなく、より低コストで十分な品質に到達することです。

```text
quality: eval score / human score / citation support
cost: 1000 リクエストあたりのコスト
latency: p50 / p95
safety: 高リスク拒否と越境回答
```

student の品質が少し低くても、コストが大きく下がり、安全指標が退化しないなら、よりデプロイに適している可能性があります。逆に、平均点が teacher に近くても、高リスク slice で明確に退化するなら、本番投入できません。

## 10. 必須実験

- RAG + teacher で小さな蒸留サンプル群を生成する。
- フィルタスクリプトを書き、通過率と拒否理由を集計する。
- 同じ student base で SFT baseline と distill dataset を訓練する。
- 同じ eval set 上で base / teacher / student を比較する。
- teacher の誤りサンプルを作り、フィルタが一部を止められることを検証する。

## 11. 失敗パターン

- Teacher hallucination を student が学ぶ。
- 蒸留データが同質すぎる: student はテンプレートだけを学び、能力を学ばない。
- teacher の見栄えのよい回答だけを残す: 拒否と失敗境界が欠ける。
- teacher 自身で teacher データを評価する: 品質フィルタが過度に楽観的になる。
- Student 容量が小さすぎる: 目標能力が移らない。
- 比較に base student が含まれない: 蒸留の貢献を証明できない。

## 12. テストによる受け入れ

この章の tests では、少なくとも次を検証します。

1. 蒸留サンプルが teacher model、prompt version、filter status を記録している。
2. フィルタが citation なし、空回答、形式エラーのサンプルを拒否できる。
3. train / val / test split が蒸留後サンプルをランダムに切って source を漏洩させていない。
4. student 訓練前後で tiny eval 上に観察可能な差がある。
5. eval report に base、teacher、student の 3 列が含まれる。

## 13. この章の記憶のアンカーと境界

この章で最も重要な一文は次です。

> 蒸留は大きなモデルのすべての能力をコピーすることではなく、明確なタスク分布上の検証可能な振る舞いを圧縮することである。

覚えておくこと:

1. response distillation は最も単純だが、teacher 回答品質に強く依存する。
2. logit distillation はより細かいが、vocab alignment が必要でコストも高い。
3. preference distillation は「どちらの回答がよいか」を学ぶのに適しているが、訓練目標はより複雑である。
4. 蒸留データでは hallucination、越境助言、形式エラーを必ずフィルタする。
5. student は base student、teacher と同じ問題で比較しなければならない。

この章では student が本当に良くなったことはまだ証明していません。次章では評価に進みます。

## 14. 次章

蒸留によって小モデルは安くなりますが、「答えられているように見える」ことはまだ証拠ではありません。次章ではモデル評価に入り、モデルが本当に良くなったこと、そしてまだどこで失敗するかをどう証明するかを扱います。
