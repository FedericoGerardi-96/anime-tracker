import Image from "next/image";
import Link from "next/link";
import { slugify } from "@/lib/utils";
import TranslatedSynopsis from "@/components/media/TranslatedSynopsis";
import { getHomeUpcoming } from "@/services/home";
import HomeSectionUnavailable from "./HomeSectionUnavailable";

export default async function HomeUpcoming() {
  const result = await getHomeUpcoming();
  if (result.unavailable) return <HomeSectionUnavailable title="Próximos estrenos" />;
  const upcomingAnime = result.data;
  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Próximamente
          </p>
          <h2 className="text-2xl font-bold tracking-tight">
            Lo que viene en anime
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nuevas temporadas y estrenos anunciados.
          </p>
        </div>
        <Link
          href="/anime?status=upcoming"
          aria-label="Ver todos los próximos estrenos de anime"
          className="shrink-0 text-sm font-semibold text-primary hover:underline"
        >
          Ver todo
        </Link>
      </div>
    
      {upcomingAnime.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {upcomingAnime.slice(0, 6).map((anime) => {
            const title = anime.title_english || anime.title;
            const image =
              anime.images.webp.large_image_url ||
              anime.images.jpg.large_image_url;
            return (
              <Link
                key={anime.mal_id}
                href={`/anime/${anime.mal_id}-${slugify(title)}`}
                className="group flex min-w-0 gap-4 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="relative h-32 w-22 shrink-0 overflow-hidden rounded-xl bg-muted">
                  <Image
                    src={image}
                    alt={title}
                    fill
                    sizes="88px"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col py-1">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary">
                      Próximo estreno
                    </span>
                    {anime.type && (
                      <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                        {anime.type}
                      </span>
                    )}
                  </div>
                  <h3 className="line-clamp-2 text-sm font-bold leading-snug group-hover:text-primary">
                    {title}
                  </h3>
                  {anime.synopsis ? (
                    <TranslatedSynopsis
                      malId={anime.mal_id}
                      mediaType="anime"
                      original={anime.synopsis}
                      className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground"
                      loaderClassName="min-h-10 justify-start text-xs"
                    />
                  ) : (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      Más información disponible próximamente.
                    </p>
                  )}
                  <span className="mt-auto pt-2 text-xs font-semibold text-primary">
                    Ver detalles →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 text-center">
          <span className="material-symbols-outlined mb-2 text-3xl text-muted-foreground">
            event
          </span>
          <p className="font-semibold">
            No hay próximos estrenos disponibles
          </p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Consultá nuevamente más adelante para ver nuevos anuncios.
          </p>
        </div>
      )}
    </section>
  );
}
