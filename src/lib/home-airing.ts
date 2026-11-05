export interface HomeAiringTime {
  id: number;
  title: string;
  href: string;
  episode: number;
  airingAt: number;
}

export interface PublicHomeAiring {
  aliases?: string[];
  id: number;
  malId: number | null;
  title: string;
  episode: number;
  airingAt: number;
  coverImage: string | null;
}

function parseCoverImage(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("medium" in value) || typeof value.medium !== "string") return null;
  try {
    const url = new URL(value.medium);
    return url.protocol === "https:" && url.hostname === "s4.anilist.co" && !url.username && !url.password && !url.port ? url.href : null;
  } catch {
    return null;
  }
}

export function parsePublicHomeAirings(result: unknown, pageCount: number): { events: PublicHomeAiring[]; incomplete: boolean } {
  if (!result || typeof result !== "object" || !("data" in result) || !result.data || typeof result.data !== "object") throw new Error("Respuesta de horarios inválida");
  const data = result.data as Record<string, unknown>;
  const events: PublicHomeAiring[] = [];
  let incomplete = false;
  for (let index = 1; index <= pageCount; index++) {
    const page = data[`p${index}`];
    if (!page || typeof page !== "object" || !("pageInfo" in page) || !page.pageInfo || typeof page.pageInfo !== "object" || !("hasNextPage" in page.pageInfo) || typeof page.pageInfo.hasNextPage !== "boolean" || !("airingSchedules" in page) || !Array.isArray(page.airingSchedules)) throw new Error("Respuesta de horarios inválida");
    incomplete = page.pageInfo.hasNextPage;
    for (const entry of page.airingSchedules as unknown[]) {
      if (!entry || typeof entry !== "object" || !("id" in entry) || !("airingAt" in entry) || !("episode" in entry) || !("media" in entry)) throw new Error("Horario inválido");
      if (typeof entry.id !== "number" || !Number.isSafeInteger(entry.id) || entry.id <= 0 || typeof entry.airingAt !== "number" || !Number.isSafeInteger(entry.airingAt) || entry.airingAt <= 0 || entry.airingAt > 8_640_000_000_000 || typeof entry.episode !== "number" || !Number.isSafeInteger(entry.episode) || entry.episode < 1) throw new Error("Horario inválido");
      const media = entry.media;
      if (!media || typeof media !== "object" || !("isAdult" in media) || media.isAdult !== false || !("title" in media) || !media.title || typeof media.title !== "object") continue;
      const title = media.title as { english?: unknown; romaji?: unknown };
      const name = [title.english, title.romaji].find((value): value is string => typeof value === "string" && Boolean(value.trim()));
      if (!name) continue;
      const malId = "idMal" in media && typeof media.idMal === "number" && Number.isSafeInteger(media.idMal) && media.idMal > 0 ? media.idMal : null;
      const aliases = 'synonyms' in media && Array.isArray(media.synonyms)
        ? [...Object.values(media.title), ...media.synonyms].filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
        : undefined;
      events.push({ ...(aliases ? { aliases } : {}), id: entry.id, airingAt: entry.airingAt, episode: entry.episode, malId, title: name.trim(), coverImage: parseCoverImage("coverImage" in media ? media.coverImage : null) });
    }
  }
  return { events, incomplete };
}

export function selectTodayHomeAirings(events: ReadonlyArray<PublicHomeAiring>, nowMs: number): { before: PublicHomeAiring[]; after: PublicHomeAiring[] } {
  const start = new Date(nowMs);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const today = events.filter((event) => event.airingAt * 1000 >= start.getTime() && event.airingAt * 1000 < end.getTime()).sort((a, b) => a.airingAt - b.airingAt || a.id - b.id);
  return { before: today.filter((event) => event.airingAt * 1000 <= nowMs).slice(-2), after: today.filter((event) => event.airingAt * 1000 > nowMs).slice(0, 2) };
}

export function parseHomeAiringResponse(result: unknown, items: ReadonlyArray<{ id: number; title: string; href: string }>): HomeAiringTime[] {
  if (!result || typeof result !== "object" || !("data" in result) || !result.data || typeof result.data !== "object") throw new Error("Respuesta de horarios inválida");
  const data = result.data as Record<string, unknown>;
  return items.flatMap((item, index) => {
    const page = data[`m${index}`];
    if (!page || typeof page !== "object" || !("media" in page) || !Array.isArray(page.media)) throw new Error("Respuesta de horarios inválida");
    if (page.media.length === 0) return [];
    const media: unknown = page.media[0];
    if (!media || typeof media !== "object" || !("nextAiringEpisode" in media)) throw new Error("Respuesta de horarios inválida");
    const airing = media.nextAiringEpisode;
    if (airing === null) return [];
    if (!airing || typeof airing !== "object" || !("airingAt" in airing) || !("episode" in airing) || typeof airing.airingAt !== "number" || !Number.isSafeInteger(airing.airingAt) || airing.airingAt <= 0 || airing.airingAt > 8_640_000_000_000 || typeof airing.episode !== "number" || !Number.isSafeInteger(airing.episode) || airing.episode < 1) throw new Error("Horario inválido");
    return [{ ...item, episode: airing.episode, airingAt: airing.airingAt }];
  });
}

export function upcomingHomeAirings(events: ReadonlyArray<HomeAiringTime>, nowMs: number): HomeAiringTime[] {
  return events.filter((event) => event.airingAt * 1000 > nowMs).sort((a, b) => a.airingAt - b.airingAt);
}

export function formatHomeAiringTime(airingAt: number, timeZone?: string): string {
  return new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(airingAt * 1000);
}

export interface PersonalNextAiring extends Omit<HomeAiringTime, "href"> {
  season: string | null;
  seasonYear: number | null;
  coverImage: string | null;
}

export function parsePersonalNextAirings(result: unknown, ids: ReadonlyArray<number>): PersonalNextAiring[] {
  if (!result || typeof result !== "object" || !("data" in result) || !result.data || typeof result.data !== "object") throw new Error("Respuesta de horarios inválida");
  const data = result.data as Record<string, unknown>;
  return ids.flatMap((id, index) => {
    const page = data[`m${index}`];
    if (!page || typeof page !== "object" || !("media" in page) || !Array.isArray(page.media)) throw new Error("Respuesta de horarios inválida");
    if (!page.media.length) return [];
    const media: unknown = page.media[0];
    if (!media || typeof media !== "object" || !("nextAiringEpisode" in media) || !("title" in media) || !media.title || typeof media.title !== "object" || !("season" in media) || !("seasonYear" in media)) throw new Error("Respuesta de horarios inválida");
    if (media.nextAiringEpisode === null) return [];
    const title = media.title as { english?: unknown; romaji?: unknown };
    const name = [title.english, title.romaji].find((value): value is string => typeof value === "string" && Boolean(value.trim()));
    const airing = media.nextAiringEpisode;
    if (!name || !airing || typeof airing !== "object" || !("airingAt" in airing) || !("episode" in airing) || typeof airing.airingAt !== "number" || !Number.isSafeInteger(airing.airingAt) || airing.airingAt <= 0 || airing.airingAt > 8_640_000_000_000 || typeof airing.episode !== "number" || !Number.isSafeInteger(airing.episode) || airing.episode < 1) throw new Error("Horario inválido");
    return [{ id, title: name.trim(), airingAt: airing.airingAt, episode: airing.episode, season: typeof media.season === "string" ? media.season : null, seasonYear: typeof media.seasonYear === "number" ? media.seasonYear : null, coverImage: parseCoverImage("coverImage" in media ? media.coverImage : null) }];
  });
}

export function selectPersonalHomeSchedule(todayEvents: ReadonlyArray<PublicHomeAiring>, nextEvents: ReadonlyArray<PersonalNextAiring>, nowMs: number) {
  const now = new Date(nowMs);
  const start = new Date(nowMs);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const today = todayEvents.filter((event) => event.airingAt * 1000 >= start.getTime() && event.airingAt * 1000 < end.getTime()).sort((a, b) => a.airingAt - b.airingAt || a.id - b.id);
  const season = ["WINTER", "SPRING", "SUMMER", "FALL"][Math.floor(now.getMonth() / 3)];
  const next = nextEvents.filter((event) => event.season === season && event.seasonYear === now.getFullYear() && event.airingAt * 1000 > nowMs).sort((a, b) => a.airingAt - b.airingAt)[0] ?? null;
  return { today, next, start: start.getTime(), end: end.getTime() };
}

