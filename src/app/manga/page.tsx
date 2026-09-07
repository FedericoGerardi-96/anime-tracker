import { Suspense } from 'react';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Catálogo de manga",
  description: "Explorá las colecciones de manga, manhwa y doujin más populares.",
};
import AnimeListContent from '@/components/anime/AnimeListContent';
import AniListFilters from '@/components/filters/AniListFilters';
import MalFilters from '@/components/filters/MalFilters';
import Pagination from '@/components/ui/Pagination';
import { getMangaListWithFavorites } from '@/services/manga';
import { getAuthenticatedUser } from '@/services/supabase';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function stringParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export default async function MangaListPage({ searchParams }: Readonly<Props>) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const filterKey = JSON.stringify(params);
  
  const user = await getAuthenticatedUser();

  const { displayManga, totalPages, hasNextPage, provider } = await getMangaListWithFavorites({
    q: stringParam(params.q), genre: stringParam(params.genre), excludeGenre: stringParam(params.excludeGenre),
    format: stringParam(params.format), minScore: Number(stringParam(params.minScore)) || undefined,
    status: stringParam(params.status), sort: stringParam(params.sort), year: Number(stringParam(params.year)) || undefined,
    page: currentPage,
  }, user?.id);

  return (
    <div className="flex-1 p-4 sm:p-8 lg:p-12 space-y-8">
      {/* Filters Bar */}
      <div className="glass relative z-50 p-4 rounded-xl flex flex-col md:flex-row md:flex-wrap items-start md:items-center gap-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2 px-3 py-2 bg-background-light dark:bg-background-dark/50 rounded-lg border border-primary/10">
          <span className="material-symbols-outlined text-primary text-xl">menu_book</span>
          <span className="text-sm font-semibold">Catálogo de {provider === 'anilist' ? 'AniList' : 'MyAnimeList'}</span>
        </div>
        
        <Suspense fallback={<div className="h-10 w-full sm:w-[500px] bg-slate-200 dark:bg-slate-800/50 rounded-lg animate-pulse" />}>
          {provider === 'anilist' ? <AniListFilters key={filterKey} mediaType='manga' /> : <MalFilters key={filterKey} mediaType='manga' />}
        </Suspense>
        {provider === 'myanimelist' && <p className='w-full text-xs text-amber-400'>AniList no está disponible. Se activó automáticamente el catálogo básico de MyAnimeList.</p>}
      </div>

      <div className="catalog-results space-y-8">
      {/* Pagination (Top) */}
      {(currentPage > 1 || hasNextPage) && (
        <div className="flex justify-between items-center sm:px-4">
          <p className="text-xs text-text-muted font-medium">
            Página <span className="text-text-primary font-bold">{currentPage}</span>
          </p>
        </div>
      )}

      {/* Manga Grid (Reusing AnimeListContent) */}
      <AnimeListContent animeList={displayManga} userId={user?.id} />

      {displayManga.length === 0 && (
        <div className="text-center py-24 bg-white/5 rounded-3xl border border-dashed border-white/10 mx-auto max-w-2xl">
          <span className="material-symbols-outlined text-7xl text-primary/40 mb-6 block" style={{ fontVariationSettings: "'FILL' 1" }}>search_off</span>
          <h3 className="text-xl font-bold text-text-primary mb-2">No encontramos resultados</h3>
          <p className="text-text-muted">
            {params.q 
              ? `No encontramos mangas que coincidan con “${params.q}”.`
              : "No encontramos mangas que coincidan con estos filtros."}
          </p>
          <Link 
            href="/manga"
            className="mt-6 inline-block px-6 py-2 bg-primary/20 text-primary rounded-lg font-bold hover:bg-primary hover:text-white transition-all cursor-pointer"
          >
            Limpiar filtros
          </Link>
        </div>
      )}

      {/* Pagination (Bottom) */}
      {(currentPage > 1 || hasNextPage) && (
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
        />
      )}
      </div>
    </div>
  );
}
