/**
 * 归档页筛选：服务端直出全部内容，浏览器端只做显示/隐藏。
 * 支持类型、标签和搜索，并同步到 URL。
 */
function initArchive(): void {
  const root = document.querySelector<HTMLElement>('[data-archive]');
  if (!root) return;

  const input = root.querySelector<HTMLInputElement>('[data-archive-search]');
  const tagButtons = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-archive-tag]'),
  );
  const typeButtons = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-archive-type]'),
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
  let activeType = params.get('type') ?? '';

  if (input) input.value = params.get('q') ?? '';

  const syncUrl = () => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (activeTag) next.set('tag', activeTag);
    if (activeType) next.set('type', activeType);
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
      const matchesType = !activeType || item.dataset.type === activeType;
      const text = item.dataset.search ?? '';
      const matchesQuery =
        !query ||
        text.includes(query) ||
        (item.textContent ?? '').toLowerCase().includes(query);
      const show = matchesTag && matchesType && matchesQuery;
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

    for (const button of typeButtons) {
      const isActive = (button.dataset.archiveType ?? '') === activeType;
      button.dataset.active = String(isActive);
      button.setAttribute('aria-pressed', String(isActive));
    }

    if (count) {
      const parts = [`${visible} 条`];
      if (activeType) {
        const label = typeButtons.find((button) => button.dataset.archiveType === activeType);
        if (label) parts.push(label.textContent?.replace(/\s+/g, ' ').trim() ?? '');
      }
      if (activeTag) parts.push(activeTag);
      count.textContent = parts.filter(Boolean).join(' · ');
    }
    if (filteredLabel) {
      filteredLabel.hidden = !(query || activeTag || activeType);
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

  for (const button of typeButtons) {
    button.addEventListener('click', () => {
      const type = button.dataset.archiveType ?? '';
      activeType = activeType === type ? '' : type;
      apply();
      syncUrl();
    });
  }

  reset?.addEventListener('click', () => {
    query = '';
    activeTag = '';
    activeType = '';
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
