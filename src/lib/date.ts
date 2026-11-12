const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 把 Date / ISO 字符串统一成 YYYY-MM-DD（纯日期，避免时区偏移） */
export function toISODate(value: Date | string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = DATE_ONLY.exec(trimmed.slice(0, 10));
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? '' : formatLocalDate(parsed);
  }
  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : formatLocalDate(parsed);
  }
  if (Number.isNaN(value.getTime())) return '';
  return formatLocalDate(value);
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 解析 YYYY-MM-DD 为本地时区的 Date，避免 new Date('2026-01-01') 的 UTC 偏移 */
export function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) return value;
  const match = DATE_ONLY.exec(value.slice(0, 10));
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function todayISO(): string {
  return formatLocalDate(new Date());
}

export function formatDateCN(value: string | Date): string {
  const d = parseDateOnly(value);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

export function formatDateShort(value: string | Date): string {
  const d = parseDateOnly(value);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDateTime(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatLocalDate(d)} ${hh}:${mm}`;
}

export function relativeTime(value: string | Date, now: number = Date.now()): string {
  const d = value instanceof Date ? value : parseDateOnly(value);
  if (Number.isNaN(d.getTime())) return '';
  const diff = now - d.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  return formatDateShort(d);
}
