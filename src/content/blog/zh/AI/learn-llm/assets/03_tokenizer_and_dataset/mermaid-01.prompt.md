# mermaid-01 Mermaid render prompt

- Article: `lessons/03_tokenizer_and_dataset.md`
- Source: `lessons/assets/03_tokenizer_and_dataset/mermaid-01.mmd`
- Target: `lessons/assets/03_tokenizer_and_dataset/mermaid-01.png`

## Prompt

展示文本如何经过 tokenizer、特殊 token、padding 和 label mask 变成可训练数据集样本。

## Mermaid Source

```mermaid
flowchart TD
    A["原始文本"] --> B["统一 tokenizer 协议"]
    B --> C["encode 成 token id"]
    C --> D["加入 bos eos 等特殊 token"]
    D --> E["按 max_length 截断"]
    E --> F["batch padding"]
    F --> G["生成 attention_mask"]
    F --> H["构造右移 labels"]
    H --> I["pad 或非答案位置设为 -100"]
    G --> J["Dataset 样本"]
    I --> J
```
