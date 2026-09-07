import 'server-only';

import type { AniListCatalogOptions, AniListCatalogResult, CatalogMediaType } from '@/interfaces/anilist-catalog';

const ENDPOINT = 'https://graphql.anilist.co';

const QUERY = `
  query Catalog(
    $page: Int, $perPage: Int, $type: MediaType, $search: String,
    $genre: [String], $excludedGenre: [String], $format: [MediaFormat],
    $status: MediaStatus, $season: MediaSeason, $seasonYear: Int, $year: String,
    $minimumScore: Int, $sort: [MediaSort]
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { currentPage lastPage hasNextPage total }
      media(
        type: $type, search: $search, genre_in: $genre, genre_not_in: $excludedGenre,
        format_in: $format, status: $status, season: $season, seasonYear: $seasonYear, startDate_like: $year,
        averageScore_greater: $minimumScore, sort: $sort, isAdult: false
      ) {
        idMal
        title { romaji english }
        coverImage { extraLarge large medium }
        averageScore
        status
        format
        season
        seasonYear
        startDate { year }
        episodes
        chapters
        description(asHtml: false)
        genres
        studios(isMain: true) { nodes { name } }
      }
    }
  }
`;

interface AniListMedia {
  idMal?: number | null;
  title: { romaji: string; english?: string | null };
  coverImage?: { extraLarge?: string; large?: string; medium?: string };
  averageScore?: number | null;
  status?: string | null;
  format?: string | null;
  season?: string | null;
  seasonYear?: number | null;
  startDate?: { year?: number | null };
  episodes?: number | null;
  chapters?: number | null;
  description?: string | null;
  genres?: string[];
  studios?: { nodes?: Array<{ name: string }> };
}

interface AniListResponse {
  data?: { Page?: { pageInfo: { lastPage: number; hasNextPage: boolean }; media: AniListMedia[] } };
  errors?: Array<{ message: string }>;
}

const STATUS: Record<string, string> = {
  airing: 'RELEASING', completed: 'FINISHED', upcoming: 'NOT_YET_RELEASED',
  cancelled: 'CANCELLED', hiatus: 'HIATUS',
};

const SORT: Record<string, string[]> = {
  popularity: ['POPULARITY_DESC', 'SCORE_DESC'], score: ['SCORE_DESC', 'POPULARITY_DESC'],
  trending: ['TRENDING_DESC', 'POPULARITY_DESC'], newest: ['START_DATE_DESC'], title: ['TITLE_ROMAJI'],
};

function variables(type: CatalogMediaType, options: AniListCatalogOptions) {
  return {
    page: options.page ?? 1,
    perPage: Math.min(options.perPage ?? 24, 50),
    type: type.toUpperCase(),
    search: options.q || undefined,
    genre: options.genre ? [options.genre] : undefined,
    excludedGenre: options.excludeGenre ? [options.excludeGenre] : undefined,
    format: options.format ? [options.format] : undefined,
    status: options.status ? STATUS[options.status] : undefined,
    season: type === 'anime' && options.season ? options.season.toUpperCase() : undefined,
    seasonYear: type === 'anime' && options.season && options.year ? options.year : undefined,
    year: options.year && !(type === 'anime' && options.season) ? `${options.year}%` : undefined,
    minimumScore: options.minScore ? options.minScore : undefined,
    sort: SORT[options.sort ?? 'popularity'] ?? SORT.popularity,
  };
}

export async function getAniListCatalog(type: CatalogMediaType, options: AniListCatalogOptions = {}): Promise<AniListCatalogResult> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: variables(type, options) }),
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`AniList respondió ${response.status}`);
  const payload = await response.json() as AniListResponse;
  if (payload.errors?.length || !payload.data?.Page) throw new Error(payload.errors?.[0]?.message ?? 'Respuesta inválida de AniList');

  const page = payload.data.Page;
  const items = page.media.filter((media): media is AniListMedia & { idMal: number } => Number.isInteger(media.idMal)).map((media) => ({
    id: media.idMal,
    title: media.title.english?.trim() || media.title.romaji,
    image: media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || '',
    score: (media.averageScore ?? 0) / 10,
    studio: media.studios?.nodes?.[0]?.name || (type === 'manga' ? 'Autor desconocido' : 'Estudio desconocido'),
    year: media.seasonYear || media.startDate?.year || 0,
    isAiring: media.status === 'RELEASING',
    synopsis: media.description ?? undefined,
    season: media.season?.toLowerCase(),
    genres: media.genres ?? [],
    tags: [],
    format: media.format ?? undefined,
    status: media.status ?? undefined,
    episodes: type === 'anime' ? media.episodes ?? undefined : media.chapters ?? undefined,
    totalUnits: type === 'anime' ? media.episodes ?? undefined : media.chapters ?? undefined,
    type,
  }));
  return { items, totalPages: page.pageInfo.lastPage, hasNextPage: page.pageInfo.hasNextPage };
}
