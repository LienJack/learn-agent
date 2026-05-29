# 发布中控台

`publish/` 是本仓库的发布事实来源。Codex 发布时应显式引用项目内 skill 文件，而不是依赖全局 skill 安装或旧 `scripts/publish-*` 入口。

## 快速入口

中文草稿发布：

```text
[$publish-cn](/Users/lienli/Documents/GitHub/learn-agent/publish/skills/publish-cn/SKILL.md) src/content/blog/zh/...
```

英文 DEV 发布：

```text
[$publish-en](/Users/lienli/Documents/GitHub/learn-agent/publish/skills/publish-en/SKILL.md) src/content/blog/en/...
```

日语平台发布（Zenn + Qiita）：

```text
[$publish-ja](/Users/lienli/Documents/GitHub/learn-agent/publish/skills/publish-ja/SKILL.md) src/content/blog/ja/...
```

日语 Qiita 发布：

```text
[$publish-qiita](/Users/lienli/Documents/GitHub/learn-agent/publish/skills/publish-qiita/SKILL.md) src/content/blog/ja/...
```

## 命令入口

- `publish/bin/publish-cn <article.md>`：检查微信公众号、掘金、知乎草稿发布前置条件，写入运行记录和摘要产物。V1 不自动正式发布。
- `publish/bin/publish-en [--dry-run] [--yes] <article.md>`：生成 DEV 发布副本，公开发布前输出摘要；只有显式 `--yes` 才执行 DEV 发布。
- `publish/bin/publish-ja [--dry-run] [--yes] [--published] <article.md>`：日语平台聚合入口；试运行同时检查 Zenn 和 Qiita；只有显式 `--yes` 才写入 Zenn 仓库并调用 Qiita API；`--published` 会让 Zenn 公开且 Qiita public。
- `publish/bin/publish-qiita [--dry-run] [--yes] [--public] [--tweet] [--item-id <id>] <article.md>`：生成 Qiita Markdown/JSON 发布副本；默认发布 private item，只有显式 `--public --yes` 才公开写入 Qiita。

## 目录职责

- `skills/`：项目内 skill 源文件，只通过显式路径触发。
- `bin/`：语言级发布入口，供 skill 调用。
- `lib/`：共享编排和平台适配逻辑。
- `platforms/`：平台规则事实来源。
- `artifacts/`：每次运行生成的平台副本、摘要索引和可检查产物。
- `runs/`：每次运行的 `record.json`，记录输入文章、目标平台、确认点、产物、结果和后续人工动作。

## 安全边界

- 中文平台默认只创建草稿，不提交审核、不正式发布。
- DEV 是公开发布平台，必须先展示检查摘要和产物路径，再等待用户确认。
- 日语平台入口会同步处理 Zenn 和 Qiita；commit/push 与 Qiita API 写入前必须展示检查摘要，再等待用户确认。
- Zenn 通过 GitHub 连携仓库发布，commit/push 前必须展示 Zenn 仓库状态和拟提交范围。
- Qiita 默认创建或更新 private item；公开发布必须显式使用 `--public` 并经过 `--yes` 确认。
- 运行记录不得保存真实 token、cookie、私密请求头或完整私密响应。
- 源 Markdown 是内容源头；平台发布副本写入 `publish/artifacts/` 或目标 Zenn 仓库，默认不回写源文。

## 本地验证

```bash
pnpm test:publish
pnpm astro:check
pnpm build
```
