import "server-only";

import type { MalListResponse } from "@/interfaces/myanimelist";
import type { MalAnimeListEntry, MalAnimeListStatus, MalMangaListEntry, MalMangaListStatus } from "@/interfaces/myanimelist-sync";

const MAL_API_ORIGIN = "https://api.myanimelist.net";
const MAL_API_BASE = `${MAL_API_ORIGIN}/v2`;
const BASE_LIST_FIELDS = [
  "list_status",
  "main_picture",
  "alternative_titles",
  "mean",
  "media_type",
  "start_date",
  "genres",
  "synopsis",
  "status",
];
const ANIME_LIST_FIELDS = [...BASE_LIST_FIELDS, "start_season", "broadcast", "num_episodes"].join(",");
const MANGA_LIST_FIELDS = [...BASE_LIST_FIELDS, "num_chapters", "num_volumes"].join(",");
export class MalLibraryError extends Error {
  constructor(readonly status: number, readonly retryAfterMs: number) { super(`MyAnimeList respondió ${status}`); }
}

async function malAuthorizedFetch(url: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new MalLibraryError(response.status, Number(response.headers.get("Retry-After")) * 1000 || 60000);
  return response;
}

export async function getMalSyncPage(token: string, type: "anime" | "manga", page: number) {
  const fields = type === "anime" ? ANIME_LIST_FIELDS : MANGA_LIST_FIELDS;
  const response = await malAuthorizedFetch(`${MAL_API_BASE}/users/@me/${type === "anime" ? "animelist" : "mangalist"}?limit=100&offset=${(page - 1) * 100}&nsfw=true&fields=${fields}`, token);
  return response.json() as Promise<MalListResponse<MalAnimeListEntry | MalMangaListEntry>>;
}

export async function getMalSyncEntry(token: string, type: "anime" | "manga", id: number) {
  const response = await malAuthorizedFetch(`${MAL_API_BASE}/${type}/${id}?fields=my_list_status,${type === "anime" ? "num_episodes" : "num_chapters"}`, token);
  const entry = await response.json() as { id: number; num_episodes?: number; num_chapters?: number; my_list_status?: {
    status: string; num_episodes_watched?: number; num_chapters_read?: number; updated_at: string;
  } };
  if (entry.id !== id) throw new Error("MAL devolvió una identidad incompatible");
  if (!entry.my_list_status) return null;
  const status = entry.my_list_status.status;
  const total = type === "anime" ? entry.num_episodes : entry.num_chapters;
  return { status, progress: status === "completed" && total ? total : (type === "anime" ? entry.my_list_status.num_episodes_watched : entry.my_list_status.num_chapters_read) ?? 0, updatedAt: Date.parse(entry.my_list_status.updated_at) / 1000 };
}

export async function getAllMalAnimeList(
  accessToken: string,
  onPage?: (loaded: number) => void,
): Promise<MalAnimeListEntry[]> {
  const entries: MalAnimeListEntry[] = [];
  // MAL omite por defecto títulos NSFW. Sin este parámetro, esos títulos se
  // detectarían erróneamente como ausentes y se "exportarían" en cada sync.
  let nextUrl: string | undefined = `${MAL_API_BASE}/users/@me/animelist?limit=100&nsfw=true&fields=${ANIME_LIST_FIELDS}`;
  let pageCount = 0;

  while (nextUrl) {
    const parsedUrl = new URL(nextUrl);
    if (parsedUrl.origin !== MAL_API_ORIGIN) throw new Error("MAL devolvió una URL de paginación inválida");

    const response = await malAuthorizedFetch(parsedUrl.toString(), accessToken);
    const page = await response.json() as MalListResponse<MalAnimeListEntry>;
    entries.push(...page.data);
    onPage?.(entries.length);
    nextUrl = page.paging?.next;
    pageCount += 1;
    if (pageCount > 500) throw new Error("La lista de MAL superó el límite seguro de paginación");
  }

  return entries;
}

export async function setMalAnimeProgress(
  accessToken: string,
  animeId: number,
  status: MalAnimeListStatus["status"],
  watchedEpisodes: number,
  includeZero = false,
): Promise<void> {
  const body = new URLSearchParams({ status });
  if (watchedEpisodes > 0 || includeZero) body.set("num_watched_episodes", String(watchedEpisodes));

  await malAuthorizedFetch(`${MAL_API_BASE}/anime/${animeId}/my_list_status`, accessToken, {
    method: "PUT",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

export async function getAllMalMangaList(
  accessToken: string,
  onPage?: (loaded: number) => void,
): Promise<MalMangaListEntry[]> {
  const entries: MalMangaListEntry[] = [];
  let nextUrl: string | undefined = `${MAL_API_BASE}/users/@me/mangalist?limit=100&nsfw=true&fields=${MANGA_LIST_FIELDS}`;
  let pageCount = 0;

  while (nextUrl) {
    const parsedUrl = new URL(nextUrl);
    if (parsedUrl.origin !== MAL_API_ORIGIN) throw new Error("MAL devolvió una URL de paginación inválida");
    const response = await malAuthorizedFetch(parsedUrl.toString(), accessToken);
    const page = await response.json() as MalListResponse<MalMangaListEntry>;
    entries.push(...page.data);
    onPage?.(entries.length);
    nextUrl = page.paging?.next;
    pageCount += 1;
    if (pageCount > 500) throw new Error("La lista de MAL superó el límite seguro de paginación");
  }
  return entries;
}

export async function setMalMangaProgress(
  accessToken: string,
  mangaId: number,
  status: MalMangaListStatus["status"],
  chaptersRead: number,
  includeZero = false,
): Promise<void> {
  const body = new URLSearchParams({ status });
  if (chaptersRead > 0 || includeZero) body.set("num_chapters_read", String(chaptersRead));
  await malAuthorizedFetch(`${MAL_API_BASE}/manga/${mangaId}/my_list_status`, accessToken, {
    method: "PUT",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}
