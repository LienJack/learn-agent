# mermaid-01 Mermaid render prompt

- Article: `lessons/06_transformer_block.md`
- Source: `lessons/assets/06_transformer_block/mermaid-01.mmd`
- Target: `lessons/assets/06_transformer_block/mermaid-01.png`

## Prompt

展示 Transformer Block 如何用 pre-norm、attention、残差和 FFN 组成可堆叠模块。

## Mermaid Source

```mermaid
flowchart TD
    A["输入 x B T D"] --> B["LayerNorm 1"]
    B --> C["Multi-Head Attention"]
    C --> D["Dropout"]
    A --> E["残差相加 1"]
    D --> E
    E --> F["LayerNorm 2"]
    F --> G["FFN"]
    G --> H["Dropout"]
    E --> I["残差相加 2"]
    H --> I
    I --> J["输出 B T D"]
```
