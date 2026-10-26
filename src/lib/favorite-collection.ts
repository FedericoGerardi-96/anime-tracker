import type { IFavorites } from '@/types/favorites';
import type { GetFavoritesOptions } from '@/interfaces/favorites-service';
import { matchesLibraryFilters } from './library-filters';
import { matchesLibrarySearch } from './library-search';

export function selectFavoritePage(favorites: (IFavorites & { created_at?: string })[], options: GetFavoritesOptions) {
  const pageSize = Math.max(1, options.pageSize ?? 15);
  const page = Math.max(1, options.page ?? 1);
  const mediaOf = (favorite: IFavorites) => Array.isArray(favorite.media) ? favorite.media[0] : favorite.media;
  const filtered = favorites.filter(favorite => {
    const media = mediaOf(favorite);
    return media && matchesLibrarySearch(options.query ?? '', [media.title, favorite.user_metadata?.custom_description, favorite.user_metadata?.custom_tags])
      && (!options.tags?.length || options.tags.some(tag => favorite.user_metadata?.custom_tags?.includes(tag)))
      && matchesLibraryFilters(media, options, favorite.progress?.status);
  });
  const direction = options.sortDirection === 'asc' ? 1 : -1;
  filtered.sort((a, b) => {
    const left = mediaOf(a), right = mediaOf(b);
    let comparison: number;
    if (options.sortBy === 'Title') comparison = left.title.localeCompare(right.title, 'es');
    else if (options.sortBy === 'Score' || options.sortBy === 'Year') {
      const key = options.sortBy === 'Score' ? 'score' : 'year';
      if (left[key] == null || right[key] == null) {
        if (left[key] != null) return -1;
        if (right[key] != null) return 1;
        return a.id.localeCompare(b.id);
      }
      comparison = left[key] - right[key];
    } else comparison = (Date.parse(a.created_at ?? '') || 0) - (Date.parse(b.created_at ?? '') || 0);
    return comparison * direction || a.id.localeCompare(b.id);
  });
  return { favorites: filtered.slice((page - 1) * pageSize, page * pageSize), totalCount: filtered.length, totalPages: Math.ceil(filtered.length / pageSize) };
}
