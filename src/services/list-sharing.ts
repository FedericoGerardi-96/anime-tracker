import 'server-only';
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, getSupabaseServer } from '@/services/supabase';
import { isListUuid, isShareSlug, parseListShareSettings } from '@/lib/list-sharing';

export async function getOwnedListShareSettings(listId: string) {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.from('lists').select('visibility,share_slug')
    .eq('id', listId).eq('user_id', user.id).maybeSingle();
  return error || !data ? null : parseListShareSettings(data);
}

const coverHosts = new Set(['s4.anilist.co', 'cdn.myanimelist.net', 'api-cdn.myanimelist.net', 'myanimelist.net', 'res.cloudinary.com']);

function coverUrl(value: unknown) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && coverHosts.has(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const SHARED_LIST_PAGE_SIZE = 24;
interface SharedListItem {
  id: string;
  mediaId: string;
  title: string;
  type: 'anime' | 'manga';
  malId: number;
  image: string | null;
  format: string | null;
  total: number | null;
}

export const getSharedList = cache(async (slug: string, offset = 0, limit = SHARED_LIST_PAGE_SIZE) => {
  if (!isShareSlug(slug)) return null;
  // Read the same public projection for crawlers, guests and signed-in visitors.
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
  const { data, error } = await supabase.rpc('get_shared_list', {
    p_share_slug: slug, p_limit: limit, p_offset: offset,
  });
  if (error) throw new Error('No pudimos cargar la lista compartida.');
  if (data === null) return null;
  if (!isRecord(data) || data.share_slug !== slug || (data.visibility !== 'link' && data.visibility !== 'public')
    || !isListUuid(data.id) || typeof data.name !== 'string' || !isListUuid(data.user_id) || !Array.isArray(data.items)
    || typeof data.total_count !== 'number' || !Number.isSafeInteger(data.total_count) || data.total_count < 0) {
    throw new Error('Respuesta inválida de la lista compartida.');
  }
  const items = data.items.flatMap<SharedListItem>((item: unknown) => {
    if (!isRecord(item) || typeof item.id !== 'string' || !isRecord(item.media)) return [];
    const { id, title, type, mal_id, image, format, total_units } = item.media;
    if (!isListUuid(id) || typeof title !== 'string' || (type !== 'anime' && type !== 'manga')
      || typeof mal_id !== 'number' || !Number.isSafeInteger(mal_id) || mal_id <= 0) return [];
    return [{
      id: item.id, mediaId: id, title, type, malId: mal_id, image: coverUrl(image),
      format: typeof format === 'string' ? format : null,
      total: typeof total_units === 'number' && Number.isInteger(total_units) && total_units > 0 ? total_units : null,
    }];
  });
  const { data: profile } = await supabase.from('profiles').select('full_name,username').eq('id', data.user_id).maybeSingle();
  const owner = (typeof profile?.full_name === 'string' && profile.full_name.trim())
    || (typeof profile?.username === 'string' && profile.username.trim()) || 'una cuenta de AniTrack';
  return {
    id: data.id,
    ownerId: data.user_id,
    owner,
    username: typeof profile?.username === 'string' && /^[A-Za-z0-9_]{3,30}$/.test(profile.username) ? profile.username : null,
    title: data.name,
    description: typeof data.description === 'string' ? data.description : null,
    subtitle: `${data.total_count} ${data.total_count === 1 ? 'título' : 'títulos'} · lista de ${owner}`,
    total: data.total_count,
    items,
  };
});

export async function getFollowedLists(offset: number, limit: number) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc('get_my_followed_lists', { p_limit: limit, p_offset: offset });
  if (error || !Array.isArray(data)) throw new Error('No pudimos cargar las listas que seguís.');
  return data.flatMap((row: unknown) => {
    if (!isRecord(row) || !isListUuid(row.list_id)) return [];
    return [{
      id: row.list_id,
      name: typeof row.name === 'string' ? row.name : null,
      slug: isShareSlug(row.share_slug) ? row.share_slug : null,
      total: typeof row.total_count === 'number' && row.total_count >= 0 ? row.total_count : null,
    }];
  });
}

export async function isFollowingSharedList(id: string, slug: string, userId: string) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.from('list_follows').select('list_id')
    .eq('user_id', userId).eq('list_id', id).maybeSingle();
  if (error) throw new Error('No pudimos comprobar el seguimiento.');
  if (!data) return false;
  // The table exposes the relation, while only the RPC can confirm the current token.
  for (let offset = 0; offset <= 1000000; offset += 100) {
    const page = await getFollowedLists(offset, 100);
    const match = page.find(row => row.id === id);
    if (match) return match.slug === slug;
    if (page.length < 100) return false;
  }
  return false;
}

export async function getSharedListProgress(userId: string, ids: string[]) {
  if (!ids.length) return [];
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.from('user_media_progress')
    .select('media_id,status,current_episode,updated_at').eq('user_id', userId).in('media_id', [...new Set(ids)]);
  if (error) throw new Error('No pudimos cargar tu progreso.');
  return (data ?? []).flatMap((row: unknown) => {
    if (!isRecord(row) || !isListUuid(row.media_id)) return [];
    return [{
      media_id: row.media_id,
      status: typeof row.status === 'string' ? row.status : null,
      current_episode: typeof row.current_episode === 'number' && row.current_episode >= 0 ? row.current_episode : 0,
      updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
    }];
  });
}
