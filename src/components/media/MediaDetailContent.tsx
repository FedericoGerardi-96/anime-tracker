import { buildMediaDetailMetadata } from '@/lib/media-detail-metadata';
import { notFound } from 'next/navigation';
import { isMyAnimeListUnavailableError } from '@/lib/myanimelist-service';
import { getPreferredAnimeByMalId, getPreferredMangaByMalId } from '@/services/media-detail';
import type { DetailContentProps } from '@/interfaces/page';
import type { DetailMediaType, MediaDetailViewModel } from '@/interfaces/media-detail-view';
import MediaDetailView from './MediaDetailView';

export default async function MediaDetailContent({ slug, mediaType }: Readonly<DetailContentProps & { mediaType: DetailMediaType }>) {
  const idMatch = slug.match(/^(\d+)/);
  if (!idMatch) notFound();
  const malId = Number.parseInt(idMatch[1], 10);

  let media;
  try {
    media = mediaType === 'anime'
      ? await getPreferredAnimeByMalId(malId)
      : await getPreferredMangaByMalId(malId);
  } catch (error) {
    console.error(`Error fetching ${mediaType} data:`, error);
    if (isMyAnimeListUnavailableError(error)) throw error;
    notFound();
  }

  const image = media.images.webp.large_image_url || media.images.jpg.large_image_url;
  const variant = 'episodes' in media
    ? { units: media.episodes, creator: media.studios[0]?.name, season: media.season, volumes: undefined }
    : { units: media.chapters, creator: media.authors[0]?.name, season: undefined, volumes: media.volumes };
  const { units, creator } = variant;

  const detail: MediaDetailViewModel = {
    ...buildMediaDetailMetadata(media, mediaType),
    malId,
    mediaType,
    slug,
    title: media.title,
    displayTitle: media.title_english || media.title,
    image,
    format: media.type,
    score: media.score,
    status: media.status,
    rank: media.rank,
    popularity: media.popularity,
    synopsis: media.synopsis,
    genres: media.genres,
    units,
    creator: creator || 'Desconocido',
    volumes: variant.volumes,
    cardData: {
      id: malId,
      title: media.title_english || media.title,
      image,
      type: mediaType,
      score: media.score || 0,
      studio: creator || 'Desconocido',
      year: media.year || undefined,
      synopsis: media.synopsis,
      genres: media.genres.map((genre) => genre.name),
      tags: media.tags ?? [],
      format: media.type,
      catalogStatus: media.status,
      totalUnits: units || undefined,
      ...(variant.season ? { season: variant.season } : {}),
    },
  };

  return <MediaDetailView detail={detail} />;
}
