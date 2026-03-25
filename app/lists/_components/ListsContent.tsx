'use client';

import { useState, useEffect, useMemo } from 'react';
import AddToListModal from '@/components/ui/AddToListModal';
import AuthModal from '@/components/auth/AuthModal';
import { getLists, getMediaByProgressStatus, getListMedia } from '@/lib/actions/lists';
import { useToast } from '@/components/ui/Toast';

import ListsTabs, { TABS } from './ListsTabs';
import LibrarySearch from './LibrarySearch';
import MediaGrid from './MediaGrid';
import CustomListsGrid from './CustomListsGrid';

interface ListsContentProps {
  initialUser: { id: string } | null;
  initialMediaItems: any[];
  initialCustomLists: any[];
}

export default function ListsContent({ initialUser, initialMediaItems, initialCustomLists }: ListsContentProps) {
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
    if (!user) {
      error('Please login to create custom lists');
      setIsAuthModalOpen(true);
    } else {
      setIsModalOpen(true);
    }
  };

  // Client-side filter on media items
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return mediaItems;
    const q = searchQuery.toLowerCase();
    return mediaItems.filter((item) => {
      const title = (item.media?.title || '').toLowerCase();
      const description = (item.media?.description || '').toLowerCase();
      return title.includes(q) || description.includes(q);
    });
  }, [searchQuery, mediaItems]);

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

  return (
    <>
      {/* Page Header */}
      <div className='flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8'>
        <div>
          <h1 className='text-3xl font-extrabold tracking-tight text-text-primary'>Library</h1>
          <p className='text-text-muted text-sm mt-1'>Track your progress and organize your collections</p>
        </div>
        {activeTab === 'custom_lists' && !selectedList && (
          <button
            onClick={handleCreateNew}
            className='flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary/20 cursor-pointer'
          >
            <span className='material-symbols-outlined text-xl'>add_circle</span>
            New Custom List
          </button>
        )}
      </div>

      {/* Tabs */}
      <ListsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Search Bar — for progress tabs or inside a custom list */}
      {showMediaSearch && (
        <div className='mb-6'>
          <LibrarySearch value={searchQuery} onChange={setSearchQuery} />
          {searchQuery && (
            <p className='text-xs text-slate-500 mt-2 ml-1'>
              {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
            </p>
          )}
        </div>
      )}

      {/* Search for custom lists folder view */}
      {activeTab === 'custom_lists' && !selectedList && (
        <div className='mb-6'>
          <LibrarySearch value={searchQuery} onChange={setSearchQuery} />
          {searchQuery && (
            <p className='text-xs text-slate-500 mt-2 ml-1'>
              {filteredLists.length} list{filteredLists.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
            </p>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className='min-h-[50vh]'>
        {loading ? (
          <div className='py-32 flex justify-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary' />
          </div>
        ) : activeTab === 'custom_lists' && !selectedList ? (
          <CustomListsGrid
            lists={filteredLists}
            onOpenList={handleOpenList}
            onCreateNew={handleCreateNew}
          />
        ) : (
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
                      {filteredItems.length} items
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6'>
              <MediaGrid
                items={filteredItems}
                searchQuery={searchQuery}
                activeTabLabel={currentTabLabel}
                selectedListName={selectedList?.name}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddToListModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onListCreated={fetchData} mode='create' />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
