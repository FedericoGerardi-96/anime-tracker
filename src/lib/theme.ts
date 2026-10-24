export const THEME_COOKIE = 'anitrack-theme';

export type Theme = 'dark' | 'light';

export function parseTheme(value: string | undefined): Theme | null {
  return value === 'dark' || value === 'light' ? value : null;
}
