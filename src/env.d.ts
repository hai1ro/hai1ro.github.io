/// <reference path="../.astro/types.d.ts" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_GITHUB_OWNER?: string;
  readonly PUBLIC_GITHUB_REPO?: string;
  readonly PUBLIC_GITHUB_BRANCH?: string;
  readonly PUBLIC_OAUTH_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'semi-ui-css';
