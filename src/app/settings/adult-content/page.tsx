import type { Metadata } from 'next';
import HContentToggle from '@/components/profile/HContentToggle';
import { SettingsSection } from '@/components/settings/SettingsFrame';
import { requireSettingsUser } from '@/lib/settings-session';
import { getUserProfile } from '@/services/profile';

export const metadata: Metadata = { title: 'Contenido adulto · Ajustes' };

export default async function AdultContentPage() {
  const user = await requireSettingsUser();
  const profile = await getUserProfile(user.id);

  return (
    <SettingsSection active="adult" description="Elegí si querés mostrar la sección Hentai en la navegación.">
      {profile ? <HContentToggle enabled={profile.show_h_content ?? false} />
        : <p role="alert">No pudimos cargar tu preferencia. Recargá la página para volver a intentarlo.</p>}
    </SettingsSection>
  );
}
