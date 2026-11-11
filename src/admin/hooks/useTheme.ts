import { useCallback, useEffect, useState } from 'react';
import { currentTheme, toggleTheme, type Theme } from '@/lib/theme';

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document === 'undefined' ? 'light' : currentTheme(),
  );

  useEffect(() => {
    const onChange = (event: Event) => {
      setTheme((event as CustomEvent<Theme>).detail);
    };
    window.addEventListener('themechange', onChange);
    return () => window.removeEventListener('themechange', onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme(toggleTheme());
  }, []);

  return { theme, toggle };
}
