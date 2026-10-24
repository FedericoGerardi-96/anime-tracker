import "server-only";

import {
  getMalAnimeCatalog,
  getMalYearOptions,
  mapMalAnimeToCard,
} from "@/lib/myanimelist-service";
import type { FavoriteMediaRow, HentaiFavoriteRow } from "@/interfaces/anime-service";
import type { MalAnimeCatalogOptions } from "@/interfaces/myanimelist";
import { getSupabaseServer } from "@/services/supabase";
import { getAniListCatalog } from '@/services/anilist-catalog';
import type { AniListCatalogOptions, CatalogProvider } from '@/interfaces/anilist-catalog';

/**
 * Loads anime from MyAnimeList's official API and enriches each card with
 * the authenticated user's AniTrack favorites stored in Supabase.
 */
export async function getAnimeListWithFavorites(options: MalAnimeCatalogOptions & AniListCatalogOptions, userId?: string) {
  let provider: CatalogProvider = 'anilist';
  let displayAnime;
  let totalPages: number | undefined;
  let hasNextPage: boolean;

  try {
    const catalog = await getAniListCatalog('anime', options);
    displayAnime = catalog.items;
    totalPages = catalog.totalPages;
    hasNextPage = catalog.hasNextPage;
  } catch (error) {
    console.error('AniList catalog unavailable; using MyAnimeList fallback:', error);
    provider = 'myanimelist';
    const catalog = await getMalAnimeCatalog(options);
    displayAnime = catalog.anime.map(mapMalAnimeToCard);
    totalPages = undefined;
    hasNextPage = catalog.hasNextPage;
  }
  const favoriteMalIds = new Set<number>();

  if (userId) {
    const supabase = await getSupabaseServer();
    const [{ data: favorites }, { data: hentaiFavorites }] = await Promise.all([
      supabase
        .from("favorites")
        .select("media!inner(mal_id, type)")
        .eq("user_id", userId)
        .eq("media.type", "anime"),
      supabase
        .from("hentai")
        .select("mal_id")
        .eq("user_id", userId)
        .eq("type", "anime").not("mal_id", "is", null),
    ]);

    for (const favorite of (favorites ?? []) as FavoriteMediaRow[]) {
      const media = Array.isArray(favorite.media) ? favorite.media[0] : favorite.media;
      if (media?.mal_id != null) favoriteMalIds.add(Number(media.mal_id));
    }

    for (const favorite of (hentaiFavorites ?? []) as HentaiFavoriteRow[]) {
      if (favorite.mal_id != null) favoriteMalIds.add(Number(favorite.mal_id));
    }
  }

  displayAnime = displayAnime.map((anime) => ({ ...anime, isFavorite: favoriteMalIds.has(Number(anime.id)) }));
  return {
    displayAnime,
    totalPages,
    yearOptions: getMalYearOptions(),
    hasNextPage,
    provider,
  };
}
