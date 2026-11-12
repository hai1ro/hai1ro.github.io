import { parse, stringify } from 'yaml';
import { toISODate, todayISO } from './date';

/** 内容类型：文章、日记、照片。后续可以继续扩展。 */
export type ContentType = 'article' | 'diary' | 'photo';

export const CONTENT_TYPES: ContentType[] = ['article', 'diary', 'photo'];

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  article: '文章',
  diary: '日记',
  photo: '照片',
};

export interface PostFrontmatter {
  type: ContentType;
  title: string;
  description: string;
  date: string;
  updated?: string;
  tags: string[];
  cover?: string;
  coverAlt?: string;
  /** 照片型内容使用的图片列表 */
  images: string[];
  draft: boolean;
  featured: boolean;
}

export interface ParsedPostSource {
  frontmatter: PostFrontmatter;
  /** 正文（不含 frontmatter） */
  body: string;
  /** 保留 frontmatter 中本系统不认识的字段，保存时原样写回 */
  extra: Record<string, unknown>;
  hasFrontmatter: boolean;
}

const KNOWN_KEYS = new Set([
  'type',
  'title',
  'description',
  'date',
  'updated',
  'tags',
  'cover',
  'coverAlt',
  'images',
  'draft',
  'featured',
]);

export function isContentType(value: unknown): value is ContentType {
  return value === 'article' || value === 'diary' || value === 'photo';
}

export const emptyFrontmatter = (type: ContentType = 'article'): PostFrontmatter => ({
  type,
  title: '',
  description: '',
  date: todayISO(),
  tags: [],
  images: [],
  draft: true,
  featured: false,
});

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => asString(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,，]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && 'src' in item) {
        return asString((item as { src?: unknown }).src).trim();
      }
      return '';
    })
    .filter(Boolean);
}

/**
 * 解析带 YAML frontmatter 的 Markdown 源文件。
 * 没有 frontmatter 时也会返回可用的默认值，方便导入旧文章。
 */
export function parsePostSource(source: string): ParsedPostSource {
  const normalized = source.replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(normalized);
  let data: Record<string, unknown> = {};
  let body = normalized;
  const hasFrontmatter = Boolean(match);

  if (match) {
    body = normalized.slice(match[0].length);
    try {
      const parsed = parse(match[1]);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        data = parsed as Record<string, unknown>;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Frontmatter YAML 解析失败：${message}`);
    }
  }

  const type: ContentType = isContentType(data.type) ? data.type : 'article';
  const rawTitle = asString(data.title);

  const frontmatter: PostFrontmatter = {
    type,
    title: rawTitle || (type === 'article' ? '无标题' : ''),
    description: asString(data.description),
    date: toISODate(data.date as string | number | Date | undefined) || todayISO(),
    tags: normalizeTags(data.tags),
    images: normalizeImages(data.images),
    cover: asString(data.cover) || undefined,
    coverAlt: asString(data.coverAlt) || undefined,
    draft: data.draft === true,
    featured: data.featured === true,
  };

  const updated = toISODate(data.updated as string | number | Date | undefined);
  if (updated) frontmatter.updated = updated;

  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!KNOWN_KEYS.has(key) && value !== undefined) extra[key] = value;
  }

  return {
    frontmatter,
    body: body.replace(/^\n+/, ''),
    extra,
    hasFrontmatter,
  };
}

/** 把 frontmatter + 正文序列化为 Markdown 源文件 */
export function stringifyPostSource(
  frontmatter: PostFrontmatter,
  body: string,
  extra: Record<string, unknown> = {},
): string {
  const data: Record<string, unknown> = {};

  data.type = frontmatter.type;
  const title = frontmatter.title.trim();
  if (title) data.title = title;
  else if (frontmatter.type === 'article') data.title = '无标题';
  if (frontmatter.description.trim()) data.description = frontmatter.description.trim();
  data.date = toISODate(frontmatter.date) || todayISO();
  if (frontmatter.updated) data.updated = toISODate(frontmatter.updated);
  if (frontmatter.tags.length) data.tags = frontmatter.tags;
  if (frontmatter.images.length) data.images = frontmatter.images;
  if (frontmatter.cover) data.cover = frontmatter.cover;
  if (frontmatter.cover && frontmatter.coverAlt) data.coverAlt = frontmatter.coverAlt;
  if (frontmatter.draft) data.draft = true;
  if (frontmatter.featured) data.featured = true;

  // 保留自定义字段，但已知字段以表单值为准
  for (const [key, value] of Object.entries(extra)) {
    if (!(key in data) && !KNOWN_KEYS.has(key) && value !== undefined) {
      data[key] = value;
    }
  }

  const yamlText = stringify(data, { lineWidth: 0 }).trimEnd();
  const cleanBody = body.replace(/^\n+/, '').trimEnd();
  return `---\n${yamlText}\n---\n\n${cleanBody}\n`;
}

/** 修改 frontmatter 时自动维护 updated 字段 */
export function touchUpdated(frontmatter: PostFrontmatter): PostFrontmatter {
  const today = todayISO();
  if (frontmatter.date === today) return frontmatter;
  return { ...frontmatter, updated: today };
}
