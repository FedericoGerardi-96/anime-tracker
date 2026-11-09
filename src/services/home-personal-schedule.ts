import "server-only";
import { getAuthenticatedUser } from "@/services/supabase";
import { getFavoriteMalIds } from "@/services/favorites";
import { getHomePublicSchedule } from "@/services/home-public-schedule";
import { providerRead } from "@/services/provider-request";
import { parsePersonalNextAirings, type PersonalNextAiring } from "@/lib/home-airing";

// The current selection costs 13 complexity points per alias. AniList caps a query
// at 500; 25 titles cost 325 and leave room for future fields (40 cost 520).
const PERSONAL_AIRING_BATCH_SIZE = 25;

export async function getHomePersonalSchedule() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Sesión no disponible");
  const ids = [...new Set((await getFavoriteMalIds(user.id)).filter((id) => Number.isSafeInteger(id) && id > 0))];
  if (!ids.length) return { empty: true, schedule: null, next: [] as PersonalNextAiring[], nextUnavailable: false };

  const schedulePromise = getHomePublicSchedule().catch(() => null);
  const { next, nextUnavailable } = await getPersonalNextAirings(ids);
  const schedule = await schedulePromise;
  const favoriteIds = new Set(ids);
  return { empty: false, schedule: schedule && { ...schedule, events: schedule.events.filter((event) => event.malId !== null && favoriteIds.has(event.malId)) }, next, nextUnavailable };
}

// IDs must come from the authenticated user's library. Never cache this across users.
export async function getPersonalNextAirings(libraryIds: ReadonlyArray<number>) {
  const ids = [...new Set(libraryIds.filter((id) => Number.isSafeInteger(id) && id > 0))];
  const next: PersonalNextAiring[] = [];
  let nextUnavailable = false;
  // AniList receives bounded batches, never a request per card.
  for (let offset = 0; offset < ids.length; offset += PERSONAL_AIRING_BATCH_SIZE) {
    const batch = ids.slice(offset, offset + PERSONAL_AIRING_BATCH_SIZE);
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
  return { next, nextUnavailable };
}
