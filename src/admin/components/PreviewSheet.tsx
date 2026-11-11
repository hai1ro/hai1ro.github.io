import { SideSheet } from '@douyinfe/semi-ui';
import { formatDateCN } from '@/lib/date';
import type { PostFrontmatter } from '@/lib/frontmatter';

interface Props {
  visible: boolean;
  onClose: () => void;
  html: string;
  frontmatter: PostFrontmatter;
  slug: string;
  cover?: string;
}

export function PreviewSheet({ visible, onClose, html, frontmatter, slug, cover }: Props) {
  return (
    <SideSheet
      visible={visible}
      onCancel={onClose}
      width={760}
      title="文章预览"
      className="preview-sheet"
      closeOnEsc
    >
      <article className="preview-article">
        <div className="preview-article__meta">
          <span>{formatDateCN(frontmatter.date)}</span>
          <span>·</span>
          <span>/{slug}</span>
        </div>
        <h1>{frontmatter.title || '无标题'}</h1>
        {frontmatter.description && (
          <p className="preview-article__desc">{frontmatter.description}</p>
        )}
        {cover && <img className="preview-article__cover" src={cover} alt="" />}
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </SideSheet>
  );
}
