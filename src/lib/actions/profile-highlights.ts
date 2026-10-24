'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ProfileHighlight, ProfileHighlightCategory } from '@/types/profile-highlights';
import { resolveFavoriteCharacter } from '@/services/favorite-character-identity';

const CATEGORIES: ProfileHighlightCategory[] = ['anime', 'manga', 'character'];

function valid(items: ProfileHighlight[]) {
  if (items.length > 30) return false;
  return CATEGORIES.every((category) => {
    const group = items.filter((item) => item.category === category);
    return group.length <= 10
      && new Set(group.map((item) => item.external_id)).size === group.length
      && group.every((item, position) => item.position === position && Number.isInteger(item.external_id) && item.external_id > 0 && item.title.trim().length > 0);
  });
}

export async function saveProfileHighlights(items: ProfileHighlight[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };
  if (!valid(items)) return { error: 'La selección de favoritos destacados no es válida.' };

  let characterIds = new Map<ProfileHighlight, string>();
  try {
    const characterItems = items.filter((item) => item.category === 'character');
    characterIds = new Map(await Promise.all(characterItems.map(async (item) => [item, await resolveFavoriteCharacter(item)] as const)));
  } catch (error) {
    console.error('Could not resolve favorite character identities:', error);
    return { error: 'No se pudieron guardar los personajes. Verificá que la migración de identidades esté aplicada.' };
  }

  const payload = items.map((item) => ({
      category: item.category,
      external_id: item.external_id,
      title: item.title.trim(),
      subtitle: item.subtitle?.trim() || null,
      image_url: item.image_url || null,
      position: item.position,
      provider: item.provider ?? 'anilist',
      character_id: characterIds.get(item) ?? null,
  }));
  const { error } = await supabase.rpc('save_profile_highlights_v3', { payload });
  if (error) return { error: error.message };

  revalidatePath('/profile');
  revalidatePath('/profile/highlights');
  return { success: true };
}
