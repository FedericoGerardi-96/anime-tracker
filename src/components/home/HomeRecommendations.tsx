import Image from "next/image";
import Link from "next/link";
import { slugify } from "@/lib/utils";
import { getHomeRecommendations } from "@/services/home";
import HomeSectionUnavailable from "./HomeSectionUnavailable";

export default async function HomeRecommendations() {
  const { data: recommendations, seed: topAiring, unavailable } = await getHomeRecommendations();
  if (unavailable) return <HomeSectionUnavailable title="También te puede interesar" />;
  if (!recommendations.length) return null;
  return (
    <section>
      <div className="mb-5">
        <h2 className="text-2xl font-bold tracking-tight">
          También te puede interesar
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Recomendaciones relacionadas con{" "}
          <span className="font-medium text-primary">
            {topAiring?.title_english || topAiring?.title}
          </span>
          {""}.
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
              <Image
                src={recommendation.entry.images.webp.image_url}
                alt={recommendation.entry.title}
                fill
                sizes="(max-width: 640px) 45vw, 200px"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
            <h3 className="truncate px-1 pb-1 text-sm font-semibold group-hover:text-primary">
              {recommendation.entry.title}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
}
