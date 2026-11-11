import { marked } from 'marked';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

marked.use({ gfm: true, breaks: false });

/**
 * Markdown → HTML，并把 GFM 任务列表转换成 Tiptap TaskList 能识别的结构。
 * 仅用于管理后台的编辑器/预览；博客正文由 Astro 在构建时渲染。
 */
export function markdownToHtml(markdown: string): string {
  const parsed = marked.parse(markdown, { async: false });
  const html = typeof parsed === 'string' ? parsed : '';
  return normalizeTaskLists(html);
}

function normalizeTaskLists(html: string): string {
  if (typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, 'text/html');

  doc.querySelectorAll('li > input[type="checkbox"]').forEach((input) => {
    const li = input.parentElement;
    const list = li?.parentElement;
    if (!li || !list || (list.nodeName !== 'UL' && list.nodeName !== 'OL')) return;

    list.setAttribute('data-type', 'taskList');
    li.setAttribute('data-type', 'taskItem');
    li.setAttribute('data-checked', input.hasAttribute('checked') ? 'true' : 'false');
    li.classList.remove('task-list-item');

    // 把 input 前的行内内容包进 <p>，满足 Tiptap TaskItem 的 schema
    const blockTags = new Set([
      'P',
      'UL',
      'OL',
      'PRE',
      'BLOCKQUOTE',
      'TABLE',
      'H1',
      'H2',
      'H3',
      'H4',
      'H5',
      'H6',
      'HR',
    ]);
    const inlineNodes: ChildNode[] = [];
    for (const node of Array.from(li.childNodes)) {
      if (node.nodeType === 1 && blockTags.has((node as Element).tagName)) break;
      if (node === input || (node.nodeType === 1 && (node as Element).nodeName === 'LABEL')) continue;
      inlineNodes.push(node as ChildNode);
    }
    if (inlineNodes.some((node) => node.textContent?.trim())) {
      const p = doc.createElement('p');
      inlineNodes[0].before(p);
      inlineNodes.forEach((node) => p.appendChild(node));
    }

    input.remove();
    li.querySelectorAll(':scope > label').forEach((label) => label.remove());
  });

  doc.querySelectorAll('ul.contains-task-list, ol.contains-task-list').forEach((list) => {
    list.setAttribute('data-type', 'taskList');
    list.classList.remove('contains-task-list');
  });

  return doc.body.innerHTML;
}

/**
 * Tiptap 的 TaskItem 把 checkbox 放在 <label> 里，而 turndown 的 GFM 插件
 * 只识别 <li> 的直接子 input，所以先做一次 DOM 规整。
 */
function normalizeTaskItemsForMarkdown(html: string): string {
  if (typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, 'text/html');

  // Tiptap 的表格带有 colgroup / 内联样式，GFM 表格规则会因此退回原始 HTML
  doc.querySelectorAll('table colgroup, table col').forEach((element) => element.remove());
  doc.querySelectorAll('table, th, td').forEach((element) => {
    element.removeAttribute('style');
  });

  // 表格单元格里的 <p> 会让 turndown 的 GFM 表格规则产生换行，先压平成行内内容
  doc.querySelectorAll('th, td').forEach((cell) => {
    Array.from(cell.childNodes).forEach((node) => {
      if (node.nodeType === 3 && !node.textContent?.trim()) node.remove();
    });
    const paragraphs = Array.from(cell.children).filter((child) => child.tagName === 'P');
    if (paragraphs.length) {
      const fragment = doc.createDocumentFragment();
      paragraphs.forEach((paragraph, index) => {
        if (index > 0) fragment.appendChild(doc.createElement('br'));
        while (paragraph.firstChild) fragment.appendChild(paragraph.firstChild);
        paragraph.remove();
      });
      cell.appendChild(fragment);
    }
  });

  doc.querySelectorAll('li[data-type="taskItem"]').forEach((li) => {
    const checked = li.getAttribute('data-checked') === 'true';
    const contentDiv = li.querySelector(':scope > div');
    const input = doc.createElement('input');
    input.setAttribute('type', 'checkbox');
    if (checked) input.setAttribute('checked', '');

    const replacement = doc.createElement('li');
    replacement.appendChild(input);
    replacement.appendChild(doc.createTextNode(' '));

    if (contentDiv) {
      while (contentDiv.firstChild) replacement.appendChild(contentDiv.firstChild);
      contentDiv.remove();
    } else {
      while (li.firstChild) replacement.appendChild(li.firstChild);
    }

    // 任务项正文需要在 checkbox 后保持行内，否则会生成空行
    const paragraphs = Array.from(replacement.children).filter((child) => child.tagName === 'P');
    paragraphs.forEach((paragraph, index) => {
      if (index > 0) paragraph.before(doc.createElement('br'));
      while (paragraph.firstChild) paragraph.before(paragraph.firstChild);
      paragraph.remove();
    });
    Array.from(replacement.childNodes).forEach((node) => {
      if (node.nodeType === 3 && !node.textContent?.trim()) node.remove();
    });

    li.replaceWith(replacement);
  });

  return doc.body.innerHTML;
}

let turndown: TurndownService | null = null;

function getTurndown(): TurndownService {
  if (turndown) return turndown;
  const service = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',
  });
  service.use(gfm);
  // Markdown 没有下划线语义，直接保留文字（避免输出 HTML）
  service.addRule('underline', {
    filter: ['u'],
    replacement: (content) => content,
  });
  // 高亮同上
  service.addRule('mark', {
    filter: ['mark'],
    replacement: (content) => content,
  });
  // GFM 删除线需要双波浪号，turndown 官方插件输出的是单波浪号
  service.addRule('strikethrough', {
    filter: (node) => ['DEL', 'S', 'STRIKE'].includes(node.nodeName),
    replacement: (content) => `~~${content}~~`,
  });
  turndown = service;
  return service;
}

/** HTML（Tiptap 编辑器输出）→ Markdown */
export function htmlToMarkdown(html: string): string {
  if (!html.trim()) return '';
  const normalized = normalizeTaskItemsForMarkdown(html);
  const markdown = getTurndown().turndown(normalized);
  return normalizeMarkdown(markdown);
}

/** 清理多余空行、统一换行；保留行尾两个空格（硬换行） */
export function normalizeMarkdown(markdown: string): string {
  return (
    markdown
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^(\s*)- {2,}\[([ xX])\]/gm, '$1- [$2]')
      .replace(/[ \t]+$/gm, (spaces) => (spaces.length >= 2 ? '  ' : ''))
      .trim() + '\n'
  );
}
