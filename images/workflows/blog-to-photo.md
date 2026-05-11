# Blog To Photo 工作流

1. 用 `images/bin/article-images --dry-run --stage photos <article.md ...>` 选择适合图解的章节。
2. 用 `images/bin/article-images --yes --stage photos <article.md ...>` 写入 prompt request 和 manifest。
3. 对每个 `photo-*-prompt.md` 使用 `blog-to-photo` skill 生成最终图片 prompt。
4. 默认使用内置 `imagegen` 生成图片。
5. 将选定图片导入项目：

```bash
images/bin/article-images --import <generated.png> --prompt-id photo-01 <article.md>
```

6. 运行 `images/bin/article-image-check <article.md ...>`。

兜底路径只在 `imagegen` 失败或不可用后使用：

```bash
images/bin/article-photo-fallback <prompt-or-article>
```

兜底输出仍必须通过 `article-images --import` 写回同一个文章工作区。
