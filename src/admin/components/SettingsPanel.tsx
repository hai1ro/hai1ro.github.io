import { Button, Input, Switch, TextArea } from '@douyinfe/semi-ui';
import { CONTENT_TYPE_LABEL, type PostFrontmatter } from '@/lib/frontmatter';
import { isValidSlug } from '@/lib/slug';
import { Icon } from './icons';
import type { RefObject } from 'react';

interface Props {
  frontmatter: PostFrontmatter;
  onChange: (patch: Partial<PostFrontmatter>) => void;
  slug: string;
  onSlugChange: (slug: string) => void;
  slugLocked: boolean;
  existingSlugs: string[];
  coverInputRef: RefObject<HTMLInputElement>;
  coverUploading: boolean;
  onSelectCover: (file: File) => void;
  onRemoveCover: () => void;
  onDeriveDescription: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

export function SettingsPanel({
  frontmatter,
  onChange,
  slug,
  onSlugChange,
  slugLocked,
  existingSlugs,
  coverInputRef,
  coverUploading,
  onSelectCover,
  onRemoveCover,
  onDeriveDescription,
  onDelete,
  canDelete,
}: Props) {
  const slugInvalid = slug.length > 0 && !isValidSlug(slug);
  const slugTaken = !slugLocked && existingSlugs.includes(slug);
  const isArticle = frontmatter.type === 'article';
  const isPhoto = frontmatter.type === 'photo';
  const typeLabel = CONTENT_TYPE_LABEL[frontmatter.type];

  return (
    <div className="settings-panel">
      <div className="settings-panel__grid">
        <label className="settings-field settings-field--full">
          <span className="settings-field__label">
            {isArticle ? '摘要' : '说明 / 摘要'}
          </span>
          <TextArea
            value={frontmatter.description}
            onChange={(value) => onChange({ description: value })}
            placeholder={
              isArticle
                ? '用一两句话介绍这篇文章，会显示在列表和 SEO 描述里。'
                : '可选。留空时使用正文自动生成摘要。'
            }
            autosize={{ minRows: 2, maxRows: 4 }}
          />
          <button type="button" className="settings-field__action" onClick={onDeriveDescription}>
            <Icon name="sparkles" size={14} />
            从正文生成
          </button>
        </label>

        <label className="settings-field">
          <span className="settings-field__label">Slug（文件名）</span>
          <Input
            value={slug}
            onChange={onSlugChange}
            disabled={slugLocked}
            prefix="/posts/"
            suffix=".md"
            validateStatus={slugInvalid || slugTaken ? 'error' : 'default'}
            placeholder="my-post"
          />
          <span className="settings-field__hint">
            {slugLocked
              ? '内容创建后 slug 不可修改，避免链接失效。'
              : slugInvalid
                ? '只能使用小写字母、数字和连字符。'
                : slugTaken
                  ? '这个 slug 已被占用。'
                  : '保存后不可修改。'}
          </span>
        </label>

        {isArticle && (
          <label className="settings-field">
            <span className="settings-field__label">封面图</span>
            <Input
              value={frontmatter.cover ?? ''}
              onChange={(value) => onChange({ cover: value || undefined })}
              placeholder="https://… 或 /images/…"
            />
            <div className="settings-field__cover-actions">
              <Button
                size="small"
                icon={<Icon name="upload" size={14} />}
                loading={coverUploading}
                onClick={() => coverInputRef.current?.click()}
              >
                上传
              </Button>
              {frontmatter.cover && (
                <Button size="small" type="tertiary" onClick={onRemoveCover}>
                  移除
                </Button>
              )}
              {frontmatter.cover && (
                <Input
                  size="small"
                  value={frontmatter.coverAlt ?? ''}
                  onChange={(value) => onChange({ coverAlt: value || undefined })}
                  placeholder="封面替代文字"
                  className="settings-field__cover-alt"
                />
              )}
            </div>
            {frontmatter.cover && (
              <img className="settings-field__cover-preview" src={frontmatter.cover} alt="" />
            )}
          </label>
        )}

        {isArticle && (
          <div className="settings-field">
            <span className="settings-field__label">推荐到首页</span>
            <div className="settings-field__switch">
              <Switch
                checked={frontmatter.featured}
                onChange={(checked) => onChange({ featured: checked })}
              />
              <span>在首页动态流中优先展示</span>
            </div>
          </div>
        )}

        {isPhoto && (
          <div className="settings-field">
            <span className="settings-field__label">照片</span>
            <span className="settings-field__value">
              {frontmatter.images.length} 张 · 在编辑器里拖动排序
            </span>
          </div>
        )}

        <div className="settings-field">
          <span className="settings-field__label">更新时间</span>
          <span className="settings-field__value">{frontmatter.updated ?? '首次保存后自动记录'}</span>
        </div>
      </div>

      {canDelete && (
        <div className="settings-panel__danger">
          <div>
            <strong>删除这条{typeLabel}</strong>
            <p>会从 GitHub 仓库中删除对应的 Markdown 文件。删除后需要构建站点，网站才会移除。</p>
          </div>
          <Button type="danger" icon={<Icon name="trash" size={15} />} onClick={onDelete}>
            删除
          </Button>
        </div>
      )}

      <input
        ref={coverInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelectCover(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}
