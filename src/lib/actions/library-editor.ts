'use server';

import { getAuthenticatedUser, getSupabaseServer } from '@/services/supabase';
import { revalidatePath } from 'next/cache';
import { safeWatchLink, validLibraryEdit, type LibraryEdit, type EditorSnapshot } from '@/lib/library-editor';

interface ProgressRecord {
  updated_at: string | null; status: string | null; current_episode: number | null;
  custom_description: string | null; custom_tags: string[] | null; watch_link: string | null;
}
const progressFields = 'status,current_episode,custom_description,custom_tags,watch_link,updated_at';
function toSnapshot(data: ProgressRecord | null, total: number | null): EditorSnapshot {
  return { exists: Boolean(data), revision: data?.updated_at ?? null, status: data?.status ?? null, episode: data?.current_episode ?? 0,
    note: data?.custom_description ?? '', tags: data?.custom_tags ?? [], watchLink: data?.watch_link ?? '', total };
}
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
async function context(mediaId: string) {
  if (!uuid(mediaId)) throw new Error('Título inválido.');
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Iniciá sesión para editar tu biblioteca.');
  const supabase = await getSupabaseServer();
  const { data: media, error } = await supabase.from('media').select('id, total_units, type').eq('id', mediaId).maybeSingle();
  if (error || !media || !['anime','manga'].includes(media.type)) throw new Error('No pudimos encontrar el título.');
  return { user, supabase, media };
}
export async function readLibraryEditor(mediaId: string): Promise<{ data: EditorSnapshot } | { error: string }> {
  try {
    const { user, supabase, media } = await context(mediaId);
    const { data, error } = await supabase.from('user_media_progress')
      .select(progressFields).eq('user_id', user.id).eq('media_id', mediaId).maybeSingle();
    if (error) return { error: 'No pudimos cargar tu progreso.' };
    return { data: toSnapshot(data, media.total_units ?? null) };
  } catch { return { error: 'No pudimos cargar la edición. Revisá tu sesión e intentá nuevamente.' }; }
}
export async function saveLibraryEditor(mediaId: string, expected: { exists: boolean; revision: string | null }, edit: LibraryEdit): Promise<{ data: EditorSnapshot } | { error: string }> {
  if (!validLibraryEdit(edit) || !expected || typeof expected.exists !== 'boolean' || (expected.revision !== null && typeof expected.revision !== 'string')) return { error: 'Revisá los datos: usá un enlace http/https, hasta 30 etiquetas de 60 caracteres y una nota de hasta 10.000 caracteres.' };
  try {
    const { user, supabase, media } = await context(mediaId);
    const queue = await supabase.from('library_sync_pending').select('revision').limit(0);
    if (queue.error) return { error: 'Falta preparar la cola de sincronización en Supabase.' };
    const updated_at = new Date().toISOString();
    let values;
    if (edit.kind === 'progress') {
      if (media.total_units && edit.episode > media.total_units) return { error: 'El progreso no puede superar el total.' };
      const current_episode = edit.status === 'completed' && media.total_units ? media.total_units : edit.episode;
      const status = edit.status === 'watching' && media.total_units && current_episode === media.total_units ? 'completed' : edit.status;
      values = { status, current_episode, updated_at };
    } else {
      values = { custom_description: edit.note.trim() || null, watch_link: safeWatchLink(edit.watchLink), custom_tags: [...new Set(edit.tags.map(tag => tag.trim()))], updated_at };
    }
    let saved: EditorSnapshot;
    if (expected.exists) {
      let query = supabase.from('user_media_progress').update(values).eq('user_id', user.id).eq('media_id', mediaId);
      query = expected.revision === null ? query.is('updated_at', null) : query.eq('updated_at', expected.revision);
      const result = await query.select(progressFields).maybeSingle();
      if (result.error) return { error: 'No pudimos guardar. Tus cambios siguen en el panel.' };
      if (!result.data) return { error: 'El título cambió en otra pestaña. Actualizá la lista y volvé a abrir el editor para cargar el progreso actual.' };
      saved = toSnapshot(result.data, media.total_units ?? null);
    } else {
      const result = await supabase.from('user_media_progress').upsert(Object.assign({ user_id: user.id, media_id: mediaId, status: 'plan_to_watch', current_episode: 0 }, values), { onConflict: 'user_id,media_id', ignoreDuplicates: true }).select(progressFields).maybeSingle();
      if (result.error) return { error: 'No pudimos guardar. Tus cambios siguen en el panel.' };
      if (!result.data) return { error: 'El título cambió en otra pestaña. Actualizá la lista y volvé a abrir el editor.' };
      saved = toSnapshot(result.data, media.total_units ?? null);
    }
    revalidatePath('/lists'); revalidatePath('/favorites'); revalidatePath('/profile');
    return { data: saved };
  } catch { return { error: 'No pudimos guardar. Revisá tu conexión e intentá nuevamente.' }; }
}
export async function removeLibraryFavorite(mediaId: string) {
  try {
    const { user, supabase } = await context(mediaId);
    const queue = await supabase.from('library_sync_pending').select('revision').limit(0);
    if (queue.error) return { error: 'Falta preparar la cola de sincronización en Supabase.' };
    const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('media_id', mediaId);
    if (error) return { error: 'No pudimos quitar el favorito.' };
    revalidatePath('/lists'); revalidatePath('/favorites'); revalidatePath('/profile');
    return { success: true };
  } catch { return { error: 'No pudimos quitar el favorito. Revisá tu sesión.' }; }
}
