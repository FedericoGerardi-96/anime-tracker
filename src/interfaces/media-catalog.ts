export interface CatalogDetailMetadata {
  title_japanese?: string | null;
  title_synonyms?: string[];
  start_date?: string | null;
  end_date?: string | null;
  duration_minutes?: number | null;
}

export interface CatalogImageSet {
  jpg: { image_url: string; small_image_url: string; large_image_url: string };
  webp: { image_url: string; small_image_url: string; large_image_url: string };
}

export interface CatalogGenre {
  mal_id: number;
  name: string;
}

export interface CatalogAnime extends CatalogDetailMetadata {
  mal_id: number;
  images: CatalogImageSet;
  title: string;
  title_english: string | null;
  type: string;
  source: string;
  episodes: number | null;
  status: string;
  airing: boolean;
  score: number | null;
  scored_by: number | null;
  rank: number | null;
  popularity: number;
  synopsis: string | null;
  season: string | null;
  year: number | null;
  studios: CatalogGenre[];
  genres: CatalogGenre[];
  tags?: string[];
  broadcast?: { day: string | null; time: string | null };
}

export interface CatalogManga extends CatalogDetailMetadata {
  mal_id: number;
  images: CatalogImageSet;
  title: string;
  title_english: string | null;
  type: string;
  year: number | null;
  chapters: number | null;
  volumes: number | null;
  status: string;
  publishing: boolean;
  score: number | null;
  scored_by: number | null;
  rank: number | null;
  popularity: number;
  synopsis: string | null;
  authors: CatalogGenre[];
  genres: CatalogGenre[];
  tags?: string[];
}

export interface CatalogRecommendation {
  entry: { mal_id: number; images: { webp: { image_url: string } }; title: string };
  votes: number;
}
