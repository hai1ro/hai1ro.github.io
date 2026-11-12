import { parse, stringify } from 'yaml';

export interface ProfileInfo {
  /** 信息名称，例如「所在地」「邮箱」 */
  label: string;
  /** 展示值，例如「上海」「hi@example.com」 */
  value: string;
  /** 可选的链接地址；value 会作为链接文字 */
  href?: string;
}

export interface ProfileData {
  name: string;
  handle: string;
  avatar: string;
  signature: string;
  infos: ProfileInfo[];
}

export interface ParsedProfileSource {
  data: ProfileData;
  /** frontmatter 中保留的自定义字段 */
  extra: Record<string, unknown>;
  hasFrontmatter: boolean;
}

const KNOWN_KEYS = new Set(['name', 'handle', 'avatar', 'signature']);

const DEFAULT_AVATAR = 'https://github.com/hai1ro.png?size=240';

export const emptyProfile = (): ProfileData => ({
  name: '',
  handle: '',
  avatar: '',
  signature: '',
  infos: [],
});

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function splitInfoItem(raw: string): ProfileInfo | null {
  const text = raw.replace(/^\s*[-*+]\s+/, '').trim();
  if (!text) return null;

  const separator = text.search(/[:：]/);
  if (separator < 0) return { label: '信息', value: text };

  const label = text.slice(0, separator).trim();
  const rawValue = text.slice(separator + 1).trim();
  if (!label || !rawValue) return null;

  // 支持 - 邮箱：[hi@example.com](mailto:hi@example.com)
  const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(rawValue);
  if (link) {
    return { label, value: link[1].trim(), href: link[2].trim() };
  }

  // 支持 - 主页：https://example.com
  if (/^https?:\/\/\S+$/i.test(rawValue)) {
    return { label, value: rawValue, href: rawValue };
  }

  return { label, value: rawValue };
}

/**
 * 解析个人资料的 Markdown：
 *
 * ---
 * name: Hai1ro
 * handle: hai1ro
 * avatar: https://...
 * signature: 一句话签名
 * ---
 *
 * - 所在地：上海
 * - 邮箱：[hi@example.com](mailto:hi@example.com)
 *
 * 信息就是正文里的 Markdown 列表，前端读取时自己解析成键值对。
 */
export function parseProfileSource(source: string): ParsedProfileSource {
  const normalized = source.replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(normalized);
  let data: Record<string, unknown> = {};
  let body = normalized;
  const hasFrontmatter = Boolean(match);

  if (match) {
    body = normalized.slice(match[0].length);
    try {
      const parsed = parse(match[1]);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        data = parsed as Record<string, unknown>;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`个人资料 YAML 解析失败：${message}`);
    }
  }

  const infos: ProfileInfo[] = [];
  for (const line of body.split('\n')) {
    if (/^\s*[-*+]\s+/.test(line)) {
      const info = splitInfoItem(line);
      if (info) infos.push(info);
    }
  }

  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!KNOWN_KEYS.has(key) && value !== undefined) extra[key] = value;
  }

  return {
    data: {
      name: asString(data.name),
      handle: asString(data.handle).replace(/^@/, ''),
      avatar: asString(data.avatar) || DEFAULT_AVATAR,
      signature: asString(data.signature),
      infos,
    },
    extra,
    hasFrontmatter,
  };
}

/** 把个人资料序列化为 Markdown；信息列表是正文里的 Markdown 列表。 */
export function stringifyProfileSource(
  profile: ProfileData,
  extra: Record<string, unknown> = {},
): string {
  const data: Record<string, unknown> = {
    name: profile.name.trim() || '未命名',
    handle: profile.handle.trim().replace(/^@/, ''),
  };
  if (profile.avatar.trim()) data.avatar = profile.avatar.trim();
  if (profile.signature.trim()) data.signature = profile.signature.trim();

  for (const [key, value] of Object.entries(extra)) {
    if (!(key in data) && !KNOWN_KEYS.has(key) && value !== undefined) {
      data[key] = value;
    }
  }

  const lines: string[] = [];
  for (const info of profile.infos) {
    const label = info.label.trim();
    const value = info.value.trim();
    if (!label || !value) continue;
    const displayValue = info.href?.trim()
      ? `[${value}](${info.href.trim()})`
      : value;
    lines.push(`- ${label}：${displayValue}`);
  }

  const yamlText = stringify(data, { lineWidth: 0 }).trimEnd();
  const body = lines.length ? `\n\n${lines.join('\n')}\n` : '\n';
  return `---\n${yamlText}\n---${body}`;
}
