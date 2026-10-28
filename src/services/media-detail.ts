import 'server-only';
import { providerRead, ProviderRequestError } from '@/services/provider-request';
import { getCatalogProvider } from '@/services/catalog-provider';
import { cache } from 'react';

import type { CatalogAnime, CatalogManga } from '@/interfaces/media-catalog';
import { getMalAnimeById, getMalMangaById } from '@/lib/myanimelist-service';

const ENDPOINT = 'https://graphql.anilist.co';
const QUERY = `query Detail($idMal: Int, $type: MediaType) {
  Media(idMal: $idMal, type: $type) {
    idMal title { romaji english native } coverImage { extraLarge large medium }
    averageScore meanScore popularity favourites status format season seasonYear startDate { year month day } endDate { year month day } source duration synonyms
    episodes chapters volumes description(asHtml: false) genres
    studios(isMain: true) { nodes { id name } }
    staff(sort: RELEVANCE, perPage: 5) { edges { role node { id name { full } } } }
    rankings { rank type allTime context }
  }
}`;

interface FuzzyDate { year?: number | null; month?: number | null; day?: number | null }

function partialDate(date?: FuzzyDate): string | null {
  if (!date?.year) return null;
  const year = String(date.year);
  if (!date.month) return year;
  const month = `${year}-${String(date.month).padStart(2, '0')}`;
  return date.day ? `${month}-${String(date.day).padStart(2, '0')}` : month;
}

function detailMetadata(media: DetailMedia) {
  return {
    title_japanese: media.title.native ?? null,
    title_synonyms: media.synonyms ?? [],
    start_date: partialDate(media.startDate),
    end_date: partialDate(media.endDate),
    duration_minutes: media.duration ?? null,
  };
}

interface DetailMedia {
  idMal: number; title: { romaji: string; english?: string | null; native?: string | null };
  coverImage?: { extraLarge?: string; large?: string; medium?: string };
  averageScore?: number | null; popularity?: number | null; favourites?: number | null;
  status?: string | null; format?: string | null; season?: string | null; seasonYear?: number | null;
  startDate?: FuzzyDate;
  endDate?: FuzzyDate;
  source?: string | null;
  duration?: number | null;
  synonyms?: string[];
  episodes?: number | null; chapters?: number | null; volumes?: number | null; description?: string | null;
  genres?: string[];
  studios?: { nodes?: Array<{ id: number; name: string }> };
  staff?: { edges?: Array<{ role: string; node: { id: number; name: { full: string } } }> };
  rankings?: Array<{ rank: number; type: string; allTime?: boolean; context?: string }>;
}

async function fetchDetail(idMal: number, type: 'ANIME' | 'MANGA'): Promise<DetailMedia> {
  const payload = await providerRead<{ data?: { Media?: DetailMedia }; errors?: Array<{ message: string }> }>('anilist', 'detail', ENDPOINT, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { idMal, type } }),
    signal: AbortSignal.timeout(10_000), next: { revalidate: 3600 },
  });
  if (!payload.data?.Media || payload.errors?.length) throw new ProviderRequestError('anilist', 404);
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

export const getPreferredAnimeByMalId = cache(async (idMal: number): Promise<CatalogAnime> => {
  if (await getCatalogProvider() === 'myanimelist') return getMalAnimeById(idMal);
  {
    const media = await fetchDetail(idMal, 'ANIME');
    return {
      ...detailMetadata(media),
      mal_id: idMal, images: images(media), title: media.title.romaji, title_english: media.title.english ?? null,
      type: media.format ?? 'TV', source: media.source ?? '', episodes: media.episodes ?? null, status: media.status ?? '',
      airing: media.status === 'RELEASING', score: media.averageScore ? media.averageScore / 10 : null,
      scored_by: media.favourites ?? null, rank: rank(media), popularity: media.popularity ?? 0,
      synopsis: media.description ?? null, season: media.season?.toLowerCase() ?? null, year: media.seasonYear ?? media.startDate?.year ?? null,
      studios: media.studios?.nodes?.map((studio) => ({ mal_id: studio.id, name: studio.name })) ?? [],
      genres: genreList(media), tags: [],
    };
  }
});

export const getPreferredMangaByMalId = cache(async (idMal: number): Promise<CatalogManga> => {
  if (await getCatalogProvider() === 'myanimelist') return getMalMangaById(idMal);
  {
    const media = await fetchDetail(idMal, 'MANGA');
    const authors = media.staff?.edges?.filter((edge) => /story|art|original creator/i.test(edge.role)).map((edge) => ({ mal_id: edge.node.id, name: edge.node.name.full })) ?? [];
    return {
      ...detailMetadata(media),
      mal_id: idMal, images: images(media), title: media.title.romaji, title_english: media.title.english ?? null,
      type: media.format ?? 'MANGA', year: media.startDate?.year ?? media.seasonYear ?? null, chapters: media.chapters ?? null,
      volumes: media.volumes ?? null, status: media.status ?? '', publishing: media.status === 'RELEASING',
      score: media.averageScore ? media.averageScore / 10 : null, scored_by: media.favourites ?? null,
      rank: rank(media), popularity: media.popularity ?? 0, synopsis: media.description ?? null,
      authors, genres: genreList(media), tags: [],
    };
  }
});
