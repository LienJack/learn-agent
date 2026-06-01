# mermaid-01 Mermaid render prompt

- Article: `lessons/11_domain_data_engineering.md`
- Source: `lessons/assets/11_domain_data_engineering/mermaid-01.mmd`
- Target: `lessons/assets/11_domain_data_engineering/mermaid-01.png`

## Prompt

展示领域数据从原始来源到清洗、训练、检索、评测和蒸馏的血缘关系。

## Mermaid Source

```mermaid
flowchart TD
    A["Raw Sources"] --> B["Manifest"]
    A --> C["Clean / Dedup"]
    C --> D["脱敏"]
    D --> E["Cleaned Chunks"]
    E --> F["RAG 知识库"]
    E --> G["SFT Messages"]
    E --> H["Frozen Eval"]
    G --> I["LoRA / SFT"]
    F --> J["RAG 回答"]
    H --> K["回归评测"]
    J --> L["Distill Prompts"]
    L --> M["蒸馏样本"]
    B --> K
```
