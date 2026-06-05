---
name: publish-ja
description: 通过项目内发布中控台同步发布日语文章到 Zenn 和 Qiita
argument-hint: "<日语 Markdown 文章路径> [更多文章路径]"
---

# 日语发布 Skill

本 skill 只能通过显式引用本文件路径触发，不依赖全局安装、symlink 或 `$skill-name` 自动发现。

## 输入要求

- 用户必须提供一个或多个日语 Markdown 文章路径。
- 如果没有提供文章路径，先要求用户补充，不要猜测最近文件。
- 日语平台入口同步覆盖 Zenn 和 Qiita。

## 执行流程

1. 阅读 `publish/README.md`、`publish/platforms/ja-zenn.md` 和 `publish/platforms/ja-qiita.md`。
2. 先运行 `publish/bin/publish-ja --dry-run <article.md> [...]`，生成 Zenn 与 Qiita 的检查摘要和运行记录；试运行不得改写 Zenn 仓库，不得调用 Qiita 写接口。
3. 如果文章含本地图片，并使用 `QIITA_IMAGE_BASE_URL` 或 `PUBLISH_IMAGE_BASE_URL`，必须确认 base URL 指向源文章所在目录的公网路径，而不是仓库根路径。例如 `src/content/blog/ja/AI/build-harness/00-01.md` 中的 `assets/foo.png`，base URL 应是 `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/src/content/blog/ja/AI/build-harness/`，不能只写到 `.../<branch>/`。
4. 检查 `publish/artifacts/.../*.qiita.md` 中改写后的图片 URL；至少用 `curl -I` 或脚本对所有 `raw.githubusercontent.com` 图片 URL 做 HEAD 检查，必须全部返回 `200`，否则不要确认发布。
5. 检查 Qiita 标签是否安全；如果源 `tags` 或 `qiita_tags` 含空格，优先改成不含空格的 Qiita-safe 标签，例如 `AgentRuntime`。脚本会自动去掉标签中的半角/全角空格，但仍应在摘要里明确展示归一化结果。
6. 展示 Zenn 仓库状态、生成文件、图片数量、`published` 状态、Qiita item/visibility、Qiita warnings、Qiita 图片 URL 检查结果和拟提交范围。
7. 只有用户确认后，运行 `publish/bin/publish-ja --yes <article.md> [...]` 执行 Zenn commit/push 与 Qiita 写入。
8. 如果用户希望生成公开文章，确认前明确说明会使用 `--published`：Zenn 会公开，Qiita 也会 public；不带 `--published` 时，Zenn draft 且 Qiita private。

## 安全边界

- Zenn commit/push 和 Qiita API 写入前必须等待用户确认。
- 不把 token、远程私密响应或平台凭据写入记录。
- 用户取消时保留运行记录，并说明 Zenn 工作树或 Qiita artifacts 可能已有生成文件需要手动处理。
