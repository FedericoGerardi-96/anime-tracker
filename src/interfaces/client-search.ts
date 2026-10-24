export interface ClientSearchState<T> {
  url: string | null;
  data: T[];
  loading: boolean;
  error: string | null;
}

export interface CatalogSuggestion {
  mal_id: number;
  provider?: string;
  name?: string;
  title?: string;
  title_english?: string | null;
  images?: {
    webp?: { small_image_url?: string };
    jpg?: { small_image_url?: string };
  };
}
