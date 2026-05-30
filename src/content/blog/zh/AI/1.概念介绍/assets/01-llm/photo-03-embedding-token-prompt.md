# photo-03: 三、Embedding：把 token 放进味道地图

Article: src/content/blog/zh/AI/1.概念介绍/01.LLM的原理.md
Section: 三、Embedding：把 token 放进味道地图
Asset target: src/content/blog/zh/AI/1.概念介绍/assets/01-llm/photo-03-embedding-token.jpg

Use the blog-to-photo skill to turn the following section into an article-body technical illustration prompt.

## Section text

食材切好以后，下一步不是马上下锅，而是先知道它们大概属于什么味道、适合和谁搭配。

token 是离散的编号。模型需要一种方式知道"猫"和"狗"比较像，"猫"和"汽车"差很远。

embedding 就是干这个的。它把每个 token 从"一个冷冰冰的编号"，变成"一串有含义的坐标"。

比如我们先假装 embedding 只有 3 维，维度含义非常粗暴：

- 第 1 维：像不像动物

- 第 2 维：像不像食物

- 第 3 维：像不像交通工具

那可能会有：


你一看就懂：猫和狗靠得近，汉堡离猫狗远一点，汽车更远。

这就是 embedding 最核心的直觉：**embedding 是把 token 放进一个"语义空间"里，让相似的东西彼此靠近。**

当然，真实模型不是 3 维，也不是人工规定"动物/食物/交通工具"这种维度。真实 embedding 通常是几百维、上千维，而且每一维的含义不是人手工定义的，是训练自己学出来的。

这里有个特别重要的点：embedding 不是"翻译成中文解释"，而是"翻译成数字坐标"。放回厨房比喻里，它不是给食材贴一句说明书，而是把食材放到一张"味道地图"上。

你可以把它想成地图坐标：

- 北京、上海、广州都是城市，所以在某些语义关系上会接近

- 苹果（水果）和香蕉会接近

- 苹果（公司）会和微软、谷歌更接近

也就是说，embedding 的厉害之处是：它能把"语义相似"变成"空间距离接近"。

再给一个句子级例子。这两句话：


虽然字面不完全一样，但 embedding 后，向量往往会很接近。而这句：


向量会远很多。

这也是为什么 RAG 能做语义检索：不是靠关键词一模一样，而是靠 embedding 后的距离接近。

到这里，学徒已经有了两样东西：切好的食材，以及一张能判断食材关系的味道地图。但它还不会做菜。真正让它学会"下一步该放什么"的，是预训练。

---
