# photo-04: 二、Token：语言进入模型前的切块

Article: src/content/blog/zh/AI/1.概念介绍/01.LLM的原理.md
Section: 二、Token：语言进入模型前的切块
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/01-llm/photo-04-token.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

![LLM 到底在做什么：从猜词到生成的完整链路 - 二、Token：语言进入模型前的切块](./assets/01-llm/photo-02-token.png)

先看第一步：切菜。

模型读文字时，不是按"整句话"读，也不一定按"整词"读，而是先把文本拆成一块一块的小单位。就像学徒做菜前要先把食材切成丝、片、丁，LLM 处理语言前，也要先把文字切成 token。

比如这句话：


在模型内部，可能被切成：


也可能切成：


英文更常见这种现象。`unbelievable` 可能不是一个 token，而是：


所以，`token != 字`，`token != 词`。它更像"模型自己的拼装颗粒"。

为什么不直接按词切？因为真实世界里词太多了。新词、缩写、拼写变化、代码变量名、多语言混杂都会爆炸。如果模型只能认完整词，那它遇到没见过的新词就很容易懵。把词拆成更小颗粒后，它就算没见过整个词，也可能见过其中的部分，于是还能拼起来理解一点。

你可以把 tokenization（将文本拆分为模型可处理的最小离散单位的过程）想成"切菜"：

- 人类看一句话，觉得这是完整意思。

- 模型先把它切成一小块一小块。

- 后面所有理解和生成，都是基于这些小块在做。

再举个程序员更容易理解的例子。这段代码：


模型内部不会把整行当一个东西。它会拆成很多 token，类似：


这样做的好处是：

- 它知道 `get` 很常见

- 它知道 `_id` 很常见

- 它知道 `user` 很常见

- 即使 `get_user_profile` 这个完整函数名没见过，它也能从局部模式猜这是"获取用户资料"的函数

token 的本质作用，不是直接表达完整语义，而是把原始文本变成模型能处理的离散单位。也就是说，它先把整道菜需要的材料切好，后面才谈得上判断怎么搭配、怎么下锅。

一句话记牢：**token 是语言进入模型前，被切出来的最小处理单元。**

---
