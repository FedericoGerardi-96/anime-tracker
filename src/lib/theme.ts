export const THEME_COOKIE = 'anitrack-theme';

export type Theme = 'aurora-nocturna' | 'aurora-clara' | 'estreno';
export type ThemePreference = Theme | 'auto';

export function parseTheme(value: string | undefined | null): ThemePreference | null {
  if (value === 'dark') return 'aurora-nocturna';
  if (value === 'light') return 'aurora-clara';
  return value === 'aurora-nocturna' || value === 'aurora-clara' || value === 'estreno' || value === 'auto' ? value : null;
}

export function resolveTheme(preference: ThemePreference, systemDark = true): Theme {
  return preference === 'auto' ? (systemDark ? 'aurora-nocturna' : 'aurora-clara') : preference;
}
