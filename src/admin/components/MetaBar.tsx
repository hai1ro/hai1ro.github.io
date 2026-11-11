import { DatePicker, Switch, TagInput } from '@douyinfe/semi-ui';
import { parseDateOnly, toISODate } from '@/lib/date';
import type { PostFrontmatter } from '@/lib/frontmatter';
import { Icon } from './icons';

interface Props {
  frontmatter: PostFrontmatter;
  onChange: (patch: Partial<PostFrontmatter>) => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  slug: string;
}

export function MetaBar({ frontmatter, onChange, settingsOpen, onToggleSettings, slug }: Props) {
  return (
    <div className="meta-bar">
      <div className="meta-bar__item meta-bar__date">
        <span className="meta-bar__label">日期</span>
        <DatePicker
          type="date"
          size="small"
          format="yyyy-MM-dd"
          value={parseDateOnly(frontmatter.date)}
          onChange={(date) => {
            if (date instanceof Date) onChange({ date: toISODate(date) });
          }}
          className="meta-date-picker"
        />
      </div>

      <div className="meta-bar__item meta-bar__tags">
        <span className="meta-bar__label">标签</span>
        <TagInput
          size="small"
          value={frontmatter.tags}
          onChange={(tags) => onChange({ tags })}
          placeholder="添加标签，回车确认"
          showClear={false}
          className="meta-tag-input"
        />
      </div>

      <div className="meta-bar__item">
        <span className="meta-bar__label">状态</span>
        <div className={`meta-status ${frontmatter.draft ? 'is-draft' : 'is-live'}`}>
          <Switch
            size="small"
            checked={!frontmatter.draft}
            onChange={(checked) => onChange({ draft: !checked })}
            aria-label="切换发布状态"
          />
          <span>{frontmatter.draft ? '草稿' : '已发布'}</span>
        </div>
      </div>

      <div className="meta-bar__spacer" />

      <span className="meta-bar__slug" title={`/posts/${slug}/`}>
        /{slug}
      </span>

      <button
        type="button"
        className="meta-bar__settings"
        data-active={settingsOpen}
        onClick={onToggleSettings}
        aria-expanded={settingsOpen}
      >
        <Icon name="settings" size={15} />
        文章设置
      </button>
    </div>
  );
}
