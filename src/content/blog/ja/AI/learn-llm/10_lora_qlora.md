---
title: "第 10 章: LoRA / QLoRA によるパラメータ効率のよい微調整"
description: "第 9 章の SFT では、モデルパラメータを更新できる前提でした。しかし 7B、14B、あるいはそれ以上のモデルを全量微調整すると、GPU メモリ、保存、配布、ロールバックのコストが大きくなります。ドメインプロジェクトでは、すべての知識を書き換える必要はなく、少数のタスク方向に制御可能なずれ..."
author: LienJack
pubDate: 2026-06-01
locale: ja
tags:
  - LLM 学習
  - LLM
  - AI
---
# 第 10 章: LoRA / QLoRA によるパラメータ効率のよい微調整

## 1. この章が本当に解く問題

第 9 章の SFT では、モデルパラメータを更新できる前提でした。しかし 7B、14B、あるいはそれ以上のモデルを全量微調整すると、GPU メモリ、保存、配布、ロールバックのコストが大きくなります。ドメインプロジェクトでは、すべての知識を書き換える必要はなく、少数のタスク方向に制御可能なずれを加えればよい場合がよくあります。

LoRA の核心は、元モデルの重みを freeze し、低ランクの増分行列だけを訓練することです。QLoRA はさらに、freeze した base model を 4-bit に量子化し、訓練可能な部分を LoRA adapter に残します。

中心的な問い:

```text
全量微調整は高価なのに、なぜ少数の低ランク adapter を訓練するだけでモデルの振る舞いを変えられるのか。
```

## 2. 問いの連鎖

1. 全量微調整は変更が大きく、GPU メモリ、保存、ロールバックのコストが高い。
2. 新しい問題: 少数のパラメータだけを変えて、大きな行列の振る舞いにどう影響するのか。
3. 新しい仕組み: LoRA は `W` を freeze し、低ランク増分 `Delta W = B @ A` だけを訓練する。
4. 新しい境界: 低ランクの容量には限界があり、rank `r`、`alpha`、データ品質が重要な選択になる。
5. 新しい問題: adapter はどの線形層に注入すべきか。
6. 新しい仕組み: `target_modules` が、adapter が attention、MLP、その他 projection 層のどこに影響するかを決める。
7. 新しい問題: デプロイ時に adapter を分けたままにするか、base に merge するか。
8. 新しい仕組み: Adapter は個別に保存、読み込み、切り替え、merge できる。ただし merge したら再評価が必要である。
9. QLoRA は 4-bit quantized base model + LoRA により、さらに GPU メモリを下げる。
10. 次章の問い: adapter 訓練が安くても、汚いデータは救えない。ドメイン能力はどんなデータ工程から生まれるのか。

## 3. Concept Card

| 概念 | 数学的対象 | Shape | コード上の対象 | 実験で見る対象 |
| --- | --- | --- | --- | --- |
| frozen weight | 元の重み | `(out, in)` | base model | 更新されないことの確認 |
| LoRA A | 次元削減行列 | `(r, in)` | `lora_A` | rank 比較 |
| LoRA B | 次元復元行列 | `(out, r)` | `lora_B` | update norm |
| rank | 低ランク容量 | scalar | `r` | underfit/overfit |
| alpha | スケーリング係数 | scalar | `lora_alpha` | 安定性 |
| target modules | 注入位置 | module names | `target_modules` | パラメータ数 |
| quantized base | 量子化重み | 4-bit storage | bitsandbytes | GPU メモリ使用量 |

## 4. LoRA の数学的対象

線形層:

```text
y = x @ W.T
```

LoRA は `W` を直接訓練せず、低ランク増分を訓練します。

```text
y = x @ W.T + scale * x @ A.T @ B.T
scale = alpha / r
```

ここで:

```text
W: FloatTensor[out, in]   frozen
A: FloatTensor[r, in]     trainable
B: FloatTensor[out, r]    trainable
r << min(in, out)
```

`r` が小さいと adapter は安価ですが容量は限られます。`r` が大きいと全量微調整に近づき、コストも上がります。

LoRA の直感は、元の重み行列を直接変えるのではなく、横で低ランクの「修正方向」を学ぶことです。元モデルは汎用能力を保ち、adapter はドメインタスクに必要なずれを学びます。工学上の利点は次です。

```text
訓練時の GPU メモリが低い
保存成果物が小さい
複数ドメイン adapter を切り替えられる
全量モデルよりロールバックが簡単
```

ただし、adapter は base model に依存します。adapter は完全なモデルではなく、対応する base revision から切り離すと解釈できません。

### LoRA が最初に元モデルを壊さない理由

一般的な LoRA 初期化では次のようにします。

```text
A: ランダム初期化
B: 0 で初期化
```

そのため訓練開始時には:

```text
Delta W = B @ A = 0
```

モデルの振る舞いは base model とほぼ同じです。訓練が進むにつれて、adapter が低ランクの修正方向を学びます。

この設計は重要です。LoRA は最初から元モデルを上書きするのではなく、freeze された元重みの横で増分を学びます。これにより、adapter のロールバックや切り替えという工程上の余地が残ります。

## 5. PEFT ワークフロー

典型的なコード構造:

```python
from peft import LoraConfig, TaskType, get_peft_model
from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained(model_id)
config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=8,
    lora_alpha=16,
    lora_dropout=0.05,
    target_modules=["q_proj", "v_proj"],
    bias="none",
)
model = get_peft_model(model, config)
model.print_trainable_parameters()
```

この章で求めるのは、すべてのモデルの module 名を暗記することではありません。モデル構造を確認できることです。アーキテクチャによって `q_proj/v_proj`、`c_attn`、`query_key_value` など名前が異なる場合があります。`target_modules` を盲目的にコピーすると、正しい位置に adapter が注入されないことがよくあります。

module 名を確認する最小コード:

```python
for name, module in model.named_modules():
    if "proj" in name or "attn" in name or "mlp" in name:
        print(name, module.__class__.__name__)
```

LoRA 注入後は trainable parameter ratio を確認し、対象層に `lora_A` / `lora_B` が本当に現れているかを抽出確認します。`print_trainable_parameters()` が訓練可能パラメータ 0 を示す場合、または target module 名がまったく一致していない場合でも、訓練スクリプト自体は最後まで走るかもしれません。しかし adapter は何も学んでいません。

## 6. Adapter の保存、読み込み、merge

LoRA の主な訓練成果物は adapter であり、完全な base model ではありません。

```text
base model id + adapter weights + tokenizer + chat template + training config
```

よくある操作:

- adapter を個別に保存し、配布や複数タスク切り替えをしやすくする。
- 同じ base model を読み込み、adapter を取り付ける。
- adapter を base 重みに merge し、デプロイを簡単にする。ただし軽量な切り替えの利点は失われる。
- adapter config を保持し、rank、alpha、target modules、base model revision を記録する。

adapter だけを保存し、base model revision を記録しないと、将来異なる base 重みに読み込んだとき振る舞いを再現できない可能性があります。

### merge は常にすべきものではない

adapter を merge すると、デプロイ時に adapter 層を別途取り付ける必要がなくなり、推論構造が単純になります。一方で代償もあります。

1. 複数 adapter を簡単に切り替えられなくなる。
2. 個別 adapter よりロールバックが不便になる。
3. 量子化読み込みされた base model では、merge と export format を間違えやすい。
4. merge 後は同じ eval を再実行する必要があり、振る舞いが完全に同じだと仮定してはいけない。

教材プロジェクトでは、次を同時に残すことを推奨します。

```text
base model revision
adapter weights
adapter config
unmerged eval report
merged eval report
```

これにより、merge が形式、引用、安全な拒否、ドメイン性能に影響したかを判断できます。

## 7. QLoRA の境界

QLoRA の工学的目標は GPU メモリ削減です。freeze された base model を 4-bit 量子化で保存し、backpropagation では LoRA adapter だけを訓練します。一般的な流れは次です。

```text
load base model in 4-bit
prepare model for k-bit training
inject LoRA adapter
run SFT
save adapter
```

したがって QLoRA は「4-bit 重みを訓練する」ことではありません。「量子化された freeze base + 訓練可能 adapter」です。base の量子化方式、adapter の dtype、optimizer、export format はすべてレポートに入れる必要があります。

QLoRA は「モデルが 4-bit になれば、すべての計算コストが消える」という意味でもありません。activation メモリ、optimizer state、batch、系列長の管理は依然として必要です。長文脈や大きな batch では引き続き OOM が起きます。

QLoRA は品質検証の問題も持ち込みます。量子化 base + adapter の振る舞いは、非量子化訓練と完全に一致するとは限りません。教材プロジェクトでは、まず dry run でフローを確認し、その後同じ eval prompt で比較できます。

```text
base fp16
LoRA fp16
QLoRA 4-bit + adapter
```

QLoRA 版の形式が悪化したり、拒否境界が退化したりするなら、GPU メモリ節約だけを報告せず、その差を評価レポートに書きます。

## 8. パラメータ量と GPU メモリの見積もり

線形層 `W(out, in)` の全量訓練パラメータ量は:

```text
out * in
```

LoRA が追加するパラメータ量は:

```text
r * in + out * r = r * (in + out)
```

`in = out = 4096`、`r = 8` の場合:

```text
full: 4096 * 4096 = 16,777,216
LoRA: 8 * (4096 + 4096) = 65,536
```

この桁違いの差が adapter の安さを説明します。同時に、rank が小さすぎると表現できるタスク変化が制限されることも示しています。

パラメータ量見積もりは方針選択の第一歩であり、最終回答ではありません。本当の工程判断では、さらに次を見ます。

```text
目標タスクが形式/スタイル適応だけなのか、複雑な新能力を必要とするのか
訓練データ規模がより高い rank を支えられるか
デプロイ時に adapter merge が必要か
複数ドメイン adapter を同時に維持する必要があるか
評価で低 rank でも十分と示されているか
```

LoRA を万能スイッチとして扱ってはいけません。データが悪く、評価が弱く、タスク境界が曖昧な場合、パラメータ効率のよい微調整は、誤った目標をより効率よく学ぶだけです。

LoRA を優先すべきでない場合:

| 状況 | 先にすべきこと |
| --- | --- |
| 出力に根拠や引用がない | 先に RAG と citation support eval を補う |
| サンプル出所を追跡できない | 先にデータ工程と `source_id` を作る |
| タスク境界が不明確 | 先に intended use、拒否サンプル、eval を書く |
| 知識が頻繁に更新される | 知識を adapter に詰めるのではなく、先に RAG を使う |
| 安全指標が未定義 | 先に第 14、15 章の評価と gate を作る |

## 9. 必須実験

- trainable parameter ratio を出力し、base model が freeze されていることを確認する。
- 同じ tiny SFT データで `r=4/8/16` を比較し、loss と出力変化を見る。
- attention 層だけに注入する場合と、より多くの linear 層に注入する場合を比較し、パラメータ量と効果を見る。
- adapter を保存後に再読み込みし、同じ prompt の振る舞いが一致することを検証する。
- QLoRA 小モデル dry run: GPU メモリ、batch size、max length、OOM 境界を記録する。

## 10. 失敗パターン

- `target_modules` を間違える: 訓練可能パラメータが 0 になる、または想定外の層に adapter が注入される。
- base の freeze を忘れる: GPU メモリが突然全量微調整に近づく。
- loss だけを報告し、trainable parameter ratio を報告しない。
- adapter と base model revision が一致しない。
- merge 後も複数 adapter を無損失に切り替えられると思い込む。
- QLoRA の量子化読み込みには成功したが、系列長が大きすぎてまだ OOM になる。
- rank は大きいほどよいと思う: 小データではより速く過学習する可能性がある。

## 11. テストによる受け入れ

この章の tests では、少なくとも次を検証します。

1. LoRA 注入後、trainable parameters が adapter のみである。
2. `target_modules` が見つからないとき、静かに訓練せず明示的に失敗する。
3. tiny batch forward の logits shape が変わらない。
4. 訓練前の LoRA 増分が 0 またはほぼ 0 であり、base 出力が初期 adapter によって乱されない。
5. 1 step 訓練後、base frozen weights は変わらず、adapter weights は変わる。
6. adapter 保存後に再読み込みし、logits shape と生成フローが使える。
7. merge 後に固定 eval prompts を再実行し、未記録の振る舞い退化がないことを確認する。

## 12. この章の記憶のアンカーと境界

この章で最も重要な一文は次です。

> LoRA はモデルを書き換えるのではなく、freeze された土台の横に、保存・切り替え・ロールバック可能な低ランク増分を学ぶ。

覚えておくこと:

1. 一般的な初期化では `B=0` なので、初期 `Delta W=0`。
2. `target_modules` は具体的なアーキテクチャごとに確認する。
3. rank が高いほどよいとは限らず、小データではより早く過学習することがある。
4. QLoRA は量子化 freeze base + 訓練 adapter である。
5. merge 後は必ず eval を再実行する。

この章ではデータソースと品質の問題は解いていません。次章ではドメインデータ工程に進みます。

## 13. 次章

LoRA / QLoRA は微調整コストを下げますが、「訓練データはどこから来るのか、品質をどう証明するのか、リスクをどう制御するのか」は解きません。次章ではドメインデータ工程に進みます。
