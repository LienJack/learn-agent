# 文章图片流水线

## 总流程

1. 接收一篇或多篇文章路径。
2. 运行 `images/bin/article-images --dry-run` 生成批量计划。
3. 为每篇文章规划 `assets/<article-slug>/` 工作区。
4. Mermaid 阶段提取 `.mmd`、规划 PNG、替换正文引用。
5. SVG Mermaid 阶段识别正文里的 `*.svg` Mermaid 引用，到 Obsidian 原文目录找回对应 Mermaid block，保存 `.mmd`，用 Mermaid CLI 生成 PNG，再替换正文引用。
6. Photos 阶段选择章节、生成 prompt request、等待 `blog-to-photo` 和 `imagegen`；真实图片生成必须一张一张运行。
7. 将选定的生成图片通过 `--import` 导入工作区。
8. 所有最终 PNG/JPG/WebP 通过 ImageMagick 压缩，只有压缩后更小时才覆盖原图。
9. 运行 `images/bin/article-image-check` 验证 Markdown 引用、manifest 和文件存在性。

## 产物约定

- 批量运行记录：`images/runs/<run-id>/record.json`
- 批量计划：`images/artifacts/<run-id>/article-images-plan.json`
- 文章工作区：文章旁 `assets/<article-slug>/`
- 文章 manifest：`assets/<article-slug>/manifest.json`

## 失败处理

- 单个 Mermaid 或 photo 失败时，只标记该 asset，保留同批其他产物。
- 真实图片 API 或内置 `imagegen` 不在 Node 测试中调用。
- ImageMagick 不可用或压缩失败时，asset 标记 `compressionStatus: failed`，不删除原图。
- provider 配置、token、cookie 和 authorization 字段必须脱敏。
