import { Suspense } from 'react';
import type { Metadata } from 'next';
import type { DetailPageProps as Props } from '@/interfaces/page';
import { getPreferredMangaByMalId } from '@/services/media-detail';
import MediaDetailContent from '@/components/media/MediaDetailContent';
import { DetailSkeleton } from '@/components/fallbacks/PageSkeleton';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const idMatch = slug.match(/^(\d+)/);
  if (!idMatch) return { title: "Manga Not Found" };
  
  const mangaId = Number.parseInt(idMatch[1]);
  try {
    const manga = await getPreferredMangaByMalId(mangaId);
    return {
      title: manga.title_english || manga.title,
      description: manga.synopsis?.slice(0, 160) || `Experience ${manga.title} on AniTrack.`,
      openGraph: {
        images: [manga.images.webp.large_image_url || manga.images.jpg.large_image_url],
      },
    };
  } catch {
    return { title: "Manga | AniTrack" };
  }
}


export default async function MangaDetailPage({ params }: Readonly<Props>) {
  const { slug } = await params;
  return <Suspense key={slug} fallback={<DetailSkeleton />}><MediaDetailContent slug={slug} mediaType="manga" /></Suspense>;
}
