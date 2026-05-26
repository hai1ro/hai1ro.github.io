import { defineConfig } from 'vitepress'
import taskLists from 'markdown-it-task-lists'

export default defineConfig({
  title: "hai1ro's Blog",
  description: '用 Git + Markdown 写博客，push 自动部署',

  base: '/',

  lastUpdated: true,
  cleanUrls: false, // GitHub Pages 不支持服务端 clean URL，关掉避免软 404

  markdown: {
    config: (md) => {
      md.use(taskLists)
    },
  },

  // 首页不显示 sidebar
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '归档', link: '/archives' },
      { text: '关于', link: '/about' },
    ],

    sidebar: false,

    socialLinks: [
      { icon: 'github', link: 'https://github.com/hai1ro' },
    ],

    footer: {
      message: '基于 VitePress + GitHub Actions 自动部署',
      copyright: `Copyright © ${new Date().getFullYear()} hai1ro`,
    },

    search: {
      provider: 'local',
    },

    // 文档页显示编辑链接
    editLink: {
      pattern: 'https://github.com/hai1ro/hai1ro.github.io/edit/master/:path',
      text: '在 GitHub 上编辑此页',
    },

    // 文档页底部显示上次更新时间
    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },
  },
})
