import { useCallback, useEffect, useState } from 'react';
import { Button, Modal, Spin, Toast } from '@douyinfe/semi-ui';
import { useAuth } from '../auth/AuthContext';
import { GitHubError } from '../github/client';
import {
  deleteDocument,
  listPosts,
  loadDocument,
  type PostDocument,
  type PostSummary,
} from '../data/posts';
import {
  clearPendingBuild,
  getLastBuild,
  getPendingBuild,
  markPendingBuild,
} from '../data/build-state';
import { Dashboard } from './Dashboard';
import { EditorView } from './EditorView';
import { NewContentModal } from './NewContentModal';
import { PostsPage } from './PostsPage';
import { ProfileView } from './ProfileView';
import { Icon } from './icons';
import { suggestedSlug, uniqueSlug } from '@/lib/slug';
import type { ContentType } from '@/lib/frontmatter';

type View =
  | { name: 'dashboard' }
  | { name: 'posts' }
  | { name: 'profile' }
  | { name: 'new'; type: ContentType }
  | { name: 'editor'; slug: string };

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Workspace() {
  const { client, session, logout } = useAuth();

  const [view, setView] = useState<View>({ name: 'dashboard' });
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [doc, setDoc] = useState<PostDocument | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [docReload, setDocReload] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newSlug, setNewSlug] = useState(() => suggestedSlug(''));
  const [newContentOpen, setNewContentOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [pendingBuildAt, setPendingBuildAt] = useState<string | null>(() => getPendingBuild());
  const [lastBuildAt, setLastBuildAt] = useState<string | null>(() => getLastBuild());
  const [building, setBuilding] = useState(false);

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
    // 后台始终从工作台开始，不保留旧的 #/post/... 状态
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!client || view.name !== 'editor') {
      setDoc(null);
      setDocLoading(false);
      setDocError(null);
      return;
    }

    let cancelled = false;
    setDocLoading(true);
    setDocError(null);
    setDoc(null);

    loadDocument(client, view.slug)
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
  }, [view, client, docReload, logout]);

  const applyView = useCallback((next: View) => {
    setView(next);
    setSidebarOpen(false);
    if (next.name !== 'editor') {
      setDoc(null);
      setDocError(null);
    }
  }, []);

  const navigate = useCallback(
    (next: View) => {
      if (next.name === view.name) {
        if (next.name !== 'editor' && next.name !== 'new') {
          setSidebarOpen(false);
          return;
        }
        if (next.name === 'editor' && view.name === 'editor' && next.slug === view.slug) {
          setSidebarOpen(false);
          return;
        }
        if (next.name === 'new' && view.name === 'new' && next.type === view.type) {
          setSidebarOpen(false);
          return;
        }
      }

      if (dirty) {
        Modal.confirm({
          title: '放弃未保存的修改？',
          content: '切换页面会丢失当前编辑器中尚未提交的内容。',
          okText: '放弃修改',
          cancelText: '继续编辑',
          okButtonProps: { type: 'danger', theme: 'solid' },
          onOk: () => applyView(next),
        });
        return;
      }
      applyView(next);
    },
    [applyView, dirty, view],
  );

  const openNew = useCallback(() => {
    setNewContentOpen(true);
  }, []);

  const createNew = useCallback(
    (type: ContentType) => {
      setNewContentOpen(false);
      setNewSlug(uniqueSlug(suggestedSlug(''), posts.map((post) => post.slug)));
      setEditorKey((key) => key + 1);
      navigate({ name: 'new', type });
    },
    [navigate, posts],
  );

  const openEditor = useCallback(
    (slug: string) => {
      setEditorKey((key) => key + 1);
      navigate({ name: 'editor', slug });
    },
    [navigate],
  );

  const markPending = useCallback(() => {
    setPendingBuildAt(markPendingBuild());
  }, []);

  const handleSaved = useCallback(() => {
    void refreshPosts(true);
    markPending();
  }, [markPending, refreshPosts]);

  const handleProfileSaved = useCallback(() => {
    markPending();
  }, [markPending]);

  const handleDeleted = useCallback(() => {
    void refreshPosts(true);
    markPending();
    setView({ name: 'posts' });
    setDirty(false);
  }, [markPending, refreshPosts]);

  const handleDeleteFromList = useCallback(
    async (post: PostSummary) => {
      if (!client) return;
      try {
        await deleteDocument(client, {
          path: post.path,
          sha: post.sha,
          title: post.frontmatter.title || post.slug,
        });
        markPending();
        await refreshPosts(true);
        Toast.success({
          content: '已删除并提交。点击「构建站点」后从网站移除。',
          duration: 4,
        });
      } catch (error) {
        Toast.error({
          content: error instanceof Error ? error.message : '删除失败',
          duration: 6,
        });
      }
    },
    [client, markPending, refreshPosts],
  );

  const handleBuild = useCallback(() => {
    if (!client || building) return;

    const doBuild = async () => {
      setBuilding(true);
      try {
        await client.dispatchBlogPublish();
        const now = clearPendingBuild();
        setPendingBuildAt(null);
        setLastBuildAt(now);
        Toast.success({
          content: '已触发 GitHub Pages 构建，大约 1–2 分钟后生效。',
          duration: 4,
        });
      } catch (error) {
        Toast.error({
          content:
            error instanceof Error
              ? `触发构建失败：${error.message}`
              : '触发构建失败，请到 Actions 页面手动运行。',
          duration: 7,
        });
      } finally {
        setBuilding(false);
      }
    };

    if (dirty) {
      Modal.confirm({
        title: '当前有未保存的修改',
        content: '构建只包含已经提交到 GitHub 的内容，当前未保存的修改不会被发布。建议先保存再构建。',
        okText: '仍然构建',
        cancelText: '先去保存',
        onOk: doBuild,
      });
      return;
    }

    Modal.confirm({
      title: '构建站点？',
      content: pendingBuildAt
        ? '会把当前仓库里所有已提交的修改一次性发布；大约需要 1–2 分钟。'
        : '当前没有本地记录的待构建修改，仍会重新构建并发布仓库当前内容。',
      okText: '开始构建',
      cancelText: '取消',
      onOk: doBuild,
    });
  }, [building, client, dirty, pendingBuildAt]);

  const handleLogout = () => {
    if (dirty) {
      Modal.confirm({
        title: '退出登录？',
        content: '当前还有未保存的修改，退出后会丢失。',
        okText: '退出',
        cancelText: '取消',
        okButtonProps: { type: 'danger', theme: 'solid' },
        onOk: logout,
      });
      return;
    }
    logout();
  };

  if (!client || !session) return null;

  const editorSlugs = posts.map((post) => post.slug);
  const activeSection =
    view.name === 'dashboard'
      ? 'dashboard'
      : view.name === 'profile'
        ? 'profile'
        : 'posts';

  return (
    <div className="admin-shell">
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="关闭侧栏"
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
            <span>内容管理</span>
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

        <Button
          type="primary"
          theme="solid"
          size="large"
          block
          icon={<Icon name="plus" size={16} />}
          onClick={openNew}
          className="sidebar-new-btn"
        >
          新建内容
        </Button>

        <nav className="sidebar-nav" aria-label="后台导航">
          <button
            type="button"
            className="sidebar-nav__item"
            data-active={activeSection === 'dashboard'}
            onClick={() => navigate({ name: 'dashboard' })}
          >
            <Icon name="dashboard" size={16} />
            工作台
          </button>
          <button
            type="button"
            className="sidebar-nav__item"
            data-active={activeSection === 'posts'}
            onClick={() => navigate({ name: 'posts' })}
          >
            <Icon name="file" size={16} />
            内容管理
          </button>
          <button
            type="button"
            className="sidebar-nav__item"
            data-active={activeSection === 'profile'}
            onClick={() => navigate({ name: 'profile' })}
          >
            <Icon name="user" size={16} />
            个人资料
          </button>
        </nav>

        <div className="sidebar-build">
          <div className="sidebar-build__head">
            <span>站点构建</span>
            {pendingBuildAt && <em>待构建</em>}
          </div>
          <p className="sidebar-build__state">
            {building
              ? '正在触发构建…'
              : pendingBuildAt
                ? '有修改尚未构建'
                : lastBuildAt
                  ? `上次构建 ${formatClock(lastBuildAt)}`
                  : '尚未构建'}
          </p>
          <Button
            type="primary"
            theme="solid"
            block
            loading={building}
            icon={<Icon name="refresh" size={15} />}
            onClick={handleBuild}
          >
            构建站点
          </Button>
          <a
            className="sidebar-build__link"
            href={`https://github.com/${session.repo.full_name}/actions`}
            target="_blank"
            rel="noopener noreferrer"
          >
            查看 Actions
          </a>
        </div>

        <div className="admin-sidebar__spacer" />

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
        {view.name === 'dashboard' && (
          <Dashboard
            session={session}
            posts={posts}
            loading={loading}
            error={listError}
            pendingBuildAt={pendingBuildAt}
            building={building}
            onOpenPosts={() => navigate({ name: 'posts' })}
            onNew={openNew}
            onEdit={openEditor}
            onBuild={handleBuild}
            onRefresh={() => void refreshPosts(true)}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}

        {view.name === 'posts' && (
          <PostsPage
            posts={posts}
            loading={loading}
            error={listError}
            pendingBuildAt={pendingBuildAt}
            building={building}
            onNew={openNew}
            onEdit={openEditor}
            onRefresh={() => void refreshPosts(true)}
            onBuild={handleBuild}
            onDelete={handleDeleteFromList}
            onOpenSidebar={() => setSidebarOpen(true)}
            onBackDashboard={() => navigate({ name: 'dashboard' })}
          />
        )}

        {view.name === 'profile' && (
          <ProfileView
            client={client}
            pendingBuildAt={pendingBuildAt}
            building={building}
            onBuild={handleBuild}
            onSaved={handleProfileSaved}
            onDirtyChange={setDirty}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}

        {view.name === 'new' && (
          <EditorView
            key={`new-${editorKey}`}
            initial={{ mode: 'new', slug: newSlug, type: view.type }}
            client={client}
            existingSlugs={editorSlugs}
            pendingBuildAt={pendingBuildAt}
            building={building}
            onBuild={handleBuild}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
            onDirtyChange={setDirty}
            onOpenSidebar={() => setSidebarOpen(true)}
            onBack={() => navigate({ name: 'posts' })}
          />
        )}

        {view.name === 'editor' && docLoading && (
          <div className="admin-loading">
            <button
              type="button"
              className="icon-btn admin-loading__menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="打开菜单"
            >
              <Icon name="menu" size={18} />
            </button>
            <Spin size="large" />
            <p>正在从 GitHub 读取内容…</p>
          </div>
        )}

        {view.name === 'editor' && !docLoading && docError && (
          <div className="admin-error">
            <button
              type="button"
              className="icon-btn admin-loading__menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="打开菜单"
            >
              <Icon name="menu" size={18} />
            </button>
            <Icon name="alert" size={28} />
            <h2>内容读取失败</h2>
            <p>{docError}</p>
            <div className="admin-error__actions">
              <Button onClick={() => setDocReload((value) => value + 1)}>重试</Button>
              <Button theme="borderless" onClick={() => navigate({ name: 'posts' })}>
                返回内容管理
              </Button>
            </div>
          </div>
        )}

        {view.name === 'editor' && !docLoading && doc && (
          <EditorView
            key={`editor-${editorKey}`}
            initial={{ mode: 'edit', doc }}
            client={client}
            existingSlugs={editorSlugs}
            pendingBuildAt={pendingBuildAt}
            building={building}
            onBuild={handleBuild}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
            onDirtyChange={setDirty}
            onOpenSidebar={() => setSidebarOpen(true)}
            onBack={() => navigate({ name: 'posts' })}
          />
        )}
      </main>

      <NewContentModal
        visible={newContentOpen}
        onCancel={() => setNewContentOpen(false)}
        onPick={createNew}
      />
    </div>
  );
}
