# photo-07: 1. 上下文边界：让 Agent 知道自己在哪里

Article: src/content/blog/zh/AI/1.概念介绍/04.如何让Agent更好干活-Harness.md
Section: 1. 上下文边界：让 Agent 知道自己在哪里
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/04-agent--harness/photo-07-1-agent.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

Agent 要干活，首先要知道现场。

修登录 bug 时，它至少需要知道：

- 项目结构
- 登录相关文件
- 路由配置
- 项目规范
- 当前 Git 状态
- 测试命令
- 用户给过的限制

好的 Harness 不会一股脑把所有信息都塞给模型，而是做分层组织：

- 固定规则放固定位置
- 当前任务单独呈现
- 证据和工具结果分开
- 长结果裁剪或摘要
- 关键结论沉淀成状态
- 需要某个能力时再渐进加载细节

这也是为什么“一份超长 AGENTS.md”往往不是好方案。上下文是稀缺资源，给太多会挤掉真正相关的信息；所有规则都重要，最后等于没有重点。
