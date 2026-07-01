# Mermaid 转 PNG/WebP 工作流

1. 用 `images/bin/article-images --dry-run --stage mermaid <article.md ...>` 识别 Mermaid block。
2. 检查每个计划项的 `.mmd` 和图片目标路径；需要 WebP 时加 `--output-format webp`。
3. 用户确认后运行 `images/bin/article-images --yes --stage mermaid <article.md ...>`。
4. CLI 将 Mermaid 源写入 `mermaid-XX.mmd`，默认用 Mermaid CLI `-s 2` 渲染高密度 PNG；如果目标是 WebP，会再用 ImageMagick 转成 lossless WebP，并把正文 fenced block 替换为图片引用。
5. 渲染失败时，`.mmd` 仍留在文章工作区，失败写入 manifest 和 run record。

Mermaid 源保留是多语言流程图复用的关键，不要只保留 PNG。

## SVG Mermaid 回源重建

1. 当正文里已经是 `![...](...mermaid-01.svg)` 这类 SVG 引用时，运行 `images/bin/article-images --dry-run --stage svg-mermaid <article.md ...>`。
2. CLI 会在 `/Users/lienli/Library/Mobile Documents/iCloud~md~obsidian/Documents/tech/techBlog/blog` 里按文章标题或文件名找匹配原文。
3. 根据 SVG 文件名里的 `mermaid-XX` 编号选择原文中第 `XX` 个 Mermaid block。
4. 用户确认后运行 `images/bin/article-images --yes --stage svg-mermaid <article.md ...>`。
5. CLI 保存 `.mmd`，用 Mermaid CLI 生成图片，替换原 SVG Markdown 引用，并用 ImageMagick 压缩生成的图片。

非 Mermaid 命名的 SVG 可能是手绘图或其他来源，不自动重建。
