import Image from "next/image";
import Link from "next/link";
import { slugify } from "@/lib/utils";
import { getHomeUpcoming } from "@/services/home";
import HomeSectionUnavailable from "./HomeSectionUnavailable";

const FORMAT_LABELS: Record<string, string> = {
  tv: "TV",
  movie: "Película",
  special: "Especial",
  ova: "OVA",
  ona: "ONA",
  music: "Música",
};

export default async function HomeUpcoming() {
  const result = await getHomeUpcoming();
  if (result.unavailable)
    return <HomeSectionUnavailable title="Próximos estrenos" />;
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
          className="shrink-0 text-sm font-semibold text-primary hover:text-secondary"
        >
          Ver todo
        </Link>
      </div>

      {upcomingAnime.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {upcomingAnime.slice(0, 6).map((anime) => {
            const title = anime.title_english || anime.title;
            const image =
              anime.images.webp.large_image_url ||
              anime.images.jpg.large_image_url;
            const format =
              FORMAT_LABELS[anime.type.toLowerCase()] ?? anime.type;
            return (
              <Link
                key={anime.mal_id}
                href={`/anime/${anime.mal_id}-${slugify(title)}`}
                className="group min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                <div className="relative aspect-2/3 overflow-hidden rounded-xl border border-border bg-muted">
                  {image && (
                    <Image
                      src={image}
                      alt=""
                      fill
                      sizes="(max-width: 639px) calc((100vw - 3rem) / 2), (max-width: 1023px) calc((100vw - 5rem) / 3), (max-width: 1279px) calc((100vw - 7rem) / 4), (max-width: 1328px) calc((100vw - 10rem) / 6), 200px"
                      className="object-cover transition-transform duration-500 motion-reduce:transition-none motion-safe:group-hover:scale-105"
                    />
                  )}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-linear-to-t from-black via-black/80 to-transparent"
                  />
                  {anime.year && (
                    <span className="absolute left-2 top-2 rounded-md bg-background px-2 py-1 text-xs font-bold text-foreground">
                      {anime.year}
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <h3 className="line-clamp-3 text-sm font-bold leading-snug text-white">
                      {title}
                    </h3>
                  </div>
                </div>
                {(anime.studios[0]?.name || format) && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {[anime.studios[0]?.name, format]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 text-center">
          <span className="material-symbols-outlined mb-2 text-3xl text-muted-foreground">
            event
          </span>
          <p className="font-semibold">No hay próximos estrenos disponibles</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Consultá nuevamente más adelante para ver nuevos anuncios.
          </p>
        </div>
      )}
    </section>
  );
}
