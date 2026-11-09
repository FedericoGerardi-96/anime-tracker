import 'server-only';
import type { CalendarEvent } from '@/lib/calendar-week';
import { parsePublicHomeAirings } from '@/lib/home-airing';
import { providerRead } from '@/services/provider-request';
import { getPersonalNextAirings } from '@/services/home-personal-schedule';

// null means public schedule; an empty array means an empty personal library.
// Deliberately accepts no browsed year, season or week.
export async function getCalendarNext(now: number, libraryIds: ReadonlyArray<number> | null) {
  if (libraryIds !== null) {
    const { next, nextUnavailable } = await getPersonalNextAirings(libraryIds);
    return {
      events: next.map((event): CalendarEvent => ({
        key: `next-${event.id}-${event.episode}`,
        malId: event.id,
        title: event.title,
        cover: event.coverImage,
        at: event.airingAt * 1000,
        episode: event.episode,
        source: 'AniList',
      })),
      unavailable: nextUnavailable,
    };
  }

  // Future events sorted by time, without a season or upper date bound.
  // Minute buckets allow public caching while the client excludes elapsed events.
  const start = Math.floor(now / 60_000) * 60;
  const pageCount = 4;
  const pages = Array.from({ length: pageCount }, (_, i) =>
    `p${i + 1}: Page(page: ${i + 1}, perPage: 50) { pageInfo { hasNextPage } airingSchedules(airingAt_greater: $start, sort: TIME) { id airingAt episode media { idMal isAdult title { english romaji } coverImage { medium } } } }`,
  ).join('\n');
  const response = await providerRead<unknown>('anilist', 'calendar-next', 'https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: `query ($start: Int!) { ${pages} }`, variables: { start } }),
    next: { revalidate: 60 },
  });
  const result = parsePublicHomeAirings(response, pageCount);
  return {
    events: result.events.map((event): CalendarEvent => ({
      key: `ani-${event.id}`,
      malId: event.malId,
      title: event.title,
      cover: event.coverImage,
      at: event.airingAt * 1000,
      episode: event.episode,
      source: 'AniList',
    })),
    // Later pages cannot precede a returned future event because the query sorts by time.
    unavailable: result.incomplete && !result.events.some((event) => event.airingAt * 1000 > now),
  };
}
