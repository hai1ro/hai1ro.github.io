import { currentTheme, toggleTheme } from '@/lib/theme';

function initThemeToggle(): void {
  const sync = () => {
    document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((button) => {
      const next = currentTheme() === 'dark' ? '浅色' : '深色';
      button.setAttribute('aria-label', `切换到${next}模式`);
      button.setAttribute('title', `切换到${next}模式`);
    });
  };

  document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      toggleTheme();
      sync();
    });
  });
  sync();
}

function initHeader(): void {
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  if (!header) return;

  const onScroll = () => {
    header.toggleAttribute('data-scrolled', window.scrollY > 6);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const menuButton = header.querySelector<HTMLElement>('[data-menu-toggle]');
  const nav = header.querySelector<HTMLElement>('[data-site-nav]');
  const close = () => {
    header.removeAttribute('data-open');
    menuButton?.setAttribute('aria-expanded', 'false');
  };

  menuButton?.addEventListener('click', () => {
    const open = !header.hasAttribute('data-open');
    header.toggleAttribute('data-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
  });

  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));

  document.addEventListener('click', (event) => {
    if (!header.hasAttribute('data-open')) return;
    const target = event.target as Node;
    if (!header.contains(target)) close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
}

function initCopyButtons(): void {
  document.querySelectorAll<HTMLElement>('pre.astro-code').forEach((pre) => {
    if (pre.querySelector('.copy-code')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-code';
    button.textContent = '复制';
    button.setAttribute('aria-label', '复制代码');
    button.addEventListener('click', async () => {
      const code = pre.querySelector('code')?.innerText ?? pre.innerText;
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = '已复制';
      } catch {
        const area = document.createElement('textarea');
        area.value = code;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        try {
          document.execCommand('copy');
          button.textContent = '已复制';
        } catch {
          button.textContent = '复制失败';
        }
        area.remove();
      }
      window.setTimeout(() => {
        button.textContent = '复制';
      }, 1600);
    });
    pre.appendChild(button);
  });
}

function initExternalLinks(): void {
  document.querySelectorAll<HTMLAnchorElement>('.prose a[href^="http"]').forEach((link) => {
    try {
      if (new URL(link.href).origin !== window.location.origin) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    } catch {
      /* 忽略非法 URL */
    }
  });
}

function initToc(): void {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.toc a[href^="#"]'));
  if (!links.length) return;

  const targets = links
    .map((link) => {
      const id = decodeURIComponent(link.getAttribute('href')!.slice(1));
      const heading = document.getElementById(id);
      return heading ? { link, heading } : null;
    })
    .filter((item): item is { link: HTMLAnchorElement; heading: HTMLElement } => Boolean(item));

  const setActive = (active: HTMLElement) => {
    links.forEach((link) => link.classList.remove('is-active'));
    const link = targets.find((item) => item.heading === active)?.link;
    link?.classList.add('is-active');
  };

  if (!('IntersectionObserver' in window)) return;

  const visible = new Map<HTMLElement, boolean>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        visible.set(entry.target as HTMLElement, entry.isIntersecting);
      }
      const first = targets.find((item) => visible.get(item.heading));
      if (first) setActive(first.heading);
    },
    { rootMargin: '-80px 0px -68% 0px', threshold: 0 },
  );

  targets.forEach((item) => observer.observe(item.heading));
}

function initReveal(): void {
  const elements = document.querySelectorAll<HTMLElement>('.reveal');
  if (!elements.length) return;
  if (!('IntersectionObserver' in window)) {
    elements.forEach((element) => element.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  elements.forEach((element) => observer.observe(element));
}

function init(): void {
  initThemeToggle();
  initHeader();
  initCopyButtons();
  initExternalLinks();
  initToc();
  initReveal();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
