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

async function malAuthorizedFetch(url: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`MyAnimeList respondió ${response.status}`);
  return response;
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
): Promise<void> {
  const body = new URLSearchParams({ status });
  if (watchedEpisodes > 0) body.set("num_watched_episodes", String(watchedEpisodes));

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
): Promise<void> {
  const body = new URLSearchParams({ status });
  if (chaptersRead > 0) body.set("num_chapters_read", String(chaptersRead));
  await malAuthorizedFetch(`${MAL_API_BASE}/manga/${mangaId}/my_list_status`, accessToken, {
    method: "PUT",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}
