import type { Editor } from '@tiptap/react';
import { Icon, type IconName } from '../components/icons';

interface ToolButton {
  id: string;
  icon?: IconName;
  label?: string;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface Props {
  editor: Editor;
  onPickImage: () => void;
}

const CODE_LANGUAGES = [
  { value: '', label: '纯文本' },
  { value: 'js', label: 'JavaScript' },
  { value: 'ts', label: 'TypeScript' },
  { value: 'tsx', label: 'TSX' },
  { value: 'jsx', label: 'JSX' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
];

export function EditorToolbar({ editor, onPickImage }: Props) {
  const inTable = editor.isActive('table');
  const inCodeBlock = editor.isActive('codeBlock');

  const groups: ToolButton[][] = [
    [
      {
        id: 'undo',
        icon: 'undo',
        title: '撤销 ⌘Z',
        disabled: !editor.can().undo(),
        onClick: () => editor.chain().focus().undo().run(),
      },
      {
        id: 'redo',
        icon: 'redo',
        title: '重做 ⇧⌘Z',
        disabled: !editor.can().redo(),
        onClick: () => editor.chain().focus().redo().run(),
      },
    ],
    [1, 2, 3].map((level) => ({
      id: `h${level}`,
      label: `H${level}`,
      title: `标题 ${level}`,
      active: editor.isActive('heading', { level }),
      onClick: () =>
        editor
          .chain()
          .focus()
          .toggleHeading({ level: level as 1 | 2 | 3 })
          .run(),
    })),
    [
      {
        id: 'bold',
        icon: 'bold',
        title: '加粗 ⌘B',
        active: editor.isActive('bold'),
        onClick: () => editor.chain().focus().toggleBold().run(),
      },
      {
        id: 'italic',
        icon: 'italic',
        title: '斜体 ⌘I',
        active: editor.isActive('italic'),
        onClick: () => editor.chain().focus().toggleItalic().run(),
      },
      {
        id: 'strike',
        icon: 'strike',
        title: '删除线',
        active: editor.isActive('strike'),
        onClick: () => editor.chain().focus().toggleStrike().run(),
      },
      {
        id: 'code',
        icon: 'code',
        title: '行内代码',
        active: editor.isActive('code'),
        onClick: () => editor.chain().focus().toggleCode().run(),
      },
    ],
    [
      {
        id: 'bullet',
        icon: 'list',
        title: '无序列表',
        active: editor.isActive('bulletList'),
        onClick: () => editor.chain().focus().toggleBulletList().run(),
      },
      {
        id: 'ordered',
        icon: 'ordered-list',
        title: '有序列表',
        active: editor.isActive('orderedList'),
        onClick: () => editor.chain().focus().toggleOrderedList().run(),
      },
      {
        id: 'task',
        icon: 'task',
        title: '待办列表',
        active: editor.isActive('taskList'),
        onClick: () => editor.chain().focus().toggleTaskList().run(),
      },
    ],
    [
      {
        id: 'quote',
        icon: 'quote',
        title: '引用',
        active: editor.isActive('blockquote'),
        onClick: () => editor.chain().focus().toggleBlockquote().run(),
      },
      {
        id: 'codeBlock',
        icon: 'code-block',
        title: '代码块',
        active: inCodeBlock,
        onClick: () => editor.chain().focus().toggleCodeBlock().run(),
      },
      {
        id: 'divider',
        icon: 'divider',
        title: '分割线',
        onClick: () => editor.chain().focus().setHorizontalRule().run(),
      },
    ],
    [
      {
        id: 'image',
        icon: 'image',
        title: '插入图片',
        onClick: onPickImage,
      },
      {
        id: 'table',
        icon: 'table',
        title: '插入表格',
        onClick: () =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      },
    ],
  ];

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="格式工具栏">
      <div className="editor-toolbar__scroll">
        {groups.map((group, index) => (
          <div className="editor-toolbar__group" key={index}>
            {group.map((button) => (
              <button
                key={button.id}
                type="button"
                className="editor-toolbar__btn"
                data-active={button.active ?? false}
                disabled={button.disabled}
                title={button.title}
                aria-label={button.title}
                aria-pressed={button.active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={button.onClick}
              >
                {button.icon ? <Icon name={button.icon} size={16} /> : <span>{button.label}</span>}
              </button>
            ))}
          </div>
        ))}

        {inCodeBlock && (
          <div className="editor-toolbar__group">
            <select
              className="editor-toolbar__select"
              aria-label="代码语言"
              value={(editor.getAttributes('codeBlock').language as string) ?? ''}
              onChange={(event) =>
                editor.chain().focus().updateAttributes('codeBlock', {
                  language: event.target.value,
                }).run()
              }
            >
              {CODE_LANGUAGES.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {inTable && (
          <div className="editor-toolbar__group editor-toolbar__group--table">
            <button
              type="button"
              className="editor-toolbar__text-btn"
              title="在下方添加一行"
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              + 行
            </button>
            <button
              type="button"
              className="editor-toolbar__text-btn"
              title="在右侧添加一列"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              + 列
            </button>
            <button
              type="button"
              className="editor-toolbar__text-btn editor-toolbar__text-btn--danger"
              title="删除表格"
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              删表
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
