import 'server-only';
import { getSupabaseServer } from '@/services/supabase';
import { readAllPages, readInBatches } from '@/lib/read-all-pages';

/**
 * Fetches favorites with simple media detail (id, mal_id, title, image) for a specific user.
 */
export async function getFavoritesWithMedia(userId: string) {
  const supabase = await getSupabaseServer();
  const data = await readAllPages((from, to) => supabase
    .from("favorites")
    .select("id, media!inner(mal_id, title, image)")
    .eq("user_id", userId)
    .order("id").range(from, to));


  return data.map((row) => ({
    id: row.id as string,
    mal_id: (Array.isArray(row.media) ? row.media[0] : row.media).mal_id as number,
    title: (Array.isArray(row.media) ? row.media[0] : row.media).title as string,
    image: (Array.isArray(row.media) ? row.media[0] : row.media).image as string,
  }));
}

/**
 * Fetches a list of MyAnimeList IDs for the user's favorites.
 */
export async function getFavoriteMalIds(userId: string): Promise<number[]> {
  const supabase = await getSupabaseServer();
  const data = await readAllPages((from, to) => supabase
    .from("favorites")
    .select("media!inner(mal_id, type)")
    .eq("user_id", userId)
    .eq("media.type", "anime").order("id").range(from, to));


  return data.map((row) => (Array.isArray(row.media) ? row.media[0] : row.media).mal_id);
}

/**
 * Checks if a specific manga is in the user's favorites (standard or hentai).
 */
export async function checkIsMangaFavorite(userId: string, malId: number): Promise<boolean> {
  const supabase = await getSupabaseServer();

  // Check standard favorites
  const { data: favSimple } = await supabase
    .from('favorites')
    .select('id, media!inner(mal_id, type)')
    .eq('user_id', userId)
    .eq('media.mal_id', malId)
    .eq('media.type', 'manga')
    .maybeSingle(); // maybeSingle avoids throwing PGRST116 (0 rows returned) error

  if (favSimple) return true;

  // Check hentai vault
  const { data: hentaiFav } = await supabase
    .from('hentai')
    .select('id')
    .eq('user_id', userId)
    .eq('mal_id', malId)
    .eq('type', 'doujin')
    .maybeSingle();

  return !!hentaiFav;
}

/**
 * Checks if a specific anime is in the user's favorites (standard or hentai).
 */
export async function checkIsAnimeFavorite(userId: string, malId: number): Promise<boolean> {
  const supabase = await getSupabaseServer();

  // Check standard favorites
  const { data: favSimple } = await supabase
    .from('favorites')
    .select('id, media!inner(mal_id, type)')
    .eq('user_id', userId)
    .eq('media.mal_id', malId)
    .eq('media.type', 'anime')
    .maybeSingle();

  if (favSimple) return true;

  // Check hentai vault
  const { data: hentaiFav } = await supabase
    .from('hentai')
    .select('id')
    .eq('user_id', userId)
    .eq('mal_id', malId)
    .eq('type', 'anime')
    .maybeSingle();

  return !!hentaiFav;
}

/**
 * Retrieves all favorites with full media details for export.
 */
export async function getAllFavoritesFull(userId: string) {
  const supabase = await getSupabaseServer();
  const data = await readAllPages((from, to) => supabase
    .from("favorites")
    .select(`
      id,
      created_at,
      media:media_id!inner (
        id,
        mal_id,
        title,
        type,
        image,
        season,
        year,
        genres,
        format,
        status,
        total_units,
        score
      )
    `)
    .eq("user_id", userId)
    .order("id", { ascending: false }).range(from, to));

  const mediaIds = data.flatMap((favorite) => {
    const media = Array.isArray(favorite.media) ? favorite.media[0] : favorite.media;
    return media?.id ? [media.id] : [];
  });
  if (!mediaIds.length) return data.map(favorite => ({ ...favorite, user_metadata: null, progress: null }));
  const personalRows = await readInBatches(mediaIds, batch => supabase.from('user_media_progress')
    .select('media_id, custom_tags, custom_description, watch_link, status, current_episode')
    .eq('user_id', userId)
    .in('media_id', batch));
  const personalByMedia = new Map((personalRows ?? []).map((row) => [row.media_id, row]));
  return data.map((favorite) => {
    const media = Array.isArray(favorite.media) ? favorite.media[0] : favorite.media;
    return { ...favorite, progress: media?.id ? personalByMedia.get(media.id) ?? null : null, user_metadata: media?.id ? personalByMedia.get(media.id) ?? null : null };
  });
}
