import "server-only";
import { getAuthenticatedUser } from "@/services/supabase";
import { getFavoriteMalIds } from "@/services/favorites";
import { getHomePublicSchedule } from "@/services/home-public-schedule";
import { providerRead } from "@/services/provider-request";
import { parsePersonalNextAirings, type PersonalNextAiring } from "@/lib/home-airing";

export async function getHomePersonalSchedule() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Sesión no disponible");
  const ids = [...new Set((await getFavoriteMalIds(user.id)).filter((id) => Number.isSafeInteger(id) && id > 0))];
  if (!ids.length) return { empty: true, schedule: null, next: [] as PersonalNextAiring[], nextUnavailable: false };

  const schedulePromise = getHomePublicSchedule().catch(() => null);
  const next: PersonalNextAiring[] = [];
  let nextUnavailable = false;
  // AniList receives bounded batches, never a request per card.
  for (let offset = 0; offset < ids.length; offset += 40) {
    const batch = ids.slice(offset, offset + 40);
    const fields = batch.map((id, index) => `m${index}: Page(perPage: 1) { media(idMal: ${id}, type: ANIME, isAdult: false) { idMal season seasonYear title { english romaji } coverImage { medium } nextAiringEpisode { airingAt episode } } }`).join("\n");
    try {
      const result = await providerRead<unknown>("anilist", "home-personal-airing", "https://graphql.anilist.co", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: `query { ${fields} }` }), cache: "no-store",
      });
      next.push(...parsePersonalNextAirings(result, batch));
    } catch {
      nextUnavailable = true;
      break;
    }
  }
  const schedule = await schedulePromise;
  const favoriteIds = new Set(ids);
  return { empty: false, schedule: schedule && { ...schedule, events: schedule.events.filter((event) => event.malId !== null && favoriteIds.has(event.malId)) }, next, nextUnavailable };
}
