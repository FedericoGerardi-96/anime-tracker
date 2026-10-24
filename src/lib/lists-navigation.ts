import { libraryYear } from '@/lib/library-filters';
import type { CatalogSearchParams } from '@/interfaces/page';
import type { ListsOptions, ListTab } from '@/interfaces/lists';
export const LIST_TABS = [
  { id: 'watching', label: 'Viendo / Leyendo', icon: 'visibility' },
  { id: 'completed', label: 'Completados', icon: 'done_all' },
  { id: 'plan_to_watch', label: 'Pendientes', icon: 'schedule' },
  { id: 'on_hold', label: 'En pausa', icon: 'pause_circle' },
  { id: 'dropped', label: 'Abandonados', icon: 'cancel' },
  { id: 'custom_lists', label: 'Listas personalizadas', icon: 'folder_special' },
] as const;
export function parseListsOptions(params: CatalogSearchParams): ListsOptions {
  const value = (key: string) => typeof params[key] === 'string' ? params[key] as string : undefined;
  const tab = LIST_TABS.some(tab => tab.id === value('tab')) ? value('tab') as ListTab : 'watching';
  const positive = (key: string) => { const number = Number(value(key)); return Number.isFinite(number) && number > 0 ? number : undefined; };
  return { tab, listId: tab === 'custom_lists' ? value('list') : undefined,
    query: value('q')?.trim() ?? '', page: Math.min(1000000, Math.max(1, Math.floor(positive('page') ?? 1))), pageSize: 18,
    mediaType: value('type')?.split(',').filter((type) => type === 'anime' || type === 'manga').join(',') || undefined,
    excludeGenre: value('excludeGenre'), yearFrom: libraryYear(value('yearFrom')), yearTo: libraryYear(value('yearTo')), scoreBands: value('scoreBands'),
    status: tab === 'custom_lists' ? value('status') : undefined,
    tags: value('tags')?.split(',').filter(Boolean) ?? [], genre: value('genre'), catalogStatus: value('catalogStatus'),
    year: Number.isInteger(positive('year')) ? positive('year') : undefined, season: value('season'), format: value('format'), minScore: positive('minScore'),
    sortBy: value('sort') ?? 'Date Added', sortDirection: value('direction') === 'asc' ? 'asc' : 'desc' };
}
