import { useEffect, useState, type ComponentType } from 'react';

/**
 * 只在浏览器中动态加载真正的后台应用。
 * 这样 Semi UI / Tiptap 的大量依赖不会被 Astro 的 SSR 预加载，
 * 也避免 Node 直接解析 Semi 的 ESM 样式导入。
 */
export default function AdminMount() {
  const [App, setApp] = useState<ComponentType | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    import('./AdminApp')
      .then((module) => {
        if (alive) setApp(() => module.default);
      })
      .catch((error) => {
        console.error('管理后台加载失败', error);
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (failed) {
    return (
      <div className="admin-splash">
        <div className="admin-splash__mark">H</div>
        <p>管理后台加载失败，请刷新页面重试。</p>
      </div>
    );
  }

  if (!App) {
    return (
      <div className="admin-splash">
        <div className="admin-splash__mark">H</div>
        <p>正在加载编辑器…</p>
      </div>
    );
  }

  return <App />;
}
