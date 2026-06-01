---
title: "第 16 章: 量子化とデプロイ"
description: "前の章までで、評価と安全レビューを通ったモデルができました。しかしモデルはまだ本当の利用フローには入っていません。デプロイ時には新しい制約が出てきます。GPU メモリ、レイテンシ、スループット、同時実行、コールドスタート、監視、ロールバック、コストです。"
author: LienJack
pubDate: 2026-06-01
locale: ja
tags:
  - LLM 学習
  - LLM
  - AI
---
# 第 16 章: 量子化とデプロイ

## 1. この章が本当に解く問題

前の章までで、評価と安全レビューを通ったモデルができました。しかしモデルはまだ本当の利用フローには入っていません。デプロイ時には新しい制約が出てきます。GPU メモリ、レイテンシ、スループット、同時実行、コールドスタート、監視、ロールバック、コストです。

量子化は技術を見せびらかすためではありません。品質、メモリ、レイテンシ、スループットの間で取捨選択するためのものです。通常は重みのメモリを下げられますが、すべてのハードウェア、モデル構造、並行設定で速くなるとは限りません。使う価値があるかどうかは、同じ eval set、同じ decoding parameter、同じ benchmark で検証しなければなりません。

サービス化も「API を 1 つ開く」ことではありません。本当のサービス化とは、モデルを可観測で、rate limit でき、監査でき、ロールバックできるシステムコンポーネントにすることです。

中心的な問い:

```text
モデルの訓練が終わった後、コスト、レイテンシ、スループット、品質、安全の間で、どう検証可能な工程上の取捨選択を行うか。
```

この章は 2 つの半章として学べます。

```text
16A 量子化実験: 同じ eval set で fp16 / int8 / int4 の品質、メモリ、レイテンシを比較する
16B サービス化契約: API、ログ、manifest、release gate、rollback を固定する
```

主線は明確です。量子化は「どの形式で走らせるか」に答え、サービス化は「どう可観測・監査可能・ロールバック可能に走らせるか」に答えます。

## 2. 問いの連鎖

1. 出発点: モデルは notebook で生成できるが、それは実リクエストをサービスできることを意味しない。
2. 新しい問題 1: 重み、KV cache、runtime buffer、同時リクエストが GPU メモリ予算を超える可能性がある。
3. 新しい仕組み 1: FP16 / BF16 / INT8 / INT4、GGUF などの推論形式を使い、リソース圧力を下げる。
4. 新しい境界 1: 量子化により形式、引用、安全な拒否、長文生成が退化する可能性があるため、eval と結びつける必要がある。
5. 新しい問題 2: 単一リクエストが動くことは、並行時のレイテンシ、スループット、エラー率が許容できることを意味しない。
6. 新しい仕組み 2: benchmark、batching、KV cache、timeout、rate limiting、serving engine。
7. 新しい境界 2: batching はスループットを上げる一方、単一リクエストの待ち時間を増やすことがある。
8. 新しい問題 3: オンライン回答が間違った後、バージョン、ログ、中間状態がなければ復盤が難しい。
9. 新しい仕組み 3: API 契約、監視、監査フィールド、deployment manifest、構造化エラー。
10. 新しい境界 3: 新バージョンは安全や引用を退化させる可能性があるため、release gate と rollback が必要。
11. 次章の問い: 訓練、RAG、評価、安全、デプロイをどう法律領域の完全プロジェクトに組み合わせるか。

## 3. Concept Card

| 概念 | 数学的対象 | Shape / 単位 | コード上の対象 | 実験で見る対象 |
| --- | --- | --- | --- | --- |
| precision | 数値形式 | bits/value | `torch_dtype` | メモリと速度 |
| quantization | 低精度重み + scale | int weights + scale/zero point | `quantization_config` | 品質回帰 |
| KV cache | 過去 key/value cache | `[L, B, H, T, Dh] * 2` | `past_key_values` / server cache | 長文脈メモリ |
| prefill | prompt forward 計算 | prompt tokens | benchmark timer | TTFT |
| decode | token-by-token 生成 | output tokens | generation loop | tokens/s |
| batching | 複数リクエストの合批 | dynamic batch | serving queue | throughput / p95 |
| API contract | request/response protocol | JSON schema | FastAPI / client | schema test |
| observability | 実行証拠 | logs / metrics | logger / monitor | 障害復盤 |
| rollback | バージョン一式の復元 | model + adapter + RAG + prompt | deployment config | rollback drill |

## 4. 数値形式

よく使われる形式:

```text
FP32: 訓練は安定するが、メモリが大きい。
FP16: 一般的な推論/訓練形式。メモリは FP32 の約半分。
BF16: 指数範囲が広く、現代ハードウェアでよく使われる。
INT8: 重みが小さく、推論でよく使われる。
INT4: さらにメモリを節約するが、品質と互換性の検証がより必要。
```

重みサイズだけを見てはいけません。推論メモリには KV cache、activation、batch、runtime buffer、断片化も含まれます。

同じモデルでも段階によって異なる bottleneck に当たります。

```text
モデル読み込み時: 重みサイズが基礎メモリ閾値を決める
長い入力処理時: prefill 計算と KV cache が大きくなる
長い回答生成時: token-by-token decode が bottleneck になる
同時リクエスト時: batching、queue、cache 管理が throughput を決める
```

したがって「この 4bit モデルは数 GB しかない」は、「20 個の長文脈同時リクエストを安定してサービスできる」という意味ではありません。デプロイ前には、実際の prompt 長、出力長、同時実行パターンを測ります。

### 推論メモリはモデル重みだけではない

多くの初学者は「4bit モデルは数 GB だけ」と聞くと、安定してデプロイできると思いがちです。この判断は不十分です。

推論メモリには少なくとも次が含まれます。

```text
weights: モデル重み
KV cache: 各層・各 head が過去 key/value を保存
activations / temporary buffers: 現在 forward の中間結果
batching overhead: 複数リクエストを合批することによる追加占有
runtime fragmentation: 推論フレームワークとメモリ断片化
```

KV cache は大まかに次のように理解できます。

```text
num_layers * batch_size * num_heads * seq_len * head_dim * 2
```

最後の `2` は key と value に対応します。

これにより、同じモデルでも次のような挙動になります。

```text
短い prompt + 単一リクエスト: 動く
長い prompt + 長い出力: 遅くなる
長い prompt + 高同時実行: OOM になる可能性がある
```

したがってデプロイ前には「モデル重みがどれくらいか」だけでなく、次も問います。

```text
実際の入力はどれくらい長いか。
平均出力はどれくらいか。
p95 出力はどれくらいか。
同時実行はいくつか。
streaming は有効か。
RAG 検索と後処理を含むか。
```

## 5. 量子化実験

量子化は評価と結びつける必要があります。

```text
baseline FP16/BF16
  -> INT8
  -> INT4
  -> compare quality + latency + memory
```

最小実験表では平均点だけを見てはいけません。

| バージョン | peak memory | p50 latency | p95 latency | TTFT | tokens/s | json valid | citation support | safety regression | 結論 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| fp16/bf16 | | | | | | | | | baseline |
| int8 | | | | | | | | | |
| int4 | | | | | | | | | |

ここで:

```text
json valid: 厳格形式が退化したか
citation support: 引用が引き続き回答を支えているか
safety regression: 高リスク拒否、unknown、human_review が退化したか
```

int4 が高リスク拒否を退化させるなら、平均品質変化が小さくても直接上线できません。

量子化評価では、同じ入力、同じ decoding parameter、同じ eval set を使います。そうでなければ差が量子化によるものか、prompt、temperature、モデルバージョンによるものか判断できません。

最小実験フロー:

```text
load fp16 model -> run eval + benchmark -> save report
load int8 model -> run same eval + benchmark -> save report
load int4 model -> run same eval + benchmark -> save report
compare quality / latency / memory / safety
```

量子化は一方的な利益ではありません。メモリを下げても、一部ハードウェアでは遅くなることがあります。通常 QA はほとんど変わらなくても、厳格 JSON 形式が壊れやすくなることもあります。そのため形式指標と安全指標を比較表に入れます。

int4 版がメモリを下げ、スループットを上げたとしても、`high_risk_unsafe_answer_rate` が退化したり `citation_support_rate` が明確に下がったりするなら、コストが低いだけで公開してはいけません。

## 6. GGUF とローカル推論

GGUF はローカル CPU/GPU 混合推論エコシステムでよく使われます。学習の重点はコマンド暗記ではなく、次を理解することです。

- 重みが推論エンジン対応形式に変換される。
- quant level によってサイズ、速度、品質の取捨選択が異なる。
- tokenizer、chat template、special tokens は依然として一致していなければならない。
- ローカル推論でも同じ eval を走らせる。出力できるかだけを見ない。

ローカル推論で最もよく隠れる問題は、「モデルが中国語を出力できる」ことを「訓練時と一致している」と誤解することです。tokenizer、chat template、system prompt、stop tokens のどれかが一致しないと、モデルの振る舞いは変わります。デプロイチェックでは少なくとも次を保存します。

```text
base model id
adapter id
quantization format
tokenizer version
chat template hash
generation config
eval report id
```

これらのフィールドは後で model card、serving config、run manifest に入ります。

LoRA adapter を merge または形式変換する必要がある場合、merge 前後で同じ eval を実行します。変換後の振る舞いが完全に同じとは仮定しません。

## 7. Serving Engine

最小 API server は自分で書けますが、本番推論では通常、次をサポートする専用 serving engine が必要です。

- continuous batching / dynamic batching。
- KV cache 管理。
- tensor parallel。
- streaming output。
- OpenAI-compatible API。
- リクエストキュー、timeout、cancel。

これらは同時実行下での GPU 利用率とユーザー待ち時間を解決します。単一リクエスト demo が速いことは、同時実行サービスが使えることを意味しません。

### Serving engine はモデルの振る舞いの誤りを直さない

Serving engine が解くのは性能と並行性の問題です。

```text
batching
KV cache
streaming
timeout
queue
parallelism
```

解かないもの:

```text
citation の捏造
JSON 形式の不安定さ
高リスク質問への越境回答
RAG 検索誤り
prompt injection
```

したがってデプロイ最適化は、第 14、15 章の評価と安全と一緒に見なければなりません。サービスは誤答を高速に出せます。それは成功したデプロイではなく、リスクを速く拡大しているだけです。

## 8. API 契約

サービスインターフェースを固定します。

```json
{
  "request_id": "req_001",
  "messages": [
    {"role": "user", "content": "分析这段合同风险..."}
  ],
  "generation_config": {
    "temperature": 0.2,
    "max_new_tokens": 512
  }
}
```

レスポンスにはユーザー可視フィールドと監査フィールドの両方を含めます。

```json
{
  "request_id": "req_001",
  "answer": "...",
  "citations": [],
  "safety_flags": [],
  "needs_human_review": false,
  "model_version": "legal-sft-v3",
  "adapter_version": "legal-lora-v2",
  "rag_index_version": "legal-guidelines-2026-05",
  "prompt_template_version": "rag_prompt_v4",
  "safety_policy_version": "safety_v2",
  "quantization": "int4",
  "generation_config_id": "gen_low_temp_v1",
  "token_usage": {
    "prompt_tokens": 512,
    "completion_tokens": 128
  },
  "finish_reason": "stop",
  "parse_status": "valid_json",
  "latency_ms": 1234
}
```

ドメインシステムは文字列だけを返すべきではありません。引用、安全フラグ、バージョン、レイテンシは問題調査の証拠です。

これらのフィールドは見栄えのためではなく、オンライン事故の重要な問いに答えるためのものです。

```text
今回の回答はどのモデルから来たか。
どの adapter が付いていたか。
どの RAG index を検索したか。
どの prompt template を使ったか。
量子化バージョンは何か。
max_new_tokens で切り落とされたか。
JSON parse は成功したか。
安全ポリシーが発火したか。
```

エラーレスポンスも構造化します。

```json
{
  "request_id": "req_001",
  "error": {
    "code": "generation_timeout",
    "message": "request exceeded max latency budget"
  },
  "model_version": "legal-sft-v3",
  "retryable": true
}
```

エラー契約がないと、呼び出し側はすべての失敗を 500 または空回答として扱うしかなく、後続の監視とロールバックが非常に難しくなります。

これらのフィールドによって、第 14、15 章の評価と安全門禁をオンラインへ延長できます。

## 9. Benchmark

Benchmark は少なくとも 3 種類に分けます。

- 単一リクエストレイテンシ: p50、p95、p99。
- スループット: tokens/s、requests/s、同時実行数。
- 品質回帰: 同じ eval set 上の指標変化。

さらに次を分解します。

```text
prefill time: 入力 prompt の処理
decode time: token-by-token 生成
time to first token
total latency
output tokens per second
```

長い prompt の bottleneck は prefill にあり、長い回答の bottleneck は decode にあることが多いです。

### Benchmark は先に入力分布を定義する

Benchmark が比較不能になるのは、計時コードが間違っているからではなく、入力条件が違うからであることが多いです。

レポートには必ず次を記録します。

```text
warmup 回数
同時実行数
prompt 長分布。例: p50=512, p95=2048
出力長分布。例: p50=128, p95=512
max_new_tokens
temperature / top_p / top_k
streaming の有無
RAG 検索を含むか
safety filter を含むか
ハードウェアと dtype / quantization
```

教材版 benchmark の入力分布は、まず次で固定できます。

```text
prompt_len: p50=512, p95=2048
max_new_tokens: 512
concurrency: 1 / 4 / 16
with_rag: true
temperature: 0.2
```

ドメインモデルでは latency を次に分解することを勧めます。

```text
retrieval_latency_ms
generation_latency_ms
postprocess_latency_ms
total_latency_ms
```

そうしないと、「遅い」ことしか分からず、検索、生成、JSON parse、安全後処理のどこが遅いのか分かりません。

## 10. 監視とロールバック

公開後は少なくとも次を監視します。

- リクエスト量、エラー率、timeout 率。
- p50/p95/p99 レイテンシ。
- 入力/出力 token 分布。
- 拒否率、安全 flag 比率。
- citation 欠落率。
- ユーザーフィードバックと人間レビュー結果。

ロールバック条件は事前に書きます。

```text
エラー率が閾値を超える
レイテンシが閾値を超える
高リスク越境回答が出る
RAG citation が大量に欠落する
新バージョンの regression eval が失敗する
```

監視は 2 種類あります。システム健全性とモデル振る舞いです。システム健全性にはレイテンシ、エラー、スループット、リソース使用量が含まれます。モデル振る舞いには拒否率、citation 欠落率、安全 flag、人間レビュー比率、ユーザーフィードバックが含まれます。

ロールバックも事前に演習しておきます。ロールバック可能なデプロイは次を知っています。

```text
current_model_version
current_adapter_version
rollback_model_version
current_rag_index_version
rollback_rag_index_version
prompt_template_version
generation_config_id
safety_policy_version
config compatibility
rollback command
owner
```

RAG index、adapter、prompt template を一緒にアップグレードしたなら、ロールバックも一式で戻します。モデルだけ戻し、index や prompt を戻さないと、一度も評価していない組み合わせになる可能性があります。

ロールバック前には compatibility check も行います。

```text
model_version
adapter_version
tokenizer_version
rag_index_version
prompt_template_version
generation_config_id
safety_policy_version
```

これらのオブジェクトは、現行版とロールバック版のそれぞれでセットとして一致している必要があります。

## 11. Release Gate: 公開できないバージョン

デプロイ章は最終的に release gate へ落ちます。モデルバージョンは「API が回答を返す」だけで公開してはいけません。

最小 release gate:

```text
eval_report_exists == true
risk_report_exists == true
model_card_exists == true
benchmark_report_exists == true
rollback_target_exists == true
json_valid_rate >= threshold
citation_support_rate >= threshold
high_risk_unsafe_answer_rate == 0
p95_latency_ms <= threshold
error_rate <= threshold
```

どれかが失敗した場合、そのバージョンは実験環境に留めます。

release gate の価値は、「公開できない」条件を最後の人間の感覚ではなく、スクリプトとして書くことです。

## 12. 継続実験: 同じモデルの 4 つのサービス設定

この章では fake generator または極小ローカルモデルを教材実験に使えます。重点はモデル能力ではなくデプロイ指標です。

```text
config_a: baseline。通常出力、低同時実行
config_b: quantized。低メモリだが形式が退化する可能性
config_c: strict serving。短い max_new_tokens + timeout。低レイテンシだが切り落としの可能性
config_d: unsafe new version。高リスクサンプルで失敗し、rollback 検証に使う
```

同じリクエスト群を各設定で実行し、次を記録します。

```text
latency_ms
tokens_per_second
error_rate
json_valid_rate
model_version
rollback_target
deployment_manifest
benchmark_report
```

これにより実際のデプロイ取捨選択が見えます。短い `max_new_tokens` はレイテンシを下げるかもしれませんが、回答を切り落とすかもしれません。量子化はメモリを下げるかもしれませんが、評価指標が明確に退化していないことを確認する必要があります。

## 13. 必須実験

- 同じモデルで fp16、int8、int4 の推論品質とメモリを比較する。
- answer、citations、model_version、latency を返すローカル API server を書く。
- p50/p95、tokens/s、同時実行下の error_rate を報告する benchmark script を書く。
- 異なる batch size / max_new_tokens を負荷テストする。
- バージョン rollback を演習する。旧モデルと新モデルを同じ eval set で切り替えられるようにする。
- rollback target がない設定を意図的に公開し、release gate が失敗することを検証する。
- 量子化版で意図的に `high_risk_unsafe_answer_rate` を退化させ、release gate が失敗することを検証する。

## 14. 失敗パターン

- モデルファイルサイズだけを見て、KV cache と同時実行メモリを見ない。
- 量子化後に safety eval を実行しない。
- API に model version がなく、オンライン出力がどのモデル由来か追跡できない。
- benchmark が単一リクエストだけを測り、同時実行と長文脈を測らない。
- rate limiting がない。突発リクエストがサービスを落とす。
- rollback がない。新バージョンの問題を手作業で緊急修正するしかない。
- スループットだけを見る。batching 後に総 tokens/s は上がったが、p95 latency はすでに許容不能。
- benchmark に warmup または入力分布がない。報告数字が比較不能。
- ログが匿名化されていない原センシティブ入力を保存する。
- モデルだけを rollback し、adapter、RAG index、prompt、safety policy を戻さない。

## 15. テストによる受け入れ

この章の tests では、少なくとも次を検証します。

1. API success response に `answer`、`model_version`、`latency_ms`、`finish_reason` が含まれる。
2. API error response に `request_id`、`error.code`、`model_version`、`retryable` が含まれる。
3. generation config は無限生成を防ぐため `max_new_tokens` を必ず含む。
4. benchmark report は p50、p95、tokens/s、error_rate、入力長分布を含む。
5. 量子化版は同じ eval set を走らせ、fp16/int8/int4 比較レポートを生成する。
6. serving config は `rollback_target` を含む。
7. release gate は eval report、model card、risk report、rollback target が欠けるバージョンを止める。
8. 高リスク安全指標が退化した場合、release gate は失敗しなければならない。
9. ログは匿名化されていない原センシティブ入力を保存してはいけない。少なくとも hash または匿名化記録をサポートする。
10. rollback config は model、adapter、RAG index、prompt template、safety policy をセットで記録する。

## 16. この章の記憶のアンカーと境界

この章で最も重要な一文は次です。

> デプロイはモデルを動かすことではなく、品質、コスト、レイテンシ、安全、観測、ロールバックの間に検証可能な工程契約を作ることである。

覚えておくこと:

1. 量子化は通常重みメモリを下げるが、品質、形式、引用、安全を再評価する必要がある。
2. 推論メモリは重みだけではない。KV cache と同時実行がメモリ予算を変える。
3. Benchmark では p50/p95、TTFT、tokens/s、エラー率、品質回帰を同時に見る。
4. API は文字列だけを返してはいけない。バージョン、引用、安全フラグ、レイテンシ、構造化エラーを返す必要がある。
5. Rollback は model、adapter、RAG index、prompt、safety policy をセットで戻す。
6. Release gate はレポート欠落、rollback 欠落、品質退化、安全退化のあるバージョン公開を止める。

この章では具体的なドメインタスクの組み合わせはまだ解いていません。次章では法律契約レビュー プロジェクトに入り、訓練、RAG、蒸留、評価、安全、デプロイを完全な小規模モデル工程にまとめます。

## 17. 次章

訓練、微調整、RAG、蒸留、評価、安全、デプロイの部品が揃いました。次章から卒業プロジェクトとして、これらの部品を法律契約レビュー小規模モデルに組み合わせます。
