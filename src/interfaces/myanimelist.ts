export type MalSeason = "winter" | "spring" | "summer" | "fall";

export interface MalAnimeNode {
  id: number;
  title: string;
  main_picture?: { medium?: string; large?: string };
  alternative_titles?: { synonyms: string[]; en: string; ja: string };
  mean?: number;
  rank?: number;
  popularity?: number;
  media_type?: string;
  status?: string;
  num_episodes?: number;
  start_date?: string;
  synopsis?: string;
  source?: string;
  genres?: Array<{ id: number; name: string }>;
  studios?: Array<{ id: number; name: string }>;
  start_season?: { year: number; season: MalSeason };
  broadcast?: { day_of_the_week?: string; start_time?: string };
  num_scoring_users?: number;
  recommendations?: Array<{ node: MalAnimeNode; num_recommendations: number }>;
}

export interface MalMangaNode {
  id: number;
  title: string;
  main_picture?: { medium?: string; large?: string };
  alternative_titles?: { synonyms: string[]; en: string; ja: string };
  mean?: number;
  rank?: number;
  popularity?: number;
  media_type?: string;
  status?: string;
  num_volumes?: number;
  num_chapters?: number;
  start_date?: string;
  synopsis?: string;
  genres?: Array<{ id: number; name: string }>;
  authors?: Array<{ node: { id: number; first_name: string; last_name: string }; role: string }>;
  num_scoring_users?: number;
  recommendations?: Array<{ node: MalMangaNode; num_recommendations: number }>;
}

export interface MalAnimeRankingEntry {
  node: MalAnimeNode;
  ranking: { rank: number; previous_rank?: number };
}

export interface MalPaging {
  previous?: string;
  next?: string;
}

export interface MalListResponse<T> {
  data: T[];
  paging: MalPaging;
}

export interface MalAnimeCatalogOptions {
  q?: string;
  genre?: string;
  status?: string;
  sort?: string;
  season?: string;
  year?: number;
  page?: number;
  limit?: number;
}

export interface MalAnimeCatalogResult {
  anime: MalAnimeNode[];
  hasNextPage: boolean;
}

export interface MalMangaCatalogOptions {
  q?: string;
  genre?: string;
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface MalMangaCatalogResult {
  manga: MalMangaNode[];
  hasNextPage: boolean;
}
