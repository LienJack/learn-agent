---
name: translate
description: 自动识别目标语言并通过项目内翻译中控台执行英文或日语文章翻译
argument-hint: "[--language en|ja] [--pipeline claude-code-series] <中文 Markdown 文章路径> [更多文章路径]，也可用自然语言说明目标语言"
---

# 自动翻译入口 Skill

本 skill 只能通过显式引用本文件路径触发，不依赖全局安装、symlink 或 `$skill-name` 自动发现。

## 输入要求

- 用户应提供一个或多个中文 Markdown 文章路径，或显式提供 `--pipeline claude-code-series` 处理系列配置。
- 用户可以用自然语言说明目标语言，例如“翻译成英文”“做日语版”“生成 Japanese 版本”。
- 用户也可以显式传入 `--language en` 或 `--language ja`；显式参数优先级最高。
- 如果没有文章路径且没有 pipeline 配置，先要求用户补充，不要猜测最近文件。

## 语言识别规则

按以下顺序判断目标语言：

1. 如果输入包含 `--language en`、`--lang en`、`language=en` 或 `lang=en`，选择英文。
2. 如果输入包含 `--language ja`、`--lang ja`、`language=ja` 或 `lang=ja`，选择日语。
3. 如果用户说“英文”“英语”“English”“EN”“英译”，选择英文。
4. 如果用户说“日语”“日文”“日本語”“Japanese”“JA”“Zenn”，选择日语。
5. 如果同时出现英文和日语信号，或没有任何语言信号，必须先向用户澄清，不要自动选择。

澄清时给出编号选项并等待用户回复：

1. 英文
2. 日语

## 执行流程

1. 阅读 `translate/README.md` 和 `translate/workflows/claude-code-series.md`。
2. 根据语言识别规则确定目标语言。
3. 如果目标语言是英文，阅读并执行 `translate/skills/translate-en/SKILL.md`。
4. 如果目标语言是日语，阅读并执行 `translate/skills/translate-ja/SKILL.md`。
5. 保留用户传入的 `--pipeline`、文章路径和其他非语言参数；转交给对应语言 skill。
6. 不在本入口中直接调用模型翻译、不发布到外部平台、不处理图片资产；图片资产继续使用 `translate/skills/translate-assets/SKILL.md`。

## 安全边界

- 本入口只做语言识别和 skill 路由，不复制英文/日语翻译规则。
- 真实翻译前仍必须遵守对应语言 skill 的 dry-run、摘要展示和用户确认流程。
- 运行记录不得保存 API key、cookie、token 或完整私密响应。
