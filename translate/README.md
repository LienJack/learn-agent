# 翻译中控台

`translate/` 是本仓库的翻译事实来源。Codex 翻译时应显式引用项目内 skill 文件，再由 skill 调用这里的 CLI；不要依赖全局 skill 安装、旧 `scripts/translate-*` 入口或上次会话记忆。

## 快速入口

自动识别英文或日语正文翻译：

```text
[$translate](/Users/lienli/Documents/GitHub/learn-agent/translate/skills/translate/SKILL.md) 翻译成日语 --pipeline claude-code-series src/content/blog/zh/...
```

英文正文翻译：

```text
[$translate-en](/Users/lienli/Documents/GitHub/learn-agent/translate/skills/translate-en/SKILL.md) --pipeline claude-code-series src/content/blog/zh/...
```

日语正文翻译：

```text
[$translate-ja](/Users/lienli/Documents/GitHub/learn-agent/translate/skills/translate-ja/SKILL.md) --pipeline claude-code-series src/content/blog/zh/...
```

Mermaid 与普通图片资产本地化：

```text
[$translate-assets](/Users/lienli/Documents/GitHub/learn-agent/translate/skills/translate-assets/SKILL.md) --pipeline claude-code-series --language en --stage mermaid
```

## 命令入口

- `translate/bin/translate-en [--dry-run] [--pipeline claude-code-series] [article.md ...]`：生成英文翻译计划、frontmatter 策略、链接/资产重写摘要和运行记录。真实翻译必须由 skill 展示摘要后再确认。
- `translate/bin/translate-ja [--dry-run] [--pipeline claude-code-series] [article.md ...]`：生成日语翻译计划、frontmatter 策略、链接/资产重写摘要和运行记录。真实翻译必须由 skill 展示摘要后再确认。
- `translate/bin/translate-assets [--dry-run] --language <en|ja> [--stage mermaid|images] [--only file]`：规划 Mermaid 渲染或普通 PNG/JPG 本地化，写入自动审查结果；真实阶段必须通过同一套审查门禁并记录 prompt manifest、执行结果和 post-assets check。
- `translate/bin/translate-check --language <en|ja> [--pipeline claude-code-series] [article.md ...]`：检查目标 Markdown、frontmatter、链接、图片引用、pipeline 预期资产、格式/尺寸、残留污染和发布前置条件。

## 目录职责

- `skills/`：项目内 skill 源文件，只通过显式路径触发。
- `bin/`：翻译、资产和验收入口，供 skill 调用。
- `lib/`：共享运行时、Markdown 解析、pipeline、Mermaid、图片和运行记录逻辑。
- `workflows/`：agent 可执行的翻译工作流事实来源。
- `pipelines/`：系列级路径、frontmatter、资产和检查配置。
- `prompts/`：正文翻译、Mermaid 标签翻译和图片本地化提示词。
- `artifacts/`：每次运行生成的计划、调试源文件、prompt 清单和摘要产物。
- `runs/`：每次运行的 `record.json`，记录输入、目标语言、产物、自动审查、检查结果、blocker、warning、失败原因和复核状态。

## 安全边界

- 翻译中控台只生成站内多语言 Markdown 和本地 assets；DEV、Zenn、微信公众号等发布动作仍由 `publish/` 负责。
- 真实模型翻译、Mermaid 渲染和图片生成前，skill 必须先运行 dry-run 或 check，展示摘要、产物路径、自动审查状态和风险提示。
- 翻译资产真实阶段默认使用自动审查门禁；blocker、缺少图片 provider 配置、源文件缺失、目标路径冲突或语言/分流错误必须阻断执行。
- Mermaid 图必须走独立流程：提取源 Mermaid、翻译可见标签、保留语法、渲染 PNG、写入目标 assets。
- 普通 PNG/JPG 图片不复用 Mermaid 渲染入口；V1 保留 prompt 清单、参考图、尺寸/格式检查、真实阶段记录和可重跑线索，缺少真实 provider 时不得伪造生成成功。
- 运行记录不得保存 API key、cookie、token、认证请求头或完整私密响应。
- `publish/` 是下游发布中控台，不接管翻译生成；`translate/` 不创建平台副本、不公开发布、不 commit/push 外部发布仓库。

## 本地验证

```bash
pnpm test:translate
pnpm astro:check
pnpm build
```
