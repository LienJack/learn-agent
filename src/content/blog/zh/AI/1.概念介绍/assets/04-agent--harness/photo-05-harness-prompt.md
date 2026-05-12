# photo-05: Harness 解决的是执行问题

Article: src/content/blog/zh/AI/1.概念介绍/04.如何让Agent更好干活-Harness.md
Section: Harness 解决的是执行问题
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/04-agent--harness/photo-05-harness.png

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

修登录 bug 不是一次回答，而是一条执行链：


这里的难点不只是“给模型什么信息”，而是：

- 它下一步该做什么
- 它能不能用这个工具
- 工具结果怎么写回状态
- 它跑偏时谁发现
- 它失败后怎么恢复
- 它做完后怎么验收

这就进入 Harness Engineering。

如果说 Prompt 关注“怎么把话说清楚”，Context 关注“怎么把信息给对”，那么 Harness 关注的是：

**当模型开始连续行动时，怎么监督它、约束它、纠偏它、验收它。**

所以这三者不是替代关系，而是包含关系：
