import type { ComponentProps } from 'react';
import type AnimeActions from '@/components/anime/AnimeActions';
export interface MediaPersonalActionsProps {
  malId: number;
  mediaType: 'anime' | 'manga';
  animeData: ComponentProps<typeof AnimeActions>['animeData'];
  maxEpisodes?: number;
}
export interface MediaSynopsisProps { malId: number; mediaType: 'anime' | 'manga'; original: string }
export interface MediaSectionProps { malId: number; slug?: string }
