import { remainingWatchingEpisodes } from "@/lib/home-watching-selection";
import { getHomeWatchingAirings } from "@/services/home-watching-airings";
import HomeWatchingNext from "./HomeWatchingNext";

export default async function HomeWatchingInfo({ malId, total, episode }: Readonly<{ malId: number; total: number | null; episode: number }>) {
  const { events, unavailable } = await getHomeWatchingAirings();
  const remaining = remainingWatchingEpisodes(total, episode);
  const fallback = remaining === null ? "No hay un próximo horario disponible." : `Te ${remaining === 1 ? "queda 1 episodio" : `quedan ${remaining} episodios`}.`;
  const next = events.find((event) => event.id === malId);
  if (next) return <HomeWatchingNext episode={next.episode} airingAt={next.airingAt} fallback={fallback} />;
  return <p className="mt-1 text-xs text-muted-foreground">{unavailable ? `No pudimos cargar el horario. ${remaining === null ? "" : fallback}` : fallback}</p>;
}
