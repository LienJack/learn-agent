---
title: "第 1 章: 訓練ループ、計算グラフ、再現可能な実験"
description: "あなたはすでに Python を書ける前提なので、この章では文法の説明はしません。深層学習のいちばん中心にある問いに直接向き合います。"
author: LienJack
pubDate: 2026-06-01
locale: ja
tags:
  - LLM 学習
  - LLM
  - AI
---
# 第 1 章: 訓練ループ、計算グラフ、再現可能な実験

## 1. この章が本当に解く問題

あなたはすでに Python を書ける前提なので、この章では文法の説明はしません。深層学習のいちばん中心にある問いに直接向き合います。

> モデルはなぜ誤りからよくなれるのか。そして、その「よくなった」が錯覚ではないことをどう証明するのか。

次のコードを書けるだけでは不十分です。

```python
logits = model(x)
loss = loss_fn(logits, y)
loss.backward()
optimizer.step()
```

これは訓練の表面にすぎません。実務的な訓練では、さらに次のように問い続けます。

- `backward()` の計算が間違っていたら、どう検出するのか。
- loss は下がっているのに validation が悪化した場合、モデルは本当に改善したと言えるのか。
- seed を固定していない実験の結論は信頼できるのか。
- そもそもパラメータが更新されていない場合、テストで見つけられるのか。
- 小さなデータすら過学習できないなら、訓練パイプラインにバグがあるのではないか。

この章では、後続の mini GPT、SFT、LoRA、蒸留でも再利用する、最小限の実務的な訓練システムを作ります。

## 2. 問いの連鎖

1. 出発点の問題: コードが動くことは、モデルが学習していることを意味しない。
2. Tensor shape は訓練システムにおける最初の契約である。
3. forward 計算が loss を作り、計算グラフが局所的な依存関係を記録する。
4. `backward()` が loss の影響をパラメータへ戻し、`step()` が実際にパラメータを更新する。
5. train/val split、overfit tiny、seed、history によって、訓練の結論を検証可能にする。
6. tests は、パラメータ更新、loss 低下、評価時に勾配が出ないこと、実験の再現性を証明しなければならない。
7. 次章の問い: 分類の訓練ループを作った後、目的を系列の next-token prediction にどう変えるのか。

## 3. Concept Card

| 概念 | 数学的対象 | Shape | コード上の対象 | 実験で見る対象 |
| --- | --- | --- | --- | --- |
| tensor | 数値配列 | `(B, D)` | `torch.Tensor` | shape チェック |
| model | パラメータ付き関数 | `x -> logits` | `SimpleMLP` | forward |
| loss | スカラー目的関数 | `()` | `CrossEntropyLoss` | loss 曲線 |
| gradient | パラメータの導関数 | パラメータと同じ shape | `.grad` | grad norm |
| optimizer | 更新規則 | パラメータ集合 | `SGD/Adam` | update norm |
| split | 汎化の見積もり | train / val | `split_dataset` | val loss |
| seed | 乱数制御 | scalar | `TrainingConfig.seed` | 再現性 |

## 4. 数値の入れ物から訓練対象へ: なぜ tensor の shape が第一言語なのか

Tensor は、最初は「shape を持つ数値の入れ物」と考えて構いません。しかし訓練では、shape はコメントではなく契約です。

この契約を後半のドメインプロジェクトにつなげるため、この章では契約リスクを扱うごく小さな toy task を使います。

```text
入力 x: [違約金の比率, 支払遅延日数]
出力 y: 0 = 低リスク, 1 = 高リスク
```

例:

```text
x = [0.01, 3]   -> 低リスク
x = [0.30, 60]  -> 高リスク
```

もちろん、これは本物の法務モデルではありません。役割は、2 次元の数値特徴を使って訓練ループをはっきり観察することです。

```text
x:      [batch_size, 2]
logits: [batch_size, 2]
y:      [batch_size]
loss:   scalar
```

この shape の契約は、変数名よりも信頼できます。後で言語モデルになると、次のような形になります。

```text
input_ids: [batch_size, seq_len]
logits:    [batch_size, seq_len, vocab_size]
labels:    [batch_size, seq_len]
```

今のうちに shape を追う習慣をつけておかないと、Attention の `[B, H, T, T]` で簡単に迷子になります。

この講座では、後半で次の 3 種類の契約リスクに何度も戻ってきます。

```text
違約金が高すぎる: 金額または比率が明らかに高く、リスク提示が必要
責任範囲が広すぎる: すべての損害、間接損害、得べかりし利益の損失まで賠償対象にしている
情報不足: 管轄、法令バージョン、契約類型、根拠資料が不足している
```

この章では、それらを 2 次元の toy features に圧縮し、より基礎的な問いに答えます。つまり、loss は本当に勾配を通じてパラメータを変えているのか、という問いです。第 17 章では、この 3 種類のリスクを、匿名化条項、RAG citation、JSON 出力、人間によるレビューゲートとして再び展開します。

## 5. 計算グラフ: PyTorch は何を記録しているのか

訓練とは「モデルが間違えたあと自動的に賢くなる」ことではありません。より正確には、次の流れです。

1. forward 計算が入力を loss に変換する。
2. PyTorch が forward の過程で計算グラフを記録する。
3. backpropagation が計算グラフに沿って、loss が各パラメータへ与える影響を戻す。
4. optimizer が勾配に基づいてパラメータを更新する。

たとえば 2 層分類器は次のように書けます。

```python
h = torch.relu(x @ W1 + b1)
logits = h @ W2 + b2
loss = F.cross_entropy(logits, y)
```

ここで重要なのは、`cross_entropy` が受け取るのは softmax 後の確率ではなく raw logits だという点です。また、最後の出力を ReLU に通してから渡すことも基本的には避けます。隠れ層に ReLU を使うのは構いませんが、最後の層の出力は正規化前のクラススコアとして残します。

計算グラフの各ノードは、局所的には次の問いに答えれば十分です。

> 上流から `dL / dout` が来たとき、自分の局所式に従って、入力とパラメータにどれだけの勾配を渡すべきか。

backpropagation は、モデル全体に一度で魔法をかける処理ではありません。多くの局所的な連鎖律がつながったものです。

### `requires_grad`、`grad_fn`、leaf tensor

- `requires_grad=True` は、この tensor が関わる計算を PyTorch が追跡する必要があることを示します。
- `grad_fn` は、この tensor を生成した計算ノードを指します。
- `nn.Parameter` は通常 leaf tensor であり、訓練後の勾配はその `.grad` に蓄積されます。

だからこそ、訓練中にむやみに `.detach()` を挟んだり、中間結果を `.item()` に変えたりしてはいけません。計算グラフを切ってしまい、勾配がパラメータまで戻れなくなることがあります。

## 6. `backward()` と `step()` の役割分担

一言で言うと、次の通りです。

> `loss.backward()` は「どう変えるべきか」を計算し、`optimizer.step()` は「実際に変える」。

より具体的には:

```python
optimizer.zero_grad()
logits = model(x)
loss = loss_fn(logits, y)
loss.backward()
optimizer.step()
```

- `zero_grad()`: 前の batch で残った勾配を消す。
- `model(x)`: forward 計算を行い、計算グラフを作る。
- `loss_fn(logits, y)`: 予測誤差をスカラーに圧縮する。
- `backward()`: 計算グラフに沿って各パラメータの `.grad` を計算する。
- `step()`: `.grad` を使ってパラメータを更新する。

`step()` を忘れると、loss は計算できますが、パラメータは変わりません。

`zero_grad()` を忘れると、勾配が batch をまたいで累積します。学習初期には、このせいで訓練の挙動が説明しづらくなることがよくあります。

## 7. 勾配チェック: 書いたばかりのモジュールを盲信しない

PyTorch の組み込み演算は通常信頼できます。しかし後で自分で attention、mask、loss、カスタムモジュールを書くようになると、次の sanity check を知っておく必要があります。

```text
数値勾配 ≈ [L(theta + eps) - L(theta - eps)] / (2 * eps)
```

これは有限差分による勾配チェックです。

訓練中に使う方法ではありません。遅すぎるからです。これはデバッグ時に次の問いへ答えるための道具です。

> autograd が出した勾配は、数値近似した勾配と同じ方向を向いているか。

この章のコードでは MLP を簡潔に保ちますが、テストと本文でこの意識を作ります。後で attention を実装するとき、この意識はかなり重要になります。

## 8. train/val split: 訓練データでよくなることは、モデルがよくなることと同じではない

最初に書きがちなコードの問題は、訓練と評価で同じ dataloader を使ってしまうことです。それで分かるのは、モデルが訓練データ上でよくなったということだけです。汎化する規則を学んだとは言えません。

実務的な訓練では、少なくとも次のように分けます。

- train set: optimizer がパラメータを更新するために使う。
- validation set: パラメータを更新せず、汎化性能を見るためだけに使う。

そのため、各 epoch では次を記録します。

```text
train_loss, train_acc
val_loss, val_acc
grad_norm, update_norm
```

もし次のような状態になったら:

```text
train_loss は下がり続ける
val_loss は上がり始める
```

通常は過学習を意味します。モデルは訓練データをより強く記憶している一方で、未見データに対してよくなっているとは限りません。

## 9. overfit tiny: 小さなデータも覚えられないなら、訓練パイプラインに問題がある可能性が高い

非常に有用な訓練の sanity check があります。

> ノイズのないごく小さなデータを取り、同じデータで繰り返し訓練する。モデルはほぼ 100% 記憶できるはずである。

小さなデータすら過学習できない場合、考えられる原因は次の通りです。

- loss と labels が対応していない。
- optimizer がパラメータを更新していない。
- 学習率が小さすぎる、または大きすぎる。
- モデル容量が足りない。
- データとラベルの対応が shuffle でずれている。
- 訓練モード、勾配、device 処理にバグがある。

この章では次を用意しています。

```bash
python -m src.training.simple_mlp --experiment overfit_tiny
```

これは本物の汎化性能を追う実験ではありません。訓練パイプライン自体に学習能力があることを検証するためのものです。

## 10. 初期化、学習率、batch size

### 初期化

モデルパラメータは「空白」から始まるわけではなく、ランダム初期化から始まります。初期化は次に影響します。

- 初期 logits のスケール。
- 勾配のスケール。
- seed ごとの訓練曲線の違い。

### 学習率

学習率は、各更新でパラメータがどれくらい大きく動くかを制御します。

- 小さすぎる: loss の低下が非常に遅い。
- 適切: loss が安定して下がる。
- 大きすぎる: loss が振動し、場合によっては発散する。

### batch size

batch size は、1 回の更新で勾配を推定するために使うサンプル数を制御します。

- 小さい batch: 勾配ノイズは大きいが、更新頻度は高い。
- 大きい batch: 勾配は安定するが、1 回の更新コストは高い。

これらは調参の迷信ではなく、訓練システムの観測対象です。第 1 章のコードは history を返すので、異なる設定で曲線を比較できます。

## 11. 乱数 seed と再現可能な実験

「一度実行したら loss が下がった」は信頼できる結論ではありません。実務的な訓練では、少なくとも次を制御します。

- dataset 生成 seed。
- train/val split seed。
- model 初期化 seed。
- DataLoader shuffle generator。

この章のコードでは、単一の `TrainingConfig(seed=...)` でこれらの乱数源を制御します。テストでは、固定 seed のもとで training history と最終パラメータが再現できることを確認します。

これは形式主義ではありません。LoRA、DPO、RAG 評価を行う段階で実験が再現できないと、エラー分析が非常につらくなります。

## 12. `model.train()`、`model.eval()`、`torch.no_grad()`

この 3 つは混同されがちですが、同じものではありません。

### `model.train()`

モデルを訓練モードにします。Dropout は一部の activation をランダムに落とし、BatchNorm は統計量を更新します。

### `model.eval()`

モデルを評価モードにします。Dropout はランダム性を止め、BatchNorm は既存の統計量を使います。

### `torch.no_grad()`

PyTorch に計算グラフを記録しないよう伝えます。メモリを節約し、検証中に意図せず勾配が発生することも防ぎます。

そのため、評価関数では通常この両方が必要です。

```python
@torch.no_grad()
def evaluate(...):
    model.eval()
```

この章の `SimpleMLP` が optional dropout を持つのは、train/eval モードの違いを実際に観察できるようにするためです。

## 13. この章のコード構成

中心となるコードは `src/training/simple_mlp.py` にあります。

提供しているもの:

- `TrainingConfig`: seed、lr、batch size、epochs などの設定をまとめて管理する。
- `TrainingHistory`: 各 epoch の train/val 指標を構造化して記録する。
- `set_seed`: 乱数を一元的に制御する。
- `split_dataset`: 重なりのない train/val split を作る。
- `make_dataloaders`: 固定された shuffle generator を持つ dataloader を作る。
- `compute_grad_norm`: 勾配が存在するか、爆発していないかを観察する。
- `compute_update_norm`: パラメータが本当に更新されたかを観察する。
- `run_training`: 基礎訓練実験を実行する。
- `run_overfit_tiny_experiment`: 小さなデータの過学習実験を実行する。

基礎実験を実行:

```bash
python -m src.training.simple_mlp --experiment baseline
```

小さなデータの過学習実験を実行:

```bash
python -m src.training.simple_mlp --experiment overfit_tiny
```

## 14. 必須実験

- baseline 訓練: train/val loss、accuracy、grad norm、update norm を記録する。
- overfit tiny: 小さなデータをモデルが記憶できることを検証する。
- seed 再現実験: 同じ設定で history とパラメータが再現できることを確認する。
- train/eval 対照: dropout が 2 つのモードでどう振る舞うかを観察する。
- 有限差分による勾配チェック: 小さなモジュールで autograd の勾配方向を検証する。

この章の主実験は、次の 4 つの対照にまとめられます。

| 実験 | 変更点 | 観察指標 | 期待される現象 |
| --- | --- | --- | --- |
| baseline | 通常の訓練 | train/val loss、accuracy、update_norm | loss が下がり、パラメータが更新される |
| no step | `optimizer.step()` を省略 | update_norm | loss は計算できるが、パラメータは変わらない |
| no zero_grad | `zero_grad()` を省略 | grad_norm、loss 曲線 | 勾配が累積し、曲線の解釈が難しくなる |
| overfit tiny | ノイズのないごく小さなデータで繰り返し訓練 | train accuracy | 100% に近づくはず |

この 4 つの実験は、1 本の loss 曲線だけを見るより信頼できます。それぞれ「学習できる」「更新がなければ検出できる」「勾配累積を検出できる」「パイプラインに簡単なサンプルを記憶するだけの能力がある」ことを別々に証明します。

## 15. 失敗パターン

- `optimizer.step()` を忘れる: loss は計算されるが、パラメータは更新されない。
- `optimizer.zero_grad()` を忘れる: 勾配が batch をまたいで累積し、訓練挙動が混乱する。
- 訓練セットと検証セットを混用する: 汎化性能を過大評価する。
- 小さなデータも過学習できない: データ、label、学習率、更新経路のどこかにバグがある可能性が高い。
- 評価時に `torch.no_grad()` を使わない: 検証処理が不要な計算グラフを記録し、GPU メモリを浪費して遅くなる。後で誤って validation loss に `backward()` を呼ぶと、訓練に参加すべきでない勾配がデバッグ過程に混ざる。
- seed を固定しない: 1 回の実行結果を再確認できない。

## 16. テストによる受け入れ

この章のテストは「コードが動く」ことだけを確認しません。訓練パイプラインの重要な振る舞いが成立していることを証明します。

- dataset の出力 shape が正しい。
- model forward の出力 shape が正しい。
- train/val split に重なりがない。
- loss が epoch とともに明確に下がる。
- 1 epoch 後にパラメータが実際に更新される。
- evaluate が勾配を発生させない。
- 固定 seed で再現できる。
- 小さなサンプルを過学習できる。
- train/eval モードで dropout の振る舞いが異なる。
- grad norm と update norm が観測可能で 0 より大きい。

実行:

```bash
pytest -q tests/test_training_loop.py
```

## 17. この章の受け入れ基準

この章を終えたら、次の問いに答えられるはずです。

- なぜ training loss の低下は、モデルの汎化性能向上と同じではないのか。
- `loss.backward()` は何を計算し、その結果はどこに置かれるのか。
- `optimizer.step()` が本当にパラメータを更新したことを、どう証明するのか。
- なぜ有限差分による勾配チェックが必要なのか。
- なぜ overfit tiny は訓練パイプラインの sanity check なのか。
- なぜ seed 固定は「結果をきれいに見せるため」だけではないのか。
- `model.eval()` と `torch.no_grad()` の違いは何か。

## 18. この章の記憶のアンカーと境界

この章は、最も基本的な問題を解きました。

> モデルは「答えを見た」から自動的に賢くなるのではない。loss が計算グラフを通じて勾配を生み、optimizer がその勾配でパラメータを更新するから改善する。

覚えておくべきことは 3 つです。

1. **shape は訓練システムの第一の契約である**: shape が間違っていれば、その後の説明はすべて信頼できない。
2. **loss の低下はモデルの改善と同じではない**: validation、overfit tiny、seed 再現性、失敗実験を見る必要がある。
3. **tests は smoke test ではない**: パラメータが本当に更新されること、評価で計算グラフを作らないこと、小さなデータを過学習できること、ランダム性が再現できることを証明する。

この章では、言語モデルの問題はまだ解いていません。

## 19. 次章予告

分類器が予測するのは:

```text
P(y | x)
```

言語モデルが予測するのは:

```text
P(x_t | x_<t)
```

つまり、固定されたクラスの中から答えを選ぶのではなく、各位置で次の token を予測します。

次章では、訓練ループを系列の確率モデリングへ移します。扱うのは cross entropy、perplexity、input/label shift、bigram language model です。
