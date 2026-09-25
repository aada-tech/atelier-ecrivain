'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeName = 'light' | 'sepia' | 'night';
export type ThemePreference = ThemeName | 'system';

const STORAGE_KEY = 'atelier:theme';

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ThemeName;
  setPreference: (t: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  resolved: 'light',
  setPreference: () => {},
});

export const useTheme = () => useContext(ThemeContext);

/**
 * Script exécuté avant le premier rendu pour éviter le flash de thème.
 * Les pages marketing imposent leur propre thème via data-force-theme.
 */
export const themeInitScript = `(()=>{try{var d=document.documentElement;var f=d.getAttribute('data-force-theme');var p=localStorage.getItem('${STORAGE_KEY}')||'system';var t=f||(p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'night':'light'):p);d.setAttribute('data-theme',t);}catch(e){}})();`;

function resolve(pref: ThemePreference): ThemeName {
  if (pref !== 'system') return pref;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPref] = useState<ThemePreference>('system');
  const [resolved, setResolved] = useState<ThemeName>('light');

  useEffect(() => {
    let stored: ThemePreference = 'system';
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === 'light' || raw === 'sepia' || raw === 'night' || raw === 'system') stored = raw;
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronisation initiale avec localStorage
    setPref(stored);
  }, []);

  useEffect(() => {
    const apply = () => {
      const t = resolve(preference);
      setResolved(t);
      const root = document.documentElement;
      if (!root.hasAttribute('data-force-theme')) root.setAttribute('data-theme', t);
      const meta = document.querySelector('meta[name="theme-color"]');
      meta?.setAttribute('content', t === 'night' ? '#0b0b10' : t === 'sepia' ? '#f1e6d2' : '#f6f3ec');
    };
    apply();
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [preference]);

  const setPreference = useCallback((t: ThemePreference) => {
    setPref(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {}
  }, []);

  return <ThemeContext.Provider value={{ preference, resolved, setPreference }}>{children}</ThemeContext.Provider>;
}
