'use client';

import { parseTheme, resolveTheme, THEME_COOKIE, type ThemePreference } from '@/lib/theme';

export function currentPreference(): ThemePreference {
  return parseTheme(document.documentElement.dataset.themePreference) ?? 'aurora-nocturna';
}

export function applyTheme(preference: ThemePreference) {
  const theme = resolveTheme(preference, window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle('dark', theme !== 'aurora-clara');
  window.dispatchEvent(new Event('anitrack-theme-change'));
}

export function saveTheme(preference: ThemePreference): boolean {
  applyTheme(preference);
  document.cookie = `${THEME_COOKIE}=${preference}; Max-Age=31536000; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  try { window.localStorage.setItem(THEME_COOKIE, preference); } catch { /* Cookies remain the server-readable fallback. */ }
  return document.cookie.split('; ').some((cookie) => cookie === `${THEME_COOKIE}=${preference}`);
}

export function subscribeTheme(callback: () => void) {
  window.addEventListener('anitrack-theme-change', callback);
  return () => window.removeEventListener('anitrack-theme-change', callback);
}
