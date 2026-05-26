import { createContentLoader } from 'vitepress'

/**
 * 数据加载器 —— 扫描 posts/ 下所有 .md 文件，
 * 提取 frontmatter 元数据，按日期倒序排列
 */
export default createContentLoader('/posts/**/*.md', {
  excerpt: true,
  transform(raw) {
    return raw
      .map((page) => ({
        title: page.frontmatter.title || page.url.replace(/^\/posts\//, '').replace(/\.md$/, ''),
        url: page.url.replace(/\.md$/, ''),
        date: page.frontmatter.date || null,
        excerpt: page.excerpt,
        tags: page.frontmatter.tags || [],
      }))
      .sort((a, b) => {
        if (!a.date && !b.date) return 0
        if (!a.date) return 1
        if (!b.date) return -1
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
  },
})
