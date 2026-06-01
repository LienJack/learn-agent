# mermaid-01 Mermaid render prompt

- Article: `lessons/15_safety_and_model_card.md`
- Source: `lessons/assets/15_safety_and_model_card/mermaid-01.mmd`
- Target: `lessons/assets/15_safety_and_model_card/mermaid-01.png`

## Prompt

展示安全边界如何从风险分类进入策略、测试、文档、人工复核和发布门禁。

## Mermaid Source

```mermaid
flowchart TD
    A["风险分类"] --> B["安全策略"]
    B --> C["拒答与不确定性"]
    B --> D["安全测试集"]
    D --> E["安全指标"]
    E --> F["Risk Report"]
    E --> G["Model Card"]
    F --> H["人工 Review"]
    G --> H
    H --> I["发布门禁"]
    I --> J["监控与回滚"]
```
