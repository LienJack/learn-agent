# photo-11: Skill 是什么

Article: src/content/blog/zh/AI/1.概念介绍/03.从对话到干活-Agent.md
Section: Skill 是什么
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/03--agent/photo-11-skill.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

Skill 可以先理解成：

**把某一类任务的经验、流程、约束和必要脚本，打包成 Agent 可发现、可复用的能力包。**

它不是一个底层工具，也不是一个外部服务协议。它更像一份可以被运行时加载的"岗位培训材料"。

更准确地说：

- `Tool` 解决"能做什么动作"

- `MCP` 解决"外部能力怎么接进来"

- `Skill` 解决"遇到某类任务时，应该按什么方法做，哪些规则不能忘"

比如一个 `obsidian-markdown` Skill 会告诉 Agent：


一个 `skill-creator` Skill 会告诉 Agent：


这不是给模型增加一个新 API，而是给模型一份"这个领域该怎么干"的操作手册。

所以，如果说 Agent 是执行单元，那么 Skill 就是能力包。

它把过去做这类任务的经验，从临时聊天提示里拿出来，变成运行时可加载的资产。
