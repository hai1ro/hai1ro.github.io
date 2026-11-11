/**
 * 归档页筛选：服务端直出全部文章，浏览器端只做显示/隐藏。
 * 没有 React、没有水合，刷新和分享 URL 也能保留筛选条件。
 */
function initArchive(): void {
  const root = document.querySelector<HTMLElement>('[data-archive]');
  if (!root) return;

  const input = root.querySelector<HTMLInputElement>('[data-archive-search]');
  const tagButtons = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-archive-tag]'),
  );
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-archive-item]'));
  const groups = Array.from(root.querySelectorAll<HTMLElement>('[data-archive-group]'));
  const count = root.querySelector<HTMLElement>('[data-archive-count]');
  const filteredLabel = root.querySelector<HTMLElement>('[data-archive-filtered]');
  const empty = root.querySelector<HTMLElement>('[data-archive-empty]');
  const reset = root.querySelector<HTMLButtonElement>('[data-archive-reset]');

  const params = new URLSearchParams(window.location.search);
  let query = (params.get('q') ?? '').trim().toLowerCase();
  let activeTag = params.get('tag') ?? '';

  if (input) input.value = params.get('q') ?? '';

  const syncUrl = () => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (activeTag) next.set('tag', activeTag);
    const search = next.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${search ? `?${search}` : ''}`,
    );
  };

  const apply = () => {
    let visible = 0;

    for (const item of items) {
      let tags: string[] = [];
      try {
        tags = JSON.parse(item.dataset.tags ?? '[]') as string[];
      } catch {
        tags = [];
      }
      const matchesTag = !activeTag || tags.includes(activeTag);
      const text = item.dataset.search ?? '';
      const matchesQuery =
        !query ||
        text.includes(query) ||
        (item.textContent ?? '').toLowerCase().includes(query);
      const show = matchesTag && matchesQuery;
      item.hidden = !show;
      if (show) visible += 1;
    }

    for (const group of groups) {
      const hasVisible = Array.from(
        group.querySelectorAll<HTMLElement>('[data-archive-item]'),
      ).some((item) => !item.hidden);
      group.hidden = !hasVisible;
    }

    for (const button of tagButtons) {
      const isActive = (button.dataset.archiveTag ?? '') === activeTag;
      button.dataset.active = String(isActive);
      button.setAttribute('aria-pressed', String(isActive));
    }

    if (count) {
      count.textContent = `${visible} 篇${activeTag ? ` · ${activeTag}` : ''}`;
    }
    if (filteredLabel) {
      filteredLabel.hidden = !(query || activeTag);
    }
    if (empty) {
      empty.hidden = visible > 0;
    }
  };

  input?.addEventListener('input', () => {
    query = input.value.trim().toLowerCase();
    apply();
    syncUrl();
  });

  for (const button of tagButtons) {
    button.addEventListener('click', () => {
      const tag = button.dataset.archiveTag ?? '';
      activeTag = activeTag === tag ? '' : tag;
      apply();
      syncUrl();
    });
  }

  reset?.addEventListener('click', () => {
    query = '';
    activeTag = '';
    if (input) input.value = '';
    apply();
    syncUrl();
    input?.focus();
  });

  apply();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initArchive, { once: true });
} else {
  initArchive();
}
