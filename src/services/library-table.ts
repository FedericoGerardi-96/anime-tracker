import 'server-only';
import { getAuthenticatedUser, getSupabaseServer } from './supabase';
import { readInBatches } from '@/lib/read-all-pages';
import type { LibraryRow } from '@/lib/library-editor';

// Only hydrate the visible page. This also supports older pagination RPC payloads.
export async function hydrateLibraryRows(rows: LibraryRow[]): Promise<LibraryRow[]> {
  if (!rows.length) return rows;
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('No autorizado');
  const supabase = await getSupabaseServer();
  const ids = rows.map(row => row.id);
  const [personal, media] = await Promise.all([
    readInBatches(ids, batch => supabase.from('user_media_progress')
      .select('media_id,status,current_episode,custom_description,custom_tags,watch_link,updated_at').eq('user_id',user.id).in('media_id',batch)),
    readInBatches(ids, batch => supabase.from('media').select('id,total_units,status').in('id',batch)),
  ]);
  const personalById = new Map(personal.map(row => [row.media_id,row]));
  const mediaById = new Map(media.map(row => [row.id,row]));
  return rows.map(row => {
    const data = personalById.get(row.id);
    return {...row,catalogStatus:mediaById.get(row.id)?.status ?? row.catalogStatus ?? null,editorVersion:{exists:Boolean(data),revision:data?.updated_at ?? null},total:mediaById.get(row.id)?.total_units ?? null,status:data?.status ?? null,episode:data?.current_episode ?? 0,
      note:data?.custom_description ?? '',tags:data?.custom_tags ?? [],watchLink:data?.watch_link ?? ''};
  });
}
