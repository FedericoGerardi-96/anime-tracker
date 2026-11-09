import 'server-only';
import { getAuthenticatedUser, getSupabaseServer } from '@/services/supabase';
import { readAllPages } from '@/lib/read-all-pages';
import { isShareSlug } from '@/lib/list-sharing';
import { summarizeAnimeProgress, type AnimeProfileSummary } from '@/lib/profile-summary';
import type { ProfileHighlight } from '@/types/profile-highlights';
import type { SocialConnection } from '@/types/social';

export async function getMyProfileHighlights() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Sesión no disponible.');
  const db = await getSupabaseServer();
  const { data, error } = await db.from('profile_highlights')
    .select('id,category,external_id,title,subtitle,image_url,position,provider,characters(anilist_id,mal_id)')
    .eq('user_id', user.id).order('position');
  if (error) throw new Error('No pudimos cargar tus destacados.');
  return (data ?? []).map(({ characters, ...item }) => {
    const identity = Array.isArray(characters) ? characters[0] : characters;
    return { ...item, anilist_id: identity?.anilist_id ?? null, mal_id: identity?.mal_id ?? null };
  }) as ProfileHighlight[];
}

export async function getProfileAnimeSummary(userId: string, username: string | null) {
  const db = await getSupabaseServer();
  const { data, error } = await db.rpc('get_visible_profile_anime_summary', {
    target_user_id: userId,
    profile_username: username,
  });
  if (!error) return data as AnimeProfileSummary | null;
  if (error.code !== 'PGRST202' || (await getAuthenticatedUser())?.id !== userId) {
    throw new Error('No pudimos cargar el resumen de anime.');
  }

  const rows = await readAllPages((from, to) => db.from('user_media_progress')
    .select('status,current_episode,media!inner(mal_id,title,image,total_units,season,year,genres)')
    .eq('user_id', userId).eq('media.type', 'anime')
    .order('updated_at', { ascending: false, nullsFirst: false }).order('id')
    .range(from, to));
  return summarizeAnimeProgress(rows.flatMap(({ media, status, current_episode }) => {
    const anime = Array.isArray(media) ? media[0] : media;
    return anime ? [{ media: anime, status, current_episode }] : [];
  }));
}

export const PROFILE_LISTS_PAGE_SIZE = 12;

export async function getProfilePublicLists(userId: string, limit: number, offset = 0) {
  const db = await getSupabaseServer();
  const { data, count, error } = await db.from('lists')
    .select('id,name,share_slug,items:list_media(count),covers:list_media(media(image))', { count: 'exact' })
    .eq('user_id', userId).eq('visibility', 'public')
    .order('created_at', { ascending: false, nullsFirst: false }).order('id')
    .order('created_at', { referencedTable: 'covers', ascending: false, nullsFirst: false })
    .order('id', { referencedTable: 'covers' }).limit(2, { referencedTable: 'covers' })
    .range(offset, offset + limit - 1);
  if (error) {
    if (error.code === 'PGRST103' && offset > 0) return { total: 0, items: [] };
    throw new Error('No pudimos cargar las listas públicas.');
  }
  return {
    total: count ?? 0,
    items: (data ?? []).flatMap(row => {
      if (!isShareSlug(row.share_slug) || typeof row.name !== 'string') return [];
      return [{
        slug: row.share_slug,
        name: row.name,
        total: Number(row.items[0]?.count ?? 0),
        images: row.covers.map(({ media }) => (Array.isArray(media) ? media[0] : media)?.image),
      }];
    }),
  };
}

export async function getMyProfileFriends() {
  if (!(await getAuthenticatedUser())) return [];
  const db = await getSupabaseServer();
  const { data, error } = await db.rpc('get_my_social_connections');
  if (error) throw new Error('No pudimos cargar tus amigos.');
  return ((data ?? []) as SocialConnection[])
    .filter(friend => friend.status === 'accepted' && friend.direction === 'friend');
}
