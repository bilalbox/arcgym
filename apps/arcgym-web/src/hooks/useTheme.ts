import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'arcgym-theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  return preference === 'system' ? getSystemTheme() : preference;
}

export function applyResolvedTheme(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export function readStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    /* private mode / blocked storage */
  }
  return 'system';
}

/**
 * Minimal theme controller. Preference persists; resolved theme drives `.dark` on <html>.
 * Pair with the inline FOUC script in index.html.
 */
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStoredTheme());
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveTheme(readStoredTheme()));

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    const nextResolved = resolveTheme(next);
    setResolved(nextResolved);
    applyResolvedTheme(nextResolved);
  }, []);

  const toggle = useCallback(() => {
    setPreference(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setPreference]);

  useEffect(() => {
    applyResolvedTheme(resolveTheme(preference));

    if (preference !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const next = resolveTheme('system');
      setResolved(next);
      applyResolvedTheme(next);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  return { preference, resolved, setPreference, toggle };
}
