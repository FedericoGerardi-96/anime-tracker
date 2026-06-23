import { getMangaList, mapJikanToMangaCard } from '@/lib/jikan-service';
import { getSupabaseServer } from "@/services/supabase";

interface GetMangaListOptions {
  q?: string;
  genre?: string;
  status?: string;
  sort?: string;
  page?: number;
}

/**
 * Fetches manga from Jikan API and cross-references them against the user's
 * favorites (standard and hentai) to check favorite status.
 */
export async function getMangaListWithFavorites(options: GetMangaListOptions, userId?: string) {
  const { data: mangaData, pagination } = await getMangaList(options);

  const favoriteMalIds = new Set<number>();

  if (userId) {
    const supabase = await getSupabaseServer();
    
    // Check standard favorites
    const { data: favs } = await supabase
      .from('favorites')
      .select('media!inner(mal_id)')
      .eq('user_id', userId)
      .eq('media.type', 'manga');
      
    if (favs) {
      favs.forEach((f: any) => {
        const media = Array.isArray(f.media) ? f.media[0] : f.media;
        if (media?.mal_id) favoriteMalIds.add(Number(media.mal_id));
      });
    }

    // Check hentai vault (doujin type)
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

  const displayManga = mangaData.map((manga) => {
    const card = mapJikanToMangaCard(manga);
    card.isFavorite = favoriteMalIds.has(manga.mal_id);
    return card;
  });

  const totalPages = pagination?.last_visible_page || 1;

  return {
    displayManga,
    totalPages,
    hasNextPage: pagination?.has_next_page || false,
  };
}
