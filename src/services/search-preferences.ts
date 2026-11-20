import 'server-only';
import { getAuthenticatedUser } from '@/services/supabase';

export async function getAdultSearchEnabled(): Promise<boolean> {
  const user = await getAuthenticatedUser();
  return user?.user_metadata.search_include_adult !== false;
}
