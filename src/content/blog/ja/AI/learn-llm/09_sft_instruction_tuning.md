---
title: "第 9 章: SFT 指示微調整"
description: "第 8 章では causal LM の読み込みと微調整を学びました。しかし causal LM の元の目的は、あくまで「続きを書く」ことです。ユーザーが本当に望むのは、タスク、制約、文脈、質問をモデルに与え、指示に従った使える回答を出してもらうことです。"
author: LienJack
pubDate: 2026-06-01
locale: ja
tags:
  - LLM 学習
  - LLM
  - AI
---
# 第 9 章: SFT 指示微調整

## 1. この章が本当に解く問題

第 8 章では causal LM の読み込みと微調整を学びました。しかし causal LM の元の目的は、あくまで「続きを書く」ことです。ユーザーが本当に望むのは、タスク、制約、文脈、質問をモデルに与え、指示に従った使える回答を出してもらうことです。

SFT の核心は、魔法のように「モデルを賢くする」ことではありません。高品質な教師ありサンプルを使い、モデルの振る舞いを続き生成の分布から指示応答の分布へ引き寄せることです。

中心的な問い:

```text
モデルを「テキストの続きを書く」状態から、「system / user / assistant のメッセージ形式に従って答える」状態へどう変えるのか。
```

継続して使っている契約の例では、SFT の目的は「以下の条項を分析してください」をモデルに復唱させることではありません。リスク JSON、根拠の境界、人間によるレビューの印だけを出力させることです。

この章で使うのは教材用の toy SFT データです。サンプル数は少なく、境界は明確で、目的はパイプライン検証です。これはドメイン級 SFT データを代表するものではありません。本物の契約リスクモデルには、第 11 章のデータソース、匿名化、重複除去、ライセンス、リスクタグ、固定 eval が必要です。そうでなければ、第 9 章の訓練がどれだけ順調でも、小さなフォーマットを学んだだけです。

## 2. 問いの連鎖

1. Base LM は続きを書けるが、ユーザー意図に従うとは限らない。
2. 指示サンプルはタスクを `instruction -> response` または複数ターンの messages として表現する。
3. Chat template は構造化メッセージを、モデルが期待する token 列に変える。
4. Label mask はどの token が loss に参加するかを決める。通常は assistant の回答だけを訓練する。
5. Train / val / test split により、記憶を能力と見誤ることを防ぐ。
6. 訓練前後では、loss だけでなく同じ prompt の振る舞いを比較する。
7. 次章の問い: SFT の全量更新は高価である。少数のパラメータだけを訓練できないか。

## 3. Concept Card

| 概念 | 数学的対象 | Shape | コード上の対象 | 実験で見る対象 |
| --- | --- | --- | --- | --- |
| instruction | タスク記述 | text | `messages[user]` | 指示の網羅性 |
| response | 目標回答 | text | `messages[assistant]` | スタイルと事実 |
| chat template | 形式化関数 | text -> ids | `apply_chat_template` | テンプレート一貫性 |
| labels | 教師 token | `(B, T)` | `labels` | `-100` mask |
| split | 汎化の見積もり | dataset partitions | `train/val/test` | 漏洩チェック |
| eval prompts | 振る舞い probe | list[str] | `before_after.md` | 出力比較 |

## 4. データ形式の契約

最小 SFT サンプルは構造化したまま保存します。結合済みの 1 本の文字列だけを保存しないでください。

```json
{
  "id": "legal_0001",
  "messages": [
    {"role": "system", "content": "你是谨慎的法律文本助手。"},
    {"role": "user", "content": "解释这段合同条款的风险。"},
    {"role": "assistant", "content": "这段条款的主要风险是..."}
  ],
  "source": "manual",
  "risk_tags": ["contract", "not_legal_advice"]
}
```

構造化フィールドがあると、後続のクリーニング、重複除去、匿名化、評価、監査で出所を追跡できます。いったん plain text に潰してから役割境界を復元するのは非常に大変です。

SFT データでは「タスク」と「スタイル」の両方を制御する必要があります。サンプルが礼儀正しく答えることだけを教えると、モデルはきれいな空文を学ぶかもしれません。事実回答だけを与えると、system 制約を無視するかもしれません。高品質な SFT サンプルには通常、次が含まれます。

```text
タスク: ユーザーがモデルに何をしてほしいのか
文脈: 回答がどの資料に依存すべきか
形式: 出力は自然言語、JSON、リスト、表のどれか
境界: 分からないときにどう言うか、高リスク時にどう扱うか
回答: 上記制約を満たす目標出力
```

後続の法律・医療プロジェクトでは、`risk_tags`、`source_group`、`needs_human_review` は余計な負担ではありません。SFT の振る舞いの境界を訓練する材料です。

## 5. Label Mask

SFT でも causal LM loss を使いますが、すべての token が loss に参加すべきではありません。

```text
system:    振る舞い制約。通常、モデルに復唱させない
user:      文脈。通常、モデルに復唱させない
assistant: 目標回答。loss に参加する
padding:   無効位置。必ず -100 にする
```

訓練 batch の中心的な shape:

```text
input_ids:      LongTensor[B, T]
attention_mask: LongTensor[B, T]
labels:         LongTensor[B, T]
```

`labels[i, j] = -100` は、その位置を loss が無視するという意味です。mask が間違っていると、モデルはユーザー質問を復唱したり、padding を目標 token として扱ったりします。

### label mask は token span で構築し、文字列推測に頼らない

SFT で最も起きやすい誤りは、`-100` を忘れることではなく、どの token を mask すべきかを間違えることです。

assistant の回答位置を文字列検索で探してはいけません。chat template は special token、改行、空白、role marker を追加する可能性があります。文字列位置と token 位置は同じではありません。

より堅牢な流れは次です。

```text
prompt_messages = system + user + assistant_prefix
full_messages   = system + user + assistant_answer

prompt_ids = tokenize(apply_chat_template(prompt_messages))
full_ids   = tokenize(apply_chat_template(full_messages))

labels = full_ids.copy()
labels[:len(prompt_ids)] = -100
```

これにより次を保証できます。

```text
system/user/assistant_prefix: 文脈としてだけ使い、loss に含めない
assistant answer/eos:        目標出力として loss に含める
padding:                     -100 にする
```

訓練前には必ず batch を人手で decode します。

```text
decode(input_ids): モデルが実際に見ているもの
decode(labels != -100): モデルが実際に学ばされているもの
```

この確認は、training loss より早く事故を見つけます。

## 6. Chat Template の一貫性

instruct model ごとにメッセージ境界は異なります。tokenizer 付属の template を優先して使います。

```python
text = tokenizer.apply_chat_template(
    messages,
    tokenize=False,
    add_generation_prompt=False,
)
```

訓練、検証、推論では同じ template を使わなければなりません。そうでないと、訓練時には 1 つの形式を見て、推論時には別の形式を見ることになり、効果が落ちますが原因は分かりにくくなります。

chat template がない base model では、プロジェクト内に template version を明示的に保存します。

```text
<|system|>
...
<|user|>
...
<|assistant|>
...
```

template はモデルインターフェースの一部であり、思いつきで連結する文字列ではありません。

## 7. データ分割と漏洩

SFT データは行をランダムに切るだけでは不十分です。少なくとも次を確認します。

- 同じ出典文書が train と test の両方に出てはいけない。
- 同じ質問の軽微な言い換えが test に漏れてはいけない。
- ドメイン用語、形式テンプレート、免責文が train にしか出ない状態を避ける。
- 高リスク拒否サンプルは別の評価セットとして保持する。

推奨分割:

```text
train: パラメータを訓練する
val:   学習率、epoch、早期停止、template 問題を調整する
test:  最終レポートでのみ使う
```

データ量が非常に少ない場合は、固定 eval prompts を振る舞い probe として使えます。ただし、正式な test set の代替ではないことを認める必要があります。

## 8. 最小訓練ワークフロー

```text
raw jsonl
  -> schema validate
  -> de-duplicate
  -> split by source/group
  -> apply chat template
  -> tokenize
  -> build labels with assistant-only loss
  -> train
  -> eval loss + behavior prompts
  -> save model/tokenizer/report
```

訓練設定では少なくとも次を記録します。

- base model id と revision。
- tokenizer / chat template version。
- max sequence length。
- train / val / test split seed。
- learning rate、batch size、gradient accumulation、epochs。
- 全量微調整、LoRA、QLoRA のどれか。

訓練後に loss だけを見てはいけません。SFT の目的は振る舞いを変えることなので、固定の behavior probes を用意します。

```text
format probe: 指定 JSON で出力するか
refusal probe: 根拠不足時に拒否するか
style probe: system persona に従うか
safety probe: 高リスク問題を人間確認/注意喚起へ回すか
regression probe: 旧バージョンが答えられていたサンプルが退化していないか
```

これらの probe は小さくても構いませんが、固定する必要があります。各訓練後に同じ prompt で base と tuned の出力を比較してこそ、SFT が本当に目標方向へ振る舞いを動かしたか見えます。

継続して使う契約タスクでは、まず 5 つの probe を固定できます。

| probe | 入力 | 期待される振る舞い |
| --- | --- | --- |
| format | 違約金過高条項の分析を求める | parse 可能な JSON を出力する |
| boundary | 条項だけを与え、管轄区を提供しない | `risk_level="unknown"` または人間レビューを促す |
| citation | 根拠説明を求める | source id を捏造しない |
| refusal | 資料不足なのに最終法的結論を求める | 最終結論の提示を拒否する |
| regression | 責任上限欠落サンプル | `needs_human_review=true` を引き続き付ける |

## 9. 必須実験

- 訓練前後比較: 同じ instruction prompt に対する出力変化を見る。
- tiny SFT overfit: 20 件の高品質サンプルで、パイプラインが形式と内容を学べることを証明する。
- 誤った mask の対照: user token を loss に参加させ、モデルが復唱しやすくなることを観察する。
- assistant span ずれ実験: assistant 冒頭を意図的に mask しすぎ/しなさすぎにし、冒頭欠落、role marker 復唱、形式不安定を観察する。
- template mismatch 対照: 訓練と推論で異なる template を使い、出力形式の劣化を見る。
- val loss と人間による振る舞い観察を並べて報告する。

## 10. 失敗パターン

- データ形式が混乱している: あるサンプルは `prompt/completion`、別のサンプルは `messages` を使い、訓練スクリプトが silently にフィールドを飛ばす。
- response 品質が低い: SFT は低品質回答を模倣する。汚いラベルは訓練では修復できない。
- 形式だけを訓練する: モデルは「まず、次に、最後に」を学ぶが、事実能力は伸びない。
- 高リスク場面の拒否サンプルがない: 法律/医療モデルが過度に自信を持つ。
- eval prompts が漏洩する: 訓練前後比較はよく見えるが、実際はサンプルを記憶しただけ。
- max length が assistant answer を切り落とす: モデルは半文を出力するよう訓練される。
- 文字列検索で label mask を作る: template 内の special token、空白、改行により token span がずれる。

## 11. テストによる受け入れ

この章の tests では、少なくとも次を検証します。

1. SFT jsonl サンプルの schema が合法であり、`messages` と有効な role を含む。
2. `apply_chat_template` 後の訓練テキストに assistant 境界が含まれる。
3. label mask 内の user/system/pad 位置が `-100` である。
4. train / val / test split に重複 `id` または重複 source group がない。
5. 人手またはテストで batch を decode し、`labels != -100` が assistant answer だけに対応することを確認する。
6. tiny SFT 訓練後に loss が下がり、保存ディレクトリから再読み込みできる。

## 12. この章の記憶のアンカーと境界

この章で最も重要な一文は次です。

> SFT はモデルに「タスクを理解させる」魔法ではなく、高品質サンプルを使ってモデルの振る舞いを続き生成分布から指示応答分布へ押し出す方法である。

覚えておくこと:

1. chat template はモデルインターフェースであり、文字列装飾ではない。
2. 通常、assistant の回答だけを loss に参加させる。
3. label mask は token span に基づいて作る。
4. train/val/test は source group に基づき、漏洩を防ぐ。
5. behavior probes と人間の観察は train loss では代替できない。

この章では微調整コストの問題はまだ解いていません。次章では LoRA / QLoRA に進みます。

## 13. 次章

SFT はモデルの振る舞いを変えられますが、全量微調整では大量のパラメータを更新するため、GPU メモリと保存コストが高くなります。次章では LoRA / QLoRA に入り、少数の adapter パラメータだけを訓練する方法を扱います。
