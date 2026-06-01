# mermaid-01 Mermaid render prompt

- Article: `lessons/10_lora_qlora.md`
- Source: `lessons/assets/10_lora_qlora/mermaid-01.mmd`
- Target: `lessons/assets/10_lora_qlora/mermaid-01.png`

## Prompt

展示 LoRA/QLoRA 如何冻结底座、训练低秩 adapter，并在保存或合并后重新评测。

## Mermaid Source

```mermaid
flowchart TD
    A["Base Model"] --> B["冻结权重 W"]
    B --> C["选择 target modules"]
    C --> D["注入 LoRA A/B"]
    D --> E["只训练 adapter"]
    E --> F["保存 adapter"]
    F --> G["挂载到同一 base"]
    F --> H["merge 到 base"]
    G --> I["重新评测"]
    H --> I
    A --> J["4-bit 量化"]
    J --> K["QLoRA 底座"]
    K --> D
```
