# photo-08: 5. 状态与记忆：让 Agent 不要每轮都失忆

Article: src/content/blog/zh/AI/1.概念介绍/04.如何让Agent更好干活-Harness.md
Section: 5. 状态与记忆：让 Agent 不要每轮都失忆
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/04-agent--harness/photo-08-5-agent.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

没有状态管理的 Agent，每一轮都像重新开始。

Harness 至少要记录：

- 当前目标
- 已读文件
- 已做动作
- 当前假设
- 被排除的方案
- 测试结果
- 用户限制
- 待办事项

这些东西不应该全靠自然语言聊天历史保存，而应该整理成结构化状态。

可以粗略分成三类：

- 当前任务状态：现在做到哪一步
- 中间产物：读过的文件、测试结果、判断结论
- 长期记忆：项目规范、用户偏好、常见约定

状态管理做不好，Agent 就会越跑越乱。状态管理做好了，它才有连续工作的感觉。
