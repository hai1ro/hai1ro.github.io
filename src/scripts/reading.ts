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

function initReadingTools(): void {
  const dock = document.querySelector<HTMLElement>('[data-reading-dock]');
  if (!dock || dock.dataset.bound === 'true') return;
  dock.dataset.bound = 'true';

  const bar = document.querySelector<HTMLElement>('[data-reading-progress]');
  const topButton = document.querySelector<HTMLButtonElement>('[data-back-top]');
  const focusButton = document.querySelector<HTMLButtonElement>('[data-focus-toggle]');
  const copyButton = document.querySelector<HTMLButtonElement>('[data-copy-link]');
  const root = document.documentElement;
  let frame = 0;

  const updateProgress = () => {
    frame = 0;
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, window.scrollY / scrollable));

    if (bar) bar.style.transform = `scaleX(${progress.toFixed(4)})`;
    if (topButton) {
      dock.dataset.scrolled = window.scrollY > 520 ? 'true' : 'false';
    }
  };

  const requestProgress = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(updateProgress);
  };

  window.addEventListener('scroll', requestProgress, { passive: true });
  window.addEventListener('resize', requestProgress, { passive: true });
  updateProgress();

  const syncFocus = (focused: boolean) => {
    if (focused) root.dataset.focus = 'on';
    else delete root.dataset.focus;

    if (focusButton) {
      focusButton.setAttribute('aria-pressed', String(focused));
      focusButton.setAttribute('aria-label', focused ? '退出专注模式' : '进入专注模式');
      focusButton.setAttribute('title', focused ? '退出专注模式 (F)' : '专注模式 (F)');
    }
  };

  const toggleFocus = () => {
    syncFocus(root.dataset.focus !== 'on');
    requestProgress();
  };

  focusButton?.addEventListener('click', toggleFocus);

  topButton?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  copyButton?.addEventListener('click', async () => {
    const copy = async () => {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        return;
      }
      const area = document.createElement('textarea');
      area.value = window.location.href;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.focus();
      area.select();
      document.execCommand('copy');
      area.remove();
    };

    try {
      await copy();
      copyButton.dataset.copied = 'true';
      copyButton.setAttribute('aria-label', '链接已复制');
      copyButton.setAttribute('title', '链接已复制');
      window.setTimeout(() => {
        delete copyButton.dataset.copied;
        copyButton.setAttribute('aria-label', '复制本文链接');
        copyButton.setAttribute('title', '复制本文链接');
      }, 1600);
    } catch {
      copyButton.setAttribute('title', '复制失败，请手动复制地址栏链接');
    }
  });

  document.addEventListener('keydown', (event) => {
    if (isTyping(event.target)) return;
    if (document.body.classList.contains('search-open')) return;

    if (event.key.toLowerCase() === 'f' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      toggleFocus();
      return;
    }

    if (event.key === 'Escape' && root.dataset.focus === 'on') {
      syncFocus(false);
      requestProgress();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initReadingTools, { once: true });
} else {
  initReadingTools();
}

export {};
