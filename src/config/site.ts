export const siteConfig = {
  /** 站点标题，显示在浏览器标签与页头 */
  title: 'Hai1ro',
  /** 站点描述 / SEO 描述，可自行修改 */
  description: '个人博客',
  author: {
    /** 只使用仓库所有者的 GitHub 用户名，不预设任何个人简介 */
    name: 'Hai1ro',
    github: 'hai1ro',
  },
  /** 页头导航 */
  nav: [
    { label: '首页', href: '/' },
    { label: '文章', href: '/posts/' },
  ],
  /** 页脚链接 */
  social: [
    { label: 'GitHub', href: 'https://github.com/hai1ro', icon: 'github' as const },
    { label: 'RSS', href: '/rss.xml', icon: 'rss' as const },
  ],
  /** 管理后台入口 */
  adminPath: '/admin/',
} as const;

export type SiteConfig = typeof siteConfig;
