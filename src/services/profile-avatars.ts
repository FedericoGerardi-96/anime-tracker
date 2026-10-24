import 'server-only';

import { getSupabaseServer } from '@/services/supabase';
import { normalizeProfileAvatar } from '@/lib/profile-avatar';
import type { ProfileAvatarOption } from '@/interfaces/profile-avatar';

export async function getProfileAvatarOptions(): Promise<ProfileAvatarOption[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('profile_avatars')
    .select('id, collection_title, name, image_url, sort_order')
    .eq('active', true)
    .order('collection_title')
    .order('sort_order')
    .order('name');

  if (error) {
    if (error.code !== 'PGRST205' && error.code !== '42P01') console.error('Error fetching profile avatar catalog:', error);
    return [];
  }

  return (data as ProfileAvatarOption[]).flatMap((option) => {
    const imageUrl = normalizeProfileAvatar(option.image_url);
    return imageUrl ? [{ ...option, image_url: imageUrl }] : [];
  });
}
