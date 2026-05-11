---
name: article-images
description: 通过项目内图片中控台处理文章封面、Mermaid、SVG Mermaid、正文插图和压缩
argument-hint: "[--stage all|covers|mermaid|svg-mermaid|photos|compress] <article.md ...>"
---

# 文章图片总编排 Skill

本 skill 只能通过显式引用本文件路径触发，不依赖全局安装、symlink 或 `$skill-name` 自动发现。

## 输入要求

- 用户必须提供一篇或多篇 Markdown 文章路径。
- 默认处理 `all`：封面 prompt、正文 Mermaid、从原文恢复的 SVG Mermaid、正文插图 prompt/导入和压缩。
- 可以使用 `--stage covers`、`--stage mermaid`、`--stage svg-mermaid`、`--stage photos` 或 `--stage compress` 只运行一个子流程。

## 执行流程

1. 阅读 `images/README.md`、`images/workflows/article-image-pipeline.md`、`images/workflows/mermaid-to-png.md` 和 `images/workflows/blog-to-photo.md`。
2. 先运行 `images/bin/article-images --dry-run [--stage ...] <article.md ...>`。
3. 展示文章数量、每篇文章工作区、封面 prompt 数量、Mermaid 数量、SVG Mermaid 数量、正文插图 prompt 数量、warning、blocker、plan artifact 和 run record。
4. 如果 dry-run 有 blocker，先解决 blocker，不运行真实写入。
5. 用户确认后运行 `images/bin/article-images --yes [--stage ...] <article.md ...>`。
6. 如果包含 `svg-mermaid`，CLI 会到 `/Users/lienli/Library/Mobile Documents/iCloud~md~obsidian/Documents/tech/techBlog/blog` 查找匹配原文，保存对应 Mermaid `.mmd`，用 Mermaid CLI 生成 PNG，并替换旧 SVG 引用。
7. 如果包含 photos，继续调用 `article-photos` skill 按 prompt manifest 使用 `blog-to-photo` 和内置 `imagegen` 生成图片，并通过 `images/bin/article-images --import ... --prompt-id ... <article.md>` 导入选定图片；真实图片生成仍然只能一张一张跑。
8. 所有真实生成、导入或重建后的 PNG/JPG/WebP 默认走压缩流程；仅在调试时可用 `--no-compress` 跳过。
9. 完成后运行 `images/bin/article-image-check <article.md ...>`。

## 规则

- 批量输入从第一版开始支持；不要把多篇文章拆成互相无记录的单篇手工流程。
- 每篇文章使用文章旁 `assets/<article-slug>/` 工作区。
- Mermaid、svg-mermaid、cover、photo、prompt、manifest 必须用 asset kind 区分。
- 已经是 SVG 图片引用且文件名包含 `mermaid` 时，优先从 Obsidian 原文 Mermaid block 重建 PNG，而不是直接把 SVG 栅格化。
- 真实图片生成优先用内置 `imagegen`；只有失败或不可用后才使用 `images/bin/article-photo-fallback`。
- 不建设图库 UI、不做完整多语言图片翻译。
