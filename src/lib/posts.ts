import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import { countText } from './text';

export type Post = CollectionEntry<'posts'>;

/**
 * 构建时获取文章。开发环境显示草稿，生产构建自动排除。
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
