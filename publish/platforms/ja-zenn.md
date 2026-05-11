# 日语 Zenn 发布规则

## 平台范围

日语 V1 只覆盖 Zenn。Zenn 通过 GitHub 连携仓库中的 Markdown 文件发布；更新文章通常是修改 Markdown 后 push 到连携仓库。

参考：[Zenn Manual](https://zenn.dev/manual)、[Zenn CLI Guide](https://zenn.dev/zenn/articles/zenn-cli-guide)

## 默认行为

试运行只生成检查摘要，不改写 `ZENN_REPO_DIR`。确认后流程生成 Zenn Markdown 和图片到 `ZENN_REPO_DIR`，并在 commit/push 前展示 Zenn 仓库状态、生成文件、图片数量和 `published` 状态。

## Frontmatter

生成文件包含：

- `title`
- `emoji`
- `type`
- `topics`
- `published`

`zenn_topics` 优先于 `tags`，最多保留 5 个 topic。

## 图片限制

本地图片复制到 Zenn 仓库的 `images/<slug>/` 下。支持 `.png`、`.jpg`、`.jpeg`、`.gif`、`.webp`，单图不能超过 3MB。

## 失败处理

- `ZENN_REPO_DIR` 不存在时停止。
- 图片缺失、格式不支持或超过限制时停止在 commit/push 前。
- 用户取消确认时保留运行记录，并提示 Zenn 工作树可能已有生成文件待处理。
