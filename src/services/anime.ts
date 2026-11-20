import "server-only";
import { getCatalogProvider } from "@/services/catalog-provider";

import {
  getMalAnimeCatalog,
  getMalYearOptions,
  mapMalAnimeToCard,
} from "@/lib/myanimelist-service";
import type { MalAnimeCatalogOptions } from "@/interfaces/myanimelist";
import { getCatalogFavoriteIds } from "@/services/catalog-favorites";
import { getMediaLibraryStatuses } from '@/services/related-anime';
import { getAniListCatalog } from '@/services/anilist-catalog';
import type { AniListCatalogOptions, CatalogProvider } from '@/interfaces/anilist-catalog';

/** Loads the selected catalog and adds local favorites. */
export async function getAnimeListWithFavorites(options: MalAnimeCatalogOptions & AniListCatalogOptions, userId?: string) {
  const provider: CatalogProvider = await getCatalogProvider();
  let displayAnime;
  let totalPages: number | undefined;
  let hasNextPage: boolean;

  if (provider === 'anilist') {
    const catalog = await getAniListCatalog('anime', options);
    displayAnime = catalog.items;
    totalPages = catalog.totalPages;
    hasNextPage = catalog.hasNextPage;
  } else {
    const catalog = await getMalAnimeCatalog(options);
    displayAnime = catalog.anime.map(mapMalAnimeToCard);
    totalPages = undefined;
    hasNextPage = catalog.hasNextPage;
  }
  const ids = displayAnime.map(item => Number(item.id));
  const [favoriteMalIds, libraryStatuses] = await Promise.all([
    getCatalogFavoriteIds(userId, 'anime', ids),
    getMediaLibraryStatuses('anime', ids),
  ]);

  displayAnime = displayAnime.map((anime) => ({
    ...anime,
    isFavorite: favoriteMalIds.has(Number(anime.id)),
    libraryStatus: libraryStatuses.get(Number(anime.id)),
  }));
  return {
    displayAnime,
    totalPages,
    yearOptions: getMalYearOptions(),
    hasNextPage,
    provider,
  };
}
