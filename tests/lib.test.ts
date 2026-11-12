import { describe, expect, it } from 'vitest';
import { isValidSlug, slugify, suggestedSlug, uniqueSlug } from '../src/lib/slug';
import { countText, deriveDescription } from '../src/lib/text';
import { formatDateCN, toISODate } from '../src/lib/date';
import { parsePostSource, stringifyPostSource } from '../src/lib/frontmatter';
import { parseProfileSource, stringifyProfileSource } from '../src/lib/profile';

describe('slug', () => {
  it('slugifies ASCII titles', () => {
    expect(slugify('Hello, World! 2026')).toBe('hello-world-2026');
    expect(slugify('  --Foo  Bar-- ')).toBe('foo-bar');
  });

  it('falls back for Chinese-only titles', () => {
    const slug = suggestedSlug('你好，世界', new Date(2026, 10, 11, 9, 5));
    expect(slug).toBe('post-20261111-0905');
    expect(isValidSlug(slug)).toBe(true);
  });

  it('deduplicates', () => {
    expect(uniqueSlug('hello', ['hello', 'hello-2'])).toBe('hello-3');
  });
});

describe('dates', () => {
  it('normalizes dates without timezone drift', () => {
    expect(toISODate('2026-11-11')).toBe('2026-11-11');
    expect(toISODate('2026-11-11T23:30:00Z')).toBe('2026-11-11');
    expect(toISODate(new Date(2026, 0, 2))).toBe('2026-01-02');
    expect(formatDateCN('2026-11-11')).toBe('2026 年 11 月 11 日');
  });
});

describe('text stats', () => {
  it('counts Chinese characters and English words', () => {
    const stats = countText('# 标题\n\n这是中文内容，with some English words.');
    expect(stats.cjk).toBeGreaterThan(4);
    expect(stats.words).toBeGreaterThan(2);
    expect(stats.minutes).toBeGreaterThanOrEqual(1);
  });

  it('derives description from markdown', () => {
    expect(deriveDescription('# 标题\n\n**正文**内容。')).toBe('标题 正文内容。');
  });
});

describe('frontmatter', () => {
  it('parses frontmatter, body and unknown fields', () => {
    const source = `---
title: 测试文章
description: 一段描述
date: 2026-11-11
updated: 2026-11-12
tags: [Astro, 设计]
draft: true
featured: true
custom: kept
---

正文第一段。
`;
    const parsed = parsePostSource(source);
    expect(parsed.frontmatter.title).toBe('测试文章');
    expect(parsed.frontmatter.tags).toEqual(['Astro', '设计']);
    expect(parsed.frontmatter.draft).toBe(true);
    expect(parsed.frontmatter.featured).toBe(true);
    expect(parsed.extra).toEqual({ custom: 'kept' });
    expect(parsed.body.trim()).toBe('正文第一段。');
    expect(parsed.hasFrontmatter).toBe(true);
  });

  it('round-trips and keeps custom fields', () => {
    const source = `---
title: 测试
date: 2026-11-11
tags:
  - Astro
custom: value
---

## 正文

内容。
`;
    const parsed = parsePostSource(source);
    const output = stringifyPostSource(parsed.frontmatter, parsed.body, parsed.extra);
    const reparsed = parsePostSource(output);
    expect(reparsed.frontmatter.title).toBe('测试');
    expect(reparsed.frontmatter.tags).toEqual(['Astro']);
    expect(reparsed.extra).toEqual({ custom: 'value' });
    expect(reparsed.body).toContain('## 正文');
  });
});

describe('content types', () => {
  it('parses diary and photo frontmatter', () => {
    const diary = parsePostSource(`---
type: diary
date: 2026-11-10
---

今天写了一条日记。`);
    expect(diary.frontmatter.type).toBe('diary');
    expect(diary.frontmatter.title).toBe('');
    expect(diary.frontmatter.images).toEqual([]);

    const photo = parsePostSource(`---
type: photo
title: 光
date: 2026-11-08
images:
  - /images/a.jpg
  - /images/b.jpg
---

照片说明。`);
    expect(photo.frontmatter.type).toBe('photo');
    expect(photo.frontmatter.images).toEqual(['/images/a.jpg', '/images/b.jpg']);
  });

  it('round-trips type and images', () => {
    const source = `---
type: photo
title: 光
date: 2026-11-08
images:
  - /images/a.jpg
---

说明。`;
    const parsed = parsePostSource(source);
    const output = stringifyPostSource(parsed.frontmatter, parsed.body, parsed.extra);
    const reparsed = parsePostSource(output);
    expect(reparsed.frontmatter.type).toBe('photo');
    expect(reparsed.frontmatter.images).toEqual(['/images/a.jpg']);
  });
});

describe('profile markdown', () => {
  it('parses frontmatter and info list items', () => {
    const { data } = parseProfileSource(`---
name: Hai1ro
handle: "@hai1ro"
avatar: https://example.com/a.png
signature: 你好。
---

- 所在地：上海
- 邮箱：[hi@example.com](mailto:hi@example.com)
- 主页：https://example.com
`);
    expect(data.name).toBe('Hai1ro');
    expect(data.handle).toBe('hai1ro');
    expect(data.signature).toBe('你好。');
    expect(data.infos).toEqual([
      { label: '所在地', value: '上海' },
      { label: '邮箱', value: 'hi@example.com', href: 'mailto:hi@example.com' },
      { label: '主页', value: 'https://example.com', href: 'https://example.com' },
    ]);
  });

  it('serializes info as a markdown list', () => {
    const source = stringifyProfileSource({
      name: 'Hai1ro',
      handle: 'hai1ro',
      avatar: '',
      signature: '签名',
      infos: [{ label: 'GitHub', value: 'hai1ro', href: 'https://github.com/hai1ro' }],
    });
    expect(source).toContain('- GitHub：[hai1ro](https://github.com/hai1ro)');
    const parsed = parseProfileSource(source);
    expect(parsed.data.infos).toHaveLength(1);
    expect(parsed.data.infos[0].href).toBe('https://github.com/hai1ro');
  });
});
