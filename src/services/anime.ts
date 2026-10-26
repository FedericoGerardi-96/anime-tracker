import "server-only";

import {
  getMalAnimeCatalog,
  getMalYearOptions,
  mapMalAnimeToCard,
} from "@/lib/myanimelist-service";
import type { MalAnimeCatalogOptions } from "@/interfaces/myanimelist";
import { getCatalogFavoriteIds } from "@/services/catalog-favorites";
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
  const favoriteMalIds = await getCatalogFavoriteIds(userId, 'anime', displayAnime.map(item => Number(item.id)));

  displayAnime = displayAnime.map((anime) => ({ ...anime, isFavorite: favoriteMalIds.has(Number(anime.id)) }));
  return {
    displayAnime,
    totalPages,
    yearOptions: getMalYearOptions(),
    hasNextPage,
    provider,
  };
}
