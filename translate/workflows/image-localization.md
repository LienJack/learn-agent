# 图片本地化工作流

本文件收编 `docs/workflows/2026-05-10-claude-code-image-localization-progress.md` 的图片本地化经验。V1 只保留可运行入口和记录线索，不定稿完整图片资产库。

## Mermaid 与普通图片分流

- Mermaid PNG 来自 Mermaid 源码渲染，不走普通图片生成。
- 普通 PNG/JPG 来自参考图和 prompt，本阶段不得覆盖 Mermaid 输出。
- 文件名包含 `-mermaid-NN` 的资产默认视为 Mermaid 阶段。

## 普通图片 prompt 清单

每个条目至少记录：

- `source`：源图片路径。
- `target`：目标语言图片路径。
- `width` / `height`：源图尺寸。
- `output_format`：源 JPG 保持 JPEG，源 PNG 保持 PNG。
- `language`：目标语言。
- `prompt_origin`：prompt 来源。

## 视觉要求

- 保留原图构图、纹理、线稿、尺寸、格式、视觉密度和主要节点数量。
- 只替换可见中文文字；英文技术词在日语图中可按工程语境保留。
- 不添加水印、logo、无关装饰或额外面板。
- 非完整再生成、局部替换、生成失败和人工修补都要写入 run record。

## 运行方式

```bash
translate/bin/translate-assets --dry-run --pipeline claude-code-series --language en --stage images
translate/bin/translate-assets --dry-run --pipeline claude-code-series --language ja --stage images
```

真实图片生成前必须确认 provider/API key、源图存在、目标格式和单图过滤范围。
