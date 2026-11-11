interface OAuthMessage {
  type?: string;
  token?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

function randomState(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * 打开 OAuth 代理弹窗，等待 worker 通过 postMessage 把 token 回传。
 * GitHub 的 token 交换需要 client_secret，必须由 worker/ 目录中的代理完成。
 */
export function requestOAuthToken(proxyUrl: string): Promise<string> {
  const base = proxyUrl.replace(/\/+$/, '');
  if (!base) return Promise.reject(new Error('尚未配置 OAuth 代理地址。'));

  let proxyOrigin: string;
  try {
    proxyOrigin = new URL(base).origin;
  } catch {
    return Promise.reject(new Error('OAuth 代理地址格式不正确。'));
  }

  const state = randomState();
  const url = new URL(`${base}/authorize`);
  url.searchParams.set('origin', window.location.origin);
  url.searchParams.set('state', state);

  const popup = window.open(
    url.toString(),
    'hai1ro-github-oauth',
    'popup=yes,width=640,height=760,left=120,top=80',
  );

  if (!popup) {
    return Promise.reject(new Error('登录窗口被浏览器拦截了，请允许弹窗后重试。'));
  }

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let poll = 0;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisibility);
    };

    const finish = (error: Error | null, token?: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        if (!popup.closed) popup.close();
      } catch {
        /* 忽略跨域关闭异常 */
      }
      if (error) reject(error);
      else resolve(token ?? '');
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== proxyOrigin) return;
      const data = event.data as OAuthMessage | null;
      if (!data || data.type !== 'github-oauth' || data.state !== state) return;
      if (data.error) {
        finish(new Error(data.error_description || data.error));
        return;
      }
      if (data.token) finish(null, data.token);
    };

    const onVisibility = () => {
      if (popup.closed) {
        finish(new Error('登录窗口已关闭，请重新尝试。'));
      }
    };

    const timer = window.setTimeout(
      () => finish(new Error('登录超时（5 分钟），请重新尝试。')),
      5 * 60 * 1000,
    );
    poll = window.setInterval(() => {
      if (popup.closed) {
        finish(new Error('登录窗口已关闭，请重新尝试。'));
      }
    }, 800);

    window.addEventListener('message', onMessage);
    document.addEventListener('visibilitychange', onVisibility);
  });
}
