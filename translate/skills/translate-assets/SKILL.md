---
name: translate-assets
description: 通过项目内翻译中控台处理 Mermaid 图和普通图片本地化计划
argument-hint: "--pipeline claude-code-series --language <en|ja> [--stage mermaid|images] [--only target-file]"
---

# 翻译资产 Skill

本 skill 只能通过显式引用本文件路径触发，不依赖全局安装、symlink 或 `$skill-name` 自动发现。

## 输入要求

- 用户必须提供目标语言：`--language en` 或 `--language ja`。
- 用户可以指定 `--stage mermaid` 或 `--stage images`；未指定时先 dry-run 两个阶段并展示分流摘要。
- 如果用户要求图片资产库、prompt 版本管理或完整视觉验收系统，说明这超出 V1 范围。

## 执行流程

1. 阅读 `translate/README.md`、`translate/workflows/claude-code-series.md`、`translate/workflows/image-localization.md` 和目标语言 prompt。
2. 先运行 `translate/bin/translate-assets --dry-run --pipeline claude-code-series --language <en|ja> [--stage ...] [--only ...]`。
3. 展示 Mermaid 图数量、普通图片数量、目标 assets 目录、缺失依赖、缺失源文件、prompt 清单路径、debug mmd 路径和运行记录。
4. 如果 stage 是 Mermaid，确认只处理 Mermaid block，不复用中文 PNG，不覆盖普通图片。
5. 如果 stage 是 images，确认排除 Mermaid 命名模式，检查 provider/API key、源图、尺寸和目标格式。
6. 只有用户确认后，才运行真实资产命令；真实 Mermaid 可能调用模型和 mermaid-cli，真实图片可能调用图片 API。
7. 完成后运行 `translate/bin/translate-check --language <en|ja> --pipeline claude-code-series`。

## Mermaid 规则

- 只翻译节点标签、subgraph 标题、participant alias、状态/边标签等可见人类文本。
- 保留 Mermaid 语法、节点 id、箭头、缩进、HTML 标记、英文技术标识和代码符号。
- 模型输出必须清理成纯 Mermaid 源；渲染失败时保留 `.mmd` 调试产物并写入 run record。

## 普通图片规则

- 普通 PNG/JPG 只走图片本地化阶段，Mermaid 命名模式的 PNG 必须排除。
- 尽量保持原图构图、纹理、线稿、尺寸、格式和视觉密度。
- prompt 清单记录 source、target、width、height、output_format、目标语言标签和 prompt_origin。
- 运行记录只保留可重跑线索，不保存 API key、cookie、token 或私密响应。
