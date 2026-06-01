# mermaid-01 Mermaid render prompt

- Article: `lessons/12_rag_baseline.md`
- Source: `lessons/assets/12_rag_baseline/mermaid-01.mmd`
- Target: `lessons/assets/12_rag_baseline/mermaid-01.png`

## Prompt

展示 RAG 基线从文档索引到检索、生成、引用和失败定位的可诊断链路。

## Mermaid Source

```mermaid
flowchart TD
    A["Documents"] --> B["Parse / Clean"]
    B --> C["Chunk"]
    C --> D["Embed Chunks"]
    D --> E["Vector Index"]
    F["Query"] --> G["Embed Query"]
    G --> H["Retrieve Top-k"]
    E --> H
    H --> I["Optional Rerank"]
    I --> J["Build Context"]
    J --> K["Generate Answer"]
    K --> L["Citations"]
    H --> M["检索日志"]
    J --> M
    L --> N["Support Check"]
```
