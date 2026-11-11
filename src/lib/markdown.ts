import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js/lib/common';

marked.use({ gfm: true, breaks: false });
marked.use(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, language) {
      const lang = language && hljs.getLanguage(language) ? language : 'plaintext';
      return hljs.highlight(code, { language: lang }).value;
    },
  }),
);

/**
 * Markdown → HTML，用于后台实时预览。
 * 博客公开页面仍由 Astro 在构建时渲染。
 */
export function markdownToHtml(markdown: string): string {
  const parsed = marked.parse(markdown, { async: false });
  const html = typeof parsed === 'string' ? parsed : '';

  if (typeof DOMParser === 'undefined') return html;

  // marked 的 GFM 任务列表不带 class，这里补上，方便预览样式识别
  const doc = new DOMParser().parseFromString(
    `<!doctype html><html><body>${html}</body></html>`,
    'text/html',
  );
  doc.querySelectorAll('li > input[type="checkbox"]').forEach((input) => {
    const li = input.parentElement;
    const list = li?.parentElement;
    if (!li || !list) return;
    li.classList.add('task-list-item');
    list.classList.add('contains-task-list');
  });
  return doc.body.innerHTML;
}
