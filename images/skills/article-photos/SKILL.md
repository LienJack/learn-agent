---
name: article-photos
description: 为文章章节生成正文插图 prompt，优先用 imagegen 生成并导入项目工作区
argument-hint: "<article.md ...>"
---

# 文章正文插图 Skill

本 skill 只能通过显式引用本文件路径触发。

## 执行流程

1. 阅读 `images/README.md`、`images/workflows/blog-to-photo.md` 和 `images/prompts/blog-to-photo-section.md`。
2. 运行 `images/bin/article-images --dry-run --stage photos <article.md ...>`。
3. 展示每篇文章选中的章节、prompt request、目标文件名、warning、blocker 和工作区。
4. 用户确认后运行 `images/bin/article-images --yes --stage photos <article.md ...>`，生成 prompt request 和 workspace manifest。
5. 对每个 `photo-*` prompt request，调用 `blog-to-photo` skill 生成正向提示词和负向提示词，并把最终 prompt 写回同一文章工作区。
6. 使用内置 `imagegen` 为每个最终 prompt 生成图片。项目图片必须从 `$CODEX_HOME/generated_images/...` 移动或复制到文章工作区，不能只留在 Codex 默认目录。
7. 对选定输出运行 `images/bin/article-images --import <generated.png> --prompt-id <photo-id> <article.md>`。
8. 如果内置 `imagegen` 失败或不可用，才运行 `images/bin/article-photo-fallback ...`，并继续通过 import 路径写回 manifest。
9. 完成后运行 `images/bin/article-image-check <article.md ...>`。

## 规则

- 每篇文章默认至少规划三张正文插图；短文不足时记录 warning，不编造无关图。
- 长文可以规划超过三张，具体由章节长度、复杂度和解释价值启发式决定。
- prompt、最终图片、Markdown anchor 和章节标题都必须写入 manifest。
- 单张图失败不能让整批文章不可判断；保留成功产物和失败线索。
