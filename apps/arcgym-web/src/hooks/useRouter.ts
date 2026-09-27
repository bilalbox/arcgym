import { useState, useEffect, useCallback } from 'react';

/**
 * Lightweight client-side router hook for ArcGym.
 * Handles client-side navigation between '/' and '/privacy'
 * with HTML5 History API (pushState/popstate) support.
 */
export function useRouter() {
  const [pathname, setPathname] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace(/\/+$/, '') || '/';
      return path;
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/\/+$/, '') || '/';
      setPathname(path);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = useCallback((to: string) => {
    if (typeof window === 'undefined') return;

    const normalizedTo = to.replace(/\/+$/, '') || '/';
    if (window.location.pathname !== normalizedTo) {
      window.history.pushState({}, '', normalizedTo);
      setPathname(normalizedTo);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return { pathname, navigate };
}
