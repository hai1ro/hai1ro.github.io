import {
  parseProfileSource,
  stringifyProfileSource,
  type ProfileData,
} from '@/lib/profile';
import type { GitHubClient } from '../github/client';

export const profilePath = 'src/content/profile.md';

export interface ProfileDocument {
  path: string;
  sha: string;
  data: ProfileData;
  extra: Record<string, unknown>;
}

export async function loadProfile(client: GitHubClient): Promise<ProfileDocument> {
  const file = await client.getFile(profilePath);
  const parsed = parseProfileSource(file.text);
  return {
    path: profilePath,
    sha: file.sha,
    data: parsed.data,
    extra: parsed.extra,
  };
}

export async function saveProfile(
  client: GitHubClient,
  options: {
    data: ProfileData;
    extra: Record<string, unknown>;
    sha?: string;
    isNew: boolean;
  },
): Promise<{ sha: string; data: ProfileData }> {
  const data: ProfileData = {
    ...options.data,
    name: options.data.name.trim() || '未命名',
    handle: options.data.handle.trim().replace(/^@/, ''),
    infos: options.data.infos
      .map((info) => ({
        label: info.label.trim(),
        value: info.value.trim(),
        href: info.href?.trim() || undefined,
      }))
      .filter((info) => info.label && info.value),
  };

  if (!data.name) throw new Error('请填写显示名称。');

  const content = stringifyProfileSource(data, options.extra);
  const result = await client.putFile({
    path: profilePath,
    content,
    message: `profile: 更新个人资料（${data.name}）`,
    sha: options.isNew ? undefined : options.sha,
  });

  return { sha: result.content.sha, data };
}
