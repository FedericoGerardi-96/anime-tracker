import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import AiringToday from "@/components/anime/AiringToday";
import StatsDonut from "@/components/ui/StatsDonut";
import { getProgressStats } from "@/lib/actions/lists";
import { getFavoriteMalIds } from "@/lib/actions/media";
import {
  getMalAnimeRecommendations,
  getMalScheduleToday,
  getMalTopAnime,
  getMalUpcomingAnime,
  isMyAnimeListUnavailableError,
} from "@/lib/myanimelist-service";
import { slugify } from "@/lib/utils";
import type { CatalogAnime } from "@/interfaces/media-catalog";
import TranslatedSynopsis from '@/components/media/TranslatedSynopsis';

export const metadata: Metadata = {
  title: "Inicio | AniTrack",
};

const QUICK_LINKS = [
  {
    href: "/anime/schedule",
    icon: "calendar_month",
    title: "Calendario",
    description: "Consultá todos los estrenos de la semana",
  },
  {
    href: "/favorites",
    icon: "favorite",
    title: "Favoritos",
    description: "Volvé rápido a los títulos que guardaste",
  },
  {
    href: "/lists",
    icon: "checklist",
    title: "Mis listas",
    description: "Organizá lo que ves y lo que querés empezar",
  },
];

async function loadMalSection<T>(request: Promise<T>, fallback: T) {
  try {
    return { data: await request, unavailable: false };
  } catch (error) {
    if (isMyAnimeListUnavailableError(error)) return { data: fallback, unavailable: true };
    throw error;
  }
}

function AnimePoster({ anime, priority = false }: Readonly<{ anime: CatalogAnime; priority?: boolean }>) {
  const title = anime.title_english || anime.title;
  const image = anime.images.webp.large_image_url || anime.images.jpg.large_image_url;

  return (
    <Link href={`/anime/${anime.mal_id}-${slugify(title)}`} className="group block min-w-0">
      <div className="relative mb-3 aspect-2/3 overflow-hidden rounded-2xl bg-muted">
        <Image
          src={image}
          alt={title}
          fill
          priority={priority}
          sizes="(max-width: 640px) 42vw, (max-width: 1024px) 22vw, 180px"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/70 to-transparent" />
        {anime.score && (
          <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-1 text-[11px] font-bold text-amber-300 backdrop-blur-sm">
            ★ {anime.score.toFixed(1)}
          </span>
        )}
      </div>
      <h3 className="truncate text-sm font-semibold transition-colors group-hover:text-primary">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {[anime.type, anime.episodes ? `${anime.episodes} eps` : null].filter(Boolean).join(" · ")}
      </p>
    </Link>
  );
}

export default async function Home() {
  const [upcomingResult, todayResult, stats, favoriteMalIds, topResult] = await Promise.all([
    loadMalSection(getMalUpcomingAnime(6), []),
    loadMalSection(getMalScheduleToday(), []),
    getProgressStats(),
    getFavoriteMalIds(),
    loadMalSection(getMalTopAnime(10), []),
  ]);

  const upcomingAnime = upcomingResult.data;
  const todayAnime = todayResult.data;
  const topAnime = topResult.data;

  const topAiring = todayAnime.find((anime) => anime.popularity) ?? todayAnime[0];
  const recommendationResult = topAiring
    ? await loadMalSection(getMalAnimeRecommendations(topAiring.mal_id), [])
    : { data: [], unavailable: false };
  const recommendations = recommendationResult.data.slice(0, 4);
  const isMalDown = upcomingResult.unavailable || todayResult.unavailable ||
    topResult.unavailable || recommendationResult.unavailable;

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {isMalDown && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm" role="status">
          <span className="material-symbols-outlined mt-0.5 text-amber-500">cloud_off</span>
          <div>
            <p className="font-bold">La información de anime no está disponible temporalmente</p>
            <p className="mt-1 text-muted-foreground">MyAnimeList no está respondiendo. Tu progreso, listas y favoritos siguen funcionando con normalidad.</p>
          </div>
        </div>
      )}
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-12">
          <AiringToday todayAnime={todayAnime} favoriteMalIds={favoriteMalIds} />

          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">Próximamente</p>
                <h2 className="text-2xl font-bold tracking-tight">Lo que viene en anime</h2>
                <p className="mt-1 text-sm text-muted-foreground">Nuevas temporadas y estrenos anunciados.</p>
              </div>
              <Link href="/anime?status=upcoming" className="shrink-0 text-sm font-semibold text-primary hover:underline">
                Ver todo
              </Link>
            </div>

            {upcomingAnime.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {upcomingAnime.slice(0, 6).map((anime, index) => {
                const title = anime.title_english || anime.title;
                const image = anime.images.webp.large_image_url || anime.images.jpg.large_image_url;
                return (
                  <Link
                    key={anime.mal_id}
                    href={`/anime/${anime.mal_id}-${slugify(title)}`}
                    className="group flex min-w-0 gap-4 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5"
                  >
                    <div className="relative h-32 w-22 shrink-0 overflow-hidden rounded-xl bg-muted">
                      <Image src={image} alt={title} fill priority={index < 2} sizes="88px" className="object-cover transition duration-500 group-hover:scale-105" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col py-1">
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary">Próximo estreno</span>
                        {anime.type && <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">{anime.type}</span>}
                      </div>
                      <h3 className="line-clamp-2 text-sm font-bold leading-snug group-hover:text-primary">{title}</h3>
                      {anime.synopsis ? <TranslatedSynopsis malId={anime.mal_id} mediaType='anime' original={anime.synopsis} canSave={stats !== null} className='mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground' loaderClassName='min-h-10 justify-start text-xs' /> : <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">Más información disponible próximamente.</p>}
                      <span className="mt-auto pt-2 text-xs font-semibold text-primary">Ver detalles →</span>
                    </div>
                  </Link>
                );
                })}
              </div>
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 text-center">
                <span className="material-symbols-outlined mb-2 text-3xl text-muted-foreground">cloud_off</span>
                <p className="font-semibold">No pudimos cargar los próximos estrenos</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">MyAnimeList no está respondiendo en este momento. La sección volverá a completarse automáticamente cuando el servicio se recupere.</p>
              </div>
            )}
          </section>

          {recommendations.length > 0 && (
            <section>
              <div className="mb-5">
                <h2 className="text-2xl font-bold tracking-tight">También te puede interesar</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Recomendaciones relacionadas con <span className="font-medium text-primary">{topAiring?.title_english || topAiring?.title}</span>.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {recommendations.map((recommendation) => (
                  <Link
                    key={recommendation.entry.mal_id}
                    href={`/anime/${recommendation.entry.mal_id}-${slugify(recommendation.entry.title)}`}
                    className="group rounded-2xl border border-border bg-card p-2 transition hover:border-primary/35"
                  >
                    <div className="relative mb-3 aspect-video overflow-hidden rounded-xl bg-muted">
                      <Image src={recommendation.entry.images.webp.image_url} alt={recommendation.entry.title} fill sizes="(max-width: 640px) 45vw, 200px" className="object-cover transition duration-500 group-hover:scale-105" />
                    </div>
                    <h3 className="truncate px-1 pb-1 text-sm font-semibold group-hover:text-primary">{recommendation.entry.title}</h3>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24">
          {stats === null ? (
            <section className="overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-br from-primary/15 to-card p-6">
              <span className="material-symbols-outlined mb-4 text-3xl text-primary">monitoring</span>
              <h2 className="text-lg font-bold">Tu progreso, en un solo lugar</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Iniciá sesión para seguir tus series, sincronizar listas y ver tus estadísticas.</p>
              <Link href="/login" className="mt-5 block rounded-full bg-primary px-4 py-2.5 text-center text-sm font-bold text-primary-foreground transition hover:brightness-110">Iniciar sesión</Link>
            </section>
          ) : (
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-bold">
                <span className="material-symbols-outlined text-primary">analytics</span>
                Mi progreso
              </h2>
              <StatsDonut stats={stats} />
            </section>
          )}

          <section className="rounded-2xl border border-border bg-card p-2">
            {QUICK_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className="group flex items-center gap-3 rounded-xl p-3 transition hover:bg-muted">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{item.description}</span>
                </span>
              </Link>
            ))}
          </section>
        </aside>
      </div>

      {topAnime.length > 0 && (
        <section className="border-t border-border pt-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Top anime de todos los tiempos</h2>
              <p className="mt-1 text-sm text-muted-foreground">Los títulos más populares de la comunidad.</p>
            </div>
            <Link href="/anime?sort=popularity" className="shrink-0 text-sm font-semibold text-primary hover:underline">Ver todo</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10">
            {topAnime.map((anime, index) => <AnimePoster key={anime.mal_id} anime={anime} priority={index < 3} />)}
          </div>
        </section>
      )}
    </div>
  );
}
