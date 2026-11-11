import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://hai1ro.github.io');
  const body = `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${new URL('sitemap-index.xml', base).href}\n`;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
