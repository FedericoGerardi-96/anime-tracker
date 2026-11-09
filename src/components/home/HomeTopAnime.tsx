import Image from "next/image";
import Link from "next/link";
import { slugify } from "@/lib/utils";
import type { HomeAnimePosterProps } from "@/interfaces/home";
import { getHomeTopAnime } from "@/services/home";
import HomeSectionUnavailable from "./HomeSectionUnavailable";

function AnimePoster({
  anime,
  position,
}: Readonly<HomeAnimePosterProps & { position: number }>) {
  const title = anime.title_english || anime.title;
  const image =
    anime.images.webp.large_image_url || anime.images.jpg.large_image_url;

  return (
    <Link
      href={`/anime/${anime.mal_id}-${slugify(title)}`}
      className="group flex min-w-0 items-end gap-1 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <span className="sr-only">Puesto {position}: </span>
      <span
        aria-hidden="true"
        className="shrink-0 pb-6 text-4xl font-black leading-none text-transparent sm:text-5xl"
        style={{ WebkitTextStroke: "1px var(--brand-aurora)" }}
      >
        {position}
      </span>
      <div className="min-w-0 flex-1">
        <div className="relative aspect-2/3 overflow-hidden rounded-xl border border-border bg-muted">
          {image && (
            <Image
              src={image}
              alt=""
              fill
              sizes="(max-width: 639px) calc((100vw - 7rem) / 2), (max-width: 767px) calc((100vw - 10rem) / 3), (max-width: 1279px) calc((100vw - 16rem) / 5), 190px"
              className="object-cover transition-transform duration-500 motion-reduce:transition-none motion-safe:group-hover:scale-105"
            />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-t from-black via-black/80 to-transparent"
          />
          <div className="absolute inset-x-0 bottom-0 p-2.5">
            <h3 className="line-clamp-3 text-sm font-bold leading-snug text-white">
              {title}
            </h3>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {[
            anime.score ? `★ ${anime.score.toFixed(1)}` : null,
            anime.type,
            anime.episodes ? `${anime.episodes} episodios` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </Link>
  );
}

export default async function HomeTopAnime() {
  const result = await getHomeTopAnime();
  if (result.unavailable)
    return <HomeSectionUnavailable title="Top anime de todos los tiempos" />;
  const topAnime = result.data;
  if (!topAnime.length) return null;
  return (
    <section className="border-t border-border pt-10">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Top anime de todos los tiempos
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Los títulos más populares de la comunidad.
          </p>
        </div>
        <Link
          href="/anime?sort=popularity"
          aria-label="Ver todos los animes populares"
          className="shrink-0 text-sm font-semibold text-primary hover:text-secondary"
        >
          Ver todo
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-5">
        {topAnime.map((anime, index) => (
          <AnimePoster key={anime.mal_id} anime={anime} position={index + 1} />
        ))}
      </div>
    </section>
  );
}
