---
title: 做一个 Notion 风格的 Markdown 编辑器
description: 从 Tiptap 到 Markdown 往返：slash 菜单、气泡工具栏，以及写作体验背后的取舍。
date: 2026-11-02
updated: 2026-11-08
tags:
  - 技术
  - 编辑器
  - 设计
cover: /images/covers/editor.svg
coverAlt: 深色编辑器界面与橙色光标
featured: true
---

后台编辑器是这个博客里最花时间的部分。我想要的不只是「能写 Markdown」，而是一种接近 Notion 的写作手感：输入 `/` 插入块，选中文字弹出工具栏，列表、引用和代码块都能自然地操作。

## 为什么选 Tiptap

Tiptap 是 ProseMirror 的一层 React 封装。它提供了可靠的文档模型、光标与选区处理，以及一套可组合的扩展系统。和直接操作 `contenteditable` 相比，它省掉了很多边界情况。

但它也带来一个核心问题：**编辑器的文档模型是 HTML / JSON，而文章源文件必须是 Markdown。**

## Markdown 往返

我最终采用的方案是：

1. 打开文章时，用 `marked` 把 Markdown 转成 HTML；
2. 交给 Tiptap 解析成文档；
3. 保存时，用 Turndown 把 HTML 转回 Markdown；
4. frontmatter 单独用 YAML 解析与序列化。

听起来简单，实际上大部分工作都在处理「不完美的一一对应」：任务列表的 checkbox 位置、表格单元格里的段落、代码块的语言标记。

```ts
const markdown = htmlToMarkdown(editor.getHTML());
const source = stringifyPostSource(frontmatter, markdown);
```

## 一些取舍

| 方案 | 优点 | 缺点 |
| --- | --- | --- |
| 直接编辑 Markdown | 保真、简单 | 写作体验差 |
| 所见即所得 + HTML 存储 | 实现简单 | 源文件不可读 |
| 编辑器 + Markdown 往返 | 体验与可维护性平衡 | 需要处理边界情况 |

为了避免内容被悄悄改坏，我保留了「源码模式」：随时可以切到 Markdown 检查实际写入的内容。这像是一个逃生舱，让人安心。

## 还要做什么

- [x] Slash 菜单
- [x] 选中文字的气泡工具栏
- [x] 图片上传到仓库
- [ ] 块拖拽排序
- [ ] 更完善的表格操作

编辑器不是目的，写作才是。希望这些细节最终会退到背景里，只剩下文字本身。
