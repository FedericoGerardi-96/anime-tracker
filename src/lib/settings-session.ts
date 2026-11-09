import 'server-only';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/services/supabase';

export async function requireSettingsUser() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');
  return user;
}
