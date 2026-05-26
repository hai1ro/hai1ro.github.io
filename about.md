---
title: 关于
layout: page
---

# 👋 关于我

这是一个基于 **VitePress + GitHub Actions** 的博客。

## 工作方式

- 📝 在 `posts/` 目录下写 Markdown
- 🚀 `git push` 自动触发 CI 构建部署
- 🌐 站点自动更新到 GitHub Pages

## 文章格式

每篇文章需要 frontmatter：

```yaml
---
title: 文章标题
date: 2024-01-01
tags: [标签1, 标签2]
description: 文章摘要
---
```

然后在 `posts/` 目录新建 `.md` 文件，push 即可。
