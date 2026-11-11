import { decodeBase64Utf8, encodeBase64Utf8 } from './base64';
import type {
  GitHubContentFile,
  GitHubDeleteResult,
  GitHubDirectoryEntry,
  GitHubRepoInfo,
  GitHubUser,
  GitHubWriteResult,
} from './types';

const API_BASE = 'https://api.github.com';

export class GitHubError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
    this.details = details;
  }
}

function encodePath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function describeError(status: number, data: unknown, headers: Headers): string {
  const payload = data && typeof data === 'object' ? (data as { message?: string }) : null;
  const apiMessage = payload?.message ?? '';

  if (status === 401) return 'GitHub 登录已失效，请重新登录。';
  if (status === 403) {
    if (headers.get('x-ratelimit-remaining') === '0') {
      const reset = headers.get('x-ratelimit-reset');
      const when = reset
        ? new Date(Number(reset) * 1000).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';
      return `GitHub API 请求次数已用完${when ? `，将在 ${when} 重置` : ''}。请稍后再试。`;
    }
    return '当前账号没有执行此操作的权限。';
  }
  if (status === 404) return '文件或仓库不存在，或者当前账号没有访问权限。';
  if (status === 409) return '文件已在其他地方被修改，请刷新后重试。';
  if (status === 422) {
    if (/sha/i.test(apiMessage)) return '文件已在其他地方被修改（SHA 不匹配），请刷新后重试。';
    return apiMessage || '提交内容未通过 GitHub 校验。';
  }
  if (status >= 500) return 'GitHub 服务暂时不可用，请稍后再试。';
  return apiMessage || `GitHub API 请求失败（${status}）。`;
}

export class GitHubClient {
  readonly token: string;
  readonly owner: string;
  readonly repo: string;
  readonly branch: string;

  constructor(token: string, owner: string, repo: string, branch: string) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
  }

  get cacheKey(): string {
    return `${this.owner}/${this.repo}@${this.branch}`;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
        },
        signal: controller.signal,
      });

      const text = await response.text();
      const data = text ? safeJson(text) : null;

      if (!response.ok) {
        throw new GitHubError(
          describeError(response.status, data, response.headers),
          response.status,
          data,
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof GitHubError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new GitHubError('请求超时，请检查网络后重试。', 0);
      }
      throw new GitHubError(
        error instanceof Error ? `网络请求失败：${error.message}` : '网络请求失败。',
        0,
      );
    } finally {
      window.clearTimeout(timeout);
    }
  }

  getViewer(): Promise<GitHubUser> {
    return this.request<GitHubUser>('/user');
  }

  getRepo(): Promise<GitHubRepoInfo> {
    return this.request<GitHubRepoInfo>(
      `/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}`,
    );
  }

  async listDirectory(path: string): Promise<GitHubDirectoryEntry[]> {
    const data = await this.request<GitHubDirectoryEntry[] | GitHubDirectoryEntry>(
      `/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/contents/${encodePath(path)}?ref=${encodeURIComponent(this.branch)}`,
    );
    return Array.isArray(data) ? data : [];
  }

  async getFile(path: string): Promise<GitHubContentFile & { text: string }> {
    const data = await this.request<GitHubContentFile>(
      `/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/contents/${encodePath(path)}?ref=${encodeURIComponent(this.branch)}`,
    );
    if (!data || data.type !== 'file' || typeof data.content !== 'string') {
      throw new GitHubError('目标路径不是一个可读取的文件。', 400);
    }
    return { ...data, text: decodeBase64Utf8(data.content) };
  }

  putFile(options: {
    path: string;
    content: string;
    message: string;
    sha?: string;
    isBase64?: boolean;
  }): Promise<GitHubWriteResult> {
    const body: Record<string, unknown> = {
      message: options.message,
      content: options.isBase64 ? options.content : encodeBase64Utf8(options.content),
      branch: this.branch,
    };
    if (options.sha) body.sha = options.sha;

    return this.request<GitHubWriteResult>(
      `/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/contents/${encodePath(options.path)}`,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      },
    );
  }

  deleteFile(options: {
    path: string;
    message: string;
    sha: string;
  }): Promise<GitHubDeleteResult> {
    return this.request<GitHubDeleteResult>(
      `/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/contents/${encodePath(options.path)}`,
      {
        method: 'DELETE',
        body: JSON.stringify({
          message: options.message,
          sha: options.sha,
          branch: this.branch,
        }),
      },
    );
  }
}
