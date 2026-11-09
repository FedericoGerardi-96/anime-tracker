import { cache } from 'react';
import { getCalendarMappings } from '@/services/calendar-mappings';
import { resolveCalendarIdentities } from '@/lib/calendar-week';
import { cookies } from 'next/headers';
import { getAuthenticatedUser, getSupabaseServer } from '@/services/supabase';
import { getSeasonAnime } from '@/services/season-schedule';
import { aniWeek, malWeek, mazeWeek } from '@/services/calendar-week';
import {
  localDay,
  monday,
  mergeCalendar,
  validZone,
  validDay,
  type CalendarLibrary,
} from '@/lib/calendar-week';
import { resolveSchedulePeriod, scheduleYears, SCHEDULE_SEASONS } from '@/lib/schedule-filters';
import { readAllPages } from '@/lib/read-all-pages';
import { getCalendarNext } from '@/services/calendar-next';
import ScheduleCalendar from './ScheduleCalendar';
import SeasonCards from './ScheduleSeasonCards';

const requestTime = cache(() => Date.now());

async function readLibrary(userId: string): Promise<CalendarLibrary[]> {
  const db = await getSupabaseServer();
  const [favorites, progress] = await Promise.all([
    readAllPages((from, to) =>
      db
        .from('favorites')
        .select('id, media!inner(id,mal_id,type)')
        .eq('user_id', userId)
        .eq('media.type', 'anime')
        .order('id')
        .range(from, to),
    ),
    readAllPages((from, to) =>
      db
        .from('user_media_progress')
        .select('id,media_id,status,current_episode')
        .eq('user_id', userId)
        .order('id')
        .range(from, to),
    ),
  ]);
  const states = new Map(progress.map((p) => [p.media_id, p]));
  return favorites.flatMap((f) => {
    const media = Array.isArray(f.media) ? f.media[0] : f.media;
    if (!media) return [];
    const state = states.get(media.id);
    return [
      {
        id: media.id,
        malId: Number(media.mal_id),
        status: state?.status ?? 'plan_to_watch',
        progress: state?.current_episode ?? 0,
      },
    ];
  });
}
export default async function ScheduleContent({
  params,
}: {
  params: Record<string, string | string[] | undefined>;
}) {
  const [user, jar] = await Promise.all([getAuthenticatedUser(), cookies()]);
  const preferred = user?.user_metadata.calendar_timezone ?? jar.get('calendar-zone')?.value;
  const detected = jar.get('calendar-device-zone')?.value;
  const zone = validZone(preferred) ? preferred : validZone(detected) ? detected : 'UTC';
  const now = requestTime();
  const today = localDay(now, zone);
  const current = {
    year: Number(today.slice(0, 4)),
    season: SCHEDULE_SEASONS[Math.floor((Number(today.slice(5, 7)) - 1) / 3)].value,
  };
  const years = scheduleYears(current.year);
  const { year, season } = resolveSchedulePeriod(
    typeof params.year === 'string' ? params.year : undefined,
    typeof params.season === 'string' ? params.season : undefined,
    years,
    current,
  );
  const currentSeason = year === current.year && season === current.season;
  const start =
    year +
    '-' +
    String(SCHEDULE_SEASONS.findIndex((s) => s.value === season) * 3 + 1).padStart(2, '0') +
    '-01';
  const week = monday(validDay(params.week) ? params.week : currentSeason ? today : start);
  const seasonal = params.view === 'season';
  const followed = Boolean(user) && params.mode !== 'all';
  const warnings: string[] = [];
  const safely = async <T,>(name: string, work: Promise<T>, fallback: T) => {
    try {
      return await work;
    } catch {
      warnings.push(name);
      return fallback;
    }
  };
  const libraryPromise = user ? safely('Biblioteca', readLibrary(user.id), []) : Promise.resolve([]);
  const upcomingPromise = libraryPromise.then((library) => {
    if (followed && warnings.includes('Biblioteca')) return { events: [], unavailable: true };
    const ids = followed
      ? library.filter((item) => ['watching', 'plan_to_watch', 'on_hold'].includes(item.status)).map((item) => item.malId)
      : null;
    return getCalendarNext(now, ids).catch(() => ({ events: [], unavailable: true }));
  });
  const [library, anime, ani, mal, maze, upcoming] = await Promise.all([
    libraryPromise,
    seasonal ? safely('Catálogo de temporada', getSeasonAnime(year, season), []) : [],
    seasonal ? [] : safely('AniList', aniWeek(week), []),
    !seasonal && currentSeason && week === monday(today)
      ? safely('MAL', malWeek(week, { year, season }), [])
      : [],
    !seasonal && currentSeason
      ? safely('TVmaze', mazeWeek(week), { events: [], partial: true })
      : { events: [], partial: false },
    upcomingPromise,
  ]);
  if (maze.partial && !warnings.includes('TVmaze')) warnings.push('TVmaze');
  const mappings = maze.events.length ? await getCalendarMappings().catch(() => null) : null;
  const mazeEvents = resolveCalendarIdentities(ani, maze.events, mappings?.byImdb ?? {});
  const events = mergeCalendar([ani, mazeEvents, mal], week, zone);
  const following = library.filter((item) =>
    ['watching', 'plan_to_watch', 'on_hold'].includes(item.status),
  );
  const titles = followed
    ? anime.filter((a) => following.some((item) => item.malId === a.mal_id))
    : anime;
  return (
    <ScheduleCalendar
      {...{
        week,
        year,
        season,
        years,
        zone,
        now,
        events,
        nextEvents: upcoming.events,
        nextUnavailable: upcoming.unavailable,
        followed,
        seasonal,
        library,
        warnings,
      }}
      signedIn={Boolean(user)}
      automatic={!validZone(preferred)}
    >
      {seasonal && (
        <SeasonCards
          seasonAnime={titles}
          favoriteMalIds={library.map((i) => i.malId)}
          userId={user?.id}
        />
      )}
    </ScheduleCalendar>
  );
}
