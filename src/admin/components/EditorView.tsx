import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Modal, Toast } from '@douyinfe/semi-ui';
import { MarkdownEditor, type MarkdownEditorHandle } from '../editor/MarkdownEditor';
import { MarkdownPreview } from '../editor/MarkdownPreview';
import { MarkdownToolbar } from '../editor/MarkdownToolbar';
import { MetaBar } from './MetaBar';
import { SettingsPanel } from './SettingsPanel';
import { Icon } from './icons';
import type { GitHubClient } from '../github/client';
import {
  deleteDocument,
  githubFileUrl,
  postPath,
  saveDocument,
  uploadImage,
  type PostDocument,
} from '../data/posts';
import { emptyFrontmatter, type PostFrontmatter } from '@/lib/frontmatter';
import { countText, deriveDescription } from '@/lib/text';
import { isValidSlug, suggestedSlug, uniqueSlug } from '@/lib/slug';
import { todayISO } from '@/lib/date';
import { useTheme } from '../hooks/useTheme';

type EditorInitial =
  | { mode: 'new'; slug: string }
  | { mode: 'edit'; doc: PostDocument };

type ViewMode = 'edit' | 'split' | 'preview';

interface Props {
  initial: EditorInitial;
  client: GitHubClient;
  existingSlugs: string[];
  pendingBuildAt: string | null;
  building: boolean;
  onBuild: () => void;
  onSaved: (info: { slug: string; isNew: boolean; title: string }) => void;
  onDeleted: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onOpenSidebar: () => void;
  onBack: () => void;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function EditorView({
  initial,
  client,
  existingSlugs,
  pendingBuildAt,
  building,
  onBuild,
  onSaved,
  onDeleted,
  onDirtyChange,
  onOpenSidebar,
  onBack,
}: Props) {
  const editingDoc = initial.mode === 'edit' ? initial.doc : null;

  const [frontmatter, setFrontmatter] = useState<PostFrontmatter>(
    editingDoc?.frontmatter ?? {
      ...emptyFrontmatter(),
      title: '',
      date: todayISO(),
      draft: true,
    },
  );
  const [extra] = useState<Record<string, unknown>>(editingDoc?.extra ?? {});
  const [slug, setSlug] = useState(
    editingDoc ? editingDoc.slug : initial.mode === 'new' ? initial.slug : '',
  );
  const [slugTouched, setSlugTouched] = useState(initial.mode === 'edit');
  const [sha, setSha] = useState<string | undefined>(editingDoc?.sha);
  const [isNew, setIsNew] = useState(initial.mode === 'new');
  const [dirty, setDirty] = useState(initial.mode === 'new');
  const [saving, setSaving] = useState(false);
  const [body, setBody] = useState(editingDoc?.body ?? '');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'edit';
    return window.matchMedia('(min-width: 1100px)').matches ? 'split' : 'edit';
  });
  const [settingsOpen, setSettingsOpen] = useState(initial.mode === 'new');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const inlineImageRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const savingRef = useRef(false);

  const markDirty = useCallback(() => setDirty(true), []);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const handleImageUpload = useCallback(
    async (file: File) => {
      setImageUploading(true);
      try {
        const image = await uploadImage(client, file);
        return image.url;
      } finally {
        setImageUploading(false);
      }
    },
    [client],
  );

  const handleImageError = useCallback((error: unknown) => {
    Toast.error({
      content: error instanceof Error ? error.message : '图片上传失败',
      duration: 5,
    });
  }, []);

  useEffect(() => {
    const element = titleRef.current;
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${element.scrollHeight}px`;
  }, [frontmatter.title]);

  useEffect(() => {
    if (!isNew) return;
    const timer = window.setTimeout(() => titleRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [isNew]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const patchFrontmatter = useCallback(
    (patch: Partial<PostFrontmatter>) => {
      setFrontmatter((previous) => ({ ...previous, ...patch }));
      markDirty();
    },
    [markDirty],
  );

  const changeTitle = (value: string) => {
    setFrontmatter((previous) => ({ ...previous, title: value }));
    if (isNew && !slugTouched) {
      setSlug(uniqueSlug(suggestedSlug(value), existingSlugs));
    }
    markDirty();
  };

  const handleSave = useCallback(async () => {
    if (savingRef.current) return;

    if (!frontmatter.title.trim()) {
      Toast.warning({ content: '请先填写文章标题。', duration: 3 });
      titleRef.current?.focus();
      return;
    }
    if (isNew && !isValidSlug(slug)) {
      Toast.warning({
        content: 'Slug 只能包含小写字母、数字和连字符，且不能以连字符开头或结尾。',
        duration: 4,
      });
      setSettingsOpen(true);
      return;
    }
    if (isNew && existingSlugs.includes(slug)) {
      Toast.warning({ content: '这个 slug 已经被占用了，请换一个。', duration: 4 });
      setSettingsOpen(true);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    const wasNew = isNew;

    try {
      const result = await saveDocument(client, {
        slug,
        frontmatter,
        body,
        extra,
        sha,
        isNew,
      });

      setSha(result.sha);
      setFrontmatter(result.frontmatter);
      setIsNew(false);
      setDirty(false);
      setLastSavedAt(new Date());

      Toast.success({
        content: result.frontmatter.draft
          ? '草稿已保存到 GitHub。需要点击「构建站点」后才会反映到网站。'
          : '已保存到 GitHub。点击「构建站点」后网站才会更新。',
        duration: 4,
      });

      onSaved({ slug, isNew: wasNew, title: result.frontmatter.title });
    } catch (error) {
      Toast.error({
        content: error instanceof Error ? error.message : '保存失败，请稍后重试。',
        duration: 6,
      });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [
    body,
    client,
    existingSlugs,
    extra,
    frontmatter,
    isNew,
    onSaved,
    sha,
    slug,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  const handleCoverUpload = async (file: File) => {
    setCoverUploading(true);
    try {
      const image = await uploadImage(client, file);
      patchFrontmatter({ cover: image.url });
      Toast.success({ content: '封面上传成功，保存后生效。', duration: 3 });
    } catch (error) {
      Toast.error({
        content: error instanceof Error ? error.message : '封面上传失败',
        duration: 5,
      });
    } finally {
      setCoverUploading(false);
    }
  };

  const handleInlineImage = async (file: File) => {
    try {
      const image = await uploadImage(client, file);
      editorRef.current?.insertImage(image.url, file.name.replace(/\.[^.]+$/, ''));
      markDirty();
    } catch (error) {
      handleImageError(error);
    }
  };

  const handleDelete = () => {
    if (isNew || !sha) return;
    Modal.confirm({
      title: '删除这篇文章？',
      content: `《${frontmatter.title || slug}》的 Markdown 文件会从 GitHub 仓库中删除。删除后需要点击「构建站点」才会从网站移除。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { type: 'danger', theme: 'solid' },
      onOk: async () => {
        try {
          await deleteDocument(client, {
            path: postPath(slug),
            sha,
            title: frontmatter.title || slug,
          });
          Toast.success({
            content: '已删除并提交到 GitHub。点击「构建站点」后从网站移除。',
            duration: 4,
          });
          onDeleted();
        } catch (error) {
          Toast.error({
            content: error instanceof Error ? error.message : '删除失败',
            duration: 6,
          });
        }
      },
    });
  };

  const stats = countText(body);
  const statusText = saving
    ? '正在提交…'
    : dirty
      ? '有未保存的修改'
      : pendingBuildAt
        ? '已保存 · 未构建'
        : lastSavedAt
          ? `已保存 ${formatClock(lastSavedAt)}`
          : isNew
            ? '尚未保存'
            : '已从 GitHub 加载';
  const targetUrl = `/posts/${slug}/`;

  return (
    <div className="editor-shell">
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
          <button type="button" className="editor-back" onClick={onBack}>
            <Icon name="arrow-left" size={16} />
            文章管理
          </button>
          <div className="editor-breadcrumb editor-breadcrumb--doc">
            <span>文章</span>
            <span className="editor-breadcrumb__sep">/</span>
            <strong>{frontmatter.title || '无标题'}</strong>
          </div>
          <span className={`save-state ${dirty ? 'is-dirty' : ''}`}>
            <span className="save-state__dot" />
            {statusText}
          </span>
        </div>

        <div className="editor-topbar__actions">
          <div className="mode-switch" role="group" aria-label="编辑视图">
            <button
              type="button"
              data-active={viewMode === 'edit'}
              onClick={() => setViewMode('edit')}
            >
              编辑
            </button>
            <button
              type="button"
              data-active={viewMode === 'split'}
              onClick={() => setViewMode('split')}
            >
              分屏
            </button>
            <button
              type="button"
              data-active={viewMode === 'preview'}
              onClick={() => setViewMode('preview')}
            >
              预览
            </button>
          </div>

          <Button
            theme="borderless"
            icon={<Icon name="refresh" size={15} />}
            loading={building}
            onClick={onBuild}
            className={`topbar-build ${pendingBuildAt ? 'has-pending' : ''}`}
          >
            构建站点
          </Button>

          <Button
            type="primary"
            theme="solid"
            icon={<Icon name="send" size={15} />}
            loading={saving}
            onClick={handleSave}
            className="topbar-save"
          >
            保存
          </Button>

          {!isNew && !frontmatter.draft && (
            <a
              className="icon-btn"
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="在站点中查看"
              title="在站点中查看"
            >
              <Icon name="external" size={17} />
            </a>
          )}

          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            aria-label="切换深浅色"
            title="切换深浅色"
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
          </button>
        </div>
      </header>

      {viewMode !== 'preview' && (
        <MarkdownToolbar
          editorRef={editorRef}
          onPickImage={() => inlineImageRef.current?.click()}
        />
      )}

      <div className="editor-scroll">
        <div className="editor-canvas" data-wide={viewMode === 'split'}>
          <div className="editor-kicker">
            <span>{isNew ? 'NEW POST' : 'EDIT POST'}</span>
            <span className="editor-kicker__line" />
            <span>{dirty ? '未提交' : '已提交到 GitHub'}</span>
            {imageUploading && <span className="editor-kicker__uploading">图片上传中…</span>}
          </div>

          <textarea
            ref={titleRef}
            className="editor-title"
            rows={1}
            value={frontmatter.title}
            placeholder="无标题"
            spellCheck={false}
            onChange={(event) => changeTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                editorRef.current?.focus();
              }
            }}
          />

          <MetaBar
            frontmatter={frontmatter}
            onChange={patchFrontmatter}
            settingsOpen={settingsOpen}
            onToggleSettings={() => setSettingsOpen((open) => !open)}
            slug={slug}
          />

          {settingsOpen && (
            <SettingsPanel
              frontmatter={frontmatter}
              onChange={patchFrontmatter}
              slug={slug}
              onSlugChange={(value) => {
                setSlug(value);
                setSlugTouched(true);
                markDirty();
              }}
              slugLocked={!isNew}
              existingSlugs={existingSlugs}
              coverInputRef={coverInputRef}
              coverUploading={coverUploading}
              onSelectCover={handleCoverUpload}
              onRemoveCover={() => patchFrontmatter({ cover: undefined, coverAlt: undefined })}
              onDeriveDescription={() => {
                patchFrontmatter({ description: deriveDescription(body) });
              }}
              onDelete={handleDelete}
              canDelete={!isNew}
            />
          )}

          <div className="editor-workspace" data-mode={viewMode}>
            <div className="editor-pane" hidden={viewMode === 'preview'}>
              <MarkdownEditor
                ref={editorRef}
                initialValue={body}
                onChange={(value) => {
                  setBody(value);
                  markDirty();
                }}
                onSave={handleSave}
                onImageUpload={handleImageUpload}
                onImageError={handleImageError}
                placeholder="开始写 Markdown…"
              />
            </div>
            <div className="editor-pane editor-pane--preview" hidden={viewMode === 'edit'}>
              <MarkdownPreview markdown={body} />
            </div>
          </div>

          <footer className="editor-footer">
            <span>
              {stats.chars} 字 · 约 {stats.minutes} 分钟阅读
            </span>
            <span className="editor-footer__path">/posts/{slug}/</span>
            <span>保存只提交，点击「构建站点」后才更新网站</span>
            {!isNew && (
              <a
                href={githubFileUrl(client, postPath(slug))}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="github" size={14} />
                GitHub
              </a>
            )}
          </footer>
        </div>
      </div>

      <input
        ref={inlineImageRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleInlineImage(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}
