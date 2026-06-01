# mermaid-01 Mermaid render prompt

- Article: `lessons/07_mini_gpt.md`
- Source: `lessons/assets/07_mini_gpt/mermaid-01.mmd`
- Target: `lessons/assets/07_mini_gpt/mermaid-01.png`

## Prompt

展示 Mini GPT 从文本输入到训练、保存和自回归生成的完整工程闭环。

## Mermaid Source

```mermaid
flowchart TD
    A["原始文本"] --> B["Tokenizer"]
    B --> C["input_ids"]
    C --> D["Token Embedding"]
    C --> E["Position Embedding"]
    D --> F["相加"]
    E --> F
    F --> G["Transformer Blocks"]
    G --> H["LM Head"]
    H --> I["Next-token Loss"]
    I --> J["反向传播"]
    J --> K["Checkpoint"]
    H --> L["取最后 logits"]
    L --> M["采样 next token"]
    M --> N["裁剪上下文"]
    N --> G
```
