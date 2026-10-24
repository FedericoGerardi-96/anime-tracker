import 'server-only';
import { getAuthenticatedUser, getSupabaseServer } from './supabase';
import { getLists, getListMedia, getMediaByProgressStatus } from '@/lib/actions/lists';
import { matchesLibraryFilters, hasExtendedLibraryFilters } from '@/lib/library-filters';
import { matchesLibrarySearch } from '@/lib/library-search';
import type { ListsOptions, ListsPageData, ListMediaItem, CustomList } from '@/interfaces/lists';

export async function getListsPageData(options: ListsOptions): Promise<ListsPageData> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('No autorizado');
  const supabase = await getSupabaseServer();
  const empty: ListsPageData = { items: [], lists: [], selectedList: null, totalCount: 0, totalPages: 0, facets: { tags: [], genres: [], years: [], formats: [] } };
  if (options.listId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(options.listId)) return empty;
  if (process.env.LISTS_RPC_ENABLED === 'true' && (process.env.LIBRARY_FILTERS_RPC_ENABLED === 'true' || !hasExtendedLibraryFilters(options))) {
    const { data, error } = await supabase.rpc('get_my_lists_page', { p_options: options });
    if (error) { console.error('Lists RPC failed:', error); throw new Error('No pudimos cargar tus listas.'); }
    if (!data || !Array.isArray(data.items) || !Array.isArray(data.lists) || !data.facets) throw new Error('Respuesta de listas inválida');
    return data as ListsPageData;
  }

  // Compatibility until the SQL migration is applied; only the visible page reaches the client.
  const from = (options.page - 1) * options.pageSize;
  if (options.tab === 'custom_lists' && !options.listId) {
    const { data, error } = await getLists();
    if (error) throw new Error('No pudimos cargar tus listas.');
    const lists = (data as CustomList[] ?? []).filter(list => matchesLibrarySearch(options.query ?? '', [list.name, list.description]));
    return { ...empty, lists: lists.slice(from, from + options.pageSize), totalCount: lists.length, totalPages: Math.ceil(lists.length / options.pageSize) };
  }
  let selectedList: CustomList | null = null;
  if (options.listId) {
    const { data, error } = await supabase.from('lists').select('id, name, description').eq('id', options.listId).eq('user_id', user.id).maybeSingle();
    if (error) throw new Error('No pudimos cargar la lista.');
    if (!data) return empty;
    selectedList = data;
  }
  const raw = options.listId ? await getListMedia(options.listId) : await getMediaByProgressStatus(options.tab);
  const items = (raw as unknown as ListMediaItem[]).flatMap(item => {
    const media = Array.isArray(item.media) ? item.media[0] : item.media;
    return media ? [{ ...item, media }] : [];
  });
  const filtered = items.filter(item => {
    const m = item.media;
    return matchesLibrarySearch(options.query ?? '', [m.title, item.custom_description, m.genres ?? [], item.custom_tags ?? []])
      && (!options.tags?.length || options.tags.some((tag) => item.custom_tags?.includes(tag)))
      && matchesLibraryFilters(m, options, item.status);
  });
  const direction = options.sortDirection === 'asc' ? 1 : -1;
  filtered.sort((a, b) => {
    let comparison: number;
    if (options.sortBy === 'Title') comparison = a.media.title.localeCompare(b.media.title, 'es');
    else if (options.sortBy === 'Score') comparison = (a.media.score ?? 0) - (b.media.score ?? 0);
    else if (options.sortBy === 'Year') comparison = (a.media.year ?? 0) - (b.media.year ?? 0);
    else comparison = (Date.parse(a.updated_at ?? a.created_at ?? '') || 0) - (Date.parse(b.updated_at ?? b.created_at ?? '') || 0);
    return comparison * direction || a.id.localeCompare(b.id);
  });
  return { ...empty, selectedList, items: filtered.slice(from, from + options.pageSize), totalCount: filtered.length, totalPages: Math.ceil(filtered.length / options.pageSize), facets: {
    tags: [...new Set(items.flatMap(item => item.custom_tags ?? []))].sort(),
    genres: [...new Set(items.flatMap(item => item.media.genres ?? []))].sort(),
    years: [...new Set(items.map(item => item.media.year).filter((year): year is number => Number.isInteger(year)))].sort((a, b) => b - a),
    formats: [...new Set(items.map(item => item.media.format).filter((format): format is string => Boolean(format)))].sort(),
  } };
}
