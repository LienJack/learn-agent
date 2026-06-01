---
title: "第 5 章: Causal Self-Attention"
description: "第 4 章の causal mean model はすでに過去を見ることができます。しかし明らかな問題があります。"
author: LienJack
pubDate: 2026-06-01
locale: ja
tags:
  - LLM 学習
  - LLM
  - AI
---
# 第 5 章: Causal Self-Attention

## 1. この章が本当に解く問題

第 4 章の causal mean model はすでに過去を見ることができます。しかし明らかな問題があります。

> 過去の位置を固定ルールで混ぜるだけで、現在の token が本当は誰を見るべきかを知らない。

次の文を見てください。

```text
合同 违约金 过高 ， 它 可能 存在 风险
```

モデルが「可能」の次の token を予測するとき、「它」は「合同」「过高」や句読点を平均的に見るより、「违约金」をより強く振り返るべきです。

したがって、この章が本当に解く問題は次です。

```text
文中の各 token は、自分が見るべき過去 token をどう動的に決めるのか。
```

これが causal self-attention が登場する理由です。

## 2. 問いの連鎖

1. 出発点: 固定 pooling は過去を見られるが、文脈に応じて動的に選択できない。
2. 問題: 異なる token は、異なる文の中で異なる過去位置に注目する必要がある。
3. 新しい仕組み: 各位置が query、key、value を生成する。
4. query と key の内積によって、「現在位置がどの位置を見るべきか」のスコアを得る。
5. softmax がスコアを attention weights に変える。
6. value を重みに従って加重和し、文脈表現を得る。
7. causal mask が、現在位置から未来 token を見ることを禁止する。
8. 新しい境界: 単頭 attention は 1 回の情報混合にすぎない。完全な LLM block には multi-head、residual、normalization、FFN も必要である。

## 3. Concept Card

| 概念 | 数学的対象 | Shape | コード上の対象 | 実験で見る対象 |
| --- | --- | --- | --- | --- |
| Q | query ベクトル | `(B, T, H)` | `q_proj(x)` | 内積スコア |
| K | query されるベクトル | `(B, T, H)` | `k_proj(x)` | mask 前 logits |
| V | 集約される内容 | `(B, T, H)` | `v_proj(x)` | 加重和 |
| weights | attention 分布 | `(B, T, T)` | `softmax(scores)` | 可視化 |
| causal mask | 下三角制約 | `(T, T)` | `torch.tril` | 未来重みが 0 |

## 4. Shape の契約

```text
x:       FloatTensor[B, T, D]
q,k,v:   FloatTensor[B, T, H]
scores:  FloatTensor[B, T, T] = q @ k.transpose(-2, -1) / sqrt(H)
mask:    BoolTensor[T, T]
weights: FloatTensor[B, T, T]
out:     FloatTensor[B, T, H]
```

causal LM では、`j > i` の位置で `weights[:, i, j]` が必ず 0 でなければなりません。そうでないと訓練時にモデルが答えを覗き見し、loss が不自然に低くなり、生成時に崩れます。

Attention の核心は「すべての token が互いを見る」ことではありません。「各位置が現在の表現に基づいて、情報源を動的に選ぶ」ことです。同じ token でも、文が違えば注目する位置は変わります。

```text
这份合同中的违约金过高，它可能...
这份报告中的指标过高，它可能...
```

2 つの「它」は、異なる名詞を振り返る必要があります。固定 pooling ではこの条件付き選択を表現しにくい一方、query-key の内積なら各位置が自分自身の検索分布を作れます。

スケーリング因子 `sqrt(H)` も数学的な飾りではありません。head dimension が大きいほど内積の分散は大きくなります。スケーリングしないと softmax が尖りすぎ、モデルが早い段階で 1 つの位置だけを見るようになり、勾配も不安定になります。

## 5. 最小実装

```python
def scaled_dot_product_attention(q, k, v, causal: bool = True):
    head_dim = q.size(-1)
    scores = q @ k.transpose(-2, -1) / head_dim**0.5
    if causal:
        t = q.size(-2)
        mask = torch.tril(torch.ones(t, t, device=q.device, dtype=torch.bool))
        scores = scores.masked_fill(~mask, float("-inf"))
    weights = torch.softmax(scores, dim=-1)
    return weights @ v, weights
```

このコードは、後続の multi-head attention の中心です。まず単頭を正しく書き、その後で batch、head、projection を導入します。

Causal mask は、言語モデルと通常の系列エンコーダを分ける重要な境界です。通常の self-attention では各位置が文全体を見られます。causal self-attention では、現在位置と過去位置しか見られません。訓練時に mask を忘れると、モデルは答え token を直接見てしまいます。loss は異常に低くなりますが、生成時には未来 token が存在しないため、急に性能が崩れます。

教材実験では、あえて 2 つの版を走らせるとよいです。

```text
with mask: loss はより現実的で、生成は比較的安定する
without mask: training loss は不自然に低く、生成で問題が露呈する
```

これは「未来を覗いてはいけない」と言うだけより説得力があります。後続のすべての decoder-only モデルは、この制約の上に成り立っています。

### causal mask と padding mask を区別する

この章の最小実装が扱うのは causal mask だけです。

```text
位置 i は j > i の未来 token を見てはいけない
```

しかし実際の batch には padding mask もあります。

```text
pad 位置は、有効 token から文脈として読まれるべきではない
```

2 つの mask は別の問題を解きます。

```text
causal mask: 未来の覗き見を防ぐ
padding mask: 補完記号を見ることを防ぐ
```

後で完全な Transformer を書くときは、この 2 つを組み合わせる必要があります。組み合わせる際には数値的な境界にも注意します。ある行のすべての位置が `-inf` に mask されると、softmax は NaN を出します。純粋な causal mask では、各位置が少なくとも自分自身を見られるためこの問題は起きません。しかし padding query 行ではこの境界が起こり得ます。

組み合わせ mask の最小 shape は次のように覚えられます。

```text
causal_mask:  BoolTensor[1, 1, T, T]   # query i 不能看 future key j
padding_mask: BoolTensor[B, 1, 1, T]   # key j 是不是有效 token
combined:     BoolTensor[B, 1, T, T]
scores:       FloatTensor[B, H, T, T]
```

つまり、padding mask は通常 key 次元を先に mask します。pad query 行を後続で使う場合は、対応する出力も追加でゼロにします。causal mask と padding mask を、次元説明のない 2 次元行列にまとめないでください。multi-head 版で broadcast を間違えやすくなります。

### attention weights は見てよいが、神格化しない

Attention weights は、ある位置が過去 token にどれだけ重みを割り当てたかを示せるため、教材用の可視化に向いています。

しかし完全な説明ではありません。

- 重みが大きいからといって、最終回答が本当にその token によって決まったとは限らない。
- 多層、多頭、FFN、residual が情報をさらに変化させる。
- 信頼できる診断には、task loss、出力の変化、介入実験を組み合わせる必要がある。

そのため、この章で attention weights を見る目的は、仕組みが動いているかを確認することです。「モデルがすでに解釈可能になった」と宣言するためではありません。

## 6. 必須実験

- 増加する token 列を作り、第 `i` 位置が `i+1` に注目できないことを検証する。
- attention weights を可視化し、各行の重み和が 1 になることを観察する。
- スケーリング因子 `sqrt(H)` を外し、softmax が尖りすぎて勾配が不安定になる様子を見る。
- causal mask を外し、training loss は不自然に低いが生成が信頼できないことを観察する。

## 7. 失敗パターン

- mask の dtype または device が一致しない: 実行時エラーになる。
- `-inf` mask ではなく `0` を使う: 未来 token がまだ重みを得る可能性がある。
- softmax の次元を間違える: 各 query がすべての key に対して正規化されるのではなく、列方向で正規化されてしまう。
- attention weights はきれいに見えるが、task loss と結びついていない。

## 8. テストによる受け入れ

この章の tests では、少なくとも次を検証します。

1. attention の出力 shape が正しい。
2. weights の最後の次元の和がほぼ 1 である。
3. causal mask 後、すべての未来位置の重みが 0 である。
4. mask を無効にすると未来位置が見えることを対照として確認する。
5. 未来 token を変更しても、過去位置の出力が変わらない。
6. softmax の次元が key 次元であり、query 次元ではない。
7. attention が `float32` で NaN を出さない。
8. `-inf` mask ではなく `0` mask を使う誤実装が、テストで検出される。

## 9. この章の記憶のアンカーと境界

この章で最も重要な一文は次です。

> Attention は token に「自由に互いを見させる」ものではなく、各位置が query-key matching によって、どの過去 value を集約すべきかを動的に選ぶ仕組みである。

覚えておくこと:

1. `scores = Q @ K^T / sqrt(d_k)`
2. `weights = softmax(scores)`
3. `out = weights @ V`
4. causal LM では、未来位置を必ず mask する。
5. attention weights は観察できるが、完全な説明ではない。

この章では、深い訓練の安定性も、複数種類の関係を同時にモデル化する問題もまだ解いていません。

## 10. 次章

Attention は「誰を見るか」を解きました。しかし LLM block を安定して積み重ねるには、multi-head、residual、normalization、FFN が必要です。次章では Transformer Block に進みます。
