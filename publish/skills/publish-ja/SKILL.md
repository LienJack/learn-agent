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
3. 展示 Zenn 仓库状态、生成文件、图片数量、`published` 状态、Qiita item/visibility、Qiita warnings 和拟提交范围。
4. 只有用户确认后，运行 `publish/bin/publish-ja --yes <article.md> [...]` 执行 Zenn commit/push 与 Qiita 写入。
5. 如果用户希望生成公开文章，确认前明确说明会使用 `--published`：Zenn 会公开，Qiita 也会 public；不带 `--published` 时，Zenn draft 且 Qiita private。

## 安全边界

- Zenn commit/push 和 Qiita API 写入前必须等待用户确认。
- 不把 token、远程私密响应或平台凭据写入记录。
- 用户取消时保留运行记录，并说明 Zenn 工作树或 Qiita artifacts 可能已有生成文件需要手动处理。
