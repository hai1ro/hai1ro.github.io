import { useDeferredValue, useMemo } from 'react';
import { markdownToHtml } from '@/lib/markdown';

export function MarkdownPreview({ markdown }: { markdown: string }) {
  const deferred = useDeferredValue(markdown);
  const html = useMemo(() => markdownToHtml(deferred), [deferred]);

  if (!deferred.trim()) {
    return (
      <div className="markdown-preview markdown-preview--empty">
        开始输入 Markdown，这里会显示实时预览。
      </div>
    );
  }

  return (
    <div
      className="markdown-preview prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
