---
title: Hello World — Markdown 样式展示
date: 2024-12-20
tags: [guide, markdown]
description: 欢迎来到我的博客！这篇文章展示了博客支持的全部 Markdown 样式，包含标题、代码、表格、引用等
---

# Hello World

欢迎来到我的博客！🎉 这篇文章将展示本博客支持的**全部 Markdown 样式**，你可以把它当作写作参考。

## 文本样式

这里是**粗体文字**，这里是*斜体文字*，这里是~~删除线~~，这里是 `行内代码`。

> 这是一段引用文字。VitePress 提供了优雅的引用块样式，左侧有品牌色边框。
>
> > 引用可以嵌套，第二层颜色会略淡一些。

## 列表

### 无序列表

- 🍎 第一项
- 🍋 第二项
  - 嵌套子项 A
  - 嵌套子项 B
- 🍊 第三项

### 有序列表

1. 打开编辑器
2. 在 `posts/` 目录新建 `.md` 文件
3. 写上 frontmatter 和正文
4. `git push` 自动部署

### 任务列表

- [x] 用 AI 搭建博客框架
- [x] 优化界面设计
- [x] 配置 GitHub Actions 自动部署
- [ ] 写 100 篇文章
- [ ] 添加评论系统

## 代码块

### TypeScript

```ts
interface Post {
  title: string
  date: string
  tags: string[]
  description: string
}

async function loadPosts(): Promise<Post[]> {
  const response = await fetch('/api/posts')
  const data: Post[] = await response.json()
  return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
```

### Python

```python
def fibonacci(n: int) -> list[int]:
    """生成斐波那契数列"""
    a, b = 0, 1
    result = []
    for _ in range(n):
        result.append(a)
        a, b = b, a + b
    return result

print(fibonacci(10))
# [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

### Bash

```bash
#!/bin/bash
# 统计 posts 目录下的文章数量
count=$(ls posts/*.md 2>/dev/null | wc -l)
echo "📝 当前共有 ${count} 篇文章"
```

### YAML

```yaml
# 文章 frontmatter 格式
title: 文章标题
date: 2024-12-20
tags:
  - tutorial
  - frontend
description: 文章摘要，会显示在首页卡片和 SEO 描述中
```

## 表格

| 特性 | 状态 | 说明 |
|------|:----:|------|
| Markdown 写作 | ✅ | 用任何编辑器写 `.md` 文件 |
| 自动部署 | ✅ | Git push → GitHub Actions → Pages |
| 代码高亮 | ✅ | Shiki 主题，亮/暗模式自动切换 |
| 全文搜索 | ✅ | 本地索引，无需第三方服务 |
| 响应式布局 | ✅ | 手机、平板、桌面全适配 |
| RSS 订阅 | 🚧 | 规划中 |

## 水平线

上面是一条水平线，下面是另一条。

---

三条水平线之间是正文内容。

## 链接与图片

- 本站首页：[hai1ro.github.io](https://hai1ro.github.io)
- VitePress 文档：[vitepress.dev](https://vitepress.dev)
- GitHub 仓库：[hai1ro/hai1ro.github.io](https://github.com/hai1ro/hai1ro.github.io)

## 强调与总结

> **💡 小贴士：** 在 `posts/` 目录新建 `.md` 文件，加上 frontmatter 元信息，`git push` 即可自动发布。整个过程不需要本地安装任何环境，纯 Markdown 驱动。

*感谢阅读！欢迎通过 [GitHub Issues](https://github.com/hai1ro/hai1ro.github.io/issues) 交流反馈。*
