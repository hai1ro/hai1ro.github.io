import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { fileURLToPath } from 'node:url';

const site = process.env.PUBLIC_SITE_URL || 'https://hai1ro.github.io';

// https://astro.build/config
export default defineConfig({
  site,
  trailingSlash: 'ignore',
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/admin'),
    }),
  ],
  markdown: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'wrap',
          properties: { className: ['heading-anchor'] },
        },
      ],
    ],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark-dimmed',
      },
      wrap: true,
    },
  },
  vite: {
    ssr: {
      // Semi UI 在 ESM 入口里直接 import CSS，需要交给 Vite 处理
      noExternal: ['@douyinfe/semi-ui', '@douyinfe/semi-icons'],
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        // Semi UI 2.104 的 package exports 没有暴露 dist/css，用别名直接指向文件
        'semi-ui-css': fileURLToPath(
          new URL('./node_modules/@douyinfe/semi-ui/dist/css/semi.min.css', import.meta.url),
        ),
      },
    },
    build: {
      chunkSizeWarningLimit: 2000,
    },
  },
});
