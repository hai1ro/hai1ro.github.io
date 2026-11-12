import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import { countText, deriveDescription } from './text';
import { formatDateCN } from './date';
import {
  CONTENT_TYPE_LABEL,
  type ContentType,
} from './frontmatter';

export type Post = CollectionEntry<'posts'>;

/**
 * 构建时获取内容。开发环境显示草稿，生产构建自动排除。
 */
export async function getAllPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) =>
    import.meta.env.PROD ? !data.draft : true,
  );
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function postHref(post: Post): string {
  return `/posts/${post.id}/`;
}

export function tagHref(tag: string): string {
  return `/posts/?tag=${encodeURIComponent(tag)}`;
}

export function contentType(post: Post): ContentType {
  return post.data.type;
}

export function contentTypeLabel(type: ContentType): string {
  return CONTENT_TYPE_LABEL[type];
}

/** 文章用标题；日记和照片没有标题时给出日期标题。 */
export function postTitle(post: Post): string {
  const title = post.data.title?.trim();
  if (title) return title;
  if (post.data.type === 'diary') return `${formatDateCN(post.data.date)}的日记`;
  if (post.data.type === 'photo') return `${formatDateCN(post.data.date)}的照片`;
  return '无标题';
}

export function postExcerpt(post: Post, max = 160): string {
  if (post.data.description?.trim()) return post.data.description.trim();
  if (post.data.type === 'article') return deriveDescription(post.body ?? '', max);
  return deriveDescription(post.body ?? '', max);
}

export interface TagCount {
  name: string;
  count: number;
}

export function collectTags(posts: Post[]): TagCount[] {
  const map = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
}

export function countByType(posts: Post[]): Record<ContentType, number> {
  const result: Record<ContentType, number> = { article: 0, diary: 0, photo: 0 };
  for (const post of posts) result[post.data.type] += 1;
  return result;
}

export function readingMinutes(post: Post): number {
  return countText(post.body ?? '').minutes;
}

export function postDescription(post: Post): string {
  return post.data.description || '';
}

export function featuredPosts(posts: Post[], limit = 3): Post[] {
  const featured = posts.filter((post) => post.data.featured);
  const rest = posts.filter((post) => !post.data.featured);
  return [...featured, ...rest].slice(0, limit);
}
