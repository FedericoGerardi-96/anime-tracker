import "server-only";

import type { AnimeCardProps } from "@/components/cards/AnimeCard";
import type {
  MalAnimeCatalogOptions,
  MalAnimeCatalogResult,
  MalAnimeNode,
  MalAnimeRankingEntry,
  MalListResponse,
  MalMangaCatalogOptions,
  MalMangaCatalogResult,
  MalMangaNode,
} from "@/interfaces/myanimelist";
import type { CatalogAnime, CatalogManga, CatalogRecommendation } from "@/interfaces/media-catalog";

const MAL_API_BASE = "https://api.myanimelist.net/v2";

export class MyAnimeListConfigError extends Error {
  constructor() {
    super("Falta configurar MAL_CLIENT_ID en el archivo .env");
    this.name = "MyAnimeListConfigError";
  }
}

export class MyAnimeListApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "MyAnimeListApiError";
    this.status = status;
  }
}

export function isMyAnimeListUnavailableError(error: unknown): boolean {
  return error instanceof MyAnimeListApiError && (error.status === 429 || error.status >= 500);
}

function getClientId(): string {
  const clientId = process.env.MAL_CLIENT_ID?.trim();
  if (!clientId) throw new MyAnimeListConfigError();
  return clientId;
}

async function malFetch<T>(path: string, searchParams?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${MAL_API_BASE}${path}`);
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: {
      "X-MAL-CLIENT-ID": getClientId(),
      Accept: "application/json",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    let message = `MyAnimeList API respondió ${response.status}`;
    try {
      const body = await response.clone().json();
      if (typeof body?.message === "string") message = body.message;
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // Keep the status-based message when MAL does not return JSON.
    }
    throw new MyAnimeListApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}

const ANIME_LIST_FIELDS = [
  "id",
  "title",
  "main_picture",
  "alternative_titles",
  "mean",
  "rank",
  "popularity",
  "media_type",
  "status",
  "num_episodes",
  "start_date",
  "synopsis",
  "source",
  "genres",
  "studios",
  "start_season",
  "broadcast",
].join(",");

const MANGA_LIST_FIELDS = [
  "id", "title", "main_picture", "alternative_titles", "mean", "rank",
  "popularity", "media_type", "status", "num_volumes", "num_chapters",
  "start_date", "synopsis", "genres", "authors{first_name,last_name}",
  "num_scoring_users",
].join(",");

export async function getMalAnimeRanking(limit = 10, offset = 0): Promise<MalListResponse<MalAnimeRankingEntry>> {
  return malFetch<MalListResponse<MalAnimeRankingEntry>>("/anime/ranking", {
    ranking_type: "all",
    limit,
    offset,
    fields: ANIME_LIST_FIELDS,
  });
}

type MalCatalogResponse = MalListResponse<{ node: MalAnimeNode }>;

function getCatalogPagination(options: MalAnimeCatalogOptions) {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 24));
  return { limit, offset: (page - 1) * limit };
}

function fetchSearchCatalog(query: string, limit: number, offset: number) {
  return malFetch<MalCatalogResponse>("/anime", {
    q: query,
    limit,
    offset,
    fields: ANIME_LIST_FIELDS,
  });
}

function validateSeason(year: number, season: string): void {
  const validSeason = ["winter", "spring", "summer", "fall"].includes(season);
  const validYear = Number.isInteger(year) && year >= 1970 && year <= new Date().getFullYear();
  if (!validSeason || !validYear) {
    throw new MyAnimeListApiError(400, "Temporada o año inválidos");
  }
}

function fetchSeasonalCatalog(
  year: number,
  seasonName: string,
  sort: string | undefined,
  limit: number,
  offset: number,
) {
  const season = seasonName.toLowerCase();
  validateSeason(year, season);

  return malFetch<MalCatalogResponse>(`/anime/season/${year}/${season}`, {
    sort: sort === "score" ? "anime_score" : "anime_num_list_users",
    limit,
    offset,
    fields: ANIME_LIST_FIELDS,
  });
}

function getRankingType(options: MalAnimeCatalogOptions): string {
  if (options.status === "airing") return "airing";
  if (options.status === "upcoming") return "upcoming";
  if (options.sort === "score") return "all";
  return "bypopularity";
}

function fetchRankingCatalog(options: MalAnimeCatalogOptions, limit: number, offset: number) {
  return malFetch<MalCatalogResponse>("/anime/ranking", {
    ranking_type: getRankingType(options),
    limit,
    offset,
    fields: ANIME_LIST_FIELDS,
  });
}

function fetchCatalog(options: MalAnimeCatalogOptions, limit: number, offset: number) {
  const query = options.q?.trim();
  if (query) return fetchSearchCatalog(query, limit, offset);
  if (options.season && options.year) {
    return fetchSeasonalCatalog(options.year, options.season, options.sort, limit, offset);
  }
  return fetchRankingCatalog(options, limit, offset);
}

function sortSeasonalPage(anime: MalAnimeNode[], sort?: string): void {
  if (sort === "score") {
    anime.sort((a, b) => (b.mean ?? -1) - (a.mean ?? -1));
    return;
  }
  anime.sort((a, b) =>
    (a.popularity ?? Number.MAX_SAFE_INTEGER) - (b.popularity ?? Number.MAX_SAFE_INTEGER));
}

export async function getMalAnimeCatalog(options: MalAnimeCatalogOptions = {}): Promise<MalAnimeCatalogResult> {
  const { limit, offset } = getCatalogPagination(options);
  const response = await fetchCatalog(options, limit, offset);
  const anime = response.data.map((entry) => entry.node);

  if (options.season && options.year) sortSeasonalPage(anime, options.sort);

  return { anime, hasNextPage: Boolean(response.paging.next) };
}

export function mapMalAnimeToCard(anime: MalAnimeNode): AnimeCardProps {
  const englishTitle = anime.alternative_titles?.en?.trim();
  return {
    id: anime.id,
    title: englishTitle || anime.title,
    image: anime.main_picture?.large || anime.main_picture?.medium || "",
    score: anime.mean ?? 0,
    studio: anime.studios?.[0]?.name || "Estudio desconocido",
    year: anime.start_season?.year || Number(anime.start_date?.slice(0, 4)) || 0,
    isAiring: anime.status === "currently_airing",
    isFavorite: false,
    synopsis: anime.synopsis,
    season: anime.start_season?.season,
    genres: anime.genres?.map((genre) => genre.name) ?? [],
    tags: [],
    format: anime.media_type,
    status: anime.status,
    episodes: anime.num_episodes || undefined,
    type: "anime",
  };
}

function imageSet(picture?: { medium?: string; large?: string }) {
  const large = picture?.large || picture?.medium || "";
  const medium = picture?.medium || large;
  return {
    jpg: { image_url: medium, small_image_url: medium, large_image_url: large },
    webp: { image_url: medium, small_image_url: medium, large_image_url: large },
  };
}

export function mapMalAnimeToCatalog(anime: MalAnimeNode): CatalogAnime {
  return {
    mal_id: anime.id,
    images: imageSet(anime.main_picture),
    title: anime.title,
    title_english: anime.alternative_titles?.en?.trim() || null,
    type: anime.media_type || "TV",
    source: anime.source || "",
    episodes: anime.num_episodes || null,
    status: anime.status || "",
    airing: anime.status === "currently_airing",
    score: anime.mean ?? null,
    scored_by: anime.num_scoring_users ?? null,
    rank: anime.rank ?? null,
    popularity: anime.popularity ?? 0,
    synopsis: anime.synopsis ?? null,
    season: anime.start_season?.season ?? null,
    year: anime.start_season?.year ?? (Number(anime.start_date?.slice(0, 4)) || null),
    studios: anime.studios?.map((studio) => ({ mal_id: studio.id, name: studio.name })) ?? [],
    genres: anime.genres?.map((genre) => ({ mal_id: genre.id, name: genre.name })) ?? [],
    broadcast: anime.broadcast ? { day: anime.broadcast.day_of_the_week ?? null, time: anime.broadcast.start_time ?? null } : undefined,
  };
}

export function mapMalMangaToCatalog(manga: MalMangaNode): CatalogManga {
  return {
    mal_id: manga.id,
    images: imageSet(manga.main_picture),
    title: manga.title,
    title_english: manga.alternative_titles?.en?.trim() || null,
    type: manga.media_type || "Manga",
    year: Number(manga.start_date?.slice(0, 4)) || null,
    chapters: manga.num_chapters || null,
    volumes: manga.num_volumes || null,
    status: manga.status || "",
    publishing: manga.status === "currently_publishing",
    score: manga.mean ?? null,
    scored_by: manga.num_scoring_users ?? null,
    rank: manga.rank ?? null,
    popularity: manga.popularity ?? 0,
    synopsis: manga.synopsis ?? null,
    authors: manga.authors?.map(({ node }) => ({ mal_id: node.id, name: `${node.first_name} ${node.last_name}`.trim() })) ?? [],
    genres: manga.genres?.map((genre) => ({ mal_id: genre.id, name: genre.name })) ?? [],
  };
}

export async function getMalAnimeById(id: number): Promise<CatalogAnime> {
  const anime = await malFetch<MalAnimeNode>(`/anime/${id}`, { fields: `${ANIME_LIST_FIELDS},num_scoring_users,recommendations` });
  return mapMalAnimeToCatalog(anime);
}

export async function getMalAnimeRecommendations(id: number): Promise<CatalogRecommendation[]> {
  const anime = await malFetch<MalAnimeNode>(`/anime/${id}`, { fields: "recommendations{main_picture,alternative_titles}" });
  return (anime.recommendations ?? []).map(({ node, num_recommendations }) => ({
    entry: { mal_id: node.id, title: node.alternative_titles?.en?.trim() || node.title, images: { webp: { image_url: node.main_picture?.medium || node.main_picture?.large || "" } } },
    votes: num_recommendations,
  }));
}

export async function getMalTopAnime(limit = 10): Promise<CatalogAnime[]> {
  const response = await getMalAnimeRanking(limit);
  return response.data.map(({ node }) => mapMalAnimeToCatalog(node));
}

export async function getMalUpcomingAnime(limit = 8): Promise<CatalogAnime[]> {
  const response = await malFetch<MalListResponse<{ node: MalAnimeNode }>>("/anime/ranking", {
    ranking_type: "upcoming", limit, fields: ANIME_LIST_FIELDS,
  });
  return response.data.map(({ node }) => mapMalAnimeToCatalog(node));
}

type MalMangaResponse = MalListResponse<{ node: MalMangaNode }>;

export async function getMalMangaCatalog(options: MalMangaCatalogOptions = {}): Promise<MalMangaCatalogResult> {
  const { limit, offset } = getCatalogPagination(options);
  const query = options.q?.trim();
  const response = query
    ? await malFetch<MalMangaResponse>("/manga", { q: query, limit, offset, fields: MANGA_LIST_FIELDS })
    : await malFetch<MalMangaResponse>("/manga/ranking", {
      ranking_type: options.sort === "score" ? "all" : "bypopularity", limit, offset, fields: MANGA_LIST_FIELDS,
    });
  const manga = response.data.map(({ node }) => node);
  if (options.status) {
    const expected = options.status === "publishing" ? "currently_publishing" : "finished";
    manga.splice(0, manga.length, ...manga.filter((item) => item.status === expected));
  }
  return { manga, hasNextPage: Boolean(response.paging.next) };
}

export async function getMalMangaById(id: number): Promise<CatalogManga> {
  const manga = await malFetch<MalMangaNode>(`/manga/${id}`, { fields: `${MANGA_LIST_FIELDS},recommendations` });
  return mapMalMangaToCatalog(manga);
}

export async function getMalMangaRecommendations(id: number): Promise<CatalogRecommendation[]> {
  const manga = await malFetch<MalMangaNode>(`/manga/${id}`, { fields: "recommendations{main_picture,alternative_titles}" });
  return (manga.recommendations ?? []).map(({ node, num_recommendations }) => ({
    entry: { mal_id: node.id, title: node.alternative_titles?.en?.trim() || node.title, images: { webp: { image_url: node.main_picture?.medium || node.main_picture?.large || "" } } },
    votes: num_recommendations,
  }));
}

function currentSeason(): { year: number; season: "winter" | "spring" | "summer" | "fall" } {
  const date = new Date();
  const seasons = ["winter", "winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "fall", "fall", "fall"] as const;
  return { year: date.getUTCFullYear(), season: seasons[date.getUTCMonth()] };
}

export async function getMalWeeklySchedule(): Promise<Record<string, CatalogAnime[]>> {
  const { year, season } = currentSeason();
  const response = await malFetch<MalListResponse<{ node: MalAnimeNode }>>(`/anime/season/${year}/${season}`, {
    limit: 100, sort: "anime_num_list_users", fields: ANIME_LIST_FIELDS,
  });
  const result: Record<string, CatalogAnime[]> = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
  for (const { node } of response.data) {
    const day = node.broadcast?.day_of_the_week?.toLowerCase();
    if (day && result[day]) result[day].push(mapMalAnimeToCatalog(node));
  }
  return result;
}

export async function getMalScheduleToday(): Promise<CatalogAnime[]> {
  const schedule = await getMalWeeklySchedule();
  const day = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
  return schedule[day];
}

export function getMalYearOptions(): Array<{ label: string; value: string }> {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: currentYear - 1970 + 1 }, (_, index) => {
    const year = currentYear - index;
    return { label: String(year), value: String(year) };
  });
}
