# mermaid-01 Mermaid render prompt

- Article: `lessons/17_legal_domain_project.md`
- Source: `lessons/assets/17_legal_domain_project/mermaid-01.mmd`
- Target: `lessons/assets/17_legal_domain_project/mermaid-01.png`

## Prompt

展示法律合同审查小模型从脱敏合同数据到风险 JSON、评测和人工复核的项目闭环。

## Mermaid Source

```mermaid
flowchart TD
    A["脱敏合同"] --> B["风险标签"]
    B --> C["SFT 样本"]
    A --> D["条款知识库"]
    D --> E["RAG 检索"]
    C --> F["LoRA 训练"]
    E --> G["风险 JSON"]
    F --> G
    G --> H["引用检查"]
    H --> I["安全评测"]
    I --> J["人工复核"]
    J --> K["Model Card"]
```
