import { getMalWeeklySchedule } from '@/lib/myanimelist-service';
import { getFavoriteMalIds } from '@/lib/actions/media';
import { getAuthenticatedUser, getSupabaseServer } from '@/services/supabase';
import { getSeasonAnime } from '@/services/season-schedule';
import { currentSchedulePeriod, resolveSchedulePeriod, scheduleYears } from '@/lib/schedule-filters';
import ScheduleCalendar from './ScheduleCalendar';

export default async function ScheduleContent({ params = {} }: { params?: Record<string, string | string[] | undefined> }) {
  const user = await getAuthenticatedUser();
  const favoriteMalIds = await getFavoriteMalIds();
  const favoriteYears: Array<number | null> = [];
  if (user) {
    const supabase = await getSupabaseServer();
    let offset = 0;
    while (true) {
      const { data, error } = await supabase.from('favorites').select('id, media!inner(year,type)').eq('user_id', user.id).eq('media.type', 'anime').order('id').range(offset, offset + 999);
      if (error) throw new Error('No se pudieron cargar los años de tus favoritos');
      for (const row of data ?? []) {
        const media = Array.isArray(row.media) ? row.media[0] : row.media;
        if (media) favoriteYears.push(media.year);
      }
      if (!data || data.length < 1000) break;
      offset += 1000;
    }
  }
  const followed = params.mode === 'followed' && !!user;
  const current = currentSchedulePeriod();
  const years = scheduleYears(current.year, followed ? favoriteYears : undefined);
  const { year, season } = resolveSchedulePeriod(typeof params.year === 'string' ? params.year : undefined, typeof params.season === 'string' ? params.season : undefined, years, current);
  const isCurrent = year === current.year && season === current.season;
  const [seasonAnime, weeklySchedules] = years.length ? await Promise.all([
    getSeasonAnime(year, season),
    isCurrent ? getMalWeeklySchedule({ year, season }).catch(() => null) : Promise.resolve(null),
  ]) : [[], null];
  return <ScheduleCalendar weeklySchedules={weeklySchedules ?? {}} seasonAnime={seasonAnime}
    favoriteMalIds={favoriteMalIds ?? []} userId={user?.id} year={year} season={season}
    years={years} filterMode={followed ? 'followed' : 'all'} hasWeeklySchedule={!!weeklySchedules} />;
}
