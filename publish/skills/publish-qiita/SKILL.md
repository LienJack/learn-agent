---
name: publish-qiita
description: "Prepare and publish local Astro blog Markdown articles to Qiita via Qiita API v2. Use when publishing Japanese developer articles to Qiita."
---

# Qiita 发布流程

你在本仓库内发布 Qiita 文章时，必须使用项目内命令，不要绕过 `publish/` 中控台。

## 1. 发布前检查

先运行试发布：

```bash
publish/bin/publish-qiita --dry-run <article.md>
```

检查输出中的：

- `publish/runs/.../record.json`
- `publish/artifacts/.../*.qiita.md`
- `publish/artifacts/.../*.qiita.json`

## 2. 默认私密发布

确认检查摘要后，默认创建或更新 Qiita private item：

```bash
publish/bin/publish-qiita --yes <article.md>
```

## 3. 公开发布

只有用户明确确认公开发布时，才使用：

```bash
publish/bin/publish-qiita --public --yes <article.md>
```

## 4. 更新已有文章

优先使用源文 frontmatter 的 `qiita_id` 或 `publish/qiita-items.json` 映射。必要时可以显式指定：

```bash
publish/bin/publish-qiita --item-id <qiita_item_id> --yes <article.md>
```

## 5. 安全规则

- 不要在运行记录里写入 token、cookie 或私密请求头。
- 不要在没有 `--yes` 的情况下调用 Qiita 写接口。
- 源 Markdown 是内容源头；Qiita 发布副本只写入 `publish/artifacts/`。
- 本地图片必须先转换成公开 URL，使用 `QIITA_IMAGE_BASE_URL`、`PUBLISH_IMAGE_BASE_URL` 或 `PUBLISH_IMAGE_UPLOAD_COMMAND`。
