import 'server-only';
import { cache } from 'react';
import { getAuthenticatedUser, getSupabaseServer } from './supabase';
import { getListMedia, getMediaByProgressStatus } from '@/lib/actions/lists';
import { getAllFavoritesFull } from './favorites';
import { LIST_TABS } from '@/lib/lists-navigation';
import type { HeroItem } from '@/lib/list-hero';

export const getListHeroItems = cache(async (tab: string, listId?: string): Promise<HeroItem[]> => {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('No autorizado');
  if (tab !== 'library' && !LIST_TABS.some(entry => entry.id === tab)) throw new Error('Lista inválida');
  if (tab === 'custom_lists') {
    if (!listId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listId)) throw new Error('Lista inválida');
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.from('lists').select('id').eq('id', listId).eq('user_id', user.id).maybeSingle();
    if (error || !data) throw new Error('Lista no disponible');
  } else if (listId) throw new Error('Lista inválida');

  if (tab === 'library') {
    const favorites = await getAllFavoritesFull(user.id);
    return favorites.flatMap(row => {
      const media = Array.isArray(row.media) ? row.media[0] : row.media;
      return media ? [{ id: media.id, malId: media.mal_id, title: media.title, image: media.image, type: media.type,
        status: row.progress?.status ?? null, episode: row.progress?.current_episode ?? 0, total: media.total_units ?? null }] : [];
    });
  }
  const rows = listId ? await getListMedia(listId) : await getMediaByProgressStatus(tab);
  return rows.flatMap(row => {
    const media = Array.isArray(row.media) ? row.media[0] : row.media;
    return media ? [{ id: media.id, malId: media.mal_id, title: media.title, image: media.image, type: media.type,
      status: 'status' in row && typeof row.status === 'string' ? row.status : null, episode: 'current_episode' in row && typeof row.current_episode === 'number' ? row.current_episode : 0, total: media.total_units ?? null }] : [];
  });
});
