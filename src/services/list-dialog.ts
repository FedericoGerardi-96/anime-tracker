import 'server-only';
import { getAuthenticatedUser, getSupabaseServer } from './supabase';
import type { ListDialogResult } from '@/interfaces/list-dialog';

export async function getListDialogData(malId: number, mediaType: 'anime' | 'manga'): Promise<ListDialogResult> {
  if (!Number.isSafeInteger(malId) || malId < 1 || !['anime', 'manga'].includes(mediaType)) return { error: 'Obra inválida.' };
  const user = await getAuthenticatedUser();
  if (!user) return { error: 'Iniciá sesión para administrar tus listas.' };
  const supabase = await getSupabaseServer();
  const [lists, associations, progress] = await Promise.all([
    supabase.from('lists').select('id, name, description').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('list_media').select('list_id, media!inner(mal_id, type), lists!inner(user_id)')
      .eq('media.mal_id', malId).eq('media.type', mediaType).eq('lists.user_id', user.id),
    supabase.from('user_media_progress').select('status, current_episode, media!inner(mal_id, type)')
      .eq('user_id', user.id).eq('media.mal_id', malId).eq('media.type', mediaType).maybeSingle(),
  ]);
  const error = lists.error || associations.error || progress.error;
  if (error) { console.error('List dialog query failed:', error); return { error: 'No pudimos cargar tus listas y tu progreso. Intentá nuevamente.' }; }
  return { data: {
    lists: lists.data ?? [], listIds: (associations.data ?? []).map(row => row.list_id),
    progress: progress.data ? { status: progress.data.status, current_episode: progress.data.current_episode } : null,
  } };
}
