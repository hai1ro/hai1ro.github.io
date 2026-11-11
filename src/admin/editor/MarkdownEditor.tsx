import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  Compartment,
  EditorState,
  StateField,
  type Range,
} from '@codemirror/state';
import {
  Decoration,
  EditorView,
  WidgetType,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  keymap,
  placeholder,
  type DecorationSet,
} from '@codemirror/view';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  redo,
  undo,
} from '@codemirror/commands';
import {
  HighlightStyle,
  bracketMatching,
  indentOnInput,
  syntaxHighlighting,
  syntaxTree,
} from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { tags } from '@lezer/highlight';
import { blogConfig } from '@/config/blog';

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'var(--semi-color-bg-0)',
    color: 'var(--semi-color-text-0)',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-sans)',
    fontSize: '15px',
    lineHeight: '1.85',
    overflow: 'auto',
  },
  '.cm-content': {
    minHeight: '100%',
    padding: '28px 32px 140px',
    maxWidth: '900px',
  },
  '.cm-line': {
    padding: '0',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--semi-color-primary)',
  },
  '.cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--semi-color-primary-light-default) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--semi-color-fill-0)',
  },
  '.cm-placeholder': {
    color: 'var(--semi-color-text-3)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
});

const markdownHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontSize: '1.75em', fontWeight: '700', lineHeight: '1.35' },
  { tag: tags.heading2, fontSize: '1.42em', fontWeight: '700', lineHeight: '1.4' },
  { tag: tags.heading3, fontSize: '1.2em', fontWeight: '600' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.link, color: 'var(--semi-color-primary)', textDecoration: 'underline' },
  { tag: tags.url, color: 'var(--semi-color-text-2)' },
  { tag: tags.monospace, fontFamily: 'var(--font-mono)' },
  { tag: tags.meta, color: 'var(--semi-color-text-3)' },
  { tag: tags.processingInstruction, color: 'var(--semi-color-text-3)' },
  { tag: tags.comment, color: 'var(--semi-color-text-3)', fontStyle: 'italic' },
  { tag: tags.keyword, color: 'var(--cm-keyword)' },
  { tag: tags.string, color: 'var(--cm-string)' },
  { tag: tags.number, color: 'var(--cm-number)' },
  { tag: tags.bool, color: 'var(--cm-number)' },
  { tag: tags.null, color: 'var(--cm-number)' },
  { tag: tags.typeName, color: 'var(--cm-type)' },
  { tag: tags.className, color: 'var(--cm-type)' },
  { tag: tags.propertyName, color: 'var(--cm-number)' },
  { tag: tags.variableName, color: 'var(--semi-color-text-0)' },
  { tag: tags.function(tags.variableName), color: 'var(--cm-type)' },
  { tag: tags.operator, color: 'var(--semi-color-text-2)' },
]);

const livePreviewCompartment = new Compartment();

function resolveImageUrl(url: string): string {
  if (url.startsWith('/images/')) {
    return `https://raw.githubusercontent.com/${blogConfig.owner}/${blogConfig.repo}/${blogConfig.branch}/public${url}`;
  }
  return url;
}

class ImageWidget extends WidgetType {
  constructor(
    readonly url: string,
    readonly alt: string,
    readonly pos: number,
  ) {
    super();
  }

  eq(other: ImageWidget) {
    return other.url === this.url && other.alt === this.alt && other.pos === this.pos;
  }

  toDOM(view: EditorView) {
    const wrapper = document.createElement('span');
    wrapper.className = 'cm-md-image';
    const image = document.createElement('img');
    image.src = resolveImageUrl(this.url);
    image.alt = this.alt;
    image.loading = 'lazy';
    image.addEventListener('click', (event) => {
      event.preventDefault();
      view.dispatch({ selection: { anchor: this.pos + 1 } });
      view.focus();
    });
    wrapper.appendChild(image);
    return wrapper;
  }
}

class RuleWidget extends WidgetType {
  constructor(readonly pos: number) {
    super();
  }

  toDOM(view: EditorView) {
    const hr = document.createElement('hr');
    hr.className = 'cm-md-hr';
    hr.addEventListener('click', () => {
      view.dispatch({ selection: { anchor: this.pos } });
      view.focus();
    });
    return hr;
  }
}

class BulletWidget extends WidgetType {
  toDOM() {
    const bullet = document.createElement('span');
    bullet.className = 'cm-md-bullet';
    bullet.textContent = '•';
    return bullet;
  }
}

class TableWidget extends WidgetType {
  constructor(
    readonly rows: string[][],
    readonly pos: number,
  ) {
    super();
  }

  eq(other: TableWidget) {
    return JSON.stringify(other.rows) === JSON.stringify(this.rows);
  }

  toDOM(view: EditorView) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cm-md-table';
    const table = document.createElement('table');
    const [head, ...body] = this.rows;

    if (head) {
      const thead = document.createElement('thead');
      const tr = document.createElement('tr');
      head.forEach((cell) => {
        const th = document.createElement('th');
        th.textContent = cell;
        tr.appendChild(th);
      });
      thead.appendChild(tr);
      table.appendChild(thead);
    }

    if (body.length > 0) {
      const tbody = document.createElement('tbody');
      body.forEach((row) => {
        const tr = document.createElement('tr');
        row.forEach((cell) => {
          const td = document.createElement('td');
          td.textContent = cell;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
    }

    wrapper.appendChild(table);
    wrapper.addEventListener('click', () => {
      view.dispatch({ selection: { anchor: this.pos } });
      view.focus();
    });
    return wrapper;
  }

  ignoreEvent() {
    return false;
  }
}

class TaskWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly markerFrom: number,
    readonly markerTo: number,
  ) {
    super();
  }

  eq(other: TaskWidget) {
    return (
      other.checked === this.checked &&
      other.markerFrom === this.markerFrom &&
      other.markerTo === this.markerTo
    );
  }

  toDOM(view: EditorView) {
    const label = document.createElement('label');
    label.className = 'cm-md-task';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = this.checked;
    input.addEventListener('change', () => {
      view.dispatch({
        changes: {
          from: this.markerFrom,
          to: this.markerTo,
          insert: input.checked ? '[x]' : '[ ]',
        },
      });
      view.focus();
    });
    label.appendChild(input);
    return label;
  }

  ignoreEvent() {
    return false;
  }
}

function buildLivePreview(state: EditorState): DecorationSet {
  const activeLine = state.doc.lineAt(state.selection.main.head).number;
  const ranges: Range<Decoration>[] = [];
  let fenceDepth = 0;

  const hide = (from: number, to: number) => {
    if (to > from) ranges.push(Decoration.replace({}).range(from, to));
  };

  const lineClass = (from: number, className: string) => {
    const line = state.doc.lineAt(from);
    ranges.push(Decoration.line({ class: className }).range(line.from));
  };

  // GFM 表格不依赖 Lezer 节点，单独扫描成块并渲染成真正的表格
  const codeLines = new Set<number>();
  let inFence = false;
  for (let lineNumber = 1; lineNumber <= state.doc.lines; lineNumber += 1) {
    const text = state.doc.line(lineNumber).text.trim();
    if (/^(\u0060{3,}|~{3,})/.test(text)) {
      codeLines.add(lineNumber);
      inFence = !inFence;
      continue;
    }
    if (inFence) codeLines.add(lineNumber);
  }

  const tableLines = new Set<number>();
  const splitRow = (text: string) =>
    text
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());

  for (let lineNumber = 1; lineNumber < state.doc.lines; lineNumber += 1) {
    const header = state.doc.line(lineNumber);
    const separator = state.doc.line(lineNumber + 1);
    if (codeLines.has(lineNumber) || codeLines.has(lineNumber + 1)) continue;
    if (!header.text.includes('|') || !/^\s*\|?[\s:|-]+\|?\s*$/.test(separator.text) || !separator.text.includes('---')) {
      continue;
    }

    let endLine = lineNumber + 1;
    const rows: string[][] = [splitRow(header.text)];
    while (endLine < state.doc.lines) {
      const next = state.doc.line(endLine + 1);
      if (!next.text.includes('|') || next.text.trim() === '') break;
      endLine += 1;
      rows.push(splitRow(next.text));
    }

    if (rows.length < 2) continue;

    let containsActive = false;
    for (let n = lineNumber; n <= endLine; n += 1) {
      tableLines.add(n);
      if (n === activeLine) containsActive = true;
    }
    if (containsActive) continue;

    ranges.push(
      Decoration.replace({
        widget: new TableWidget(rows, header.from),
        block: true,
      }).range(header.from, state.doc.line(endLine).to),
    );
    lineNumber = endLine;
  }

  syntaxTree(state).iterate({
    enter(node) {
      const { name, from, to } = node;

      if (name === 'FencedCode') {
        fenceDepth += 1;
        const first = state.doc.lineAt(from).number;
        const last = state.doc.lineAt(to).number;
        for (let lineNumber = first; lineNumber <= last; lineNumber += 1) {
          lineClass(state.doc.line(lineNumber).from, 'cm-md-code-line');
        }
        return;
      }

      if (fenceDepth > 0) {
        if (
          state.doc.lineAt(from).number !== activeLine &&
          (name === 'CodeMark' || name === 'CodeInfo')
        ) {
          hide(from, to);
        }
        return;
      }

      if (state.doc.lineAt(from).number === activeLine) return;

      if (tableLines.has(state.doc.lineAt(from).number)) return;

      if (name === 'Image') {
        const raw = state.sliceDoc(from, to);
        const match = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/.exec(raw);
        if (match) {
          ranges.push(
            Decoration.replace({
              widget: new ImageWidget(match[2], match[1], from),
            }).range(from, to),
          );
        }
        return false;
      }

      if (name === 'HorizontalRule') {
        ranges.push(Decoration.replace({ widget: new RuleWidget(from) }).range(from, to));
        return false;
      }

      if (name === 'Link') {
        const raw = state.sliceDoc(from, to);
        const close = raw.indexOf(']');
        if (close > 0) {
          ranges.push(Decoration.mark({ class: 'cm-md-link' }).range(from + 1, from + close));
        }
        return;
      }

      if (name === 'Blockquote') {
        const first = state.doc.lineAt(from).number;
        const last = state.doc.lineAt(to).number;
        for (let lineNumber = first; lineNumber <= last; lineNumber += 1) {
          lineClass(state.doc.line(lineNumber).from, 'cm-md-quote-line');
        }
        return;
      }

      if (name === 'ListItem') {
        const raw = state.sliceDoc(from, to);
        if (/^\s*[-*+]\s+\[[ xX]\]/.test(raw)) {
          const markerFrom = from + raw.indexOf('[');
          const markerTo = markerFrom + 3;
          const after = state.sliceDoc(markerTo, markerTo + 1);
          const replaceTo = after === ' ' ? markerTo + 1 : markerTo;
          ranges.push(
            Decoration.replace({
              widget: new TaskWidget(
                raw.includes('[x]') || raw.includes('[X]'),
                markerFrom,
                markerTo,
              ),
            }).range(from, replaceTo),
          );
          return false;
        }
      }

      if (name === 'ListMark') {
        const raw = state.sliceDoc(from, to);
        if (/^[-*+]$/.test(raw)) {
          ranges.push(Decoration.replace({ widget: new BulletWidget() }).range(from, to));
        }
        return;
      }

      if (name === 'HeaderMark' || name === 'QuoteMark') {
        const end = state.sliceDoc(to, to + 1) === ' ' ? to + 1 : to;
        hide(from, end);
        return;
      }

      if (
        name === 'EmphasisMark' ||
        name === 'StrikethroughMark' ||
        name === 'CodeMark' ||
        name === 'LinkMark' ||
        name === 'URL'
      ) {
        hide(from, to);
      }
    },
    leave(node) {
      if (node.name === 'FencedCode') fenceDepth = Math.max(0, fenceDepth - 1);
    },
  });

  return Decoration.set(ranges, true);
}

const livePreviewField = StateField.define<DecorationSet>({
  create(state) {
    return buildLivePreview(state);
  },
  update(decorations, transaction) {
    if (transaction.docChanged || transaction.selection) {
      return buildLivePreview(transaction.state);
    }
    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

function wrapSelection(
  view: EditorView,
  before: string,
  after: string,
  placeholderText = '文本',
) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to) || placeholderText;
  const insert = `${before}${selected}${after}`;
  view.dispatch({
    changes: { from, to, insert },
    selection: {
      anchor: from + before.length,
      head: from + before.length + selected.length,
    },
  });
  view.focus();
}

function toggleLinePrefix(view: EditorView, prefix: string) {
  const { from, to } = view.state.selection.main;
  const start = view.state.doc.lineAt(from);
  const end = view.state.doc.lineAt(to);
  const lines: { from: number; to: number; text: string }[] = [];

  for (let lineNo = start.number; lineNo <= end.number; lineNo += 1) {
    const line = view.state.doc.line(lineNo);
    lines.push({ from: line.from, to: line.to, text: line.text });
  }

  const allPrefixed = lines.every((line) => line.text.startsWith(prefix));
  const changes = lines.map((line) =>
    allPrefixed
      ? { from: line.from, to: line.to, insert: line.text.slice(prefix.length) }
      : { from: line.from, to: line.to, insert: `${prefix}${line.text}` },
  );

  view.dispatch({ changes });
  view.focus();
}

function setHeading(view: EditorView, level: 1 | 2 | 3) {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  const text = line.text.replace(/^#{1,6}\s+/, '');
  const prefix = `${'#'.repeat(level)} `;
  view.dispatch({
    changes: { from: line.from, to: line.to, insert: `${prefix}${text}` },
    selection: { anchor: line.from + prefix.length + text.length },
  });
  view.focus();
}

function insertBlock(view: EditorView, text: string) {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  const before = view.state.sliceDoc(line.from, line.to);
  const insert = `${before.trim().length ? '\n\n' : ''}${text}\n`;
  const at = line.to;
  view.dispatch({
    changes: { from: at, to: at, insert },
    selection: { anchor: at + insert.length - 1 },
  });
  view.focus();
}

function insertAtSelection(view: EditorView, text: string) {
  const { from, to } = view.state.selection.main;
  view.dispatch({
    changes: { from, to, insert: text },
    selection: { anchor: from + text.length },
  });
  view.focus();
}

export interface MarkdownEditorHandle {
  focus: () => void;
  wrapSelection: (before: string, after: string, placeholder?: string) => void;
  togglePrefix: (prefix: string) => void;
  setHeading: (level: 1 | 2 | 3) => void;
  insertBlock: (text: string) => void;
  insertImage: (url: string, alt?: string) => void;
  undo: () => void;
  redo: () => void;
}

interface Props {
  initialValue: string;
  wysiwyg: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onImageUpload: (file: File) => Promise<string>;
  onImageError?: (error: unknown) => void;
  placeholder?: string;
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, Props>(function MarkdownEditor(
  { initialValue, wysiwyg, onChange, onSave, onImageUpload, onImageError, placeholder: placeholderText },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onSave, onImageUpload, onImageError });
  callbacks.current = { onChange, onSave, onImageUpload, onImageError };

  useImperativeHandle(
    ref,
    () => ({
      focus: () => viewRef.current?.focus(),
      wrapSelection: (before, after, text) => {
        const view = viewRef.current;
        if (view) wrapSelection(view, before, after, text);
      },
      togglePrefix: (prefix) => {
        const view = viewRef.current;
        if (view) toggleLinePrefix(view, prefix);
      },
      setHeading: (level) => {
        const view = viewRef.current;
        if (view) setHeading(view, level);
      },
      insertBlock: (text) => {
        const view = viewRef.current;
        if (view) insertBlock(view, text);
      },
      insertImage: (url, alt = 'image') => {
        const view = viewRef.current;
        if (view) insertAtSelection(view, `![${alt}](${url})`);
      },
      undo: () => {
        const view = viewRef.current;
        if (view) {
          undo(view);
          view.focus();
        }
      },
      redo: () => {
        const view = viewRef.current;
        if (view) {
          redo(view);
          view.focus();
        }
      },
    }),
    [],
  );

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    const handleImages = (view: EditorView, files: File[], at: number) => {
      const file = files.find((item) => item.type.startsWith('image/'));
      if (!file) return false;
      callbacks.current
        .onImageUpload(file)
        .then((url) => {
          const alt = file.name.replace(/\.[^.]+$/, '').replace(/[[\]]/g, '') || 'image';
          const markdown = `![${alt}](${url})`;
          view.dispatch({
            changes: { from: at, to: at, insert: markdown },
            selection: { anchor: at + markdown.length },
          });
          view.focus();
        })
        .catch((error) => callbacks.current.onImageError?.(error));
      return true;
    };

    const state = EditorState.create({
      doc: initialValue,
      extensions: [
        EditorView.lineWrapping,
        EditorState.tabSize.of(2),
        history(),
        drawSelection(),
        dropCursor(),
        highlightActiveLine(),
        bracketMatching(),
        indentOnInput(),
        markdown({
          base: markdownLanguage,
          codeLanguages: languages,
        }),
        syntaxHighlighting(markdownHighlight),
        editorTheme,
        livePreviewCompartment.of(wysiwyg ? livePreviewField : []),
        placeholder(placeholderText ?? '开始写 Markdown…'),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
        }),
        EditorView.domEventHandlers({
          paste(event, view) {
            const files = Array.from(event.clipboardData?.files ?? []);
            if (!files.some((file) => file.type.startsWith('image/'))) return false;
            event.preventDefault();
            return handleImages(view, files, view.state.selection.main.from);
          },
          drop(event, view) {
            const files = Array.from(event.dataTransfer?.files ?? []);
            if (!files.some((file) => file.type.startsWith('image/'))) return false;
            event.preventDefault();
            const at =
              view.posAtCoords({ x: event.clientX, y: event.clientY }) ??
              view.state.selection.main.from;
            return handleImages(view, files, at);
          },
        }),
        keymap.of([
          {
            key: 'Mod-s',
            preventDefault: true,
            run: () => {
              callbacks.current.onSave();
              return true;
            },
          },
          {
            key: 'Mod-b',
            run: (view) => {
              wrapSelection(view, '**', '**', '粗体');
              return true;
            },
          },
          {
            key: 'Mod-i',
            run: (view) => {
              wrapSelection(view, '*', '*', '斜体');
              return true;
            },
          },
          {
            key: 'Mod-k',
            run: (view) => {
              wrapSelection(view, '[', '](https://)', '链接文字');
              return true;
            },
          },
          {
            key: 'Mod-e',
            run: (view) => {
              wrapSelection(view, '`', '`', '代码');
              return true;
            },
          },
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
      ],
    });

    const view = new EditorView({ state, parent });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: livePreviewCompartment.reconfigure(wysiwyg ? livePreviewField : []),
    });
  }, [wysiwyg]);

  return <div className="markdown-editor" ref={containerRef} />;
});
