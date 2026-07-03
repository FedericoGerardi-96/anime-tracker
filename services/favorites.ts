import { getSupabaseServer } from "@/services/supabase";
import { IFavorites } from "@/types/favorites";

interface GetFavoritesOptions {
  query?: string;
  page?: number;
  pageSize?: number;
  tags?: string[];
  sortBy?: string;
  status?: string;
}

/**
 * Fetches search-filtered, tags-filtered, sorted and paginated favorites for a specific user.
 * Includes user-specific metadata (custom description, watch link, custom tags) when available.
 */
export async function getFavorites(userId: string, options: GetFavoritesOptions = {}) {
  const supabase = await getSupabaseServer();
  const { query = "", page = 1, pageSize = 15, tags = [], sortBy = "", status = "" } = options;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let dbQuery = supabase
    .from("favorites")
    .select(
      `
      id,
      media:media_id!inner (
        id,
        mal_id,
        title,
        type,
        image,
        description,
        season,
        tags,
        score
      )
    `,
      { count: "exact" }
    )
    .eq("user_id", userId);

  // Search in both Jikan media table and user custom metadata table
  const cleanQuery = query.trim();
  if (cleanQuery) {
    // 1. Search Jikan details
    const { data: mediaMatches } = await supabase
      .from("media")
      .select("id")
      .or(`title.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%,tags.cs.{${cleanQuery}}`);

    const matchedMediaIdsByJikan = mediaMatches?.map((m: any) => m.id) || [];

    // 2. Search custom descriptions and tags
    const { data: metaMatches } = await supabase
      .from("user_media_metadata")
      .select("media_id")
      .eq("user_id", userId)
      .or(`custom_description.ilike.%${cleanQuery}%,custom_tags.cs.{${cleanQuery.toLowerCase()}}`);

    const matchedMediaIdsByMeta = metaMatches?.map((m: any) => m.media_id) || [];

    const allMatchedMediaIds = Array.from(new Set([...matchedMediaIdsByJikan, ...matchedMediaIdsByMeta]));

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
      .from("user_anime_progress")
      .select("media_id")
      .eq("user_id", userId)
      .eq("status", status);

    const matchedMediaIdsByStatus = progressMatches?.map((p: any) => p.media_id) || [];

    if (matchedMediaIdsByStatus.length > 0) {
      dbQuery = dbQuery.in("media_id", matchedMediaIdsByStatus);
    } else {
      // Force empty result
      dbQuery = dbQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    }
  }

  if (tags && tags.length > 0) {
    const formattedTags = tags.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(",");
    dbQuery = dbQuery.filter("media.tags", "ov", `{${formattedTags}}`);
  }

  // Handle sorting
  if (sortBy === "Title") {
    dbQuery = dbQuery.order("title", { referencedTable: "media", ascending: true });
  } else if (sortBy === "Score") {
    dbQuery = dbQuery.order("score", { referencedTable: "media", ascending: false });
  } else {
    // Default to Date Added (id desc)
    dbQuery = dbQuery.order("id", { ascending: false });
  }

  const { data: favoritesData, count, error } = await dbQuery
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
    // Fetch custom metadata
    const { data: metadataRows } = await supabase
      .from("user_media_metadata")
      .select("id, media_id, custom_description, watch_link, custom_tags")
      .eq("user_id", userId)
      .in("media_id", mediaIds);

    if (metadataRows) {
      metadataMap = Object.fromEntries(
        metadataRows.map((row: any) => [row.media_id, row])
      );
    }

    // Fetch tracking progress/status
    const { data: progressRows } = await supabase
      .from("user_anime_progress")
      .select("media_id, status, current_episode")
      .eq("user_id", userId)
      .in("media_id", mediaIds);

    if (progressRows) {
      progressMap = Object.fromEntries(
        progressRows.map((row: any) => [row.media_id, row])
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
    .select("media!inner(mal_id)")
    .eq("user_id", userId);

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
    .select('id, media!inner(mal_id)')
    .eq('user_id', userId)
    .eq('media.mal_id', malId)
    .maybeSingle();

  if (favSimple) return true;

  // Check hentai vault
  const { data: hentaiFav } = await supabase
    .from('hentai')
    .select('id')
    .eq('user_id', userId)
    .eq('mal_id', malId)
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
        description,
        season,
        tags,
        score
      )
    `)
    .eq("user_id", userId)
    .order("id", { ascending: false });

  if (error || !data) return [];
  return data;
}
