---
title: "第 1 章：从函数到 PyTorch 训练闭环"
description: "神经网络到底怎么“学会”？"
author: LienJack
pubDate: 2026-06-01
locale: zh
tags:
  - LLM 学习
  - LLM
  - AI
---
# 第 1 章：从函数到 PyTorch 训练闭环

## 本章核心困惑

神经网络到底怎么“学会”？

很多初学者第一次看到训练代码时，会有一种很自然的误解：模型好像自己看了很多数据，然后“悟”出了规律。可是工程上没有悟性这回事。模型只是一个带参数的函数，训练只是一次又一次地回答同一个问题：

```text
这次输出离目标差多少？
这个差距应该怎样分摊到每个参数上？
每个参数沿哪个方向动一点，下一次会更好？
```

本章不急着讲 Transformer，也不急着讲大模型。我们先把神经网络还原成最朴素的东西：

```text
输入 x -> 一个带参数的函数 f(x; theta) -> 输出 y_pred
```

如果你能真正理解这个闭环，后面的 MiniGPT、SFT、LoRA、蒸馏都会变得没那么神秘。它们不是换了一套魔法，而是在同一个训练闭环里换了数据、模型结构、loss 和可训练参数。

本章贯穿一个极小的合同风险 toy task：

```text
输入：违约金比例、逾期天数
输出：低风险 / 高风险
```

它当然不是法律模型，也不能提供法律意见。它只是一个二维小例子，用来让我们看清楚：函数、参数、loss、梯度和优化器到底怎样连起来。

本章标签来自人工构造的 toy rule，只用于观察梯度训练，不代表真实法律风险标准。后续法律项目会把证据、管辖区、人工复核和拒答边界单独建模。

## 前置知识

- 知道变量、函数和数组的基本概念。
- 能读懂简单 Python 类和函数。
- 已完成第 0 章的环境、seed 和 pytest smoke test。
- 不要求你已经学过高等数学，但你需要愿意跟着小数字算一遍。

## 本章新增能力

学完本章，你应该能做到：

- 把神经网络理解成一个可学习的函数，而不是一堆 API。
- 区分参数、预测值、真实标签、loss、梯度和 optimizer 各自的职责。
- 解释 `forward -> loss -> backward -> optimizer.step()` 这条训练链。
- 判断一个训练循环是真的在学习，还是只是代码跑通了。
- 用 tiny dataset、train/val split、seed 和 pytest 检查训练系统是否可信。

一句话说，本章要帮你建立一种训练直觉：

> 模型不是突然变聪明，而是 loss 通过计算图把“错在哪里”传回参数，optimizer 再把参数往更低 loss 的方向挪一点。

## 1. 先从函数说起：神经网络为什么不是规则表

如果我们要判断一条合同条款是否有风险，最容易想到的是写规则：

```python
if penalty_ratio > 0.3 and overdue_days > 30:
    risk = "high"
else:
    risk = "low"
```

这种写法的好处是清楚，坏处也很明显：现实问题很难被几条固定规则覆盖。比如：

- 违约金比例不高，但责任范围极宽，算不算风险？
- 逾期天数不长，但合同金额很大，算不算风险？
- 用户没有给管辖区和合同类型，模型应不应该拒答？

神经网络的思路不是把规则一条条写死，而是设计一个带旋钮的函数：

```text
y_pred = f(x; theta)
```

这里：

- `x` 是输入，比如 `[违约金比例, 逾期天数]`。
- `theta` 是参数，也就是模型内部可以调整的权重。
- `f` 是模型结构，比如线性层、ReLU、MLP。
- `y_pred` 是模型输出，比如两个类别的 logits。

生活类比：你可以把模型想成一台咖啡机。输入是咖啡豆和水，输出是咖啡味道。参数就是研磨粗细、水温、压力和萃取时间。训练不是“咖啡机悟了”，而是我们不断试喝、打分、调旋钮，让下一杯更接近目标味道。

## 2. 最小数学形式：从 `y = wx + b` 开始

最小的可学习函数可以写成：

```text
y = wx + b
```

如果只有一个输入特征 `x`，这个公式很直观：

- `w` 决定输入变化时输出变化得多快。
- `b` 决定整体往上或往下平移。

比如我们只看违约金比例：

```text
risk_score = w * penalty_ratio + b
```

假设：

```text
w = 10
b = -2
penalty_ratio = 0.3
```

那么：

```text
risk_score = 10 * 0.3 - 2 = 1
```

如果 `risk_score > 0` 就判高风险，这条样本会被判为高风险。

但合同风险不只一个维度。加入逾期天数后，我们可以写成向量形式：

```text
x = [penalty_ratio, overdue_days]
w = [w1, w2]
score = x · w + b
```

点积展开就是：

```text
score = penalty_ratio * w1 + overdue_days * w2 + b
```

这一步很重要：神经网络里的很多复杂层，底层仍然离不开“输入乘以权重矩阵，再加偏置，再过非线性”。

## 3. 参数是什么：模型可以被数据调整的旋钮

参数不是普通变量。普通变量通常由程序员指定，而参数会在训练中被 optimizer 更新。

在线性模型里，`w` 和 `b` 是参数。在 MLP 里，每一层的 `Linear.weight` 和 `Linear.bias` 都是参数。在 Transformer 里，embedding 表、Q/K/V 投影矩阵、FFN 矩阵、LayerNorm/RMSNorm 权重、LM head 都是参数。

参数越多，函数能表达的形状越复杂，但也越容易过拟合、越难训练、越需要数据和评测约束。

直观感受：

- 参数太少：函数太简单，可能连训练集都拟合不好，这叫欠拟合。
- 参数足够：函数能抓住主要规律，训练集和验证集都变好。
- 参数太多但数据太少：函数可能记住训练样本，验证集变差，这叫过拟合。

领域小模型尤其要小心最后一种情况。法律和医学数据往往昂贵、敏感、数量有限，如果只看训练 loss，模型可能只是把少量样本背下来。

## 4. 为什么需要非线性：多层线性还是线性

如果模型只有线性变换，它能表达的边界很有限。二维平面里，线性分类器只能画一条直线。

你可能会想：那我堆很多层线性层不就行了吗？

问题是，线性函数叠线性函数，结果仍然是线性函数：

```text
f1(x) = W1x
f2(h) = W2h
f2(f1(x)) = W2(W1x) = (W2W1)x
```

无论中间有多少层，只要没有非线性，最后都等价于一个更大的线性变换。

所以神经网络会加入 ReLU、GELU、SwiGLU 这类非线性：

```text
h = ReLU(xW1 + b1)
logits = hW2 + b2
```

非线性的作用，是让模型能表达弯曲边界和复杂组合关系。

合同风险里，“违约金比例高”和“逾期天数长”可能单独不严重，但组合起来严重；医学问答里，“胸痛”和“呼吸困难”组合起来比单独出现更危险。非线性让模型有机会学习这种组合。

## 5. loss 是什么：把“错得多离谱”压成一个数字

模型输出之后，我们需要知道它错得多严重。这个数字就是 loss。

二分类最小直觉可以这样看：

```text
真实标签：高风险
模型输出：低风险概率 0.7，高风险概率 0.3
```

模型把正确答案只给了 0.3 的概率，这显然不理想。交叉熵会惩罚这种情况：

```text
loss = -log(正确答案的概率)
```

如果正确答案概率是 `0.9`：

```text
-log(0.9) ≈ 0.105
```

如果正确答案概率是 `0.3`：

```text
-log(0.3) ≈ 1.204
```

如果正确答案概率是 `0.01`：

```text
-log(0.01) ≈ 4.605
```

直观感受：模型越不相信正确答案，loss 越大；模型越接近正确答案，loss 越小。

本课程训练循环默认把 loss reduce 成一个标量，再调用 `loss.backward()`。后面语言模型虽然会对很多 token 计算 loss，但最后通常会平均成一个标量。PyTorch 也支持非标量 tensor 反传，但需要显式传入外部 gradient；初学阶段先统一使用标量 loss。

还要提前记住一个 PyTorch 防坑点：`F.cross_entropy` 和 `nn.CrossEntropyLoss` 接收 raw logits，不接收手动 softmax 后的概率。

```python
# 正确：PyTorch 内部会做 log_softmax + negative log likelihood
loss = F.cross_entropy(logits, labels)
```

二分类既可以写成“两类 logits + CrossEntropyLoss”，也可以写成“单 logit + BCEWithLogitsLoss”。两种写法都对，但标签格式不同，不要混用。

## 6. 梯度是什么：告诉参数往哪边动

loss 告诉我们“现在错多少”，但它没有直接告诉我们“每个参数应该怎么改”。

梯度解决的就是这个问题。

先看一个只有一个参数的简单例子：

```text
loss(w) = (w - 3)^2
```

这个函数在 `w = 3` 时最小。如果现在 `w = 1`：

```text
loss = (1 - 3)^2 = 4
```

导数是：

```text
d loss / d w = 2(w - 3)
```

代入 `w = 1`：

```text
gradient = -4
```

梯度是负数，说明 `w` 往增大的方向走，loss 会下降。梯度下降更新公式是：

```text
w <- w - learning_rate * gradient
```

如果学习率是 `0.1`：

```text
w_new = 1 - 0.1 * (-4) = 1.4
```

`w` 从 1 走向 3，loss 会变小。

如果现在 `w = 5`：

```text
gradient = 2(5 - 3) = 4
w_new = 5 - 0.1 * 4 = 4.6
```

`w` 从 5 往 3 走。

生活类比：你站在山坡上，想走到山谷最低点。梯度告诉你脚下哪边最陡。梯度下降不是直接瞬移到最低点，而是每次沿着下坡方向走一小步。

## 7. 计算图：PyTorch 如何知道梯度怎么传

真实神经网络有成千上万个参数，不可能手写每个参数的导数。PyTorch 的 autograd 会在前向计算时记录一张计算图。

例如：

```python
h = torch.relu(x @ W1 + b1)
logits = h @ W2 + b2
loss = F.cross_entropy(logits, y)
```

计算图记录了：

```text
x, W1, b1 -> matmul/add -> ReLU -> h
h, W2, b2 -> matmul/add -> logits
logits, y -> cross_entropy -> loss
```

当你调用：

```python
loss.backward()
```

PyTorch 会从 `loss` 这个标量出发，沿计算图反向应用链式法则，把每个参数对 loss 的影响存到 `.grad` 里。

这也是为什么下面这些操作危险：

- 在训练中随便 `.detach()`，会切断计算图。
- 把中间 tensor 变成 `.item()` 再参与计算，会丢掉梯度路径。
- 忘记 `requires_grad=True`，参数不会累计梯度。

一句话记忆：

> forward 负责算结果和记录路径，backward 负责沿路径把责任分摊回每个参数。

## 8. optimizer.step：真正修改参数的是谁

很多人把 `loss.backward()` 和 `optimizer.step()` 混在一起。其实它们职责完全不同。

```python
loss.backward()
```

只计算梯度，不修改参数。

```python
optimizer.step()
```

才根据梯度修改参数。

完整循环通常是：

```python
for x, y in loader:
    optimizer.zero_grad()
    logits = model(x)
    loss = criterion(logits, y)
    loss.backward()
    optimizer.step()
```

评估循环也要尽早形成固定习惯：切到 eval 模式，不建立梯度图，评估完再回到 train 模式。

```python
model.eval()
val_loss = 0.0
with torch.no_grad():
    for x, y in val_loader:
        logits = model(x)
        val_loss += criterion(logits, y).item()
model.train()
```

`model.eval()` 会影响 Dropout、BatchNorm 等层；`torch.no_grad()` 会减少显存和计算图开销。它们解决的问题不同，真实评估里通常两个都要用。

每一步的职责：

- `zero_grad()`：清掉上一批残留的梯度。
- `model(x)`：前向计算，建立计算图。
- `criterion(logits, y)`：把预测错误压成 loss。
- `loss.backward()`：计算每个参数的 `.grad`。
- `optimizer.step()`：用 `.grad` 更新参数。

如果忘记 `step()`，loss 可以正常算出来，但参数不会变。

如果忘记 `zero_grad()`，梯度会跨 batch 累积。梯度累积本身不是错，但如果你不是有意做 gradient accumulation，它会让训练现象变得难以解释。

## 9. train/val split：训练集变好不等于模型变好

训练集 loss 下降，只能说明模型越来越会拟合训练集。

这不等于它真的学到了可泛化规律。

最小专业训练至少要拆成：

- train set：给 optimizer 更新参数。
- validation set：不更新参数，只观察泛化表现。

如果出现：

```text
train_loss 持续下降
val_loss 先下降后上升
```

这通常说明模型开始过拟合。

领域模型里，这个问题更危险。假设法律合同样本只有几十条，如果训练集和验证集来自同一份合同的相似条款，模型可能只是记住格式和措辞。指标看起来很好，但换一份合同就崩。

所以后续数据工程章节会强调：

- 按 `source_group` 切分。
- 冻结 eval set。
- 检查数据泄漏。
- 保留 failure cases。

这些都不是形式主义，而是在防止“训练看起来变好”的错觉。

## 10. overfit tiny：小数据都背不下来，先别调大模型

训练系统最实用的调试方法之一，是 overfit tiny。

做法很简单：

1. 取非常少的样本，比如 8 条。
2. 用足够大的模型和较高训练轮数。
3. 看模型能不能把这些样本几乎完全拟合。

如果 tiny dataset 都无法过拟合，优先怀疑训练管线：

- label 是否错位？
- loss 是否算错？
- 参数是否真的更新？
- 学习率是否过小或过大？
- 模型是否处在 eval 模式？
- 数据是否每次都被错误打乱或覆盖？

这一步不是为了证明模型有泛化能力。恰恰相反，它是在证明模型至少有“记住训练样本”的能力。连这个都做不到，谈泛化太早。

## 11. 最小实验：四个开关看懂训练闭环

建议本章至少做四组实验：

| 实验 | 改动 | 预期现象 | 说明 |
| --- | --- | --- | --- |
| baseline | 正常训练 | loss 下降，参数更新 | 闭环可用 |
| no backward | 不调用 `loss.backward()` | 参数无梯度 | 无法知道怎么改 |
| no step | 不调用 `optimizer.step()` | 梯度存在但参数不变 | 只算不改 |
| no zero_grad | 不清梯度 | 梯度跨 batch 累积 | 现象可能异常 |

最小 pytest 可以检查：

```python
params_before = [p.detach().clone() for p in model.parameters()]
optimizer.zero_grad()
loss.backward()
assert any(p.grad is not None for p in model.parameters())
optimizer.step()
params_after = [p.detach() for p in model.parameters()]

assert any(
    not torch.allclose(before, after)
    for before, after in zip(params_before, params_after, strict=True)
)
```

这个测试不是为了追求准确率，而是证明训练闭环确实改变了参数。更完整的检查还会确认：参数确实交给了 optimizer、反传后存在梯度、`step()` 后至少一个参数发生变化。

## 12. 最小链式法则推导：梯度为什么能分摊责任

前面我们用 `loss(w) = (w - 3)^2` 看了一维梯度。真实神经网络里，参数通常不是直接连到 loss，而是经过多步计算。链式法则回答的问题是：

```text
一个参数先影响中间结果，
中间结果再影响输出，
输出再影响 loss，
那么这个参数到底该承担多少责任？
```

看一个极小模型：

```text
y_pred = w * x
loss = (y_pred - y)^2
```

设：

```text
x = 2
y = 10
w = 3
```

先前向：

```text
y_pred = 3 * 2 = 6
loss = (6 - 10)^2 = 16
```

现在算 `d loss / d w`。链式法则拆成两段：

```text
d loss / d w
= d loss / d y_pred * d y_pred / d w
```

分别计算：

```text
d loss / d y_pred = 2(y_pred - y) = 2(6 - 10) = -8
d y_pred / d w = x = 2
```

所以：

```text
d loss / d w = -8 * 2 = -16
```

学习率 `lr = 0.1` 时：

```text
w_new = w - lr * grad = 3 - 0.1 * (-16) = 4.6
```

再前向一次：

```text
y_pred = 4.6 * 2 = 9.2
loss = (9.2 - 10)^2 = 0.64
```

loss 从 16 变成 0.64。这个小推导就是 PyTorch autograd 在大模型里自动做的事，只是大模型的计算图更长、参数更多。

直观感受：梯度不是“参数好坏评分”，而是“如果这个参数微微变大，loss 会怎样变”的局部斜率。负梯度表示参数增大有助于降低 loss，正梯度表示参数减小有助于降低 loss。

## 13. 两个具体例子：同一个闭环如何落到领域任务

例子 1：合同风险 toy classifier。

```text
x = [违约金比例, 逾期天数]
y = 高风险 / 低风险
```

模型输出两个 logits：

```text
logits = [low_score, high_score]
```

如果真实标签是高风险，但模型给高风险的概率很低，交叉熵 loss 会变大。反向传播会更新权重，让类似输入下的高风险 logit 更容易变大。这里的训练目标只是学习 toy 标签，并不等于给出法律意见。

例子 2：医学分流 toy classifier。

```text
x = [胸痛, 呼吸困难, 持续时间, 年龄]
y = 普通科普 / 建议及时就医
```

如果样本包含红旗症状而模型预测为普通科普，loss 会惩罚这个错误。训练闭环能帮助模型学习“红旗症状 -> 就医分流”的模式，但不能让模型具备诊断资格。项目设计上必须把输出限制为科普和分流提醒。

这两个例子都说明：训练闭环只会优化你给它的目标。如果标签、边界或评测错了，模型会认真学习错误目标。

## 14. 反例与边界：loss 下降不等于系统可信

反例 1：标签泄漏。

假设训练数据里每条高风险合同都带有字符串：

```text
[HIGH_RISK]
```

模型很容易学会看到这个标记就预测高风险，train/val loss 都可能很好。如果真实输入没有这个标记，模型马上失效。这不是模型学会了合同风险，而是数据管线泄漏了答案。

反例 2：医学安全标签分布偏差。

如果训练集中“胸痛”样本大多被标成普通问答，模型可能学会淡化红旗症状。loss 下降只说明它拟合了数据分布，不说明这个分布安全。

边界：梯度下降只能沿着 loss 指定的方向优化。它不会自动知道法律合规、医学伦理、证据引用或人工复核要求。要让这些要求进入系统，必须体现在数据、loss、评测、拒答规则和发布门禁里。

## 常见错误

| 常见错误 | 正确认识 |
| --- | --- |
| loss 下降就说明模型好了 | 还要看验证集、切片指标和失败案例 |
| `backward()` 会更新参数 | `backward()` 只算梯度，`step()` 才更新参数 |
| 梯度越大越好 | 梯度过大可能发散，需要裁剪或调学习率 |
| 模型越大越好 | 数据少时更容易过拟合，领域小模型尤其要控制 |
| tiny overfit 没意义 | 它是排查训练管线 bug 的最小验收 |
| eval 时不写 `no_grad()` 也能跑 | 能跑但浪费显存，还可能污染训练判断 |

## 测试验收

本章学完，至少应该能通过下面这些验收：

- 本章最低产物：跑通 `src/training/simple_mlp.py` 的 baseline 或 overfit tiny 实验，并通过 `tests/test_training_loop.py`。
- 能用一句话解释神经网络为什么可以看成 `f(x; theta)`。
- 能手算 `loss(w) = (w - 3)^2` 在某一点的梯度和一步更新。
- 能解释 `zero_grad()`、`backward()`、`step()` 的分工。
- 能写一个 toy classifier，并确认 loss 是标量。
- 能用测试证明参数在训练后发生变化。
- 能区分训练集变好和验证集变好。
- 能做一次 overfit tiny，并解释失败时优先排查什么。

## FAQ

### 1. 为什么不从 Transformer 开始？

因为 Transformer 仍然要靠 loss、梯度和 optimizer 学习。如果训练闭环不清楚，后面看到 attention、LoRA、蒸馏时，只会把每个新名词都当成孤立技巧。

### 2. 梯度下降一定能找到最优解吗？

不一定。深度学习里的 loss surface 很复杂，学习率、初始化、数据顺序、优化器都会影响结果。我们通常追求可用的低 loss，而不是数学上证明的全局最优。

### 3. 为什么领域模型不能只看 accuracy？

法律和医学任务里，高风险失败比平均分更重要。一个模型普通问题答得很好，但在“胸痛呼吸困难”或“保证胜诉”这类边界上乱答，就不能发布。

### 4. 为什么要固定 seed？

因为初始化、数据 shuffle、dropout 都可能引入随机性。固定 seed 不能保证所有硬件完全一致，但能显著提高实验可复现性，让你知道变化来自代码还是随机波动。

## 自测题

1. 如果忘记 `optimizer.step()`，训练日志里可能看到什么？参数会不会变？
2. 如果 `train_loss` 下降但 `val_loss` 上升，你会怎么解释？
3. 为什么 `loss.backward()` 要从标量 loss 开始？
4. overfit tiny 失败时，列出三个最应该先排查的点。
5. 领域项目中，为什么“训练集准确率 99%”不能作为发布依据？

答案要点：

- `step()` 缺失时参数不会更新，loss 可能因 batch 差异波动但不会系统性学习。
- train/val 分叉通常提示过拟合或数据分布不一致。
- 标量 loss 是优化目标，反向传播从单一目标分配梯度。
- 优先查 label、loss、参数更新、学习率、模式切换。
- 发布还需要 eval set、风险切片、安全边界、证据和回滚方案。

## 想继续深挖

继续深挖训练闭环，可以把一次更新写完整。假设：

```text
ŷ = wx + b
loss = (ŷ - y)^2
```

那么：

```text
d loss / d w = 2(ŷ - y) * x
d loss / d b = 2(ŷ - y)
w_new = w - lr * d loss / d w
b_new = b - lr * d loss / d b
```

这里的核心不是背导数，而是看懂“责任如何分摊”。如果 `ŷ` 比 `y` 大，`(ŷ-y)` 为正；当 `x` 为正时，梯度会推动 `w` 变小，让下一次预测降低。多层网络只是把这个责任分摊继续套上链式法则：

```text
d loss / d w1 = d loss / d h * d h / d w1
```

所以排查训练 bug 时，要沿这条责任链检查：loss 是否标量、参数是否参与计算图、梯度是否非零、`optimizer.step()` 是否真的更新、`zero_grad()` 是否阻止梯度累积污染下一步。

## 和领域项目的关系

法律和医学模型的训练仍然遵循同一闭环。SFT 是用指令数据训练模型输出格式和行为边界；LoRA 是冻结大部分参数，只训练低秩 adapter；蒸馏是让 student 学 teacher 的证据约束回答。它们看起来不同，但底层仍然是：

```text
输入样本 -> 模型输出 -> loss -> backward -> optimizer.step -> eval
```

如果你不能解释 loss 从哪里来、梯度更新了什么、验证集为什么可信，那么后面再复杂的微调和部署都只是“把命令跑通”。本课程要训练的是另一种能力：每一步都能被实验、测试和报告证明。
