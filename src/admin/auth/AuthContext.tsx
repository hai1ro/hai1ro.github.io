import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { blogConfig } from '@/config/blog';
import { GitHubClient } from '../github/client';
import { invalidatePostCache } from '../data/posts';
import type { GitHubRepoInfo, GitHubUser } from '../github/types';
import { requestOAuthToken } from './oauth';

export type AuthMode = 'oauth' | 'pat';
export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

export interface AdminSession {
  token: string;
  mode: AuthMode;
  user: GitHubUser;
  repo: GitHubRepoInfo;
  canPush: boolean;
}

interface StoredSession {
  token: string;
  mode: AuthMode;
}

interface LoginOptions {
  mode?: AuthMode;
  remember?: boolean;
}

interface AuthContextValue {
  status: AuthStatus;
  session: AdminSession | null;
  client: GitHubClient | null;
  error: string | null;
  clearError: () => void;
  loginWithToken: (token: string, options?: LoginOptions) => Promise<AdminSession>;
  loginWithOAuth: (options?: LoginOptions) => Promise<AdminSession>;
  logout: () => void;
}

const STORAGE_KEY = 'hai1ro-admin-session';

const AuthContext = createContext<AuthContextValue | null>(null);

function readStored(): StoredSession | null {
  const raw = sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.token || (parsed.mode !== 'oauth' && parsed.mode !== 'pat')) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(stored: StoredSession, remember: boolean): void {
  clearStored();
  const raw = JSON.stringify(stored);
  if (remember) localStorage.setItem(STORAGE_KEY, raw);
  else sessionStorage.setItem(STORAGE_KEY, raw);
}

function clearStored(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
}

async function buildSession(token: string, mode: AuthMode): Promise<AdminSession> {
  const client = new GitHubClient(
    token,
    blogConfig.owner,
    blogConfig.repo,
    blogConfig.branch,
  );
  const [user, repo] = await Promise.all([client.getViewer(), client.getRepo()]);

  if (repo.permissions?.push !== true) {
    throw new Error(
      `当前账号（${user.login}）没有 ${blogConfig.owner}/${blogConfig.repo} 的写权限。` +
        '请确认令牌包含 repo（Classic）或 Contents: Read and write（Fine-grained）权限。',
    );
  }

  return { token, mode, user, repo, canPush: true };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<AdminSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const stored = readStored();

    if (!stored) {
      setStatus('anonymous');
      return;
    }

    buildSession(stored.token, stored.mode)
      .then((next) => {
        if (cancelled) return;
        invalidatePostCache();
        setSession(next);
        setStatus('authenticated');
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        clearStored();
        setStatus('anonymous');
        setError(
          reason instanceof Error
            ? `上次的登录状态已失效：${reason.message}`
            : '上次的登录状态已失效，请重新登录。',
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loginWithToken = useCallback(
    async (token: string, options: LoginOptions = {}) => {
      const trimmed = token.trim();
      if (!trimmed) throw new Error('请输入 GitHub 访问令牌。');

      const next = await buildSession(trimmed, options.mode ?? 'pat');
      invalidatePostCache();
      writeStored({ token: trimmed, mode: next.mode }, options.remember ?? false);
      setSession(next);
      setStatus('authenticated');
      setError(null);
      return next;
    },
    [],
  );

  const loginWithOAuth = useCallback(
    async (options: LoginOptions = {}) => {
      if (!blogConfig.oauthProxyUrl) {
        throw new Error('OAuth 代理尚未配置。');
      }
      const token = await requestOAuthToken(blogConfig.oauthProxyUrl);
      return loginWithToken(token, { ...options, mode: 'oauth' });
    },
    [loginWithToken],
  );

  const logout = useCallback(() => {
    clearStored();
    invalidatePostCache();
    setSession(null);
    setStatus('anonymous');
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const client = useMemo(
    () =>
      session
        ? new GitHubClient(
            session.token,
            blogConfig.owner,
            blogConfig.repo,
            blogConfig.branch,
          )
        : null,
    [session],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      client,
      error,
      clearError,
      loginWithToken,
      loginWithOAuth,
      logout,
    }),
    [status, session, client, error, clearError, loginWithToken, loginWithOAuth, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth 必须在 AuthProvider 内使用。');
  return value;
}
