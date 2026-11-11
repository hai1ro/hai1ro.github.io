import { Button, Modal } from '@douyinfe/semi-ui';
import { blogConfig, repoUrl } from '@/config/blog';
import { Icon } from './icons';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const WORKER_EXAMPLE = `https://hai1ro-blog-oauth.<你的子域>.workers.dev`;

export function OAuthSetupModal({ visible, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      title="配置 GitHub 授权登录"
      footer={
        <Button theme="solid" type="primary" onClick={onClose}>
          我知道了
        </Button>
      }
      width={620}
      className="setup-modal"
    >
      <div className="setup-steps">
        <p className="setup-intro">
          GitHub 的 code → token 交换必须使用 <code>client_secret</code>，不能放在静态站点里。
          项目内置了一个很小的 Cloudflare Worker 来完成这一步；部署一次即可长期使用。
        </p>

        <section className="setup-step">
          <span className="setup-step__index">1</span>
          <div>
            <h3>创建 GitHub OAuth App</h3>
            <p>
              打开{' '}
              <a
                href="https://github.com/settings/applications/new"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub Developer Settings
              </a>{' '}
              创建 OAuth App。Homepage URL 填站点地址，Authorization callback URL 先按下面的格式填写，
              部署 Worker 后再把域名改准确：
            </p>
            <pre>
              <code>{`${WORKER_EXAMPLE}/callback`}</code>
            </pre>
            <p>创建后记下 Client ID，并生成 Client Secret。</p>
          </div>
        </section>

        <section className="setup-step">
          <span className="setup-step__index">2</span>
          <div>
            <h3>部署 OAuth Worker</h3>
            <p>
              在 <code>worker/</code> 目录中填写 <code>wrangler.toml</code> 的
              <code>GITHUB_CLIENT_ID</code> 与 <code>ALLOWED_ORIGINS</code>，然后运行：
            </p>
            <pre>
              <code>{`cd worker
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler deploy`}</code>
            </pre>
            <p>
              部署完成后会得到一个 Worker 地址，例如 <code>{WORKER_EXAMPLE}</code>；
              回到 OAuth App 把回调地址改成真实的 <code>&lt;worker&gt;/callback</code>。
            </p>
          </div>
        </section>

        <section className="setup-step">
          <span className="setup-step__index">3</span>
          <div>
            <h3>告诉前端 Worker 地址</h3>
            <p>
              在仓库的 <strong>Settings → Secrets and variables → Actions → Variables</strong>
              中添加 <code>PUBLIC_OAUTH_PROXY_URL</code>，值为 Worker 地址；本地开发则写入
              <code>.env</code>。然后重新运行构建。
            </p>
          </div>
        </section>

        <section className="setup-step">
          <span className="setup-step__index">4</span>
          <div>
            <h3>完成</h3>
            <p>
              回到 <code>/admin</code>，点击「使用 GitHub 登录」。在此之前，也可以先用下方的访问令牌登录。
            </p>
          </div>
        </section>

        <div className="setup-note">
          <Icon name="book" size={16} />
          <span>
            更完整的部署步骤见{' '}
            <a href={`${repoUrl()}#oauth-部署`} target="_blank" rel="noopener noreferrer">
              README 的 OAuth 章节
            </a>
            。目前连接的是 <code>{blogConfig.owner}/{blogConfig.repo}</code>。
          </span>
        </div>
      </div>
    </Modal>
  );
}
