---
name: publish-cn
description: 通过项目内发布中控台创建微信公众号、掘金、知乎中文草稿
argument-hint: "<中文 Markdown 文章路径> [更多文章路径]"
---

# 中文发布 Skill

本 skill 只能通过显式引用本文件路径触发，不依赖全局安装、symlink 或 `$skill-name` 自动发现。

## 输入要求

- 用户必须提供一个或多个中文 Markdown 文章路径。
- 如果没有提供文章路径，先要求用户补充，不要猜测最近文件。
- 默认目标平台是微信公众号、掘金、知乎。

## 执行流程

1. 阅读 `publish/README.md` 和 `publish/platforms/cn.md`。
2. 运行 `publish/bin/publish-cn <article.md> [...]` 做前置检查、命令计划、验收字段和运行记录。
3. 对每篇文章检查封面路径；缺失则跳过该文，不继续三平台发布。
4. 如果公众号标题超过 32 字且没有 `wechatTitle` / `shortTitle` / `wechat_title`，先要求补短标题。
5. 微信公众号必须按 `md2wechat` 棕色主题链路处理：discovery -> config validate -> inspect -> `convert --mode ai --theme autumn-warm` -> 静态检查 -> `upload_image` -> `test-draft`。不使用 Wechatsync 作为公众号最终稿路径。
6. 检查微信 HTML 的代码块处理：`text` 围栏必须是说明块，真实代码必须保留语言、缩进和长行可读性；必要时使用逐行 `&nbsp;` fallback。
7. 掘金和知乎必须分别运行单平台 Wechatsync：先 `--dry-run`，再正式创建草稿。含本地图片时不要合并 `-p zhihu,juejin`。
8. 某个平台失败时记录失败平台、失败命令和错误输出；继续下一篇，但最终汇总不能误报整批成功。
9. 将草稿链接、draft id、人工动作、图片上传数量、失败原因和“未点击正式发布”确认写入本次 `publish/runs/` 记录。

## 必须使用的命令形态

```bash
md2wechat inspect "article.md"
md2wechat convert "article.md" --mode ai --theme autumn-warm --title "短标题" -o "article-wechat.html"
md2wechat upload_image "path/to/local-image.png" --json
md2wechat test-draft "article-wechat.html" "cover.jpg" --json
rg -n "mdnice编辑器|pre class=\"custom\"|code class=\"hljs\"|&nbsp;|overflow-x:auto|note-block" "article-wechat.html"

WECHATSYNC_TOKEN="$WECHATSYNC_TOKEN" wechatsync sync "article.md" -p juejin --title "标题" --cover "cover.jpg" --dry-run
WECHATSYNC_TOKEN="$WECHATSYNC_TOKEN" wechatsync sync "article.md" -p zhihu --title "标题" --cover "cover.jpg" --dry-run
WECHATSYNC_TOKEN="$WECHATSYNC_TOKEN" wechatsync sync "article.md" -p juejin --title "标题" --cover "cover.jpg"
WECHATSYNC_TOKEN="$WECHATSYNC_TOKEN" wechatsync sync "article.md" -p zhihu --title "标题" --cover "cover.jpg"
```

真实 token 只能来自环境变量，不要写入文件或回复。

## 安全边界

- 默认只创建草稿。
- 不点击正式发布、提交审核或公开发布。
- 不把 token、cookie、浏览器私密响应写入运行记录。
- 单个平台失败时，不得把三平台整体标记为成功。

## 完成回复模板

```text
已完成草稿发布：

- 微信公众号：成功/失败，链接：...
- 掘金：成功/失败，链接：...
- 知乎：成功/失败，链接：...

图片处理：
- 本地图片 N 张。
- 封面：cover.jpg。
- weixin 上传 N 成功，0 失败。
- juejin 上传 N 成功，0 失败。
- zhihu 上传 N 成功，0 失败。

注意事项：
- 本次是否使用 md2wechat 棕色 HTML。
- 如果没有，说明原因和降级路径。
- 确认没有点击正式发布。
```
