'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function selectProfileAvatar(avatarId: string) {
  if (avatarId !== 'default' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(avatarId)) {
    return { error: 'Elegí una imagen del catálogo.' };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Iniciá sesión para cambiar tu imagen.' };

  const { error } = await supabase.rpc('set_my_profile_avatar', {
    avatar_id: avatarId === 'default' ? null : avatarId,
  });
  if (error) {
    console.error('Error updating profile avatar:', error);
    if (error.code === 'PGRST202' || error.code === '42883') return { error: 'El catálogo de avatares aún no está configurado en Supabase.' };
    return { error: 'No pudimos guardar la imagen. Probá de nuevo.' };
  }

  revalidatePath('/profile');
  revalidatePath('/friends');
  return { success: true };
}
