import 'server-only';
import { getAniListCatalog } from '@/services/anilist-catalog';
import { getMalAnimeCatalog, mapMalAnimeToCatalog } from '@/lib/myanimelist-service';
import type { CatalogAnime } from '@/interfaces/media-catalog';

export async function getSeasonAnime(year: number, season: string): Promise<CatalogAnime[]> {
  try {
    const items: CatalogAnime[] = [];
    let page = 1;
    let hasNextPage = true;
    while (hasNextPage) {
      const batch = await getAniListCatalog('anime', { year, season, page: page++, perPage: 50 });
      items.push(...batch.items.map(item => {
        const picture = { image_url: item.image, small_image_url: item.image, large_image_url: item.image };
        return {
          mal_id: item.id, title: item.title, title_english: null, images: { jpg: picture, webp: picture },
          type: item.format ?? '', source: '', episodes: item.episodes ?? null, status: item.status ?? '',
          airing: item.isAiring, score: item.score || null, scored_by: null, rank: null, popularity: 0,
          synopsis: item.synopsis ?? null, season: item.season ?? null, year: item.year || null,
          studios: [{ mal_id: 0, name: item.studio }], genres: item.genres.map((name, index) => ({ mal_id: index, name })),
        };
      }));
      hasNextPage = batch.hasNextPage;
    }
    return items.filter(item => item.year === year);
  } catch (error) {
    console.error('AniList season unavailable; using MAL:', error);
    const items: CatalogAnime[] = [];
    let page = 1;
    let hasNextPage = true;
    while (hasNextPage) {
      const batch = await getMalAnimeCatalog({ year, season, page: page++, limit: 100 });
      items.push(...batch.anime.map(mapMalAnimeToCatalog));
      hasNextPage = batch.hasNextPage;
    }
    return items.filter(item => item.year === year);
  }
}
