
import React, { Suspense } from 'react';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Manga Library",
  description: "Browse the most popular manga, manhwa and doujin collections.",
};
import AnimeListContent from '@/components/anime/AnimeListContent';
import AnimeFilters from '@/components/filters/AnimeFilters';
import Pagination from '@/components/ui/Pagination';
import { getMangaList, mapJikanToMangaCard } from '@/lib/jikan-service';
import { createClient } from '@/lib/supabase/server';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MangaListPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  
  // Fetch data from Jikan
  const { data: mangaData, pagination } = await getMangaList({
    q: typeof params.q === 'string' ? params.q : undefined,
    genre: typeof params.genre === 'string' ? params.genre : undefined,
    status: typeof params.status === 'string' ? params.status : undefined,
    sort: typeof params.sort === 'string' ? params.sort : undefined,
    page: currentPage,
  });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const favoriteMalIds = new Set<number>();
  if (user) {
    // Check standard favorites
    const { data: favs } = await supabase
      .from('favorites')
      .select('media!inner(mal_id)')
      .eq('user_id', user.id)
      .eq('media.type', 'manga');
      
    if (favs) {
      favs.forEach((f: { media: { mal_id: number } | { mal_id: number }[] }) => {
        const media = Array.isArray(f.media) ? f.media[0] : f.media;
        if (media?.mal_id) favoriteMalIds.add(Number(media.mal_id));
      });
    }

    // Check hentai vault (doujin type)
    const { data: hentaiFavs } = await supabase
      .from('hentai')
      .select('mal_id')
      .eq('user_id', user.id)
      .not('mal_id', 'is', null);

    if (hentaiFavs) {
      hentaiFavs.forEach((h: { mal_id: number }) => {
        favoriteMalIds.add(Number(h.mal_id));
      });
    }
  }

  const displayManga = mangaData.map((manga) => {
    const card = mapJikanToMangaCard(manga);
    card.isFavorite = favoriteMalIds.has(manga.mal_id);
    return card;
  });

  const totalPages = pagination?.last_visible_page || 1;

  return (
    <div className="flex-1 p-4 sm:p-8 lg:p-12 space-y-8 pt-24 lg:pt-28">
      {/* Filters Bar */}
      <div className="glass relative z-50 p-4 rounded-xl flex flex-col md:flex-row md:flex-wrap items-start md:items-center gap-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2 px-3 py-2 bg-background-light dark:bg-background-dark/50 rounded-lg border border-primary/10">
          <span className="material-symbols-outlined text-primary text-xl">menu_book</span>
          <span className="text-sm font-semibold">Manga Library</span>
        </div>
        
        <Suspense fallback={<div className="h-10 w-full sm:w-[500px] bg-slate-200 dark:bg-slate-800/50 rounded-lg animate-pulse" />}>
          <AnimeFilters hideSeason />
        </Suspense>
      </div>

      {/* Pagination (Top) */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center sm:px-4">
          <p className="text-xs text-text-muted font-medium">
            Page <span className="text-text-primary font-bold">{currentPage}</span> of <span className="text-text-primary font-bold">{totalPages}</span>
          </p>
        </div>
      )}

      {/* Manga Grid (Reusing AnimeListContent) */}
      <AnimeListContent animeList={displayManga} userId={user?.id} />

      {mangaData.length === 0 && (
        <div className="text-center py-24 bg-white/5 rounded-3xl border border-dashed border-white/10 mx-auto max-w-2xl">
          <span className="material-symbols-outlined text-7xl text-primary/40 mb-6 block" style={{ fontVariationSettings: "'FILL' 1" }}>search_off</span>
          <h3 className="text-xl font-bold text-text-primary mb-2">No results found</h3>
          <p className="text-text-muted">
            {params.q 
              ? `We couldn't find any manga matching "${params.q}".`
              : "No manga found matching these filters."}
          </p>
          <Link 
            href="/manga"
            className="mt-6 inline-block px-6 py-2 bg-primary/20 text-primary rounded-lg font-bold hover:bg-primary hover:text-white transition-all cursor-pointer"
          >
            Clear all filters
          </Link>
        </div>
      )}

      {/* Pagination (Bottom) */}
      {totalPages > 1 && (
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={pagination.has_next_page}
        />
      )}
    </div>
  );
}
