import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { EditorState } from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  keymap,
  placeholder,
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
} from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { tags } from '@lezer/highlight';

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
    padding: '24px 26px 120px',
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
  { tag: tags.heading1, fontSize: '1.7em', fontWeight: '700', lineHeight: '1.35' },
  { tag: tags.heading2, fontSize: '1.4em', fontWeight: '700', lineHeight: '1.4' },
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
  { tag: tags.bool, color: '#0550ae' },
  { tag: tags.null, color: '#0550ae' },
  { tag: tags.typeName, color: 'var(--cm-type)' },
  { tag: tags.className, color: 'var(--cm-type)' },
  { tag: tags.propertyName, color: '#0550ae' },
  { tag: tags.variableName, color: 'var(--semi-color-text-0)' },
  { tag: tags.function(tags.variableName), color: '#8250df' },
  { tag: tags.operator, color: 'var(--semi-color-text-2)' },
]);

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

function toggleLinePrefix(
  view: EditorView,
  prefix: string,
  stripPattern?: RegExp,
) {
  const { from, to } = view.state.selection.main;
  const start = view.state.doc.lineAt(from);
  const end = view.state.doc.lineAt(to);
  const lines: { from: number; to: number; text: string }[] = [];

  for (let lineNo = start.number; lineNo <= end.number; lineNo += 1) {
    const line = view.state.doc.line(lineNo);
    lines.push({ from: line.from, to: line.to, text: line.text });
  }

  const allPrefixed = lines.every((line) => {
    const candidate = stripPattern ? line.text.replace(stripPattern, '') : line.text;
    return candidate.startsWith(prefix);
  });

  const changes = lines.map((line) => {
    if (allPrefixed) {
      return { from: line.from, to: line.to, insert: line.text.slice(prefix.length) };
    }
    const stripped = stripPattern ? line.text.replace(stripPattern, '') : line.text;
    return { from: line.from, to: line.to, insert: `${prefix}${stripped}` };
  });

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

function insertBlock(view: EditorView, text: string, cursorOffset?: number) {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  const before = view.state.sliceDoc(line.from, line.to);
  const needsBreak = before.trim().length > 0;
  const insert = `${needsBreak ? '\n\n' : ''}${text}\n`;
  const at = line.to;
  view.dispatch({
    changes: { from: at, to: at, insert },
    selection: {
      anchor: at + (cursorOffset ?? insert.length - 1),
    },
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
  togglePrefix: (prefix: string, stripPattern?: RegExp) => void;
  setHeading: (level: 1 | 2 | 3) => void;
  insertBlock: (text: string, cursorOffset?: number) => void;
  insertImage: (url: string, alt?: string) => void;
  undo: () => void;
  redo: () => void;
}

interface Props {
  initialValue: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onImageUpload: (file: File) => Promise<string>;
  onImageError?: (error: unknown) => void;
  placeholder?: string;
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, Props>(function MarkdownEditor(
  { initialValue, onChange, onSave, onImageUpload, onImageError, placeholder: placeholderText },
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
      togglePrefix: (prefix, stripPattern) => {
        const view = viewRef.current;
        if (view) toggleLinePrefix(view, prefix, stripPattern);
      },
      setHeading: (level) => {
        const view = viewRef.current;
        if (view) setHeading(view, level);
      },
      insertBlock: (text, cursorOffset) => {
        const view = viewRef.current;
        if (view) insertBlock(view, text, cursorOffset);
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
        placeholder(placeholderText ?? '开始写 Markdown…'),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            callbacks.current.onChange(update.state.doc.toString());
          }
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
    // 编辑器只初始化一次；切换视图模式时保持光标和撤销历史
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="markdown-editor" ref={containerRef} />;
});
