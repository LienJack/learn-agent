# 日语 Qiita 发布规则

## 平台范围

Qiita V1 覆盖 Qiita API v2 的文章创建与更新。接口使用 `POST /api/v2/items` 创建文章，使用 `PATCH /api/v2/items/:item_id` 更新文章。

参考：[Qiita API v2 documentation](https://qiita.com/api/v2/docs)

## 默认行为

默认发布为 Qiita private item，避免误发公开文章。只有传入 `--public` 才会把 `private` 设为 `false`。

所有真实 API 写入都必须显式传入 `--yes`。试运行只生成检查摘要、Markdown 副本和 JSON payload，不调用 Qiita 写接口。

## 凭据

需要在 `.env` 或 shell 环境中设置：

```bash
QIITA_ACCESS_TOKEN=...
```

兼容变量名：`QIITA_TOKEN`。Token 需要 `write_qiita` scope。

## Frontmatter

通用字段：

- `title`
- `description`
- `tags`

Qiita 专用可选字段：

- `qiita_id`：已有文章 ID；存在时走更新，否则创建新文章。
- `qiita_title`：覆盖发布到 Qiita 的标题。
- `qiita_tags`：覆盖 `tags`，最多 5 个。
- `qiita_tweet`：是否触发 Qiita 的 X/Twitter 联动。
- `qiita_group_url_name`：Qiita Team group。
- `qiita_organization_url_name`：Qiita Organization。
- `qiita_coediting`：Qiita Team coediting。
- `qiita_slide`：slide mode。

## 图片

Qiita API 不在本流程里直接上传本地图片。文章中出现本地图片时，必须提供公开 URL 转换方式：

- `QIITA_IMAGE_BASE_URL` 或 `PUBLISH_IMAGE_BASE_URL`
- `PUBLISH_IMAGE_UPLOAD_COMMAND`

发布副本会把本地 Markdown 图片引用替换为公开 URL。源 Markdown 不会被回写。

## 更新映射

创建成功后，流程会把返回的 Qiita `id` 和 `url` 写入 `publish/qiita-items.json`，后续同一源文件会自动走更新。也可以在命令中显式传入 `--item-id <id>`。
