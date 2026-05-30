# cover: 从对话到干活：Agent、Tools、Function Calling、MCP、Skill 到底是什么

Article: src/content/blog/zh/AI/1.概念介绍/03.从对话到干活-Agent.md
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/03--agent/cover-agent-tools-function-calling-mcp-skill.jpg

Use the imagegen skill to create a blog article cover image.

## Article metadata

Title: 从对话到干活：Agent、Tools、Function Calling、MCP、Skill 到底是什么
Description: 解释 LLM 如何从只会对话，逐步演进成能调用工具、执行任务的 Agent 系统。
Tags: AI, Agent, Tools, FunctionCalling, MCP, Skill

## Article excerpt

# 从对话到干活：Agent、Tools、Function Calling、MCP、Skill 到底是什么 很多人第一次听到 `Agent`，会下意识觉得它是一个"更高级的大模型"。 前文已经讲过，[[01.LLM的原理#一、先建立直觉：LLM 是什么|LLM 本质上是语言预测器]]：它很会读、很会写，也能按要求组织答案。Agent 的变化不在于模型突然长出了手脚，而在于模型外面慢慢补了一整套执行系统。 这个说法听起来很顺，但容易把事情讲玄。 如果把它拆回工程现实，Agent 并不是模型突然长出了手脚。而是人们在模型外面慢慢补了一整套执行系统： **模型原来只会生成文字；后来它能用结构化方式表达"我要调用什么工具"；再后来，外层程序开始反复执行"思考 -> 行动 -> 观察"的循环；接着，为了把越来越多外部工具标准化接进来，出现了 MCP；而为了让 Agent 不只是有工具，还能复用某类任务的做法，又出现了 Skill。** 所以这篇文章不想上来给 Agent 下一个很学术的定义。我们想回答一个更朴素的问题： **LLM 是怎么从一个聊天机器人，变成一个能真正干活的系统的？** 为了让整篇文章不飘，我们固定一个例子： 如果你把这句话发给一个普通聊天模型，它最多只能给你分析思路。 但如果你把它发给 Claude Code、Codex、Cursor 这类编程 Agent，它真的可能去读文件、搜代码、改文件、跑命令、看测试结果。 区别不在于"模型本体突然会操作电脑了"。 区别在于模型外面多了一层能执行动作的运行时。 这层运行时，才是理解 Agent 的关键。 ## 一、故事要从一个"只能说话"的模型开始 先沿用前文的结论：LLM 最基础的能力，是根据上下文生成后续内容。它能解释、能总结、能写代码，也能按 Prompt 组织答案。 但这里有一个非常现实的边界： **会说，不等于会做。** 你问它： 它可以回答： - 可能是 token 没保存 - 可能是路由守卫拦截 - 可能是 cookie 跨域问题 - 可能是登录成功后的 redirect 参数丢了 这些回答可能很有帮助，但

## Output requirements

Return a ready-to-use image prompt and negative prompt.

Preferred visual direction:
- Article hero / cover image, not an in-body diagram.
- Wide landscape composition suitable for blog cards and article header.
- Editorial technical illustration style.
- Strong first-glance signal of the article topic.
- Avoid dense text, UI screenshots, tiny labels, photorealism, dark backgrounds, neon colors, and clutter.
- If text rendering is uncertain, leave clean negative space for the title instead of generating long Chinese text.
