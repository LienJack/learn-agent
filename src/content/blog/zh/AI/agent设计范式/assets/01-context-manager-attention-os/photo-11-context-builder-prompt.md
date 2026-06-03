# photo-11: 六、Context Builder：真正的模型输入编译器

Article: src/content/blog/zh/AI/agent设计范式/01-context-manager-attention-os.md
Section: 六、Context Builder：真正的模型输入编译器
Asset target: src/content/blog/zh/AI/agent设计范式/assets/01-context-manager-attention-os/photo-11-context-builder.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

有了 session、event、message、state，才轮到 Context Builder。

Context Builder 的输入不是一个巨大 `messages[]`。

它的输入是一组有来源、有优先级、有信任等级的材料：


这条编译链路可以画成：

![Context Manager 新范式：Agent 的注意力操作系统 flow 3](./assets/01-context-manager-attention-os/mermaid-03.png)

然后它按优先级裁剪：

| 优先级 | 内容 | 是否可丢 |
| --- | --- | --- |
| P0 | system / developer / safety / 必需 tool schema | 不可丢 |
| P0 | 当前用户请求 | 不可丢 |
| P0 | 未完成 tool call / tool result pair | 不可丢 |
| P1 | 当前 goal、acceptance criteria、plan、open questions | 基本不可丢 |
| P1 | 当前工作文件、diff、测试结果、错误信息 | 可摘要 |
| P1 | 最近 N 轮完整对话 | 可裁剪但不能破坏 turn |
| P2 | 历史决策、关键事实、用户偏好 | 可摘要 |
| P2 | 检索出的 memory / artifact | 可裁剪 |
| P3 | 旧闲聊、重复解释、冗长工具输出 | 优先丢弃或摘要 |

伪代码大概是这样：


这就是 [00-15](https://github.com/LienJack/build-harness/blob/main/docs/zh/00-15-context-policy-model-input.md) 那篇文章的位置。

00-15 讲的是 Context Builder 内部的选择、排序、压缩、隔离、预算和决策记录。

本章讲的是 Context Builder 上游还有事实源、状态投影、压缩账本、会话树和恢复机制。
