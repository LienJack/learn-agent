---
name: translate-ja
description: 通过项目内翻译中控台生成日语文章翻译计划并执行受控翻译
argument-hint: "[--pipeline claude-code-series] <中文 Markdown 文章路径> [更多文章路径]"
---

# 日语翻译 Skill

本 skill 只能通过显式引用本文件路径触发，不依赖全局安装、symlink 或 `$skill-name` 自动发现。

## 输入要求

- 用户应提供一个或多个中文 Markdown 文章路径，或显式提供 `--pipeline claude-code-series` 处理系列配置。
- 如果没有文章路径且没有 pipeline 配置，先要求用户补充，不要猜测最近文件。
- V1 只支持站内日语 Markdown 与本地 assets，不负责 Zenn 发布。

## 执行流程

1. 阅读 `translate/README.md`、`translate/workflows/claude-code-series.md` 和 `translate/prompts/ja-translation.md`。
2. 先运行 `translate/bin/translate-ja --dry-run --pipeline claude-code-series <article.md> [...]`，生成翻译计划、检查摘要和运行记录。
3. 向用户展示源文章、目标路径、frontmatter 策略、链接重写策略、资产引用策略、运行记录、artifacts 路径、warnings 和 blockers。
4. 如果存在 blocker，停止真实翻译，并说明需要先修复的文章或配置。
5. 只有用户确认后，才运行不带 `--dry-run` 的真实翻译命令；真实翻译可能消耗模型 API 并改写目标文件。
6. 翻译完成后运行 `translate/bin/translate-check --language ja --pipeline claude-code-series <target.md> [...]`。
7. 如果用户要公开发布，引导到 `publish/skills/publish-ja/SKILL.md`，不要在本 skill 中发布。

## 翻译规则

- frontmatter 由 pipeline 配置和本地规则控制，不交给模型自由生成。
- 模型只翻译正文；保留 Markdown 结构、代码块、路径、命令、链接和技术标识。
- 禁止输出过程话、tool call、XML、JSON 碎片、绝对本机路径噪声或翻译过程说明。
- 本地相对文章链接按 pipeline 映射改写到日语 slug。
- `./assets/` 引用按目标资产命名规则改写；Mermaid 与普通图片资产由 `translate-assets` 单独处理。

## 安全边界

- dry-run 不调用真实模型，不改写目标 Markdown。
- 真实翻译前必须展示摘要并等待用户确认。
- 运行记录不得保存 API key、cookie、token 或完整私密响应。
