import { useState, useEffect, useCallback } from 'react';

/**
 * Lightweight client-side router hook for ArcGym.
 * Handles client-side navigation between '/', '/skills', and '/privacy'
 * with HTML5 History API (pushState/popstate) support and search query handling.
 */
export function useRouter() {
  const getPath = () => {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname.replace(/\/+$/, '') || '/';
  };

  const getSearch = () => {
    if (typeof window === 'undefined') return '';
    return window.location.search;
  };

  const [pathname, setPathname] = useState<string>(getPath);
  const [search, setSearch] = useState<string>(getSearch);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(getPath());
      setSearch(getSearch());
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = useCallback((to: string) => {
    if (typeof window === 'undefined') return;

    try {
      const parsed = new URL(to, window.location.origin);
      const normalizedPath = parsed.pathname.replace(/\/+$/, '') || '/';
      const full = normalizedPath + parsed.search;

      if (window.location.pathname + window.location.search !== full) {
        window.history.pushState({}, '', full);
        setPathname(normalizedPath);
        setSearch(parsed.search);
      }
    } catch {
      window.history.pushState({}, '', to);
      setPathname(to);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return { pathname, search, navigate };
}
