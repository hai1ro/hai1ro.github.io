import { blogConfig } from '@/config/blog';
import {
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
  /** 保存前是否已发布；用于判断“取消发布”是否需要重新构建 */
  wasPublished?: boolean;
}

export interface SavePostResult {
  sha: string;
  path: string;
  frontmatter: PostFrontmatter;
  /** 是否已主动触发 Pages 构建 */
  dispatched: boolean;
  /** 构建触发失败时的提示（文件已经提交成功） */
  dispatchError?: string;
}

async function dispatchAfterChange(
  client: GitHubClient,
): Promise<{ dispatched: boolean; dispatchError?: string }> {
  try {
    await client.dispatchBlogPublish();
    return { dispatched: true };
  } catch (error) {
    return {
      dispatched: false,
      dispatchError:
        error instanceof Error
          ? error.message
          : '无法触发 GitHub Actions，请到 Actions 页面手动运行部署。',
    };
  }
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
    title: options.frontmatter.title.trim() || '无标题',
  };

  if (!options.isNew) {
    const today = todayISO();
    frontmatter.updated = frontmatter.date === today ? undefined : today;
  }

  const path = postPath(slug);
  const content = stringifyPostSource(frontmatter, options.body, options.extra);
  const action = options.isNew ? '新建' : '更新';
  const message = `post: ${action}《${frontmatter.title}》`;

  const result = await client.putFile({
    path,
    content,
    message,
    sha: options.isNew ? undefined : options.sha,
  });

  invalidatePostCache();

  // 草稿只提交，不触发 Actions；只有发布状态才主动触发 Pages 构建
  const visibilityChanged = Boolean(options.wasPublished) && frontmatter.draft;
  const shouldDeploy = !frontmatter.draft || visibilityChanged;
  const deployment = shouldDeploy
    ? await dispatchAfterChange(client)
    : { dispatched: false as const };

  return {
    sha: result.content.sha,
    path: result.content.path,
    frontmatter,
    ...deployment,
  };
}

export async function deleteDocument(
  client: GitHubClient,
  post: { path: string; sha: string; title: string; published: boolean },
): Promise<{ dispatched: boolean; dispatchError?: string }> {
  await client.deleteFile({
    path: post.path,
    sha: post.sha,
    message: `post: 删除《${post.title}》`,
  });
  invalidatePostCache();

  // 删除草稿不触发构建；删除已发布文章才需要重新构建
  return post.published
    ? dispatchAfterChange(client)
    : { dispatched: false };
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
