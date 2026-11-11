import { useMemo, useState } from 'react';
import { Button, Input, Modal } from '@douyinfe/semi-ui';
import { Icon } from './icons';
import type { PostSummary } from '../data/posts';
import { formatDateShort } from '@/lib/date';

type Filter = 'all' | 'published' | 'draft';

interface Props {
  posts: PostSummary[];
  loading: boolean;
  error: string | null;
  pendingBuildAt: string | null;
  building: boolean;
  onNew: () => void;
  onEdit: (slug: string) => void;
  onRefresh: () => void;
  onBuild: () => void;
  onDelete: (post: PostSummary) => Promise<void>;
  onOpenSidebar: () => void;
  onBackDashboard: () => void;
}

export function PostsPage({
  posts,
  loading,
  error,
  pendingBuildAt,
  building,
  onNew,
  onEdit,
  onRefresh,
  onBuild,
  onDelete,
  onOpenSidebar,
  onBackDashboard,
}: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (filter === 'published' && post.frontmatter.draft) return false;
      if (filter === 'draft' && !post.frontmatter.draft) return false;
      if (!keyword) return true;
      return (
        post.frontmatter.title.toLowerCase().includes(keyword) ||
        post.slug.toLowerCase().includes(keyword) ||
        post.frontmatter.tags.some((tag) => tag.toLowerCase().includes(keyword))
      );
    });
  }, [posts, query, filter]);

  const counts = useMemo(
    () => ({
      all: posts.length,
      published: posts.filter((post) => !post.frontmatter.draft).length,
      draft: posts.filter((post) => post.frontmatter.draft).length,
    }),
    [posts],
  );

  const confirmDelete = (post: PostSummary) => {
    Modal.confirm({
      title: '删除这篇文章？',
      content: `会从 GitHub 仓库删除《${post.frontmatter.title || post.slug}》。删除后需要构建站点才会从网站移除。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { type: 'danger', theme: 'solid' },
      onOk: () => onDelete(post),
    });
  };

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
          <button type="button" className="editor-back" onClick={onBackDashboard}>
            <Icon name="arrow-left" size={16} />
            工作台
          </button>
          <div className="editor-breadcrumb">
            <strong>文章管理</strong>
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
            theme="borderless"
            icon={<Icon name="refresh" size={15} />}
            loading={building}
            onClick={onBuild}
            className={pendingBuildAt ? 'topbar-build has-pending' : 'topbar-build'}
          >
            构建站点
          </Button>
          <Button
            type="primary"
            theme="solid"
            icon={<Icon name="plus" size={15} />}
            onClick={onNew}
          >
            新建文章
          </Button>
        </div>
      </header>

      <div className="admin-page__scroll">
        <div className="admin-page__body">
          {pendingBuildAt && (
            <div className="build-banner">
              <Icon name="alert" size={16} />
              <span>已有修改提交到 GitHub，但还没有构建。连续修改多篇后一次性构建即可。</span>
              <Button size="small" loading={building} onClick={onBuild}>
                构建站点
              </Button>
            </div>
          )}

          <div className="posts-toolbar">
            <div className="posts-toolbar__search">
              <Input
                value={query}
                onChange={setQuery}
                prefix={<Icon name="search" size={15} />}
                placeholder="搜索标题、标签或 slug"
                showClear
              />
            </div>
            <div className="posts-toolbar__filters" role="group" aria-label="筛选文章">
              {(
                [
                  ['all', '全部', counts.all],
                  ['published', '已发布', counts.published],
                  ['draft', '草稿', counts.draft],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  className="chip"
                  data-active={filter === value}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {label}
                  <em>{count}</em>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="dash-error">
              <Icon name="alert" size={18} />
              <span>{error}</span>
              <Button size="small" onClick={onRefresh}>
                重试
              </Button>
            </div>
          )}

          <div className="posts-table-wrap">
            <table className="posts-table">
              <thead>
                <tr>
                  <th>标题</th>
                  <th>状态</th>
                  <th>日期</th>
                  <th>标签</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((post) => (
                  <tr key={post.slug}>
                    <td>
                      <button
                        type="button"
                        className="posts-table__title"
                        onClick={() => onEdit(post.slug)}
                      >
                        {post.frontmatter.title || post.slug}
                      </button>
                      <span className="posts-table__slug">/{post.slug}</span>
                      {post.error && (
                        <span className="posts-table__error" title={post.error}>
                          <Icon name="alert" size={13} />
                          解析失败
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={post.frontmatter.draft ? 'status-tag status-tag--draft' : 'status-tag status-tag--live'}>
                        {post.frontmatter.draft ? '草稿' : '已发布'}
                      </span>
                    </td>
                    <td className="posts-table__date">{formatDateShort(post.frontmatter.date)}</td>
                    <td>
                      <div className="posts-table__tags">
                        {post.frontmatter.tags.slice(0, 3).map((tag) => (
                          <span className="tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                        {post.frontmatter.tags.length === 0 && <span className="muted">—</span>}
                      </div>
                    </td>
                    <td>
                      <div className="posts-table__actions">
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => onEdit(post.slug)}
                        >
                          编辑
                        </button>
                        {!post.frontmatter.draft && (
                          <a
                            className="table-action"
                            href={`/posts/${post.slug}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            查看
                          </a>
                        )}
                        <button
                          type="button"
                          className="table-action table-action--danger"
                          onClick={() => confirmDelete(post)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && filtered.length === 0 && (
              <div className="posts-empty">
                <Icon name="file" size={28} />
                <p>{posts.length === 0 ? '还没有文章。' : '没有匹配的文章。'}</p>
                {posts.length === 0 ? (
                  <Button type="primary" theme="solid" icon={<Icon name="plus" size={15} />} onClick={onNew}>
                    写第一篇
                  </Button>
                ) : (
                  <Button theme="borderless" onClick={() => { setQuery(''); setFilter('all'); }}>
                    清除筛选
                  </Button>
                )}
              </div>
            )}

            {loading && posts.length === 0 && (
              <div className="posts-loading">
                {Array.from({ length: 4 }).map((_, index) => (
                  <span key={index} className="posts-loading__row" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
