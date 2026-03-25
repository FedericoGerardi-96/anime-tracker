
import React, { Suspense } from 'react';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Anime Library",
  description: "Browse and filter the latest and most popular anime series.",
};
import AnimeListContent from '@/components/anime/AnimeListContent';
import AnimeFilters from '@/components/filters/AnimeFilters';
import Pagination from '@/components/ui/Pagination';
import { getAnimeList, mapJikanToAnimeCard, getSeasons } from '@/lib/jikan-service';
import { createClient } from '@/lib/supabase/server';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AnimeListPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  
  // Fetch data from Jikan
  const [animeResponse, seasonsArchive] = await Promise.all([
    getAnimeList({
      q: typeof params.q === 'string' ? params.q : undefined,
      genre: typeof params.genre === 'string' ? params.genre : undefined,
      status: typeof params.status === 'string' ? params.status : undefined,
      sort: typeof params.sort === 'string' ? params.sort : undefined,
      season: typeof params.season === 'string' ? params.season : undefined,
      page: currentPage,
    }),
    getSeasons()
  ]);

  const { data: animeData, pagination } = animeResponse;

  // Transform seasons archive for the filter
  // We'll take the most recent 10 years or something similar
  const seasonOptions = seasonsArchive.slice(0, 5).flatMap(yearData => 
    yearData.seasons.map((s: string) => ({
      label: `${yearData.year} ${s.charAt(0).toUpperCase() + s.slice(1)}`,
      value: `${s}-${yearData.year}`
    }))
  );

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const favoriteMalIds = new Set<number>();
  if (user) {
    // Check standard favorites
    const { data: favs } = await supabase
      .from('favorites')
      .select('media!inner(mal_id)')
      .eq('user_id', user.id);
      
    if (favs) {
      favs.forEach((f: { media: { mal_id: number } | { mal_id: number }[] }) => {
        const media = Array.isArray(f.media) ? f.media[0] : f.media;
        if (media?.mal_id) favoriteMalIds.add(Number(media.mal_id));
      });
    }

    // Check hentai vault
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

  const displayAnime = animeData.map((anime) => {
    const card = mapJikanToAnimeCard(anime);
    card.isFavorite = favoriteMalIds.has(anime.mal_id);
    return card;
  });

  const totalPages = pagination?.last_visible_page || 1;

  return (
    <div className="flex-1 p-4 sm:p-8 lg:p-12 space-y-8 pt-24 lg:pt-28">
      {/* Filters Bar */}
      <div className="glass relative z-50 p-4 rounded-xl flex flex-col md:flex-row md:flex-wrap items-start md:items-center gap-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2 px-3 py-2 bg-background-light dark:bg-background-dark/50 rounded-lg border border-primary/10">
          <span className="material-symbols-outlined text-primary text-xl">filter_list</span>
          <span className="text-sm font-semibold">Filters</span>
        </div>
        
        <Suspense fallback={<div className="h-10 w-full sm:w-[500px] bg-slate-200 dark:bg-slate-800/50 rounded-lg animate-pulse" />}>
          <AnimeFilters seasonOptions={seasonOptions} />
        </Suspense>
      </div>

      {/* Pagination (Top) - Optional, but helpful for long lists */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center sm:px-4">
          <p className="text-xs text-text-muted font-medium">
            Page <span className="text-text-primary font-bold">{currentPage}</span> of <span className="text-text-primary font-bold">{totalPages}</span>
          </p>
        </div>
      )}

      {/* Anime Grid */}
      <AnimeListContent animeList={displayAnime} userId={user?.id} />

      {animeData.length === 0 && (
        <div className="text-center py-24 bg-white/5 rounded-3xl border border-dashed border-white/10 mx-auto max-w-2xl">
          <span className="material-symbols-outlined text-7xl text-primary/40 mb-6 block" style={{ fontVariationSettings: "'FILL' 1" }}>search_off</span>
          <h3 className="text-xl font-bold text-text-primary mb-2">No results found</h3>
          <p className="text-text-muted">
            {params.q 
              ? `We couldn't find any anime matching "${params.q}". Try a different spelling or general term.`
              : "No anime found matching these filters."}
          </p>
          <Link 
            href="/anime"
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
