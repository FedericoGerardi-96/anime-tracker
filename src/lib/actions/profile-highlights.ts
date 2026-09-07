'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ProfileHighlight, ProfileHighlightCategory } from '@/types/profile-highlights';

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

  const payload = items.map((item) => ({
      category: item.category,
      external_id: item.external_id,
      title: item.title.trim(),
      subtitle: item.subtitle?.trim() || null,
      image_url: item.image_url || null,
      position: item.position,
  }));
  const { error } = await supabase.rpc('save_profile_highlights', { payload });
  if (error) return { error: error.message };

  revalidatePath('/profile');
  revalidatePath('/profile/highlights');
  return { success: true };
}
