# learn-agent

一个使用 Astro 初始化的文章博客项目，适合后续部署到 Vercel。

## 技术栈

- Astro 6
- Markdown / MDX
- RSS
- Sitemap
- Sharp

## 本地开发

项目当前要求 `Node.js >= 22.12.0`。

```bash
npm install
npm run dev
```

开发服务器默认运行在 [http://localhost:4321](http://localhost:4321)。

## 常用命令

```bash
npm run dev
npm run build
npm run preview
```

## 内容目录

- 文章内容放在 `src/content/blog/`
- 公共静态资源放在 `public/`
- 站点基础信息在 `src/consts.ts`
- Astro 配置在 `astro.config.mjs`

## 后续手动部署到 Vercel

这个项目当前是标准 Astro 静态博客结构，后续你可以直接把仓库导入 Vercel。

部署前建议先修改：

- `astro.config.mjs` 里的 `site`
- `src/consts.ts` 里的站点标题和描述
- `src/content/blog/` 下的文章内容
