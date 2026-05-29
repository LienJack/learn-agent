# cover: Prompt、Context、RAG 到底是什么

Article: src/content/blog/zh/AI/1.概念介绍/02.如何让LLM更聪明.md
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/02-llm/cover-prompt-context-rag.png

Use the imagegen skill to create a blog article cover image.

## Article metadata

Title: Prompt、Context、RAG 到底是什么
Description: 从输入链路出发，解释 Prompt、Context 和 RAG 为什么会出现以及它们如何配合。
Tags: AI, LLM, Prompt, Context, RAG

## Article excerpt

# Prompt、Context、RAG 到底是什么：一条 LLM 输入链路的演进逻辑 很多人刚接触大语言模型时，都会有一种很强的错觉： 是不是模型版本一升级，它就突然"更聪明"了？ 这当然有一部分是真的。模型本身的能力确实会变强。但在日常使用里，真正决定你拿到的结果好不好，往往不只是模型参数，而是另外三件事： - 你是怎么给它下任务的 - 你给了它多少有用材料 - 当它自己不知道时，你有没有办法帮它去外面查资料 这三件事，正好对应今天最常见的三个词： - `Prompt（提示词，给 LLM 的输入指令，质量和结构直接决定输出效果）` - `Context（上下文，模型这一次调用中能看到的全部信息总和）` - `RAG（Retrieval-Augmented Generation，检索增强生成，让 LLM 先查外部知识库再回答，解决幻觉和知识滞后问题）` 如果你总觉得这些词听起来很熟，但又老是混在一起，那很正常。因为它们本来就不是三门互不相干的独立技术，而是一条很自然的"补漏洞"过程： 1. 模型本来只会接着你的话往下写，这不够干活，于是我们开始认真给它下任务，这就有了 `Prompt` 2. 但只有任务还不够，模型还需要看到背景材料，于是输入里开始区分"要求"和"资料"，这就有了 `Context` 3. 可上下文里能放的资料总是有限，而且模型脑子里的知识也会过期，于是系统开始想办法去外面查，再把结果塞回来，这就有了 `RAG` 也就是说，这篇文章不打算把它们写成三个平行名词，而是想讲清楚： **这几个概念为什么会出现，它们各自接住了什么问题，又留下了什么新问题，最后才一个接一个长出来。** 为了让整篇文章更好懂，我们先固定一个贯穿全文的例子： 后面你会看到，`Prompt`、`Context`、`RAG` 都是在围绕这句话分别发挥作用。 ## 一、故事要从一个“只会接话”的模型开始 前文讲过，[[01.LLM的原理#一、先建立直觉：LLM 是什么|大语言模型最底层做的事]]，本质上是 next token prediction：根据前文预测下一个 token。你可以

## Output requirements

Return a ready-to-use image prompt and negative prompt.

Preferred visual direction:
- Article hero / cover image, not an in-body diagram.
- Wide landscape composition suitable for blog cards and article header.
- Editorial technical illustration style.
- Strong first-glance signal of the article topic.
- Avoid dense text, UI screenshots, tiny labels, photorealism, dark backgrounds, neon colors, and clutter.
- If text rendering is uncertain, leave clean negative space for the title instead of generating long Chinese text.
