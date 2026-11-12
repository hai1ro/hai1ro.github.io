import { blogConfig } from '@/config/blog';
import {
  CONTENT_TYPE_LABEL,
  emptyFrontmatter,
  parsePostSource,
  stringifyPostSource,
  type PostFrontmatter,
} from '@/lib/frontmatter';
import { isValidSlug } from '@/lib/slug';
import { todayISO } from '@/lib/date';
import { GitHubClient, GitHubError } from '../github/client';
import { bytesToBase64, sha256Hex } from '../github/base64';

export interface PostSummary {
  slug: string;
  path: string;
  sha: string;
  size: number;
  frontmatter: PostFrontmatter;
  error?: string;
}

export interface PostDocument {
  slug: string;
  path: string;
  sha: string;
  frontmatter: PostFrontmatter;
  body: string;
  extra: Record<string, unknown>;
}

export interface SavePostOptions {
  slug: string;
  frontmatter: PostFrontmatter;
  body: string;
  extra: Record<string, unknown>;
  sha?: string;
  isNew: boolean;
}

export interface SavePostResult {
  sha: string;
  path: string;
  frontmatter: PostFrontmatter;
}

const CACHE_TTL = 30_000;

let cache: { key: string; at: number; posts: PostSummary[] } | null = null;

export function invalidatePostCache(): void {
  cache = null;
}

export function postPath(slug: string): string {
  return `${blogConfig.contentDir}/${slug}.md`;
}

export function githubFileUrl(client: GitHubClient, path: string): string {
  return `https://github.com/${client.owner}/${client.repo}/blob/${client.branch}/${path}`;
}

export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await mapper(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function summaryFromSource(
  slug: string,
  path: string,
  sha: string,
  size: number,
  source: string,
): PostSummary {
  try {
    const parsed = parsePostSource(source);
    return { slug, path, sha, size, frontmatter: parsed.frontmatter };
  } catch (error) {
    return {
      slug,
      path,
      sha,
      size,
      frontmatter: { ...emptyFrontmatter(), title: slug, date: todayISO() },
      error: error instanceof Error ? error.message : '文章解析失败',
    };
  }
}

/** 列出仓库中的全部 Markdown 文章（带 30 秒缓存） */
export async function listPosts(client: GitHubClient, force = false): Promise<PostSummary[]> {
  if (!force && cache && cache.key === client.cacheKey && Date.now() - cache.at < CACHE_TTL) {
    return cache.posts;
  }

  let entries;
  try {
    entries = await client.listDirectory(blogConfig.contentDir);
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) {
      cache = { key: client.cacheKey, at: Date.now(), posts: [] };
      return [];
    }
    throw error;
  }

  const files = entries.filter(
    (entry) => entry.type === 'file' && /\.mdx?$/i.test(entry.name),
  );

  const posts = await mapLimit(files, 4, async (entry) => {
    const slug = entry.name.replace(/\.mdx?$/i, '');
    try {
      const file = await client.getFile(entry.path);
      return summaryFromSource(slug, entry.path, entry.sha, entry.size, file.text);
    } catch (error) {
      if (error instanceof GitHubError && error.status === 401) throw error;
      return {
        slug,
        path: entry.path,
        sha: entry.sha,
        size: entry.size,
        frontmatter: { ...emptyFrontmatter(), title: slug, date: todayISO() },
        error: error instanceof Error ? error.message : '读取文件失败',
      };
    }
  });

  posts.sort((a, b) => b.frontmatter.date.localeCompare(a.frontmatter.date));
  cache = { key: client.cacheKey, at: Date.now(), posts };
  return posts;
}

/** 读取一篇文章的完整内容 */
export async function loadDocument(client: GitHubClient, slug: string): Promise<PostDocument> {
  const summary = (await listPosts(client)).find((post) => post.slug === slug);
  if (!summary) throw new Error(`文章「${slug}」不存在，可能已被删除。`);
  if (summary.error) throw new Error(summary.error);

  const file = await client.getFile(summary.path);
  const parsed = parsePostSource(file.text);

  return {
    slug,
    path: summary.path,
    sha: file.sha,
    frontmatter: parsed.frontmatter,
    body: parsed.body,
    extra: parsed.extra,
  };
}

export async function saveDocument(
  client: GitHubClient,
  options: SavePostOptions,
): Promise<SavePostResult> {
  const slug = options.slug.trim();
  if (!isValidSlug(slug)) {
    throw new Error('Slug 只能包含小写字母、数字和连字符，且不能以连字符开头或结尾。');
  }

  const frontmatter: PostFrontmatter = {
    ...options.frontmatter,
    title:
      options.frontmatter.type === 'article'
        ? options.frontmatter.title.trim() || '无标题'
        : options.frontmatter.title.trim(),
    images: options.frontmatter.images.map((image) => image.trim()).filter(Boolean),
  };

  if (options.frontmatter.type === 'article' && !options.frontmatter.title.trim()) {
    throw new Error('请先填写文章标题。');
  }
  if (frontmatter.type === 'diary' && !options.body.trim()) {
    throw new Error('日记内容不能为空。');
  }
  if (frontmatter.type === 'photo' && frontmatter.images.length === 0) {
    throw new Error('照片内容至少需要一张图片。');
  }

  if (!options.isNew) {
    const today = todayISO();
    frontmatter.updated = frontmatter.date === today ? undefined : today;
  }

  const path = postPath(slug);
  const content = stringifyPostSource(frontmatter, options.body, options.extra);
  const action = options.isNew ? '新建' : '更新';
  const label = CONTENT_TYPE_LABEL[frontmatter.type];
  const name = frontmatter.title || slug;
  const message = `post: ${action}${label}《${name}》`;

  const result = await client.putFile({
    path,
    content,
    message,
    sha: options.isNew ? undefined : options.sha,
  });

  invalidatePostCache();

  // 所有保存都只提交，不构建。构建由后台的「构建站点」按钮显式触发。
  return {
    sha: result.content.sha,
    path: result.content.path,
    frontmatter,
  };
}

export async function deleteDocument(
  client: GitHubClient,
  post: { path: string; sha: string; title: string },
): Promise<void> {
  await client.deleteFile({
    path: post.path,
    sha: post.sha,
    message: `post: 删除《${post.title}》`,
  });
  invalidatePostCache();
  // 删除也只提交；需要时由「构建站点」统一构建
}

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

export interface UploadedImage {
  url: string;
  path: string;
  sha: string;
}

/**
 * 上传图片到仓库的 public 目录。文件名使用内容哈希，天然去重。
 * 出于安全考虑不允许上传 SVG（可能包含可执行脚本）。
 */
export async function uploadImage(
  client: GitHubClient,
  file: File,
): Promise<UploadedImage> {
  const extension = ALLOWED_IMAGE_TYPES[file.type];
  if (!extension) {
    throw new Error('只支持 PNG、JPEG、WebP、GIF 或 AVIF 图片。');
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('图片不能超过 4 MB。');
  }

  const buffer = await file.arrayBuffer();
  const hash = (await sha256Hex(buffer)).slice(0, 16);
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const filename = `${hash}.${extension}`;
  const path = `${blogConfig.imageDir}/${year}/${month}/${filename}`;
  const url = `${blogConfig.imageUrlBase}/${year}/${month}/${filename}`;
  const content = bytesToBase64(new Uint8Array(buffer));

  try {
    const result = await client.putFile({
      path,
      content,
      isBase64: true,
      message: `chore: 上传图片 ${filename}`,
    });
    return { url, path, sha: result.content.sha };
  } catch (error) {
    // 内容寻址：同名文件通常意味着同样的图片已经上传过
    if (error instanceof GitHubError && error.status === 422) {
      try {
        const existing = await client.getFile(path);
        return { url, path, sha: existing.sha };
      } catch {
        throw error;
      }
    }
    throw error;
  }
}
