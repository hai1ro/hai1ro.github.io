// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

// @ts-ignore Worker 是纯 JavaScript，没有类型声明
import worker from '../worker/oauth-worker.js';

const env = {
  GITHUB_CLIENT_ID: 'test-client-id',
  GITHUB_CLIENT_SECRET: 'test-client-secret',
  ALLOWED_ORIGINS: 'https://hai1ro.github.io,http://localhost:4321',
  GITHUB_SCOPE: 'repo read:user',
};

const workerOrigin = 'https://oauth.example.workers.dev';
const siteOrigin = 'https://hai1ro.github.io';

function authorizeUrl(origin = siteOrigin, state = 'client-state-123') {
  const url = new URL('/authorize', workerOrigin);
  url.searchParams.set('origin', origin);
  url.searchParams.set('state', state);
  return url.toString();
}

interface AuthorizedState {
  state: string;
}

async function beginFlow(): Promise<AuthorizedState> {
  const response = await worker.fetch(new Request(authorizeUrl()), env);
  expect(response.status).toBe(302);
  const location = response.headers.get('location');
  expect(location).toBeTruthy();
  const target = new URL(location as string);
  const state = target.searchParams.get('state');
  expect(state).toBeTruthy();
  return { state: state as string };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('oauth worker', () => {
  it('redirects to GitHub with a signed state and callback', async () => {
    const response = await worker.fetch(new Request(authorizeUrl()), env);
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get('location') as string);
    expect(location.origin).toBe('https://github.com');
    expect(location.pathname).toBe('/login/oauth/authorize');
    expect(location.searchParams.get('client_id')).toBe(env.GITHUB_CLIENT_ID);
    expect(location.searchParams.get('redirect_uri')).toBe(`${workerOrigin}/callback`);
    expect(location.searchParams.get('scope')).toBe('repo read:user');
    expect(location.searchParams.get('state')?.split('.')).toHaveLength(2);
  });

  it('rejects unknown origins', async () => {
    const response = await worker.fetch(
      new Request(authorizeUrl('https://evil.example')),
      env,
    );
    expect(response.status).toBe(400);
    const html = await response.text();
    expect(html).toContain('来源未授权');
    expect(html).not.toContain('github.com/login/oauth/authorize');
  });

  it('accepts origins with a trailing slash in configuration', async () => {
    const response = await worker.fetch(new Request(authorizeUrl()), {
      ...env,
      ALLOWED_ORIGINS: 'https://hai1ro.github.io/,http://localhost:4321/',
    });
    expect(response.status).toBe(302);
  });

  it('exchanges the code and posts the token to the allowed origin', async () => {
    const { state } = await beginFlow();
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ access_token: 'gho_test_token', token_type: 'bearer', scope: 'repo' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const callback = new URL('/callback', workerOrigin);
    callback.searchParams.set('code', 'test-code');
    callback.searchParams.set('state', state);

    const response = await worker.fetch(new Request(callback.toString()), env);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-security-policy')).toContain("script-src 'unsafe-inline'");

    const html = await response.text();
    expect(html).toContain('gho_test_token');
    expect(html).toContain(`postMessage({ type: 'github-oauth'`);
    expect(html).toContain(siteOrigin);
    expect(html).toContain('client-state-123');
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://github.com/login/oauth/access_token');
    expect(String(init.body)).toContain('client_secret=test-client-secret');
    expect(String(init.body)).toContain('code=test-code');
  });

  it('rejects tampered state', async () => {
    const { state } = await beginFlow();
    const tampered = `${state.slice(0, -2)}ff`;
    const callback = new URL('/callback', workerOrigin);
    callback.searchParams.set('code', 'test-code');
    callback.searchParams.set('state', tampered);

    const response = await worker.fetch(new Request(callback.toString()), env);
    expect(response.status).toBe(400);
    const html = await response.text();
    expect(html).toContain('登录状态无效');
    expect(html).not.toContain('gho_test_token');
  });

  it('rejects a missing authorization code', async () => {
    const { state } = await beginFlow();
    const callback = new URL('/callback', workerOrigin);
    callback.searchParams.set('state', state);

    const response = await worker.fetch(new Request(callback.toString()), env);
    expect(response.status).toBe(400);
    expect(await response.text()).toContain('授权未完成');
  });

  it('shows a friendly error when GitHub rejects the code', async () => {
    const { state } = await beginFlow();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: 'bad_verification_code' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const callback = new URL('/callback', workerOrigin);
    callback.searchParams.set('code', 'expired-code');
    callback.searchParams.set('state', state);

    const response = await worker.fetch(new Request(callback.toString()), env);
    expect(response.status).toBe(400);
    const html = await response.text();
    expect(html).toContain('授权码无效或已过期');
    expect(html).toContain(`${siteOrigin}/admin/`);
  });

  it('reports health and configuration without leaking secrets', async () => {
    const response = await worker.fetch(
      new Request(`${workerOrigin}/health`, { headers: { Origin: siteOrigin } }),
      env,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe(siteOrigin);
    const data = await response.json();
    expect(data).toMatchObject({ ok: true, configured: true });
    expect(JSON.stringify(data)).not.toContain('test-client-secret');
  });

  it('only allows GET for the authorize endpoint', async () => {
    const response = await worker.fetch(
      new Request(authorizeUrl(), { method: 'POST' }),
      env,
    );
    expect(response.status).toBe(405);
  });
});
