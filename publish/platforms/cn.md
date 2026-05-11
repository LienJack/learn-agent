# 中文平台草稿规则

## 平台范围

- 微信公众号：必须单独走 `md2wechat` 棕色主题 HTML 草稿链路。
- 掘金：使用 Wechatsync 单平台草稿同步。
- 知乎：使用 Wechatsync 单平台草稿同步。

## 默认行为

中文 V1 只创建草稿或进入半自动草稿步骤，不点击正式发布、提交审核或公开发布。

## 前置检查

- 文章必须有 `title`、`description`、`heroImage`。
- `heroImage` 和本地图片路径必须存在。
- 公众号标题最多 32 字；超过 32 字时必须先准备 `wechatTitle`、`shortTitle` 或 `wechat_title`，不要盲目批量发布。
- `WECHATSYNC_TOKEN` 必须来自环境变量或本地 shell，不写入仓库、运行记录或文档示例的真实值。
- Chrome 扩展和平台登录态缺失时，掘金/知乎停止在草稿动作前。
- 封面缺失时跳过该文并提示缺失路径，不继续三平台发布。

## 微信公众号链路

微信公众号不要使用 `wechatsync -p weixin`。正式草稿路径固定为：

```bash
md2wechat version --json
md2wechat capabilities --json
md2wechat themes list --json
md2wechat themes show autumn-warm --json
md2wechat config validate
md2wechat inspect "article.md"
md2wechat convert "article.md" --mode ai --theme autumn-warm --title "短标题" -o "publish/artifacts/<run-id>/article-wechat.html"
md2wechat upload_image "path/to/local-image.png" --json
md2wechat test-draft "publish/artifacts/<run-id>/article-wechat.html" "cover.jpg" --json
```

注意：

- `preview` 和 degraded preview 只用于人工检查，不能同步到平台，也不能当正式 HTML。
- `CONVERT_AI_REQUEST_READY` 不是最终 HTML。必须由外部 AI 根据 prompt 生成 HTML 后才能继续创建公众号草稿。
- `MD2WECHAT_API_KEY is required for API mode` 时，不要假装已经生成棕色 HTML；继续按 `autumn-warm` 规范手动生成最终 HTML、上传正文图片并创建草稿。
- 公众号正文图片必须全部替换成微信图链；发布前静态检查不能残留 `./assets`、`../assets`、`file://`、本机绝对路径或 URL 编码后的本地路径。
- `text` 围栏通常是流程、关键点或现场账本，应渲染成重点说明块，保留换行和 `->` 箭头，不要变成横向滚动代码块。
- 真正代码块要保留原始换行、缩进和长行阅读能力。优先使用 mdnice 风格代码壳；如果微信后台压扁代码，再改用逐行 HTML 渲染和 `&nbsp;` 保缩进。

## 微信 Markdown 代码处理

公众号 HTML 里不要把所有 fenced block 都当成 `<pre><code>`。先按语义分三类：

- `text` / `txt` 围栏，且内容像流程、账本、关键点、命令结果说明：转成重点说明块。
- 有明确语言的代码围栏，例如 `js`、`ts`、`bash`、`python`、`sql`：转成代码壳。
- 微信后台压扁缩进、吞换行、长行不可读时：改用逐行 HTML fallback。

### text 围栏说明块模板

适合这类 Markdown：

````markdown
```text
检查文章 -> 生成 HTML -> 上传图片 -> 创建草稿
失败项：zhihu 图片上传超时
```
````

生成 HTML 时使用说明块，而不是横向滚动代码块：

```html
<section class="note-block" style="margin:16px 0;padding:14px 16px;border-left:4px solid #9a6a3a;background:#fff7ed;border-radius:8px;">
  <div style="font-size:14px;line-height:1.8;color:#4a3424;white-space:pre-wrap;">检查文章 -> 生成 HTML -> 上传图片 -> 创建草稿
失败项：zhihu 图片上传超时</div>
</section>
```

要求：

- 保留原始换行。
- 保留 `->`、编号、现场状态。
- 不显示编程语言标签。
- 不使用横向滚动。

### 真实代码块模板

适合有语言标签的代码：

````markdown
```js
const result = await publishDraft(article);
console.log(result.url);
```
````

优先使用这套 mdnice 兼容代码壳。注意：代码内容里的普通空格要替换为 `&nbsp;`，换行用 `<br>`，HTML 特殊字符必须转义。

```html
<section id="nice" data-tool="mdnice编辑器" data-website="https://www.mdnice.com" style="margin-top:0px;margin-bottom:0px;margin-left:0px;margin-right:0px;padding-top:0px;padding-bottom:0px;padding-left:10px;padding-right:10px;background-attachment:scroll;background-clip:border-box;background-color:rgba(0, 0, 0, 0);background-image:none;background-origin:padding-box;background-position-x:left;background-position-y:top;background-repeat:no-repeat;background-size:auto;width:auto;font-family:Optima, 'Microsoft YaHei', PingFangSC-regular, serif;font-size:16px;color:rgb(0, 0, 0);line-height:1.5em;word-spacing:0em;letter-spacing:0em;word-break:break-word;overflow-wrap:break-word;text-align:left;">
  <pre class="custom" data-tool="mdnice编辑器" style="border-radius:5px;box-shadow:rgba(0, 0, 0, 0.55) 0px 2px 10px;text-align:left;margin-top:10px;margin-bottom:10px;margin-left:0px;margin-right:0px;padding-top:0px;padding-bottom:0px;padding-left:0px;padding-right:0px;">
    <span style="display:block;background:url(https://files.mdnice.com/user/3441/876cad08-0422-409d-bb5a-08afec5da8ee.svg);height:30px;width:100%;background-size:40px;background-repeat:no-repeat;background-color:#282c34;margin-bottom:-7px;border-radius:5px;background-position:10px 10px;"></span>
    <code class="hljs" style="overflow-x:auto;padding:16px;color:#abb2bf;padding-top:15px;background:#282c34;border-radius:5px;display:-webkit-box;font-family:Consolas, Monaco, Menlo, monospace;font-size:12px;"><span class="hljs-keyword" style="color:#c678dd;line-height:26px;">const</span> result = await publishDraft(article);<br><span class="hljs-built_in" style="color:#e6c07b;line-height:26px;">console</span>.log(result.url);<br></code>
  </pre>
</section>
```

要求：

- 保留语言标签。
- `<section id="nice" data-tool="mdnice编辑器">`、`pre.custom`、`code.hljs` 三层结构保留。
- 保留顶部窗口装饰 `span`，不要删掉 `https://files.mdnice.com/user/3441/876cad08-0422-409d-bb5a-08afec5da8ee.svg`。
- 普通空格用 `&nbsp;` 保住缩进和命令间距，换行用 `<br>`。
- 语法高亮可用 `hljs-*` span；没有高亮时至少保留 `code.hljs` 外壳。
- 长行优先依赖 `overflow-x:auto`；如果手机端阅读很差，再人工断行或改 fallback。

### 逐行 fallback 模板

当微信后台压扁 `<pre>` 缩进时，改用逐行渲染：

```html
<section id="nice" data-tool="mdnice编辑器" data-website="https://www.mdnice.com" style="margin-top:0px;margin-bottom:0px;margin-left:0px;margin-right:0px;padding-top:0px;padding-bottom:0px;padding-left:10px;padding-right:10px;background-color:rgba(0, 0, 0, 0);width:auto;font-family:Optima, 'Microsoft YaHei', PingFangSC-regular, serif;font-size:16px;color:rgb(0, 0, 0);line-height:1.5em;word-break:break-word;overflow-wrap:break-word;text-align:left;">
  <pre class="custom" data-tool="mdnice编辑器" style="border-radius:5px;box-shadow:rgba(0, 0, 0, 0.55) 0px 2px 10px;text-align:left;margin-top:10px;margin-bottom:10px;margin-left:0px;margin-right:0px;padding:0px;">
    <span style="display:block;background:url(https://files.mdnice.com/user/3441/876cad08-0422-409d-bb5a-08afec5da8ee.svg);height:30px;width:100%;background-size:40px;background-repeat:no-repeat;background-color:#282c34;margin-bottom:-7px;border-radius:5px;background-position:10px 10px;"></span>
    <code class="hljs" style="overflow-x:auto;padding:16px;color:#abb2bf;padding-top:15px;background:#282c34;border-radius:5px;display:-webkit-box;font-family:Consolas, Monaco, Menlo, monospace;font-size:12px;">pnpm&nbsp;test:publish<br>&nbsp;&nbsp;pnpm&nbsp;astro:check<br></code>
  </pre>
</section>
```

要求：

- 保持 mdnice 三层结构，只在 `code.hljs` 内做逐行文本。
- 普通空格替换为 `&nbsp;`，至少保住缩进和命令间距。
- 每一行以 `<br>` 结尾。
- HTML 特殊字符必须转义：`&` -> `&amp;`、`<` -> `&lt;`、`>` -> `&gt;`。
- fallback 只用于微信后台破坏 `<pre>` 的情况，不作为默认首选。

### 发布前检查

生成公众号 HTML 后运行：

```bash
rg -n "mdnice编辑器|pre class=\"custom\"|code class=\"hljs\"|&nbsp;|overflow-x:auto|note-block" "article-wechat.html"
```

检查目标：

- `text` 围栏是否进入 `note-block`。
- 真实代码块是否进入 mdnice 三层外壳。
- 缩进是否通过 `&nbsp;` 保留，换行是否通过 `<br>` 保留。
- 长代码是否仍可在手机上阅读。
- 没有把命令、流程、现场账本误渲染成普通段落。

## 掘金 / 知乎链路

含本地图片的文章，掘金和知乎必须分别单平台同步，避免一个平台先上传图片后让另一个平台转存失败。

```bash
WECHATSYNC_TOKEN="$WECHATSYNC_TOKEN" wechatsync sync "article.md" -p juejin --title "标题" --cover "cover.jpg" --dry-run
WECHATSYNC_TOKEN="$WECHATSYNC_TOKEN" wechatsync sync "article.md" -p zhihu --title "标题" --cover "cover.jpg" --dry-run

WECHATSYNC_TOKEN="$WECHATSYNC_TOKEN" wechatsync sync "article.md" -p juejin --title "标题" --cover "cover.jpg"
WECHATSYNC_TOKEN="$WECHATSYNC_TOKEN" wechatsync sync "article.md" -p zhihu --title "标题" --cover "cover.jpg"
```

如果某个平台草稿里图片缺失，不要重复多平台合并同步，直接对该平台单独重推。知乎图片上传可能平台侧超时；失败时只单独重推知乎，不影响微信和掘金已经成功的草稿。

## 批处理要求

- 某篇失败时在最终回复里标明失败平台、失败命令和错误输出。
- 不要因为某个平台失败就误报整批成功。
- 下一篇可以继续，但最终汇总必须列出失败项。
- 如果 `title` 超过 32 字且没有短标题，先为该文准备短标题。
- 如果封面缺失，跳过该文并提示缺失路径。

## 记录要求

每个平台单独记录状态：`ready_for_draft`、`blocked`、`draft_created` 或 `manual_required`。部分平台失败不能写成整体成功。

最终汇总每个平台都要包含：

- 平台名。
- 是否草稿成功。
- 草稿链接。
- 使用的标题。
- 使用的封面路径。
- 图片上传数量。
- 是否有图片上传失败。
- 是否确认没有点击正式发布。

## 常见故障

### Invalid or missing token

原因：命令没有带 `WECHATSYNC_TOKEN`，或 token 与扩展不匹配。

修复：

```bash
WECHATSYNC_TOKEN="$WECHATSYNC_TOKEN" wechatsync platforms -a
```

### 公众号草稿箱看不到文章

先确认是否已经走 `md2wechat` 棕色主题草稿链路。不要用 `wechatsync -p weixin` 补发最终稿。

### 掘金图片缺失

常见原因是多平台合并同步时图片先上传到知乎，再由掘金转存失败。补救时只重推掘金：

```bash
WECHATSYNC_TOKEN="$WECHATSYNC_TOKEN" wechatsync sync "article.md" -p juejin --title "短标题或原标题" --cover "cover.jpg"
```

### AI 模式只生成 prompt

返回 `CONVERT_AI_REQUEST_READY` 时，需要外部 AI 根据 prompt 生成 HTML 后才能继续。没有最终 HTML 时，微信公众号不要创建草稿；掘金和知乎可以按 Markdown 草稿路径继续。
