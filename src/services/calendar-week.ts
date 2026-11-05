import 'server-only';
import type { CalendarEvent } from '@/lib/calendar-week';
import { shiftDay } from '@/lib/calendar-week';
import { parsePublicHomeAirings } from '@/lib/home-airing';
import { providerRead } from '@/services/provider-request';
import { getMalWeeklySchedule } from '@/lib/myanimelist-service';

export async function aniWeek(week: string): Promise<CalendarEvent[]> {
  // Pad for the earliest/latest IANA offsets. The caller filters the exact local week.
  const start = Date.parse(shiftDay(week, -1) + 'T00:00Z') / 1000;
  const end = start + 9 * 86400;
  const events: CalendarEvent[] = [];
  const batchSize = 3;
  for (let first = 1; first <= 18; first += batchSize) {
    const fields = Array.from(
      { length: batchSize },
      (_, i) =>
        'p' +
        (i + 1) +
        ': Page(page:' +
        (first + i) +
        ',perPage:50){pageInfo{hasNextPage} airingSchedules(airingAt_greater:$start,airingAt_lesser:$end,sort:TIME){id airingAt episode media{idMal isAdult title{english romaji native} synonyms coverImage{medium}}}}',
    ).join(' ');
    const result = await providerRead<unknown>('anilist', 'calendar-week', 'https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 1800 },
      body: JSON.stringify({
        query: 'query($start:Int!,$end:Int!){' + fields + '}',
        variables: { start, end },
      }),
    });
    const batch = parsePublicHomeAirings(result, batchSize);
    events.push(
      ...batch.events.map((e) => ({
        key: 'ani-' + e.id,
        aliases: e.aliases,
        malId: e.malId,
        title: e.title,
        cover: e.coverImage,
        at: e.airingAt * 1000,
        episode: e.episode,
        source: 'AniList' as const,
      })),
    );
    if (!batch.incomplete) return events;
  }
  throw new Error('Respuesta semanal incompleta');
}
export async function malWeek(
  week: string,
  period: Parameters<typeof getMalWeeklySchedule>[0],
): Promise<CalendarEvent[]> {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const schedule = await getMalWeeklySchedule(period);
  const events: CalendarEvent[] = [];
  for (let i = -1; i <= 7; i++) {
    const date = shiftDay(week, i);
    for (const a of schedule[days[new Date(date + 'T12:00Z').getUTCDay()]] ?? []) {
      if (!a.airing || !a.broadcast?.time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(a.broadcast.time))
        continue;
      events.push({
        key: 'mal-' + a.mal_id + '-' + date,
        malId: a.mal_id,
        title: a.title_english || a.title,
        aliases: [a.title, a.title_english, a.title_japanese, ...(a.title_synonyms ?? [])].filter((t): t is string => Boolean(t)),
        cover: a.images.webp.small_image_url,
        at: Date.parse(date + 'T' + a.broadcast.time + ':00+09:00'),
        episode: null,
        source: 'MAL',
      });
    }
  }
  return events;
}
type MazeShow = {
  id?: number;
  type?: string;
  language?: string;
  name?: string;
  image?: { medium?: string };
  externals?: { imdb?: string };
  url?: string;
};
type MazeEpisode = {
  id?: number;
  number?: number;
  airstamp?: string;
  show?: MazeShow;
  _embedded?: { show?: MazeShow };
};
async function mazeDay(date: string, web: boolean): Promise<CalendarEvent[]> {
  const url = web
    ? 'https://api.tvmaze.com/schedule/web?date=' + date
    : 'https://api.tvmaze.com/schedule?country=JP&date=' + date;
  const response = await fetch(url, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('TVmaze ' + response.status);
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) throw new Error('Respuesta de TVmaze inválida');
  return rows.flatMap((row: MazeEpisode | null) => {
    const show = row?.show ?? row?._embedded?.show;
    if (
      !row ||
      !Number.isSafeInteger(row.id) ||
      !show ||
      show.type !== 'Animation' ||
      show.language !== 'Japanese' ||
      typeof show.name !== 'string' ||
      !row.airstamp
    )
      return [];
    const at = Date.parse(row.airstamp);
    if (!Number.isFinite(at)) return [];
    const imdbId =
      typeof show.externals?.imdb === 'string' && /^tt\d+$/.test(show.externals.imdb)
        ? show.externals.imdb
        : undefined;
    return [
      {
        key: 'maze-' + row.id,
        malId: null,
        title: show.name,
        cover: show.image?.medium?.startsWith('https://static.tvmaze.com/') ? show.image.medium : null,
        at,
        episode: Number.isInteger(row.number) ? (row.number ?? null) : null,
        source: 'TVmaze' as const,
        imdbId,
      },
    ];
  });
}
export async function mazeWeek(week: string) {
  const events: CalendarEvent[] = [];
  let partial = false;
  for (let i = -1; i <= 7; i++) {
    const day = shiftDay(week, i);
    const results = await Promise.allSettled([mazeDay(day, false), mazeDay(day, true)]);
    for (const r of results)
      if (r.status === 'fulfilled') events.push(...r.value);
      else partial = true;
    if (results.every((r) => r.status === 'rejected')) break;
  }
  return { events, partial };
}
