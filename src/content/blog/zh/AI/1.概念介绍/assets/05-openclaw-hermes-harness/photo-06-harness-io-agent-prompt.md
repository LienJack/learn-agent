# photo-06: 四、Harness.io 为什么会出现：因为 Agent 需要进入"企业流程"

Article: src/content/blog/zh/AI/1.概念介绍/05.OpenClaw、Hermes和Harness关系.md
Section: 四、Harness.io 为什么会出现：因为 Agent 需要进入"企业流程"
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/05-openclaw-hermes-harness/photo-06-harness-io-agent.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

这层最容易混淆。

`Harness` 有两种含义：

第一种是通用概念：[[04.如何让Agent更好干活-Harness#三、Harness 到底是什么|Agent Harness]]，也就是模型外面的运行系统。  
第二种是具体公司和产品：`Harness.io`，它本来就是做软件交付、CI/CD、DevOps 和平台工程的。

当我们说 OpenClaw 和 Hermes 都是 Harness 的工程落地时，说的是第一种：它们都是 Agent Harness 的不同样板。

当我们说 Harness.io Agents 时，说的是第二种：一个把 AI Agent 嵌进企业软件交付流水线的产品形态。

为什么这层会出现？

还是看早报例子里的最后两步：


这已经不是个人助理场景了，而是企业工程场景。

在企业里，Agent 不能只靠"我觉得可以"就做事。它必须面对：

- 代码仓库权限
- CI/CD 执行上下文
- secrets 和 connector
- 环境、服务、部署历史
- RBAC（基于角色的访问控制，按用户角色分配不同权限的权限管理模型）和组织权限
- OPA policy（Open Policy Agent 策略，用声明式语言统一管理和执行访问控制规则）
- 人工审批
- 审计日志
- PR review
- 回滚与失败策略

这就是 Harness.io Agents 的切入点。

它不是把 Agent 当成一个漂在外面的聊天助手，而是把 Agent 做成流水线里的一级步骤。

也就是说，Agent 不再是：


而更像：


这解决的是：

**怎样让 Agent 不只是"能干活"，而是在组织允许的边界里干活。**

Harness.io 的重点不是个人多入口，也不是个人记忆成长，而是：

- 流水线原生执行：Agent 是流水线步骤，不是外部脚本
- RBAC / secrets / connectors：继承企业平台已有权限边界
- Knowledge Graph：利用组织内部服务、部署和流水线上下文
- OPA policy：用策略管住 Agent 行为
- 人在环路：关键动作让人审批
- 可审计性：每一步可追踪、可回放、可治理

用一句人话概括：

**Harness.io 关心的不是"Agent 会不会做"，而是"Agent 做这件事是否符合企业交付流程"。**

（这里有一个实际观感上的差异：OpenClaw 和 Hermes 给你的感觉是"我在用一个聪明的助手"，而 Harness.io 给你的感觉是"流水线里多了一个能自己看日志、写代码、提 PR 的步骤"。两者不是竞争关系，是不同层级的问题。）
