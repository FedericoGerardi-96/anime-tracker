'use server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/services/supabase';
import { validZone } from '@/lib/calendar-week';
export async function saveCalendarZone(zone: string) {
  if (zone !== 'auto' && !validZone(zone)) return { error: 'Elegí una zona horaria válida.' };
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { error } = await supabase.auth.updateUser({ data: { calendar_timezone: zone } });
    if (error) return { error: 'No pudimos guardar la zona horaria.' };
  }
  (await cookies()).set('calendar-zone', zone, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  return { error: null };
}
