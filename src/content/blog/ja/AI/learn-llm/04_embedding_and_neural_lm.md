---
title: "第 4 章: Embedding とニューラル言語モデル"
description: "Tokenizer によって、テキストは token id になりました。しかし token id はただの番号です。"
author: LienJack
pubDate: 2026-06-01
locale: ja
tags:
  - LLM 学習
  - LLM
  - AI
---
# 第 4 章: Embedding とニューラル言語モデル

## 1. この章が本当に解く問題

Tokenizer によって、テキストは token id になりました。しかし token id はただの番号です。

```text
合同 -> 17
违约金 -> 42
过高 -> 91
```

`42` が `17` より法律的な意味に「近い」わけではありません。番号は lookup index であって、意味そのものではありません。

したがって、この章の最初の問いは次です。

> モデルは離散的な token id を、どう訓練可能なベクトルに変えるのか。

しかし、id をベクトルにするだけでは足りません。次の文を見てください。

```text
合同 违约金 过高 ， 它 可能 存在 风险
```

モデルが現在の token「它」しか見ていない場合、それが「违约金」を指すのか「合同」を指すのか分かりません。そこでこの章には 2 つ目の問いがあります。

> Attention に入る前に、単純な文脈窓を使って、モデルが現在の token だけでなく過去も見られるようにできるか。

この章で補う能力は次です。

```text
token id -> embedding -> causal context vector -> next-token logits
```

## 2. 問いの連鎖

1. 出発点: token id は離散的な番号であり、id の大小に意味的距離はない。
2. 問題 1: one-hot は次元が vocab と同じで、疎であり、類似性を表せない。
3. 新しい仕組み 1: embedding table が token id を dense vector に変換する。
4. 新しい境界 1: 現在の token だけを lookup しても、文脈は分からない。
5. 問題 2: next-token prediction は、多くの場合、前の複数 token に依存する。
6. 新しい仕組み 2: fixed causal context mixer で過去 token を集約する。
7. 新しい境界 2: 固定平均や固定窓では、「誰を見るべきか」を動的に決められない。
8. 次章の問い: 各位置が現在の文脈に応じて情報源を動的に選ぶにはどうすればよいか。ここから causal self-attention が出てくる。

## 3. Concept Card

| 概念 | 数学的対象 | Shape | コード上の対象 | 実験で見る対象 |
| --- | --- | --- | --- | --- |
| embedding table | 訓練可能な行列 | `(V, D)` | `nn.Embedding` | 行更新の確認 |
| token embeddings | lookup 結果 | `(B, T, D)` | `hidden` | norm / cosine |
| causal context | 過去を集約したベクトル | `(B, T, D)` | `causal_mean()` / `context_mixer` | no-future test |
| lm head | 語彙へ戻す射影 | `(D, V)` | `nn.Linear` | logits shape |
| pad row | 訓練しないプレースホルダー行 | `(D,)` | `padding_idx` | pad が更新されない |

## 4. Shape の契約

```text
input_ids: LongTensor[B, T]
attention_mask: LongTensor[B, T]
embedding.weight: FloatTensor[V, D]
hidden: FloatTensor[B, T, D]
context: FloatTensor[B, T, D]
logits: FloatTensor[B, T, V]
labels: LongTensor[B, T]
loss: scalar
```

`nn.Embedding` の入力は整数 id でなければなりません。出力は勾配計算に参加できますが、`input_ids` 自体は微分できません。

Embedding は訓練可能な lookup table と考えられます。

```text
input_ids[b, t] = 42
hidden[b, t] = embedding.weight[42]
```

backpropagation では、batch に出現した token の行だけが勾配を受け取ります。出現しなかった token はその step では更新されません。これは重要です。低頻度 token の学習が遅いのは、それらが「難しい」からではなく、訓練信号が少ないからです。

`padding_idx` も見落としやすい細部です。pad token の embedding が普通に更新されると、モデルは padding に何らかの「意味」を学んでしまいます。しかし padding は本来ただのプレースホルダーです。後続の attention mask、label mask、padding embedding は、pad が訓練を汚染しないよう一緒に機能する必要があります。

## 5. 最小実装: 現在 token モデルから causal context モデルへ

まず最も弱い版を見ます。

```python
class CurrentTokenLM(nn.Module):
    def __init__(self, vocab_size: int, hidden_dim: int, padding_idx: int | None = None) -> None:
        super().__init__()
        self.token_embedding = nn.Embedding(
            vocab_size,
            hidden_dim,
            padding_idx=padding_idx,
        )
        self.lm_head = nn.Linear(hidden_dim, vocab_size)

    def forward(self, input_ids: torch.Tensor) -> torch.Tensor:
        hidden = self.token_embedding(input_ids)   # [B, T, D]
        logits = self.lm_head(hidden)              # [B, T, V]
        return logits
```

このモデルが解くのは次です。

```text
id -> vector -> logits
```

しかし文脈は解いていません。各位置は自分自身しか見ません。

モデルが少なくとも過去を見られるように、最も単純な causal mean mixer を追加します。

```python
def causal_mean(hidden: torch.Tensor, attention_mask: torch.Tensor | None = None) -> torch.Tensor:
    """
    hidden: [B, T, D]
    attention_mask: [B, T], 1 表示有效 token，0 表示 pad
    return: [B, T, D]
    """
    bsz, seq_len, dim = hidden.shape
    device = hidden.device

    causal = torch.tril(torch.ones(seq_len, seq_len, device=device))  # [T, T]

    if attention_mask is not None:
        key_mask = attention_mask[:, None, :].float()                 # [B, 1, T]
        weights = causal[None, :, :] * key_mask                       # [B, T, T]
    else:
        weights = causal[None, :, :].expand(bsz, -1, -1)              # [B, T, T]

    denom = weights.sum(dim=-1, keepdim=True).clamp_min(1.0)
    weights = weights / denom

    return weights @ hidden                                           # [B, T, D]
```

ここでの `attention_mask` は主に key を mask します。有効 token が pad を過去情報として読んではいけないからです。query 位置そのものが pad の場合、上の実装では前の有効 token を集約する可能性があります。これらの pad query の label が `-100` であれば、通常 loss には影響しません。ただし中間 hidden を可視化、pooling、下流モジュールに使うなら、返す前に query mask で pad query の出力もゼロにする方がよいです。

モデルは次のようになります。

```python
class CausalMeanLanguageModel(nn.Module):
    def __init__(self, vocab_size: int, hidden_dim: int, padding_idx: int | None = None) -> None:
        super().__init__()
        self.token_embedding = nn.Embedding(
            vocab_size,
            hidden_dim,
            padding_idx=padding_idx,
        )
        self.mixer = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.GELU(),
            nn.Linear(hidden_dim, hidden_dim),
        )
        self.lm_head = nn.Linear(hidden_dim, vocab_size)

    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor | None = None,
    ) -> torch.Tensor:
        hidden = self.token_embedding(input_ids)              # [B, T, D]
        context = causal_mean(hidden, attention_mask)         # [B, T, D]
        context = self.mixer(context)                         # [B, T, D]
        logits = self.lm_head(context)                        # [B, T, V]
        return logits
```

これはまだ Attention ではありません。過去 token を平均しているだけです。価値は、中間段階を見せてくれることにあります。

```text
現在 token モデル: 自分だけを見る
causal mean モデル: 過去を見るが、各過去位置の重みは固定
attention モデル: 過去を見て、各位置が誰を見るかを動的に決める
```

この章では位置の問題も正式には解いていません。Causal mean は順番に過去を累積するため、暗黙に位置順序を使っています。しかし本物の GPT には、同じ token が 2 番目にある場合と 20 番目にある場合を区別するために、position embedding や RoPE のような仕組みが必要です。この不足は第 7 章 Mini GPT で補います。

### 重要な境界: 文脈集約は causal でなければならない

よくある誤った書き方は次です。

```python
context = hidden.mean(dim=1, keepdim=True).expand_as(hidden)
```

これでは 1 番目の位置も 5 番目の位置の情報を見てしまいます。training loss はきれいに見えるかもしれませんが、モデルは未来を覗いています。

言語モデルの文脈集約は、必ず次を満たす必要があります。

```text
位置 i の出力は、位置 <= i の token だけに依存できる
```

したがって、この章の tests は shape を確認するだけでは不十分です。次も確認しなければなりません。

```text
未来の token を変更しても、過去位置の logits は変わらない。
```

## 6. 必須実験

- 現在 token LM と causal mean LM を比較し、tiny corpus の overfit 速度を見る。
- `embedding.weight.grad` を確認する。出現した token 行だけに勾配があるべきである。
- `padding_idx` を確認する。pad embedding 行は更新されるべきではない。
- 未来の token を変更し、過去位置の logits が変わらないことを検証する。
- 意図的に non-causal mean を使い、training loss は不自然に低いが生成品質が悪化することを観察する。
- いくつかの token embedding の cosine similarity を可視化し、訓練前後の変化を見る。

## 7. 失敗パターン

- vocab size と tokenizer が一致しない: embedding lookup が範囲外になる。
- `padding_idx` を設定していない: pad embedding も「意味」を学んでしまう。
- 位置ごとの MLP だけを書く: neural LM に見えるが、文脈能力がまったくない。
- 系列全体の mean pooling を使う: モデルが未来を覗き、training loss が不自然に低くなる。
- hidden_dim が小さすぎる: モデル容量が足りず、tiny corpus すら過学習しにくい。
- embedding が最初から意味を持つと思い込む: 意味は訓練目標とデータから生じるのであり、id の順序から生じるのではない。

## 8. テストによる受け入れ

この章の tests では、少なくとも次を検証します。

1. embedding の出力 shape が `(B, T, D)` である。
2. logits の出力 shape が `(B, T, V)` である。
3. 1 step の訓練後、出現した token の embedding が更新される。
4. `padding_idx` を設定すると、pad token embedding が更新されない。
5. causal context mixer の出力 shape が正しい。
6. 未来 token を変更しても、過去位置の logits が変わらない。
7. 意図的に non-causal pooling を使った場合、no-future test が失敗する。
8. tiny corpus で loss が下がる。

## 9. この章の記憶のアンカーと境界

この章では 2 つの問題を解きました。

1. token id には意味がない。embedding table によって id は訓練可能なベクトルになる。
2. 現在 token だけでは足りない。causal context mixer によって、モデルは少なくとも過去を見られる。

しかしこの章では、次の問題はまだ解いていません。

```text
異なる過去 token の重要度は、どう動的に変わるべきか。
```

固定平均では「合同」「违约金」「它」が混ざってしまいます。しかしモデルが「它」を見たとき、本当に重点的に振り返るべきなのは「违约金」かもしれません。次章の Attention は、この「誰を動的に見るか」という問題を解くためのものです。
