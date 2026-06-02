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

如果使用 `QIITA_IMAGE_BASE_URL` 或 `PUBLISH_IMAGE_BASE_URL`，base URL 必须是“源 Markdown 所在目录”的公网 URL 前缀，而不是仓库根路径。发布脚本只会把 Markdown 中的相对路径去掉开头的 `./` 后拼到 base URL 后面；例如源文位于：

```text
src/content/blog/ja/AI/build-harness/00-01-agent-not-a-prompt.md
```

正文图片写成：

```markdown
![...](assets/00-01-agent-not-a-prompt/mermaid-01.png)
```

则正确配置应类似：

```bash
PUBLISH_IMAGE_BASE_URL=https://raw.githubusercontent.com/LienJack/learn-agent/main/src/content/blog/ja/AI/build-harness/
```

错误配置示例：

```bash
PUBLISH_IMAGE_BASE_URL=https://raw.githubusercontent.com/LienJack/learn-agent/main/
```

这个错误会生成 `.../main/assets/...`，Qiita 页面会显示图片 404。

发布前必须检查 `publish/artifacts/.../*.qiita.md` 中所有图片 URL；对每个 `raw.githubusercontent.com` URL 执行 HEAD 检查并确认返回 `200`。多篇文章如果位于不同目录，不要共用一个目录级 base URL 批量发布；应分目录发布，或使用 `PUBLISH_IMAGE_UPLOAD_COMMAND` 生成逐图公网 URL。

## 更新映射

创建成功后，流程会把返回的 Qiita `id` 和 `url` 写入 `publish/qiita-items.json`，后续同一源文件会自动走更新。也可以在命令中显式传入 `--item-id <id>`。
