import type { IFavorites } from '@/types/favorites';
export interface GetFavoritesOptions {
  query?: string;
  page?: number;
  pageSize?: number;
  tags?: string[];
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  status?: string;
  mediaType?: string;
  excludeGenre?: string;
  yearFrom?: number;
  yearTo?: number;
  scoreBands?: string;
  genre?: string;
  catalogStatus?: string;
  year?: number;
  season?: string;
  format?: string;
  minScore?: number;
}

export interface FavoriteFacets { tags: string[]; genres: string[]; years: number[]; formats: string[] }
export interface FavoritesPageData { favorites: IFavorites[]; totalCount: number; totalPages: number; facets: FavoriteFacets }

export interface FavoritesSearchParams {
  mal?: string;
  anilist?: string;
  missing?: string;
  anilistMissing?: string;
  page?: string;
  q?: string;
  tags?: string;
  sort?: string;
  status?: string;
  type?: string;
  direction?: string;
  excludeGenre?: string;
  yearFrom?: string;
  yearTo?: string;
  scoreBands?: string;
  genre?: string;
  catalogStatus?: string;
  year?: string;
  season?: string;
  format?: string;
  minScore?: string;
}
