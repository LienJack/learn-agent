# photo-04: 四、Context Manager 的模块和平面

Article: src/content/blog/zh/AI/agent设计范式/01-context-manager-attention-os.md
Section: 四、Context Manager 的模块和平面
Asset target: src/content/blog/zh/AI/agent设计范式/assets/01-context-manager-attention-os/photo-04-context-manager.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

成熟一点的 Context Manager 不应该只有一个 `buildMessages()`。

它至少会长成下面这种模块图：

![Context Manager 新范式：Agent 的注意力操作系统 flow 2](./assets/01-context-manager-attention-os/mermaid-02.png)

也可以从五个平面看：


这些模块不是一开始都要实现。

但它们是很好的边界清单。因为每一个模块都在回答一个不同问题。

`EventStore` 问：事实发生过什么？

`StateProjector` 问：现在我们处在什么任务现场？

`ContextBuilder` 问：这轮模型该看到哪些材料？

`Compressor` 问：哪些旧信息可以被摘要替代？摘要是否保留来源？

`TraceManager` 问：这次失败到底断在哪个因果节点？

如果这些问题都塞进一个 `messages` 数组里，后面就会很难改。

这部分可以直接抽成十二条长期稳定的设计原则：


最后一条尤其重要。不要把核心数据结构绑定到某个模型厂商的 message 格式、tool calling 格式、tokenizer 或 prompt 模板。更稳的是：
