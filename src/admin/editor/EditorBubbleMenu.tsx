import { useRef, useState } from 'react';
import { Input, Modal } from '@douyinfe/semi-ui';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { Icon, type IconName } from '../components/icons';

interface Props {
  editor: Editor;
}

interface FormatButton {
  id: string;
  icon: IconName;
  title: string;
  isActive: () => boolean;
  run: () => void;
}

const BUBBLE_OPTIONS = { placement: 'top', offset: 8 } as const;

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^(\/|#|mailto:|https?:\/\/)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function EditorBubbleMenu({ editor }: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState('');
  const rangeRef = useRef<{ from: number; to: number } | null>(null);

  const openLinkEditor = () => {
    const { from, to } = editor.state.selection;
    rangeRef.current = { from, to };
    setHref((editor.getAttributes('link').href as string | undefined) ?? '');
    setLinkOpen(true);
  };

  const applyLink = () => {
    const chain = editor.chain().focus();
    if (rangeRef.current) chain.setTextSelection(rangeRef.current);
    const value = normalizeUrl(href);
    if (!value) {
      chain.extendMarkRange('link').unsetLink().run();
    } else {
      chain.extendMarkRange('link').setLink({ href: value }).run();
    }
    setLinkOpen(false);
  };

  const closeLinkEditor = () => {
    setLinkOpen(false);
    editor.commands.focus();
  };

  const buttons: FormatButton[] = [
    {
      id: 'bold',
      icon: 'bold',
      title: '加粗 ⌘B',
      isActive: () => editor.isActive('bold'),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      id: 'italic',
      icon: 'italic',
      title: '斜体 ⌘I',
      isActive: () => editor.isActive('italic'),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      id: 'underline',
      icon: 'underline',
      title: '下划线 ⌘U',
      isActive: () => editor.isActive('underline'),
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      id: 'strike',
      icon: 'strike',
      title: '删除线',
      isActive: () => editor.isActive('strike'),
      run: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      id: 'code',
      icon: 'code',
      title: '行内代码',
      isActive: () => editor.isActive('code'),
      run: () => editor.chain().focus().toggleCode().run(),
    },
  ];

  return (
    <>
      <BubbleMenu editor={editor} className="bubble-menu" options={BUBBLE_OPTIONS}>
        {buttons.map((button) => (
          <button
            key={button.id}
            type="button"
            className="bubble-menu__btn"
            data-active={button.isActive()}
            title={button.title}
            aria-label={button.title}
            onMouseDown={(event) => event.preventDefault()}
            onClick={button.run}
          >
            <Icon name={button.icon} size={16} />
          </button>
        ))}
        <span className="bubble-menu__sep" />
        <button
          type="button"
          className="bubble-menu__btn"
          data-active={editor.isActive('link')}
          title="链接"
          aria-label="链接"
          onMouseDown={(event) => event.preventDefault()}
          onClick={openLinkEditor}
        >
          <Icon name="link" size={16} />
        </button>
      </BubbleMenu>

      <Modal
        visible={linkOpen}
        onCancel={closeLinkEditor}
        title="插入链接"
        okText="应用"
        cancelText="取消"
        onOk={applyLink}
        width={420}
        className="link-modal"
      >
        <p className="link-modal__hint">留空并应用可以移除选中的链接。</p>
        <Input
          autoFocus
          value={href}
          onChange={setHref}
          placeholder="https://example.com"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              applyLink();
            }
          }}
        />
      </Modal>
    </>
  );
}
