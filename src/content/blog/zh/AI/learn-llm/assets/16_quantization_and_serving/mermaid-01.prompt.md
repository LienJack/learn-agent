# mermaid-01 Mermaid render prompt

- Article: `lessons/16_quantization_and_serving.md`
- Source: `lessons/assets/16_quantization_and_serving/mermaid-01.mmd`
- Target: `lessons/assets/16_quantization_and_serving/mermaid-01.png`

## Prompt

展示量化实验与服务化发布如何共同决定模型能否上线。

## Mermaid Source

```mermaid
flowchart TD
    A["已评测模型"] --> B["量化候选"]
    B --> C["质量评测"]
    B --> D["性能 Benchmark"]
    C --> E["对比报告"]
    D --> E
    E --> F["服务 API"]
    F --> G["日志与监控"]
    G --> H["Release Gate"]
    H --> I["上线"]
    H --> J["回滚"]
```
