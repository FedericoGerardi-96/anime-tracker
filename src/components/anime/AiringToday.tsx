import Link from "next/link";
import Image from 'next/image';

import type { CatalogAnime } from "@/interfaces/media-catalog";
import { slugify } from "@/lib/utils";

interface AiringTodayProps {
  todayAnime: CatalogAnime[];
  favoriteMalIds: number[] | null; // null = not logged in
}

export default function AiringToday({ todayAnime, favoriteMalIds }: Readonly<AiringTodayProps>) {
  const isLoggedIn = favoriteMalIds !== null;

  // Logged in: filter to favorites. Keep the home preview compact in both cases.
  const matchingAnime = isLoggedIn
    ? todayAnime.filter(a => favoriteMalIds.includes(a.mal_id))
    : todayAnime;
  const displayed = matchingAnime.slice(0, 8);

  const isEmpty = displayed.length === 0;

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">En emisión hoy</h2>
            <span className="rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-bold uppercase text-red-500">Live</span>
          </div>
          {isLoggedIn && !isEmpty && (
            <p className="mt-1 text-sm text-muted-foreground">Episodios de tus animes favoritos que salen hoy.</p>
          )}
          {!isLoggedIn && <p className="mt-1 text-sm text-muted-foreground">Estrenos y nuevos episodios programados para hoy.</p>}
        </div>
        <Link href="/anime?status=airing" aria-label="Ver todos los animes en emisión" className="text-primary text-sm font-semibold hover:underline">
          Ver todo
        </Link>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-400">calendar_today</span>
          <div>
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              {isLoggedIn
                ? "Ninguno de tus favoritos se emite hoy"
                : "No hay anime programado para hoy"}
            </p>
            {isLoggedIn && (
              <p className="mt-1 text-xs text-muted-foreground">
                Volvé mañana o consultá el calendario completo
              </p>
            )}
          </div>
          <Link
            href="/anime/schedule"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
          >
            <span className="material-symbols-outlined text-base">event</span>{''}
            Ver calendario de estrenos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayed.map((anime, index) => (
            <Link
              key={anime.mal_id}
              href={`/anime/${anime.mal_id}-${slugify(anime.title_english || anime.title)}`}
              className="group cursor-pointer"
            >
              <div className="relative aspect-3/4 rounded-xl overflow-hidden mb-3">
                <Image
                  src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
                  alt=""
                  fill
                  sizes="(max-width: 767px) calc((100vw - 3rem) / 2), (max-width: 1279px) calc((100vw - 5rem) / 3), 210px"
                  loading={index < 2 ? "eager" : "lazy"}
                  fetchPriority={index < 2 ? "high" : "auto"}
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
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
              <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                {anime.title_english || anime.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {anime.episodes ? `${anime.episodes} episodios` : "En emisión"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
