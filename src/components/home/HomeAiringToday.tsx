import AiringToday from "@/components/anime/AiringToday";
import { getFavoriteMalIds } from "@/lib/actions/media";
import { getHomeToday } from "@/services/home";
import HomeSectionUnavailable from "./HomeSectionUnavailable";

export default async function HomeAiringToday() {
  const [today, favoriteMalIds] = await Promise.all([
    getHomeToday(),
    getFavoriteMalIds(),
  ]);
  if (today.unavailable) return <HomeSectionUnavailable title="En emisión hoy" />;
  return <AiringToday todayAnime={today.data} favoriteMalIds={favoriteMalIds} />;
}
