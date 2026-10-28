import "server-only";
import { getCatalogProvider } from "@/services/catalog-provider";

import type { MalMangaCatalogOptions } from "@/interfaces/myanimelist";
import { getMalMangaCatalog, mapMalMangaToCatalog } from "@/lib/myanimelist-service";
import { getCatalogFavoriteIds } from "@/services/catalog-favorites";
import { getAniListCatalog } from '@/services/anilist-catalog';
import type { AniListCatalogOptions, CatalogProvider } from '@/interfaces/anilist-catalog';

export async function getMangaListWithFavorites(options: MalMangaCatalogOptions & AniListCatalogOptions, userId?: string) {
  const provider: CatalogProvider = await getCatalogProvider();
  let displayManga;
  let totalPages: number | undefined;
  let hasNextPage: boolean;

  if (provider === 'anilist') {
    const catalog = await getAniListCatalog('manga', options);
    displayManga = catalog.items;
    totalPages = catalog.totalPages;
    hasNextPage = catalog.hasNextPage;
  } else {
    const catalog = await getMalMangaCatalog(options);
    displayManga = catalog.manga.map((manga) => {
      const item = mapMalMangaToCatalog(manga);
      return {
        id: item.mal_id, title: item.title_english || item.title,
        image: item.images.webp.large_image_url, score: item.score ?? 0,
        studio: item.authors[0]?.name || "Autor desconocido",
        isAiring: item.publishing, synopsis: item.synopsis ?? undefined,
        season: undefined, year: item.year ?? 0,
        genres: item.genres.map((genre) => genre.name), tags: [], format: manga.media_type,
        status: manga.status, type: "manga" as const,
      };
    });
    totalPages = undefined;
    hasNextPage = catalog.hasNextPage;
  }
  const favoriteMalIds = await getCatalogFavoriteIds(userId, 'manga', displayManga.map(item => Number(item.id)));

  displayManga = displayManga.map((manga) => ({ ...manga, isFavorite: favoriteMalIds.has(Number(manga.id)) }));
  return { displayManga, totalPages, hasNextPage, provider };
}
