# photo-06: 三、Harness 到底是什么

Article: src/content/blog/zh/AI/1.概念介绍/04.如何让Agent更好干活-Harness.md
Section: 三、Harness 到底是什么
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/04-agent--harness/photo-06-harness.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

`Harness` 原本有“马具、缰绳、约束装置”的意思。

放到 AI Agent 里，可以先理解成：

**套在模型外面，让 Agent 能稳定干活的运行系统。**

有一个很有用的记法：


也就是说，一个 Agent 系统里，除了模型本身以外，那些让它能稳定交付的东西，大多都可以算进 Harness：

- 上下文怎么组织
- 工具怎么暴露
- 权限怎么控制
- 任务怎么编排
- 状态怎么记录
- 失败怎么恢复
- 成果怎么验收
- 日志怎么观测
- 反馈怎么进入下一轮改进

它不是替模型思考，而是给模型搭一个能工作的环境。

你可以用一个新人拜访客户的例子理解。

Prompt 是你把任务讲清楚：


Context 是你把资料准备齐：


Harness 是你把整个过程托住：


所以 Harness 不是一个单独插件，也不是一个神秘框架。

它更像一套围绕 Agent Loop 的工程底盘。
