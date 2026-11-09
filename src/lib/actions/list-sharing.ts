'use server';

import { revalidatePath } from 'next/cache';
import { isListUuid, isListVisibility, isShareSlug, parseListShareSettings, sharedListPath } from '@/lib/list-sharing';
import { getAuthenticatedUser, getSupabaseServer } from '@/services/supabase';

export async function setListVisibility(listId: string, visibility: unknown) {
  if (!isListUuid(listId) || !isListVisibility(visibility)) {
    return { error: 'La lista o la privacidad no es válida.' };
  }
  const user = await getAuthenticatedUser();
  if (!user) return { error: 'Iniciá sesión para cambiar la privacidad.' };
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.from('lists').update({ visibility })
    .eq('id', listId).eq('user_id', user.id).select('visibility,share_slug').maybeSingle();
  if (error) return { error: 'No pudimos guardar la privacidad. Volvé a intentar.' };
  const settings = data && parseListShareSettings(data);
  if (!settings) return { error: 'No pudimos confirmar la privacidad de esta lista.' };
  revalidatePath('/lists');
  return { settings };
}

export async function followSharedList(slug: string) {
  if (!isShareSlug(slug)) return { error: 'La lista ya no está disponible.' };
  const user = await getAuthenticatedUser();
  if (!user) return { error: 'Iniciá sesión para seguir la lista.' };
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc('follow_shared_list', { p_share_slug: slug });
  if (error || !isListUuid(data)) return { error: error?.code === 'P0002'
    ? 'La lista ya no está disponible para seguir.' : 'No pudimos seguir la lista. Volvé a intentar.' };
  revalidatePath('/lists');
  revalidatePath(sharedListPath(slug));
  return { success: true };
}

export async function unfollowSharedList(id: string) {
  if (!isListUuid(id)) return { error: 'La lista no es válida.' };
  const user = await getAuthenticatedUser();
  if (!user) return { error: 'Iniciá sesión para dejar de seguir la lista.' };
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from('list_follows').delete().eq('user_id', user.id).eq('list_id', id);
  if (error) return { error: 'No pudimos dejar de seguir la lista. Volvé a intentar.' };
  revalidatePath('/lists');
  return { success: true };
}

export async function copySharedList(slug: string, copyId: string) {
  if (!isShareSlug(slug) || !isListUuid(copyId)) return { error: 'El enlace de la lista no es válido.' };
  const user = await getAuthenticatedUser();
  if (!user) return { error: 'Iniciá sesión para crear una copia.' };
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc('copy_shared_list', { p_share_slug: slug, p_copy_id: copyId });
  if (error || data !== copyId) return { error: error?.code === 'P0002'
    ? 'La lista ya no está disponible para copiar.' : 'No pudimos crear la copia. Volvé a intentar.' };
  revalidatePath('/lists');
  return { id: copyId };
}
