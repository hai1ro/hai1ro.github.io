import { useState, type FormEvent } from 'react';
import { Button, Checkbox, Input } from '@douyinfe/semi-ui';
import { useAuth } from '../auth/AuthContext';
import { blogConfig, isOAuthConfigured, repoUrl } from '@/config/blog';
import { Icon } from './icons';
import { OAuthSetupModal } from './OAuthSetupModal';

export function LoginScreen() {
  const {
    loginWithOAuth,
    loginWithToken,
    error: authError,
    clearError,
  } = useAuth();

  const [token, setToken] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPat, setShowPat] = useState(!isOAuthConfigured);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [patLoading, setPatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);

  const message = error ?? authError;

  const handleOAuth = async () => {
    if (!isOAuthConfigured) {
      setSetupOpen(true);
      return;
    }
    setError(null);
    clearError();
    setOauthLoading(true);
    try {
      await loginWithOAuth({ remember });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'GitHub 授权失败，请重试。');
    } finally {
      setOauthLoading(false);
    }
  };

  const handleTokenLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    clearError();
    setPatLoading(true);
    try {
      await loginWithToken(token, { remember });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '登录失败，请检查令牌。');
    } finally {
      setPatLoading(false);
    }
  };

  return (
    <div className="login">
      <section className="login-panel">
        <div className="login-card">
          <div className="login-card__head">
            <a className="login-home" href="/">← 返回博客</a>
            <h2>登录管理后台</h2>
            <p>
              使用 GitHub 账号授权，编辑会直接提交到{' '}
              <a href={repoUrl()} target="_blank" rel="noopener noreferrer">
                {blogConfig.owner}/{blogConfig.repo}
              </a>
              。
            </p>
          </div>

          <Button
            type="primary"
            theme="solid"
            size="large"
            block
            icon={<Icon name="github" size={18} />}
            loading={oauthLoading}
            disabled={patLoading}
            onClick={handleOAuth}
            className="login-oauth-btn"
          >
            {oauthLoading ? '正在等待 GitHub 授权…' : '使用 GitHub 登录'}
          </Button>

          {!isOAuthConfigured && (
            <p className="login-config-hint">
              <Icon name="alert" size={14} />
              OAuth 代理还未配置。
              <button type="button" onClick={() => setSetupOpen(true)}>
                查看三步部署说明
              </button>
            </p>
          )}

          {message && (
            <div className="login-error" role="alert">
              <Icon name="alert" size={16} />
              <span>{message}</span>
            </div>
          )}

          <div className="login-divider">
            <button
              type="button"
              onClick={() => {
                setShowPat((open) => !open);
                setError(null);
                clearError();
              }}
            >
              {showPat ? '收起访问令牌登录' : '或使用 Personal Access Token'}
            </button>
          </div>

          {showPat && (
            <form className="login-form" onSubmit={handleTokenLogin}>
              <label className="login-field">
                <span>GitHub Access Token</span>
                <Input
                  mode="password"
                  value={token}
                  onChange={setToken}
                  placeholder="ghp_… 或 github_pat_…"
                  autoComplete="off"
                  aria-label="GitHub Access Token"
                />
              </label>
              <label className="login-remember">
                <Checkbox
                  checked={remember}
                  onChange={(event) => setRemember(Boolean(event.target.checked))}
                >
                  在此设备上保持登录
                </Checkbox>
              </label>
              <Button
                htmlType="submit"
                type="primary"
                theme="solid"
                block
                loading={patLoading}
                disabled={oauthLoading || !token.trim()}
                icon={<Icon name="send" size={15} />}
              >
                使用令牌登录
              </Button>
              <p className="login-token-help">
                创建 Classic Token 时勾选 <code>repo</code>；Fine-grained Token 需要
                <code>Contents: Read and write</code> 权限。
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo&description=Hai1ro%20Blog%20Admin"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  去创建
                </a>
              </p>
            </form>
          )}

          <div className="login-security">
            <Icon name="alert" size={14} />
            <p>
              令牌只保存在当前浏览器（sessionStorage / localStorage），不会发送到除
              <code>api.github.com</code> 以外的任何服务器。使用完后可以在 GitHub 设置中随时撤销。
            </p>
          </div>

          <p className="login-footer">
            仅限有仓库写权限的账号使用 ·{' '}
            <a href={`${repoUrl()}#快速开始`} target="_blank" rel="noopener noreferrer">
              系统说明
            </a>
          </p>
        </div>
      </section>

      <OAuthSetupModal visible={setupOpen} onClose={() => setSetupOpen(false)} />
    </div>
  );
}
