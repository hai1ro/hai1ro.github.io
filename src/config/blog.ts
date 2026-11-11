/**
 * 管理后台连接的 GitHub 仓库配置。
 * 所有变量都必须是 PUBLIC_ 前缀，才能在浏览器端使用（构建时内联）。
 */
const env = import.meta.env;

export const blogConfig = {
  owner: env.PUBLIC_GITHUB_OWNER || 'hai1ro',
  repo: env.PUBLIC_GITHUB_REPO || 'hai1ro.github.io',
  branch: env.PUBLIC_GITHUB_BRANCH || 'main',
  /** 后台读写的 Markdown 目录，需与 Astro content collection 一致 */
  contentDir: 'src/content/posts',
  /** 图片上传目录（public 下的路径） */
  imageDir: 'public/images/uploads',
  /** 图片在站点中的访问前缀 */
  imageUrlBase: '/images/uploads',
  /** Cloudflare Worker OAuth 代理地址；留空时只能使用 PAT 登录 */
  oauthProxyUrl: (env.PUBLIC_OAUTH_PROXY_URL || '').replace(/\/+$/, ''),
  siteUrl: env.PUBLIC_SITE_URL || 'https://hai1ro.github.io',
} as const;

export const isOAuthConfigured = blogConfig.oauthProxyUrl.length > 0;

export function repoUrl(): string {
  return `https://github.com/${blogConfig.owner}/${blogConfig.repo}`;
}
