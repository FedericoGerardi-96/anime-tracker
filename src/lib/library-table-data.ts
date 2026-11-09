import type { IFavorites } from '@/types/favorites';
import type { ListMediaItem } from '@/interfaces/lists';
import type { LibraryRow } from './library-editor';

export function favoriteTableRows(favorites: IFavorites[]): LibraryRow[] {
  return favorites.flatMap(favorite => {
    const media = Array.isArray(favorite.media) ? favorite.media[0] : favorite.media;
    if (!media || (media.type !== 'anime' && media.type !== 'manga')) return [];
    return [{id:media.id,malId:media.mal_id,title:media.title,image:media.image,type:media.type,format:media.format,score:media.score,total:media.total_units,
      catalogStatus:media.status,status:favorite.progress?.status,episode:favorite.progress?.current_episode ?? 0,note:favorite.user_metadata?.custom_description ?? '',tags:favorite.user_metadata?.custom_tags ?? [],watchLink:favorite.user_metadata?.watch_link ?? ''}];
  });
}
export function listTableRows(items: ListMediaItem[]): LibraryRow[] {
  return items.flatMap(item => {
    const media = item.media;
    if (media.type !== 'anime' && media.type !== 'manga') return [];
    return [{id:media.id,malId:media.mal_id,title:media.title,image:media.image,type:media.type,format:media.format,score:media.score,total:media.total_units,
      catalogStatus:media.status,status:item.status,episode:item.current_episode ?? 0,note:item.custom_description ?? '',tags:item.custom_tags ?? [],watchLink:item.watch_link ?? ''}];
  });
}
