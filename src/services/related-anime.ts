import 'server-only';
import { getAuthenticatedUser, getSupabaseServer } from '@/services/supabase';
import { readInBatches } from '@/lib/read-all-pages';
import { libraryStatuses, type LibraryStatus } from '@/lib/library-editor';

export async function getRelatedAnimeStatuses(ids: number[]): Promise<Map<number, LibraryStatus>> {
  const user = await getAuthenticatedUser();
  const statuses = new Map<number, LibraryStatus>();
  if (!user || !ids.length) return statuses;
  const supabase = await getSupabaseServer();
  const rows = await readInBatches(ids, batch => supabase.from('user_media_progress')
    .select('status,media!inner(mal_id,type)').eq('user_id', user.id)
    .eq('media.type', 'anime').in('media.mal_id', batch));
  for (const row of rows) {
    const media = Array.isArray(row.media) ? row.media[0] : row.media;
    const status = libraryStatuses.find(item => item.value === row.status)?.value;
    if (media && status) statuses.set(Number(media.mal_id), status);
  }
  return statuses;
}
