# 技术说明

这个仓库包含一个静态博客和一个 `/admin` 管理后台。文章保存在 `src/content/posts/*.md`，通过 GitHub Contents API 读写，站点由 Astro 静态生成，部署在 GitHub Pages。

> 根目录的 `README.md` 保持原样，本文件只记录技术配置。

## 技术栈

- Astro 5：静态页面、内容集合、RSS、sitemap
- React 18 + Semi Design：`/admin` 管理后台
- CodeMirror 6：Typora 风格 Markdown 编辑器（所见即所得 / 源码切换）
- GitHub Contents API：文章与图片的读写
- GitHub OAuth（Cloudflare Worker 代理）+ Personal Access Token
- GitHub Pages + GitHub Actions

## 本地运行

```bash
pnpm install
cp .env.example .env
pnpm dev
```

- 博客：<http://localhost:4321>
- 后台：<http://localhost:4321/admin>

没有配置 OAuth 时，后台可以使用 Personal Access Token 登录。

## 内容

文章文件：

```text
src/content/posts/<slug>.md  →  /posts/<slug>/
```

Frontmatter：

```yaml
---
title: 标题
description: 摘要
date: 2026-11-11
updated: 2026-11-12 # 可选
tags:
  - 标签
cover: /images/... # 可选
coverAlt: 封面替代文字 # 可选
draft: false
featured: false
---
```

- `draft: true` 在开发环境可见，生产构建会排除。
- 后台会保留 frontmatter 中未识别的字段。
- 图片上传到 `public/images/uploads/YYYY/MM/`，使用内容哈希命名。
- 仓库里保留了一篇语法演示文章 `markdown-demo.md`，可以修改或删除；`src/content/posts/.gitkeep` 仅用于保留目录。

## 管理后台

### 登录

- GitHub OAuth：需要部署 `worker/` 下的 OAuth 代理。
- Personal Access Token：Classic Token 勾选 `repo`；Fine-grained Token 授予目标仓库 `Contents: Read and write`。

令牌保存在浏览器（sessionStorage；勾选“保持登录”时使用 localStorage）。退出登录会清除。

### 保存与构建

后台默认进入工作台，导航包含「工作台 / 文章管理」。编辑器是单栏 Typora 风格：非当前行隐藏 Markdown 标记并直接渲染排版，光标所在行显示源码；顶部可切换「所见即所得 / 源码」。

- 新建、编辑、删除文章：只提交到 GitHub，**不会自动触发 GitHub Actions**。
- 图片上传：只提交图片，不会触发构建。
- 修改可以连续进行，确认后点击后台的「构建站点」按钮，一次性触发跑一次 Pages 构建。
- `draft` 状态在下一次构建时生效；草稿不会进入生产站点。
- OAuth Worker 只在登录时调用，不参与保存或构建流程。
- 后台侧栏会显示“有修改未构建”的本地提示；构建成功后清除。

构建按钮会调用 GitHub `repository_dispatch`（事件 `blog-publish`）。如果令牌没有仓库写权限，会提示构建触发失败，但文章提交仍然成功。

### 手动重新构建

在 GitHub Actions 页面手动运行 **Deploy to GitHub Pages**（`workflow_dispatch`），或：

```bash
gh workflow run deploy.yml
```

## 部署

### GitHub Pages

1. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
2. 推送到 `main` 不会自动构建；在后台点击「构建站点」或手动运行 workflow 才会构建。
3. 可在 **Settings → Secrets and variables → Actions → Variables** 配置：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PUBLIC_SITE_URL` | `https://hai1ro.github.io` | canonical / sitemap / OG |
| `PUBLIC_GITHUB_OWNER` | `hai1ro` | 仓库所有者 |
| `PUBLIC_GITHUB_REPO` | `hai1ro.github.io` | 仓库名 |
| `PUBLIC_GITHUB_BRANCH` | `main` | 读写分支 |
| `PUBLIC_OAUTH_PROXY_URL` | 空 | Worker 地址 |

### OAuth Worker

静态站无法安全保存 `client_secret`，`worker/oauth-worker.js` 负责 `code → token` 交换。

1. 创建 GitHub OAuth App，callback URL 填：

```text
https://<worker 地址>/callback
```

2. 编辑 `worker/wrangler.toml`，填写 `GITHUB_CLIENT_ID`，确认：

```toml
ALLOWED_ORIGINS = "https://hai1ro.github.io"
GITHUB_SCOPE = "repo read:user"
```

3. 部署：

```bash
cd worker
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler deploy
```

4. 设置前端变量并重新构建：

```text
PUBLIC_OAUTH_PROXY_URL = https://<worker 地址>
```

5. 验证：

```bash
curl https://<worker 地址>/health
# {"ok":true,"service":"hai1ro-blog-oauth","configured":true}
```

Worker 使用 HMAC 签名的 `state`（10 分钟过期）、来源白名单、严格 CSP 和 `no-store`；token 只通过 `postMessage` 返回给白名单 origin。

## 主题

公共页面和后台都使用 Semi Design 默认视觉：

- 默认蓝色主色
- 默认系统字体
- 白底 / 深色模式
- 组件风格使用 Semi 的 token

站点配置在 `src/config/site.ts`，目前只包含仓库所有者、标题、描述、导航和 RSS/GitHub 链接，没有预设个人简介、身份或标签。

如需修改颜色或字体，可以覆盖 Semi 的 CSS 变量或修改 `src/styles/tokens.css`。

## 常用命令

```bash
pnpm dev        # 开发
pnpm build      # 生产构建
pnpm preview    # 预览构建
pnpm check      # 类型检查
pnpm test       # 单元测试（Markdown、OAuth Worker）
pnpm sync       # 生成 Astro 类型
```

## 常见问题

- **保存后站点没更新**：草稿保存不会触发构建；发布文章或在 Actions 手动运行部署。
- **OAuth `redirect_uri_mismatch`**：OAuth App 回调地址必须与 Worker 的 `/callback` 完全一致。
- **没有仓库写权限**：检查 Token scope，或 OAuth 账号对目标仓库是否有 push 权限。
- **保存冲突**：文件在别处被修改，刷新后台后重试。
- **图片上传失败**：支持 PNG / JPEG / WebP / GIF / AVIF，单张不超过 4 MB，不允许 SVG。

## 公共站点视觉

- 首页使用 ACG 风格：`src/styles/acg.css` 只作用于 `.site-body`，后台不加载，因此 `/admin` 仍保持 Semi Design 的实用风格。
- GitHub 头像来自 `siteConfig.author.avatar`，当前为 `https://github.com/hai1ro.png?size=240`。
- 修改站点标题、描述、GitHub 用户名或头像，请编辑 `src/config/site.ts`。
- 演示文章的封面在 `public/images/covers/markdown-acg.svg`，通过 frontmatter 的 `cover` 字段引用。
