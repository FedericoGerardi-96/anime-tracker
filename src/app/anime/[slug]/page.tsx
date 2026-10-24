import { Suspense } from "react";
import type { Metadata } from "next";
import type { DetailPageProps as Props } from "@/interfaces/page";
import { getPreferredAnimeByMalId } from "@/services/media-detail";
import MediaDetailContent from "@/components/media/MediaDetailContent";
import { DetailSkeleton } from "@/components/fallbacks/PageSkeleton";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const idMatch = slug.match(/^(\d+)/);
  if (!idMatch) return { title: "Anime Not Found" };

  const animeId = Number.parseInt(idMatch[1]);
  try {
    const anime = await getPreferredAnimeByMalId(animeId);
    return {
      title: anime.title_english || anime.title,
      description:
        anime.synopsis?.slice(0, 160) ||
        `Experience ${anime.title} on AniTrack.`,
      openGraph: {
        images: [
          anime.images.webp.large_image_url || anime.images.jpg.large_image_url,
        ],
      },
    };
  } catch {
    return { title: "Anime | AniTrack" };
  }
}

export default async function AnimeDetailPage({ params }: Readonly<Props>) {
  const { slug } = await params;
  return (
    <Suspense key={slug} fallback={<DetailSkeleton />}>
      <MediaDetailContent slug={slug} mediaType="anime" />
    </Suspense>
  );
}
