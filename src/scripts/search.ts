interface SearchItem {
  slug: string;
  type: 'article' | 'diary' | 'photo';
  typeLabel: string;
  title: string;
  excerpt: string;
  text: string;
  tags: string[];
  date: string;
  minutes: number;
  cover: string | null;
}

interface SearchState {
  open: boolean;
  loading: boolean;
  loaded: boolean;
  items: SearchItem[];
  results: SearchItem[];
  active: number;
  trigger: HTMLElement | null;
}

let focusTimer = 0;

const state: SearchState = {
  open: false,
  loading: false,
  loaded: false,
  items: [],
  results: [],
  active: 0,
  trigger: null,
};

const $ = <T extends Element>(selector: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(selector);

function dialog(): HTMLElement | null {
  return $<HTMLElement>('[data-search-dialog]');
}

function input(): HTMLInputElement | null {
  return $<HTMLInputElement>('[data-search-input]');
}

function resultsEl(): HTMLElement | null {
  return $<HTMLElement>('[data-search-results]');
}

function emptyEl(): HTMLElement | null {
  return $<HTMLElement>('[data-search-empty]');
}

function statusEl(): HTMLElement | null {
  return $<HTMLElement>('[data-search-status]');
}

function setStatus(text: string): void {
  const el = statusEl();
  if (el) el.textContent = text;
}

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT' ||
    element.isContentEditable
  );
}

function score(item: SearchItem, tokens: string[]): number {
  const title = item.title.toLowerCase();
  const excerpt = item.excerpt.toLowerCase();
  const content = (item.text ?? item.excerpt).toLowerCase();
  const tags = item.tags.join(' ').toLowerCase();
  const type = item.typeLabel.toLowerCase();
  const slug = item.slug.toLowerCase();
  const haystack = `${title} ${excerpt} ${content} ${tags} ${type} ${slug}`;

  if (!tokens.every((token) => haystack.includes(token))) return 0;

  let value = 1;
  for (const token of tokens) {
    if (title.includes(token)) value += 6;
    if (title.startsWith(token)) value += 4;
    if (tags.includes(token)) value += 3;
    if (content.includes(token)) value += 2;
    if (type.includes(token)) value += 2;
    if (slug.includes(token)) value += 1;
  }
  return value;
}

function rank(items: SearchItem[], query: string): SearchItem[] {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (!tokens.length) return items.slice(0, 6);

  return items
    .map((item) => ({ item, score: score(item, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.item.date.localeCompare(a.item.date))
    .slice(0, 12)
    .map((entry) => entry.item);
}

function formatDate(date: string): string {
  return date.replaceAll('-', '.');
}

function make(tag: string, className?: string, text?: string): HTMLElement {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function resultNode(item: SearchItem, index: number): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'search-result';
  button.dataset.index = String(index);
  button.setAttribute('role', 'option');
  button.setAttribute('aria-selected', 'false');

  if (item.cover) {
    const image = document.createElement('img');
    image.className = 'search-result__thumb';
    image.src = item.cover;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    button.appendChild(image);
  } else {
    button.appendChild(
      make(
        'span',
        `search-result__thumb search-result__thumb--${item.type}`,
        item.type === 'article' ? '文' : item.type === 'diary' ? '记' : '影',
      ),
    );
  }

  const body = make('span', 'search-result__body');
  const top = make('span', 'search-result__top');
  const badge = make('span', 'type-badge', item.typeLabel);
  badge.dataset.type = item.type;
  top.append(badge, make('span', 'search-result__date', formatDate(item.date)));
  body.appendChild(top);

  body.appendChild(make('span', 'search-result__title', item.title));
  if (item.excerpt) {
    body.appendChild(make('span', 'search-result__excerpt', item.excerpt));
  }

  if (item.tags.length) {
    const tags = make('span', 'search-result__tags');
    for (const tag of item.tags.slice(0, 3)) tags.appendChild(make('span', undefined, tag));
    body.appendChild(tags);
  }

  button.appendChild(body);
  button.appendChild(make('span', 'search-result__key', '↵'));
  return button;
}

function updateActive(index: number): void {
  const list = state.results;
  if (!list.length) return;

  state.active = ((index % list.length) + list.length) % list.length;
  const buttons = Array.from(
    resultsEl()?.querySelectorAll<HTMLButtonElement>('.search-result') ?? [],
  );
  buttons.forEach((button, current) => {
    const active = current === state.active;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
    if (active) button.scrollIntoView({ block: 'nearest' });
  });
}

function render(query = ''): void {
  const list = resultsEl();
  const empty = emptyEl();
  if (!list) return;

  const results = rank(state.items, query);
  state.results = results;
  state.active = 0;
  list.replaceChildren();
  list.scrollTop = 0;

  if (!results.length) {
    if (empty) empty.hidden = false;
    setStatus(query ? `没有找到「${query}」` : '还没有可以搜索的内容');
    return;
  }

  if (empty) empty.hidden = true;
  setStatus(query ? `${results.length} 条结果` : `最近 ${results.length} 条`);

  results.forEach((item, index) => {
    list.appendChild(resultNode(item, index));
  });
  updateActive(0);
}

async function ensureIndex(): Promise<void> {
  if (state.loaded || state.loading) return;

  state.loading = true;
  setStatus('正在读取内容索引…');
  try {
    const response = await fetch('/search.json', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = (await response.json()) as { items?: SearchItem[] };
    state.items = Array.isArray(payload.items) ? payload.items : [];
    state.loaded = true;
    render(input()?.value ?? '');
  } catch (error) {
    console.error('搜索索引加载失败', error);
    setStatus('搜索索引加载失败，请稍后重试');
    const empty = emptyEl();
    if (empty) empty.hidden = true;
  } finally {
    state.loading = false;
  }
}

function openSearch(): void {
  const root = dialog();
  if (!root || state.open) return;

  state.open = true;
  state.trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  root.hidden = false;
  document.body.classList.add('search-open');
  document.querySelectorAll<HTMLElement>('[data-search-open]').forEach((button) => {
    button.setAttribute('aria-expanded', 'true');
  });

  const field = input();
  if (field) {
    field.value = '';
    window.clearTimeout(focusTimer);
    focusTimer = window.setTimeout(() => field.focus(), 30);
  }
  render('');
  void ensureIndex();
}

function closeSearch(): void {
  const root = dialog();
  if (!root || !state.open) return;

  state.open = false;
  window.clearTimeout(focusTimer);
  root.hidden = true;
  document.body.classList.remove('search-open');
  document.querySelectorAll<HTMLElement>('[data-search-open]').forEach((button) => {
    button.setAttribute('aria-expanded', 'false');
  });
  state.trigger?.focus();
}

function openResult(index: number): void {
  const item = state.results[index];
  if (!item) return;
  window.location.href = `/posts/${encodeURIComponent(item.slug)}/`;
}

function openRandom(): void {
  if (!state.items.length) {
    void ensureIndex();
    return;
  }
  const item = state.items[Math.floor(Math.random() * state.items.length)];
  window.location.href = `/posts/${encodeURIComponent(item.slug)}/`;
}

function onKeyDown(event: KeyboardEvent): void {
  const key = event.key.toLowerCase();

  if ((event.metaKey || event.ctrlKey) && key === 'k') {
    event.preventDefault();
    state.open ? closeSearch() : openSearch();
    return;
  }

  if (!state.open) {
    if (key === '/' && !isTyping(event.target)) {
      event.preventDefault();
      openSearch();
    }
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    closeSearch();
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    updateActive(state.active + 1);
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    updateActive(state.active - 1);
    return;
  }

  if (event.key === 'Enter' && event.target === input()) {
    event.preventDefault();
    openResult(state.active);
    return;
  }

  if (event.key === 'Tab') {
    const root = dialog();
    if (!root) return;
    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([tabindex="-1"]), input:not([disabled])',
      ),
    ).filter((element) => element.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

function init(): void {
  const root = dialog();
  if (!root || root.dataset.bound === 'true') return;
  root.dataset.bound = 'true';

  document.querySelectorAll<HTMLElement>('[data-search-open]').forEach((button) => {
    if (button.dataset.searchBound === 'true') return;
    button.dataset.searchBound = 'true';
    button.addEventListener('click', openSearch);
  });

  root.querySelectorAll<HTMLElement>('[data-search-close]').forEach((button) => {
    button.addEventListener('click', closeSearch);
  });

  $<HTMLButtonElement>('[data-search-random]', root)?.addEventListener('click', openRandom);

  $<HTMLInputElement>('[data-search-input]', root)?.addEventListener('input', (event) => {
    render((event.target as HTMLInputElement).value);
  });

  $<HTMLElement>('[data-search-results]', root)?.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.search-result');
    if (!button) return;
    openResult(Number(button.dataset.index ?? '0'));
  });

  $<HTMLElement>('[data-search-results]', root)?.addEventListener('pointermove', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.search-result');
    if (!button) return;
    const index = Number(button.dataset.index ?? 'NaN');
    if (!Number.isNaN(index) && index !== state.active) updateActive(index);
  });

  document.addEventListener('keydown', onKeyDown);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

export {};
