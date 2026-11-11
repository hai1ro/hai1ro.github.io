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
  pendingBuildAt: string | null;
  building: boolean;
  onOpenPosts: () => void;
  onNew: () => void;
  onEdit: (slug: string) => void;
  onBuild: () => void;
  onRefresh: () => void;
  onOpenSidebar: () => void;
}

export function Dashboard({
  session,
  posts,
  loading,
  error,
  pendingBuildAt,
  building,
  onOpenPosts,
  onNew,
  onEdit,
  onBuild,
  onRefresh,
  onOpenSidebar,
}: Props) {
  const { theme, toggle } = useTheme();
  const published = posts.filter((post) => !post.frontmatter.draft).length;
  const drafts = posts.filter((post) => post.frontmatter.draft).length;
  const recent = posts.slice(0, 5);
  const repo = session.repo.full_name;

  return (
    <div className="admin-page">
      <header className="editor-topbar">
        <div className="editor-topbar__left">
          <button
            type="button"
            className="icon-btn editor-menu-btn"
            onClick={onOpenSidebar}
            aria-label="打开菜单"
          >
            <Icon name="menu" size={18} />
          </button>
          <div className="editor-breadcrumb">
            <strong>工作台</strong>
          </div>
          <span className={`save-state ${pendingBuildAt ? 'is-dirty' : ''}`}>
            <span className="save-state__dot" />
            {pendingBuildAt ? '有修改未构建' : '已与仓库同步'}
          </span>
        </div>
        <div className="editor-topbar__actions">
          <Button
            theme="borderless"
            icon={<Icon name="refresh" size={15} />}
            onClick={onRefresh}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            type="primary"
            theme="solid"
            icon={<Icon name="plus" size={15} />}
            onClick={onNew}
          >
            新建文章
          </Button>
          <a className="icon-btn" href="/" target="_blank" rel="noopener noreferrer" title="查看站点">
            <Icon name="external" size={17} />
          </a>
          <button type="button" className="icon-btn" onClick={toggle} title="切换深浅色">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
          </button>
        </div>
      </header>

      <div className="admin-page__scroll">
        <div className="admin-page__body">
          <section className="dashboard-head">
            <div>
              <h1>工作台</h1>
              <p>
                当前仓库 <code>{repo}</code>，分支 <code>{session.repo.default_branch}</code>。
                保存文章只提交，构建站点后才会更新网站。
              </p>
            </div>
            <div className="dashboard-head__actions">
              <Button icon={<Icon name="file" size={15} />} onClick={onOpenPosts}>
                文章管理
              </Button>
              <Button
                type="primary"
                theme="solid"
                icon={<Icon name="refresh" size={15} />}
                loading={building}
                onClick={onBuild}
              >
                构建站点
              </Button>
            </div>
          </section>

          {pendingBuildAt && (
            <div className="build-banner">
              <Icon name="alert" size={16} />
              <span>已有修改提交到 GitHub，但还没有构建。可以继续修改多篇文章，再统一构建。</span>
              <Button size="small" loading={building} onClick={onBuild}>
                立即构建
              </Button>
            </div>
          )}

          {error && (
            <div className="dash-error">
              <Icon name="alert" size={18} />
              <span>{error}</span>
              <Button size="small" onClick={onRefresh}>
                重试
              </Button>
            </div>
          )}

          <section className="dashboard-stats" aria-label="文章统计">
            <button type="button" className="dashboard-stat" onClick={onOpenPosts}>
              <span>全部文章</span>
              <strong>{posts.length}</strong>
            </button>
            <button type="button" className="dashboard-stat" onClick={onOpenPosts}>
              <span>已发布</span>
              <strong>{published}</strong>
            </button>
            <button type="button" className="dashboard-stat" onClick={onOpenPosts}>
              <span>草稿</span>
              <strong>{drafts}</strong>
            </button>
            <div className="dashboard-stat dashboard-stat--repo">
              <span>仓库</span>
              <strong>{repo}</strong>
              <a href={session.repo.html_url} target="_blank" rel="noopener noreferrer" title="打开 GitHub 仓库">
                <Icon name="github" size={16} />
              </a>
            </div>
          </section>

          <div className="dashboard-grid">
            <section className="admin-card">
              <header className="admin-card__head">
                <h2>最近文章</h2>
                <button type="button" className="text-action" onClick={onOpenPosts}>
                  查看全部
                </button>
              </header>

              {loading && posts.length === 0 ? (
                <div className="posts-loading">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <span key={index} className="posts-loading__row" />
                  ))}
                </div>
              ) : recent.length === 0 ? (
                <div className="admin-card__empty">
                  <p>还没有文章。</p>
                  <Button theme="borderless" onClick={onNew}>
                    写第一篇
                  </Button>
                </div>
              ) : (
                <div className="recent-posts">
                  {recent.map((post) => (
                    <button
                      type="button"
                      className="recent-post"
                      key={post.slug}
                      onClick={() => onEdit(post.slug)}
                    >
                      <span className="recent-post__date">
                        {formatDateShort(post.frontmatter.date)}
                      </span>
                      <span className="recent-post__main">
                        <span className="recent-post__title">
                          {post.frontmatter.title}
                          {post.frontmatter.draft && <span className="draft-badge">草稿</span>}
                        </span>
                        <span className="recent-post__meta">
                          {post.frontmatter.tags.length
                            ? post.frontmatter.tags.slice(0, 3).join(' · ')
                            : '无标签'}
                        </span>
                      </span>
                      <Icon name="chevron-down" size={15} className="recent-post__arrow" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <aside className="dashboard-side">
              <section className="admin-card">
                <h2>站点构建</h2>
                <dl className="admin-meta">
                  <div>
                    <dt>状态</dt>
                    <dd>{pendingBuildAt ? '有待构建的修改' : '已同步'}</dd>
                  </div>
                  <div>
                    <dt>触发方式</dt>
                    <dd>手动构建</dd>
                  </div>
                  <div>
                    <dt>登录方式</dt>
                    <dd>{session.mode === 'oauth' ? 'GitHub OAuth' : '访问令牌'}</dd>
                  </div>
                </dl>
                <Button
                  type="primary"
                  theme="solid"
                  block
                  loading={building}
                  onClick={onBuild}
                  style={{ marginTop: 16 }}
                >
                  构建站点
                </Button>
                <a
                  className="admin-card__link"
                  href={`https://github.com/${repo}/actions`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看 Actions
                </a>
              </section>

              <section className="admin-card">
                <h2>写作说明</h2>
                <ul className="admin-tips">
                  <li>Typora 风格单栏编辑器，非当前行隐藏 Markdown 标记</li>
                  <li>工具栏可以插入标题、列表、表格、代码块、链接和图片</li>
                  <li>保存文章只提交到 GitHub，不会自动构建</li>
                  <li>修改多篇文章后，在「构建站点」统一发布一次</li>
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
