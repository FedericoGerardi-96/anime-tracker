'use client';

import { useEffect } from 'react';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';
import { applyTheme, currentPreference, saveTheme } from '@/lib/theme-client';

export default function ThemeListener() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => { if (currentPreference() === 'auto') applyTheme('auto'); };
    const onStorage = (event: StorageEvent) => {
      const preference = parseTheme(event.newValue);
      if (event.key === THEME_COOKIE && preference) saveTheme(preference);
    };
    media.addEventListener('change', onSystemChange);
    window.addEventListener('storage', onStorage);
    return () => {
      media.removeEventListener('change', onSystemChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return null;
}
