---
title: Hello World
date: 2024-12-20
tags: [guide]
description: 这是我的第一篇文章，介绍如何使用 Git + Markdown 搭建博客
---

# Hello World

欢迎来到我的博客！🎉

## 工作流

```bash
# 任何地方，clone 仓库
git clone https://github.com/hai1ro/hai1ro.github.io.git

# 写文章（用任何编辑器）
echo "# 新文章" > posts/new-post.md

# 推送，自动部署
git add . && git commit -m "new post" && git push
```

## 特性

- **纯 Markdown** 写作，本地不需要安装任何环境
- **GitHub Actions** 自动构建部署，push 后 30 秒更新
- **全文搜索** 内置支持
- **代码高亮** 开箱即用
- **响应式** 手机/桌面都能看

```ts
// 支持代码高亮
const greeting: string = 'Hello VitePress!'
console.log(greeting)
```

## 下一步

在 `posts/` 目录新建 `.md` 文件，加上 frontmatter 元信息，push 即可自动发布。
