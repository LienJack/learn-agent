---
title: "第 7 章: Mini GPT をゼロから実装する"
description: "前の章では、LM 目的、tokenizer、embedding、attention、block をそれぞれ実装しました。この章では、それらを decoder-only language model として組み合わせ、訓練、保存、読み込み、生成まで行えるようにします。"
author: LienJack
pubDate: 2026-06-01
locale: ja
tags:
  - LLM 学習
  - LLM
  - AI
---
# 第 7 章: Mini GPT をゼロから実装する

## 1. この章が本当に解く問題

前の章では、LM 目的、tokenizer、embedding、attention、block をそれぞれ実装しました。この章では、それらを decoder-only language model として組み合わせ、訓練、保存、読み込み、生成まで行えるようにします。

しかし block をつないで forward が動くことは、再現可能な GPT を持つことと同じではありません。本当に使える Mini GPT は、入力テキストがどう id になるのか、位置をどう符号化するのか、生成時に文脈をどう crop するのか、checkpoint が推論や継続訓練を復元するのに十分かを説明できなければなりません。

中心的な問い:

```text
すべての局所的な仕組みをつないだあと、最小 GPT にはどんな工程上の契約がまだ必要なのか。
```

## 2. 問いの連鎖

1. LM 目的が教師信号を定義する。
2. Tokenizer がテキストを id に変える。
3. Embedding と position embedding が入力表現を与える。
4. Transformer blocks が causal context mixing を行う。
5. LM head が next-token logits を出力する。
6. Checkpoint は重みだけでなく、設定、tokenizer、生成設定、必要な訓練状態も保存する。
7. 次章の問い: 現実にはゼロから訓練するのは高価すぎる。では、オープンソースモデルのワークフローをどう再利用するのか。

## 3. Concept Card

| 概念 | 数学的対象 | Shape | コード上の対象 | 実験で見る対象 |
| --- | --- | --- | --- | --- |
| token embedding | token 表現 | `(V, D)` | `tok_emb` | パラメータ数 |
| position embedding | 位置表現 | `(T, D)` | `pos_emb` | 文脈長 |
| blocks | 積み重ね変換 | `(B, T, D)` | `nn.ModuleList` | 層数と loss |
| lm head | 語彙射影 | `(D, V)` | `lm_head` | logits |
| checkpoint | 状態スナップショット | ファイル | `save/load` | 生成の再現性 |

この章は、第 1-6 章の部品を組み立てて閉ループにします。

| 出典章 | 部品 | Mini GPT 内での位置 |
| --- | --- | --- |
| 第 1 章 | 訓練ループ | `loss.backward()` / `optimizer.step()` |
| 第 2 章 | next-token loss | `labels` / cross entropy |
| 第 3 章 | tokenizer / dataset | `input_ids` / `attention_mask` |
| 第 4 章 | token embedding | `tok_emb(input_ids)` |
| 第 5 章 | causal attention | block 内部の mask |
| 第 6 章 | transformer block | `nn.ModuleList(blocks)` |

## 4. Shape の契約

```text
input_ids: LongTensor[B, T], T <= block_size
positions: LongTensor[T]
hidden: FloatTensor[B, T, D]
logits: FloatTensor[B, T, V]
labels: LongTensor[B, T]
loss: scalar
```

生成時は、各 step で最後の位置の logits だけを使います。

```text
next_logits = logits[:, -1, :]
next_id = sample(next_logits)
input_ids = cat(input_ids, next_id)
```

Mini GPT の forward は訓練系列全体を一度に処理しますが、`generate` はループで呼び出します。

```text
prompt ids
-> forward
-> 最後の位置の logits を取る
-> next token を sampling
-> append
-> block_size を超えたら左側の履歴を crop
-> 繰り返す
```

これが自己回帰生成です。遅いですが汎用的です。各新 token が、それまでに生成されたすべての文脈に依存するからです。後続のデプロイ章で出てくる prefill、decode、KV cache は、本質的にはこのループを高速化するためのものです。

## 5. 最小実装構造

この章のコードには少なくとも次が含まれます。

- `MiniGPTConfig`
- `MiniGPT`
- `train_mini_gpt.py`
- `generate_text.py`
- `save_checkpoint(path, model, config, tokenizer)`
- `load_checkpoint(path)`

設定には `vocab_size`、`block_size`、`hidden_dim`、`num_layers`、`num_heads`、`dropout` を保存しなければなりません。そうしないと checkpoint を確実に読み込めません。

Checkpoint は `state_dict` を保存するだけではありません。再現可能な checkpoint には少なくとも次が必要です。

```text
model_config
model_state_dict
tokenizer vocab / special tokens
training step
random seed or generation config
```

教材版の `checkpoint.json` は次のようになります。

```json
{
  "model_config": {
    "vocab_size": 128,
    "block_size": 64,
    "hidden_dim": 128,
    "num_layers": 2,
    "num_heads": 4,
    "dropout": 0.1
  },
  "tokenizer": {
    "type": "simple_char",
    "special_tokens": ["<pad>", "<unk>", "<bos>", "<eos>"]
  },
  "training": {
    "global_step": 1200,
    "seed": 42,
    "best_val_loss": 1.73
  },
  "generation_config": {
    "temperature": 0.8,
    "top_k": 20,
    "max_new_tokens": 64
  }
}
```

重みだけを保存すると、読み込み時に vocab size、block size、tokenizer を間違えても、見かけ上は動くが振る舞いが一致しないモデルになります。第 7 章から、モデル工程は「モジュールを書く」段階から「実行を保存し、再現する」段階へ入ります。

### checkpoint は 2 種類ある: 推論復元と訓練復元

checkpoint が推論だけを目的とするなら、少なくとも次を保存します。

```text
model_config
model_state_dict
tokenizer vocab / special tokens
generation_config
```

しかし checkpoint が訓練再開もサポートするなら、モデル重みだけでは不十分です。さらに次が必要です。

```text
optimizer_state_dict
scheduler_state_dict
global_step / epoch
random seed
torch / cuda / numpy / python RNG state
best validation metric
training config
```

そうでなければ「モデルを読み込む」ことはできても、同じ訓練軌跡を再開することはできません。ここが、Mini GPT が toy model から engineering model へ移る境界です。モデルファイルが、どのデータ、設定、tokenizer、乱数状態から得られたのか説明できないなら、再現も監査も難しくなります。

Position embedding にも注意が必要です。Token embedding はモデルに「これは何の token か」を伝え、position embedding は「系列のどこにあるか」を伝えます。prompt 長が `block_size` を超えると position id は範囲外になります。生成時には文脈を crop するか、より長い文脈を扱える位置機構を使わなければなりません。

## 6. 必須実験

- tiny corpus overfit: GPT パイプライン全体が小さな語料を記憶できることを証明する。
- checkpoint round-trip: 保存後に読み込み、同じ prompt に対して同じ logits を出す。
- context crop: prompt が `block_size` を超えたら、直近の文脈だけを保持する。
- temperature / top-k: 生成品質と多様性を比較する。
- position embedding を外した対照: 同じ token の異なる位置を区別しにくいかを観察する。
- train/eval 生成対照: dropout を含むモデルは、`eval()` 下で greedy 生成が再現できるべきである。
- resume training: optimizer / scheduler / RNG を保存して継続訓練し、それらを保存しない場合との差を見る。

よい tiny corpus 実験は、美しいテキストを得るためではありません。次のパイプライン全体が途切れていないことを検証するためです。

```text
tokenizer -> dataset -> model -> loss -> backward -> optimizer -> checkpoint -> generate
```

tiny corpus すら overfit できない場合、まず疑うべきはデータのずれ、mask、学習率、モデル容量、訓練ループです。「モデルが小さすぎる」と考えるのは後です。この診断習慣は、後続の SFT、LoRA、ドメインプロジェクトでも続きます。

## 7. 失敗パターン

- position id が `block_size` を超える: embedding が範囲外になる。
- 重みだけ保存して config を保存しない: 読み込み時に構造が一致しない。
- tokenizer バージョンが変わる: 同じ prompt の id が一致しない。
- 訓練時は teacher forcing、生成時は自己回帰であり、両者の分布が異なる。
- `state_dict` だけを保存する: 推論は読み込めるが、同じ訓練軌跡は復元できない。
- generate 前に `model.eval()` を忘れる: dropout により greedy 生成も不安定になる。

## 8. テストによる受け入れ

この章の tests では、少なくとも次を検証します。

1. `MiniGPT(input_ids, labels)` が logits と loss を返す。
2. logits shape が `(B, T, V)` である。
3. causal mask が未来 token の漏洩を防ぐ。
4. checkpoint 読み込み後、各パラメータが一致する。
5. 訓練再開 checkpoint に optimizer、scheduler、global step、RNG state が含まれる。
6. `generate()` の出力が指定長を超えず、`<eos>` で停止できる。

## 9. この章の記憶のアンカーと境界

この章で最も重要な一文は次です。

> Mini GPT は block をつないだだけのものではなく、tokenizer から checkpoint、generate までを含む完全な言語モデル契約である。

覚えておくこと:

1. token embedding は「何の token か」を表す。
2. position embedding は「どの位置か」を表す。
3. blocks は causal context mixing を行う。
4. lm head は hidden state を vocab に戻す。
5. generate は自己回帰ループであり、1 回の forward で全文を出す処理ではない。
6. checkpoint はモデル、tokenizer、設定、必要な訓練状態を保存しなければならない。

この章では、現実プロジェクトでのモデル再利用やエコシステムのツールチェーンはまだ扱いません。次章では Hugging Face ワークフローに進みます。

## 10. 次章

ゼロから実装することで構造を理解できますが、現実のプロジェクトは通常 Hugging Face モデルから始めます。次章では、オープンソースモデルの読み込み、推論、微調整、保存を学びます。
