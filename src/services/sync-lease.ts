import 'server-only';
import type { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AniListSyncJob } from '@/interfaces/anilist-sync';

type DB = ReturnType<typeof createSupabaseAdminClient>;

/** Reuse the existing database lease, but never claim another user's job.
 * Atomic conditional UPDATE also coordinates tabs and in-flight legacy workers.
 * The lease outlives the route's 60-second maximum execution time.
 */
export async function claimUserSyncStep(db: DB, userId: string, lease: string) {
  const now = new Date();
  const acquired = await db.from('anilist_sync_worker')
    .update({ lease_id: lease, lease_until: new Date(now.getTime() + 90_000).toISOString(), heartbeat_at: now.toISOString() })
    .eq('id', true).lte('lease_until', now.toISOString()).lte('next_request_at', now.toISOString())
    .select('lease_id').maybeSingle();
  if (acquired.error) throw new Error('No se pudo reservar una tanda de sincronización.');
  if (!acquired.data) {
    const current = await db.from('anilist_sync_worker').select('lease_until,next_request_at').eq('id', true).maybeSingle();
    if (current.error || !current.data) throw new Error('No se encontró la configuración de la cola de sincronización.');
    const readyAt = Math.max(Date.parse(current.data.lease_until), Date.parse(current.data.next_request_at));
    return { job: null, nextPollMs: Math.max(1000, readyAt - Date.now()) };
  }
  try {
    const pending = await db.from('anilist_sync_jobs').select('*')
      .eq('user_id', userId).in('status', ['queued', 'running'])
      .lte('next_run_at', now.toISOString()).order('created_at').limit(1).maybeSingle();
    if (pending.error) throw new Error('No se pudo leer el trabajo de sincronización.');
    if (!pending.data) {
      await releaseSyncLease(db, lease);
      const next = await db.from('anilist_sync_jobs').select('next_run_at')
        .eq('user_id', userId).in('status', ['queued', 'running']).order('next_run_at').limit(1).maybeSingle();
      if (next.error) throw new Error('No se pudo consultar el próximo intento.');
      return { job: null, nextPollMs: next.data ? Math.max(1000, Date.parse(next.data.next_run_at) - Date.now()) : 1000 };
    }
    const running = await db.from('anilist_sync_jobs').update({ status: 'running' })
      .eq('id', pending.data.id).eq('user_id', userId).in('status', ['queued', 'running'])
      .select('*').maybeSingle();
    if (running.error) throw new Error('No se pudo iniciar la tanda.');
    if (!running.data) await releaseSyncLease(db, lease);
    return { job: running.data as AniListSyncJob | null, nextPollMs: 1000 };
  } catch (error) {
    await releaseSyncLease(db, lease);
    throw error;
  }
}

async function releaseSyncLease(db: DB, lease: string) {
  const { error } = await db.from('anilist_sync_worker')
    .update({ lease_id: null, lease_until: new Date().toISOString() })
    .eq('id', true).eq('lease_id', lease);
  if (error) throw new Error('No se pudo liberar la tanda; se reintentará al vencer la reserva.');
}
