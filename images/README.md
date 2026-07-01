# 图片中控台

`images/` 是本仓库的文章图片生成事实来源。Codex 处理正文 Mermaid、正文插图 prompt、生成图片导入和图片运行记录时，应显式引用项目内 skill 文件，再由 skill 调用这里的 CLI；不要继续依赖全局 skill 记忆或散落的旧 `scripts/*` 图片脚本。

## 快速入口

批量处理一篇或多篇文章：

```text
[$article-images](/Users/lienli/Documents/GitHub/learn-agent/images/skills/article-images/SKILL.md) src/content/blog/zh/...
```

只处理 Mermaid 流程图：

```text
[$article-mermaid](/Users/lienli/Documents/GitHub/learn-agent/images/skills/article-mermaid/SKILL.md) src/content/blog/zh/...
```

只处理正文插图 prompt 和图片导入：

```text
[$article-photos](/Users/lienli/Documents/GitHub/learn-agent/images/skills/article-photos/SKILL.md) src/content/blog/zh/...
```

## 命令入口

- `images/bin/article-images [--dry-run] [--stage all|covers|mermaid|svg-mermaid|photos|compress] [--output-format webp] [--mermaid-scale 2] <article.md ...>`：规划文章旁图片工作区、封面 prompt、Mermaid `.mmd`/PNG 或 WebP、SVG Mermaid 回源重建、正文插图 prompt 和运行记录。
- `images/bin/article-images --yes [--stage all|covers|mermaid|svg-mermaid|photos|compress] [--output-format webp] [--mermaid-scale 2] <article.md ...>`：写入文章旁 `assets/<article-slug>/` 工作区，提取 Mermaid 源，生成 prompt 请求，并更新可确定的 Markdown 引用；真实生成/导入/重建后的 PNG/JPG/WebP 默认用 ImageMagick 压缩。
- `images/bin/article-images --import <generated.png> --prompt-id <cover|photo-id> <article.md>`：把 skill 通过 `imagegen` 生成并选定的图片导入文章工作区，更新 manifest 和 Markdown 引用；封面会同步写入 `heroImage`。
- `images/bin/article-image-check <article.md ...>`：检查 Markdown 图片引用、文章工作区 manifest、Mermaid `.mmd`、图片文件和 prompt 文件是否一致。
- `images/bin/article-photo-fallback <prompt-manifest-or-article.md ...>`：只在 `imagegen` 不可用或失败后使用的兜底入口；默认不抢先调用真实图片 API。

## 目录职责

- `skills/`：项目内图片 skill 源文件，只通过显式路径触发。
- `bin/`：文章图片规划、检查、导入和兜底入口，供 skill 调用。
- `lib/`：共享运行时、文章解析、工作区规划、Mermaid、插图 prompt、Markdown 更新、图片导入和运行记录逻辑。
- `workflows/`：agent 可执行的图片工作流事实来源。
- `prompts/`：给 `blog-to-photo` 使用的章节 prompt 模板。
- `artifacts/`：每次批量运行生成的计划、摘要和可审计产物。
- `runs/`：每次运行的 `record.json`，记录输入文章、工作区、asset kind、prompt、blocker、warning 和人工确认点。

每篇文章自己的图片产物放在文章旁边：

```text
src/content/blog/.../article.md
src/content/blog/.../assets/<article-slug>/
  manifest.json
  cover-prompt.md
  cover-prompt.json
  cover-<article-title>.png
  mermaid-01.mmd
  mermaid-01.png
  mermaid-01.webp
  01-article-mermaid-01.mmd
  01-article-mermaid-01.png
  photo-01-<section>-prompt.md
  photo-01-<section>-prompt.json
  photo-01-<section>.png
```

## 安全边界

- 真实图片生成默认由 `article-photos` skill 调用内置 `imagegen`，CLI 只负责 prompt manifest、导入、记录和检查。
- `imagegen` 失败或不可用后，才考虑 `article-photo-fallback`；兜底路径必须继续写回同一个文章工作区。
- Mermaid 源必须保存为 `.mmd`，正文最终使用 PNG 或 WebP 引用。
- Mermaid 默认以 2x 渲染，避免中文小字在正文里发虚；可通过 `--mermaid-scale` 或 `MERMAID_RENDER_SCALE` 调整。
- 已经存在的 `*.svg` 图片引用如果文件名包含 `mermaid`，视为从原文 Mermaid 导出的旧资产：从 Obsidian 原文目录 `/Users/lienli/Library/Mobile Documents/iCloud~md~obsidian/Documents/tech/techBlog/blog` 找回对应 Mermaid block，保存 `.mmd`，重新生成 PNG，并替换正文 SVG 引用。
- 封面图作为 `cover` asset 处理：默认只为缺少 `heroImage` 的文章规划，导入后写回 frontmatter。
- 正文插图至少规划三张；短文不足三段时记录 warning，不编造无关图片。
- 所有最终 PNG/JPG/WebP 必须走 ImageMagick 压缩流程；默认命令是 `magick`，可用 `IMAGEMAGICK_BIN` 覆盖，调试时才使用 `--no-compress` 跳过。
- 运行记录不得保存 API key、cookie、token、认证请求头或完整私密响应。
- `translate/` 仍负责多语言内容和资产本地化；`publish/` 仍负责发布。

## 本地验证

```bash
pnpm test:images
pnpm astro:check
pnpm build
```
