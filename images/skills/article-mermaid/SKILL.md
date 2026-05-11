---
name: article-mermaid
description: 将文章内 Mermaid block 或旧 Mermaid SVG 提取/回源为 .mmd 并转换成 PNG 引用
argument-hint: "<article.md ...>"
---

# 文章 Mermaid 图片 Skill

本 skill 只能通过显式引用本文件路径触发。

## 执行流程

1. 阅读 `images/README.md` 和 `images/workflows/mermaid-to-png.md`。
2. 如果文章正文仍有 fenced Mermaid block，运行 `images/bin/article-images --dry-run --stage mermaid <article.md ...>`。
3. 如果文章正文已经是 `*.svg` Mermaid 引用，运行 `images/bin/article-images --dry-run --stage svg-mermaid <article.md ...>`，从 Obsidian 原文目录回源 Mermaid。
4. 展示每篇文章中的 Mermaid 数量、`.mmd` 目标、PNG 目标、工作区和 blocker。
5. 用户确认后运行对应的 `images/bin/article-images --yes --stage mermaid|svg-mermaid <article.md ...>`。
6. 运行 `images/bin/article-image-check <article.md ...>`。

## 规则

- 原 Mermaid 必须从正文提取并保存为 `.mmd`。
- 正文 Mermaid fenced block 必须替换为对应 PNG 图片引用。
- 正文旧 Mermaid SVG 引用必须替换为对应 PNG 图片引用。
- `.mmd` 和 PNG 的对应关系必须写入文章工作区 `manifest.json`。
- 生成的 PNG 必须经过 ImageMagick 压缩。
- Mermaid 渲染失败时保留 `.mmd` 和失败线索，不丢弃其他成功资产。
