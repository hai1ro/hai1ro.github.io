import { useCallback, useEffect, useMemo, useState } from 'react';
import { Input, Modal, Spin, Toast } from '@douyinfe/semi-ui';
import { useAuth } from '../auth/AuthContext';
import { GitHubError } from '../github/client';
import { listPosts, loadDocument, type PostDocument, type PostSummary } from '../data/posts';
import { Dashboard } from './Dashboard';
import { EditorView } from './EditorView';
import { Icon } from './icons';
import { suggestedSlug, uniqueSlug } from '@/lib/slug';
import { formatDateShort } from '@/lib/date';

type Selection =
  | { type: 'none' }
  | { type: 'new' }
  | { type: 'post'; slug: string };

type PostFilter = 'all' | 'published' | 'draft';

function selectionFromHash(): Selection {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (hash === 'new') return { type: 'new' };
  if (hash.startsWith('post/')) {
    const slug = decodeURIComponent(hash.slice('post/'.length));
    if (slug) return { type: 'post', slug };
  }
  return { type: 'none' };
}

function hashFor(selection: Selection): string {
  if (selection.type === 'new') return '#/new';
  if (selection.type === 'post') return `#/post/${encodeURIComponent(selection.slug)}`;
  return '';
}

export function Workspace() {
  const { client, session, logout } = useAuth();

  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PostFilter>('all');
  const [selection, setSelection] = useState<Selection>(selectionFromHash);
  const [newSlug, setNewSlug] = useState(() => suggestedSlug(''));
  const [doc, setDoc] = useState<PostDocument | null>(null);
  const [docLoading, setDocLoading] = useState(selection.type === 'post');
  const [docError, setDocError] = useState<string | null>(null);
  const [docReload, setDocReload] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const refreshPosts = useCallback(
    async (force = true) => {
      if (!client) return;
      setLoading(true);
      try {
        const data = await listPosts(client, force);
        setPosts(data);
        setListError(null);
      } catch (error) {
        if (error instanceof GitHubError && error.status === 401) {
          Toast.error({ content: 'GitHub 登录已失效，请重新登录。', duration: 4 });
          logout();
          return;
        }
        setListError(error instanceof Error ? error.message : '文章列表加载失败。');
      } finally {
        setLoading(false);
      }
    },
    [client, logout],
  );

  useEffect(() => {
    void refreshPosts(false);
  }, [refreshPosts]);

  useEffect(() => {
    if (!client || selection.type !== 'post') {
      setDoc(null);
      setDocLoading(false);
      setDocError(null);
      return;
    }

    let cancelled = false;
    setDocLoading(true);
    setDocError(null);
    setDoc(null);

    loadDocument(client, selection.slug)
      .then((next) => {
        if (cancelled) return;
        setDoc(next);
        setDocLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof GitHubError && error.status === 401) {
          Toast.error({ content: 'GitHub 登录已失效，请重新登录。', duration: 4 });
          logout();
          return;
        }
        setDocError(error instanceof Error ? error.message : '文章加载失败。');
        setDocLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selection, client, docReload, logout]);

  const applySelection = useCallback(
    (next: Selection) => {
      setSelection(next);
      setSidebarOpen(false);
      if (next.type === 'new') {
        setNewSlug(uniqueSlug(suggestedSlug(''), posts.map((post) => post.slug)));
      }
      const url = `${window.location.pathname}${window.location.search}${hashFor(next)}`;
      window.history.replaceState(null, '', url);
    },
    [posts],
  );

  const navigate = useCallback(
    (next: Selection) => {
      if (
        (next.type === 'none' && selection.type === 'none') ||
        (next.type === 'new' && selection.type === 'new') ||
        (next.type === 'post' &&
          selection.type === 'post' &&
          next.slug === selection.slug)
      ) {
        setSidebarOpen(false);
        return;
      }

      if (dirty) {
        Modal.confirm({
          title: '放弃未保存的修改？',
          content: '切换文章会丢失当前编辑器中尚未提交的内容。',
          okText: '放弃修改',
          cancelText: '继续编辑',
          okButtonProps: { type: 'danger', theme: 'solid' },
          onOk: () => applySelection(next),
        });
        return;
      }
      applySelection(next);
    },
    [applySelection, dirty, selection],
  );

  const handleSaved = useCallback(
    (info: { slug: string; isNew: boolean }) => {
      void refreshPosts(true);
      if (info.isNew) {
        const next: Selection = { type: 'post', slug: info.slug };
        setSelection(next);
        const url = `${window.location.pathname}${window.location.search}${hashFor(next)}`;
        window.history.replaceState(null, '', url);
      }
    },
    [refreshPosts],
  );

  const handleDeleted = useCallback(() => {
    void refreshPosts(true);
    setSelection({ type: 'none' });
    setDirty(false);
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}`,
    );
  }, [refreshPosts]);

  const handleLogout = () => {
    if (dirty) {
      Modal.confirm({
        title: '退出登录？',
        content: '当前还有未保存的修改，退出后会丢失。',
        okText: '退出',
        cancelText: '取消',
        okButtonProps: { type: 'danger', theme: 'solid' },
        onOk: () => {
          logout();
          window.history.replaceState(null, '', window.location.pathname);
        },
      });
      return;
    }
    logout();
    window.history.replaceState(null, '', window.location.pathname);
  };

  const counts = useMemo(
    () => ({
      all: posts.length,
      published: posts.filter((post) => !post.frontmatter.draft).length,
      draft: posts.filter((post) => post.frontmatter.draft).length,
    }),
    [posts],
  );

  const filteredPosts = useMemo(() => {
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

  if (!client || !session) return null;

  const editorSlugs = posts.map((post) => post.slug);

  return (
    <div className="admin-shell">
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="关闭文章列表"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className="admin-sidebar" data-open={sidebarOpen}>
        <div className="admin-brand">
          <a className="admin-brand__mark" href="/" target="_blank" rel="noopener noreferrer">
            H
          </a>
          <div className="admin-brand__text">
            <strong>Hai1ro</strong>
            <span>文章管理</span>
          </div>
          <button
            type="button"
            className="icon-btn sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="关闭侧栏"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <button type="button" className="new-post-btn" onClick={() => navigate({ type: 'new' })}>
          <Icon name="plus" size={17} />
          新建文章
        </button>

        <div className="sidebar-search">
          <Input
            value={query}
            onChange={setQuery}
            prefix={<Icon name="search" size={15} />}
            placeholder="搜索标题、标签或 slug"
            showClear
          />
        </div>

        <div className="sidebar-filters" role="group" aria-label="筛选文章">
          {(
            [
              ['all', '全部', counts.all],
              ['published', '已发布', counts.published],
              ['draft', '草稿', counts.draft],
            ] as const
          ).map(([value, label, count]) => (
            <button
              type="button"
              key={value}
              className="sidebar-filter"
              data-active={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
              <em>{count}</em>
            </button>
          ))}
        </div>

        <div className="sidebar-list-head">
          <span>{loading ? '正在同步…' : `${filteredPosts.length} 篇文章`}</span>
          <button
            type="button"
            className="sidebar-refresh"
            onClick={() => void refreshPosts(true)}
            title="刷新列表"
            disabled={loading}
          >
            <Icon name="refresh" size={14} />
          </button>
        </div>

        <div className="sidebar-posts">
          {loading && posts.length === 0 && (
            <div className="sidebar-skeletons">
              {Array.from({ length: 5 }).map((_, index) => (
                <div className="sidebar-skeleton" key={index} />
              ))}
            </div>
          )}

          {listError && (
            <div className="sidebar-error">
              <Icon name="alert" size={16} />
              <p>{listError}</p>
              <button type="button" onClick={() => void refreshPosts(true)}>
                重试
              </button>
            </div>
          )}

          {!loading && !listError && filteredPosts.length === 0 && (
            <div className="sidebar-empty">
              <p>{posts.length === 0 ? '还没有文章' : '没有匹配的文章'}</p>
              {posts.length === 0 && (
                <button type="button" onClick={() => navigate({ type: 'new' })}>
                  写第一篇
                </button>
              )}
            </div>
          )}

          {filteredPosts.map((post) => (
            <button
              type="button"
              key={post.slug}
              className="sidebar-post"
              data-active={selection.type === 'post' && selection.slug === post.slug}
              onClick={() => navigate({ type: 'post', slug: post.slug })}
            >
              <span className="sidebar-post__title">
                {post.frontmatter.title}
                {post.frontmatter.draft && <span className="sidebar-post__draft">草稿</span>}
                {post.error && (
                  <span className="sidebar-post__error" title={post.error}>
                    <Icon name="alert" size={13} />
                  </span>
                )}
              </span>
              <span className="sidebar-post__meta">
                <span>{formatDateShort(post.frontmatter.date)}</span>
                {post.frontmatter.tags.length > 0 && (
                  <span>{post.frontmatter.tags.slice(0, 2).join(' · ')}</span>
                )}
              </span>
            </button>
          ))}
        </div>

        <footer className="admin-sidebar__footer">
          <img className="sidebar-avatar" src={session.user.avatar_url} alt="" />
          <div className="sidebar-user">
            <strong>{session.user.name || session.user.login}</strong>
            <span>@{session.user.login}</span>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={handleLogout}
            title="退出登录"
            aria-label="退出登录"
          >
            <Icon name="logout" size={16} />
          </button>
        </footer>
      </aside>

      <main className="admin-main-panel">
        {selection.type === 'none' && (
          <Dashboard
            session={session}
            posts={posts}
            loading={loading}
            error={listError}
            onNew={() => navigate({ type: 'new' })}
            onOpenPost={(slug) => navigate({ type: 'post', slug })}
            onRefresh={() => void refreshPosts(true)}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}

        {selection.type === 'new' && (
          <EditorView
            key={`new-${newSlug}`}
            initial={{ mode: 'new', slug: newSlug }}
            client={client}
            existingSlugs={editorSlugs}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
            onDirtyChange={setDirty}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}

        {selection.type === 'post' && docLoading && (
          <div className="admin-loading">
            <button
              type="button"
              className="icon-btn admin-loading__menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="打开文章列表"
            >
              <Icon name="menu" size={18} />
            </button>
            <Spin size="large" />
            <p>正在从 GitHub 读取文章…</p>
          </div>
        )}

        {selection.type === 'post' && !docLoading && docError && (
          <div className="admin-error">
            <button
              type="button"
              className="icon-btn admin-loading__menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="打开文章列表"
            >
              <Icon name="menu" size={18} />
            </button>
            <Icon name="alert" size={28} />
            <h2>文章读取失败</h2>
            <p>{docError}</p>
            <div className="admin-error__actions">
              <button type="button" className="btn-ghost" onClick={() => setDocReload((n) => n + 1)}>
                重试
              </button>
              <button type="button" className="btn-ghost" onClick={() => navigate({ type: 'none' })}>
                返回工作台
              </button>
            </div>
          </div>
        )}

        {selection.type === 'post' && !docLoading && doc && (
          <EditorView
            key={doc.slug}
            initial={{ mode: 'edit', doc }}
            client={client}
            existingSlugs={editorSlugs}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
            onDirtyChange={setDirty}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
      </main>
    </div>
  );
}
