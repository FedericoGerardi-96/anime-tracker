import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LibraryMediaType, LibrarySyncDetail, LibrarySyncProgress, LibrarySyncSelection, LocalFavoriteForSync, LocalMediaForSync, LocalProgressForSync, MalAnimeListEntry, MalMangaListEntry } from "@/interfaces/myanimelist-sync";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getValidMalAccessToken } from "@/services/myanimelist-connection";
import { getAllMalAnimeList, getAllMalMangaList, setMalAnimeProgress, setMalMangaProgress } from "@/services/myanimelist-library";
import type { MalAnimeNode, MalMangaNode } from '@/interfaces/myanimelist';
import { refreshStoredRelatedReading } from '@/services/related-reading';

type Reporter = (event: LibrarySyncProgress) => void;
type LocalStatus = "watching" | "completed" | "on_hold" | "dropped" | "plan_to_watch";
type RemoteEntry = MalAnimeListEntry | MalMangaListEntry;
interface LocalItem { media: LocalMediaForSync; progress?: LocalProgressForSync }
interface Remote { source: RemoteEntry; id: number; title: string; status: LocalStatus; progress: number; updatedAt: string }
interface State { imported: number; exported: number; reconciled: number; details: LibrarySyncDetail[] }

function report(reporter: Reporter, event: Omit<LibrarySyncProgress, keyof State>, state: State) {
  reporter({ ...event, ...state, details: [...state.details] });
}
function normalizeStatus(status?: string | null): LocalStatus {
  if (status === "reading") return "watching";
  if (status === "plan_to_read") return "plan_to_watch";
  return (["watching", "completed", "on_hold", "dropped", "plan_to_watch"] as string[]).includes(status ?? "") ? status as LocalStatus : "plan_to_watch";
}
function toMangaStatus(status?: string | null) {
  const value = normalizeStatus(status);
  if (value === "watching") return "reading" as const;
  if (value === "plan_to_watch") return "plan_to_read" as const;
  return value;
}
function isDefaultProgress(progress?: LocalProgressForSync) {
  return Boolean(progress && normalizeStatus(progress.status) === 'plan_to_watch' && (progress.current_episode ?? 0) === 0);
}
function hasMeaningfulRemoteProgress(entry: Remote) {
  return entry.status !== 'plan_to_watch' || entry.progress > 0;
}
function unwrap(row: LocalFavoriteForSync) { return Array.isArray(row.media) ? row.media[0] : row.media }

async function getLocal(client: SupabaseClient, userId: string, type: LibraryMediaType) {
  const [{ data: favorites, error: favoriteError }, { data: progress, error: progressError }] = await Promise.all([
    client.from("favorites").select("id, media:media_id!inner(id, mal_id, title, type, image, season, year, genres, format, status, day, total_units, score)").eq("user_id", userId),
    client.from("user_media_progress").select("media_id, status, current_episode, updated_at").eq("user_id", userId),
  ]);
  if (favoriteError) throw favoriteError;
  if (progressError) throw progressError;
  const progressById = new Map(((progress ?? []) as LocalProgressForSync[]).map((row) => [row.media_id, row]));
  const result = new Map<number, LocalItem>();
  for (const favorite of (favorites ?? []) as unknown as LocalFavoriteForSync[]) {
    const media = unwrap(favorite);
    if (media?.type === type) result.set(media.mal_id, { media, progress: progressById.get(media.id) });
  }
  return result;
}

function normalizeRemote(entry: RemoteEntry, type: LibraryMediaType): Remote {
  if (type === "manga") {
    const item = entry as MalMangaListEntry;
    const status = normalizeStatus(item.list_status.status);
    const progress = status === 'completed' && item.node.num_chapters ? item.node.num_chapters : item.list_status.num_chapters_read;
    return { source: entry, id: item.node.id, title: item.node.title, status, progress, updatedAt: item.list_status.updated_at };
  }
  const item = entry as MalAnimeListEntry;
  const progress = item.list_status.status === 'completed' && item.node.num_episodes ? item.node.num_episodes : item.list_status.num_episodes_watched;
  return { source: entry, id: item.node.id, title: item.node.title, status: item.list_status.status, progress, updatedAt: item.list_status.updated_at };
}
function mediaRow(entry: Remote, type: LibraryMediaType) {
  const node = entry.source.node;
  const anime = type === "anime" ? (entry.source as MalAnimeListEntry).node : undefined;
  const totalUnits = type === 'anime' ? (node as MalAnimeNode).num_episodes : (node as MalMangaNode).num_chapters;
  return { mal_id: node.id, title: node.alternative_titles?.en?.trim() || node.title, type, image: node.main_picture?.large || node.main_picture?.medium || "", season: anime?.start_season?.season ?? null, year: anime?.start_season?.year ?? (Number(node.start_date?.slice(0, 4)) || null), genres: node.genres?.map((genre) => genre.name) ?? [], format: node.media_type ?? null, status: node.status ?? null, day: anime?.broadcast?.day_of_the_week ?? null, total_units: totalUnits ?? null, score: node.mean ?? 0 };
}
async function ensureMedia(client: SupabaseClient, entries: Remote[], type: LibraryMediaType) {
  const result = new Map<number, string>();
  // MAL es la fuente canónica de la metadata persistida. La sincronización
  // reconstruye siempre estos campos sin depender de AniList.
  const rows = entries.map((entry) => mediaRow(entry, type));
  for (let i = 0; i < rows.length; i += 100) {
    const { data, error } = await client.from("media").upsert(rows.slice(i, i + 100), { onConflict: "mal_id,type" }).select("id, mal_id");
    if (error) throw error;
    for (const row of data ?? []) result.set(Number(row.mal_id), row.id);
  }
  return result;
}
async function saveProgress(client: SupabaseClient, rows: Array<Record<string, string | number>>) {
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await client.from("user_media_progress").upsert(rows.slice(i, i + 100), { onConflict: "user_id,media_id" });
    if (error) throw error;
  }
}

async function enrichCompletedAnime(client: SupabaseClient, userId: string, reporter: Reporter, state: State) {
  const { data, error } = await client.from('media')
    .select('id, mal_id, user_media_progress!inner(user_id, status)')
    .eq('type', 'anime')
    .is('related_reading_checked_at', null)
    .eq('user_media_progress.user_id', userId)
    .eq('user_media_progress.status', 'completed')
    .order('score', { ascending: false })
    .limit(24);
  if (error) {
    console.warn('No se pudieron buscar animes para completar sus relaciones:', error);
    return;
  }
  const items = data ?? [];
  for (let offset = 0; offset < items.length; offset += 4) {
    report(reporter, { type: 'progress', phase: 'reconciling', message: `Buscando manga y novelas relacionados… ${Math.min(offset + 4, items.length)} de ${items.length}` }, state);
    const results = await Promise.allSettled(items.slice(offset, offset + 4).map((item) => refreshStoredRelatedReading(client, item.id, item.mal_id)));
    for (const result of results) if (result.status === 'rejected') console.warn('No se pudo guardar una relación de lectura:', result.reason);
  }
}

async function syncType(client: SupabaseClient, userId: string, token: string, type: LibraryMediaType, reporter: Reporter, state: State) {
  const label = type === "anime" ? "animes" : "mangas";
  report(reporter, { type: "progress", phase: "loading", message: `Leyendo ${label} de AniTrack…` }, state);
  const local = await getLocal(client, userId, type);
  const raw: RemoteEntry[] = type === "anime"
    ? await getAllMalAnimeList(token, (count) => report(reporter, { type: "progress", phase: "loading", message: `Leyendo MyAnimeList… ${count} animes` }, state))
    : await getAllMalMangaList(token, (count) => report(reporter, { type: "progress", phase: "loading", message: `Leyendo MyAnimeList… ${count} mangas` }, state));
  const remote = raw.map((entry) => normalizeRemote(entry, type));
  const remoteById = new Map(remote.map((entry) => [entry.id, entry]));
  const toImport = remote.filter((entry) => !local.has(entry.id));
  const localOnly = [...local.entries()].filter(([id]) => !remoteById.has(id));
  const mediaById = await ensureMedia(client, remote, type);
  const favorites = toImport.map((entry) => ({ user_id: userId, media_id: mediaById.get(entry.id) })).filter((row): row is { user_id: string; media_id: string } => Boolean(row.media_id));
  for (let i = 0; i < favorites.length; i += 100) {
    const { error } = await client.from("favorites").insert(favorites.slice(i, i + 100));
    if (error) throw error;
  }
  for (const entry of toImport) { state.imported += 1; state.details.push({ action: "imported", title: entry.title, mediaType: type }); }

  const localUpdates: Array<Record<string, string | number>> = [];
  const remoteUpdates: Array<{ id: number; title: string; status: LocalStatus; progress: number; action: "updated_in_mal" }> = [];
  for (const entry of remote) {
    const item = local.get(entry.id);
    const mediaId = item?.media.id ?? mediaById.get(entry.id);
    if (!mediaId) continue;
    const differs = !item?.progress || normalizeStatus(item.progress.status) !== entry.status || (item.progress.current_episode ?? 0) !== entry.progress;
    if (!differs) continue;
    // Un pendiente vacío suele ser el valor inicial creado por AniTrack, no
    // una decisión explícita del usuario. Nunca debe pisar un estado real de MAL.
    const completedNeedsTotal = entry.status === "completed"
      && normalizeStatus(item?.progress?.status) === "completed"
      && entry.progress > (item?.progress?.current_episode ?? 0);
    const malIsNewer = !item?.progress
      || (isDefaultProgress(item.progress) && hasMeaningfulRemoteProgress(entry))
      || completedNeedsTotal
      || Date.parse(entry.updatedAt) > Date.parse(item.progress.updated_at ?? "1970-01-01");
    if (malIsNewer) {
      localUpdates.push({ user_id: userId, media_id: mediaId, status: entry.status, current_episode: entry.progress, updated_at: entry.updatedAt });
      if (item?.progress) { state.reconciled += 1; state.details.push({ action: "updated_in_anitrack", title: entry.title, mediaType: type }); }
    } else remoteUpdates.push({ id: entry.id, title: entry.title, status: normalizeStatus(item.progress?.status), progress: item.progress?.current_episode ?? 0, action: "updated_in_mal" });
  }
  await saveProgress(client, localUpdates);
  const operations = [...localOnly.map(([id, item]) => ({ id, title: item.media.title, status: normalizeStatus(item.progress?.status), progress: item.progress?.current_episode ?? 0, action: "exported" as const })), ...remoteUpdates];
  for (let i = 0; i < operations.length; i += 1) {
    const operation = operations[i];
    report(reporter, { type: "progress", phase: "exporting", message: `Actualizando ${label} en MyAnimeList… ${i + 1} de ${operations.length}`, current: i + 1, total: operations.length }, state);
    if (type === "anime") await setMalAnimeProgress(token, operation.id, operation.status, operation.progress);
    else await setMalMangaProgress(token, operation.id, toMangaStatus(operation.status), operation.progress);
    if (operation.action === "exported") state.exported += 1; else state.reconciled += 1;
    state.details.push({ action: operation.action, title: operation.title, mediaType: type });
  }
}

export async function synchronizeLibraries(client: SupabaseClient, userId: string, selection: LibrarySyncSelection, reporter: Reporter) {
  const state: State = { imported: 0, exported: 0, reconciled: 0, details: [] };
  const token = await getValidMalAccessToken(userId);
  if (selection.anime) await syncType(client, userId, token, "anime", reporter, state);
  if (selection.manga) await syncType(client, userId, token, "manga", reporter, state);
  const admin = createSupabaseAdminClient();
  if (selection.anime) await enrichCompletedAnime(admin, userId, reporter, state);
  await admin.from("mal_connections").update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", userId);
  report(reporter, { type: "complete", phase: "complete", message: "Sincronización completada" }, state);
}

export function synchronizeAnimeLibraries(client: SupabaseClient, userId: string, reporter: Reporter) {
  return synchronizeLibraries(client, userId, { anime: true, manga: false }, reporter);
}
