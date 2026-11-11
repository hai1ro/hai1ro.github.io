import { useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import CharacterCount from '@tiptap/extension-character-count';
import { createLowlight, common } from 'lowlight';
import { markdownToHtml } from '@/lib/markdown';

const lowlight = createLowlight(common);

function buildExtensions() {
  return [
    StarterKit.configure({
      codeBlock: false,
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      },
    }),
    Image.configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: { class: 'editor-image' },
    }),
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === 'heading') return '标题';
        return '输入 / 唤起命令，或直接开始写…';
      },
      showOnlyWhenEditable: true,
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true, lastColumnResizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    CodeBlockLowlight.configure({ lowlight }),
    CharacterCount.configure({ limit: 500_000 }),
  ];
}

export interface UseBlogEditorOptions {
  initialMarkdown: string;
  onImageUpload: (file: File) => Promise<string>;
  onImageError?: (error: unknown) => void;
}

/**
 * 创建 Tiptap 编辑器。图片粘贴/拖拽会自动上传到 GitHub 仓库。
 */
export function useBlogEditor({
  initialMarkdown,
  onImageUpload,
  onImageError,
}: UseBlogEditorOptions): Editor | null {
  const editor = useEditor({
    extensions: buildExtensions(),
    content: markdownToHtml(initialMarkdown),
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: 'tiptap',
        spellcheck: 'false',
      },
      handlePaste(view, event) {
        const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
          file.type.startsWith('image/'),
        );
        if (!files.length) return false;

        event.preventDefault();
        const file = files[0];
        const position = view.state.selection.from;

        onImageUpload(file)
          .then((url) => {
            const imageNode = view.state.schema.nodes.image?.create({ src: url });
            if (!imageNode) return;
            view.dispatch(view.state.tr.insert(position, imageNode));
          })
          .catch((error) => onImageError?.(error));

        return true;
      },
      handleDrop(view, event) {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((file) =>
          file.type.startsWith('image/'),
        );
        if (!files.length) return false;

        event.preventDefault();
        const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
        const position = coordinates?.pos ?? view.state.selection.from;

        onImageUpload(files[0])
          .then((url) => {
            const imageNode = view.state.schema.nodes.image?.create({ src: url });
            if (!imageNode) return;
            view.dispatch(view.state.tr.insert(position, imageNode));
          })
          .catch((error) => onImageError?.(error));

        return true;
      },
    },
  });

  return editor;
}
