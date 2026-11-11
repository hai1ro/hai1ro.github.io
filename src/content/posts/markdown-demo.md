---
title: Markdown 语法演示
description: 演示本站支持的基础 Markdown 与 GFM 语法。
date: 2026-11-12
tags:
  - Markdown
  - 示例
---

这是一篇用于检查 Markdown 渲染效果的演示文章。

## 文本

普通段落，包含 **加粗**、*斜体*、~~删除线~~、`行内代码`，以及 [外部链接](https://example.com)。

## 列表

- 无序列表项
- 第二项
  - 嵌套项
- 第三项

1. 有序列表第一项
2. 第二项
3. 第三项

## 任务列表

- [x] 已完成的任务
- [x] 另一个已完成的任务
- [ ] 未完成的任务

## 引用

> 这是一段引用文字。
>
> 引用可以分成多个段落。

## 代码

```ts
export function greet(name: string): string {
  return `Hello, ${name}!`;
}
```

```css
.demo {
  color: #0064fa;
}
```

## 表格

| 语法 | 支持 | 备注 |
| --- | --- | --- |
| 标题 | ✅ | h2–h4 |
| 表格 | ✅ | GFM |
| 代码高亮 | ✅ | 多种语言 |

## 分割线

---
