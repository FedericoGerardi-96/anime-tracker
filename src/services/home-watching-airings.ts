import "server-only";
import { cache } from "react";
import { slugify } from "@/lib/utils";
import { parseHomeAiringResponse, type HomeAiringTime } from "@/lib/home-airing";
import { providerRead } from "@/services/provider-request";
import { getHomeWatching } from "@/services/home-watching";

// Both home sections reuse one request-scoped lookup for the same three titles.
export const getHomeWatchingAirings = cache(async (): Promise<{ events: HomeAiringTime[]; unavailable: boolean }> => {
  const { signedIn, items, error } = await getHomeWatching();
  if (error) return { events: [], unavailable: true };
  if (!signedIn || !items.length) return { events: [], unavailable: false };
  try {
    const fields = items.map((item, index) => `m${index}: Page(perPage: 1) { media(idMal: ${item.media.mal_id}, type: ANIME) { nextAiringEpisode { airingAt episode } } }`).join("\n");
    const result = await providerRead<unknown>("anilist", "home-airing", "https://graphql.anilist.co", {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: `query { ${fields} }` }), cache: "no-store",
    });
    return { events: parseHomeAiringResponse(result, items.map((item) => ({ id: item.media.mal_id, title: item.media.title, href: `/anime/${item.media.mal_id}-${slugify(item.media.title)}` }))), unavailable: false };
  } catch {
    return { events: [], unavailable: true };
  }
});
