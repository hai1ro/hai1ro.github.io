import type { RefObject } from 'react';
import type { MarkdownEditorHandle } from './MarkdownEditor';
import { Icon } from '../components/icons';

interface Props {
  editorRef: RefObject<MarkdownEditorHandle | null>;
  onPickImage: () => void;
}

const TABLE = '| 列 1 | 列 2 |\n| --- | --- |\n|  |  |';
const CODE_BLOCK = '```\n\n```';

export function MarkdownToolbar({ editorRef, onPickImage }: Props) {
  const withEditor = (action: (editor: MarkdownEditorHandle) => void) => () => {
    const editor = editorRef.current;
    if (editor) action(editor);
  };

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Markdown 工具栏">
      <div className="editor-toolbar__scroll">
        <div className="editor-toolbar__group">
          <button
            type="button"
            className="editor-toolbar__btn"
            title="撤销 ⌘Z"
            onClick={withEditor((editor) => editor.undo())}
          >
            <Icon name="undo" size={16} />
          </button>
          <button
            type="button"
            className="editor-toolbar__btn"
            title="重做 ⇧⌘Z"
            onClick={withEditor((editor) => editor.redo())}
          >
            <Icon name="redo" size={16} />
          </button>
        </div>

        <div className="editor-toolbar__group">
          {[1, 2, 3].map((level) => (
            <button
              key={level}
              type="button"
              className="editor-toolbar__btn"
              title={`标题 ${level}`}
              onClick={withEditor((editor) => editor.setHeading(level as 1 | 2 | 3))}
            >
              <span>H{level}</span>
            </button>
          ))}
        </div>

        <div className="editor-toolbar__group">
          <button
            type="button"
            className="editor-toolbar__btn"
            title="加粗 ⌘B"
            onClick={withEditor((editor) => editor.wrapSelection('**', '**', '粗体'))}
          >
            <Icon name="bold" size={16} />
          </button>
          <button
            type="button"
            className="editor-toolbar__btn"
            title="斜体 ⌘I"
            onClick={withEditor((editor) => editor.wrapSelection('*', '*', '斜体'))}
          >
            <Icon name="italic" size={16} />
          </button>
          <button
            type="button"
            className="editor-toolbar__btn"
            title="删除线"
            onClick={withEditor((editor) => editor.wrapSelection('~~', '~~', '删除线'))}
          >
            <Icon name="strike" size={16} />
          </button>
          <button
            type="button"
            className="editor-toolbar__btn"
            title="行内代码 ⌘E"
            onClick={withEditor((editor) => editor.wrapSelection('`', '`', '代码'))}
          >
            <Icon name="code" size={16} />
          </button>
        </div>

        <div className="editor-toolbar__group">
          <button
            type="button"
            className="editor-toolbar__btn"
            title="引用"
            onClick={withEditor((editor) => editor.togglePrefix('> '))}
          >
            <Icon name="quote" size={16} />
          </button>
          <button
            type="button"
            className="editor-toolbar__btn"
            title="无序列表"
            onClick={withEditor((editor) => editor.togglePrefix('- '))}
          >
            <Icon name="list" size={16} />
          </button>
          <button
            type="button"
            className="editor-toolbar__btn"
            title="有序列表"
            onClick={withEditor((editor) => editor.togglePrefix('1. '))}
          >
            <Icon name="ordered-list" size={16} />
          </button>
          <button
            type="button"
            className="editor-toolbar__btn"
            title="待办列表"
            onClick={withEditor((editor) => editor.togglePrefix('- [ ] '))}
          >
            <Icon name="task" size={16} />
          </button>
        </div>

        <div className="editor-toolbar__group">
          <button
            type="button"
            className="editor-toolbar__btn"
            title="链接 ⌘K"
            onClick={withEditor((editor) => editor.wrapSelection('[', '](https://)', '链接文字'))}
          >
            <Icon name="link" size={16} />
          </button>
          <button
            type="button"
            className="editor-toolbar__btn"
            title="图片"
            onClick={onPickImage}
          >
            <Icon name="image" size={16} />
          </button>
          <button
            type="button"
            className="editor-toolbar__btn"
            title="代码块"
            onClick={withEditor((editor) => editor.insertBlock(CODE_BLOCK))}
          >
            <Icon name="code-block" size={16} />
          </button>
          <button
            type="button"
            className="editor-toolbar__btn"
            title="表格"
            onClick={withEditor((editor) => editor.insertBlock(TABLE))}
          >
            <Icon name="table" size={16} />
          </button>
          <button
            type="button"
            className="editor-toolbar__btn"
            title="分割线"
            onClick={withEditor((editor) => editor.insertBlock('---'))}
          >
            <Icon name="divider" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
