/**
 * 极小的 GitHub OAuth 代理（Cloudflare Worker，无依赖）。
 *
 * 为什么需要它：GitHub OAuth 的 code → access_token 交换必须携带 client_secret，
 * 静态站点不能安全地保存这个密钥。Worker 只做两件事：
 *   1. /authorize  校验来源后，跳转到 GitHub 授权页；
 *   2. /callback   用 code 换取 token，通过 postMessage 把 token 发回管理后台。
 *
 * 环境变量：
 *   GITHUB_CLIENT_ID      GitHub OAuth App 的 Client ID
 *   GITHUB_CLIENT_SECRET  通过 wrangler secret put 设置
 *   ALLOWED_ORIGINS       允许的来源，逗号分隔（不要带结尾斜杠）
 *   GITHUB_SCOPE          可选，默认 "repo read:user"
 *   OAUTH_CALLBACK_URL    可选，自定义回调地址（默认 <worker-origin>/callback）
 */

const encoder = new TextEncoder();
const STATE_TTL_MS = 10 * 60 * 1000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (url.pathname === '/health') {
      return json(
        {
          ok: true,
          service: 'hai1ro-blog-oauth',
          configured: isConfigured(env),
        },
        200,
        request,
        env,
      );
    }

    if (url.pathname === '/authorize') {
      if (request.method !== 'GET') return methodNotAllowed();
      return authorize(url, env);
    }

    if (url.pathname === '/callback') {
      if (request.method !== 'GET') return methodNotAllowed();
      return callback(url, env);
    }

    if (url.pathname === '/') {
      return json(
        { service: 'hai1ro-blog-oauth', endpoints: ['/authorize', '/callback', '/health'] },
        200,
        request,
        env,
      );
    }

    return json({ error: 'not_found' }, 404, request, env);
  },
};

async function authorize(url, env) {
  const origin = normalizeOrigin(url.searchParams.get('origin'));
  const clientState = url.searchParams.get('state') ?? '';

  if (!origin || !isAllowedOrigin(origin, env)) {
    return errorPage('来源未授权', '这个站点不在 Worker 的 ALLOWED_ORIGINS 白名单中。', 400);
  }
  if (!clientState || clientState.length > 200) {
    return errorPage('请求无效', '缺少有效的 state 参数。', 400);
  }
  if (!isConfigured(env)) {
    return errorPage(
      'Worker 尚未配置',
      '请设置 GITHUB_CLIENT_ID，并通过 wrangler secret put 设置 GITHUB_CLIENT_SECRET。',
      500,
    );
  }

  const payload = base64UrlEncode(
    JSON.stringify({ o: origin, s: clientState, t: Date.now() }),
  );
  const signature = await hmac(env.GITHUB_CLIENT_SECRET, payload);
  const state = `${payload}.${signature}`;

  const target = new URL('https://github.com/login/oauth/authorize');
  target.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  target.searchParams.set('redirect_uri', callbackUrl(url, env));
  target.searchParams.set('scope', env.GITHUB_SCOPE || 'repo read:user');
  target.searchParams.set('state', state);
  target.searchParams.set('allow_signup', 'true');

  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

async function callback(url, env) {
  const signedState = url.searchParams.get('state') ?? '';
  const code = url.searchParams.get('code') ?? '';

  const state = await verifyState(signedState, env.GITHUB_CLIENT_SECRET);
  if (!state) {
    return errorPage('登录状态无效', 'state 校验失败或已过期，请回到管理后台重新登录。', 400);
  }
  if (!isAllowedOrigin(state.o, env)) {
    return errorPage('来源未授权', '该来源不在 ALLOWED_ORIGINS 白名单中。', 400, `${state.o}/admin/`);
  }
  if (!code) {
    return errorPage('授权未完成', 'GitHub 没有返回授权码，请重新尝试登录。', 400, `${state.o}/admin/`);
  }

  let payload;
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'hai1ro-blog-oauth',
      },
      body: new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: callbackUrl(url, env),
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const text = await response.text();
    payload = JSON.parse(text);
  } catch (error) {
    console.error('GitHub token exchange failed', error);
    return errorPage('连接 GitHub 失败', '无法完成授权交换，请稍后重试。', 502, `${state.o}/admin/`);
  }

  if (!payload || payload.error || !payload.access_token) {
    const reason = payload?.error_description || payload?.error || 'unknown_error';
    console.error('GitHub OAuth error', reason);
    return errorPage(
      'GitHub 授权失败',
      reason === 'bad_verification_code'
        ? '授权码无效或已过期，请回到管理后台重新登录。'
        : 'GitHub 拒绝了这次授权，请检查 OAuth App 配置后重试。',
      400,
      `${state.o}/admin/`,
    );
  }

  return successPage(String(payload.access_token), state.s, state.o);
}

async function verifyState(signedState, secret) {
  if (!secret || typeof signedState !== 'string') return null;
  const dot = signedState.lastIndexOf('.');
  if (dot <= 0) return null;

  const payload = signedState.slice(0, dot);
  const signature = signedState.slice(dot + 1);
  const expected = await hmac(secret, payload);
  if (!timingSafeEqual(signature, expected)) return null;

  try {
    const data = JSON.parse(base64UrlDecode(payload));
    if (!data || typeof data.o !== 'string' || typeof data.s !== 'string') return null;
    if (typeof data.t !== 'number' || Date.now() - data.t > STATE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function isConfigured(env) {
  return Boolean(
    env.GITHUB_CLIENT_ID &&
      env.GITHUB_CLIENT_SECRET &&
      !String(env.GITHUB_CLIENT_ID).startsWith('REPLACE_'),
  );
}

function callbackUrl(url, env) {
  return env.OAUTH_CALLBACK_URL || `${url.origin}/callback`;
}

function normalizeOrigin(value) {
  if (!value) return '';
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

function isAllowedOrigin(origin, env) {
  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return allowed.includes(origin);
}

async function hmac(secret, payload) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

function base64UrlEncode(value) {
  const bytes = encoder.encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function jsString(value) {
  return JSON.stringify(String(value))
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function successPage(token, clientState, origin) {
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GitHub 授权成功</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
    background: #fbf9f4; color: #201d19;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Noto Sans CJK SC", sans-serif; }
  .card { width: min(420px, 100%); padding: 32px; border: 1px solid #e6dfd2; border-radius: 18px;
    background: #fffdf9; text-align: center; box-shadow: 0 20px 50px -30px rgba(66,48,28,.3); }
  .mark { width: 44px; height: 44px; margin: 0 auto 18px; display: grid; place-items: center;
    border: 1px solid #201d19; border-radius: 50%; font-family: Georgia, serif; font-size: 24px; }
  h1 { margin: 0 0 8px; font-family: Georgia, "Noto Serif CJK SC", serif; font-size: 24px; font-weight: 600; }
  p { margin: 0; color: #5d564c; font-size: 13px; line-height: 1.7; }
  .hint { margin-top: 16px; color: #938a7c; font-size: 11px; }
  @media (prefers-color-scheme: dark) {
    body { background: #141311; color: #ece6db; }
    .card { background: #211f1b; border-color: #302c26; }
    p { color: #b2aa9d; }
    .mark { border-color: #ece6db; }
  }
</style>
</head>
<body>
  <div class="card">
    <div class="mark">H</div>
    <h1>授权成功</h1>
    <p id="message">正在返回管理后台…</p>
    <p class="hint" id="hint">如果没有自动关闭，可以手动关闭此窗口。</p>
  </div>
  <script>
    (function () {
      var token = ${jsString(token)};
      var state = ${jsString(clientState)};
      var origin = ${jsString(origin)};
      var message = document.getElementById('message');
      try {
        if (window.opener) {
          window.opener.postMessage({ type: 'github-oauth', token: token, state: state }, origin);
          message.textContent = '登录成功，正在关闭窗口…';
          setTimeout(function () { window.close(); }, 500);
        } else {
          message.textContent = '没有找到管理后台窗口，请关闭此页面并从 /admin 重新登录。';
          document.getElementById('hint').textContent = '为了安全，token 不会显示在这个页面上。';
        }
      } catch (error) {
        message.textContent = '无法把登录结果传回管理后台，请重试。';
      }
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy':
        "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'",
    },
  });
}

function errorPage(title, description, status, returnUrl) {
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
    background: #fbf9f4; color: #201d19;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; }
  .card { width: min(440px, 100%); padding: 30px; border: 1px solid #e6dfd2; border-radius: 16px;
    background: #fffdf9; }
  .badge { display: inline-block; margin-bottom: 12px; padding: 3px 9px; border-radius: 999px;
    background: #f7e6dd; color: #b23f22; font-size: 11px; font-weight: 600; }
  h1 { margin: 0 0 8px; font-family: Georgia, "Noto Serif CJK SC", serif; font-size: 23px; }
  p { margin: 0; color: #5d564c; font-size: 13px; line-height: 1.75; }
  a { display: inline-block; margin-top: 20px; color: #b23f22; font-size: 12px; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge">OAuth Error</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    ${returnUrl ? `<a href="${escapeHtml(returnUrl)}">返回管理后台</a>` : ''}
  </div>
</body>
</html>`;

  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
    },
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') ?? '';
  if (!origin || !isAllowedOrigin(origin, env)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function json(data, status, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(request, env),
    },
  });
}

function methodNotAllowed() {
  return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json; charset=utf-8', Allow: 'GET' },
  });
}
