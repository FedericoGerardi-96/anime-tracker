import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decryptAniListToken } from "@/lib/anilist-token-crypto";
import { localStatus, remoteStatus, reconcileAniListProgress } from "@/lib/anilist-sync-policy";
import type { AniListSyncJob, PublicAniListSyncJob, RemoteListEntry, SyncProgress, SyncState, SyncProvider } from "@/interfaces/anilist-sync";
import type { MalAnimeListEntry, MalMangaListEntry } from "@/interfaces/myanimelist-sync";

type DB = ReturnType<typeof createSupabaseAdminClient>;
const MEDIA_FIELDS = `id idMal type title { romaji english } coverImage { large } episodes chapters`;
class SyncError extends Error {
  constructor(message: string, readonly retry = true, readonly delay = 60000) { super(message); }
}
class SyncCancelled extends Error {}
async function checkCancelled(db: DB, job: AniListSyncJob) {
  // Keep pre-migration AniList jobs working until the new migration is applied.
  if (job.cancel_requested === undefined) return;
  const result = await db.from("anilist_sync_jobs").select("cancel_requested").eq("id", job.id).maybeSingle();
  check(result.error, "consultar la cancelación");
  if (result.data?.cancel_requested) throw new SyncCancelled();
}
function check(error: { message: string; code?: string; hint?: string } | null, operation = "procesar los datos") {
  if (!error) return;
  console.error("[AniList sync] Supabase", { operation, code: error.code, message: error.message, hint: error.hint });
  const permanent = Boolean(error.code && /^(22|23|42|PGRST)/.test(error.code));
  throw new SyncError(`Supabase no pudo ${operation}${error.code ? ` (${error.code})` : ""}.${permanent ? " Revisá la configuración de la base de datos." : " Se reintentará."}`, !permanent);
}
function warning(state: SyncState, message: string) {
  state.skipped++;
  // Bound persisted state while keeping a count of all omitted items.
  if (state.warnings.length < 100) state.warnings.push(message);
}
export function publicJob(job: AniListSyncJob): PublicAniListSyncJob {
  const { imported, exported, updated, skipped, warnings } = job.state;
  const current = job.state.phase === "exports" ? job.state.exportOffset : job.state.phase === "import" ? job.state.cursor : job.state.prepareOffset ?? 0;
  const total = job.state.phase === "exports" ? job.state.exportQueue?.length ?? 0 : job.state.phase === "import" ? (job.state.importQueue ?? job.state.remote).length : 0;
  return { id: job.id, provider: job.provider ?? "anilist", cancelRequested: job.cancel_requested ?? false, current, total, unchanged: job.state.unchanged ?? 0, status: job.status, message: job.message, imported, exported, updated, skipped, warnings, updatedAt: job.updated_at, phase: job.state.phase, nextRunAt: job.next_run_at, attempts: job.attempts };
}
async function connection(db: DB, userId: string, provider: SyncProvider = "anilist") {
  if (provider === "myanimelist") {
    const result = await db.from("mal_connections").select("mal_user_id").eq("user_id", userId).maybeSingle();
    check(result.error, "leer la conexión de MyAnimeList");
    if (!result.data) throw new SyncError("Volvé a conectar MyAnimeList desde tu perfil.", false);
    const { getValidMalAccessToken } = await import("@/services/myanimelist-connection");
    return { token: await getValidMalAccessToken(userId), userId: Number(result.data.mal_user_id) };
  }
  const { data, error } = await db.from("anilist_connections").select("access_token_encrypted, token_expires_at, anilist_user_id").eq("user_id", userId).maybeSingle();
  check(error);
  if (!data || Date.parse(data.token_expires_at) <= Date.now()) throw new SyncError("Volvé a conectar AniList desde tu perfil y reintentá la sincronización.", false);
  return { token: decryptAniListToken(data.access_token_encrypted), userId: Number(data.anilist_user_id) };
}
async function graph<T>(token: string, query: string, variables: Record<string, unknown>, budget: { delay: number }): Promise<T> {
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(15000),
  });
  const retry = response.headers.get("Retry-After");
  const reset = Number(response.headers.get("X-RateLimit-Reset"));
  const retryMs = retry ? (/^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now()) : 0;
  const cooldown = Math.max(60000, retryMs || 0, reset ? reset * 1000 - Date.now() + 1000 : 0);
  if (response.status === 429) throw new SyncError("AniList alcanzó el límite de solicitudes. La sincronización continuará automáticamente.", true, cooldown);
  if (response.headers.get("X-RateLimit-Remaining") === "0") budget.delay = cooldown;
  const limit = Number(response.headers.get("X-RateLimit-Limit"));
  if (limit > 0) budget.delay = Math.max(budget.delay, Math.ceil(60000 / limit) + 1000);
  if (response.status === 401) throw new SyncError("AniList requiere una nueva autorización desde tu perfil.", false);
  if (!response.ok) throw new SyncError("AniList no está disponible. Se reintentará automáticamente.");
  const payload = await response.json() as { data?: T; errors?: Array<{ status?: number }> };
  if (payload.errors?.length) {
    if (payload.errors.some((e) => e.status === 429)) throw new SyncError("Esperando el límite de AniList…", true, cooldown);
    throw new SyncError("AniList rechazó una operación. El trabajo se detuvo; tus favoritos siguen guardados.", false);
  }
  if (!payload.data) throw new SyncError("AniList devolvió una respuesta incompleta. Se reintentará.");
  return payload.data;
}
async function readProgress(db: DB, userId: string, mediaId: string) {
  const { data, error } = await db.from("user_media_progress").select("status,current_episode,updated_at").eq("user_id", userId).eq("media_id", mediaId).maybeSingle();
  check(error);
  return data ? { status: data.status ?? "plan_to_watch", current_episode: data.current_episode ?? 0, updated_at: data.updated_at } as SyncProgress : null;
}

async function importEntry(db: DB, job: AniListSyncJob, entry: RemoteListEntry, existingMediaId?: string) {
  const state = job.state;
  const type = state.types[state.typeIndex];
  const media = entry.media;
  if (!media.idMal || media.type !== type.toUpperCase() || !localStatus(entry.status)) {
    warning(state, `${media.title.romaji}: sin ID de MAL o estado compatible; no se modificó.`);
    return;
  }
  let mediaId = existingMediaId;
  if (mediaId) {
    const favorite = await db.from("favorites").select("id").eq("user_id", job.user_id).eq("media_id", mediaId).maybeSingle();
    check(favorite.error, "comprobar el favorito antes de actualizar");
    if (!favorite.data) return; // Respect a favorite removed while the comparison was running.
  } else {
  // Insert missing metadata only. Never overwrite the shared MAL catalog.
  const inserted = await db.from("media").upsert({ mal_id: media.idMal, type,
    ...media.metadata, title: media.title.english || media.title.romaji, image: media.coverImage.large,
    total_units: type === "anime" ? media.episodes : media.chapters,
  }, { onConflict: "mal_id,type", ignoreDuplicates: true });
  check(inserted.error);
  const stored = await db.from("media").select("id").eq("mal_id", media.idMal).eq("type", type).single();
  check(stored.error);
  if (!stored.data) throw new SyncError("No se pudo identificar una serie local.");
  mediaId = stored.data.id as string;
  const favorite = await db.from("favorites").upsert({ user_id: job.user_id, media_id: mediaId }, { onConflict: "user_id,media_id", ignoreDuplicates: true }).select("id");
  check(favorite.error);
  if (favorite.data?.length) state.imported++;
  }
  const local = await readProgress(db, job.user_id, mediaId);
  const decision = reconcileAniListProgress(local, entry);
  if (decision === "unsupported") { warning(state, `${media.title.romaji}: estado local incompatible; progreso conservado.`); return; }
  if (decision !== "remote") return;
  const values = { status: localStatus(entry.status), current_episode: entry.progress, updated_at: new Date(entry.updatedAt * 1000).toISOString() };
  if (!local) {
    const result = await db.from("user_media_progress").upsert({ user_id: job.user_id, media_id: mediaId, ...values }, { onConflict: "user_id,media_id", ignoreDuplicates: true });
    check(result.error);
  } else {
    // Compare-and-set: don't overwrite progress edited by the user or MAL during this step.
    let update = db.from("user_media_progress").update(values).eq("user_id", job.user_id).eq("media_id", mediaId);
    update = local.updated_at ? update.eq("updated_at", local.updated_at) : update.is("updated_at", null);
    const result = await update.select("media_id");
    check(result.error);
    if (result.data?.length) state.updated++;
  }
}

function beginComparison(state: SyncState) {
  state.phase = "prepare";
  state.planVersion = 1;
  state.prepareOffset = 0;
  state.exportQueue = [];
  state.importQueue = [];
  state.matchedRemoteIds = [];
  state.importLocalIds = {};
  state.cursor = 0;
  state.exportOffset = 0;
}

function finishComparison(state: SyncState) {
  const matched = new Set(state.matchedRemoteIds ?? []);
  const queued = new Set((state.importQueue ?? []).map((entry) => entry.media.id));
  const type = state.types[state.typeIndex];
  for (const entry of state.remote) {
    if (matched.has(entry.media.id) || queued.has(entry.media.id)) continue;
    if (!entry.media.idMal || entry.media.type !== type.toUpperCase() || !localStatus(entry.status)) {
      warning(state, `${entry.media.title.romaji}: sin ID de MAL o estado compatible; no se modificó.`);
    } else state.importQueue!.push(entry);
  }
  state.phase = state.importQueue?.length ? "import" : "exports";
  state.cursor = 0;
  state.exportOffset = 0;
}

async function compareLibraries(db: DB, job: AniListSyncJob) {
  const state = job.state;
  const type = state.types[state.typeIndex];
  const remote = new Map(state.remote.filter((e) => e.media.type === type.toUpperCase() && e.media.idMal).map((e) => [Number(e.media.idMal), e]));
  const queue: NonNullable<SyncState["exportQueue"]> = state.exportQueue ?? [];
  // Keep .in() URLs short and checkpoint each page rather than reading the whole library in one step.
  const offset = state.prepareOffset ?? 0;
  const pageSize = 100;
  const rows = await db.from("favorites").select("id,media:media_id!inner(id,mal_id,type)").eq("user_id", job.user_id).eq("media.type", type).order("id").range(offset, offset + pageSize - 1);
  check(rows.error, "leer los favoritos locales");
  const items = (rows.data ?? []) as unknown as Array<{ media: { id: string; mal_id: number; type: string } }>;
  if (!items.length) { state.exportQueue = queue; finishComparison(state); return; }
  const progress = await db.from("user_media_progress").select("media_id,status,current_episode,updated_at").eq("user_id", job.user_id).in("media_id", items.map((r) => r.media.id));
  check(progress.error, "leer el progreso local");
  const byId = new Map((progress.data ?? []).map((p) => [p.media_id, { status: p.status ?? "plan_to_watch", current_episode: p.current_episode ?? 0, updated_at: p.updated_at } as SyncProgress]));
  const matched = new Set(state.matchedRemoteIds ?? []);
  for (const row of items) {
    const local = byId.get(row.media.id) ?? null;
    const existing = remote.get(Number(row.media.mal_id)) ?? null;
    if (!row.media.mal_id) { warning(state, `Serie local sin ID de MAL: se conservó sin exportar.`); continue; }
    if (existing) matched.add(existing.media.id);
    const decision = reconcileAniListProgress(local, existing);
    if (decision === "local") queue.push({ localId: row.media.id, malId: Number(row.media.mal_id) });
    else if (decision === "remote" && existing) {
      state.importQueue!.push(existing);
      state.importLocalIds![existing.media.id] = row.media.id;
    } else if (decision === "same") state.unchanged = (state.unchanged ?? 0) + 1;
    else if (decision === "unsupported") warning(state, `MAL #${row.media.mal_id}: estado incompatible; progreso conservado.`);
  }
  state.matchedRemoteIds = [...matched];
  state.exportQueue = queue;
  state.prepareOffset = offset + items.length;
  if (items.length < pageSize) finishComparison(state);
}

async function advance(db: DB, job: AniListSyncJob, auth: Awaited<ReturnType<typeof connection>>, budget: { delay: number }) {
  const state = job.state;
  const type = state.types[state.typeIndex];
  const mal = job.provider === "myanimelist";
  const label = mal ? "MyAnimeList" : "AniList";
  if (state.phase === "fetch") {
    let entries: RemoteListEntry[];
    let hasNext: boolean;
    if (mal) {
      const { getMalSyncPage } = await import("@/services/myanimelist-library");
      const page = await getMalSyncPage(auth.token, type, state.page);
      entries = page.data.map((entry) => {
        const anime = entry as MalAnimeListEntry;
        const manga = entry as MalMangaListEntry;
        const total = type === "anime" ? anime.node.num_episodes : manga.node.num_chapters;
        return { status: remoteStatus(entry.list_status.status), progress: entry.list_status.status === "completed" && total ? total : type === "anime" ? anime.list_status.num_episodes_watched : manga.list_status.num_chapters_read,
          updatedAt: Date.parse(entry.list_status.updated_at) / 1000,
          media: { id: entry.node.id, idMal: entry.node.id, type: type.toUpperCase(), title: { romaji: entry.node.title, english: entry.node.alternative_titles?.en ?? null },
            coverImage: { large: entry.node.main_picture?.large || entry.node.main_picture?.medium || "" }, episodes: type === "anime" ? total ?? null : null, chapters: type === "manga" ? total ?? null : null,
            metadata: { score: entry.node.mean ?? 0, genres: entry.node.genres?.map((g) => g.name) ?? [], format: entry.node.media_type ?? null, status: entry.node.status ?? null, season: type === "anime" ? anime.node.start_season?.season ?? null : null, year: (type === "anime" ? anime.node.start_season?.year : undefined) ?? (Number(entry.node.start_date?.slice(0, 4)) || null), day: type === "anime" ? anime.node.broadcast?.day_of_the_week ?? null : null } } };
      });
      hasNext = Boolean(page.paging?.next);
    } else {
    const result = await graph<{ MediaListCollection: { hasNextChunk: boolean; lists: Array<{ entries: RemoteListEntry[] }> } }>(auth.token,
      `query($page:Int,$user:Int,$type:MediaType){MediaListCollection(chunk:$page,perChunk:500,userId:$user,type:$type,sort:MEDIA_ID){hasNextChunk lists{entries{status progress updatedAt media{${MEDIA_FIELDS}}}}}}`,
      { page: state.page, user: auth.userId, type: type.toUpperCase() }, budget);
      entries = (result.MediaListCollection.lists ?? []).flatMap((list) => list.entries ?? []);
      hasNext = result.MediaListCollection.hasNextChunk;
    }
    const map = new Map(state.remote.map((e) => [e.media.id, e]));
    for (const entry of entries) map.set(entry.media.id, entry);
    state.remote = [...map.values()];
    if (hasNext) state.page++;
    else beginComparison(state);
    return { message: `Leyendo ${type} de ${label}… ${state.remote.length} series`, complete: false };
  }
  if (state.phase === "import") {
    // Upgrade an already-running old job without replaying all per-series writes.
    if (state.planVersion !== 1) { beginComparison(state); return { message: "Comparando las bibliotecas para procesar solo diferencias…", complete: false }; }
    const imports = state.importQueue ?? [];
    const batch = imports.slice(state.cursor, state.cursor + 10);
    for (const entry of batch) { await checkCancelled(db, job); await importEntry(db, job, entry, state.importLocalIds?.[entry.media.id]); state.cursor++; }
    if (state.cursor >= imports.length) state.phase = "exports";
    return { message: `Aplicando cambios de ${type} en AniTrack… ${state.cursor} de ${imports.length}`, complete: false };
  }
  if (state.phase === "prepare") {
    if (state.planVersion !== 1) beginComparison(state);
    await compareLibraries(db, job);
    return { message: `Comparando ${type}… ${state.prepareOffset ?? 0} revisadas · ${state.unchanged ?? 0} sin cambios · ${(state.exportQueue?.length ?? 0) + (state.importQueue?.length ?? 0)} diferencias`, complete: false };
  }
  const operation = state.exportQueue?.[state.exportOffset];
  if (!operation) {
    state.typeIndex++;
    if (state.typeIndex >= state.types.length) return { message: state.skipped ? "Sincronización completada con series omitidas. Revisá el informe." : state.imported + state.exported + state.updated === 0 ? "No hay cambios. Las bibliotecas ya coinciden." : "Bibliotecas sincronizadas. Tus favoritos se conservaron.", complete: true };
    state.phase = "fetch"; state.page = 1; state.remote = []; state.cursor = 0; state.exportQueue = []; state.exportOffset = 0; state.prepareOffset = 0; state.importQueue = []; state.importLocalIds = {}; state.matchedRemoteIds = []; state.planVersion = undefined;
    return { message: "Preparando la siguiente biblioteca…", complete: false };
  }
  if (!state.pendingExport) {
    if (mal) {
      const { getMalSyncEntry } = await import("@/services/myanimelist-library");
      let remote;
      try { remote = await getMalSyncEntry(auth.token, type, operation.malId); }
      catch (error) {
        if (error instanceof Error && "status" in error && error.status === 404) {
          warning(state, `MAL #${operation.malId} (${type}): no disponible en MyAnimeList; no se modificó.`);
          state.exportOffset++;
          return { message: "Serie no disponible en MyAnimeList. Continuando…", complete: false };
        }
        throw error;
      }
      state.pendingExport = { malId: operation.malId, mediaId: operation.malId, remote: remote ? { ...remote, status: remoteStatus(remote.status) } : null };
    } else {
    // Resolve by MAL ID + media type. Never interpret a MAL ID as an AniList ID.
    const result = await graph<{ Page: { media: Array<{ id: number; idMal: number; type: string; mediaListEntry: { status: string; progress: number; updatedAt: number } | null }> } }>(auth.token,
      `query($id:Int,$type:MediaType){Page(perPage:1){media(idMal:$id,type:$type){id idMal type mediaListEntry{status progress updatedAt}}}}`, { id: operation.malId, type: type.toUpperCase() }, budget);
    const media = result.Page.media[0];
    if (!media || media.idMal !== operation.malId || media.type !== type.toUpperCase()) {
      warning(state, `MAL #${operation.malId} (${type}): sin correspondencia verificada en AniList.`);
      state.exportOffset++;
    } else state.pendingExport = { malId: operation.malId, mediaId: media.id, remote: media.mediaListEntry };
    }
  } else {
    // Re-read local values immediately before writing. Only send status and progress.
    const favorite = await db.from("favorites").select("id").eq("user_id", job.user_id).eq("media_id", operation.localId).maybeSingle();
    check(favorite.error);
    const local = await readProgress(db, job.user_id, operation.localId);
    if (favorite.data && reconcileAniListProgress(local, state.pendingExport.remote) === "local") {
      const previous = state.pendingExport.remote;
      await checkCancelled(db, job);
      if (mal) {
        const { setMalAnimeProgress, setMalMangaProgress } = await import("@/services/myanimelist-library");
        const status = local?.status ?? "plan_to_watch";
        if (type === "anime") await setMalAnimeProgress(auth.token, operation.malId, status as MalAnimeListEntry["list_status"]["status"], local?.current_episode ?? 0, true);
        else await setMalMangaProgress(auth.token, operation.malId, (status === "watching" ? "reading" : status === "plan_to_watch" ? "plan_to_read" : status) as MalMangaListEntry["list_status"]["status"], local?.current_episode ?? 0, true);
      } else {
      const result = await graph<{ SaveMediaListEntry: { id: number } }>(auth.token,
        `mutation($id:Int,$status:MediaListStatus,$progress:Int){SaveMediaListEntry(mediaId:$id,status:$status,progress:$progress){id}}`,
        { id: state.pendingExport.mediaId, status: remoteStatus(local?.status ?? "plan_to_watch"), progress: local?.current_episode ?? 0 }, budget);
      if (!result.SaveMediaListEntry?.id) throw new SyncError("AniList no confirmó la escritura.");
      }
      if (previous) state.updated++; else state.exported++;
    }
    state.pendingExport = undefined;
    state.exportOffset++;
  }
  return { message: `Actualizando ${type} en ${label}… ${state.exportOffset} de ${state.exportQueue?.length ?? 0}`, complete: false };
}

export async function processAniListSyncStep() {
  const db = createSupabaseAdminClient();
  const lease = randomUUID();
  const claimed = await db.rpc("claim_anilist_sync_step", { p_lease: lease });
  check(claimed.error);
  const job = (claimed.data as AniListSyncJob[] | null)?.[0];
  if (!job) {
    const next = await db.rpc("library_sync_next_delay");
    // Compatibility while the Broadcast migration is being installed.
    return { idle: true, nextPollMs: next.error ? 4000 : Number(next.data) || 60000 };
  }
  const originalState = structuredClone(job.state);
  const budget = { delay: job.provider === "myanimelist" ? 500 : 3500 };
  let status: AniListSyncJob["status"] = "running";
  let message = "Sincronizando…";
  let attempts = 0;
  const deadline = Date.now() + 20000;
  try {
    if (job.cancel_requested) throw new SyncCancelled();
    const auth = await connection(db, job.user_id, job.provider);
    await checkCancelled(db, job);
    if (auth.userId !== job.state.accountId) throw new SyncError("La cuenta conectada cambió. Iniciá una nueva sincronización.", false);
    const initialPhase = job.state.phase;
    let result = await advance(db, job, auth, budget);
    // Comparing Supabase snapshots doesn't consume provider quota. Process several
    // short pages in this request instead of imposing an API cooldown on each page.
    let comparedPages = initialPhase === "prepare" ? 1 : 0;
    while (!result.complete && job.state.phase === "prepare" && comparedPages < 5 && Date.now() < deadline) {
      await checkCancelled(db, job);
      result = await advance(db, job, auth, budget);
      comparedPages++;
    }
    if (!result.complete && job.state.phase === "exports" && !job.state.exportQueue?.[job.state.exportOffset] && Date.now() < deadline) {
      await checkCancelled(db, job);
      result = await advance(db, job, auth, budget);
    }
    message = result.message;
    if (result.complete) status = "complete";
  } catch (error) {
    if (error instanceof SyncCancelled) {
      status = "cancelled";
      message = "Sincronización cancelada. Se conservó todo lo ya sincronizado.";
    } else {
    // Replay a failed step, never advance past an unconfirmed write.
    job.state = originalState;
    const malStatus = error instanceof Error && "status" in error ? Number(error.status) : 0;
    const failure = error instanceof SyncError ? error : malStatus ? new SyncError(
      malStatus === 401 || malStatus === 403 ? "MyAnimeList requiere que vuelvas a conectar tu cuenta." : `MyAnimeList respondió ${malStatus}.`,
      malStatus === 429 || malStatus >= 500,
      error instanceof Error && "retryAfterMs" in error ? Number(error.retryAfterMs) || 60000 : 60000,
    ) : new SyncError("No se pudo procesar una tanda. Se reintentará automáticamente.");
    attempts = job.attempts + 1;
    status = failure.retry && attempts < 8 ? "running" : "error";
    message = status === "error" ? `${failure.message} Tus datos no se eliminaron. Podés reintentar.` : failure.message;
    budget.delay = Math.max(failure.delay, Math.min(300000, 10000 * 2 ** Math.min(attempts, 5)));
    }
  }
  const finished = await db.rpc("finish_anilist_sync_step", {
    p_lease: lease, p_job: job.id, p_state: job.state, p_status: status,
    p_message: message, p_delay_ms: budget.delay, p_attempts: attempts,
  });
  check(finished.error);
  return { idle: false, provider: job.provider ?? "anilist", status, message, phase: job.state.phase, nextPollMs: job.provider === "myanimelist" ? 500 : 4000, retryInSeconds: attempts ? Math.ceil(budget.delay / 1000) : 0 };
}
