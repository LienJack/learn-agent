---
title: "第 12 章: RAG 検索拡張生成"
description: "第 11 章でドメインデータ工程を整理すると、新しい問題が出てきます。すべての知識をモデルパラメータに書き込むべきではありません。法律条文、医療ガイドライン、社内制度、製品ドキュメントは更新されます。多くの回答には追跡可能な根拠も必要です。"
author: LienJack
pubDate: 2026-06-01
locale: ja
tags:
  - LLM 学習
  - LLM
  - AI
---
# 第 12 章: RAG 検索拡張生成

## 1. この章が本当に解く問題

第 11 章でドメインデータ工程を整理すると、新しい問題が出てきます。すべての知識をモデルパラメータに書き込むべきではありません。法律条文、医療ガイドライン、社内制度、製品ドキュメントは更新されます。多くの回答には追跡可能な根拠も必要です。

RAG の核心は「ベクトルデータベースを追加する」ことではありません。回答過程を 2 つの検査可能な段階に分けることです。まず根拠を探し、その根拠に基づいて答えます。

中心的な問い:

```text
モデルパラメータはデータベースではない。モデルが回答前に資料を調べ、根拠を外に出すにはどうすればよいか。
```

## 2. 問いの連鎖

1. SFT / LoRA はモデルの振る舞いを変えられるが、知識の新鮮さと追跡可能性は保証できない。
2. 外部知識ベースは更新可能な文書を保存できる。
3. 文書は検索し、文脈へ詰め込めるよう chunk に切る必要がある。
4. Embedding model は query と chunk を同じベクトル空間に写像する。
5. Retriever が top-k 候補を探し、reranker がさらに並べ替える。
6. Generator は検索文脈だけに基づいて回答し、citation を出力する。
7. 次章の問い: 強いモデルの呼び出しコストが高い場合、teacher が生成したデータで student を訓練できるか。

## 3. Concept Card

| 概念 | 数学的対象 | Shape | コード上の対象 | 実験で見る対象 |
| --- | --- | --- | --- | --- |
| document | 原資料 | text | `Document` | 出所メタデータ |
| chunk | 検索単位 | text span | `Chunk` | chunk size |
| embedding | dense vector | `(D,)` | `embed(text)` | 類似度 |
| vector store | ベクトル index | `(N, D)` | `VectorStore` | top-k |
| retriever | 候補 recall | list[chunk] | `retrieve(query)` | recall |
| context prompt | 根拠付き prompt | text | `build_prompt` | 引用 |
| citation | 出所ポインタ | doc id/span | `sources` | 追跡可能性 |

## 4. RAG の最小パイプライン

```text
documents
  -> parse
  -> clean
  -> chunk
  -> embed chunks
  -> build index
query
  -> embed query
  -> retrieve top-k chunks
  -> optional rerank
  -> build prompt with context
  -> generate answer
  -> return answer + citations
```

各ステップは単独でテストできる必要があります。そうでなければ、モデルが間違えたとき、chunking が悪いのか、recall が悪いのか、ranking が悪いのか、prompt が悪いのか、generator が hallucination したのか分かりません。

RAG の工学的価値は帰属可能性にあります。モデルが間違えたとき、次のようにチェーンを追えます。

```text
知識ベースに答えはあるか。
chunk は答えを含む文脈を保持しているか。
retriever は正しい chunk を recall したか。
prompt は根拠を文脈に入れたか。
generator は根拠だけに基づいて答える制約を守ったか。
citation は実在の出所を指しているか。
```

これらの問いに対するログや中間結果がないなら、RAG は「文書を prompt に詰める」だけになり、制御性は本質的には高まりません。

### RAG が失敗したら、どの段階が壊れたか特定できるようにする

RAG の価値は「ベクトル DB がある」ことではなく、エラーを段階ごとに診断できることです。

| 追問 | あり得る問題 | 見るべき対象 |
| --- | --- | --- |
| 知識ベースに答えはあるか | データ欠口 | raw / cleaned documents |
| chunk は答えを保持しているか | 切り方の誤り | chunk text / metadata |
| retriever は見つけたか | recall 失敗 | top-k chunks / scores |
| reranker は上位に置いたか | ranking 失敗 | rerank scores |
| prompt に根拠は入ったか | context packing 失敗 | final prompt |
| generator は根拠を守ったか | generation hallucination | answer vs context |
| citation は結論を支えるか | 偽引用 | cited chunk span |

これらの中間結果を保存しなければ、RAG は後から振り返れません。

最小 RAG 失敗レビューのログは次のようになります。

```json
{
  "query_id": "contract_q_001",
  "query": "这段条款是否缺少责任上限？",
  "top_k": [
    {"chunk_id": "guideline_002#chunk_04", "score": 0.82, "reason": "责任范围"},
    {"chunk_id": "guideline_008#chunk_01", "score": 0.77, "reason": "违约责任"}
  ],
  "final_prompt_id": "legal_rag_prompt_v3",
  "answer_parse_status": "valid_json",
  "citations": ["guideline_002#chunk_04"],
  "citation_support": false,
  "failure_root_cause": "retrieved_relevant_but_not_supporting"
}
```

この種のログがあると、「検索できなかった」「検索したが prompt に入らなかった」「引用はあるが結論を支えていない」を区別できます。これがなければ、第 14 章の failure cases を修正可能な行動に落とし込むのが難しくなります。

## 5. Chunking

chunk が小さすぎると文脈を失います。大きすぎると embedding が薄まり、prompt も圧迫します。よくある戦略:

- 固定 token 長で切る。
- タイトル、段落、条項番号で切る。
- overlap を使い、境界をまたぐ情報を保持する。
- metadata を保持する: `doc_id`、タイトル、ページ番号、段落番号、文字範囲。

ドメイン文書では意味構造を優先して保ちます。契約条項や法規条文の番号を安易に捨ててはいけません。医療ガイドラインでは、適応、禁忌、危険信号をできるだけ分断しない方がよいです。

## 6. Embedding と類似度

Embedding model は、query と chunk を同じベクトル空間で比較できるかを決めます。検索では通常 cosine similarity または dot product を計算します。

```text
query_embedding: FloatTensor[D]
chunk_embeddings: FloatTensor[N, D]
scores: FloatTensor[N]
topk = torch.topk(scores, k=k)
top_k_indices = topk.indices
top_k_scores = topk.values
```

注意: embedding 類似は事実サポートと同じではありません。chunk が質問と意味的に近くても、回答に必要な重要証拠を含まないことがあります。

たとえばユーザーが「契約に責任上限はあるか」と聞いた場合、「違約責任」を含む chunk は類似度が高いかもしれません。しかし「責任上限」条項を含むとは限りません。評価では次を区別します。

```text
retrieval relevance: トピックが関連しているか
answer support: 本当に回答を支えるか
```

多くの RAG システムは、完全に関連文書を検索できないから失敗するのではなく、「関連して見えるが結論を支えるには足りない」文書を検索するために失敗します。

## 7. Retriever と Reranker

Retriever は高速 recall を担当し、reranker は精密な並べ替えを担当します。最小 baseline では、まず top-k dense retrieval だけから始め、その後で次を追加できます。

- keyword / BM25 recall。固有名詞や番号を補う。
- hybrid retrieval。dense と sparse の結果を統合する。
- reranker。query-chunk pair の関連性を並べ替える。
- metadata filter。特定の法規バージョンや文書タイプだけを検索する。

検索戦略をアップグレードするたびに、同じ eval set で比較します。単一の例で良くなった気分になってはいけません。

## 8. Prompt With Context

RAG prompt はモデルに明確な制約を与える必要があります。

```text
你只能基于给定资料回答。
如果资料不足，请说“资料不足，无法判断”。
回答中必须引用来源编号。

[资料 1] doc_id=...
...
[资料 2] doc_id=...
...

问题：...
```

これで hallucination を完全には消せませんが、振る舞い目標を明確にし、評価対象を作れます。

## 9. Citation

Citation は回答末尾に適当にリンクを付けることではありません。各引用には少なくとも次を含めます。

```text
doc_id
chunk_id
title
page_or_section
span_start / span_end
```

評価時には 2 つを確認します。

1. 回答中の事実が引用 chunk によって支えられているか。
2. 引用 chunk が許可された知識ベースバージョンに由来するか。

「まとめて引用」は避けます。回答に 3 つの事実があるのに末尾に 1 つだけ出所を置くと、各事実が支えられているか評価しにくくなります。よりよい方法は、リスク点、結論、段落ごとに citation を持たせることです。

法律・医療場面では、citation は学術的な作法ではなく安全機構です。モデル出力が疑われたとき、人間が出所資料に戻り、それが境界を越えているか判断できます。

### citation existence と citation support は別物

評価時には次を区別します。

```text
citation_exists: 引用 id が存在するか
citation_supports_answer: 引用内容が回答中の事実を本当に支えるか
```

たとえば回答が次のように言うとします。

```text
该条款约定了责任上限。
```

しかし引用 chunk には「違約責任」だけがあり、「責任上限」がないなら、citation exists は true ですが、citation support は false です。

ドメイン RAG の核心的な受け入れ指標には、回答末尾に出所番号があるかだけでなく、citation support rate を含めるべきです。

## 10. 必須実験

- chunk size と overlap を変え、top-k recall を比較する。
- 同じ質問で dense retrieval、keyword retrieval、hybrid retrieval を比較する。
- 無回答質問を作り、モデルが拒否するかを検証する。
- 似ているが誤った distractor documents を作り、reranker と prompt 制約をテストする。
- 回答、引用、検索スコアを出力し、RAG 失敗事例表を作る。

## 11. 失敗パターン

- 検索できない: 知識ベースに答えはあるが、chunk または embedding recall が失敗する。
- 検索したが使わない: context に根拠があるのに、モデルがパラメータ記憶で答える。
- 誤った類似文書を検索する: 近いトピックに答えが誘導される。
- citation が真でない: 出所を引用しているが、回答中の事実はそこにない。
- chunk に metadata がない: 回答根拠を追跡できない。
- prompt が長すぎる: 重要根拠が切り落とされる、またはモデルの注意が弱い位置に置かれる。

## 12. テストによる受け入れ

この章の tests では、少なくとも次を検証します。

1. chunker 出力が `doc_id`、`chunk_id`、テキスト範囲を保持する。
2. embedding index の top-k が安定し、件数が正しい。
3. retriever が既知 query に対して答えを含む chunk を見つけられる。
4. 無回答 query が空の根拠を返す、または拒否経路を発火する。
5. RAG 出力に answer と citations が含まれ、citation が存在する chunk を指す。
6. citation support 指標が「引用は存在するが回答を支えていない」サンプルを検出できる。

## 13. この章の記憶のアンカーと境界

この章で最も重要な一文は次です。

> RAG は文書をモデルに詰め込むことではなく、回答を検査可能な検索、根拠、生成、引用のチェーンに分解することである。

覚えておくこと:

1. chunk は意味構造と metadata を保持する。
2. embedding 類似は事実サポートと同じではない。
3. retriever は recall を担当し、reranker は精密な並べ替えを担当する。
4. prompt は資料不足時の拒否を明示する。
5. citation は追跡可能であり、回答を支える必要がある。

この章では強いモデル呼び出しのコストは解いていません。次章では蒸留に進みます。

## 14. 次章

RAG によってモデルは回答前に資料を調べられますが、毎回強いモデルを呼び出して生成すると依然として高価です。次章では蒸留に入り、teacher が高品質な訓練信号を作り、student がより安価なドメイン能力を学ぶ方法を扱います。
