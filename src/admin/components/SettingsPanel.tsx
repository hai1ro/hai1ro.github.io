import { Button, Input, Switch, TextArea } from '@douyinfe/semi-ui';
import type { PostFrontmatter } from '@/lib/frontmatter';
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

  return (
    <div className="settings-panel">
      <div className="settings-panel__grid">
        <label className="settings-field settings-field--full">
          <span className="settings-field__label">摘要</span>
          <TextArea
            value={frontmatter.description}
            onChange={(value) => onChange({ description: value })}
            placeholder="用一两句话介绍这篇文章，会显示在列表和 SEO 描述里。"
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
              ? '文章创建后 slug 不可修改，避免链接失效。'
              : slugInvalid
                ? '只能使用小写字母、数字和连字符。'
                : slugTaken
                  ? '这个 slug 已被占用。'
                  : '保存后不可修改。'}
          </span>
        </label>

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

        <div className="settings-field">
          <span className="settings-field__label">推荐到首页</span>
          <div className="settings-field__switch">
            <Switch
              checked={frontmatter.featured}
              onChange={(checked) => onChange({ featured: checked })}
            />
            <span>在首页的文章列表中优先展示</span>
          </div>
        </div>

        <div className="settings-field">
          <span className="settings-field__label">更新时间</span>
          <span className="settings-field__value">{frontmatter.updated ?? '首次保存后自动记录'}</span>
        </div>
      </div>

      {canDelete && (
        <div className="settings-panel__danger">
          <div>
            <strong>删除这篇文章</strong>
            <p>会从 GitHub 仓库中删除对应的 Markdown 文件。删除后需要构建站点，网站才会移除该文章。</p>
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
