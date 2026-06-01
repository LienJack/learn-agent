---
title: "Chapter 12: RAG Retrieval-Augmented Generation"
description: "After Chapter 11 clarified domain data engineering, a new problem appears: not all knowledge should be written into model parameters. Legal provisi..."
author: LienJack
pubDate: 2026-06-01
locale: en
tags:
  - LLM Learning
  - LLM
  - AI
---
# Chapter 12: RAG Retrieval-Augmented Generation

## 1. The Real Problem This Chapter Solves

After Chapter 11 clarified domain data engineering, a new problem appears: not all knowledge should be written into model parameters. Legal provisions, medical guidelines, company policies, and product documents change. Many answers also need traceable evidence.

The core of RAG is not "add a vector database." It splits answering into two inspectable stages: first find evidence, then answer from that evidence.

Core question:

```text
Model parameters are not a database. How do we make the model look up materials before answering and expose its evidence?
```

## 2. Chain of Questions

1. SFT / LoRA can change model behavior, but they cannot guarantee fresh or traceable knowledge.
2. An external knowledge base can store updatable documents.
3. Documents must be split into chunks so they can be retrieved and inserted into context.
4. An embedding model maps queries and chunks into the same vector space.
5. The retriever finds top-k candidates, and a reranker can refine their order.
6. The generator answers only from retrieved context and outputs citations.
7. Next chapter's question: if strong-model calls are expensive, can we use a teacher to generate data for training a student?

## 3. Concept Card

| Concept | Mathematical object | Shape | Code object | Experimental object |
| --- | --- | --- | --- | --- |
| document | original material | text | `Document` | source metadata |
| chunk | retrieval unit | text span | `Chunk` | chunk size |
| embedding | dense vector | `(D,)` | `embed(text)` | similarity |
| vector store | vector index | `(N, D)` | `VectorStore` | top-k |
| retriever | candidate recall | list[chunk] | `retrieve(query)` | recall |
| context prompt | prompt with evidence | text | `build_prompt` | citation |
| citation | source pointer | doc id/span | `sources` | traceability |

## 4. Minimal RAG Pipeline

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

Every step should be testable on its own. Otherwise, when the model answers incorrectly, you cannot tell whether chunking, recall, ranking, prompting, or generation hallucination caused the problem.

RAG's engineering value is attribution. When the model is wrong, you can follow the chain:

```text
Does the knowledge base contain the answer?
Did the chunk preserve the context containing the answer?
Did the retriever recall the correct chunk?
Did the prompt place the evidence in context?
Did the generator obey the instruction to answer only from evidence?
Does the citation point to a real source?
```

If those questions do not have logs and intermediate artifacts, RAG degenerates into "put documents into the prompt" and does not really improve controllability.

### When RAG fails, locate which segment broke

The value of RAG is not "there is a vector store." It is segmented diagnosis:

| Question | Possible problem | Object to inspect |
| --- | --- | --- |
| Is the answer in the knowledge base? | data gap | raw / cleaned documents |
| Does the chunk preserve the answer? | chunking error | chunk text / metadata |
| Did the retriever find it? | recall failure | top-k chunks / scores |
| Did the reranker rank it high? | ranking failure | rerank scores |
| Did the prompt include the evidence? | context packing failure | final prompt |
| Did the generator obey the evidence? | generation hallucination | answer vs context |
| Does the citation support the conclusion? | false citation | cited chunk span |

If these intermediate results are not saved, RAG cannot be reviewed after the fact.

A minimal RAG failure-review log can look like:

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

This kind of log lets you distinguish "not retrieved," "retrieved but not included in the prompt," and "citation exists but does not support the conclusion." Without it, Chapter 14's failure cases are hard to turn into fixable actions.

## 5. Chunking

Chunks that are too small lose context. Chunks that are too large dilute embeddings and consume prompt space. Common strategies:

- Fixed token-length chunks.
- Chunks by headings, paragraphs, or clause numbers.
- Overlap to preserve cross-boundary information.
- Metadata preservation: `doc_id`, title, page number, paragraph number, character range.

For domain documents, preserve semantic structure first. Contract and regulation numbering should not be casually discarded. In medical guidelines, indications, contraindications, and red flags should not be split apart when possible.

## 6. Embeddings and Similarity

The embedding model determines whether query and chunk can be compared in the same vector space. Retrieval usually computes cosine similarity or dot product:

```text
query_embedding: FloatTensor[D]
chunk_embeddings: FloatTensor[N, D]
scores: FloatTensor[N]
topk = torch.topk(scores, k=k)
top_k_indices = topk.indices
top_k_scores = topk.values
```

Important: embedding similarity is not the same as factual support. A chunk can be semantically close to the question but still lack the key evidence needed to answer.

For example, if the user asks "does the contract have a liability cap," a chunk about "breach liability" may score highly, but it may not contain the liability-cap clause. Evaluation should distinguish:

```text
retrieval relevance: whether the topic is related
answer support: whether the evidence truly supports the answer
```

Many RAG systems fail not because they retrieve nothing relevant, but because they retrieve documents that look related yet do not support the conclusion.

## 7. Retriever and Reranker

The retriever handles fast recall, while the reranker refines ordering. A minimal baseline can start with top-k dense retrieval, then add:

- keyword / BM25 recall to cover proper nouns and numbers.
- hybrid retrieval that combines dense and sparse results.
- reranker scoring for query-chunk pairs.
- metadata filters, such as limiting to a regulation version or document type.

Every retrieval-strategy upgrade should be compared on the same eval set. Do not rely on one impressive example.

## 8. Prompt With Context

The RAG prompt must constrain the model explicitly:

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

This cannot eliminate hallucination completely, but it states the behavioral target clearly and gives evaluation something to check.

## 9. Citation

Citation is not a random link appended at the end of an answer. Each citation should include at least:

```text
doc_id
chunk_id
title
page_or_section
span_start / span_end
```

Evaluation should check two things:

1. Whether facts in the answer are supported by the cited chunks.
2. Whether cited chunks come from an allowed knowledge-base version.

Avoid "bulk citation." If an answer contains three facts but only lists one source at the end, evaluation cannot tell whether each fact is supported. A better pattern is for each risk point, conclusion, or paragraph to carry its own citation.

In legal and medical settings, citation is not academic etiquette. It is a safety mechanism: when an output is challenged, a human can return to the source material and judge whether the model crossed a boundary.

### citation existence is not citation support

Evaluation must distinguish:

```text
citation_exists: whether the citation ID exists
citation_supports_answer: whether the cited content truly supports the answer's facts
```

For example, the answer says:

```text
该条款约定了责任上限。
```

But the cited chunk only mentions "breach liability" and does not mention "liability cap." Then citation exists is true, but citation support should be false.

A core acceptance metric for domain RAG should include citation support rate, not only whether there is a source ID at the end of the answer.

## 10. Required Experiments

- Change chunk size and overlap, comparing top-k recall.
- Compare dense retrieval, keyword retrieval, and hybrid retrieval on the same question.
- Construct no-answer questions and verify that the model refuses.
- Construct similar but wrong distractor documents to test the reranker and prompt constraints.
- Output answers, citations, and retrieval scores, then produce a RAG failure-case table.

## 11. Failure Modes

- Not retrieved: the knowledge base has the answer, but chunking or embedding recall fails.
- Retrieved but unused: evidence is in context, but the model still answers from parametric memory.
- Wrong similar document retrieved: the answer is misled by a nearby topic.
- Citation is false: a source is cited, but the answer's fact is not in that source.
- Chunk lacks metadata: the answer's evidence cannot be traced.
- Prompt is too long: key evidence is truncated or placed where the model attends weakly.

## 12. Test Acceptance

The tests in this chapter should at least verify:

1. chunker output preserves `doc_id`, `chunk_id`, and text ranges.
2. top-k from the embedding index is stable and has the correct count.
3. retriever can find a chunk containing the answer for a known query.
4. no-answer query returns empty evidence or triggers a refusal path.
5. RAG output includes answer and citations, and each citation points to an existing chunk.
6. citation support metric can detect samples where "the citation exists but does not support the answer."

## 13. Memory Anchors and Boundaries

The most important sentence in this chapter is:

> RAG is not stuffing documents into a model; it decomposes answering into an inspectable chain of retrieval, evidence, generation, and citation.

Remember:

1. Chunks should preserve semantic structure and metadata.
2. Embedding similarity is not factual support.
3. The retriever handles recall; the reranker handles refined ordering.
4. The prompt should explicitly refuse when materials are insufficient.
5. Citations must be traceable and must support the answer.

This chapter does not solve the cost of strong-model calls. The next chapter moves into distillation.

## 14. Next Chapter

RAG lets the model look up materials before answering, but calling a strong model for every generation can still be expensive. The next chapter covers distillation: use a teacher to produce high-quality training signals so a student can learn cheaper domain ability.
