# mermaid-01 Mermaid render prompt

- Article: `lessons/09_sft_instruction_tuning.md`
- Source: `lessons/assets/09_sft_instruction_tuning/mermaid-01.mmd`
- Target: `lessons/assets/09_sft_instruction_tuning/mermaid-01.png`

## Prompt

展示 SFT 如何把结构化消息转换为只监督 assistant 回答的训练样本。

## Mermaid Source

```mermaid
flowchart TD
    A["结构化 messages"] --> B["Chat Template"]
    B --> C["完整 token 序列"]
    A --> D["assistant 前缀"]
    D --> E["prompt_ids"]
    C --> F["labels 拷贝"]
    E --> G["前缀设为 -100"]
    F --> G
    G --> H["assistant-only loss"]
    H --> I["SFT 训练"]
    I --> J["固定探针评测"]
    J --> K["行为对比"]
```
