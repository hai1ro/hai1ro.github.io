import { Button } from '@douyinfe/semi-ui';
import { Icon } from './icons';
import { useTheme } from '../hooks/useTheme';
import type { AdminSession } from '../auth/AuthContext';
import type { PostSummary } from '../data/posts';
import { formatDateShort } from '@/lib/date';

interface Props {
  session: AdminSession;
  posts: PostSummary[];
  loading: boolean;
  error: string | null;
  onNew: () => void;
  onOpenPost: (slug: string) => void;
  onRefresh: () => void;
  onOpenSidebar: () => void;
}

export function Dashboard({
  session,
  posts,
  loading,
  error,
  onNew,
  onOpenPost,
  onRefresh,
  onOpenSidebar,
}: Props) {
  const { theme, toggle } = useTheme();
  const published = posts.filter((post) => !post.frontmatter.draft).length;
  const drafts = posts.filter((post) => post.frontmatter.draft).length;
  const recent = posts.slice(0, 5);
  const repo = `${session.repo.full_name}`;

  return (
    <div className="dashboard-shell">
      <header className="editor-topbar">
        <div className="editor-topbar__left">
          <button
            type="button"
            className="icon-btn editor-menu-btn"
            onClick={onOpenSidebar}
            aria-label="打开文章列表"
          >
            <Icon name="menu" size={18} />
          </button>
          <div className="editor-breadcrumb">
            <strong>工作台</strong>
          </div>
          <span className="save-state">
            <span className="save-state__dot" />
            已连接 GitHub
          </span>
        </div>
        <div className="editor-topbar__actions">
          <a className="topbar-site-link" href="/" target="_blank" rel="noopener noreferrer">
            <Icon name="external" size={15} />
            打开站点
          </a>
          <button
            type="button"
            className="icon-btn"
            onClick={toggle}
            aria-label="切换深浅色"
            title="切换深浅色"
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
          </button>
        </div>
      </header>

      <div className="dashboard-scroll">
        <div className="dashboard">
          <section className="dash-hero">
            <div>
              <p className="eyebrow">Workspace</p>
              <h1>
                欢迎回来，{session.user.name || session.user.login}
              </h1>
              <p className="dash-hero__lede">
                文章保存在仓库的 <code>src/content/posts</code> 中。每次保存都会生成一次
                commit，GitHub Actions 随后会把站点重新构建到 Pages。
              </p>
            </div>
            <Button
              type="primary"
              theme="solid"
              size="large"
              icon={<Icon name="plus" size={17} />}
              onClick={onNew}
            >
              写一篇新文章
            </Button>
          </section>

          <section className="dash-stats" aria-label="文章统计">
            <div className="dash-stat">
              <span>全部文章</span>
              <strong>{posts.length}</strong>
              <em>篇</em>
            </div>
            <div className="dash-stat">
              <span>已发布</span>
              <strong>{published}</strong>
              <em>篇</em>
            </div>
            <div className="dash-stat">
              <span>草稿</span>
              <strong>{drafts}</strong>
              <em>篇</em>
            </div>
            <div className="dash-stat dash-stat--repo">
              <span>当前仓库</span>
              <strong>{repo}</strong>
              <a
                href={session.repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="打开 GitHub 仓库"
              >
                <Icon name="github" size={16} />
              </a>
            </div>
          </section>

          {error && (
            <div className="dash-error">
              <Icon name="alert" size={18} />
              <span>{error}</span>
              <Button size="small" onClick={onRefresh}>
                重试
              </Button>
            </div>
          )}

          <div className="dash-grid">
            <section className="dash-card">
              <header className="dash-card__head">
                <h2>最近更新</h2>
                <button type="button" className="dash-refresh" onClick={onRefresh} disabled={loading}>
                  <Icon name="refresh" size={14} />
                  {loading ? '同步中…' : '刷新'}
                </button>
              </header>

              {loading && posts.length === 0 ? (
                <div className="dash-loading">
                  <span className="dash-skeleton" />
                  <span className="dash-skeleton" />
                  <span className="dash-skeleton" />
                </div>
              ) : recent.length === 0 ? (
                <div className="dash-empty">
                  <p>仓库里还没有文章。</p>
                  <Button theme="borderless" onClick={onNew}>
                    写第一篇
                  </Button>
                </div>
              ) : (
                <div className="dash-posts">
                  {recent.map((post) => (
                    <button
                      type="button"
                      className="dash-post"
                      key={post.slug}
                      onClick={() => onOpenPost(post.slug)}
                    >
                      <span className="dash-post__date">
                        {formatDateShort(post.frontmatter.date)}
                      </span>
                      <span className="dash-post__body">
                        <span className="dash-post__title">
                          {post.frontmatter.title}
                          {post.frontmatter.draft && <span className="draft-badge">草稿</span>}
                        </span>
                        <span className="dash-post__meta">
                          {post.frontmatter.tags.length > 0
                            ? post.frontmatter.tags.slice(0, 3).join(' · ')
                            : '无标签'}
                        </span>
                      </span>
                      <Icon name="chevron-down" size={15} className="dash-post__arrow" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <aside className="dash-side">
              <section className="dash-card">
                <h2>连接信息</h2>
                <dl className="dash-meta">
                  <div>
                    <dt>账号</dt>
                    <dd>@{session.user.login}</dd>
                  </div>
                  <div>
                    <dt>仓库</dt>
                    <dd>{repo}</dd>
                  </div>
                  <div>
                    <dt>分支</dt>
                    <dd>{session.repo.default_branch}</dd>
                  </div>
                  <div>
                    <dt>登录方式</dt>
                    <dd>{session.mode === 'oauth' ? 'GitHub OAuth' : '访问令牌'}</dd>
                  </div>
                </dl>
              </section>

              <section className="dash-card">
                <h2>写作提示</h2>
                <ul className="dash-tips">
                  <li>
                    在空行输入 <kbd>/</kbd> 唤起块菜单
                  </li>
                  <li>
                    选中文字出现格式工具栏
                  </li>
                  <li>
                    <kbd>⌘</kbd> + <kbd>S</kbd> 快速保存
                  </li>
                  <li>图片会直接上传到仓库的 public 目录</li>
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
