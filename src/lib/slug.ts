/** 把标题转换成 URL 友好的 slug。中文会被剔除，由调用方回退到日期 slug。 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '');
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(slug);
}

/** 生成文件名/URL 用的 slug；标题没有可用 ASCII 时回退为 post-YYYYMMDD-HHmm */
export function suggestedSlug(title: string, now: Date = new Date()): string {
  const fromTitle = slugify(title);
  if (fromTitle.length >= 2) return fromTitle;
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `post-${y}${m}${d}-${hh}${mm}`;
}

/** 避免与已有 slug 冲突 */
export function uniqueSlug(base: string, existing: Iterable<string>): string {
  const used = new Set(existing);
  const stem = base.slice(0, 60).replace(/-+$/, '') || 'post';
  if (!used.has(stem)) return stem;
  let index = 2;
  while (used.has(`${stem}-${index}`)) index += 1;
  return `${stem}-${index}`;
}
