import Image from "next/image";
import Link from "next/link";
import { slugify } from "@/lib/utils";
import type { HomeAnimePosterProps } from "@/interfaces/home";
import { getHomeTopAnime } from "@/services/home";
import HomeSectionUnavailable from "./HomeSectionUnavailable";

function AnimePoster({
  anime,
}: Readonly<HomeAnimePosterProps>) {
  const title = anime.title_english || anime.title;
  const image =
    anime.images.webp.large_image_url || anime.images.jpg.large_image_url;

  return (
    <Link
      href={`/anime/${anime.mal_id}-${slugify(title)}`}
      className="group block min-w-0"
    >
      <div className="relative mb-3 aspect-2/3 overflow-hidden rounded-2xl bg-muted">
        <Image
          src={image}
          alt={title}
          fill
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
      <h3 className="truncate text-sm font-semibold transition-colors group-hover:text-primary">
        {title}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {[anime.type, anime.episodes ? `${anime.episodes} eps` : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </Link>
  );
}

export default async function HomeTopAnime() {
  const result = await getHomeTopAnime();
  if (result.unavailable) return <HomeSectionUnavailable title="Top anime de todos los tiempos" />;
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
          className="shrink-0 text-sm font-semibold text-primary hover:underline"
        >
          Ver todo
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10">
        {topAnime.map((anime) => (
          <AnimePoster
            key={anime.mal_id}
            anime={anime}
          />
        ))}
      </div>
    </section>
  );
}
