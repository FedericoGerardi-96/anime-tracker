'use client';
import { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import AddToListModal from '@/components/ui/AddToListModal';
import AuthModal from '@/components/auth/AuthModal';
import { getLists, getMediaByProgressStatus, getListMedia } from '@/lib/actions/lists';
import { useToast } from '@/components/ui/Toast';
import ListsTabs, { TABS } from '@/components/lists/ListsTabs';
import LibrarySearch from '@/components/lists/LibrarySearch';
import MediaGrid from '@/components/lists/MediaGrid';
import CustomListsGrid from '@/components/lists/CustomListsGrid';
import LibraryFilterBar from '@/components/library/LibraryFilterBar';
import FavoritesPaginator from '@/components/favorites/FavoritesPaginator';
import Loader from '@/components/ui/Loader';
import { matchesLibrarySearch } from '@/lib/library-search';


interface ListsContentProps {
  initialUser: { id: string } | null;
  initialMediaItems: any[];
  initialCustomLists: any[];
}

export default function ListsContent({ initialUser, initialMediaItems, initialCustomLists }: Readonly<ListsContentProps>) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('watching');
  const [selectedList, setSelectedList] = useState<{ id: string; name: string } | null>(null);

  const [mediaItems, setMediaItems] = useState<any[]>(initialMediaItems);
  const [customLists, setCustomLists] = useState<any[]>(initialCustomLists);
  const [loading, setLoading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { error } = useToast();

  const user = initialUser;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch data when tab changes (skip initial "watching" since server already loaded it)
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    setSelectedList(null);
    setSearchQuery('');
    fetchData();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    setLoading(true);

    if (activeTab === 'custom_lists') {
      const { data, error: fetchError } = await getLists();
      if (!fetchError && data) {
        setCustomLists(data);
      }
    } else {
      const data = await getMediaByProgressStatus(activeTab);
      setMediaItems(data);
    }

    setLoading(false);
  };

  const handleOpenList = async (list: { id: string; name: string }) => {
    setSelectedList({ id: list.id, name: list.name });
    setSearchQuery('');
    setLoading(true);
    const data = await getListMedia(list.id);
    setMediaItems(data);
    setLoading(false);
  };

  const handleCreateNew = () => {
    if (user) {
      setIsModalOpen(true);
    } else {
      error('Please login to create custom lists');
      setIsAuthModalOpen(true);
    }
  };

  const mediaQuery = searchParams.get('q')?.trim().toLowerCase() ?? '';
  const selectedType = searchParams.get('type') ?? 'all';
  const selectedTags = searchParams.get('tags')?.split(',').filter(Boolean) ?? [];
  const selectedGenre = searchParams.get('genre');
  const selectedCatalogStatus = searchParams.get('catalogStatus');
  const selectedYear = Number(searchParams.get('year')) || undefined;
  const selectedSeason = searchParams.get('season');
  const selectedFormat = searchParams.get('format');
  const minimumScore = Number(searchParams.get('minScore')) || undefined;
  const selectedSort = searchParams.get('sort') ?? 'Date Added';
  const sortDirection = searchParams.get('direction') === 'asc' ? 1 : -1;
  const currentPage = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = 18;

  const filteredItems = useMemo(() => {
    const result = mediaItems.filter((item) => {
      const tags = (item.media?.tags ?? []) as string[];
      const genres = (item.media?.genres ?? []) as string[];
      const matchesSearch = matchesLibrarySearch(mediaQuery, [item.media?.title, item.media?.description, genres, tags]);
      const matchesType = selectedType === 'all' || item.media?.type === selectedType;
      const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => tags.includes(tag));
      const matchesGenre = !selectedGenre || genres.includes(selectedGenre);
      const statusGroups: Record<string, string[]> = { RELEASING: ['RELEASING', 'currently_airing', 'currently_publishing'], FINISHED: ['FINISHED', 'finished_airing', 'finished'], NOT_YET_RELEASED: ['NOT_YET_RELEASED', 'not_yet_aired', 'not_yet_published'], HIATUS: ['HIATUS', 'on_hiatus'], CANCELLED: ['CANCELLED', 'discontinued'] };
      const matchesCatalogStatus = !selectedCatalogStatus || (statusGroups[selectedCatalogStatus] ?? [selectedCatalogStatus]).includes(item.media?.status);
      return matchesSearch && matchesType && matchesTags && matchesGenre && matchesCatalogStatus
        && (!selectedYear || item.media?.year === selectedYear)
        && (!selectedSeason || item.media?.season === selectedSeason)
        && (!selectedFormat || item.media?.format === selectedFormat)
        && (!minimumScore || (item.media?.score ?? 0) >= minimumScore);
    });
    return result.sort((a, b) => {
      if (selectedSort === 'Title') return (a.media?.title ?? '').localeCompare(b.media?.title ?? '', 'es') * sortDirection;
      if (selectedSort === 'Score') return ((a.media?.score ?? 0) - (b.media?.score ?? 0)) * sortDirection;
      if (selectedSort === 'Year') return ((a.media?.year ?? 0) - (b.media?.year ?? 0)) * sortDirection;
      const aDate = Date.parse(a.updated_at ?? a.created_at ?? '') || 0;
      const bDate = Date.parse(b.updated_at ?? b.created_at ?? '') || 0;
      return (aDate - bDate) * sortDirection;
    });
  }, [mediaItems, mediaQuery, selectedSort, selectedTags, selectedType, sortDirection, selectedGenre, selectedCatalogStatus, selectedYear, selectedSeason, selectedFormat, minimumScore]);

  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const visibleItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const availableTags = useMemo(() => Array.from(new Set(mediaItems.flatMap((item) => item.media?.tags ?? []))).sort() as string[], [mediaItems]);
  const availableGenres = useMemo(() => Array.from(new Set(mediaItems.flatMap((item) => item.media?.genres ?? []))).sort() as string[], [mediaItems]);
  const availableYears = useMemo(() => Array.from(new Set(mediaItems.map((item) => item.media?.year).filter((year): year is number => Number.isInteger(year)))).sort((a, b) => b - a), [mediaItems]);
  const availableFormats = useMemo(() => Array.from(new Set(mediaItems.map((item) => item.media?.format).filter((format): format is string => Boolean(format)))).sort(), [mediaItems]);

  // Client-side filter on custom lists
  const filteredLists = useMemo(() => {
    if (!searchQuery.trim()) return customLists;
    const q = searchQuery.toLowerCase();
    return customLists.filter((list) => {
      const name = (list.name || '').toLowerCase();
      const desc = (list.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [searchQuery, customLists]);

  const showMediaSearch = activeTab !== 'custom_lists' || selectedList !== null;
  const currentTabLabel = TABS.find((t) => t.id === activeTab)?.label || '';
  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    router.replace(`${pathname}${params.size ? `?${params}` : ''}`);
    setActiveTab(tab);
  };

  const handleStatusUpdated = (mediaId: string, status: string) => {
    if (!selectedList && status !== activeTab) {
      setMediaItems((items) => items.filter((item) => item.media?.id !== mediaId));
    }
  };

  let content;
  if (loading) {
    content = (
      <Loader label='Cargando tu biblioteca…' size='lg' className='py-32' />
    );
  } else if (activeTab === 'custom_lists' && !selectedList) {
    content = (
      <CustomListsGrid
        lists={filteredLists}
        onOpenList={handleOpenList}
        onCreateNew={handleCreateNew}
      />
    );
  } else {
    content = (
      <div className='space-y-6'>
        {selectedList && (
          <div className='flex justify-between items-center bg-white/5 rounded-2xl p-4 border border-white/10'>
            <div className='flex items-center gap-4'>
              <button
                onClick={() => {
                  setSelectedList(null);
                  setSearchQuery('');
                }}
                className='w-10 h-10 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-colors cursor-pointer text-white'
              >
                <span className='material-symbols-outlined'>arrow_back</span>
              </button>
              <div>
                <h2 className='text-xl font-black text-white'>{selectedList.name}</h2>
                <p className='text-xs text-slate-400 font-bold uppercase tracking-wider'>
                  {filteredItems.length} elementos
                </p>
              </div>
            </div>
          </div>
        )}

        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6'>
          <MediaGrid
            items={visibleItems}
            searchQuery={mediaQuery}
            activeTabLabel={currentTabLabel}
            selectedListName={selectedList?.name}
            onStatusUpdated={handleStatusUpdated}
          />
        </div>
        <FavoritesPaginator currentPage={currentPage} totalPages={totalPages} />
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className='flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8'>
        <div>
          <h1 className='text-3xl font-extrabold tracking-tight text-text-primary'>Mis listas</h1>
          <p className='text-text-muted text-sm mt-1'>Seguí tu progreso y organizá tus colecciones</p>
        </div>
        {activeTab === 'custom_lists' && !selectedList && (
          <button
            onClick={handleCreateNew}
            className='flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary/20 cursor-pointer'
          >
            <span className='material-symbols-outlined text-xl'>add_circle</span>{''}
            Nueva lista personalizada
          </button>
        )}
      </div>

      {/* Tabs */}
      <ListsTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Search Bar — for progress tabs or inside a custom list */}
      {showMediaSearch && (
        <LibraryFilterBar availableTags={availableTags} availableGenres={availableGenres} availableYears={availableYears} availableFormats={availableFormats} defaultQuery={searchParams.get('q') ?? ''} showStatus={false} />
      )}

      {/* Search for custom lists folder view */}
      {activeTab === 'custom_lists' && !selectedList && (
        <div className='mb-6'>
          <LibrarySearch value={searchQuery} onChange={setSearchQuery} />
          {searchQuery && (
            <p className='text-xs text-slate-500 mt-2 ml-1'>
              {filteredLists.length} {filteredLists.length === 1 ? 'lista encontrada' : 'listas encontradas'} para &quot;{searchQuery}&quot;
            </p>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className='min-h-[50vh]'>
        {content}
      </div>

      {/* Modals */}
      <AddToListModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onListCreated={fetchData} mode='create' />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
