# photo-07: 五、Agent 不是什么：它不是一个完全自主的"电子员工"

Article: src/content/blog/zh/AI/1.概念介绍/03.从对话到干活-Agent.md
Section: 五、Agent 不是什么：它不是一个完全自主的"电子员工"
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/03--agent/photo-07-agent.jpg

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

讲到这里，很容易产生另一个误解：

既然 Agent 能循环、能用工具、能改代码，那是不是可以完全放手让它干？

先别急。

Agent 确实比普通聊天模型更能干活，但它的边界也更危险。

因为它一旦能行动，就会带来新问题：

- 工具调错了怎么办？

- 文件改坏了怎么办？

- 命令有危险怎么办？

- 它陷入循环怎么办？

- 它误解用户目标怎么办？

- 它把错误结果当成正确观察怎么办？

所以成熟的 Agent 系统，通常不只是"模型 + 工具"这么简单，还会有一堆护栏：

- 权限审批

- 工具参数校验

- 沙箱环境

- 最大循环次数

- 上下文压缩

- 日志和可观测性

- 出错时请求用户决策

这也是为什么说 Agent 更像一层执行壳，而不是一个神秘大脑。

模型负责语言理解、计划和判断。

程序负责工具执行、状态管理、权限边界和错误处理。

更好的分工是：

**把模糊的语义判断交给模型，把确定的执行边界交给代码。**

（简单说，生产环境的 Agent 不能随便跑高危命令。命令白名单和目录沙箱是底线，不是可选项。）
