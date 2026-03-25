import Link from "next/link";
import { Metadata } from "next";
import { getSeasonUpcoming, getAnimeRecommendations, getScheduleToday } from "@/lib/jikan-service";
import { getProgressStats } from "@/lib/actions/lists";
import { getFavoriteMalIds } from "@/lib/actions/media";
import HeroCarousel from "@/components/anime/HeroCarousel";
import AiringToday from "@/components/anime/AiringToday";
import StatsDonut from "@/components/ui/StatsDonut";
import { slugify } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard | AniTrack",
};

const FRIENDS_ACTIVITY = [
  { id: 1, user: "Alex", action: "finished", anime: "Mushoku Tensei", time: "2 hours ago" },
  { id: 2, user: "Sarah", action: "added", anime: "Oshi no Ko", suffix: "to list", time: "5 hours ago" },
];

export default async function Home() {
  const [upcomingAnime, todayAnime, stats, favoriteMalIds] = await Promise.all([
    getSeasonUpcoming(8),
    getScheduleToday(),
    getProgressStats(),
    getFavoriteMalIds(),
  ]);

  // Use the top-scored anime from today's schedule as recommendations base
  const topAiring = todayAnime.find(a => a.score) ?? todayAnime[0];
  const recommendations = topAiring
    ? await getAnimeRecommendations(topAiring.mal_id)
    : [];

  const recommendedList = recommendations.slice(0, 4);

  return (
    <div className="p-4 sm:p-8 lg:p-12 space-y-8 lg:space-y-12 pt-24 lg:pt-28">
      {/* Hero Carousel — Upcoming Season */}
      <HeroCarousel anime={upcomingAnime} />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Main Grid Area */}
        <div className="xl:col-span-3 space-y-8">
          {/* Airing Today */}
          <AiringToday todayAnime={todayAnime} favoriteMalIds={favoriteMalIds} />

          {/* Recommended */}
          {recommendedList.length > 0 && (
            <section>
              <div className="mb-6">
                <h3 className="text-2xl font-bold">
                  Recommended for You
                </h3>
                {topAiring && (
                  <p className="text-sm text-slate-500 mt-1">
                    Based on <span className="text-primary font-medium">{topAiring.title_english || topAiring.title}</span>
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recommendedList.map((rec) => (
                  <Link
                    key={rec.entry.mal_id}
                    href={`/anime/${rec.entry.mal_id}-${slugify(rec.entry.title)}`}
                    className="bg-slate-100 dark:bg-slate-800/30 p-2 rounded-xl border border-slate-200 dark:border-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <div className="aspect-video rounded-lg overflow-hidden mb-3">
                      <div
                        className="w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url('${rec.entry.images.webp.image_url}')` }}
                      />
                    </div>
                    <p className="text-xs font-bold text-primary mb-1">{rec.votes} votes</p>
                    <h4 className="font-bold text-sm truncate">{rec.entry.title}</h4>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Right */}
        <div className="space-y-8">
          {/* Personal Stats */}
          <section className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800/50">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">analytics</span>
              My Progress
            </h3>
            <StatsDonut stats={stats} />
          </section>

          {/* Quick List Sync Banner */}
          <div className="bg-linear-to-br from-primary to-indigo-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <span className="material-symbols-outlined text-9xl">cloud_sync</span>
            </div>
            <h4 className="text-lg font-bold mb-2">My Lists</h4>
            <p className="text-sm text-white/80 mb-4 leading-relaxed">
              Login now to sync your progress, get tailored recommendations, and access your private entries.
            </p>
            <Link href="/login" className="block w-full">
              <button className="w-full bg-white text-primary py-2.5 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors shadow-lg cursor-pointer">
                Login to Sync
              </button>
            </Link>
          </div>

          {/* Friends Activity */}
          <section className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800/50">
            <h3 className="text-lg font-bold mb-4">Friends Activity</h3>
            <div className="space-y-4">
              {FRIENDS_ACTIVITY.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-sm">person</span>
                  </div>
                  <div>
                    <p className="text-xs">
                      <span className="font-bold">{activity.user}</span>{" "}
                      {activity.action}{" "}
                      <span className="text-primary font-medium">{activity.anime}</span>
                      {activity.suffix && ` ${activity.suffix}`}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
