import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Empty,
  Image,
  ImagePreview,
  Tabs,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import { relativeTime } from '@/lib/date';

const { Title, Text, Paragraph } = Typography;

export type HomeContentType = 'article' | 'diary' | 'photo';

export interface HomeProfileInfo {
  label: string;
  value: string;
  href?: string;
}

export interface HomeProfile {
  name: string;
  handle: string;
  avatar: string;
  signature: string;
  infos: HomeProfileInfo[];
}

export interface HomeItem {
  slug: string;
  type: HomeContentType;
  title: string;
  excerpt: string;
  body: string;
  dateLabel: string;
  dateISO: string;
  relativeLabel: string;
  tags: string[];
  cover?: string;
  images: string[];
  minutes: number;
  draft: boolean;
}

interface Props {
  profile: HomeProfile;
  items: HomeItem[];
  githubUrl: string;
  rssUrl: string;
}

const TYPE_META: Record<HomeContentType, { label: string; action: string; color: 'blue' | 'green' | 'purple' }> = {
  article: { label: '文章', action: '发布了文章', color: 'blue' },
  diary: { label: '日记', action: '写了一条日记', color: 'green' },
  photo: { label: '照片', action: '分享了照片', color: 'purple' },
};

const FILTERS: Array<{ key: 'all' | HomeContentType; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'article', label: '文章' },
  { key: 'diary', label: '日记' },
  { key: 'photo', label: '照片' },
];

const PAGE_SIZE = 6;

function GithubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.1 3.29 9.42 7.86 10.95.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.07.78 2.16 0 1.56-.01 2.82-.01 3.2 0 .31.21.67.8.56A11.52 11.52 0 0 0 23.5 12C23.5 5.74 18.27.5 12 .5Z"
      />
    </svg>
  );
}

export function HomePage({ profile, items, githubUrl, rssUrl }: Props) {
  const [filter, setFilter] = useState<'all' | HomeContentType>('all');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [preview, setPreview] = useState<{ images: string[]; index: number } | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const counts = useMemo(() => {
    const result = { article: 0, diary: 0, photo: 0 };
    for (const item of items) result[item.type] += 1;
    return result;
  }, [items]);

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((item) => item.type === filter)),
    [filter, items],
  );

  const visibleItems = filtered.slice(0, visible);

  const changeFilter = (key: string) => {
    setFilter(key as 'all' | HomeContentType);
    setVisible(PAGE_SIZE);
  };

  const scrollToFeed = () => {
    document.getElementById('feed')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="home">
      <section className="profile-hero" aria-labelledby="profile-name">
        <div className="profile-hero__noise" aria-hidden="true" />
        <div className="profile-hero__inner">
          <div className="profile-hero__avatar">
            <Avatar
              size="extra-large"
              src={profile.avatar}
              alt={`${profile.name} 的头像`}
              className="profile-avatar"
              imgAttr={{ referrerPolicy: 'no-referrer' }}
            />
            <span className="profile-hero__status" aria-hidden="true" />
          </div>

          <div className="profile-hero__id">
            <Title heading={2} className="profile-name" id="profile-name">
              {profile.name || profile.handle || '未命名'}
            </Title>
            {profile.handle && (
              <Text type="tertiary" className="profile-handle">
                @{profile.handle}
              </Text>
            )}
          </div>

          {profile.signature && (
            <Paragraph className="profile-signature" type="secondary">
              {profile.signature}
            </Paragraph>
          )}

          {profile.infos.length > 0 && (
            <ul className="profile-infos" aria-label="个人资料">
              {profile.infos.map((info, index) => {
                const content = (
                  <>
                    <span className="profile-info__label">{info.label}</span>
                    <span className="profile-info__value">{info.value}</span>
                  </>
                );
                return (
                  <li key={`${info.label}-${index}`}>
                    {info.href ? (
                      <a
                        className="profile-info"
                        href={info.href}
                        target={info.href.startsWith('http') ? '_blank' : undefined}
                        rel={info.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      >
                        {content}
                      </a>
                    ) : (
                      <span className="profile-info">{content}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="profile-actions">
            <Button type="primary" theme="solid" size="large" onClick={scrollToFeed}>
              看看动态
            </Button>
            <Button
              size="large"
              icon={<GithubIcon />}
              onClick={() => window.open(githubUrl, '_blank', 'noopener,noreferrer')}
            >
              GitHub
            </Button>
            <a className="profile-rss" href={rssUrl} title="订阅 RSS" aria-label="订阅 RSS">
              RSS
            </a>
          </div>
        </div>

        <a className="profile-scroll" href="#feed" aria-label="滚动到动态">
          <span>动态</span>
          <span className="profile-scroll__line" aria-hidden="true" />
        </a>
      </section>

      <section className="feed" id="feed" aria-labelledby="feed-title">
        <div className="feed__header">
          <div>
            <span className="feed__eyebrow">MOMENTS</span>
            <Title heading={3} className="feed__title" id="feed-title">
              动态
            </Title>
          </div>
          <Text type="tertiary" className="feed__count">
            {filtered.length} 条
          </Text>
        </div>

        <div className="feed-tabs-wrap">
          <Tabs
            type="line"
            size="large"
            activeKey={filter}
            onChange={changeFilter}
            className="feed-tabs"
            tabList={FILTERS.map((item) => ({
              itemKey: item.key,
              tab:
                item.key === 'all'
                  ? item.label
                  : `${item.label} ${counts[item.key as HomeContentType]}`,
            }))}
          />
        </div>

        {visibleItems.length === 0 ? (
          <div className="feed-empty">
            <Empty title="这里还没有内容" description="等第一条动态出现。" />
          </div>
        ) : (
          <div className="feed-list">
            {visibleItems.map((item) => (
              <article className="feed-card" key={item.slug}>
                <header className="feed-card__head">
                  <Avatar
                    size="small"
                    src={profile.avatar}
                    alt=""
                    imgAttr={{ referrerPolicy: 'no-referrer' }}
                  />
                  <div className="feed-card__meta">
                    <div className="feed-card__name">
                      <strong>{profile.name || profile.handle}</strong>
                      <span>{TYPE_META[item.type].action}</span>
                      {item.draft && <Tag size="small" color="orange">草稿</Tag>}
                    </div>
                    <div className="feed-card__time">
                      <time dateTime={item.dateISO}>
                        {now === null ? item.relativeLabel : relativeTime(item.dateISO, now)}
                      </time>
                      <span aria-hidden="true">·</span>
                      <span>{item.dateLabel}</span>
                    </div>
                  </div>
                  <Tag size="small" color={TYPE_META[item.type].color} className="feed-card__type">
                    {TYPE_META[item.type].label}
                  </Tag>
                </header>

                <div className="feed-card__body">
                  {item.type === 'article' ? (
                    <a className="feed-article" href={`/posts/${item.slug}/`}>
                      <div className="feed-article__text">
                        <h3>{item.title}</h3>
                        {item.excerpt && <p>{item.excerpt}</p>}
                        <span className="feed-article__more">阅读全文 →</span>
                      </div>
                      {item.cover && (
                        <div className="feed-article__cover">
                          <Image src={item.cover} alt="" preview={false} />
                        </div>
                      )}
                    </a>
                  ) : item.type === 'diary' ? (
                    <p className="feed-diary">{item.body || item.excerpt}</p>
                  ) : (
                    <div className="feed-photo">
                      <div
                        className={`feed-photo__grid feed-photo__grid--${Math.min(item.images.length, 3)}`}
                      >
                        {item.images.map((src, index) => (
                          <button
                            type="button"
                            className="feed-photo__item"
                            key={`${src}-${index}`}
                            onClick={() => setPreview({ images: item.images, index })}
                            aria-label={`查看第 ${index + 1} 张照片`}
                          >
                            <Image src={src} alt="" preview={false} />
                          </button>
                        ))}
                      </div>
                      {item.body && <p className="feed-photo__caption">{item.body}</p>}
                    </div>
                  )}
                </div>

                <footer className="feed-card__foot">
                  <div className="feed-card__stats">
                    <span>{item.minutes} 分钟</span>
                    {item.type === 'photo' && <span>{item.images.length} 张照片</span>}
                    {item.type === 'article' && <span>文章</span>}
                  </div>
                  <div className="feed-card__tags">
                    {item.tags.slice(0, 4).map((tag) => (
                      <Tag key={tag} size="small" type="ghost" className="feed-tag">
                        {tag}
                      </Tag>
                    ))}
                  </div>
                  <a className="feed-card__link" href={`/posts/${item.slug}/`}>
                    查看详情
                  </a>
                </footer>
              </article>
            ))}
          </div>
        )}

        {visible < filtered.length && (
          <div className="feed-more">
            <Button onClick={() => setVisible((value) => value + PAGE_SIZE)}>加载更多</Button>
          </div>
        )}
      </section>

      {preview && (
        <ImagePreview
          visible
          src={preview.images}
          currentIndex={preview.index}
          onVisibleChange={(next) => {
            if (!next) setPreview(null);
          }}
          onChange={(index) =>
            setPreview((current) => (current ? { ...current, index } : current))
          }
        />
      )}
    </div>
  );
}
