
export interface JikanAnime {
  mal_id: number;
  url: string;
  images: {
    jpg: {
      image_url: string;
      small_image_url: string;
      large_image_url: string;
    };
    webp: {
      image_url: string;
      small_image_url: string;
      large_image_url: string;
    };
  };
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
  background: string | null;
  season: string | null;
  year: number | null;
  studios: Array<{
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }>;
  genres: Array<{
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }>;
}

export interface JikanPagination {
  last_visible_page: number;
  has_next_page: boolean;
  items: {
    count: number;
    total: number;
    per_page: number;
  };
}

export interface JikanResponse<T> {
  data: T;
  pagination: JikanPagination;
}

export interface JikanSearchParams {
  q?: string;
  type?: string;
  status?: string;
  rating?: string;
  sfw?: boolean;
  genres?: string;
  min_score?: number;
  max_score?: number;
  order_by?: string;
  sort?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface JikanCharacter {
  character: {
    mal_id: number;
    url: string;
    images: {
      webp: {
        image_url: string;
        small_image_url: string;
      };
      jpg: {
        image_url: string;
      };
    };
    name: string;
  };
  role: string;
  voice_actors: Array<{
    person: {
      mal_id: number;
      name: string;
    };
    language: string;
  }>;
}

export interface JikanEpisode {
  mal_id: number;
  title: string;
  title_japanese: string | null;
  title_romanji: string | null;
  aired: string | null;
  score: number | null;
  filler: boolean;
  recap: boolean;
  forum_url: string | null;
}

export interface JikanRecommendation {
  entry: {
    mal_id: number;
    url: string;
    images: {
      webp: {
        image_url: string;
      };
    };
    title: string;
  };
  url: string;
  votes: number;
}

