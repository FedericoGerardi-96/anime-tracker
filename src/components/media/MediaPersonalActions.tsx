import AnimeActions from '@/components/anime/AnimeActions';
import { getAuthenticatedUser } from '@/services/supabase';
import { checkIsAnimeFavorite, checkIsMangaFavorite } from '@/services/favorites';
import { getMediaListAssociations, getMediaProgress } from '@/lib/actions/lists';
import type { MediaPersonalActionsProps } from '@/interfaces/media-detail-components';

export default async function MediaPersonalActions({ malId, mediaType, animeData, maxEpisodes }: Readonly<MediaPersonalActionsProps>) {
  const user = await getAuthenticatedUser();
  const [isFavorite, initialListIds, progress] = user ? await Promise.all([
    mediaType === 'anime' ? checkIsAnimeFavorite(user.id, malId) : checkIsMangaFavorite(user.id, malId),
    getMediaListAssociations(malId, mediaType),
    getMediaProgress(malId, mediaType),
  ]) : [false, [], null] as const;
  return <AnimeActions animeData={animeData} isFavorite={isFavorite} initialListIds={[...initialListIds]} initialProgress={progress} maxEpisodes={maxEpisodes} userId={user?.id} />;
}
