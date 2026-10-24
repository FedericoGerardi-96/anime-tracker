export interface RelatedReading {
  malId: number;
  title: string;
  image: string;
  format: 'manga' | 'novel';
  relation: string;
}

export interface ReadingSuggestion {
  animeMalId: number;
  animeTitle: string;
  reading: RelatedReading;
}
