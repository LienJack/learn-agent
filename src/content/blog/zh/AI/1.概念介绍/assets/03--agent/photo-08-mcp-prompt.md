# photo-08: 六、MCP 为什么会出现：因为工具越来越多，接入方式不能一直手写

Article: src/content/blog/zh/AI/1.概念介绍/03.从对话到干活-Agent.md
Section: 六、MCP 为什么会出现：因为工具越来越多，接入方式不能一直手写
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/03--agent/photo-08-mcp.jpg

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

到这里，Agent 已经能用工具了。那为什么还需要 `MCP（模型上下文协议，标准化接入外部能力的开放协议）`？

原因也很朴素：

**当每个 Agent、每个工具、每个外部服务都要单独适配时，工具生态会变得非常混乱。**

想象一下，你现在有很多外部能力：

- GitHub：查 issue、建 PR、看 CI

- Notion：读文档、写页面

- Slack：搜讨论、发消息

- Postgres：查数据库

- Figma：读设计稿

- 本地文件系统：读写文件

- 浏览器：打开网页、截图、点击按钮

如果每个 Agent 产品都要为每个服务写一套专用插件，事情会很快失控：


每套接法都要重新处理：

- 工具列表怎么暴露

- 参数 schema 怎么描述

- 权限怎么申请

- 返回结果怎么包装

- 连接怎么建立

- 认证怎么处理

这时候就需要一个更标准的协议，把外部能力接入 Agent 的方式统一起来。

这就是 MCP 想解决的问题。
