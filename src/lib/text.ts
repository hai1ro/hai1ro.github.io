export interface TextStats {
  /** 中文字符数 */
  cjk: number;
  /** 英文/数字单词数 */
  words: number;
  /** 粗略总字数，用于展示 */
  chars: number;
  /** 预计阅读分钟数 */
  minutes: number;
}

const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;

/** 中英文混合阅读时间：中文 400 字/分钟，英文 220 词/分钟 */
export function countText(text: string): TextStats {
  const plain = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_~\-]+/g, ' ');
  const cjk = (plain.match(CJK_RE) || []).length;
  const words = (plain.replace(CJK_RE, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  const chars = plain.replace(/\s/g, '').length;
  const minutes = Math.max(1, Math.round(cjk / 400 + words / 220));
  return { cjk, words, chars, minutes };
}

/** 从 Markdown 生成摘要（用于自动填充 description） */
export function deriveDescription(markdown: string, max = 120): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
