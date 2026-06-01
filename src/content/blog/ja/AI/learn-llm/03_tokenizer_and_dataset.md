---
title: "第 3 章: Tokenizer とデータセット構築"
description: "言語モデルが扱えるのは整数 ID だけです。しかし、ユーザー、文書、訓練セットはすべてテキストです。Tokenizer は「前処理用の小道具」ではありません。モデルの入力空間を定義するものです。vocab の大きさ、長い語の分割方法、未知文字の扱い、padding を loss に入れるかどう..."
author: LienJack
pubDate: 2026-06-01
locale: ja
tags:
  - LLM 学習
  - LLM
  - AI
---
# 第 3 章: Tokenizer とデータセット構築

## 1. この章が本当に解く問題

言語モデルが扱えるのは整数 ID だけです。しかし、ユーザー、文書、訓練セットはすべてテキストです。Tokenizer は「前処理用の小道具」ではありません。モデルの入力空間を定義するものです。vocab の大きさ、長い語の分割方法、未知文字の扱い、padding を loss に入れるかどうかを決めます。

中心的な問い:

```text
テキストを安定した token id に変換し、language modeling と SFT の両方で再利用できるデータセットをどう構築するか。
```

## 2. 問いの連鎖

1. 文字列をそのままモデルに入力することはできない。
2. 文字レベル tokenizer は単純だが、系列が長くなり、意味が細かく砕ける。
3. 単語レベル tokenizer は分かりやすいが、開いた語彙では大量の OOV が発生する。
4. サブワード方式は文字レベルと単語レベルの折衷である。よく出る断片は結合し、珍しい語は分解できる。
5. batch には padding、truncation、attention mask が必要になる。
6. 次章の問い: token id はただの番号である。モデルはその番号から、どう更新可能な意味表現を学ぶのか。

## 3. Concept Card

| 概念 | 数学的対象 | Shape | コード上の対象 | 実験で見る対象 |
| --- | --- | --- | --- | --- |
| vocab | token から id への写像 | `V` | `token_to_id` | special token の確認 |
| encode | テキストから id | `(T,)` | `encode(text)` | round-trip |
| decode | id からテキスト | 文字列 | `decode(ids)` | 可逆性 |
| attention mask | 有効位置の印 | `(B, T)` | `attention_mask` | padding を除外 |
| labels | LM の教師目標 | `(B, T)` | `labels` | pad 位置を `-100` にする |

## 4. Tokenizer の最小契約

教材用 tokenizer には、少なくとも次が必要です。

```text
special tokens: <pad>, <unk>, <bos>, <eos>
encode(text, add_special_tokens=True) -> list[int]
decode(ids, skip_special_tokens=True) -> str
batch_encode(texts, max_length, padding, truncation) -> input_ids, attention_mask
```

LM データセットでは、連続する token 流からブロックを切り出す必要もあります。

```text
corpus_ids: LongTensor[N]
sample: input_ids = corpus_ids[i : i + block_size]
        labels    = corpus_ids[i + 1 : i + block_size + 1]
```

SFT データセットでは、どの位置を loss に含めるかも区別します。通常、user/system 部分は文脈としてだけ使い、assistant の回答部分だけを label にします。

Tokenizer は、モデルとテキスト世界をつなぐプロトコルです。訓練、評価、推論、デプロイは同じプロトコルを使わなければなりません。そうしないと、同じ文が別の ID 列になり、モデルの振る舞いも変わります。特に chat model では、system / user / assistant の境界 token は飾りではなく、モデルが役割を理解するための信号です。

special token は最初から固定しておきます。

```text
<pad>: batch の補完。loss に含めるべきではない
<unk>: 未知文字または未知断片
<bos>: 系列開始
<eos>: 系列終了。生成の停止信号
```

`<eos>` がないと、生成は最大長で強制停止するしかありません。`<pad>` が loss に入ると、モデルは多くの位置で padding を予測するよう訓練されます。単なるデータ処理の細部に見えて、実際には訓練目標を直接汚染します。

### attention mask と label mask は別物

初学者が混同しやすい mask が 2 つあります。

```text
attention_mask: この位置をモデルが見てよいか
labels == -100: この位置を loss に含めるか
```

たとえば batch padding 後:

```text
input_ids:      [合同, 违约金, <eos>, <pad>, <pad>]
attention_mask: [1,    1,      1,     0,     0]
labels:         [违约金, <eos>, -100, -100, -100]
```

`attention_mask=0` は、pad 位置は補完にすぎず、文脈情報として扱うべきではないとモデルに伝えます。
`labels=-100` は、その位置で教師信号を計算しないよう loss に伝えます。

2 つの mask の役割は、次の表で覚えられます。

| mask | 何を制御するか | 誰が使うか | 間違えるとどうなるか |
| --- | --- | --- | --- |
| `attention_mask` | モデルがその位置を文脈として扱えるか | attention / model forward | pad が文脈を汚染する |
| `labels == -100` | loss がその位置を教師するか | loss function | pad、user、system が目標として訓練される |

SFT では、さらに別の label mask も出てきます。

```text
system / user:      文脈としてだけ使い、loss に含めない
assistant answer:   目標回答として loss を計算する
```

したがって Dataset は `input_ids` だけを返すべきではありません。少なくとも次を返します。

```text
input_ids
attention_mask
labels
source_id
```

後続の RAG、蒸留、評価では、サンプルの出所を追跡し、データ漏洩を避けるために `source_id` が必要になります。

`source_id` がないと、後で調査が推理ゲームになります。評価セットの「責任上限欠落」に関するサンプルにとてもよく答えられたとしても、それが同じ契約テンプレート由来なのか、訓練に入っていたのか、匿名化済みなのか、公開レポートに使ってよいのか判断できません。`source_id` はメタデータ潔癖ではなく、データ漏洩とコンプライアンス境界を示す最小コストの証拠です。

## 5. なぜサブワードが必要なのか: 文字レベルは長すぎ、単語レベルは壊れやすい

BPE や WordPiece の定義を急いで覚える必要はありません。まず元の難しさを見ます。

語料に次の文があるとします。

```text
合同违约责任过重
```

文字レベル tokenizer は次のように分けます。

```text
合 / 同 / 违 / 约 / 责 / 任 / 过 / 重
```

中国語の各文字を vocab に入れられるため、ほとんど OOV にはなりません。しかし系列が長くなり、モデルが扱う文脈も長くなります。

単語レベル tokenizer では、次のように分かれるかもしれません。

```text
合同违约责任 / 过重
```

系列は短くなりますが、見たことのない新語、誤字、専門用語に出会うと `<unk>` になりやすいです。

サブワード方式は折衷を狙います。

```text
合同 / 违约 / 责任 / 过重
```

よく出る断片は結合し、珍しい語は分解できます。文字レベルほど長くならず、単語レベルのように新語で崩壊しにくくなります。

BPE と WordPiece はどちらも代表的なサブワード方式ですが、結合基準は完全には同じではありません。この章では共通する直感だけを扱います。

> サブワードが有効なのは「意味を理解している」からではなく、開いた語彙と系列長の間で工学的な折衷をしているからである。

たとえば「合同违约责任」は次のように分けられます。

```text
字符级: 合 / 同 / 违 / 约 / 责 / 任
词级: 合同违约责任
子词级: 合同 / 违约 / 责任
```

どれが最適かは、コーパス、モデル、タスクによって変わります。この講座でまず simple tokenizer を書くのは、encode、decode、padding、mask、label の契約をはっきり見るためです。契約を理解してから本物の tokenizer に置き換えると、問題をライブラリのせいにしにくくなります。

Dataset 構築でも出所を残す必要があります。後続の SFT、RAG、蒸留、評価では必ず「このサンプルはどこから来たのか」「eval と漏洩していないか」「リスクタグはあるか」を問います。データオブジェクトが最初から `input_ids` しか持っていないと、後で監査が難しくなります。

## 6. 必須実験

- 文字レベル tokenizer と単純な BPE tokenizer で、同じテキストの token 数を比較する。
- `max_length` が小さすぎるとき、truncation が回答をどう切るかを観察する。
- padding を loss に含めた場合と、pad label を `-100` にした場合の loss を比較する。
- SFT サンプルを作り、assistant 以外の位置が loss に含まれないことを検証する。

## 7. 失敗パターン

- 訓練と推論で tokenizer が一致しない: 同じ文が異なる id になり、モデルの振る舞いを説明できない。
- `<eos>` を忘れる: 生成ループがいつ止まるべきか分からない。
- padding token を mask しない: モデルが pad を出力するよう学ぶ。
- 中国語を空白で分割する: 多くの文が 1 つの未知語として扱われる。
- chat template を変更すると、古いデータが再現できなくなる。

## 8. テストによる受け入れ

この章の tests では、少なくとも次を検証します。

1. special token id が固定され、互いに衝突しない。
2. `decode(encode(text))` が基本文字集合でほぼ可逆である。
3. batch padding 後、`input_ids` と `attention_mask` の shape が一致する。
4. LM dataset の `input_ids` と `labels` が正しく右にずれている。
5. SFT dataset で assistant 以外の label が `-100` に設定されている。
6. tokenizer mismatch が同じ文の id 列を変えることを、テストで露出できる。

## 9. この章の記憶のアンカーと境界

この章で最も重要な一文は次です。

> Tokenizer は前処理用の小道具ではなく、モデル入力空間のプロトコルである。

覚えておくこと:

1. 訓練、評価、推論では同じ tokenizer を使う。
2. `<pad>` は loss に含めるべきではない。
3. `<eos>` は生成停止の重要な信号である。
4. `attention_mask` は見えるかどうかを制御し、`labels=-100` は loss に含めるかどうかを制御する。
5. chat template は役割境界のプロトコルであり、文字列の飾りではない。

この章では、token id の意味問題はまだ解いていません。`42` はただの番号であり、`41` より特定の語に近いわけではありません。次章ではモデルに embedding を学ばせます。

## 10. 次章

テキストは token id になりました。しかし id は離散的な番号にすぎず、番号同士には距離も意味もありません。次章では embedding table を使い、離散 token を訓練可能なベクトルへ写像します。
