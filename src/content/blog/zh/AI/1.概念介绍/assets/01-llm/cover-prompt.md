# cover: LLM 到底在做什么：从猜词到生成的完整链路

Article: src/content/blog/zh/AI/1.概念介绍/01.LLM的原理.md
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/01-llm/cover-llm.jpg

Use the imagegen skill to create a blog article cover image.

## Article metadata

Title: LLM 到底在做什么：从猜词到生成的完整链路
Description: 从 token、embedding、预训练到生成流程，建立对 LLM 工作方式的整体直觉。
Tags: AI, LLM, Transformer, Token, Embedding

## Article excerpt

你对着 ChatGPT 输了一句话，它在几百毫秒内回了一大段。表面看像"思考"，底层其实只做了一件事：猜下一个 token。猜完一个，把结果拼回去，再猜下一个。循环往复，直到凑出一整段回复。 这个过程没有理解、没有意识，但规模大到一定程度后，效果像"懂了一样"。 为了让后面的概念更好连起来，我们先给一个贯穿全文的比喻： **把 LLM 想成一个在厨房学做菜的学徒。** - `token`：食材切好的小块。学徒不会直接啃整颗白菜，而是先切成丝、片、丁。 - `embedding`：每种食材在"味道地图"里的坐标。甜的靠近甜，辣的靠近辣，咸的靠近咸。学徒靠这张地图判断什么该搭什么。 - `pretrain`：让学徒看几千万次做菜过程，慢慢学会哪些食材常搭配、顺序怎样、火候怎么接。 于是最后，它虽然每次只是"下一步该放什么"，但因为见得太多，就能一步一步做出像样的整道菜。 后面我们就沿着这条线拆开：文字怎么被切成食材小块，食材怎么落到味道地图里，学徒怎么靠海量菜谱练出模式，最后又是怎么一步一步把一道菜做出来的。 --- ## 一、先建立直觉：LLM 是什么 ### 1.1 本质就是一个语言预测器 LLM（大语言模型，通过海量文本训练、能理解和生成自然语言的神经网络）最底层做的事很朴素：看到前面的内容后，猜下一个最可能出现的词片段。注意，不一定是完整词，有时只是一个字、半个词、一个标点。技术上这叫 token。 它不是先想完一整段再吐出来，而是"一个字一个字地往后接"。只是接得太准、太快、太像懂你，所以你觉得它在"思考"。 训练时它看过海量文本、代码、网页、书、问答、论坛、论文。看的东西足够多，它就学会了语言规律、知识关联和任务套路。于是它表现得像是会很多技能：写邮件、总结文章、解释代码、列方案、陪你对话。 换句话说，它不是"学会了这些职业"，而是在参数里压缩了这些场景的语言模式。 ### 1.2 它能做什么，不能做什么 最容易误解的一点是：它"看起来懂"，不等于它"像人一样真的懂"。 它没有生活经验、情绪、自我意识，也没有一个稳定不变的"世界模型"藏在脑子里。它更像一个极其强

## Output requirements

Return a ready-to-use image prompt and negative prompt.

Preferred visual direction:
- Article hero / cover image, not an in-body diagram.
- Wide landscape composition suitable for blog cards and article header.
- Editorial technical illustration style.
- Strong first-glance signal of the article topic.
- Avoid dense text, UI screenshots, tiny labels, photorealism, dark backgrounds, neon colors, and clutter.
- If text rendering is uncertain, leave clean negative space for the title instead of generating long Chinese text.
