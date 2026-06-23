import { getAnimeList, mapJikanToAnimeCard, getSeasons } from '@/lib/jikan-service';
import { getSupabaseServer } from "@/services/supabase";

interface GetAnimeListOptions {
  q?: string;
  genre?: string;
  status?: string;
  sort?: string;
  season?: string;
  page?: number;
}

/**
 * Fetches anime from Jikan API, processes the season filter options,
 * and cross-references them against standard favorites and hentai favorites.
 */
export async function getAnimeListWithFavorites(options: GetAnimeListOptions, userId?: string) {
  const [animeResponse, seasonsArchive] = await Promise.all([
    getAnimeList(options),
    getSeasons()
  ]);

  const { data: animeData, pagination } = animeResponse;

  // Transform seasons archive for the filter
  const seasonOptions = seasonsArchive.slice(0, 5).flatMap(yearData => 
    yearData.seasons.map((s: string) => ({
      label: `${yearData.year} ${s.charAt(0).toUpperCase() + s.slice(1)}`,
      value: `${s}-${yearData.year}`
    }))
  );

  const favoriteMalIds = new Set<number>();

  if (userId) {
    const supabase = await getSupabaseServer();
    
    // Check standard favorites
    const { data: favs } = await supabase
      .from('favorites')
      .select('media!inner(mal_id)')
      .eq('user_id', userId);
      
    if (favs) {
      favs.forEach((f: any) => {
        const media = Array.isArray(f.media) ? f.media[0] : f.media;
        if (media?.mal_id) favoriteMalIds.add(Number(media.mal_id));
      });
    }

    // Check hentai vault
    const { data: hentaiFavs } = await supabase
      .from('hentai')
      .select('mal_id')
      .eq('user_id', userId)
      .not('mal_id', 'is', null);

    if (hentaiFavs) {
      hentaiFavs.forEach((h: any) => {
        favoriteMalIds.add(Number(h.mal_id));
      });
    }
  }

  const displayAnime = animeData.map((anime) => {
    const card = mapJikanToAnimeCard(anime);
    card.isFavorite = favoriteMalIds.has(anime.mal_id);
    return card;
  });

  const totalPages = pagination?.last_visible_page || 1;

  return {
    displayAnime,
    totalPages,
    seasonOptions,
    hasNextPage: pagination?.has_next_page || false,
  };
}
