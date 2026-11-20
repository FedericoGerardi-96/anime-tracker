'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { parseHentaiEntry, parseHentaiFilters, parseHentaiInput } from '@/lib/hentai';
import type { HentaiEntry } from '@/interfaces/hentai';
export type { HentaiEntry } from '@/interfaces/hentai';

const preparationError = 'Falta actualizar la sección Hentai en el servidor para guardar estos datos.';

export async function createHentaiEntry(formData: FormData) {
  const input = parseHentaiInput(formData);
  if ('error' in input) return input;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Iniciá sesión para agregar un título.' };
  const schema = await supabase.from('hentai').select('revision,watch_link,source_anime,is_original').limit(0);
  if (schema.error) return { error: preparationError };
  const { error } = await supabase.from('hentai').insert({ user_id: user.id, ...input.data });
  if (error) return { error: 'No pudimos agregar el título. Tus datos siguen en el formulario.' };
  revalidatePath('/hentai');
  return { success: true };
}

export async function getHentaiEntries(page = 1, pageSize = 12, query = '', options: { type?: string; sort?: string; origin?: string } = {}): Promise<{ data: HentaiEntry[]; count: number; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], count: 0, error: 'Iniciá sesión para ver tu colección.' };
  const filters = parseHentaiFilters({ page: String(page), q: query, type: options?.type, sort: options?.sort, origin: options?.origin });
  const size = Number.isSafeInteger(pageSize) ? Math.min(100, Math.max(1, pageSize)) : 12;
  const from = (filters.page - 1) * size;
  let request = supabase.from('hentai').select('*', { count: 'exact' }).eq('user_id', user.id);
  if (filters.type !== 'all') request = request.eq('type', filters.type);
  if (filters.origin === 'original') request = request.eq('is_original', true);
  else if (filters.origin.startsWith('anime:')) request = request.eq('source_anime', filters.origin.slice(6));
  if (filters.q) {
    // Keep Unicode titles while excluding PostgREST filter syntax and wildcards.
    const words = filters.q.normalize('NFC').match(/[\p{L}\p{N}]+/gu) ?? [];
    const pattern = '%' + words.join('%') + '%';
    request = request.or(`title.ilike.${pattern},description.ilike.${pattern}`);
  }
  const alphabetical = filters.sort === 'title-asc' || filters.sort === 'title-desc';
  const { data, error, count } = await request
    .order(alphabetical ? 'title' : 'created_at', { ascending: filters.sort === 'oldest' || filters.sort === 'title-asc' })
    .order('id', { ascending: true }).range(from, from + size - 1);
  if (error) return { data: [], count: 0, error: 'No pudimos cargar tu colección. Volvé a intentar.' };
  const entries = (data ?? []).map((row: unknown) => parseHentaiEntry(row));
  if (entries.some(entry => entry === null)) return { data: [], count: 0, error: 'No pudimos leer algunos títulos de tu colección. Volvé a intentar.' };
  return { data: entries.filter((entry): entry is HentaiEntry => entry !== null), count: count ?? 0 };
}

export async function getHentaiSourceAnimes(): Promise<{ data: string[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Iniciá sesión para ver los animes de tu colección.' };
  // Distinct values across the entire private collection, regardless of pagination or filters.
  const { data, error } = await supabase.rpc('get_hentai_source_animes');
  if (error || !Array.isArray(data) || !data.every((source: unknown): source is string => typeof source === 'string')) {
    return { data: [], error: 'No pudimos cargar el filtro de anime de origen. Revisá que la sección esté actualizada y reintentá.' };
  }
  return { data };
}

export async function updateHentaiEntry(id: string, revision: string, formData: FormData) {
  if (typeof id !== 'string' || !id || id.length > 128) return { error: 'Título inválido.' };
  if (typeof revision !== 'string' || !revision) return { error: preparationError };
  const input = parseHentaiInput(formData);
  if ('error' in input) return input;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Iniciá sesión para editar el título.' };
  const current = await supabase.from('hentai').select('id,type,mal_id').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (current.error || !current.data) return { error: 'No pudimos encontrar el título en tu colección.' };
  if (current.data.mal_id != null && current.data.type !== input.data.type) return { error: 'Los títulos agregados desde el catálogo conservan su tipo original.' };
  const result = await supabase.from('hentai').update(input.data).eq('id', id).eq('user_id', user.id)
    .eq('revision', revision).select('id').maybeSingle();
  if (result.error) return { error: 'No pudimos guardar. Tus cambios siguen en el formulario.' };
  if (!result.data) return { error: 'El título cambió en otra pestaña o fue quitado. Cerrá el editor, actualizá la página y volvé a abrirlo.' };
  revalidatePath('/hentai');
  return { success: true };
}

export async function deleteHentaiEntry(id: string) {
  if (typeof id !== 'string' || !id || id.length > 128) return { error: 'Título inválido.' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Iniciá sesión para quitar el título.' };
  const { error } = await supabase.from('hentai').delete().eq('id', id).eq('user_id', user.id);
  if (error) return { error: 'No pudimos quitar el título. Volvé a intentar.' };
  revalidatePath('/hentai');
  return { success: true };
}
