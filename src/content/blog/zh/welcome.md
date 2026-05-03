---
title: '欢迎来到 learn-agent'
description: '这是站点的第一篇正式记录，也是一切后续写作的起点。'
pubDate: 'May 02 2026'
heroImage: '../../../assets/blog-placeholder-about.jpg'
locale: 'zh'
---

这个站点已经使用 Astro 初始化完成，支持 Markdown 和 MDX 写作，也保留了 RSS 与 Sitemap 的基础能力。

接下来会从这里继续把内容和站点一起慢慢搭起来：

## 可以先做什么

- 调整站点标题、描述和整体语气
- 替换默认配图与 favicon
- 继续补写新的文章
- 按设计规范持续收拢页面风格

## 新文章放在哪里

把新的 Markdown 或 MDX 文件放到 `src/content/blog/zh/` 目录下即可。

例如：

```md
---
title: '我的新文章'
description: '一句话摘要'
pubDate: 'May 03 2026'
locale: 'zh'
---

正文内容从这里开始。
```

## 多语言内容目录

- 中文文章：`src/content/blog/zh/`
- 英文文章：`src/content/blog/en/`
- 日文文章：`src/content/blog/ja/`

## 部署前记得修改

在正式部署到 Vercel 之前，建议先更新 `astro.config.mjs` 里的 `site` 地址，换成你的真实域名。
