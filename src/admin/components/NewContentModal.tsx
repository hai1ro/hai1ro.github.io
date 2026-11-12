import { Modal } from '@douyinfe/semi-ui';
import type { ContentType } from '@/lib/frontmatter';
import { Icon, type IconName } from './icons';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onPick: (type: ContentType) => void;
}

interface Option {
  type: ContentType;
  title: string;
  description: string;
  icon: IconName;
  hint: string;
}

const OPTIONS: Option[] = [
  {
    type: 'article',
    title: '文章',
    description: '适合较长、有结构的内容。支持 Markdown、标题、列表、代码、表格和封面。',
    icon: 'book',
    hint: 'Markdown',
  },
  {
    type: 'diary',
    title: '日记',
    description: '一段简单的文字，不需要标题和排版。适合记录当天的心情和碎片想法。',
    icon: 'text',
    hint: '纯文本',
  },
  {
    type: 'photo',
    title: '照片',
    description: '选择一张或多张图片，可以配一段说明。图片会自动按网格排列。',
    icon: 'image',
    hint: '1–9 张',
  },
];

export function NewContentModal({ visible, onCancel, onPick }: Props) {
  return (
    <Modal
      visible={visible}
      title="新建内容"
      footer={null}
      width={760}
      onCancel={onCancel}
      className="new-content-modal"
    >
      <p className="new-content-modal__lead">
        选择要发布的内容类型。不同类型的编辑器会显示不同的输入方式。
      </p>
      <div className="new-content-grid">
        {OPTIONS.map((option) => (
          <button
            key={option.type}
            type="button"
            className="new-content-card"
            onClick={() => onPick(option.type)}
          >
            <span className="new-content-card__icon">
              <Icon name={option.icon} size={22} />
            </span>
            <span className="new-content-card__title">
              {option.title}
              <em>{option.hint}</em>
            </span>
            <span className="new-content-card__desc">{option.description}</span>
            <span className="new-content-card__action">开始编写 →</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
