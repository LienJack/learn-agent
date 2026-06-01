# mermaid-01 Mermaid render prompt

- Article: `lessons/13_distillation.md`
- Source: `lessons/assets/13_distillation/mermaid-01.mmd`
- Target: `lessons/assets/13_distillation/mermaid-01.png`

## Prompt

展示蒸馏如何从评测缺口出发，经 teacher 生成、过滤和 student 训练形成闭环。

## Mermaid Source

```mermaid
flowchart TD
    A["Eval Gap"] --> B["Teacher Prompt"]
    B --> C["Teacher Response"]
    C --> D["规则过滤"]
    D --> E["证据检查"]
    E --> F["人工抽检"]
    F --> G["Approved Distill Data"]
    G --> H["Student SFT / LoRA"]
    H --> I["Student Model"]
    I --> J["同一 Eval Set"]
    J --> K["Base / Teacher / Student 对比"]
    K --> A
    C --> L["Logits / Preference"]
    L --> G
```
