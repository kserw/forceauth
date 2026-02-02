import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: ResolvedTheme;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const isBrowser = typeof window !== 'undefined';

function getSystemTheme(): ResolvedTheme {
  if (!isBrowser) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredPreference(): ThemePreference {
  if (!isBrowser) return 'system';
  const stored = localStorage.getItem('theme-preference');
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize on mount (client-side only)
  useEffect(() => {
    setPreferenceState(getStoredPreference());
    setSystemTheme(getSystemTheme());
    setMounted(true);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (!isBrowser) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const theme: ResolvedTheme = preference === 'system' ? systemTheme : preference;

  useEffect(() => {
    if (!isBrowser || !mounted) return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, mounted]);

  const setPreference = (pref: ThemePreference) => {
    setPreferenceState(pref);
    if (isBrowser) {
      localStorage.setItem('theme-preference', pref);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
