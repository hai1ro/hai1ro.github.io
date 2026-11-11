import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import { Icon, type IconName } from '../components/icons';

interface SlashItem {
  id: string;
  label: string;
  description: string;
  icon: IconName;
  group: string;
  keywords: string;
  run: (editor: Editor) => void;
}

const ITEMS: SlashItem[] = [
  {
    id: 'text',
    label: '文本',
    description: '普通段落',
    icon: 'text',
    group: '基础',
    keywords: 'text paragraph 段落 文本',
    run: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: 'h1',
    label: '一级标题',
    description: '页面中的大标题',
    icon: 'heading',
    group: '基础',
    keywords: 'h1 heading 标题 一级',
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    label: '二级标题',
    description: '文章的主要分节',
    icon: 'heading',
    group: '基础',
    keywords: 'h2 heading 标题 二级',
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: '三级标题',
    description: '更小的分节',
    icon: 'heading',
    group: '基础',
    keywords: 'h3 heading 标题 三级',
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'bullet',
    label: '无序列表',
    description: '用圆点组织内容',
    icon: 'list',
    group: '列表',
    keywords: 'bullet list 无序 列表',
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ordered',
    label: '有序列表',
    description: '带编号的步骤',
    icon: 'ordered-list',
    group: '列表',
    keywords: 'ordered list 有序 编号',
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'task',
    label: '待办列表',
    description: '可以勾选的任务',
    icon: 'task',
    group: '列表',
    keywords: 'task todo 待办 勾选',
    run: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'quote',
    label: '引用',
    description: '强调一段引文',
    icon: 'quote',
    group: '块',
    keywords: 'quote blockquote 引用',
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'code',
    label: '代码块',
    description: '带语法高亮的代码',
    icon: 'code-block',
    group: '块',
    keywords: 'code block 代码',
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'divider',
    label: '分割线',
    description: '分隔上下内容',
    icon: 'divider',
    group: '块',
    keywords: 'divider hr 分割线',
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'table',
    label: '表格',
    description: '插入一个 3×3 表格',
    icon: 'table',
    group: '插入',
    keywords: 'table 表格',
    run: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'image',
    label: '图片',
    description: '上传到 GitHub 仓库',
    icon: 'image',
    group: '插入',
    keywords: 'image picture 图片 上传',
    run: () => undefined,
  },
];

interface SlashState {
  from: number;
  to: number;
  query: string;
  top: number;
  left: number;
}

interface Props {
  editor: Editor;
  onPickImage: () => void;
}

const MENU_WIDTH = 300;

export function SlashMenu({ editor, onPickImage }: Props) {
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [active, setActive] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sync = () => {
      if (editor.isDestroyed) return;
      const { state, view } = editor;
      const { $from, empty } = state.selection;
      if (!empty) {
        setSlash(null);
        return;
      }
      const parentName = $from.parent.type.name;
      if (parentName !== 'paragraph' && parentName !== 'heading') {
        setSlash(null);
        return;
      }
      const text = $from.parent.textBetween(0, $from.parentOffset, undefined, '\uFFFC');
      const match = /(?:^|\s)\/([^\s/]*)$/.exec(text);
      if (!match) {
        setSlash(null);
        return;
      }
      const query = match[1];
      const coords = view.coordsAtPos($from.pos);
      const left = Math.min(coords.left, window.innerWidth - MENU_WIDTH - 16);
      const top =
        coords.bottom + 360 > window.innerHeight ? Math.max(16, coords.top - 368) : coords.bottom + 8;
      setSlash({
        from: $from.pos - query.length - 1,
        to: $from.pos,
        query,
        top,
        left: Math.max(12, left),
      });
      setActive(0);
    };

    const close = () => setSlash(null);
    const closeOnScroll = () => close();

    editor.on('update', sync);
    editor.on('selectionUpdate', sync);
    editor.on('focus', sync);
    window.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', close, true);
    sync();

    return () => {
      editor.off('update', sync);
      editor.off('selectionUpdate', sync);
      editor.off('focus', sync);
      window.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', close, true);
    };
  }, [editor]);

  const items = useMemo(() => {
    const query = slash?.query.trim().toLowerCase() ?? '';
    if (!query) return ITEMS;
    return ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.keywords.toLowerCase().includes(query),
    );
  }, [slash?.query]);

  useEffect(() => {
    if (!slash) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        setActive((index) => (items.length ? (index + 1) % items.length : 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        setActive((index) => (items.length ? (index - 1 + items.length) % items.length : 0));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        const item = items[active];
        if (item) execute(item);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setSlash(null);
      }
    };

    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slash, items, active]);

  useEffect(() => {
    if (!slash) return;
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setSlash(null);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [slash]);

  const execute = (item: SlashItem) => {
    if (!slash) return;
    const range = { from: slash.from, to: slash.to };
    setSlash(null);
    editor.chain().focus().deleteRange(range).run();
    if (item.id === 'image') {
      onPickImage();
      return;
    }
    item.run(editor);
  };

  if (!slash) return null;

  const groups = [...new Set(items.map((item) => item.group))];

  return createPortal(
    <div
      ref={menuRef}
      className="slash-menu"
      style={{ top: slash.top, left: slash.left, width: MENU_WIDTH }}
      role="listbox"
      aria-label="插入内容"
    >
      {items.length === 0 && <div className="slash-menu__empty">没有匹配的块</div>}
      {groups.map((group) => (
        <div className="slash-menu__group" key={group}>
          <div className="slash-menu__group-label">{group}</div>
          {items
            .filter((item) => item.group === group)
            .map((item) => {
              const index = items.indexOf(item);
              return (
                <button
                  type="button"
                  key={item.id}
                  className="slash-menu__item"
                  data-active={index === active}
                  role="option"
                  aria-selected={index === active}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    execute(item);
                  }}
                  onMouseEnter={() => setActive(index)}
                >
                  <span className="slash-menu__icon">
                    <Icon name={item.icon} size={17} />
                  </span>
                  <span className="slash-menu__text">
                    <span className="slash-menu__label">{item.label}</span>
                    <span className="slash-menu__desc">{item.description}</span>
                  </span>
                </button>
              );
            })}
        </div>
      ))}
      <div className="slash-menu__footer">
        <kbd>↑</kbd>
        <kbd>↓</kbd>
        选择
        <kbd>↵</kbd>
        插入
        <kbd>esc</kbd>
        关闭
      </div>
    </div>,
    document.body,
  );
}
