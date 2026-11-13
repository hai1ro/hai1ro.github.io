import type { APIRoute } from 'astro';
import { getAllPosts, postExcerpt, postTitle, readingMinutes, contentTypeLabel } from '@/lib/posts';
import { toISODate } from '@/lib/date';
import { deriveDescription } from '@/lib/text';

/**
 * 站内搜索索引。构建时生成静态 JSON，浏览器端按需加载。
 * 只读取已有内容，不生成任何新内容。
 */
export const prerender = true;

export const GET: APIRoute = async () => {
  const posts = await getAllPosts();
  const items = posts.map((post) => ({
    slug: post.id,
    type: post.data.type,
    typeLabel: contentTypeLabel(post.data.type),
    title: postTitle(post),
    excerpt: postExcerpt(post, 110),
    text: deriveDescription(post.body ?? '', 600),
    tags: post.data.tags,
    date: toISODate(post.data.date),
    minutes: readingMinutes(post),
    cover: post.data.cover ?? post.data.images[0] ?? null,
  }));

  return new Response(JSON.stringify({ items }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
