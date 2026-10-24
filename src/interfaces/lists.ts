import type { GetFavoritesOptions, FavoriteFacets } from './favorites-service';
export type ListTab = 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped' | 'custom_lists';
export interface CustomList { id: string; name: string; description?: string | null }
export interface ListMediaItem {
  id: string; current_episode?: number | null; status?: string | null;
  updated_at?: string | null; created_at?: string | null;
  custom_description?: string | null; custom_tags?: string[] | null;
  media: { id: string; mal_id: number; title: string; image: string; type: string; genres?: string[] | null; year?: number | null; season?: string | null; format?: string | null; status?: string | null; score?: number | null };
}
export interface ListsOptions extends GetFavoritesOptions { tab: ListTab; listId?: string; page: number; pageSize: number }
export interface ListsPageData { items: ListMediaItem[]; lists: CustomList[]; selectedList: CustomList | null; totalCount: number; totalPages: number; facets: FavoriteFacets }
export interface ListsContentProps { options: ListsOptions }
export interface ListsTabsProps { activeTab: ListTab }
export interface CustomListsGridProps { lists: CustomList[] }
export interface MediaGridProps { items: ListMediaItem[]; searchQuery: string; activeTabLabel: string; selectedListName?: string }
