# 英文 DEV 发布规则

## 平台范围

英文 V1 只发布 DEV，不发布 Hashnode 或 Medium。DEV/Forem API 支持使用 `api-key` 创建文章，文章载荷包含 `title`、`body_markdown`、`published`、`canonical_url` 等字段；本仓库当前通过 `crier` 的 DEV profile 执行底层发布。

参考：[Forem API V1](https://developers.forem.com/api/v1)

## 默认行为

DEV 是公开发布平台。流程必须先生成发布副本和检查摘要，只有用户确认后才执行公开发布。

## 一次性准备

底层仍通过 `crier` 发布 DEV，运行时用 `uvx` 调起固定版本，不新增 Node 依赖。

必需环境变量：

```bash
CRIER_DEVTO_API_KEY=...
CRIER_VERSION=2.0.2
```

建议先确认本机 `crier` 配置和 registry 可用：

```bash
uvx --from "crier==${CRIER_VERSION:-2.0.2}" crier doctor
uvx --from "crier==${CRIER_VERSION:-2.0.2}" crier status "article.md"
```

`crier` registry 在本机 `~/.config/crier/crier.db`，不是仓库文件；换机器后需要重新 `status` / `audit` 或迁移该数据库。

## Frontmatter

必需字段：

- `title`
- `description`

强烈建议字段：

- `tags`：DEV 以 1-4 个核心标签效果最好，核心标签放前 4 个。
- `canonical_url`：推荐填写本站原文 URL，避免重复内容问题。
- `published`：正式公开发布前确认语义。V1 默认在命令层通过确认关卡控制公开发布。
- `cover_image`：平台封面需要公网 URL。
- `heroImage`：本站本地封面；如果没有 `cover_image`，发布副本会尝试把本地 `heroImage` 上传或改写为 `cover_image`，源文不变。

## 图片处理

- 本地 Markdown 图片必须在发布副本中改写为公网 URL。
- 可选策略：DEV 编辑器上传 cookie、自定义上传命令、已托管目录 base URL。
- `heroImage` 是本地图片且没有 `cover_image` 时，发布副本可补充 DEV 封面 URL；源 Markdown 不修改。
- `DEVTO_IMAGE_UPLOAD_COOKIE` 是浏览器登录态凭据，不要提交、不要贴到公开 issue / PR。需要用单引号放进本机 `.env`，因为 cookie 常包含分号、等号和 `$`。
- 不设置 `DEVTO_IMAGE_UPLOAD_CSRF_TOKEN` 时，流程会先尝试从 `https://dev.to/async_info/base_data` 发现 token，失败时再从 `/new` 页面发现。
- `PUBLISH_IMAGE_UPLOAD_COMMAND` 可读取 `PUBLISH_IMAGE_FILE`、`PUBLISH_IMAGE_HASH`、`PUBLISH_IMAGE_SOURCE`，并必须向 stdout 打印公网图片 URL。
- `PUBLISH_IMAGE_BASE_URL` 只适用于图片已经托管在公网目录时的路径改写。
- 图片上传缓存位于 `~/.cache/learn-agent-publish/devto-images.json`，key 包含上传方式、上传器配置和图片内容 hash。

## 日常流程

```bash
publish/bin/publish-en --dry-run "article.md"
publish/bin/publish-en --yes "article.md"
uvx --from "crier==${CRIER_VERSION:-2.0.2}" crier status "article.md"
```

要求：

- 日常发布必须显式传入文件路径，不做全目录自动发布。
- `--dry-run` 只做检查、摘要和安全的产物准备；涉及 DEV 上传 cookie 或自定义上传命令的图片远程动作必须等确认后才执行。
- 公开发布前必须向用户展示标题、目标平台、图片处理方式、产物路径、运行记录和风险提示。
- 发布后打开 DEV 页面确认没有 `./assets/` 坏图。

## 坏图修复

如果 DEV 已发布后发现图片是 `image no longer exists`，不要重新发一篇新文章。

处理步骤：

1. 配好 `DEVTO_IMAGE_UPLOAD_COOKIE`、`PUBLISH_IMAGE_UPLOAD_COMMAND` 或 `PUBLISH_IMAGE_BASE_URL`。
2. 重新生成带公网图片 URL 的 DEV 发布副本。
3. 从 `crier status` 或 DEV URL 找到 article id。
4. 使用 DEV API `PUT https://dev.to/api/articles/<article-id>` 更新同一篇文章的 `body_markdown` / `main_image` / `canonical_url`。
5. 更新后检查 `body_markdown` 没有 `./assets/`，并确认图片 URL 已变成 DEV CDN 或公网 URL。

## 失败处理

- 缺少 DEV API key 时停止在检查阶段。
- 缺少本地图片或没有公网化策略时停止在远程发布前。
- 取消确认时保留产物和取消记录，不执行公开发布。
- 图片上传失败时记录失败图片、上传方式和错误输出；不要把平台状态写成成功。

## 非 V1 平台

Hashnode 和 Medium 不属于英文 V1。Medium 不再开放新的 integration token；没有旧 token 时只能走人工复制发布。Hashnode / Medium 后续扩展时再单独补平台适配，不要让它们阻塞 DEV 发布。
