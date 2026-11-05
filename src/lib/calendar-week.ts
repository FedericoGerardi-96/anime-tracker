export type CalendarEvent = {
  key: string;
  malId: number | null;
  title: string;
  aliases?: string[];
  cover: string | null;
  at: number;
  episode: number | null;
  source: 'AniList' | 'MAL' | 'TVmaze';
  imdbId?: string;
  matchedById?: boolean;
};
export type CalendarLibrary = { id: string; malId: number; status: string; progress: number };
export function validZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > 100) return false;
  try {
    new Intl.DateTimeFormat('es', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
export function localDay(ms: number, zone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ms);
}
export function shiftDay(day: string, count: number) {
  return new Date(Date.parse(day + 'T12:00:00Z') + count * 86400000).toISOString().slice(0, 10);
}
export function monday(day: string) {
  return shiftDay(day, -((new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7));
}
export function validDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = Date.parse(value + 'T12:00:00Z');
  return Number.isFinite(ms) && new Date(ms).toISOString().startsWith(value);
}
// IMDb IDs can cover several seasons. Resolve against actual airings, not the first MAL ID.
export function resolveCalendarIdentities(
  ani: CalendarEvent[],
  maze: CalendarEvent[],
  byImdb: Record<string, number[]>,
) {
  return maze.map((event) => {
    const ids = event.imdbId && byImdb[event.imdbId];
    if (!ids) return event;
    const candidates = ani.filter(
      (other) =>
        other.malId &&
        ids.includes(other.malId) &&
        (Math.abs(other.at - event.at) <= 5 * 60000 ||
          (other.episode === event.episode && Math.abs(other.at - event.at) < 36 * 3600000)),
    );
    if (candidates.length !== 1) return event;
    return { ...event, malId: candidates[0].malId, matchedById: true };
  });
}
export function mergeCalendar(sources: CalendarEvent[][], week: string, zone: string) {
  const end = shiftDay(week, 7);
  const events: CalendarEvent[] = [];
  // TVmaze often names the whole show; AniList may name a specific cour or remake.
  // Only use this looser identity across sources at nearly the same airtime.
  const seriesName = (name: string) =>
    normalize(
      name.replace(/\(\d{4}\)|\b(?:season|cour)\s*\d+\b|\b\d+(?:st|nd|rd|th)\s+(?:season|cour)\b/gi, ''),
    );
  const normalize = (name: string) =>
    name
      .normalize('NFKC')
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, '');
  // MAL sometimes supplies the English alias that connects two earlier AniList/TVmaze rows.
  const aliasesByMal = new Map<number, Set<string>>();
  const items = sources.flat();
  for (const item of items) {
    if (!item.malId) continue;
    const aliases = aliasesByMal.get(item.malId) ?? new Set<string>();
    for (const title of [item.title, ...(item.aliases ?? [])]) aliases.add(title);
    aliasesByMal.set(item.malId, aliases);
  }
  for (const item of items) {
    const day = localDay(item.at, zone);
    if (day < week || day >= end) continue;
    const candidates = events.filter((other) => {
      if (other.key === item.key) return true;
      const identified = other.malId && item.malId;
      if (identified && other.malId !== item.malId) return false;
      if (!identified) {
        const names = new Set([item.title, ...(item.aliases ?? [])].map(normalize));
        const titles = other.malId
          ? [...(aliasesByMal.get(other.malId) ?? [])]
          : [other.title, ...(other.aliases ?? [])];
        if (!titles.some((name) => names.has(normalize(name)))) {
          if (other.source === item.source || Math.abs(item.at - other.at) > 5 * 60000) return false;
          const series = new Set([item.title, ...(item.aliases ?? [])].map(seriesName).filter(Boolean));
          if (!titles.some((name) => series.has(seriesName(name)))) return false;
        }
      }
      if (item.source === 'MAL' || other.source === 'MAL')
        return Boolean(identified) || Math.abs(item.at - other.at) < 24 * 3600000;
      if (
        identified &&
        item.matchedById &&
        other.source === 'AniList' &&
        Math.abs(item.at - other.at) <= 5 * 60000
      )
        return true;
      return item.episode === other.episode && Math.abs(item.at - other.at) < 36 * 3600000;
    });
    const match =
      candidates.find((e) => e.key === item.key) ??
      (candidates.length === 1 ||
      (item.source === 'MAL' && candidates.every((e) => e.malId === item.malId))
        ? candidates[0]
        : undefined);
    if (match) {
      match.imdbId ??= item.imdbId;
      match.malId ??= item.malId;
      match.cover ??= item.cover;
      continue;
    }
    events.push({ ...item });
  }
  return events.sort((a, b) => a.at - b.at || a.title.localeCompare(b.title));
}
