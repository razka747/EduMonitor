'use client';

import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';

export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem('edumonitor_theme') as Theme | null;
    if (saved === 'dark' || saved === 'light') return saved;
  } catch (_) {}
  return 'light';
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }
  try {
    localStorage.setItem('edumonitor_theme', theme);
  } catch (_) {}
  window.dispatchEvent(new CustomEvent('theme_change', { detail: { theme } }));
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const current = getInitialTheme();
    setThemeState(current);
    applyTheme(current);

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.theme) {
        setThemeState(customEvent.detail.theme);
      }
    };

    window.addEventListener('theme_change', handleThemeChange);
    return () => window.removeEventListener('theme_change', handleThemeChange);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  return { theme, setTheme, toggleTheme, isDark: theme === 'dark' };
}
