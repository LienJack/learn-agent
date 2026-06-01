---
title: "第 6 章: Transformer Block"
description: "第 5 章の causal self-attention によって、各 token は過去位置を動的に振り返れるようになりました。では、なぜ attention を何層も積み重ねるだけで GPT と呼べないのでしょうか。"
author: LienJack
pubDate: 2026-06-01
locale: ja
tags:
  - LLM 学習
  - LLM
  - AI
---
# 第 6 章: Transformer Block

## 1. この章が本当に解く問題

第 5 章の causal self-attention によって、各 token は過去位置を動的に振り返れるようになりました。では、なぜ attention を何層も積み重ねるだけで GPT と呼べないのでしょうか。

理由は、attention が 1 回の情報混合にすぎないからです。「現在位置がどの過去位置を見るべきか」には答えられますが、まだ 3 つの工学的問題を解いていません。

1. **表現力が足りない**: 1 つの attention 視点だけでは、局所的な組み合わせ、長距離参照、形式境界、引用関係を同時に扱いにくい。
2. **深く積むと不安定**: 層数が増えると、activation のスケールや勾配経路が訓練しにくくなる。
3. **混ぜるだけで加工しない**: attention は主に位置間の情報ルーティングを行うが、特徴を加工する位置ごとの非線形変換も必要である。

Transformer Block は、用語を積み上げるためではなく、attention を安定して積み重ねられる基本モジュールにするために登場します。

```text
multi-head: 異なる関係を並列に見る
residual: 直通経路を残す
LayerNorm: 特徴スケールを安定させる
FFN: 位置ごとの非線形加工を行う
Dropout: 訓練時に正則化する
```

中心的な問い:

```text
attention はどうすれば、深く積み重ねられ、安定して訓練できる LLM の基本モジュールになるのか。
```

## 2. 問いの連鎖

1. 出発点: 単頭 attention は過去を動的に見られるが、1 回の情報混合にすぎない。
2. 新しい問題 1: 1 つの head の表現視点は限られており、複数の関係を同時に学びにくい。
3. 新しい仕組み 1: multi-head attention は hidden dimension を複数の部分空間に分け、異なるルーティングを並列に学ぶ。
4. 新しい問題 2: 深く積むと、各層が表現を全面的に書き換えるため、勾配と情報伝達が不安定になる。
5. 新しい仕組み 2: residual connection によって、モジュールは増分だけを変更し、元の表現には直通経路が残る。
6. 新しい問題 3: 深層ネットワークでは activation のスケールが漂いやすい。
7. 新しい仕組み 3: LayerNorm は各位置の hidden 次元でスケールを安定させる。深い訓練には pre-norm がより向いている。
8. 新しい問題 4: attention は情報を混ぜるが、位置ごとの非線形加工も必要である。
9. 新しい仕組み 4: FFN は各位置に独立した MLP 変換をかける。
10. 次章の問い: 積み重ね可能な block ができたら、embedding、position、block、lm head をどう組み合わせて完全な Mini GPT にするのか。

## 3. Concept Card

| 概念 | 数学的対象 | Shape | コード上の対象 | 実験で見る対象 |
| --- | --- | --- | --- | --- |
| multi-head | 複数の attention 部分空間 | `(B, heads, T, Hd)` | `CausalSelfAttention` | head shape |
| residual | 恒等バイパス | `(B, T, D)` | `x + module(x)` | 勾配安定性 |
| LayerNorm | 特徴正規化 | `(B, T, D)` | `nn.LayerNorm` | 平均/分散 |
| FFN | 位置ごとの MLP | `(B, T, D)` | `FeedForward` | 容量比較 |
| dropout | 確率的正則化 | `(B, T, D)` | `nn.Dropout` | train/eval の違い |

## 4. Shape の契約

```text
x: FloatTensor[B, T, D]
num_heads: h
head_dim: D / h
qkv: FloatTensor[B, T, 3D]
q,k,v: FloatTensor[B, h, T, head_dim]
attn_out: FloatTensor[B, T, D]
ffn_out: FloatTensor[B, T, D]
block_out: FloatTensor[B, T, D]
```

`D % num_heads == 0` は厳密な制約です。そうでないと、各 head の次元を均等に分けられません。

Multi-head の直感は「複数の attention を平均する」ことではありません。hidden dimension を複数の部分空間に切り分け、異なる head が異なる関係を学べるようにします。ある head は局所的な隣接 token を好み、別の head は構文境界、さらに別の head は引用や形式マーカーを見るかもしれません。教材プロジェクトでは attention head を神格化する必要はありませんが、多頭が並列の情報ルーティング能力を提供することは理解しておきます。複数 head を `(B, T, D)` に結合した後は、通常 output projection によって各 head の情報を再混合します。

multi-head attention の mask は、attention score に broadcast できなければなりません。

```text
attn_scores: FloatTensor[B, h, T, T]
causal_mask: BoolTensor[1, 1, T, T] またはその形に broadcast 可能
```

mask が単頭の例でしか成立しない場合、multi-batch、multi-head では一部の head が未来を覗く可能性があります。

Residual connection は別の問題を解きます。モジュールは元の表現をすべて書き換えるのではなく、その上に増分変更を加えられます。residual がないと深層ネットワークは退化しやすくなります。residual があれば、勾配にもネットワークを抜けるより直接的な経路ができます。

LayerNorm は各位置の特徴スケールを安定させます。Pre-norm の形は次です。

```text
x = x + attention(layer_norm(x))
x = x + ffn(layer_norm(x))
```

深い Transformer では通常こちらの方が安定します。residual path が正規化されていない直通チャンネルとして残るからです。

LayerNorm は最後の hidden features 次元に対して正規化します。batch や sequence 次元ではありません。FFN は通常、まず hidden 次元を `4 * hidden_dim` などに拡張し、その後元の次元に戻します。

```text
FloatTensor[B, T, D] -> FloatTensor[B, T, 4D] -> FloatTensor[B, T, D]
```

## 5. 最小実装構造

```python
class TransformerBlock(nn.Module):
    def __init__(self, hidden_dim, num_heads, dropout):
        super().__init__()
        self.ln_1 = nn.LayerNorm(hidden_dim)
        self.attn = CausalSelfAttention(hidden_dim, num_heads, dropout)
        self.ln_2 = nn.LayerNorm(hidden_dim)
        self.ffn = FeedForward(hidden_dim, dropout)

    def forward(self, x):
        x = x + self.attn(self.ln_1(x))
        x = x + self.ffn(self.ln_2(x))
        return x
```

この章では pre-norm を優先して実装します。post-norm は比較実験として扱えますが、主経路ではありません。

### attention だけを積んでも足りない理由

attention だけのモデルでも、過去 token を現在位置へ混ぜることはできます。しかし 2 つの重要な能力が足りません。

第一に、「元の情報を保持する」安定したチャンネルがありません。各層が表現を強制的に書き換えるため、層が深くなるほど訓練が退化しやすくなります。residual connection は、各モジュールに増分だけを学ばせます。

```text
new_x = old_x + module(old_x)
```

第二に、位置ごとの非線形加工がありません。Attention は token 間で情報を交換し、FFN は各 token の内部で混ざった情報を再構成します。FFN がないと、モデルは「文脈を運ぶだけで特徴を加工できない」ものになりがちです。

したがって Transformer Block は attention の単なる包装ではなく、積み重ね可能な訓練単位です。

初学者は FFN を過小評価しがちです。Attention は位置間で情報を混合し、FFN は各位置の内部で非線形変換を行います。attention だけで FFN がない Transformer block は、表現力が明らかに制限されます。一方、FFN だけで attention がないと、文脈を動的に読めません。

Dropout も教材モデルでは残す価値があります。`model.train()` と `model.eval()` を区別せざるを得なくなるからです。第 1 章で作った訓練習慣はここでも再利用されます。同じ入力でも train モードでは dropout によりランダム性があり、eval モードでは安定するべきです。

この章を終えると、block を shape を保つ関数として見られるようになります。

```text
TransformerBlock: FloatTensor[B, T, D] -> FloatTensor[B, T, D]
```

shape が変わらないからこそ、多層に積み重ねやすくなります。

## 6. 必須実験

- head 数を変えても出力 shape が変わらないことを検証する。
- residual の有無で training loss と gradient norm を比較する。
- train/eval 下で dropout の挙動を比較する。
- 1、2、4 層の block を積み、small corpus の overfit 能力を観察する。
- 意図的に attention だけを積み、residual / norm / FFN を入れず、深層訓練の不安定さや表現不足を観察する。

## 7. 失敗パターン

- `.contiguous()` を忘れて直接 `view` する: multi-head reshape がエラーになるか、異常な挙動をする。
- mask broadcast の次元を間違える: 一部の batch/head が未来を覗く。
- FFN hidden size が小さすぎる: block の容量が不足する。
- residual がない: 深層訓練が退化しやすい。
- LayerNorm を batch norm のように理解する: 正規化次元を間違え、訓練挙動が変形する。

## 8. テストによる受け入れ

この章の tests では、少なくとも次を検証します。

1. `hidden_dim % num_heads != 0` のとき明示的にエラーを出す。
2. block の入力 shape と出力 shape が完全に一致する。
3. causal mask がすべての head に効く。
4. train/eval で dropout の挙動が異なる。
5. 複数 block を積んだ後、逆伝播の勾配が 0 ではなく、NaN も含まない。

## 9. この章の記憶のアンカーと境界

この章で最も重要な一文は次です。

> Transformer Block は attention を 1 回の情報混合から、積み重ね可能で訓練可能、再利用可能な言語モデルの基本モジュールへ変える。

覚えておくこと:

1. Multi-head は複数関係の並列ルーティングを解く。
2. Residual は情報と勾配の直通を解く。
3. LayerNorm は hidden features のスケール安定性を解く。
4. FFN は位置ごとの非線形加工を解く。
5. Dropout は train / eval の挙動を区別する必要がある。

この章では、完全な言語モデル工程はまだ解いていません。次章では block を Mini GPT に入れ、position、checkpoint、generate、再現実験を補います。

## 10. 次章

積み重ね可能なモジュールができました。次章では tokenizer、embedding、position、Transformer block、lm head、訓練ループ、generate をつなぎ、Mini GPT を作ります。
