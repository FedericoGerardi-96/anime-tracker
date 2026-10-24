import 'server-only';

import type { AniListCatalogOptions, AniListCatalogResult, CatalogMediaType } from '@/interfaces/anilist-catalog';

const ENDPOINT = 'https://graphql.anilist.co';

const QUERY = `
  query Catalog(
    $page: Int, $perPage: Int, $type: MediaType, $search: String,
    $genre: [String], $excludedGenre: [String], $format: [MediaFormat],
    $status: [MediaStatus], $season: MediaSeason, $seasonYear: Int, $year: String, $startDate: FuzzyDateInt, $endDate: FuzzyDateInt,
    $minimumScore: Int, $maximumScore: Int, $sort: [MediaSort]
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { currentPage lastPage hasNextPage total }
      media(
        type: $type, search: $search, genre_in: $genre, genre_not_in: $excludedGenre,
        format_in: $format, status_in: $status, season: $season, seasonYear: $seasonYear, startDate_like: $year, startDate_greater: $startDate, startDate_lesser: $endDate,
        averageScore_greater: $minimumScore, averageScore_lesser: $maximumScore, sort: $sort, isAdult: false
      ) {
        id
        idMal
        popularity
        trending
        title { romaji english }
        coverImage { extraLarge large medium }
        averageScore
        status
        format
        season
        seasonYear
        startDate { year month day }
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
  id: number;
  popularity?: number;
  trending?: number;
  idMal?: number | null;
  title: { romaji: string; english?: string | null };
  coverImage?: { extraLarge?: string; large?: string; medium?: string };
  averageScore?: number | null;
  status?: string | null;
  format?: string | null;
  season?: string | null;
  seasonYear?: number | null;
  startDate?: { year?: number | null; month?: number | null; day?: number | null };
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

function variables(type: CatalogMediaType, options: AniListCatalogOptions, maximumScore?: number) {
  const validYear = (value: number | undefined) => value && Number.isInteger(value) && value >= 1900 && value <= new Date().getFullYear() + 1 ? value : undefined;
  const from = validYear(options.yearFrom);
  const to = validYear(options.yearTo);
  const hasRange = Boolean(from || to);
  const lower = from && to ? Math.min(from, to) : from;
  const upper = from && to ? Math.max(from, to) : to;
  return {
    startDate: lower ? lower * 10000 : undefined,
    endDate: upper ? upper * 10000 + 1231 : undefined,
    page: options.page ?? 1,
    perPage: Math.min(options.perPage ?? 24, 50),
    type: type.toUpperCase(),
    search: options.q || undefined,
    genre: options.genre ? options.genre.split(',').filter(Boolean) : undefined,
    excludedGenre: options.excludeGenre ? options.excludeGenre.split(',').filter(Boolean) : undefined,
    format: options.format ? options.format.split(',').filter(Boolean) : undefined,
    status: options.status ? options.status.split(',').map((status) => STATUS[status]).filter(Boolean) : undefined,
    season: type === 'anime' && options.season ? options.season.toUpperCase() : undefined,
    seasonYear: !hasRange && type === 'anime' && options.season && options.year ? options.year : undefined,
    year: !hasRange && options.year && !(type === 'anime' && options.season) ? `${options.year}%` : undefined,
    minimumScore: options.minScore,
    maximumScore,
    sort: [...(SORT[options.sort ?? 'popularity'] ?? SORT.popularity), 'ID_DESC'],
  };
}

async function fetchCatalogPage(type: CatalogMediaType, options: AniListCatalogOptions, maximumScore?: number) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: variables(type, options, maximumScore) }),
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`AniList respondió ${response.status}`);
  const payload = await response.json() as AniListResponse;
  if (payload.errors?.length || !payload.data?.Page) throw new Error(payload.errors?.[0]?.message ?? 'Respuesta inválida de AniList');
  return payload.data.Page;
}

const SCORE_BANDS: Record<string, [number, number]> = {
  under6: [0, 59], '6to7': [60, 69], '7to8': [70, 79], '8to9': [80, 89], '9plus': [90, 100],
};

function compareMedia(sort: string | undefined, a: AniListMedia, b: AniListMedia) {
  const score = (b.averageScore ?? 0) - (a.averageScore ?? 0);
  const popularity = (b.popularity ?? 0) - (a.popularity ?? 0);
  const date = (media: AniListMedia) => (media.startDate?.year ?? 0) * 10000 + (media.startDate?.month ?? 0) * 100 + (media.startDate?.day ?? 0);
  let difference: number;
  switch (sort) {
    case 'score': difference = score || popularity; break;
    case 'trending': difference = (b.trending ?? 0) - (a.trending ?? 0) || popularity; break;
    case 'newest': difference = date(b) - date(a); break;
    case 'title': difference = a.title.romaji.localeCompare(b.title.romaji); break;
    default: difference = popularity || score;
  }
  return difference || b.id - a.id;
}

export async function getAniListCatalog(type: CatalogMediaType, options: AniListCatalogOptions = {}): Promise<AniListCatalogResult> {
  const bands = [...new Set(options.scoreBands?.split(',') ?? [])].filter((band) => SCORE_BANDS[band]);
  // Merge adjacent bands so the usual 8–9 + 9+ selection needs only one request.
  const ranges: [number, number][] = [];
  for (const band of bands.map((key) => SCORE_BANDS[key]).sort((a, b) => a[0] - b[0])) {
    const previous = ranges.at(-1);
    if (previous && previous[1] + 1 === band[0]) previous[1] = band[1];
    else ranges.push([...band]);
  }
  let page;
  if (ranges.length <= 1) {
    page = await fetchCatalogPage(type, { ...options, minScore: ranges[0]?.[0] ?? options.minScore }, ranges[0]?.[1]);
  } else {
    // AniList has no OR operator for score intervals. Fetch each interval's sorted
    // prefix, merge globally, then take the requested page (never filter one page locally).
    const perPage = Math.min(options.perPage ?? 24, 50);
    const currentPage = Math.max(options.page ?? 1, 1);
    const needed = currentPage * perPage + 1;
    const results = await Promise.all(ranges.map(async ([minimum, maximum]) => {
      const media: AniListMedia[] = [];
      let nextPage = 1;
      let hasNextPage = true;
      while (media.length < needed && hasNextPage) {
        const batch = await fetchCatalogPage(type, { ...options, page: nextPage++, perPage: 50, minScore: minimum }, maximum);
        media.push(...batch.media);
        hasNextPage = batch.pageInfo.hasNextPage;
      }
      return { media, hasNextPage };
    }));
    const media = results.flatMap((result) => result.media).sort((a, b) => compareMedia(options.sort, a, b));
    const hasNextPage = media.length > currentPage * perPage || results.some((result) => result.hasNextPage);
    page = {
      media: media.slice((currentPage - 1) * perPage, currentPage * perPage),
      pageInfo: { hasNextPage, lastPage: hasNextPage ? currentPage + 1 : Math.max(1, Math.ceil(media.length / perPage)) },
    };
  }
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
