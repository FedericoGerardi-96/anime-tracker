export interface HentaiEntry {
  id: string;
  title: string;
  image: string | null;
  type: 'anime' | 'doujin';
  description: string | null;
  watch_link: string | null;
  source_anime: string | null;
  is_original: boolean;
  tags: string[];
  revision: string | null;
  mal_id: number | null;
  created_at: string;
}

export interface HentaiFilters {
  page: number;
  q: string;
  type: HentaiEntry['type'] | 'all';
  origin: string;
  tags: string[];
  sort: 'newest' | 'oldest' | 'title-asc' | 'title-desc';
}
