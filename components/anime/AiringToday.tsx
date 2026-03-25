import Link from "next/link";
import { JikanAnime } from "@/types/jikan";
import { slugify } from "@/lib/utils";

interface AiringTodayProps {
  todayAnime: JikanAnime[];
  favoriteMalIds: number[] | null; // null = not logged in
}

export default function AiringToday({ todayAnime, favoriteMalIds }: AiringTodayProps) {
  const isLoggedIn = favoriteMalIds !== null;

  // Logged in: filter to only favorites. Not logged in: show all (capped at 4)
  const displayed = isLoggedIn
    ? todayAnime.filter(a => favoriteMalIds.includes(a.mal_id))
    : todayAnime.slice(0, 4);

  const isEmpty = displayed.length === 0;

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold">Airing Today</h3>
          {isLoggedIn && !isEmpty && (
            <p className="text-xs text-slate-500 mt-0.5">From your favorites</p>
          )}
        </div>
        <Link href="/anime?status=airing" className="text-primary text-sm font-semibold hover:underline">
          View All
        </Link>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-400">calendar_today</span>
          <div>
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              {isLoggedIn
                ? "None of your favorites air today"
                : "No anime scheduled for today"}
            </p>
            {isLoggedIn && (
              <p className="text-xs text-slate-500 mt-1">
                Check back tomorrow or explore the full schedule
              </p>
            )}
          </div>
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold opacity-60 cursor-not-allowed"
            title="Coming soon"
          >
            <span className="material-symbols-outlined text-base">event</span>
            View Release Calendar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayed.map((anime) => (
            <Link
              key={anime.mal_id}
              href={`/anime/${anime.mal_id}-${slugify(anime.title_english || anime.title)}`}
              className="group cursor-pointer"
            >
              <div className="relative aspect-3/4 rounded-xl overflow-hidden mb-3">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                  style={{ backgroundImage: `url('${anime.images.webp.large_image_url || anime.images.jpg.large_image_url}')` }}
                />
                {anime.score && (
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-yellow-400 text-[10px] px-2 py-1 rounded font-bold">
                    ★ {anime.score.toFixed(1)}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-4xl">play_circle</span>
                </div>
              </div>
              <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                {anime.title_english || anime.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {anime.episodes ? `${anime.episodes} eps` : "Ongoing"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
