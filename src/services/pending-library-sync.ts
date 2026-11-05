import 'server-only';
import type { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AniListSyncJob, SyncState, PendingChange } from '@/interfaces/anilist-sync';
import { remoteStatus } from '@/lib/anilist-sync-policy';
import { getMalSyncEntry, setMalAnimeProgress, setMalMangaProgress, deleteMalSyncEntry } from '@/services/myanimelist-library';

type DB = ReturnType<typeof createSupabaseAdminClient>;

type Graph = <T>(query: string, variables: Record<string, unknown>) => Promise<T>;
function check(error: unknown) { if (error) throw new Error('No se pudo leer o confirmar la cola de cambios pendientes.'); }
function identity(db: DB, row: PendingChange) {
  return db.from('library_sync_pending').delete().eq('user_id', row.user_id).eq('provider', row.provider).eq('media_type', row.media_type).eq('mal_id', row.mal_id).eq('revision', row.revision);
}
export async function advancePending(db: DB, job: AniListSyncJob, token: string, graph: Graph) {
  const state: SyncState = job.state;
  let row = state.pendingChange;
  if (!row) {
    const result = await db.from('library_sync_pending').select('*').eq('user_id', job.user_id).eq('provider', job.provider ?? 'anilist').eq('account_id', state.accountId).in('media_type', state.types).order('updated_at').limit(1).maybeSingle();
    check(result.error);
    if (!result.data) return { complete: true, message: 'Cambios pendientes enviados. Tu biblioteca local está guardada.' };
    row = result.data as PendingChange;
  } else {
    const current = await db.from('library_sync_pending').select('revision').eq('user_id', row.user_id).eq('provider', row.provider).eq('media_type', row.media_type).eq('mal_id', row.mal_id).maybeSingle();
    check(current.error);
    if (current.data?.revision !== row.revision) {
      state.pendingChange = undefined;
      return { complete: false, message: 'La serie cambió mientras sincronizábamos. Tomando su último estado…' };
    }
  }
  const mal = row.provider === 'myanimelist';
  const desired = remoteStatus(row.status);
  if (!desired) throw new Error('Estado pendiente inválido.');
  if (!row.resolved) {
    if (mal) {
      const entry = await getMalSyncEntry(token, row.media_type, row.mal_id);
      row.resolved = { mediaId: row.mal_id, status: entry ? remoteStatus(entry.status) : '', progress: entry?.progress ?? 0 };
    } else {
      const result = await graph<{ Page: { media: Array<{ id: number; idMal: number; type: string; mediaListEntry: { id: number; status: string; progress: number } | null }> } }>(
        'query($id:Int,$type:MediaType){Page(perPage:2){media(idMal:$id,type:$type){id idMal type mediaListEntry{id status progress}}}}', { id: row.mal_id, type: row.media_type.toUpperCase() });
      const matches = result.Page.media;
      if (matches.length !== 1 || matches[0].idMal !== row.mal_id || matches[0].type !== row.media_type.toUpperCase()) throw new Error('La serie pendiente no tiene correspondencia única en AniList.');
      const media = matches[0];
      row.resolved = { mediaId: media.id, entryId: media.mediaListEntry?.id, status: media.mediaListEntry?.status ?? '', progress: media.mediaListEntry?.progress ?? 0 };
    }
    const remote = row.resolved;
    const unchanged = row.operation === 'delete' ? !remote.status : Boolean(remote.status) && (row.favorite_only || (remote.status === desired && remote.progress === row.progress));
    if (unchanged) { check((await identity(db, row)).error); state.unchanged = (state.unchanged ?? 0) + 1; state.pendingChange = undefined; }
    else state.pendingChange = row;
  } else {
    if (row.operation === 'delete') {
      if (mal) await deleteMalSyncEntry(token, row.media_type, row.mal_id);
      else {
        const result = await graph<{ DeleteMediaListEntry: { deleted: boolean } }>('mutation($id:Int){DeleteMediaListEntry(id:$id){deleted}}', { id: row.resolved.entryId });
        if (typeof result.DeleteMediaListEntry?.deleted !== 'boolean') throw new Error('AniList no confirmó la eliminación.');
      }
    } else if (mal) {
      if (row.media_type === 'anime') await setMalAnimeProgress(token, row.mal_id, row.status as Parameters<typeof setMalAnimeProgress>[2], row.progress, true);
      else await setMalMangaProgress(token, row.mal_id, (row.status === 'watching' ? 'reading' : row.status === 'plan_to_watch' ? 'plan_to_read' : row.status) as Parameters<typeof setMalMangaProgress>[2], row.progress, true);
    } else {
      const result = await graph<{ SaveMediaListEntry: { id: number } }>('mutation($id:Int,$status:MediaListStatus,$progress:Int){SaveMediaListEntry(mediaId:$id,status:$status,progress:$progress){id}}', { id: row.resolved.mediaId, status: desired, progress: row.progress });
      if (!result.SaveMediaListEntry?.id) throw new Error('AniList no confirmó la actualización.');
    }
    // A concurrent local change gets a new revision and must remain queued.
    check((await identity(db, row)).error);
    state.updated++;
    state.pendingChange = undefined;
  }
  return { complete: false, message: `Enviando cambios pendientes… ${state.updated} aplicados, ${state.unchanged ?? 0} ya coincidían.` };
}
