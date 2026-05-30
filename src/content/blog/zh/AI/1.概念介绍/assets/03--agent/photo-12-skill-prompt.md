# photo-12: Skill 通常长什么样

Article: src/content/blog/zh/AI/1.概念介绍/03.从对话到干活-Agent.md
Section: Skill 通常长什么样
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/03--agent/photo-12-skill.jpg

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

从工程上看，一个 Skill 通常是一个小目录，里面至少有一个 `SKILL.md`，必要时还会带 reference、script 和 asset：


其中最重要的是 `SKILL.md`。

它一般包含两部分：

- frontmatter：告诉系统这个 Skill 叫什么、什么时候该触发

- 正文：告诉 Agent 触发后应该怎么做

有些 Skill 还会带：

- `references/`：放详细资料、模板、长文档

- `scripts/`：放确定性、重复、容易写错的执行步骤

- `assets/`：放输出时要用的模板、图片、字体或样例文件

一个非常简化的 `SKILL.md` 可能像这样：


这份 Skill 不需要告诉模型什么是 Markdown，也不需要解释一堆常识。它只需要告诉模型：

**这类任务里，哪些步骤不能忘，哪些本地规则必须遵守。**
