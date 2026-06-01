# mermaid-01 Mermaid render prompt

- Article: `lessons/19_domain_model_template.md`
- Source: `lessons/assets/19_domain_model_template/mermaid-01.mmd`
- Target: `lessons/assets/19_domain_model_template/mermaid-01.png`

## Prompt

展示可复用领域模型模板从配置、数据、训练到评测、发布和持续迭代的工程闭环。

## Mermaid Source

```mermaid
flowchart TD
    A["配置"] --> B["数据治理"]
    B --> C["SFT/LoRA"]
    B --> D["RAG Index"]
    C --> E["领域模型"]
    D --> E
    E --> F["评测报告"]
    F --> G["风险与模型卡"]
    G --> H["Release Gate"]
    H --> I["部署"]
    I --> J["监控失败"]
    J --> K["Root Cause"]
    K --> B
```
