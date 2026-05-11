---
name: publish-en
description: 通过项目内发布中控台将英文文章发布到 DEV
argument-hint: "<英文 Markdown 文章路径> [更多文章路径]"
---

# 英文发布 Skill

本 skill 只能通过显式引用本文件路径触发，不依赖全局安装、symlink 或 `$skill-name` 自动发现。

## 输入要求

- 用户必须提供一个或多个英文 Markdown 文章路径。
- 如果没有提供文章路径，先要求用户补充，不要猜测最近文件。
- V1 只支持 DEV；如果用户要求 Hashnode 或 Medium，说明超出 V1 范围。

## 执行流程

1. 阅读 `publish/README.md` 和 `publish/platforms/en-dev.md`。
2. 检查文章 frontmatter：`title`、`description` 必需；`tags`、`canonical_url`、`cover_image` 建议补齐。DEV 核心标签最多保留前 4 个。
3. 如果文章有本地正文图片或本地 `heroImage`，确认已配置 `DEVTO_IMAGE_UPLOAD_COOKIE`、`PUBLISH_IMAGE_UPLOAD_COMMAND` 或 `PUBLISH_IMAGE_BASE_URL`。
4. 先运行 `publish/bin/publish-en --dry-run <article.md> [...]`，生成 DEV 发布副本或计划摘要、检查结果和运行记录。
5. 向用户展示文章标题、目标平台、图片处理方式、产物路径、运行记录、canonical URL、标签、图片公网化策略和风险提示。
6. 只有用户确认后，运行 `publish/bin/publish-en --yes <article.md> [...]` 执行公开发布。
7. 发布成功后运行或建议运行 `uvx --from "crier==${CRIER_VERSION:-2.0.2}" crier status <article.md>`，确认 registry 记录和 DEV URL。
8. 发布成功、失败或取消都必须写入 `publish/runs/`。

## 图片规则

- DEV API key 不能直接上传图片；本地图片必须通过 DEV 编辑器 cookie、自定义上传命令或公网 base URL 变成远程 URL。
- `DEVTO_IMAGE_UPLOAD_COOKIE`、CSRF token、API key 都不能写入运行记录或回复。
- 使用 cookie 或自定义上传命令时，`--dry-run` 不执行远程图片动作；确认后才上传。
- 源 Markdown 不修改，所有远程图片改写只发生在 `publish/artifacts/` 的发布副本中。

## 坏图修复

如果 DEV 已发布文章出现 `image no longer exists`，不要新发一篇。应重新生成发布副本，找到原 article id，并用 DEV API `PUT /api/articles/<article-id>` 更新同一篇文章，然后检查没有残留 `./assets/`。

## 安全边界

- DEV 是公开发布平台，确认前不得调用真实发布动作。
- 发布副本写入 `publish/artifacts/`，源 Markdown 不修改。
- 不保存 DEV API key、cookie、CSRF token 或私密响应。
