import type { CatalogGenre, CatalogRecommendation } from '@/interfaces/media-catalog';
import type { MediaPersonalActionsProps } from '@/interfaces/media-detail-components';

export type DetailMediaType = 'anime' | 'manga';

export interface MediaDetailViewModel {
  names?: Array<{ label: string; value: string }>;
  metadata?: Array<{ label: string; value: string }>;
  malId: number;
  mediaType: DetailMediaType;
  slug: string;
  title: string;
  displayTitle: string;
  image: string;
  format: string;
  score: number | null;
  status: string;
  rank: number | null;
  popularity: number;
  synopsis: string | null;
  genres: CatalogGenre[];
  units: number | null;
  creator: string;
  volumes?: number | null;
  cardData: MediaPersonalActionsProps['animeData'];
}

export interface MediaDetailViewProps { detail: MediaDetailViewModel }
export interface DetailRecommendationListProps {
  mediaType: DetailMediaType;
  recommendations: CatalogRecommendation[];
}
