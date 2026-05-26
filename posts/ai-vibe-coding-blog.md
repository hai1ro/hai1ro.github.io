---
title: 用 AI Vibe Coding 搭建博客：从零到上线，全程只动嘴
date: 2026-05-26
tags: [AI, VitePress, GitHub, vibe-coding, tutorial]
description: 记录如何通过纯 AI 对话完成个人博客的架构设计、界面开发和持续优化，0 行手写代码
---

# 用 AI Vibe Coding 搭建博客

## 什么是 Vibe Coding

Vibe Coding 这个概念最近很火——你不需要亲手写代码，只需用自然语言描述你想要什么，AI 来写。你像一个产品经理兼设计师，AI 是你的开发团队。

本博客就是 **100% AI Vibe Coding** 的产物。从第一行配置到最后一行 CSS，我没有手动写过任何代码。整个过程就是和 AI 对话：

> "这个文件夹是一个博客，理解一下构成和运行原理，然后做评审"
>
> "先优化一下当前存在的问题"
>
> "请以优秀前端设计师的视角，优化一下博客网页的设计"

下面记录整个过程。

---

## 第一轮：项目评审

博客的初始状态是一个极简的 VitePress 骨架：

```
hai1ro.github.io/
├── .vitepress/config.ts       # VitePress 配置
├── .vitepress/theme/          # 自定义主题
│   ├── index.ts               # 主题入口
│   ├── posts.data.ts          # 文章数据加载器
│   ├── components/PostList.vue # 文章列表
│   └── style.css              # 全局样式
├── .github/workflows/deploy.yml # 自动部署
├── index.md                   # 首页
├── archives.md                # 归档页
├── about.md                   # 关于页
└── posts/                     # 文章目录
```

我让 AI 先完整阅读所有文件，然后做评审。AI 在几秒内读完了全部源码，给出了结构化的评审报告，指出了两个 🔴 严重问题：

1. **`package.json` 自引用依赖**：`"my-docs": "file:"` 指向自身，是无效的循环引用
2. **`cleanUrls: true` 在 GitHub Pages 上会导致软 404**：GitHub Pages 不支持服务端 URL 重写，干净 URL 会返回 404，靠 SPA 路由兜底

还有几个 🟡 建议：未使用的 CSS 类、标签不可点击、缺少 `description` 字段提取等。

这就是 AI 评审的价值——一眼就能发现人类容易忽略的配置错误。

---

## 第二轮：修复问题

我说："先优化一下当前存在的问题"。AI 在五分钟内完成了 4 个文件修改：

| 文件 | 修改内容 |
|------|----------|
| `package.json` | 删除自引用依赖，更名为 `hai1ro-blog` |
| `.vitepress/config.ts` | `cleanUrls: false`，避免 GitHub Pages 软 404 |
| `posts.data.ts` | 保留 `page.url` 原样适配扩展名，新增 `description` 提取 |
| `style.css` | 删除未使用的 `.post-page-meta` |
| `PostList.vue` | 添加 TypeScript 类型，`description` 作为 excerpt 备选 |

全部通过构建验证，一次成功。

---

## 第三轮：设计大改造

修复完后，博客功能正常，但界面是个纯文档站——白底、分割线、无视觉层次。我说：

> "请以优秀前端设计师的视角，优化一下博客网页的设计，让博客界面更美观实用。"

AI 没有急着写代码，而是先规划了 5 个改动点：

### 🆕 HomeHero 组件

首页原先只是一个 `<PostList />`，没有个人标识。AI 创建了一个 Hero 区域：

- **渐变动画头像**：取站点标题首字，蓝色渐变圆形，带浮动动画
- **品牌色标题**：渐变文字效果
- **特性标签**：圆角药丸，hover 变色 + 微上移
- **装饰元素**：顶部径向渐变光晕 + 分割线

### ✨ PostList 卡片重设计

原来文章列表是文字 + 底部分割线，AI 把它改成了：

| 设计元素 | 效果 |
|----------|------|
| 圆角卡片 | 背景色 + 1px 边框 + 12px 圆角 |
| Hover 上浮 | `translateY(-3px)` + 阴影 + 左侧品牌色条滑入 |
| 标题链接 | 下划线从左滑入动画（`background-size` 过渡） |
| 相对时间 | 近 30 天显示"今天 / 3 天前 / 2 周前" |
| 阅读时间 | 中英文混合估算（中文 300 字/分钟，英文 200 词/分钟） |
| 标签 | `#tag` 圆角药丸，hover 反转色 |
| 入场动画 | 卡片逐个 fadeIn + translateY，间隔 0.08s |

### 🎨 全局样式升级

`style.css` 从 30 行扩展到 180+ 行：

- **品牌色**：蓝系 `#3b82f6`，明/暗模式自动切换
- **字体栈**：Inter + Noto Sans SC
- **链接**：滑动下划线动画
- **代码块**：10px 圆角 + 阴影
- **行内代码**：品牌色文字 + 圆角背景
- **引用块**：左侧品牌色 4px 粗线 + 背景
- **表格**：圆角溢出隐藏 + 表头背景
- **自定义滚动条**：8px 圆角
- **文本选中**：品牌色半透明

### 📄 首页 Hero 集成

`index.md` 更新为 `<HomeHero />` + `<PostList />`。

### 🐛 过程中发现的问题

构建后 AI 发现 Hero 标题为空——因为用了 `useData().theme` 而非 `useData().site`。这是 VitePress API 的细节：`title` 和 `description` 在 `site` 对象上。AI 在自己的代码中发现并修复了这个 bug，没有等我反馈。

---

## 第四轮：我反馈了一个"低级问题"

我打开浏览器看了效果，发现首页 Hero 下方有个 "📝 最新文章" 左对齐卡在中间，看起来很突兀。

这就是 AI Vibe Coding 的局限性——AI 无法预览页面，只能从代码层面推断。`## 📝 最新文章` 是一个 markdown h2，在 VitePress 的 `layout: page` 下会被渲染为带锚点的文档标题，夹在居中的 Hero 和居中的 PostList 之间，形成视觉断层。

AI 的修复方案很聪明：

- 不直接在 markdown 中去掉标题（会导致信息缺失）
- 而是给 PostList 组件加了一个 `sectionTitle` prop
- 页面上写成 `<PostList section-title="最新文章" />`
- 标题内嵌在 PostList 的 scoped 样式中，与卡片宽度统一

这样标题不再是 markdown h2（无锚点、无 `.vp-doc` 样式干扰），而是组件内部的一个干净 `<h2>`。

---

## 第五轮：归档页和关于页

我说："归档页、关于页没有优化过，请你也像前面一样优化一下设计。"

AI 创建了一个 **PageHeader** 组件来统一两个页面的头部设计：
- emoji 图标 + 渐变标题 + 可选副标题
- 左侧品牌色装饰条（与卡片 hover 效果呼应）
- 图标 pulse 微动效

归档页新增了动态**文章计数徽章**（`PostCount` 组件，读取 `posts.data.ts` 自动统计）。

关于页从干巴巴的 bullet list 变成了：
- **特性卡片网格**：3 列自适应，emoji + 标题 + 描述，hover 上浮
- **技术栈徽章**：圆角药丸行，hover 边框变色
- **统一内容容器**：720px 宽度与 PostList 对齐

---

## 最终架构

```
hai1ro.github.io/
├── .vitepress/
│   ├── config.ts               # VitePress 配置（cleanUrls 修复）
│   └── theme/
│       ├── index.ts             # 注册 5 个全局组件
│       ├── posts.data.ts        # 文章加载器（description 提取）
│       ├── style.css            # 180+ 行全局样式
│       └── components/
│           ├── HomeHero.vue     # 首页 Hero
│           ├── PostList.vue     # 文章卡片列表
│           ├── PageHeader.vue   # 页面头部（归档/关于）
│           └── PostCount.vue    # 文章计数徽章
├── .github/workflows/deploy.yml # CI/CD
├── index.md                     # 首页
├── archives.md                  # 归档页
├── about.md                     # 关于页
└── posts/
    ├── hello-world.md           # Markdown 样式展示
    └── ai-vibe-coding-blog.md   # 本文
```

---

## Vibe Coding 的感受

### ✅ 做得好的

1. **速度惊人**：从"这是什么项目"到"设计优化完成"总共不到 1 小时，中间还包括多轮构建验证
2. **评审质量高**：AI 一眼发现 `package.json` 自引用和 `cleanUrls` 兼容性问题——这些问题我自己写可能要到部署失败才会发现
3. **设计品位在线**：卡片布局、hover 动效、品牌色系统、入场动画——这些如果让我手写 CSS 会花很多时间调试
4. **自修复能力强**：Hero 标题为空的 bug 是 AI 自己通过构建输出检查发现并修复的
5. **代码风格一致**：scoped CSS、TypeScript 类型、组件命名——就像一个开发者在写

### ⚠️ 需要人类的地方

1. **视觉验证**：AI 无法预览页面，像 "📝 最新文章位置突兀" 这种问题只能由人类发现并描述
2. **设计方向决策**：AI 会给方案，但"要不要做""做成什么样"需要人来拍板
3. **内容创作**：文章内容（比如本文）AI 可以写框架，但个人观点和经验需要人来补充

### 💡 最佳实践

- **渐进式迭代**：不要一次提所有需求，一轮一轮来，每轮聚焦一个主题
- **先评审、后修改**：让 AI 先完整理解项目再动手，避免盲目修改
- **把 AI 当设计师用**：不要只说"改一下样式"，要说"以优秀前端设计师的视角优化"
- **构建验证每轮必做**：每次修改后立即 `build`，在问题扩散前捕获

---

**这个博客还在持续迭代中。欢迎通过 [GitHub Issues](https://github.com/hai1ro/hai1ro.github.io/issues) 交流！**
