# photo-08: 五、把三者放回“问题接着问题”的链路里，你就不容易再混了

Article: src/content/blog/zh/AI/1.概念介绍/02.如何让LLM更聪明.md
Section: 五、把三者放回“问题接着问题”的链路里，你就不容易再混了
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/02-llm/photo-08-item-c598ea62.jpg

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

单独看 `Prompt`、`Context`、`RAG`，很容易变成背名词。

但如果你按"前一个办法解决了什么，又暴露了什么新问题"来理解，关系就会一下子顺起来。

它们不是三个平行按钮，而像三次连续补丁：

- 模型只会接话，不会按要求干活，于是补上 `Prompt`

- 有了任务说明，但没有足够材料，于是补上 `Context`

- 有了当前材料，但材料仍然可能不够或过期，于是补上 `RAG`

先记住这一句固定总结：

**Prompt 决定你怎么提要求，Context 决定模型这次能看到什么，RAG 决定当它看不到时，怎么把外部资料补进来。**

再看我们这个例子：


这句话在系统里大概会经历这样一条路：


这个过程用图来看会更直观：

![02.如何让LLM更聪明 图 2](./assets/02.如何让LLM更聪明-mermaid-02.svg)

上图展示了 Prompt、Context、RAG 三者在同一条输入链路上的接力关系。用户提问先经过 Prompt 层做任务拆解，再进入 Context 层做信息组装；如果当前材料不足以回答问题，RAG 层负责查缺补漏，把外部资料临时补回 Context，最终才把修好的上下文喂给模型生成答案。

你也可以把它想成三个人分工：

- `Prompt` 像提需求的人：把事说清楚

- `Context` 像桌上的资料：决定当前能参考什么

- `RAG` 像跑腿拿资料的人：缺材料时去外面补

于是，为什么它们总一起出现，也就很好理解了。

因为它们根本不是平级竞争关系，而是在同一条输入链路上前后接力。

如果你更喜欢"提问式"记忆法，也可以直接记成三问：

1. `Prompt` 回答的是：你到底想让我怎么做？

2. `Context` 回答的是：我这次回答时，手里到底有哪些资料？

3. `RAG` 回答的是：如果手里没有资料，我能不能先去外面找？
