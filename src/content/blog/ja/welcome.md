---
title: 'learn-agent へようこそ'
description: '多言語アーカイブに向けた、日本語側の最初のエントリです。'
pubDate: 'May 03 2026'
heroImage: '../../../assets/blog-placeholder-about.jpg'
locale: 'ja'
---

このサイトはルート単位の多言語シェルに加えて、記事アーカイブも言語ごとに整理できる形へ進み始めました。

目的は、英語・中国語・日本語の記事を一つの一覧に混ぜず、それぞれの導線で読めるようにすることです。

## 日本語記事の置き場所

新しい日本語の Markdown / MDX 記事は `src/content/blog/ja/` に置きます。

例:

```md
---
title: '新しい日本語記事'
description: '一文の概要'
pubDate: 'May 03 2026'
locale: 'ja'
---

ここから本文を書きます。
```

## 現在の言語ディレクトリ

- 中国語記事: `src/content/blog/zh/`
- 英語記事: `src/content/blog/en/`
- 日本語記事: `src/content/blog/ja/`

## この分割でできること

言語ごとに記事を分けることで、ブログ一覧や記事ルートをそれぞれの言語向けに安定して生成できるようになります。
