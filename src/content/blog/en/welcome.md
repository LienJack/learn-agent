---
title: 'Welcome to learn-agent'
description: 'The first English entry for the site, and the starting point for the multilingual archive.'
pubDate: 'May 03 2026'
heroImage: '../../../assets/blog-placeholder-about.jpg'
locale: 'en'
---

This site now has a route-based multilingual shell, and the blog archive has started splitting into language-specific folders.

The goal is simple: keep English, Chinese, and Japanese notes organized without mixing them into one archive view.

## Where English posts go

Place new English Markdown or MDX files under `src/content/blog/en/`.

For example:

```md
---
title: 'My English Post'
description: 'One-line summary'
pubDate: 'May 03 2026'
locale: 'en'
---

Start writing here.
```

## Current language directories

- Chinese posts: `src/content/blog/zh/`
- English posts: `src/content/blog/en/`
- Japanese posts: `src/content/blog/ja/`

## Why this split matters

Once the content is separated by language, the site can generate language-specific blog indexes and article routes without guessing which post belongs where.
