'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function saveAdultSearchPreference(includeAdult: unknown) {
  if (typeof includeAdult !== 'boolean') return { error: 'Elegí si querés incluir contenido +18.' };

  const supabase = await createClient();
  const { data: { user }, error: sessionError } = await supabase.auth.getUser();
  if (sessionError || !user) return { error: 'Iniciá sesión para guardar esta preferencia.' };

  const { data, error } = await supabase.auth.updateUser({ data: { search_include_adult: includeAdult } });
  if (error || data.user?.user_metadata.search_include_adult !== includeAdult) {
    return { error: 'No pudimos guardar la preferencia. Intentá nuevamente.' };
  }

  revalidatePath('/settings/privacy');
  return { success: true, includeAdult };
}
