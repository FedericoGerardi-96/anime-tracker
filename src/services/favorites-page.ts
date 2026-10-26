import 'server-only';
import { selectFavoritePage } from '@/lib/favorite-collection';
import { hasExtendedLibraryFilters, filterValues } from '@/lib/library-filters';
import { getSupabaseServer, getAuthenticatedUser } from '@/services/supabase';
import { getAllFavoritesFull } from '@/services/favorites';
import type { FavoritesPageData, GetFavoritesOptions } from '@/interfaces/favorites-service';

export async function getFavoritesPageData(userId: string, options: GetFavoritesOptions): Promise<FavoritesPageData> {
  if (process.env.FAVORITES_RPC_ENABLED === 'true' && (process.env.LIBRARY_FILTERS_RPC_ENABLED === 'true' || !hasExtendedLibraryFilters(options))) {
    const user = await getAuthenticatedUser();
    if (!user || user.id !== userId) throw new Error('No autorizado');
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.rpc('get_my_favorites_page', { p_options: options });
    // Do not silently fall back on database errors after activation.
    if (error) { console.error('Favorites RPC failed:', error); throw new Error('No pudimos cargar tus favoritos.'); }
    if (!data || !Array.isArray(data.favorites) || !data.facets) throw new Error('Respuesta de favoritos inválida');
    return data as FavoritesPageData;
  }

  // Temporary compatibility path: remove after the SQL migration is deployed.
  const allFavorites = await getAllFavoritesFull(userId);
  const result = selectFavoritePage(allFavorites, options);
  const media = allFavorites.flatMap(favorite => {
    const item = Array.isArray(favorite.media) ? favorite.media[0] : favorite.media;
    return item ? [item] : [];
  });
  const tags = allFavorites.flatMap(favorite => {
    const item = Array.isArray(favorite.media) ? favorite.media[0] : favorite.media;
    if (filterValues(options.mediaType).length && !filterValues(options.mediaType).includes(item?.type ?? '')) return [];
    const metadata = (favorite as typeof favorite & { user_metadata?: { custom_tags?: string[] } | null }).user_metadata;
    return metadata?.custom_tags ?? [];
  });
  return { ...result, facets: {
    tags: [...new Set<string>(tags)].sort(),
    genres: [...new Set<string>(media.flatMap(item => item.genres ?? []))].sort(),
    years: [...new Set<number>(media.map(item => item.year).filter((year): year is number => Number.isInteger(year)))].sort((a, b) => b - a),
    formats: [...new Set<string>(media.map(item => item.format).filter((format): format is string => Boolean(format)))].sort(),
  } };
}
