# mermaid-01 Mermaid render prompt

- Article: `lessons/01_pytorch_training_intuition.md`
- Source: `lessons/assets/01_pytorch_training_intuition/mermaid-01.mmd`
- Target: `lessons/assets/01_pytorch_training_intuition/mermaid-01.png`

## Prompt

展示本章最小训练系统如何从数据、前向、反向到验证实验形成可复现闭环。

## Mermaid Source

```mermaid
flowchart TD
    A["固定 seed 与数据切分"] --> B["检查 shape 契约"]
    B --> C["前向计算 logits"]
    C --> D["计算 scalar loss"]
    D --> E["backward 生成梯度"]
    E --> F["optimizer 更新参数"]
    F --> G["记录 train 与 val 指标"]
    G --> H["overfit tiny 与 tests 验证"]
    H --> A
```
