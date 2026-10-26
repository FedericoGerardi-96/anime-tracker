import 'server-only';
import { getSupabaseServer } from '@/services/supabase';
import { readInBatches } from '@/lib/read-all-pages';

/** Query only the cards being rendered, never the user's entire library. */
export async function getCatalogFavoriteIds(userId: string | undefined, mediaType: 'anime' | 'manga', ids: number[]) {
  const favorites = new Set<number>();
  if (!userId || !ids.length) return favorites;
  const supabase = await getSupabaseServer();
  const [standard, vault] = await Promise.all([
    readInBatches(ids, batch => supabase.from('favorites').select('media!inner(mal_id)')
      .eq('user_id', userId).eq('media.type', mediaType).in('media.mal_id', batch)),
    readInBatches(ids, batch => supabase.from('hentai').select('mal_id')
      .eq('user_id', userId).eq('type', mediaType === 'manga' ? 'doujin' : 'anime').in('mal_id', batch)),
  ]);
  for (const row of standard) {
    const media = Array.isArray(row.media) ? row.media[0] : row.media;
    if (media?.mal_id != null) favorites.add(Number(media.mal_id));
  }
  for (const row of vault) if (row.mal_id != null) favorites.add(Number(row.mal_id));
  return favorites;
}
