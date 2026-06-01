# mermaid-01 Mermaid render prompt

- Article: `lessons/18_medical_domain_project.md`
- Source: `lessons/assets/18_medical_domain_project/mermaid-01.mmd`
- Target: `lessons/assets/18_medical_domain_project/mermaid-01.png`

## Prompt

展示医学科普助手如何根据普通问题和高风险症状走不同安全路径。

## Mermaid Source

```mermaid
flowchart TD
    A["用户医学问题"] --> B{"是否有 red flags"}
    B -->|否| C["普通科普"]
    C --> D["引用资料"]
    D --> E["表达不确定性"]
    E --> F["建议咨询医生"]
    B -->|是| G["高风险路径"]
    G --> H["不给诊断/剂量"]
    H --> I["建议就医或急救"]
    I --> J["记录安全 flag"]
```
