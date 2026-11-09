import 'server-only';
import { getAuthenticatedUser, getSupabaseServer } from '@/services/supabase';
import { readAllPages } from '@/lib/read-all-pages';

export async function getListsSidebarData() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('No autorizado');
  const supabase = await getSupabaseServer();
  const [progress, lists, library] = await Promise.all([
    readAllPages((from, to) => supabase.from('user_media_progress')
      .select('status, media!inner(id)').eq('user_id', user.id).order('id').range(from, to)),
    readAllPages((from, to) => supabase.from('lists')
      .select('id, name, list_media(count)').eq('user_id', user.id)
      .order('created_at', { ascending: false }).order('id').range(from, to)),
    supabase.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);
  if (library.error) throw new Error('No pudimos cargar la biblioteca.');
  const counts: Record<string, number> = { library: library.count ?? 0 };
  for (const row of progress) {
    if (typeof row.status === 'string') counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return {
    counts,
    lists: lists.map(list => ({ id: list.id, name: list.name, count: list.list_media[0]?.count ?? 0 })),
  };
}
