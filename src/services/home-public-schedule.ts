import "server-only";
import { parsePublicHomeAirings } from "@/lib/home-airing";
import { providerRead } from "@/services/provider-request";

const PAGE_COUNT = 4;

export async function getHomePublicSchedule() {
  const now = Math.floor(Date.now() / 60_000) * 60;
  const start = now - 27 * 60 * 60;
  const end = now + 27 * 60 * 60;
  const pages = Array.from({ length: PAGE_COUNT }, (_, index) => `p${index + 1}: Page(page: ${index + 1}, perPage: 50) { pageInfo { hasNextPage } airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) { id airingAt episode media { idMal isAdult title { english romaji } coverImage { medium } } } }`).join("\n");
  const result = await providerRead<unknown>("anilist", "home-public-airing", "https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: `query ($start: Int!, $end: Int!) { ${pages} }`, variables: { start, end } }),
    next: { revalidate: 60 },
  });
  return { ...parsePublicHomeAirings(result, PAGE_COUNT), start, end };
}
