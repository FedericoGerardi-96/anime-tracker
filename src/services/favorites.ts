import { filterValues, catalogStatuses, scoreRanges } from '@/lib/library-filters';
import type { GetFavoritesOptions } from "@/interfaces/favorites-service";
import { getSupabaseServer } from "@/services/supabase";
import { IFavorites } from "@/types/favorites";
import { matchesLibrarySearch } from "@/lib/library-search";


/**
 * Fetches search-filtered, tags-filtered, sorted and paginated favorites for a specific user.
 * Includes user-specific metadata (custom description, watch link, custom tags) when available.
 */
export async function getFavorites(userId: string, options: GetFavoritesOptions = {}) {
  const supabase = await getSupabaseServer();
  const { query = "", page = 1, pageSize = 15, tags = [], sortBy = "", sortDirection = "desc", status = "", mediaType, genre, catalogStatus, year, season, format, minScore } = options;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let dbQuery = supabase
    .from("favorites")
    .select(
      `
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
    `,
      { count: "exact" }
    )
    .eq("user_id", userId);

  if (filterValues(mediaType).length) dbQuery = dbQuery.in('media.type', filterValues(mediaType));
  if (filterValues(genre).length) dbQuery = dbQuery.contains('media.genres', filterValues(genre));
  const mediaConditions: string[] = [];
  if (filterValues(options.excludeGenre).length) {
    const literal = '{' + filterValues(options.excludeGenre).map((value) => '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
    mediaConditions.push(`or(genres.is.null,genres.not.ov.${literal})`);
  }
  if (year) dbQuery = dbQuery.eq('media.year', year);
  const lower = options.yearFrom && options.yearTo ? Math.min(options.yearFrom, options.yearTo) : options.yearFrom;
  const upper = options.yearFrom && options.yearTo ? Math.max(options.yearFrom, options.yearTo) : options.yearTo;
  if (lower) dbQuery = dbQuery.gte('media.year', lower);
  if (upper) dbQuery = dbQuery.lte('media.year', upper);
  if (filterValues(season).length) dbQuery = dbQuery.in('media.season', filterValues(season));
  if (filterValues(format).length) dbQuery = dbQuery.in('media.format', filterValues(format));
  if (minScore) dbQuery = dbQuery.gte('media.score', minScore);
  const ranges = scoreRanges(options.scoreBands);
  if (ranges.length) mediaConditions.push(`or(${ranges.map(([lower, upper]) => `and(score.gte.${lower},score.lt.${upper})`).join(',')})`);
  if (mediaConditions.length) dbQuery = dbQuery.or(`and(${mediaConditions.join(',')})`, { referencedTable: 'media' });
  if (catalogStatuses(catalogStatus).length) dbQuery = dbQuery.in('media.status', catalogStatuses(catalogStatus));

  // Search in both catalog media and user custom metadata.
  const cleanQuery = query.trim();
  if (cleanQuery) {
    const [{ data: favoriteCandidates }, { data: metadataCandidates }] = await Promise.all([
      supabase
        .from("favorites")
        .select("media:media_id!inner(id, title)")
        .eq("user_id", userId),
      supabase
        .from("user_media_progress")
        .select("media_id, custom_description, custom_tags")
        .eq("user_id", userId),
    ]);

    const matchedMediaIdsByCatalog = (favoriteCandidates ?? []).flatMap((row: any) => {
      const media = Array.isArray(row.media) ? row.media[0] : row.media;
      return media && matchesLibrarySearch(cleanQuery, [media.title]) ? [media.id] : [];
    });

    const matchedMediaIdsByMeta = (metadataCandidates ?? [])
      .filter((row: any) => matchesLibrarySearch(cleanQuery, [row.custom_description, row.custom_tags]))
      .map((row: any) => row.media_id);

    const allMatchedMediaIds = Array.from(new Set([...matchedMediaIdsByCatalog, ...matchedMediaIdsByMeta]));

    if (allMatchedMediaIds.length > 0) {
      dbQuery = dbQuery.in("media_id", allMatchedMediaIds);
    } else {
      // Force empty result
      dbQuery = dbQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    }
  }

  // Filter by progress status
  if (status && status !== "All Statuses") {
    const { data: progressMatches } = await supabase
      .from("user_media_progress")
      .select("media_id")
      .eq("user_id", userId)
      .in("status", filterValues(status));

    const matchedMediaIdsByStatus = progressMatches?.map((p: any) => p.media_id) || [];

    if (matchedMediaIdsByStatus.length > 0) {
      dbQuery = dbQuery.in("media_id", matchedMediaIdsByStatus);
    } else {
      // Force empty result
      dbQuery = dbQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    }
  }

  if (tags && tags.length > 0) {
    const { data: tagMatches } = await supabase.from('user_media_progress').select('media_id').eq('user_id', userId).overlaps('custom_tags', tags);
    const ids = (tagMatches ?? []).map((row) => row.media_id);
    dbQuery = ids.length ? dbQuery.in('media_id', ids) : dbQuery.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  // Handle sorting
  if (sortBy === "Title") {
    dbQuery = dbQuery.order("media(title)", { ascending: sortDirection === "asc" });
  } else if (sortBy === "Score") {
    dbQuery = dbQuery.order("media(score)", { ascending: sortDirection === "asc", nullsFirst: false });
  } else if (sortBy === "Year") {
    dbQuery = dbQuery.order("media(year)", { ascending: sortDirection === "asc", nullsFirst: false });
  } else {
    dbQuery = dbQuery.order("created_at", { ascending: sortDirection === "asc" });
  }

  const { data: favoritesData, count, error } = await dbQuery
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("Error fetching favorites:", error);
  }

  const rawFavorites = (favoritesData ?? []) as any[];

  // Batch-fetch user metadata for the returned media IDs
  const mediaIds = rawFavorites.map((fav) => {
    const media = Array.isArray(fav.media) ? fav.media[0] : fav.media;
    return media?.id;
  }).filter(Boolean);

  let metadataMap: Record<string, any> = {};
  let progressMap: Record<string, any> = {};

  if (mediaIds.length > 0) {
    const { data: personalRows } = await supabase
      .from("user_media_progress")
      .select("id, media_id, custom_description, watch_link, custom_tags, status, current_episode")
      .eq("user_id", userId)
      .in("media_id", mediaIds);

    if (personalRows) {
      metadataMap = Object.fromEntries(
        personalRows.map((row: any) => [row.media_id, row])
      );
      progressMap = Object.fromEntries(
        personalRows.map((row: any) => [row.media_id, row])
      );
    }
  }

  // Merge metadata and progress into favorites
  const favorites = rawFavorites.map((fav) => {
    const media = Array.isArray(fav.media) ? fav.media[0] : fav.media;
    const mediaId = media?.id;
    return {
      ...fav,
      user_metadata: mediaId ? metadataMap[mediaId] ?? null : null,
      progress: mediaId ? progressMap[mediaId] ?? null : null,
    };
  }) as IFavorites[];

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    favorites,
    totalCount,
    totalPages,
  };
}



/**
 * Fetches favorites with simple media detail (id, mal_id, title, image) for a specific user.
 */
export async function getFavoritesWithMedia(userId: string) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("favorites")
    .select("id, media!inner(mal_id, title, image)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id as string,
    mal_id: row.media.mal_id as number,
    title: row.media.title as string,
    image: row.media.image as string,
  }));
}

/**
 * Fetches a list of MyAnimeList IDs for the user's favorites.
 */
export async function getFavoriteMalIds(userId: string): Promise<number[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("favorites")
    .select("media!inner(mal_id, type)")
    .eq("user_id", userId)
    .eq("media.type", "anime");

  if (error || !data) return [];

  return data.map((row: any) => row.media.mal_id);
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
  const { data, error } = await supabase
    .from("favorites")
    .select(`
      id,
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
    .order("id", { ascending: false });

  if (error || !data) return [];
  const mediaIds = data.flatMap((favorite) => {
    const media = Array.isArray(favorite.media) ? favorite.media[0] : favorite.media;
    return media?.id ? [media.id] : [];
  });
  if (!mediaIds.length) return data;
  const { data: personalRows } = await supabase.from('user_media_progress')
    .select('media_id, custom_tags')
    .eq('user_id', userId)
    .in('media_id', mediaIds);
  const personalByMedia = new Map((personalRows ?? []).map((row) => [row.media_id, row]));
  return data.map((favorite) => {
    const media = Array.isArray(favorite.media) ? favorite.media[0] : favorite.media;
    return { ...favorite, user_metadata: media?.id ? personalByMedia.get(media.id) ?? null : null };
  });
}
