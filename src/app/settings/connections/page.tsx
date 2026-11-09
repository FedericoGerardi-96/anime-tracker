import type { Metadata } from 'next';
import MalConnectionCard from '@/components/profile/MalConnectionCard';
import AniListConnectionCard from '@/components/profile/AniListConnectionCard';
import { SettingsSection } from '@/components/settings/SettingsFrame';
import { requireSettingsUser } from '@/lib/settings-session';
import { getMalConnectionStatus } from '@/services/myanimelist-connection';
import { getAniListConnectionStatus } from '@/services/anilist-connection';

export const metadata: Metadata = { title: 'Cuentas conectadas · Ajustes' };

export default async function ConnectionsPage({ searchParams }: {
  searchParams: Promise<{ mal?: string; missing?: string; anilist?: string; anilistMissing?: string }>;
}) {
  const user = await requireSettingsUser();
  const [query, mal, anilist] = await Promise.all([
    searchParams,
    getMalConnectionStatus(user.id),
    getAniListConnectionStatus(user.id),
  ]);

  return (
    <SettingsSection active="accounts" description="Vinculá tus cuentas de MyAnimeList y AniList y administrá la sincronización de tu biblioteca.">
      <div className="min-w-0">
        <div id="mal" className="scroll-mt-24"><MalConnectionCard connection={mal} result={query.mal} missingConfiguration={query.missing} /></div>
        <div id="anilist" className="scroll-mt-24"><AniListConnectionCard connection={anilist} result={query.anilist} missing={query.anilistMissing} /></div>
      </div>
    </SettingsSection>
  );
}
