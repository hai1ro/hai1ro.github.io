import { describe, expect, it } from 'vitest';
import { isValidSlug, slugify, suggestedSlug, uniqueSlug } from '../src/lib/slug';
import { countText, deriveDescription } from '../src/lib/text';
import { formatDateCN, toISODate } from '../src/lib/date';
import { parsePostSource, stringifyPostSource } from '../src/lib/frontmatter';
import { markdownToHtml } from '../src/lib/markdown';

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

describe('markdown rendering', () => {
  it('renders GFM table and task list', () => {
    const html = markdownToHtml('- [x] 完成\n\n| a | b |\n|---|---|\n| 1 | 2 |\n');
    expect(html).toContain('<table>');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('完成');
    expect(html).toContain('task-list-item');
    expect(html).toContain('contains-task-list');
  });

  it('highlights fenced code', () => {
    const html = markdownToHtml('\u0060\u0060\u0060ts\nconst value = 1;\n\u0060\u0060\u0060\n');
    expect(html).toContain('hljs');
    expect(html).toContain('const');
  });
});
