import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import CalendarZoneSetting from '@/components/settings/CalendarZoneSetting';
import CatalogProviderSetting from '@/components/settings/CatalogProviderSetting';
import { SettingsSection } from '@/components/settings/SettingsFrame';
import { validZone } from '@/lib/calendar-week';
import { getCatalogProvider } from '@/services/catalog-provider';
import { getAuthenticatedUser } from '@/services/supabase';

export const metadata: Metadata = { title: 'Preferencias · Ajustes' };

export default async function PreferencesPage() {
  const [user, cookieStore, provider] = await Promise.all([getAuthenticatedUser(), cookies(), getCatalogProvider()]);
  const preferredZone = user?.user_metadata.calendar_timezone ?? cookieStore.get('calendar-zone')?.value;

  return (
    <SettingsSection active="preferences" description="Elegí cómo se muestran los horarios y de dónde vienen los resultados de búsqueda.">
      <div className="grid max-w-3xl gap-4">
        <CalendarZoneSetting value={validZone(preferredZone) ? preferredZone : 'auto'} signedIn={Boolean(user)} />
        <CatalogProviderSetting provider={provider} />
      </div>
    </SettingsSection>
  );
}
