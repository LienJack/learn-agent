# mermaid-01 Mermaid render prompt

- Article: `lessons/08_huggingface_workflow.md`
- Source: `lessons/assets/08_huggingface_workflow/mermaid-01.mmd`
- Target: `lessons/assets/08_huggingface_workflow/mermaid-01.png`

## Prompt

展示 Hugging Face 工作流如何把开源模型、数据、训练和保存连接成可复现实验。

## Mermaid Source

```mermaid
flowchart TD
    A["Model Hub"] --> B["AutoConfig"]
    A --> C["AutoTokenizer"]
    A --> D["AutoModel"]
    C --> E["Prompt / Dataset"]
    D --> F["Forward / Generate"]
    E --> F
    E --> G["Tokenize"]
    G --> H["Trainer"]
    D --> H
    H --> I["Evaluate"]
    H --> J["save_pretrained"]
    C --> J
    B --> J
    J --> K["可复现加载"]
```
