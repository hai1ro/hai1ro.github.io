import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { siteConfig } from '@/config/site';
import { contentTypeLabel, getAllPosts, postExcerpt, postTitle } from '@/lib/posts';

export async function GET(context: APIContext) {
  const posts = await getAllPosts();
  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: context.site ?? 'https://hai1ro.github.io',
    items: posts.map((post) => ({
      title: postTitle(post),
      pubDate: post.data.date,
      description: postExcerpt(post, 200),
      link: `/posts/${post.id}/`,
      categories: [contentTypeLabel(post.data.type), ...post.data.tags],
    })),
    customData: '<language>zh-CN</language>',
  });
}
