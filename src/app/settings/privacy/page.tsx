import type { Metadata } from 'next';
import PrivacySettings from '@/components/profile/PrivacySettings';
import AdultSearchSetting from '@/components/settings/AdultSearchSetting';
import { SettingsSection } from '@/components/settings/SettingsFrame';
import { requireSettingsUser } from '@/lib/settings-session';
import { createClient } from '@/lib/supabase/server';
import type { ProfilePrivacy } from '@/types/social';

export const metadata: Metadata = { title: 'Privacidad · Ajustes' };

const defaults: ProfilePrivacy = {
  library_favorites_visibility: 'private',
  featured_anime_visibility: 'public',
  featured_manga_visibility: 'public',
  featured_characters_visibility: 'public',
};

export default async function PrivacyPage() {
  const user = await requireSettingsUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from('profile_privacy')
    .select('library_favorites_visibility, featured_anime_visibility, featured_manga_visibility, featured_characters_visibility')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <SettingsSection active="privacy" description="Controlá la visibilidad de tu perfil y el contenido de tus búsquedas.">
      {error ? <p role="alert">No pudimos cargar tus opciones de privacidad. Recargá la página para volver a intentarlo.</p>
        : <PrivacySettings initialSettings={data ?? defaults} />}
      <AdultSearchSetting initialEnabled={user.user_metadata.search_include_adult !== false} />
    </SettingsSection>
  );
}
