---
title: "第 2 章: 言語モデルの確率的目的"
description: "第 1 章では分類器を訓練しました。ベクトルを入力し、クラスを出力するモデルです。ここでは、より LLM らしい問題に切り替えます。"
author: LienJack
pubDate: 2026-06-01
locale: ja
tags:
  - LLM 学習
  - LLM
  - AI
---
# 第 2 章: 言語モデルの確率的目的

## 1. この章が本当に解く問題

第 1 章では分類器を訓練しました。ベクトルを入力し、クラスを出力するモデルです。ここでは、より LLM らしい問題に切り替えます。

> 文の冒頭をモデルに与えたとき、モデルはどう続きを書くのか。

直感的には、モデルは「文を出力している」ように見えます。しかし訓練時に「文全体がよいか」を直接教師信号にすることはできません。ひとつの文には、妥当な続きがいくつもあり得るからです。そこで言語モデルは問題を小さく分解します。

> 文全体を一度に生成するのではなく、各位置で次の token を予測する。

この章で使う小さな継続コーパスは次の通りです。

```text
合同 违约金 过高 ， 它 可能 存在 风险 <eos>
```

訓練時には、これが一連の教師あり関係に分解されます。

```text
合同   -> 违约金
违约金 -> 过高
过高   -> ，
，      -> 它
它      -> 可能
```

この章で本当に補う能力は次です。

```text
「テキストを続きを書く」という問題を、訓練でき、評価でき、生成できる next-token prediction に書き換える。
```

## 2. 問いの連鎖

1. 出発点: 分類器は固定ラベルしか出力できず、可変長テキストを出力できない。
2. 新しい問題: テキスト生成は「文を書く」ように見えるが、訓練時には計算可能な教師信号が必要になる。
3. 新しい仕組み: 文全体の確率を、一連の next-token probability に分解する。

   ```text
   P(x_1, ..., x_T) = ∏ P(x_t | x_<t)
   ```

4. エンジニアリング上の変換: モデルに `tokens[:, :-1]` を渡し、`tokens[:, 1:]` を予測させる。
5. 訓練信号: 各位置で vocabulary サイズの logits を出し、正しい next token を cross entropy で教師する。
6. 推論時の境界: 訓練時には正しい prefix があるが、生成時にはモデル自身がすでに生成した token しか使えない。
7. 新しい問題: モデルが必要とするのは token id だが、実際の入力は文字列である。次章では Tokenizer と Dataset に進む。

## 3. Concept Card

| 概念 | 数学的対象 | Shape | コード上の対象 | 実験で見る対象 |
| --- | --- | --- | --- | --- |
| コーパス | token 列 | `(N,)` または `(B, T)` | `input_ids` | 小さな中国語コーパス |
| logits | 各位置のクラススコア | `(B, T, V)` | `model(input_ids)` | vocab 次元を確認 |
| labels | 1 つ右にずらした目標 token | `(B, T)` | `targets` | ずれの関係を検証 |
| loss | 負の対数尤度の平均 | `()` | `nn.CrossEntropyLoss` | loss が下がるか |
| generate | 自己回帰サンプリング | 段階的に伸びる | `generate()` | temperature と top-k の比較 |

## 4. Shape の契約

最小の言語モデル訓練 batch は、次を満たす必要があります。

```text
tokens:  LongTensor[B, T + 1]
inputs:  tokens[:, :-1] -> LongTensor[B, T]
labels:  tokens[:, 1:]  -> LongTensor[B, T]
logits:  FloatTensor[B, T, V]
loss:    CE(logits.reshape(B*T, V), labels.reshape(B*T))
```

注意: `logits.argmax(-1)` で得られるのは、各位置で最も確率が高い next token です。文全体の答えではありません。生成ループでは、新しく生成した token を context に append しなければなりません。

この「1 つ右にずらす」関係が、言語モデル訓練の核心です。次の token 列があるとします。

```text
合同 违约金 过高 ， 它 可能 存在 风险 <eos>
```

訓練時にモデルが見る教師関係は次の通りです。

```text
合同   -> 违约金
违约金 -> 过高
过高   -> ，
，      -> 它
它      -> 可能
```

input と label を同じ token にそろえてしまうと、loss はすぐ下がるかもしれません。しかしモデルが学ぶのは次の token の予測ではなく、現在の token のコピーです。このバグは見つけにくいです。訓練曲線は「きれい」に見えるのに、生成すると似た token を繰り返すからです。

訓練スクリプトでは、この関係を目視に頼らず assert として書くべきです。

```python
assert torch.equal(inputs[:, 1:], labels[:, :-1])
```

最小 batch は手で確認できます。

| 項目 | 正しい LM batch | 誤った batch |
| --- | --- | --- |
| `inputs` | `合同 违约金 过高` | `合同 违约金 过高` |
| `labels` | `违约金 过高 ，` | `合同 违约金 过高` |
| 学習する目標 | 次の token を予測する | 現在の token をコピーする |
| 生成時の結果 | 続きを書ける可能性がある | 繰り返しやすい |

訓練と生成には、もうひとつ重要な違いがあります。訓練時には、各位置が正しい履歴を見ることができます。これは teacher forcing と呼ばれます。生成時には、モデルは自分がすでに生成した履歴しか見られません。小さな誤りが context に入り、その後のすべての token に影響します。だから訓練 loss だけでは不十分で、実際に `generate()` を走らせる必要があります。

### loss と perplexity: なぜ 1 つのスカラーで予測の難しさを表せるのか

Cross entropy loss は、次のように理解できます。

> モデルが正しい next token に高い確率を与えるほど loss は低くなり、その確率が低いほど loss は高くなる。

平均 loss が `L` の場合、perplexity は通常こう書きます。

```text
perplexity = exp(L)
```

大まかには、モデルが各位置で平均して「何個の候補 token の間で迷っているか」を表します。perplexity が低いほど、正しい next token に自信があると言えます。

ただし限界があります。

- perplexity が評価するのは next-token prediction であり、回答品質そのものではない。
- 小さなコーパスで perplexity が非常に低い場合、単なる過学習かもしれない。
- SFT、RAG、法律/医療 QA では、後で形式正確率、事実正確率、引用の正確性、安全な拒否も見る必要がある。

## 5. 最小実装

この章の最小モデルは、neural bigram language model から始められます。

```python
class BigramLanguageModel(nn.Module):
    def __init__(self, vocab_size: int, hidden_dim: int) -> None:
        super().__init__()
        self.token_embedding = nn.Embedding(vocab_size, hidden_dim)
        self.lm_head = nn.Linear(hidden_dim, vocab_size)

    def forward(self, input_ids: torch.Tensor) -> torch.Tensor:
        hidden = self.token_embedding(input_ids)
        return self.lm_head(hidden)
```

意味は次の通りです。

```text
現在の token id
  -> embedding を引く
    -> vocab logits に射影する
      -> 次の token を予測する
```

このモデルは、本当の意味では長い履歴を見ていません。厳密に言えば、`hidden_dim < vocab_size` の場合、これは完全な bigram 遷移表ではなく、低ランクにパラメータ化された bigram baseline です。

弱いモデルですが、教材としての価値は高いです。次の 4 点を検証できます。

1. `input_ids` と `labels` が正しく右にずれているか。
2. logits shape が `[B, T, V]` になっているか。
3. cross entropy が正しく接続されているか。
4. `generate()` が本当にループで token を生成できるか。

このモデルは長い文脈の問題を解きません。「它」という token を見ても、それが「违约金」を指すのか「合同」を指すのかは分かりません。この不足が、後の Embedding 文脈モデルと Attention を自然に導きます。

この章の実験は小さく制御できます。数十文字で bigram LM を訓練し、loss が下がること、生成が動くこと、サンプリングパラメータで出力が変わることを確認します。小さな実験が説明可能だからこそ、後でモデルが複雑になったときに問題を切り分けられます。

## 6. 必須実験

- 短いテキストを過学習する。たとえば繰り返しの中国語詩句やプロジェクト README の一部。
- greedy、temperature、top-k、top-p を比較し、繰り返し、発散、多様性を観察する。
- 意図的に label を右にずらさない。モデルは「現在の token をコピーする」ようになり、生成品質が見かけ上高くなる。
- 意図的に padding を loss に含める。モデルが `<pad>` を過度に学習する様子を見る。
- seed を固定する。同じ訓練設定とサンプリング設定では、同じ出力を再現できるべきである。

## 7. 失敗パターン

- `logits` と `labels` の flatten が合っていない: cross entropy がエラーになるか、静かに誤った目標を訓練する。
- padding token も loss に含める: モデルが padding 記号を過度に学習する。
- training loss は下がるのに生成が繰り返し token ばかりになる: bigram モデルの文脈能力が足りないだけで、訓練ループが必ず壊れているわけではない。
- 生成時に context を crop し忘れる: 後続の Transformer で最大 context 長を超える。

## 8. テストによる受け入れ

この章の tests では、少なくとも次を検証します。

1. `make_lm_batch()` が正しくずれた `inputs` と `labels` を返す。
2. `BigramLanguageModel` の出力 shape が `(B, T, V)` である。
3. 1 step の訓練で embedding と lm head のパラメータが更新される。
4. 小さなコーパスを overfit した後、loss が明確に下がる。
5. `generate()` の出力長が正しく、vocab 外の token を生成しない。
6. `perplexity == exp(loss)`。

## 9. この章の記憶のアンカーと境界

この章で最も重要な一文は次です。

> 言語モデルは「完全な文を書く」ことを一度に学ぶのではなく、各位置で次の token を予測することを学ぶ。

覚えておくこと:

1. `inputs = tokens[:, :-1]`
2. `labels = tokens[:, 1:]`
3. `logits.shape = [B, T, V]`
4. `loss = CE(logits.reshape(B*T, V), labels.reshape(B*T))`
5. 訓練時は正しい履歴を使い、生成時はモデル自身が生成した履歴を使う。

この章では、次の 2 つの問題はまだ解きません。

- 文字列をどう安定して token id に変えるか。
- モデルがどう長い文脈を利用するか。

## 10. 次章

言語モデルに `input_ids` が必要なことは分かりました。しかし実際のテキストは文字列であり、文字列を数値に変える過程が vocab、未知語、padding、batch、評価の一貫性を左右します。次章では Tokenizer と Dataset に進みます。
