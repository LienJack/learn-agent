---
title: "第 8 章: Hugging Face ワークフロー"
description: "第 7 章では、言語モデルの内部構造を理解するために Mini GPT をゼロから実装しました。現実のプロジェクトでは、通常ランダム初期化から訓練を始めません。オープンソースモデル、tokenizer、設定、重み形式、訓練ツールチェーンを再利用します。"
author: LienJack
pubDate: 2026-06-01
locale: ja
tags:
  - LLM 学習
  - LLM
  - AI
---
# 第 8 章: Hugging Face ワークフロー

## 1. この章が本当に解く問題

第 7 章では、言語モデルの内部構造を理解するために Mini GPT をゼロから実装しました。現実のプロジェクトでは、通常ランダム初期化から訓練を始めません。オープンソースモデル、tokenizer、設定、重み形式、訓練ツールチェーンを再利用します。

この章で補う能力は、「GPT の構造を理解した」状態から、「信頼して読み込み、推論し、最小限の微調整を行い、保存し、実験を再現できる」状態へ進むことです。

ゼロからの実装は構造を見えるようにしてくれます。Hugging Face はエコシステムを再利用させてくれますが、同時に設定、tokenizer、revision、checkpoint の中に誤りを隠します。

中心的な問い:

```text
現実には毎回ゼロからモデルを訓練できない。では、前章までに作った工程判断を失わずに、どうオープンソースモデルを使うのか。
```

## 2. 問いの連鎖

1. ゼロからの訓練は構造が成立することを示すが、データ、計算資源、時間の面で現実的ではない。
2. Hugging Face Hub はモデル重み、config、tokenizer、processor を提供する。
3. `AutoTokenizer` と `AutoModelForCausalLM` は、コードを具体的なアーキテクチャから切り離す。
4. `model.generate()` は標準的な自己回帰生成フローを再利用するが、prompt、sampling、停止条件は依然として制御が必要である。
5. `datasets` と `Trainer` は、データ処理、訓練引数、評価、保存を再現可能な workflow にまとめる。
6. Accelerate は device、mixed precision、分散訓練の入口を扱うが、実験設計の代わりにはならない。
7. 次章の問い: モデルを読み込んだあと、「テキストを続きを書く」モデルを「指示に従って答える」モデルへどう変えるのか。

## 3. Concept Card

| 概念 | 数学的対象 | Shape | コード上の対象 | 実験で見る対象 |
| --- | --- | --- | --- | --- |
| pretrained config | アーキテクチャ超パラメータ | JSON | `AutoConfig` | hidden size / layers |
| tokenizer | テキストから id | `(B, T)` | `AutoTokenizer` | chat template |
| causal LM | next-token モデル | logits `(B, T, V)` | `AutoModelForCausalLM` | prompt 推論 |
| dataset row | 訓練サンプル | dict | `datasets.Dataset` | map / split |
| trainer state | 訓練過程 | checkpoint | `Trainer` | save / resume |
| generated ids | 出力 token | `(B, T+N)` | `model.generate` | decode |

### Mini GPT から Hugging Face への対応

Hugging Face は第 7 章のモデル契約を変えません。オブジェクトを標準化するだけです。

| Mini GPT オブジェクト | Hugging Face オブジェクト | 確認点 |
| --- | --- | --- |
| `MiniGPTConfig` | `AutoConfig` | hidden size、layers、vocab size が一致しているか |
| simple tokenizer | `AutoTokenizer` | special tokens、chat template、pad token |
| `MiniGPT.forward` | `AutoModelForCausalLM.forward` | `input_ids`、`attention_mask`、`labels` |
| 手書き `generate()` | `model.generate()` | max length、sampling、stop tokens |
| `save_checkpoint()` | `save_pretrained()` | model、tokenizer、config が同じディレクトリに保存されるか |
| 訓練 history | `TrainerState` / logs | seed、step、eval report が再現可能か |

この表は第 7 章から第 8 章への橋です。前章までのゼロからの実装は toy exercise ではなく、オープンソースツールチェーンの各オブジェクトがどんな契約を担うべきかを知るためのものです。

## 4. 最小推論ワークフロー

モデルを読み込むときは、tokenizer、model、device、dtype、trust policy を明示します。

```python
from transformers import AutoModelForCausalLM, AutoTokenizer

model_id = "sshleifer/tiny-gpt2"
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(model_id)

prompt = "Large language models learn to"
inputs = tokenizer(prompt, return_tensors="pt")
outputs = model.generate(
    **inputs,
    max_new_tokens=32,
    do_sample=False,
)
text = tokenizer.decode(outputs[0], skip_special_tokens=True)
```

学習段階では、小さなモデルで workflow を検証することを優先します。最初から大きなモデルをダウンロードすると、通常の誤りが GPU メモリ、ネットワーク、権限の問題に埋もれてしまいます。

本番や再現可能な実験では、浮動する model id だけを書かないようにします。できるだけ revision を固定します。

```python
revision = "commit_hash_or_tag"
tokenizer = AutoTokenizer.from_pretrained(model_id, revision=revision)
model = AutoModelForCausalLM.from_pretrained(model_id, revision=revision)
```

そうしないと、将来同じ model id が別の重み、tokenizer、設定を指す可能性があり、古い実験を再現できなくなります。

Hugging Face workflow の最も重要な変化は、前に手書きしていた多くのオブジェクトが標準インターフェースになることです。

```text
config: モデル構造と超パラメータ
tokenizer: テキストプロトコル
model: 重みと forward
generation_config: 生成戦略
trainer_state: 訓練過程の記録
```

これにより始めやすくなりますが、誤りは見えにくくなります。たとえば tokenizer と model が異なるディレクトリ由来でも、コードは動くかもしれません。しかし token id と embedding row が対応しなくなり、モデル出力は説明不能になります。したがってこの章の重点は API を覚えることではなく、前章までに作った shape、mask、tokenizer、checkpoint の判断をオープンソースモデルのエコシステムへ移すことです。

### tokenizer と model vocab は一致していなければならない

Hugging Face で最も見えにくい誤りの一つは、tokenizer と model がどちらも読み込めるのに、実際には vocab が一致していないことです。

確認方法:

```python
num_tokenizer_tokens = len(tokenizer)
num_embedding_rows = model.get_input_embeddings().weight.size(0)

assert num_tokenizer_tokens <= num_embedding_rows
assert model.get_output_embeddings().weight.size(0) == model.config.vocab_size
```

special tokens を追加した場合、たとえば:

```python
tokenizer.add_special_tokens({"pad_token": "<pad>"})
```

モデル側の embedding も同期して調整する必要があります。

```python
model.resize_token_embeddings(len(tokenizer))
```

そうしないと追加 token に対応する embedding row がなく、訓練も推論も説明できなくなります。

多くの causal LM には元々 `pad_token` がありません。教材段階では一時的に次のように設定できます。

```python
tokenizer.pad_token = tokenizer.eos_token
```

ただし、これは工学上の折衷にすぎません。batch padding のエラーを解決するだけで、`<pad>` と `<eos>` が意味的に同じだということではありません。本当に訓練する場合でも、pad 位置は loss に含めない必要があります。

### `trust_remote_code` は安全境界である

一部のモデルでは次が必要になります。

```python
trust_remote_code=True
```

これは、モデル読み込み時にリポジトリ内のカスタム Python コードを実行するという意味です。教材プロジェクトでは、モデルの出所、コード内容、リスクを明確に理解している場合を除き、デフォルトで有効にしないでください。

## 5. Chat Template

指示モデルは「適当に連結した文字列」をそのまま食べるわけではありません。モデルによって対話フォーマットは異なり、system、user、assistant の境界 token も違う場合があります。tokenizer が持つ chat template を優先して使います。

```python
messages = [
    {"role": "system", "content": "你是谨慎的中文技术助教。"},
    {"role": "user", "content": "解释什么是 causal mask。"},
]

prompt = tokenizer.apply_chat_template(
    messages,
    tokenize=False,
    add_generation_prompt=True,
)
```

先に `apply_chat_template(tokenize=False)` を呼び、その後 tokenizer を呼ぶ場合、special token を二重に追加しないようにします。template、special tokens、label mask は SFT 章の重要な境界です。

## 6. 最小微調整ワークフロー

最小微調整とは「Trainer demo を 1 回走らせる」ことではありません。次の契約を固定することです。

```text
raw examples
  -> format text / messages
  -> tokenize
  -> build labels
  -> train / val split
  -> TrainingArguments
  -> Trainer.train()
  -> evaluate
  -> save_pretrained()
```

causal LM を訓練するとき、よく使うデータフィールドは次です。

```text
input_ids: LongTensor[B, T]
attention_mask: LongTensor[B, T]
labels: LongTensor[B, T]
```

通常の続きを書くタスクでは、`labels` は基本的に `input_ids` のコピーで、padding 位置を `-100` に変えます。SFT では、user/system 位置も通常 `-100` にすべきです。そうしないとモデルはユーザーの質問を復唱するよう訓練されてしまいます。

この章では、普通の causal LM の `labels` と pad mask を確認できれば十分です。assistant-only label mask、chat template span、指示サンプル品質は第 9 章で別途扱います。HF オブジェクトの学習と SFT 目的を混ぜないためです。

Trainer は訓練ループの整理を助けますが、データ目標が正しいかを自動判断してくれるわけではありません。今でも batch を人間が確認する必要があります。

```text
decode input_ids: モデルが実際に見ているもの
decode labels != -100: モデルが実際に学ばされているもの
attention_mask: padding が mask されているか
```

この確認は非常に素朴ですが、微調整事故の多くを早期に見つけます。template の重複、回答の切り落とし、padding の loss 参加、user 内容の loss 参加、special token の二重追加などです。

## 7. 保存と読み込み

再現可能な Hugging Face 実験では、少なくとも次を保存します。

- model weights: `model.save_pretrained(output_dir)` または `trainer.save_model(output_dir)`。
- tokenizer: `tokenizer.save_pretrained(output_dir)`。
- training args: 学習率、batch size、epoch、gradient accumulation、seed。
- dataset version: 生データパス、クリーニングスクリプト hash、split seed。
- eval report: 訓練前後で同じ prompt / eval set を比較した結果。

読み込み時は、同じディレクトリから model と tokenizer を復元します。

```python
tokenizer = AutoTokenizer.from_pretrained(output_dir)
model = AutoModelForCausalLM.from_pretrained(output_dir)
```

重みだけを保存して tokenizer を保存しないと、同じテキストが異なる token ids になり、評価を再現できません。

## 8. Accelerate の位置づけ

Accelerate は新しいモデル理論ではありません。device と分散訓練の抽象化です。Trainer やカスタム訓練ループで multi-GPU、mixed precision、FSDP / DeepSpeed などの工学的問題を扱う助けになります。

教材段階では、まず単一マシンの CPU / 単一 GPU の流れを正しく書き、その後で次を導入します。

- `accelerate config`
- `accelerate launch`
- mixed precision
- gradient accumulation
- checkpoint resume

Accelerate で shape の誤り、label の誤り、データ漏洩を隠してはいけません。分散化は小さな誤りを増幅するだけです。

実際の学習順序は次のようにします。

```text
CPU / tiny model でデータと shape を通す
-> 単一 GPU で最小訓練を通す
-> 保存、読み込み、評価を再現可能にする
-> その後で mixed precision / accelerate / multi-GPU を導入する
```

こうすれば、OOM、device mismatch、分散 checkpoint 問題に遭遇したとき、基礎的な訓練目標は正しいと分かっており、10 種類の問題を同時に調べずに済みます。

## 9. 必須実験

- tiny causal LM を読み込み、prompt から生成テキストまでの完全な推論チェーンを検証する。
- 同じ prompt で greedy、temperature、top-k の出力を比較する。
- 20-100 件の tiny text dataset を作り、最小 Trainer 微調整を 1 回実行する。
- モデルと tokenizer を保存し、再読み込みして、同じ prompt の logits shape と生成フローが使えることを検証する。
- 訓練前後で同じ prompt 群の出力変化を人手で記録する。「loss が下がった」を行動観察の代わりにしない。
- special token を追加した後、`resize_token_embeddings(len(tokenizer))` を実行し、logits の語彙次元と embedding 行数が一致することを検証する。
- revision と generation config を固定し、同じモデルバージョンと greedy 設定で再現できることを検証する。

## 10. 失敗パターン

- model と tokenizer が異なるディレクトリ由来: token id と embedding が一致しない。
- `pad_token` が設定されていない: batch padding や data collator がエラーになる。
- chat template を手書きで間違える: モデルが見る役割境界が事前訓練時の形式と一致しない。
- `max_length` が回答の重要部分を切り落とす: 訓練サンプルは正常に見えても、実際の label は不完全になる。
- train loss だけを見る: モデルは形式を覚えただけで、目標能力は伸びていないかもしれない。
- checkpoint を保存してもデータバージョンを保存しない: 実験を再現できない。
- special token 追加後に embedding resize を忘れる: 追加 token を正しく訓練できず、場合によっては lookup が範囲外になる。
- デフォルトで `trust_remote_code=True` を有効にする: モデル読み込みが未審査コード実行になる。

## 11. テストによる受け入れ

この章の tests では、少なくとも次を検証します。

1. tokenizer 出力に `input_ids` と `attention_mask` が含まれ、shape が一致する。
2. causal LM forward が logits を出力し、`logits.size(-1) == model.get_output_embeddings().weight.size(0)` を満たす。
3. `len(tokenizer) <= model.get_input_embeddings().weight.size(0)`。special tokens を追加した場合、`resize_token_embeddings(len(tokenizer))` が実行済みであることをテストで検証する。
4. data collator が pad 位置の label を `-100` に変える。
5. `save_pretrained()` 後、ローカルディレクトリから model と tokenizer を再読み込みできる。
6. 同じ seed、同じ greedy 生成設定のもとで、短い prompt の出力が再現できる。

## 12. この章の記憶のアンカーと境界

この章で最も重要な一文は次です。

> Hugging Face workflow は工程契約を代わりに考えてくれるものではなく、model、tokenizer、config、training state、generation strategy を標準インターフェースに入れてくれるものである。

覚えておくこと:

1. model、tokenizer、config、revision はセットで固定する。
2. tokenizer に token を追加したら、model embeddings を resize する。
3. pad token は一時的に eos を再利用できるが、pad 位置を loss に入れてはいけない。
4. `trust_remote_code=True` はコード実行境界である。
5. Trainer は訓練を整理するが、label、漏洩、評価を代わりに確認してはくれない。

この章では「指示に従って答える」問題はまだ解いていません。次章では SFT に進みます。

## 13. 次章

この章では「オープンソースモデルをどう再利用するか」を解きました。しかし普通の causal LM の目標は依然として続きを書くことです。次章では SFT に入り、system / user / assistant の指示形式に従うアシスタントとしてモデルを訓練する方法を扱います。
