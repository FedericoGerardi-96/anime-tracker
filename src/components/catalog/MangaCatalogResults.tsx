import ProviderChoice from '@/components/catalog/ProviderChoice';
import { getCatalogProvider } from '@/services/catalog-provider';
import { ProviderRequestError } from '@/services/provider-request';
import { Suspense } from 'react';
import { CatalogInteraction, CatalogResultsArea } from '@/components/catalog/CatalogInteraction';
import Link from 'next/link';
import type { CatalogResultsProps } from '@/interfaces/page';


import AnimeListContent from '@/components/anime/AnimeListContent';
import AniListFilters from '@/components/filters/AniListFilters';
import MalFilters from '@/components/filters/MalFilters';
import Pagination from '@/components/ui/Pagination';
import { getMangaListWithFavorites } from '@/services/manga';
import { getAuthenticatedUser } from '@/services/supabase';



function stringParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export default async function MangaCatalogResults({ params }: Readonly<CatalogResultsProps>) {
  const currentPage = Number(params.page) || 1;

  
  const user = await getAuthenticatedUser();

  let result;
  try {
  result = await getMangaListWithFavorites({
    q: stringParam(params.q), genre: stringParam(params.genre), excludeGenre: stringParam(params.excludeGenre),
    yearFrom: Number(stringParam(params.yearFrom)) || undefined, yearTo: Number(stringParam(params.yearTo)) || undefined,
    scoreBands: stringParam(params.scoreBands), format: stringParam(params.format), minScore: Number(stringParam(params.minScore)) || undefined,
    status: stringParam(params.status), sort: stringParam(params.sort), year: Number(stringParam(params.year)) || undefined,
    page: currentPage,
  }, user?.id);
  } catch (error) {
    if (!(error instanceof ProviderRequestError)) throw error;
    return <ProviderChoice provider={await getCatalogProvider()} failed retryAfterMs={error.retryAfterMs} />;
  }
  const { displayManga, totalPages, hasNextPage, provider } = result;

  return (
    <CatalogInteraction>
    <ProviderChoice provider={provider} />
    <div className={provider === 'anilist' ? 'grid items-start gap-6 lg:grid-cols-[276px_minmax(0,1fr)]' : 'space-y-8'}>
      {/* Filters Bar */}
      <div className={provider === 'anilist' ? 'relative z-30 min-w-0 space-y-3 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-3 lg:[scrollbar-gutter:stable] lg:[scrollbar-width:thin] lg:[scrollbar-color:var(--color-primary)_transparent]' : 'glass relative z-30 rounded-xl p-4 space-y-4'}>
        <div className="flex items-center gap-2 px-3 py-2 bg-background-light dark:bg-background-dark/50 rounded-lg border border-primary/10">
          <span className="material-symbols-outlined text-primary text-xl">menu_book</span>
          <span className="text-sm font-semibold">Catálogo de {provider === 'anilist' ? 'AniList' : 'MyAnimeList'}</span>
        </div>
        
        <Suspense fallback={<div className="h-10 w-full sm:w-[500px] bg-slate-200 dark:bg-slate-800/50 rounded-lg animate-pulse" />}>
          {provider === 'anilist' ? <AniListFilters mediaType='manga' /> : <MalFilters mediaType='manga' />}
        </Suspense>
      </div>

      <CatalogResultsArea>
      <div className="catalog-results min-w-0 space-y-8">
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
          <h2 className="text-xl font-bold text-text-primary mb-2">No encontramos resultados</h2>
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
      </CatalogResultsArea>
    </div>
    </CatalogInteraction>
  );
}
