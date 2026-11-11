export const siteConfig = {
  /** 站点标题，显示在浏览器标签与页头 */
  title: 'Hai1ro',
  /** 站点副标题 / SEO 描述 */
  description: '在代码与文字之间，记录一些想法。一个使用 Astro、Semi Design 与 Notion 风格编辑器搭建的个人博客。',
  author: {
    name: 'Hai1ro',
    bio: '写代码，也写字。关心工具、界面与那些值得被记住的细节。',
    avatar: '/avatar.svg',
    github: 'hai1ro',
    location: 'China',
  },
  /** 页头导航 */
  nav: [
    { label: '首页', href: '/' },
    { label: '文章', href: '/posts/' },
    { label: '关于', href: '/about/' },
  ],
  /** 首页与关于页展示的社交链接 */
  social: [
    { label: 'GitHub', href: 'https://github.com/hai1ro', icon: 'github' as const },
    { label: 'RSS', href: '/rss.xml', icon: 'rss' as const },
  ],
  /** 页脚版权起始年份 */
  startYear: 2024,
  /** 管理后台入口 */
  adminPath: '/admin/',
} as const;

export type SiteConfig = typeof siteConfig;
