import { defineConfig } from 'vitepress'
import { readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

/** 递归扫描目录下的 .md 文件，返回 sidebar items */
function scanMd(dir: string, base = ''): { text: string; link: string }[] {
  const items: { text: string; link: string }[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // 跳过 . 开头的目录和配置文件
    if (entry.name.startsWith('.')) continue
    const full = resolve(dir, entry.name)
    const rel = base + entry.name
    if (entry.isDirectory()) {
      items.push(...scanMd(full, rel + '/'))
    } else if (entry.name.endsWith('.md') && entry.name !== 'index.md' && entry.name !== 'README.md') {
      items.push({
        text: entry.name.replace(/\.md$/, ''),
        link: '/' + rel.replace(/\.md$/, ''),
      })
    }
  }
  return items
}

// 自动发现所有文章，无需手动维护 sidebar
const posts = scanMd(root)

export default defineConfig({
  title: 'My Docs',
  description: '基于 Git + Markdown 的文档站点',

  // 站点基础路径，如果部署到 username.github.io 仓库就填 '/'
  // 如果部署到 username.github.io/repo，就填 '/repo/'
  base: '/',

  lastUpdated: true,
  cleanUrls: true,

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
    ],

    sidebar: posts.length > 0
      ? {
          '/': [
            { text: '文章', items: posts },
          ],
        }
      : undefined,

    socialLinks: [
      { icon: 'github', link: 'https://github.com' },
    ],

    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2024',
    },

    search: {
      provider: 'local',
    },
  },
})
