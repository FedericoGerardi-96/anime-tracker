import Link from "next/link";
import Image from "next/image";
import { slugify } from "@/lib/utils";
import {
  getMalAnimeRecommendations,
  getMalMangaRecommendations,
} from "@/lib/myanimelist-service";
import type {
  DetailMediaType,
  DetailRecommendationListProps,
} from "@/interfaces/media-detail-view";

function DetailRecommendationList({
  mediaType,
  recommendations,
}: Readonly<DetailRecommendationListProps>) {
  if (!recommendations.length) return null;

  return (
    <section className="mt-20 pb-10">
      <h2 className="mb-8 text-2xl font-bold text-foreground">
        {mediaType === "anime" ? "Si te gustó, mira esto" : "Si te gustó, lee esto"}
      </h2>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {recommendations.map(({ entry }) => (
          <Link
            key={entry.mal_id}
            href={`/${mediaType}/${entry.mal_id}-${slugify(entry.title)}`}
            className="group cursor-pointer"
          >
            <div className="relative mb-3 aspect-2/3 overflow-hidden rounded-2xl border border-border shadow-lg transition-all group-hover:shadow-primary/20">
              <Image
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                src={entry.images.webp.image_url}
                alt={entry.title}
                fill
                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
              />
            </div>
            <p className="truncate text-sm font-bold text-foreground">
              {entry.title}
            </p>
            <p className="text-xs text-muted-foreground">Recommendation</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function MediaDetailRecommendations({
  malId,
  mediaType,
}: Readonly<{ malId: number; mediaType: DetailMediaType }>) {
  const recommendations = await (
    mediaType === "anime"
      ? getMalAnimeRecommendations(malId)
      : getMalMangaRecommendations(malId)
  ).catch(() => []);

  return (
    <DetailRecommendationList
      mediaType={mediaType}
      recommendations={recommendations.slice(0, 5)}
    />
  );
}
