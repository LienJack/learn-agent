# photo-10: 七、Skill 为什么会出现：因为 Agent 还需要"做事方法"

Article: src/content/blog/zh/AI/1.概念介绍/03.从对话到干活-Agent.md
Section: 七、Skill 为什么会出现：因为 Agent 还需要"做事方法"
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/03--agent/photo-10-skill-agent.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

讲到这里，Agent 已经有工具，也可以通过 MCP 接入更多外部能力了。

但这还不够。

因为很多任务的难点，不是"有没有工具"，而是：

**这类任务到底应该按什么方法做。**

这正是本地 wiki 里反复强调的一点：MCP 解决的是"外部能力怎么接进来"，而 Skill 解决的是"接进来以后，Agent 应该如何完成某类任务"。

也就是说，MCP 偏能力接入，Skill 偏任务方法。

继续用修登录 bug 的例子。

即使 Agent 有这些工具：

- 搜索文件

- 读取文件

- 修改文件

- 执行测试

- 查看 Git diff

它仍然可能做得很粗糙：


真正靠谱的做法应该更像：


这套"怎么做这类任务"的经验，如果每次都靠模型临场发挥，就很不稳定。

于是就有了 `Skill（技能，封装某类任务经验、流程和约束的可复用能力包）`。
