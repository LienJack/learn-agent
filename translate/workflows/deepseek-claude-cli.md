# DeepSeek 与 Claude CLI 翻译约束

本文件收编 `docs/workflows/2026-05-09-claude-cli-deepseek-v4-pro-translation-workflow.md` 中已经验证过的 CLI 经验。

## 模型调用边界

- 使用 Claude CLI 时，翻译 prompt 必须明确“translation engine, not an agent”。
- 禁用工具调用，避免模型把翻译任务变成文件读写任务。
- 系统提示词必须禁止过程话、XML、JSON、tool call、路径噪声和解释性包装文本。
- frontmatter 不交给模型；CLI 本地拆分 frontmatter 和正文。
- 长文分块时，块之间只传必要上下文，不让模型继续上一轮输出格式污染。

## 输出清理

- 清理 fenced `markdown` 包裹。
- 移除 `Here is the translation`、`I'll translate`、`Let me` 等过程话。
- 移除 `<tool_call>`、JSON 碎片、本机绝对路径行和脚本调试残留。
- 清理动作必须写入 run record 的 warning，不能静默吞掉。

## 当前实现状态

- `translate/lib/markdown.mjs` 已提供基础污染清理。
- `translate/bin/translate-en` 与 `translate/bin/translate-ja` 已提供 dry-run 和真实翻译门禁。
- 真实 provider 执行器仍需在用户确认后接入；接入时必须复用本文件约束。
