export type ProfileHighlightCategory = 'anime' | 'manga' | 'character';

export interface ProfileHighlight {
  id?: string;
  user_id?: string;
  category: ProfileHighlightCategory;
  external_id: number;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  position: number;
}

