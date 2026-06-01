---
title: "第 15 章：SFT 指令微调"
description: "怎么让模型从“续写文本”变成“按指令回答”？SFT 让模型学习消息格式、输出结构和行为边界，但不会自动让事实更可靠。"
author: LienJack
pubDate: 2026-06-01
locale: zh
tags:
  - LLM 学习
  - LLM
  - AI
---
# 第 15 章：SFT 指令微调

## 本章核心困惑

怎么让模型从“续写文本”变成“按指令回答”？SFT 让模型学习消息格式、输出结构和行为边界，但不会自动让事实更可靠。

学习者常常把 SFT 想成“把知识灌进模型”。更准确的理解是：

```text
预训练模型会续写
  -> chat template 让它看到对话格式
    -> SFT 让它模仿 assistant 在这种格式下的回复
      -> 它可以学会 JSON、拒答、引用字段和语气
        -> 但事实证据仍需要 RAG、数据质量和评测约束
```

SFT 的价值是把模型行为变成契约：看到什么输入，应该按什么结构、什么边界、什么风格输出。它的风险是：如果训练样本里有无依据强答、错误引用或越权建议，模型会非常认真地学会这些坏习惯。

## 前置知识

- 已理解 tokenizer、chat template 和 assistant-only loss。
- 已有 frozen eval set。
- 知道数据切分和泄漏风险。
- 已理解 RAG 中 citation、unknown 和 human review 的意义。

本章默认你已经有少量高质量指令样本，并能用第 12 章评测系统比较训练前后变化。

## 本章新增能力

你会构造 instruction tuning 数据，处理 system/user/assistant 消息、chat dataset、JSON schema validation、数据清洗、train/val/test、格式一致性和过拟合观察。

学完本章，你应该能解释：

- 为什么 labels 要 mask 掉 system/user token。
- 为什么 SFT 后必须同时报告格式、事实、引用和拒答指标。
- 为什么 20 条教学样本可以用来过拟合格式，但不能证明模型可发布。
- 为什么 SFT 数据要按来源分组切分，而不是随机打散。

## 最小推导或最小代码

SFT 的核心是只让 assistant 回复参与 loss：

```text
system: 规则和边界       labels = -100
user:   用户问题           labels = -100
assistant: 结构化回答      labels = token ids
```

训练前后必须用同一 eval 对比：

```text
base model eval -> SFT train -> tuned model eval -> compare format/fact/refusal
```

这里的 “同一 eval” 指第 12 章固定 eval runner，而不是重新写一组 SFT 专用样例。SFT 报告至少要同时比较：

```text
format_accuracy: JSON 和字段是否更稳定
citation_support: 引用字段是否仍然有证据支撑
refusal_accuracy: 无依据/越权问题是否仍能拒答
red_flag_recall: 医学危险信号是否仍能召回
regression_delta: 相比 base model 是否出现安全回退
```

如果格式准确率从 `0.60` 升到 `0.95`，但 `citation_support` 从 `0.80` 降到 `0.50`，这不是成功 SFT，而是模型学会了更稳定地输出看似合规的错误引用。

最小 loss 推导：语言模型每个位置都预测下一个 token。SFT 不希望模型学习“如何生成用户问题”或“如何生成 system 规则”，只希望它学习 assistant 如何回复。因此非 assistant 区域 labels 设置为 `-100`，交叉熵会忽略这些位置。

```text
tokens:  [<system>, 规则, <user>, 问题, <assistant>, {"answer": ...}]
labels:  [-100,    -100, -100,  -100, token_id,     token_id ...]
```

反过来，如果把所有 token 都纳入 loss，模型会被奖励去预测 system 规则和用户问题：

```text
错误 labels: [<system>, 规则, <user>, 问题, <assistant>, {"answer": ...}]
学习目标: 既学会“用户会怎么问”，又学会“assistant 怎么答”
问题: 小数据下 loss 可能下降，但回答边界和角色分工变差
```

手算一个比例：一条样本 100 个 token，其中 system/user 有 65 个，assistant 只有 35 个。如果不 mask，65% 的 loss 都花在复述条件文本上；assistant-only loss 则把 100% 的训练信号集中到回答契约。

最小检查代码思路：

```python
rendered_text = tokenizer.apply_chat_template(messages, tokenize=False)
encoding = tokenizer(rendered_text, return_offsets_mapping=True)
assistant_spans = find_assistant_spans(rendered_text, messages)

labels = encoding["input_ids"].copy()
for i, (start, end) in enumerate(encoding["offset_mapping"]):
    role = role_at_char_span(start, end, assistant_spans)
    if role != "assistant":
        labels[i] = -100

for token, role, label in debug_labels(encoding, labels, assistant_spans):
    if role in {"system", "user", "template", "padding"}:
        assert label == -100
```

完整路径必须是 `messages -> apply_chat_template -> rendered_text -> assistant spans -> tokenizer offset_mapping -> labels=input_ids.copy()`。如果 tokenizer 没有 offset mapping，就用模板渲染时记录 assistant 内容的字符区间；不要靠“看到 `<|assistant|>` 后全部训练”这种脆弱字符串规则。Hugging Face `AutoModelForCausalLM` 内部会做 causal LM shift，所以 collator 输出的 `labels` 应与 `input_ids` 同形，非 assistant token 和 padding 为 `-100`，不要手动再整体右移一次。

`debug_labels()` 至少要打印：

```text
token | role | label | contributes_to_loss
```

抽样检查时，system/user/template/padding 都必须是 `-100`，assistant 内容 token 才能贡献 loss。

### 例子 1：合同审查 SFT 样本

```json
{
  "sample_id": "legal_sft_001",
  "source_group": "contract_guideline_2026_05",
  "task_type": "legal_contract_review",
  "risk_tags": ["legal", "human_review"],
  "answerability": "answerable",
  "template_version": "chat_template_v1",
  "evidence_ids": [
    {"source_id": "law_doc_12", "span_id": "s_03", "support_level": "partial"}
  ],
  "messages": [
    {"role": "system", "content": "你是谨慎的合同审查助手，只基于给定条款和证据输出 JSON。"},
    {"role": "user", "content": "条款：乙方逾期交付，每日按合同总价 5% 支付违约金。证据：约定违约金过分高于损失时可能被调整。"},
    {"role": "assistant", "content": "{\"risk_level\":\"high\",\"risk_labels\":[\"违约金过高\"],\"citations\":[{\"source_id\":\"law_doc_12\",\"span_id\":\"s_03\",\"support_level\":\"partial\"}],\"review_required\":true,\"review_type\":\"lawyer\"}"}
  ]
}
```

这条样本训练的是结构化输出、谨慎措辞和复核标志。它不是让模型记住所有合同法知识。

### 例子 2：医学科普 SFT 样本

```json
{
  "sample_id": "medical_sft_001",
  "source_group": "medical_guideline_2026_05",
  "task_type": "medical_qa",
  "risk_tags": ["medical", "red_flag"],
  "answerability": "red_flag",
  "template_version": "chat_template_v1",
  "evidence_ids": [
    {"source_id": "medical_guideline_08", "span_id": "s_11", "support_level": "full"}
  ],
  "messages": [
    {"role": "system", "content": "你是医学科普助手，不能替代医生诊断，遇到危险信号要建议及时就医。"},
    {"role": "user", "content": "胸痛伴大汗和呼吸困难，可以先观察吗？"},
    {"role": "assistant", "content": "{\"answer\":\"这属于需要警惕的危险信号，建议立即寻求急诊或急救帮助。\",\"red_flags\":[\"胸痛\",\"大汗\",\"呼吸困难\"],\"citations\":[{\"source_id\":\"medical_guideline_08\",\"span_id\":\"s_11\",\"support_level\":\"full\"}],\"not_diagnosis\":true,\"review_required\":true,\"review_type\":\"clinician\"}"}
  ]
}
```

这条样本训练的是升级处理，而不是诊断具体疾病。边界越清楚，模型越不容易被训练成“热心但越权”的助手。

### 反例或边界：SFT 会放大数据里的坏模式

坏样本：

```json
{
  "user": "这段合同违约金 5% 每日，合法吗？",
  "assistant": "一定违法，可以直接拒绝履行。"
}
```

如果这类样本大量出现，SFT 会学会绝对化法律结论。模型不是“理解了法律”，而是模仿了训练数据里的语气和判断方式。

边界是：SFT 适合训练回答契约，不适合替代证据系统。事实经常更新、需要引用和版本控制的内容，应优先放入 RAG，而不是靠 SFT 写进参数。

## 常见错误

| 常见错误 | 表现 | 正确认识 | 检查方法 |
| --- | --- | --- | --- |
| system/user token 进入 loss | 模型学会复述用户或规则 | 只训练 assistant 回复 | 抽样打印 labels |
| 只报告格式准确率提升 | JSON 更稳但事实更差 | 格式是必要不充分条件 | 同时报 fact/citation/refusal |
| train/val/test 随机切分 | 同源样本泄漏 | 领域数据要按来源分组 | 检查 `source_group` |
| 训练和推理 template 不一致 | 部署输出漂移 | template 是输入分布 | 保存 rendered prompt |
| 样本答案过长且无结构 | loss 被冗余文本占据 | 输出应贴近任务 schema | schema validation |
| 学习率过高或训练太久 | 小数据过拟合、拒答退化 | SFT 容易记住样本 | 观察 train/val gap |
| 用 SFT 修复 RAG 缺证据 | 模型更会编引用 | 证据链问题要先修 RAG | citation support 回归 |

## 测试验收

- system/user token 不参与 loss。
- assistant 输出符合 JSON schema。
- 训练后格式准确率提升，但报告事实/引用/拒答指标。
- 20 条教学样本能过拟合 JSON 格式，课程项目样本必须分 train/val/test。
- 至少保留一个训练失败案例，例如 train loss 降低但 high-risk refusal accuracy 下降。
- 训练报告记录 base model、数据版本、chat template、max length、learning rate、epoch、seed。
- 必须复用第 12 章 frozen eval runner，对比 base 与 SFT 的 `format_accuracy`、`citation_support`、`refusal_accuracy`、`red_flag_recall` 和 `regression_delta`。
- 如果格式提升但 citation/refusal/safety 指标下降，本章判定为行为对齐失败，不能进入 LoRA 或发布候选。

最小实验建议：

```text
Phase A: 20 条格式高度一致的教学样本，过拟合检查 template、labels、collator 和 schema。
Phase B: frozen eval，必须包含 negative / unanswerable / red-flag / prompt-injection 样本。
比较 base 与 SFT 的 format、task success、claim-level citation support、refusal、red flag、privacy、schema。
如果格式升高但 citation/refusal/safety 下降，停止扩大训练，先修数据。
```

## FAQ

### 1. SFT 后模型是不是学到了新知识？

可能记住了一些样本内容，但这不是可靠的知识更新方式。SFT 更适合学习指令遵循、输出格式、风格和边界。需要版本化证据的知识应由 RAG 提供。

### 2. 为什么要先用少量样本过拟合？

这是管道测试。如果 20 条高质量样本都学不会，说明 template、labels、学习率、数据格式或训练代码可能有问题。过拟合教学样本不是最终目标，而是最小可行性检查。

### 3. assistant-only loss 会不会浪费用户问题信息？

不会。用户问题仍作为上下文进入模型，只是不把它作为预测目标。模型根据 system/user 条件来预测 assistant token。

### 4. SFT 数据需要多样化还是一致化？

两者都要。schema 和边界要一致，场景和表达要多样。过度一致会让模型只会模板填空，过度杂乱会让模型学不到稳定契约。

### 5. 为什么 SFT 后拒答能力可能下降？

如果训练样本大多都是“有问必答”，模型会学到积极回答偏好。高风险项目必须显式加入无依据、越权、危险请求和转人工样本。

### 6. SFT 与 LoRA 是什么关系？

SFT 是训练目标和数据形式，LoRA 是参数高效训练方法。你可以用全量微调做 SFT，也可以用 LoRA 做 SFT。不要把二者混为一谈。

## 自测题

1. 为什么 SFT 要 mask system/user token？
2. SFT 最适合学习哪些能力？不适合承担什么责任？
3. 为什么 20 条样本过拟合通过不代表模型可发布？
4. 如果 SFT 后格式准确率升高但 citation support 下降，说明什么？
5. 请写出一个医学助手应拒答或升级处理的 SFT 样本要点。

答案要点：

- 因为训练目标是 assistant 回复，system/user 只是条件上下文。
- 适合学格式、语气、行为边界和指令遵循；不适合替代证据、许可和事实更新。
- 小样本过拟合只验证管道，不验证泛化和安全。
- 模型学会了输出形状，但证据使用退化，应检查数据和 RAG。
- 应包含危险信号、不能诊断/处方、建议及时就医或人工复核。

## 想继续深挖

继续深挖 SFT，要把 assistant-only loss 写成 mask 版 token loss：

```text
loss = Σ_t assistant_mask_t * CE(logits_t, label_t) / Σ_t assistant_mask_t
```

`system` 和 `user` token 是条件，不是模型应该学习输出的目标；`assistant` token 才是行为示范。如果 mask 反了，loss 仍可能下降，但模型学到的是复述用户或模板，而不是回答。

SFT 的深层边界也在公式里：它最大化的是训练集中 assistant 回复的概率，不验证这些回复是否有事实证据。因此 SFT 后必须同时看：

```text
format_accuracy ↑
citation_support 不下降
refusal_accuracy 不下降
red_flag_recall 不下降
```

只要格式变好但安全或证据指标下降，就不是成功对齐，而是更稳定地学会了错误行为。

## 和领域项目的关系

法律和医学助手需要稳定输出结构化字段，例如风险等级、证据、免责声明和人工复核标志。SFT 训练的是这种行为契约，但事实依据仍要由 RAG 和评测约束。

法律项目中，SFT 可以让模型稳定输出 `risk_level`、`risk_labels`、`evidence_spans`、`review_required` 和 `review_type=lawyer`。医学项目中，SFT 可以让模型稳定输出 `red_flags`、`care_level`、`not_diagnosis`、`review_required` 和 `review_type=clinician`。

本章的工程边界是：SFT 不能把坏数据变好，不能把缺失证据变成证据，不能替代发布评测。它的典型失败模式是格式变好但事实变差、拒答能力下降、训练样本泄漏到 eval、模型学会绝对化语气。只要这些失败没有被评测系统捕捉，SFT 带来的“进步”就可能只是更稳定的错误。
