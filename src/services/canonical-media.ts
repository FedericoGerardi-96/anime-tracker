import 'server-only';

import { getMalAnimeById, getMalMangaById } from '@/lib/myanimelist-service';

export interface PersistedMediaInput {
  mal_id: number; title: string; image: string; type?: 'anime' | 'manga';
  synopsis?: string; season?: string; year?: number; genres?: string[];
  tags?: string[]; format?: string; status?: string; score?: number;
  day?: string;
  totalUnits?: number;
}

export async function getCanonicalMediaInput(input: PersistedMediaInput): Promise<PersistedMediaInput> {
  try {
    if (input.type === 'manga') {
      const manga = await getMalMangaById(input.mal_id);
      return { ...input, title: manga.title_english || manga.title, image: manga.images.webp.large_image_url || manga.images.jpg.large_image_url, synopsis: manga.synopsis ?? undefined, season: undefined, year: manga.year ?? undefined, genres: manga.genres.map((genre) => genre.name), tags: [], format: manga.type, status: manga.status, totalUnits: manga.chapters ?? undefined, score: manga.score ?? 0 };
    }
    const anime = await getMalAnimeById(input.mal_id);
    return { ...input, type: 'anime', title: anime.title_english || anime.title, image: anime.images.webp.large_image_url || anime.images.jpg.large_image_url, synopsis: anime.synopsis ?? undefined, season: anime.season ?? undefined, year: anime.year ?? undefined, genres: anime.genres.map((genre) => genre.name), tags: [], format: anime.type, status: anime.status, day: anime.broadcast?.day ?? undefined, totalUnits: anime.episodes ?? undefined, score: anime.score ?? 0 };
  } catch {
    // Si MAL está temporalmente caído, no bloqueamos la acción del usuario.
    return input;
  }
}
