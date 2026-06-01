# mermaid-01 Mermaid render prompt

- Article: `lessons/04_embedding_and_neural_lm.md`
- Source: `lessons/assets/04_embedding_and_neural_lm/mermaid-01.mmd`
- Target: `lessons/assets/04_embedding_and_neural_lm/mermaid-01.png`

## Prompt

展示 token id 通过 embedding、因果上下文汇聚和 lm head 变成 next-token logits 的主线。

## Mermaid Source

```mermaid
flowchart TD
    A["input_ids B T"] --> B["embedding 查表"]
    B --> C["hidden B T D"]
    C --> D["causal mask 限制未来"]
    D --> E["汇聚历史上下文"]
    E --> F["mixer 加工表示"]
    F --> G["lm head 投影"]
    G --> H["logits B T V"]
    H --> I["预测 next token"]
```
