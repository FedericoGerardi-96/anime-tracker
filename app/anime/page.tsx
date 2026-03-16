
import React, { Suspense } from 'react';
import AnimeCard from '@/components/cards/AnimeCard';
import AnimeFilters from '@/components/filters/AnimeFilters';
import { getAnimeList, mapJikanToAnimeCard } from '@/lib/jikan-service';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AnimeListPage({ searchParams }: Props) {
  const params = await searchParams;
  
  // Fetch data from Jikan
  const { data: animeData } = await getAnimeList({
    q: typeof params.q === 'string' ? params.q : undefined,
    genre: typeof params.genre === 'string' ? params.genre : undefined,
    status: typeof params.status === 'string' ? params.status : undefined,
    sort: typeof params.sort === 'string' ? params.sort : undefined,
    page: typeof params.page === 'string' ? params.page : 1,
  });

  const displayAnime = animeData.map(mapJikanToAnimeCard);

  return (
    <div className="flex-1 p-4 sm:p-8 lg:p-12 space-y-8 pt-24 lg:pt-28">
      {/* Filters Bar */}
      <div className="glass relative z-50 p-4 rounded-xl flex flex-col md:flex-row md:flex-wrap items-start md:items-center gap-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2 px-3 py-2 bg-background-light dark:bg-background-dark/50 rounded-lg border border-primary/10">
          <span className="material-symbols-outlined text-primary text-xl">filter_list</span>
          <span className="text-sm font-semibold">Filters</span>
        </div>
        
        <Suspense fallback={<div className="h-10 w-full sm:w-[500px] bg-slate-200 dark:bg-slate-800/50 rounded-lg animate-pulse" />}>
          <AnimeFilters />
        </Suspense>

        <div className="flex items-center gap-1 bg-primary/5 p-1 rounded-lg border border-primary/10 md:ml-auto w-full md:w-auto justify-center md:justify-start mt-2 md:mt-0">
          <button className="p-1.5 rounded bg-primary text-white w-1/2 md:w-auto flex items-center justify-center cursor-pointer">
            <span className="material-symbols-outlined text-sm">grid_view</span>
          </button>
          <button className="p-1.5 rounded text-slate-400 hover:bg-primary/10 transition-colors w-1/2 md:w-auto flex items-center justify-center cursor-pointer">
            <span className="material-symbols-outlined text-sm">view_list</span>
          </button>
        </div>
      </div>

      {/* Anime Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
        {displayAnime.map((anime) => (
          <AnimeCard key={anime.id} {...anime} />
        ))}
      </div>

      {animeData.length === 0 && (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
          <span className="material-symbols-outlined text-6xl text-text-muted mb-4">search_off</span>
          <p className="text-text-muted font-medium">No anime found matching these filters.</p>
        </div>
      )}

      {/* Load More */}
      {animeData.length > 0 && (
        <div className="flex justify-center py-8">
          <button className="flex items-center gap-2 px-8 py-3 bg-white/10 hover:bg-white/20 dark:bg-slate-800/50 dark:hover:bg-slate-800/80 backdrop-blur-md text-slate-900 dark:text-white rounded-full transition-all font-semibold border border-slate-200 dark:border-transparent cursor-pointer hover:scale-105 active:scale-95">
            <span className="material-symbols-outlined">expand_more</span>
            Load More Anime
          </button>
        </div>
      )}
    </div>
  );
}
