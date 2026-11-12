import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Input, Spin, TextArea, Toast } from '@douyinfe/semi-ui';
import type { GitHubClient } from '../github/client';
import { GitHubError } from '../github/client';
import { loadProfile, profilePath, saveProfile } from '../data/profile';
import { emptyProfile, stringifyProfileSource, type ProfileData, type ProfileInfo } from '@/lib/profile';
import { useTheme } from '../hooks/useTheme';
import { Icon } from './icons';

interface Props {
  client: GitHubClient;
  pendingBuildAt: string | null;
  building: boolean;
  onBuild: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onOpenSidebar: () => void;
  onSaved: () => void;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function normalizeInfo(info: ProfileInfo): ProfileInfo {
  return {
    label: info.label,
    value: info.value,
    href: info.href,
  };
}

export function ProfileView({
  client,
  pendingBuildAt,
  building,
  onBuild,
  onDirtyChange,
  onOpenSidebar,
  onSaved,
}: Props) {
  const [data, setData] = useState<ProfileData>(emptyProfile());
  const [extra, setExtra] = useState<Record<string, unknown>>({});
  const [sha, setSha] = useState<string | undefined>(undefined);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const { theme, toggle: toggleTheme } = useTheme();

  const markDirty = useCallback(() => setDirty(true), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    loadProfile(client)
      .then((next) => {
        if (cancelled) return;
        setData(next.data);
        setExtra(next.extra);
        setSha(next.sha);
        setIsNew(false);
        setDirty(false);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        if (reason instanceof GitHubError && reason.status === 401) {
          setError('GitHub 登录已失效，请重新登录。');
        } else if (reason instanceof GitHubError && reason.status === 404) {
          setData(emptyProfile());
          setExtra({});
          setSha(undefined);
          setIsNew(true);
          setDirty(true);
          setLoading(false);
          return;
        } else {
          setError(reason instanceof Error ? reason.message : '个人资料加载失败。');
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [client, reload]);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const patch = (next: Partial<ProfileData>) => {
    setData((previous) => ({ ...previous, ...next }));
    markDirty();
  };

  const patchInfo = (index: number, next: Partial<ProfileInfo>) => {
    setData((previous) => {
      const infos = previous.infos.map((info, current) =>
        current === index ? normalizeInfo({ ...info, ...next }) : info,
      );
      return { ...previous, infos };
    });
    markDirty();
  };

  const addInfo = () => {
    setData((previous) => ({
      ...previous,
      infos: [...previous.infos, { label: '', value: '', href: '' }],
    }));
    markDirty();
  };

  const removeInfo = (index: number) => {
    setData((previous) => ({
      ...previous,
      infos: previous.infos.filter((_, current) => current !== index),
    }));
    markDirty();
  };

  const moveInfo = (index: number, direction: -1 | 1) => {
    setData((previous) => {
      const target = index + direction;
      if (target < 0 || target >= previous.infos.length) return previous;
      const infos = [...previous.infos];
      const [moved] = infos.splice(index, 1);
      infos.splice(target, 0, moved);
      return { ...previous, infos };
    });
    markDirty();
  };

  const markdown = useMemo(() => stringifyProfileSource(data, extra), [data, extra]);

  const handleSave = useCallback(async () => {
    if (!data.name.trim()) {
      Toast.warning({ content: '请先填写显示名称。', duration: 3 });
      return;
    }
    setSaving(true);
    try {
      const result = await saveProfile(client, { data, extra, sha, isNew });
      setSha(result.sha);
      setData(result.data);
      setIsNew(false);
      setDirty(false);
      setLastSavedAt(new Date());
      Toast.success({
        content: '个人资料已提交到 GitHub。点击「构建站点」后网站才会更新。',
        duration: 4,
      });
      onSaved();
    } catch (reason) {
      Toast.error({
        content: reason instanceof Error ? reason.message : '保存失败，请稍后重试。',
        duration: 6,
      });
    } finally {
      setSaving(false);
    }
  }, [client, data, extra, isNew, onSaved, sha]);

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

  const statusText = saving
    ? '正在提交…'
    : dirty
      ? '有未保存的修改'
      : pendingBuildAt
        ? '已保存 · 未构建'
        : lastSavedAt
          ? `已保存 ${formatClock(lastSavedAt)}`
          : '已从 GitHub 加载';

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
          <div className="editor-breadcrumb">
            <strong>个人资料</strong>
          </div>
          <span className={`save-state ${dirty ? 'is-dirty' : ''}`}>
            <span className="save-state__dot" />
            {statusText}
          </span>
        </div>
        <div className="editor-topbar__actions">
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
          >
            保存
          </Button>
          <a
            className="icon-btn"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            title="查看首页"
          >
            <Icon name="external" size={17} />
          </a>
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

      <div className="editor-scroll">
        {loading ? (
          <div className="admin-loading">
            <Spin size="large" />
            <p>正在读取个人资料…</p>
          </div>
        ) : error ? (
          <div className="admin-error">
            <Icon name="alert" size={28} />
            <h2>个人资料读取失败</h2>
            <p>{error}</p>
            <div className="admin-error__actions">
              <Button onClick={() => setReload((value) => value + 1)}>重试</Button>
            </div>
          </div>
        ) : (
          <div className="profile-editor">
            <header className="profile-editor__hero">
              <Avatar
                size="extra-large"
                src={data.avatar}
                alt=""
                imgAttr={{ referrerPolicy: 'no-referrer' }}
              />
              <div>
                <span className="profile-editor__eyebrow">PROFILE</span>
                <h1>{data.name || '未命名'}</h1>
                <p>{data.handle ? `@${data.handle}` : '还没有填写 handle'}</p>
              </div>
              <span className="profile-editor__path">
                <Icon name="file" size={14} />
                {profilePath}
              </span>
            </header>

            <div className="profile-editor__layout">
              <div className="profile-editor__main">
                <section className="admin-card">
                  <header className="admin-card__head">
                    <h2>基本资料</h2>
                  </header>
                  <div className="settings-panel__grid">
                    <label className="settings-field">
                      <span className="settings-field__label">显示名称</span>
                      <Input
                        value={data.name}
                        onChange={(value) => patch({ name: value })}
                        placeholder="Hai1ro"
                      />
                    </label>
                    <label className="settings-field">
                      <span className="settings-field__label">ID / handle</span>
                      <Input
                        value={data.handle}
                        onChange={(value) => patch({ handle: value })}
                        prefix="@"
                        placeholder="hai1ro"
                      />
                    </label>
                    <label className="settings-field settings-field--full">
                      <span className="settings-field__label">头像地址</span>
                      <Input
                        value={data.avatar}
                        onChange={(value) => patch({ avatar: value })}
                        placeholder="https://github.com/…"
                      />
                      <span className="settings-field__hint">支持 GitHub 头像或任意图片 URL。</span>
                    </label>
                    <label className="settings-field settings-field--full">
                      <span className="settings-field__label">签名</span>
                      <TextArea
                        value={data.signature}
                        onChange={(value) => patch({ signature: value })}
                        autosize={{ minRows: 2, maxRows: 4 }}
                        placeholder="一句话介绍自己。"
                      />
                    </label>
                  </div>
                </section>

                <section className="admin-card">
                  <header className="admin-card__head">
                    <div>
                      <h2>资料信息</h2>
                      <p className="admin-card__desc">
                        这些条目会以 Markdown 列表保存到 profile.md，首页读取后自己解析。
                      </p>
                    </div>
                    <Button
                      size="small"
                      icon={<Icon name="plus" size={14} />}
                      onClick={addInfo}
                    >
                      添加一条
                    </Button>
                  </header>

                  {data.infos.length === 0 ? (
                    <div className="profile-info-empty">
                      <p>还没有资料信息。可以添加所在地、邮箱、职业、兴趣等。</p>
                      <Button size="small" onClick={addInfo}>
                        添加第一条
                      </Button>
                    </div>
                  ) : (
                    <div className="profile-info-list">
                      {data.infos.map((info, index) => (
                        <div className="profile-info-row" key={index}>
                          <Input
                            value={info.label}
                            onChange={(value) => patchInfo(index, { label: value })}
                            placeholder="名称，如 所在地"
                            aria-label="信息名称"
                          />
                          <Input
                            value={info.value}
                            onChange={(value) => patchInfo(index, { value: value })}
                            placeholder="内容，如 上海"
                            aria-label="信息内容"
                          />
                          <Input
                            value={info.href ?? ''}
                            onChange={(value) => patchInfo(index, { href: value })}
                            placeholder="链接（可选）"
                            aria-label="信息链接"
                          />
                          <div className="profile-info-row__actions">
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => moveInfo(index, -1)}
                              disabled={index === 0}
                              aria-label="上移"
                              title="上移"
                            >
                              <Icon name="chevron-down" size={14} className="rotate-180" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => moveInfo(index, 1)}
                              disabled={index === data.infos.length - 1}
                              aria-label="下移"
                              title="下移"
                            >
                              <Icon name="chevron-down" size={14} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => removeInfo(index)}
                              aria-label="删除"
                              title="删除"
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <aside className="profile-editor__side">
                <section className="admin-card">
                  <header className="admin-card__head">
                    <h2>Markdown 预览</h2>
                  </header>
                  <pre className="profile-markdown-preview">{markdown}</pre>
                  <p className="admin-card__desc">
                    保存时会写入这个文件；前台不会读取数据库，而是解析 Markdown。
                  </p>
                </section>

                <section className="admin-card">
                  <h2>保存位置</h2>
                  <dl className="admin-meta">
                    <div>
                      <dt>文件</dt>
                      <dd>{profilePath}</dd>
                    </div>
                    <div>
                      <dt>状态</dt>
                      <dd>{dirty ? '有未保存修改' : '已同步'}</dd>
                    </div>
                    <div>
                      <dt>构建</dt>
                      <dd>{pendingBuildAt ? '待构建' : '无待构建'}</dd>
                    </div>
                  </dl>
                  {!isNew && (
                    <a
                      className="admin-card__link"
                      href={`https://github.com/${client.owner}/${client.repo}/blob/${client.branch}/${profilePath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      在 GitHub 查看
                    </a>
                  )}
                </section>
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
