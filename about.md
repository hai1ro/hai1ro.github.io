---
title: 关于
layout: page
---

<PageHeader
  icon="👋"
  title="关于我"
  subtitle="基于 VitePress + GitHub Actions 的博客"
/>

<div class="about-content">

这是一个基于 **VitePress + GitHub Actions** 的博客。

## 工作方式

<div class="feature-grid">
  <div class="feature-card">
    <span class="feature-icon">📝</span>
    <strong>Markdown 写作</strong>
    <span>在 posts/ 目录下用任何编辑器写 Markdown</span>
  </div>
  <div class="feature-card">
    <span class="feature-icon">🚀</span>
    <strong>自动部署</strong>
    <span>git push 自动触发 GitHub Actions 构建</span>
  </div>
  <div class="feature-card">
    <span class="feature-icon">🌐</span>
    <strong>GitHub Pages</strong>
    <span>站点自动发布，全球 CDN 加速</span>
  </div>
</div>

## 文章格式

每篇文章需要 frontmatter 元信息：

```yaml
---
title: 文章标题
date: 2024-01-01
tags: [标签1, 标签2]
description: 文章摘要
---
```

在 `posts/` 目录新建 `.md` 文件，push 即可自动发布。

## 技术栈

<div class="tech-stack">
  <span class="tech-badge">VitePress</span>
  <span class="tech-badge">Vue 3</span>
  <span class="tech-badge">Markdown</span>
  <span class="tech-badge">GitHub Actions</span>
  <span class="tech-badge">GitHub Pages</span>
</div>

</div>
