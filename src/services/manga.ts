import "server-only";

import type { FavoriteMediaRow, HentaiFavoriteRow } from "@/interfaces/anime-service";
import type { MalMangaCatalogOptions } from "@/interfaces/myanimelist";
import { getMalMangaCatalog, mapMalMangaToCatalog } from "@/lib/myanimelist-service";
import { getSupabaseServer } from "@/services/supabase";
import { getAniListCatalog } from '@/services/anilist-catalog';
import type { AniListCatalogOptions, CatalogProvider } from '@/interfaces/anilist-catalog';

export async function getMangaListWithFavorites(options: MalMangaCatalogOptions & AniListCatalogOptions, userId?: string) {
  let provider: CatalogProvider = 'anilist';
  let displayManga;
  let totalPages: number | undefined;
  let hasNextPage: boolean;

  try {
    const catalog = await getAniListCatalog('manga', options);
    displayManga = catalog.items;
    totalPages = catalog.totalPages;
    hasNextPage = catalog.hasNextPage;
  } catch (error) {
    console.error('AniList catalog unavailable; using MyAnimeList fallback:', error);
    provider = 'myanimelist';
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
  const favoriteMalIds = new Set<number>();

  if (userId) {
    const supabase = await getSupabaseServer();
    const [{ data: favorites }, { data: hentaiFavorites }] = await Promise.all([
      supabase.from("favorites").select("media!inner(mal_id)").eq("user_id", userId).eq("media.type", "manga"),
      supabase.from("hentai").select("mal_id").eq("user_id", userId).not("mal_id", "is", null),
    ]);
    for (const favorite of (favorites ?? []) as FavoriteMediaRow[]) {
      const media = Array.isArray(favorite.media) ? favorite.media[0] : favorite.media;
      if (media?.mal_id != null) favoriteMalIds.add(Number(media.mal_id));
    }
    for (const favorite of (hentaiFavorites ?? []) as HentaiFavoriteRow[]) {
      if (favorite.mal_id != null) favoriteMalIds.add(Number(favorite.mal_id));
    }
  }

  displayManga = displayManga.map((manga) => ({ ...manga, isFavorite: favoriteMalIds.has(Number(manga.id)) }));
  return { displayManga, totalPages, hasNextPage, provider };
}
