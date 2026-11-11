import { describe, expect, it } from 'vitest';
import { isValidSlug, slugify, suggestedSlug, uniqueSlug } from '../src/lib/slug';
import { countText, deriveDescription } from '../src/lib/text';
import { formatDateCN, toISODate } from '../src/lib/date';
import { parsePostSource, stringifyPostSource } from '../src/lib/frontmatter';
import { htmlToMarkdown, markdownToHtml, normalizeMarkdown } from '../src/lib/markdown';

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

describe('markdown conversion', () => {
  it('renders GFM to html', () => {
    const html = markdownToHtml('- [x] 完成\n\n| a | b |\n|---|---|\n| 1 | 2 |\n');
    expect(html).toContain('<table>');
    expect(html).toContain('data-type="taskList"');
    expect(html).toContain('data-checked="true"');
    expect(html).not.toContain('type="checkbox"');
  });

  it('serializes editor html back to markdown', () => {
    const html = `
      <h2>标题</h2>
      <p>一段 <strong>加粗</strong>、<em>斜体</em>、<code>code</code> 和 <a href="https://example.com">链接</a>。</p>
      <ul><li><p>一</p></li><li><p>二</p></li></ul>
      <blockquote><p>引用</p></blockquote>
      <pre><code class="language-ts">const a = 1;</code></pre>
      <table style="min-width: 75px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th><p>列 A</p></th><th><p>列 B</p></th></tr><tr><td><p>1</p></td><td><p>2</p></td></tr></tbody></table>
      <p><img src="/images/a.png" alt="图"></p>
      <p><s>删除线</s></p>
    `;
    const markdown = htmlToMarkdown(html);
    expect(markdown).toContain('## 标题');
    expect(markdown).toContain('**加粗**');
    expect(markdown).toContain('*斜体*');
    expect(markdown).toContain('[链接](https://example.com)');
    expect(markdown).toContain('```ts');
    expect(markdown).toContain('| 列 A | 列 B |');
    expect(markdown).toContain('![图](/images/a.png)');
    expect(markdown).toContain('~~删除线~~');
    expect(markdown).not.toContain('colgroup');
    expect(markdown).toContain('> 引用');
  });

  it('serializes Tiptap task items', () => {
    const html = `
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked><span></span></label><div><p>已完成</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>待办</p></div></li>
      </ul>
    `;
    const markdown = htmlToMarkdown(html);
    expect(markdown).toContain('- [x] 已完成');
    expect(markdown).toContain('- [ ] 待办');
    expect(markdown).not.toContain('data-type');
  });

  it('normalizes blank lines', () => {
    expect(normalizeMarkdown('a\n\n\n\nb\n')).toBe('a\n\nb\n');
  });
});
