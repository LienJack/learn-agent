# mermaid-01 Mermaid render prompt

- Article: `lessons/05_attention.md`
- Source: `lessons/assets/05_attention/mermaid-01.mmd`
- Target: `lessons/assets/05_attention/mermaid-01.png`

## Prompt

说明 causal self-attention 从输入表示生成 QKV、计算权重并在 mask 约束下汇聚历史信息。

## Mermaid Source

```mermaid
flowchart TD
    A["输入表示 x"] --> B["线性投影 Q"]
    A --> C["线性投影 K"]
    A --> D["线性投影 V"]
    B --> E["QK 点积并缩放"]
    C --> E
    E --> F["应用 causal mask"]
    F --> G["softmax 得到 weights"]
    D --> H["按 weights 加权求和"]
    G --> H
    H --> I["上下文输出 out"]
```
