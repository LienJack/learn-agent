# photo-13: 如何做好 Skill

Article: src/content/blog/zh/AI/1.概念介绍/03.从对话到干活-Agent.md
Section: 如何做好 Skill
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/03--agent/photo-13-skill.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

一个好 Skill 不是越长越好，而是越能在关键时刻帮 Agent 少犯错越好。

可以用这几条判断：

**第一，触发条件要清楚。**

`description` 是系统判断是否加载 Skill 的关键。它要写清楚"什么时候用"，而不是只写一个漂亮介绍。

差的描述：


更好的描述：


**第二，正文要短，只放核心规则。**

Skill 会占上下文窗口。不要把模型本来就知道的东西重复写进去。

比如不需要解释"Markdown 用 # 表示标题"。

但要写清楚"本仓库的博客要先按问题演化链写，不要写成并列概念清单"。

**第三，复杂资料要延迟加载。**

如果有大量示例、API 文档、模板，不要全塞进 `SKILL.md`，而是放到 `references/`，在正文里告诉 Agent 什么时候读。

这叫渐进式披露：


这其实也是 Harness Engineering（Agent 运行底座工程，研究如何给 Agent 提供可靠、可控、可观察的执行环境的技术方向） 里的一个重要思路：不要一次性把所有资料灌给模型，而是先给导航，真正需要时再加载局部细节。

**第四，脆弱操作尽量做成脚本。**

如果某个步骤很容易写错，比如批量转换文件、检查链接、处理 PDF、生成固定格式表格，就不要每次让模型手写一遍。

把它放进 `scripts/`，让 Agent 调脚本，会更稳定。

**第五，要保留适当自由度。**

Skill 不是把 Agent 变成死板流程机。

写作、设计、调试这类任务，应该给原则和检查点，保留判断空间。

格式转换、批处理、校验这类任务，应该给更明确的步骤，甚至直接给脚本。

一句话记：

**高变化任务给方法，低容错任务给流程，易错重复任务给脚本。**

**第六，Skill 要能进入运行时，而不只是躺在文档里。**

也就是说，系统需要能发现它、加载它、让 Agent 在合适的时候使用它。

否则它只是知识库里一篇好文档，还没有真正变成 Agent 的能力包。
