# photo-01: 1. 它可能不知道现场

Article: src/content/blog/zh/AI/1.概念介绍/04.如何让Agent更好干活-Harness.md
Section: 1. 它可能不知道现场
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/04-agent--harness/photo-01-1.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

修登录跳转 bug，不是看到一个 `navigate("/")` 就能直接改。

一个靠谱的人类工程师会先看：

- 登录成功后 token 存在哪里
- 路由守卫在哪里判断登录态
- redirect 参数是谁生成的
- 第三方登录是否走同一条链路
- 项目里有没有现成测试
- 最近有没有相关改动

Agent 如果没有拿到这些现场信息，就只能猜。

这不是模型不会推理，而是它看见的世界太窄。它也许能给出一个看似合理的修复，但那个修复可能只覆盖了当前文件，没有覆盖真实链路。
