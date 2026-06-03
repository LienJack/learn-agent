# photo-02: 二、先看旧模型为什么不够

Article: src/content/blog/zh/AI/agent设计范式/01-context-manager-attention-os.md
Section: 二、先看旧模型为什么不够
Asset target: src/content/blog/zh/AI/agent设计范式/assets/01-context-manager-attention-os/photo-02-item-d14e53bd.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

最朴素的实现通常长这样：


这段代码最大的优点是容易理解。

它最大的缺点也是太容易理解了：它把所有东西都当成同一种消息。

在修测试的任务里，`messages[]` 很快会混进这些内容：


这些内容的性质完全不同。

有些是事实，有些是猜测。

有些是高优先级指令，有些是不可信工具输出。

有些已经过期，有些必须永远保留。

有些应该进入模型输入，有些只应该留给审计和回放。

如果系统只有一个 `messages[]`，它就很难回答这些问题：


所以 `messages[]` 不是不能有。

它不能是整个 context 系统的事实源。
