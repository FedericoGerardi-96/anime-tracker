import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import AppearanceSettings from '@/components/settings/AppearanceSettings';
import { SettingsFrame } from '@/components/settings/SettingsFrame';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';

export const metadata: Metadata = { title: 'Apariencia · Ajustes' };

export default async function AppearancePage() {
  const preference = parseTheme((await cookies()).get(THEME_COOKIE)?.value) ?? 'aurora-nocturna';
  return (
    <SettingsFrame active="appearance">
      <AppearanceSettings initialPreference={preference} />
    </SettingsFrame>
  );
}
