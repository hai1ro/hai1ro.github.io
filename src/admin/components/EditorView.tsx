import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Modal, Toast } from '@douyinfe/semi-ui';
import { EditorContent } from '@tiptap/react';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import { useBlogEditor } from '../editor/useBlogEditor';
import { SlashMenu } from '../editor/SlashMenu';
import { EditorToolbar } from '../editor/EditorToolbar';
import { EditorBubbleMenu } from '../editor/EditorBubbleMenu';
import { MetaBar } from './MetaBar';
import { SettingsPanel } from './SettingsPanel';
import { PreviewSheet } from './PreviewSheet';
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
import { htmlToMarkdown, markdownToHtml, normalizeMarkdown } from '@/lib/markdown';
import { countText, deriveDescription } from '@/lib/text';
import { isValidSlug, suggestedSlug, uniqueSlug } from '@/lib/slug';
import { todayISO } from '@/lib/date';
import { useTheme } from '../hooks/useTheme';

type EditorInitial =
  | { mode: 'new'; slug: string }
  | { mode: 'edit'; doc: PostDocument };

interface Props {
  initial: EditorInitial;
  client: GitHubClient;
  existingSlugs: string[];
  onSaved: (info: { slug: string; isNew: boolean; title: string }) => void;
  onDeleted: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onOpenSidebar: () => void;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function EditorView({
  initial,
  client,
  existingSlugs,
  onSaved,
  onDeleted,
  onDirtyChange,
  onOpenSidebar,
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
  const [mode, setMode] = useState<'rich' | 'source'>('rich');
  const [sourceValue, setSourceValue] = useState(editingDoc?.body ?? '');
  const [settingsOpen, setSettingsOpen] = useState(initial.mode === 'new');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [inlineUploading, setInlineUploading] = useState(false);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const inlineImageRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const { theme, toggle: toggleTheme } = useTheme();

  const markDirty = useCallback(() => setDirty(true), []);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const handleImageUpload = useCallback(
    async (file: File) => {
      setInlineUploading(true);
      try {
        const image = await uploadImage(client, file);
        Toast.success({ content: '图片已上传到仓库', duration: 2 });
        return image.url;
      } finally {
        setInlineUploading(false);
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

  const editor = useBlogEditor({
    initialMarkdown: editingDoc?.body ?? '',
    onImageUpload: handleImageUpload,
    onImageError: handleImageError,
  });

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => markDirty();
    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
    };
  }, [editor, markDirty]);

  useEffect(() => {
    const element = titleRef.current;
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${element.scrollHeight}px`;
  }, [frontmatter.title]);

  useEffect(() => {
    if (mode !== 'source') return;
    const element = sourceRef.current;
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${element.scrollHeight}px`;
  }, [mode, sourceValue]);

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

  const switchMode = (next: 'rich' | 'source') => {
    if (next === mode) return;
    if (next === 'source') {
      setSourceValue(htmlToMarkdown(editor?.getHTML() ?? ''));
      setMode('source');
      return;
    }
    editor?.commands.setContent(markdownToHtml(sourceValue), { emitUpdate: false });
    setMode('rich');
    window.requestAnimationFrame(() => editor?.commands.focus());
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
      const markdown =
        mode === 'source'
          ? normalizeMarkdown(sourceValue)
          : htmlToMarkdown(editor?.getHTML() ?? '');

      const result = await saveDocument(client, {
        slug,
        frontmatter,
        body: markdown,
        extra,
        sha,
        isNew,
      });

      setSha(result.sha);
      setFrontmatter(result.frontmatter);
      setIsNew(false);
      setDirty(false);
      setLastSavedAt(new Date());
      if (mode === 'source') setSourceValue(markdown);

      if (result.frontmatter.draft) {
        Toast.success({
          content: '草稿已保存到 GitHub，不会触发 Pages 构建。',
          duration: 3,
        });
      } else if (result.dispatchError) {
        Toast.warning({
          content: `已保存到 GitHub，但触发构建失败：${result.dispatchError} 请到 Actions 手动运行 Deploy to GitHub Pages。`,
          duration: 8,
        });
      } else {
        Toast.success({
          content: wasNew
            ? '文章已发布，已触发 GitHub Pages 构建。'
            : '修改已发布，已触发 GitHub Pages 构建。',
          duration: 3,
        });
      }

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
    client,
    editor,
    existingSlugs,
    extra,
    frontmatter,
    isNew,
    mode,
    onSaved,
    sha,
    slug,
    sourceValue,
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
      Toast.success({ content: '封面已上传', duration: 2 });
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
      const url = await handleImageUpload(file);
      editor?.chain().focus().setImage({ src: url }).run();
    } catch (error) {
      handleImageError(error);
    }
  };

  const openPreview = () => {
    const html = mode === 'source' ? markdownToHtml(sourceValue) : (editor?.getHTML() ?? '');
    setPreviewHtml(html);
    setPreviewOpen(true);
  };

  const handleDelete = () => {
    if (isNew || !sha) return;
    Modal.confirm({
      title: '删除这篇文章？',
      content: `《${frontmatter.title || slug}》的 Markdown 文件会从 GitHub 仓库中删除，无法撤销。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { type: 'danger', theme: 'solid' },
      onOk: async () => {
        try {
          const result = await deleteDocument(client, {
            path: postPath(slug),
            sha,
            title: frontmatter.title || slug,
            published: !frontmatter.draft,
          });

          if (result.dispatchError) {
            Toast.warning({
              content: `文章已删除，但触发构建失败：${result.dispatchError} 请到 Actions 手动运行部署。`,
              duration: 8,
            });
          } else if (frontmatter.draft) {
            Toast.success({ content: '草稿已删除，不会触发 Pages 构建。', duration: 3 });
          } else {
            Toast.success({ content: '文章已删除，已触发 GitHub Pages 构建。', duration: 3 });
          }
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

  const stats = countText(mode === 'source' ? sourceValue : (editor?.getText() ?? ''));
  const statusText = saving
    ? '正在提交…'
    : dirty
      ? '有未保存的修改'
      : lastSavedAt
        ? `已保存 ${formatClock(lastSavedAt)}`
        : isNew
          ? '尚未保存'
          : '已从 GitHub 加载';
  const saveLabel = frontmatter.draft
    ? '保存草稿'
    : isNew
      ? '发布文章'
      : '发布更新';
  const targetUrl = `/posts/${slug}/`;

  return (
    <div className="editor-shell">
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
          <div className="mode-switch" role="group" aria-label="编辑模式">
            <button
              type="button"
              data-active={mode === 'rich'}
              onClick={() => switchMode('rich')}
            >
              富文本
            </button>
            <button
              type="button"
              data-active={mode === 'source'}
              onClick={() => switchMode('source')}
            >
              Markdown
            </button>
          </div>

          <Button
            theme="borderless"
            icon={<Icon name="eye" size={16} />}
            onClick={openPreview}
            className="topbar-preview"
          >
            预览
          </Button>

          <Button
            type="primary"
            theme="solid"
            icon={<Icon name="send" size={15} />}
            loading={saving}
            disabled={mode === 'rich' && !editor}
            onClick={handleSave}
            className="topbar-save"
          >
            {saveLabel}
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

      {mode === 'rich' && editor && <EditorToolbar editor={editor} onPickImage={() => inlineImageRef.current?.click()} />}

      <div className="editor-scroll">
        <div className="editor-canvas">
          <div className="editor-kicker">
            <span>{isNew ? 'NEW POST' : 'EDIT POST'}</span>
            <span className="editor-kicker__line" />
            <span>{dirty ? '未提交' : '已同步到 GitHub'}</span>
            {inlineUploading && <span className="editor-kicker__uploading">图片上传中…</span>}
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
                editor?.commands.focus('start');
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
                const text = mode === 'source' ? sourceValue : (editor?.getText() ?? '');
                patchFrontmatter({ description: deriveDescription(text) });
              }}
              onDelete={handleDelete}
              canDelete={!isNew}
            />
          )}

          {mode === 'rich' ? (
            <div className="editor-body">
              {editor ? (
                <>
                  <EditorContent editor={editor} />
                  <EditorBubbleMenu editor={editor} />
                  <SlashMenu editor={editor} onPickImage={() => inlineImageRef.current?.click()} />
                  <DragHandle editor={editor} className="drag-handle" nested>
                    <span className="drag-handle__inner" title="拖动排序">
                      <Icon name="grip" size={16} />
                    </span>
                  </DragHandle>
                </>
              ) : (
                <div className="editor-loading">正在准备编辑器…</div>
              )}
            </div>
          ) : (
            <div className="editor-source">
              <div className="editor-source__hint">
                直接编辑 Markdown 正文（frontmatter 由上方属性面板管理）。
                切换回富文本时，不支持的 HTML 片段可能会被丢弃。
              </div>
              <textarea
                ref={sourceRef}
                className="editor-source__textarea"
                value={sourceValue}
                spellCheck={false}
                onChange={(event) => {
                  setSourceValue(event.target.value);
                  markDirty();
                }}
              />
            </div>
          )}

          <footer className="editor-footer">
            <span>
              {stats.chars} 字 · 约 {stats.minutes} 分钟阅读
            </span>
            <span className="editor-footer__path">/posts/{slug}/</span>
            {isNew ? (
              <span>保存后可在 GitHub 查看</span>
            ) : (
              <a
                href={githubFileUrl(client, postPath(slug))}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="github" size={14} />
                在 GitHub 查看
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

      <PreviewSheet
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        html={previewHtml}
        frontmatter={frontmatter}
        slug={slug}
        cover={frontmatter.cover}
      />
    </div>
  );
}
