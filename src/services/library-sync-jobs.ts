import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/services/supabase";
import { publicJob, processAniListSyncStep } from "@/services/anilist-sync";
import type { AniListSyncJob, SyncProvider, SyncState } from "@/interfaces/anilist-sync";

const headers = { "Cache-Control": "no-store" };
async function ownJobs(userId: string) {
  const db = createSupabaseAdminClient();
  const result = await db.from("anilist_sync_jobs").select("*").eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(20);
  if (result.error) throw new Error("No se pudo consultar la cola de sincronización.");
  const all = (result.data ?? []) as AniListSyncJob[];
  return all.filter((job, index) => all.findIndex((other) => (other.provider ?? "anilist") === (job.provider ?? "anilist")) === index).map(publicJob);
}

export async function readSyncJobs(provider?: SyncProvider) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401, headers });
  try {
    const jobs = await ownJobs(user.id);
    return Response.json(provider ? { job: jobs.find(job => job.provider === provider) ?? null } : { jobs }, { headers });
  } catch {
    return Response.json({ error: "No se pudo consultar la cola de sincronización." }, { status: 503, headers });
  }
}

export async function advanceSyncJob(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Origen inválido" }, { status: 403, headers });
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401, headers });
  try {
    // Identity comes exclusively from the authenticated session, never request data.
    const result = await processAniListSyncStep(user.id);
    return Response.json({ jobs: await ownJobs(user.id), nextPollMs: result.nextPollMs }, { headers });
  } catch {
    return Response.json({ error: "No pudimos procesar la tanda. Se reintentará mientras la app esté abierta." }, { status: 503, headers });
  }
}

export async function startSyncJob(request: Request, fixedProvider?: SyncProvider) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Origen inválido" }, { status: 403, headers });
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401, headers });
  const body = await request.json().catch(() => null);
  const provider = fixedProvider ?? body?.provider;
  if (provider !== "anilist" && provider !== "myanimelist") return Response.json({ error: "Proveedor inválido." }, { status: 400, headers });
  const types: SyncState["types"] = [];
  if (body?.anime === true) types.push("anime");
  if (body?.manga === true) types.push("manga");
  if (!types.length) return Response.json({ error: "Seleccioná anime o manga." }, { status: 400, headers });
  const db = createSupabaseAdminClient();
  const schema = await db.from("anilist_sync_jobs").select("provider,cancel_requested").limit(0);
  if (schema.error) return Response.json({ error: "Falta aplicar la migración 202610220004_library_sync_cancel.sql en Supabase." }, { status: 503, headers });
  const mode = body?.mode === 'full' ? 'full' : 'pending';
  const pending = await db.from('library_sync_pending').select('mal_id').eq('user_id', user.id).eq('provider', provider).limit(1);
  if (pending.error) return Response.json({ error: 'Falta aplicar la migración 202610280001_library_sync_pending.sql en Supabase.' }, { status: 503, headers });
  if (mode === 'full' && pending.data?.length) return Response.json({ error: 'Primero enviá los cambios pendientes para no reimportar series que eliminaste.' }, { status: 409, headers });
  const isMal = provider === "myanimelist";
  const auth = await db.from(isMal ? "mal_connections" : "anilist_connections").select(isMal ? "mal_user_id" : "anilist_user_id,token_expires_at").eq("user_id", user.id).maybeSingle();
  const account = auth.data as unknown as { mal_user_id?: number; anilist_user_id?: number; token_expires_at?: string } | null;
  if (auth.error || !account || (!isMal && Date.parse(account.token_expires_at ?? "") <= Date.now())) return Response.json({ error: `Volvé a conectar ${isMal ? "MyAnimeList" : "AniList"} desde tu perfil.` }, { status: 409, headers });
  const stale = await db.from('library_sync_pending').select('mal_id').eq('user_id', user.id).eq('provider', provider).neq('account_id', Number(isMal ? account.mal_user_id : account.anilist_user_id)).limit(1);
  if (stale.error) return Response.json({ error: 'No se pudo verificar la cuenta de los cambios pendientes.' }, { status: 503, headers });
  if (stale.data?.length) return Response.json({ error: 'Hay cambios pendientes de otra cuenta vinculada. Reconectá esa cuenta antes de enviarlos; no se aplicarán a una cuenta diferente.' }, { status: 409, headers });
  const state: SyncState = { mode, accountId: Number(isMal ? account.mal_user_id : account.anilist_user_id), types, typeIndex: 0, phase: "fetch", page: 1, remote: [], cursor: 0, exportOffset: 0, imported: 0, exported: 0, updated: 0, skipped: 0, warnings: [] };
  const result = await db.from("anilist_sync_jobs").insert({ user_id: user.id, provider, state }).select("*").single();
  if (result.error?.code === "23505") {
    const existing = await db.from("anilist_sync_jobs").select("*").eq("user_id", user.id).in("status", ["queued", "running"]).single();
    if (existing.data && (existing.data.provider ?? "anilist") === provider) return Response.json({ job: publicJob(existing.data as AniListSyncJob) }, { headers });
    return Response.json({ error: "Ya hay una sincronización activa. Esperá a que termine o cancelala desde el panel." }, { status: 409, headers });
  }
  if (result.error || !result.data) return Response.json({ error: "No se pudo crear el trabajo de sincronización." }, { status: 503, headers });
  return Response.json({ job: publicJob(result.data as AniListSyncJob) }, { status: 202, headers });
}

export async function cancelSyncJob(request: Request, jobId: string) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Origen inválido" }, { status: 403, headers });
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401, headers });
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(jobId)) return Response.json({ error: "Trabajo inválido." }, { status: 400, headers });
  const result = await createSupabaseAdminClient().from("anilist_sync_jobs").update({ cancel_requested: true, next_run_at: new Date().toISOString(), message: "Cancelación solicitada. Esperando que termine la operación en curso…" })
    .eq("id", jobId).eq("user_id", user.id).in("status", ["queued", "running"]).select("*").maybeSingle();
  if (result.error) return Response.json({ error: "No se pudo cancelar. Revisá que esté aplicada la migración de cancelación." }, { status: 503, headers });
  if (!result.data) return Response.json({ error: "El trabajo ya terminó o no está disponible." }, { status: 409, headers });
  return Response.json({ job: publicJob(result.data as AniListSyncJob) }, { status: 202, headers });
}
