# mermaid-01 Mermaid render prompt

- Article: `lessons/14_evaluation.md`
- Source: `lessons/assets/14_evaluation/mermaid-01.mmd`
- Target: `lessons/assets/14_evaluation/mermaid-01.png`

## Prompt

展示模型评测从样本设计、运行、指标聚合到失败案例回流的完整证据链。

## Mermaid Source

```mermaid
flowchart TD
    A["Eval Set"] --> B["运行模型"]
    B --> C["保存预测"]
    C --> D["自动指标"]
    C --> E["人工评分"]
    D --> F["切片报告"]
    E --> F
    F --> G["失败案例表"]
    G --> H["数据/RAG/Prompt 修正"]
    H --> A
    F --> I["Release Gate"]
```
