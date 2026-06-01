# mermaid-01 Mermaid render prompt

- Article: `lessons/02_language_modeling.md`
- Source: `lessons/assets/02_language_modeling/mermaid-01.mmd`
- Target: `lessons/assets/02_language_modeling/mermaid-01.png`

## Prompt

说明语言模型如何把整句续写拆成右移监督、交叉熵训练和自回归生成。

## Mermaid Source

```mermaid
flowchart TD
    A["原始 token 序列"] --> B["inputs 取前 T 个"]
    A --> C["labels 右移一位"]
    B --> D["模型输出 B T V logits"]
    C --> E["正确 next token"]
    D --> F["交叉熵 loss"]
    E --> F
    F --> G["训练更新参数"]
    D --> H["生成时采样下一个 token"]
    H --> I["append 回上下文"]
    I --> H
```
