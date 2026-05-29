# Claude Code 系列翻译工作流

本文件是 Claude Code 源码解析系列的当前翻译事实来源。旧 `docs/workflows/` 文档保留复盘价值，但 agent 执行时应从 `translate/README.md`、项目内 skill 和本文件开始。

## 入口顺序

1. 读取 `translate/README.md` 和对应 skill。
2. 运行正文 dry-run：
   - 英文：`translate/bin/translate-en --dry-run --pipeline claude-code-series <article.md>`
   - 日语：`translate/bin/translate-ja --dry-run --pipeline claude-code-series <article.md>`
3. 展示 run record、artifact、目标路径、frontmatter 策略、链接重写、资产引用和 blocker。
4. 用户确认后才进入真实翻译；真实正文翻译通过 GPT Codex (`codex exec`) 执行，并保持显式门禁，避免误覆盖已有译文。
5. Mermaid 和普通图片分别运行 `translate-assets`；资产 dry-run 会写入自动审查结果，真实阶段必须通过同一套门禁。
6. 发布前运行 `translate-check`，再交给 `publish/`。

## 正文翻译检查清单

- 模型角色必须是 translation engine，不是 agent。
- 模型执行器必须是 GPT Codex；不要调用 Claude Code、`claude` CLI 或旧 `scripts/translate-*` 入口来生成正文译文。
- 只把正文交给模型，frontmatter 由 pipeline 控制。
- 保留 Markdown 结构、代码块、inline code、命令、路径、文件名、链接占位和技术标识。
- 禁止 tool call、XML、JSON、过程话、绝对本机路径和“Here is the translation”包装文本。
- 每篇单独推进，避免长上下文污染下一篇。
- 本地文章链接按 `translate/pipelines/claude-code-series.json` 的文件映射改写。
- `heroImage` 和 `./assets/` 引用保持站内本地资源路径，资产是否存在由 `translate-check` 验证。

## Frontmatter 策略

- `title`、`description`、`locale`、`aliases` 来自 pipeline 配置。
- `author`、`pubDate`、`heroImage` 可继承源文或既有目标文，但不得由模型自由生成。
- 英文目标 `locale: en`，日语目标 `locale: ja`。
- tags 使用 pipeline 中的语言映射；无法可靠映射时进入人工复核。

## Reviewer 机制

- 第一轮 reviewer 检查结构：frontmatter、标题层级、链接、图片引用、代码块和污染残留。
- 第二轮 reviewer 检查语言：术语一致性、自然度、是否残留中文、是否过度意译技术含义。
- reviewer 发现问题时，优先修正目标 Markdown；如果是 pipeline 映射问题，更新 pipeline 后重跑 dry-run。

## 资产阶段

- Mermaid 和普通 PNG/JPG 必须分流。
- Mermaid 阶段只处理源 Mermaid block，输出可渲染 Mermaid 源和 PNG，不复用中文 PNG。
- 普通图片阶段生成 prompt 清单、真实生成计划和执行记录，不覆盖 Mermaid 输出。
- 缺少图片 provider 配置、源/目标路径冲突、目标路径越界、Mermaid/普通图片分流错误时，真实阶段必须阻断。
- 真实阶段记录应包含资产类型、源资产、目标资产、prompt 来源、生成状态、失败原因和复核状态，且不得保存 API key、cookie、token 或私密响应。
- 当前仓库的站内 Markdown 多数已引用 PNG 而不是内嵌 Mermaid；若 dry-run 报 block 不存在，先确认源 Mermaid 是否仍在外部 Obsidian 终稿或旧脚本映射中，不要盲目生成。

## 发布前验收

运行：

```bash
translate/bin/translate-check --language en --pipeline claude-code-series
translate/bin/translate-check --language ja --pipeline claude-code-series
pnpm astro:check
pnpm build
```

验收项：

- frontmatter 必填字段完整，locale 正确。
- 正文图片和 heroImage 均存在。
- pipeline 预期 Mermaid、普通图片和封面图资产均存在，格式和尺寸门禁通过或进入明确复核状态。
- 本地相对链接能指向目标 slug。
- 正文无 tool call、过程话、脚本碎片和明显输出污染。
- 英文正文无非预期 CJK 残留；日语正文无高置信中文残留，低置信长汉字片段进入复核。
- Mermaid、普通图片和封面图资产分类清楚，低置信视觉问题进入人工复核，高置信失败阻断完成。
