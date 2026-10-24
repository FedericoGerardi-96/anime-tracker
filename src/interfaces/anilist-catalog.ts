export type CatalogMediaType = 'anime' | 'manga';
export type CatalogProvider = 'anilist' | 'myanimelist';

export interface AniListCatalogOptions {
  q?: string;
  genre?: string;
  excludeGenre?: string;
  format?: string;
  status?: string;
  sort?: string;
  season?: string;
  year?: number;
  yearFrom?: number;
  yearTo?: number;
  minScore?: number;
  scoreBands?: string;
  page?: number;
  perPage?: number;
}

export interface CatalogCard {
  id: number;
  title: string;
  image: string;
  score: number;
  studio: string;
  year: number;
  isAiring: boolean;
  synopsis?: string;
  season?: string;
  genres: string[];
  tags: string[];
  format?: string;
  status?: string;
  episodes?: number;
  totalUnits?: number;
  type: CatalogMediaType;
  isFavorite?: boolean;
}

export interface AniListCatalogResult {
  items: CatalogCard[];
  totalPages: number;
  hasNextPage: boolean;
}
