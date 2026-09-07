import 'server-only';

import type { CatalogAnime, CatalogManga } from '@/interfaces/media-catalog';
import { getMalAnimeById, getMalMangaById } from '@/lib/myanimelist-service';

const ENDPOINT = 'https://graphql.anilist.co';
const QUERY = `query Detail($idMal: Int, $type: MediaType) {
  Media(idMal: $idMal, type: $type) {
    idMal title { romaji english } coverImage { extraLarge large medium }
    averageScore meanScore popularity favourites status format season seasonYear startDate { year }
    episodes chapters volumes description(asHtml: false) genres
    studios(isMain: true) { nodes { id name } }
    staff(sort: RELEVANCE, perPage: 5) { edges { role node { id name { full } } } }
    rankings { rank type allTime context }
  }
}`;

interface DetailMedia {
  idMal: number; title: { romaji: string; english?: string | null };
  coverImage?: { extraLarge?: string; large?: string; medium?: string };
  averageScore?: number | null; popularity?: number | null; favourites?: number | null;
  status?: string | null; format?: string | null; season?: string | null; seasonYear?: number | null;
  startDate?: { year?: number | null };
  episodes?: number | null; chapters?: number | null; volumes?: number | null; description?: string | null;
  genres?: string[];
  studios?: { nodes?: Array<{ id: number; name: string }> };
  staff?: { edges?: Array<{ role: string; node: { id: number; name: { full: string } } }> };
  rankings?: Array<{ rank: number; type: string; allTime?: boolean; context?: string }>;
}

async function fetchDetail(idMal: number, type: 'ANIME' | 'MANGA'): Promise<DetailMedia> {
  const response = await fetch(ENDPOINT, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { idMal, type } }),
    signal: AbortSignal.timeout(10_000), next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`AniList respondió ${response.status}`);
  const payload = await response.json() as { data?: { Media?: DetailMedia }; errors?: Array<{ message: string }> };
  if (!payload.data?.Media || payload.errors?.length) throw new Error(payload.errors?.[0]?.message ?? 'Detalle no encontrado en AniList');
  return payload.data.Media;
}

function images(media: DetailMedia) {
  const large = media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || '';
  const medium = media.coverImage?.medium || media.coverImage?.large || large;
  return { jpg: { image_url: medium, small_image_url: medium, large_image_url: large }, webp: { image_url: medium, small_image_url: medium, large_image_url: large } };
}

function genreList(media: DetailMedia) {
  return (media.genres ?? []).map((name, index) => ({ mal_id: -(index + 1), name }));
}

function rank(media: DetailMedia) {
  return media.rankings?.find((item) => item.type === 'RATED' && item.allTime)?.rank ?? null;
}

export async function getPreferredAnimeByMalId(idMal: number): Promise<CatalogAnime> {
  try {
    const media = await fetchDetail(idMal, 'ANIME');
    return {
      mal_id: idMal, images: images(media), title: media.title.romaji, title_english: media.title.english ?? null,
      type: media.format ?? 'TV', source: '', episodes: media.episodes ?? null, status: media.status ?? '',
      airing: media.status === 'RELEASING', score: media.averageScore ? media.averageScore / 10 : null,
      scored_by: media.favourites ?? null, rank: rank(media), popularity: media.popularity ?? 0,
      synopsis: media.description ?? null, season: media.season?.toLowerCase() ?? null, year: media.seasonYear ?? media.startDate?.year ?? null,
      studios: media.studios?.nodes?.map((studio) => ({ mal_id: studio.id, name: studio.name })) ?? [],
      genres: genreList(media), tags: [],
    };
  } catch (error) {
    console.error('AniList detail unavailable; using MyAnimeList fallback:', error);
    return getMalAnimeById(idMal);
  }
}

export async function getPreferredMangaByMalId(idMal: number): Promise<CatalogManga> {
  try {
    const media = await fetchDetail(idMal, 'MANGA');
    const authors = media.staff?.edges?.filter((edge) => /story|art|original creator/i.test(edge.role)).map((edge) => ({ mal_id: edge.node.id, name: edge.node.name.full })) ?? [];
    return {
      mal_id: idMal, images: images(media), title: media.title.romaji, title_english: media.title.english ?? null,
      type: media.format ?? 'MANGA', year: media.startDate?.year ?? media.seasonYear ?? null, chapters: media.chapters ?? null,
      volumes: media.volumes ?? null, status: media.status ?? '', publishing: media.status === 'RELEASING',
      score: media.averageScore ? media.averageScore / 10 : null, scored_by: media.favourites ?? null,
      rank: rank(media), popularity: media.popularity ?? 0, synopsis: media.description ?? null,
      authors, genres: genreList(media), tags: [],
    };
  } catch (error) {
    console.error('AniList detail unavailable; using MyAnimeList fallback:', error);
    return getMalMangaById(idMal);
  }
}
