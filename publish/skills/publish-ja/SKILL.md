---
name: publish-ja
description: 通过项目内发布中控台生成并推送 Zenn 日语文章
argument-hint: "<日语 Markdown 文章路径> [更多文章路径]"
---

# 日语发布 Skill

本 skill 只能通过显式引用本文件路径触发，不依赖全局安装、symlink 或 `$skill-name` 自动发现。

## 输入要求

- 用户必须提供一个或多个日语 Markdown 文章路径。
- 如果没有提供文章路径，先要求用户补充，不要猜测最近文件。
- V1 只支持 Zenn。

## 执行流程

1. 阅读 `publish/README.md` 和 `publish/platforms/ja-zenn.md`。
2. 先运行 `publish/bin/publish-ja --dry-run <article.md> [...]`，生成检查摘要和运行记录；试运行不得改写 Zenn 仓库。
3. 展示 Zenn 仓库状态、生成文件、图片数量、`published` 状态和拟提交范围。
4. 只有用户确认后，运行 `publish/bin/publish-ja --yes <article.md> [...]` 执行 commit/push。
5. 如果用户希望生成公开文章，确认前明确说明会使用 `--published`。

## 安全边界

- commit 和 push 前必须等待用户确认。
- 不把 token、远程私密响应或平台凭据写入记录。
- 用户取消时保留运行记录，并说明 Zenn 工作树可能已有生成文件需要手动处理。
