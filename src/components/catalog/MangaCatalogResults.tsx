import ProviderChoice from '@/components/catalog/ProviderChoice';
import { getCatalogProvider } from '@/services/catalog-provider';
import { ProviderRequestError } from '@/services/provider-request';
import { Suspense } from 'react';
import { CatalogInteraction, CatalogResultsArea } from '@/components/catalog/CatalogInteraction';
import Link from 'next/link';
import type { CatalogResultsProps } from '@/interfaces/page';


import AnimeListContent from '@/components/anime/AnimeListContent';
import CatalogFilters from '@/components/catalog/CatalogFilters';
import CatalogActiveFilters from '@/components/catalog/CatalogActiveFilters';
import CatalogSort from '@/components/catalog/CatalogSort';
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
    <ProviderChoice provider={provider} compact />
    <div className={provider === 'anilist' ? 'grid items-start gap-6 min-[1400px]:grid-cols-[276px_minmax(0,1fr)]' : 'space-y-8'}>
      {/* Filters Bar */}
      <div className={provider === 'anilist' ? 'relative z-30 min-w-0 min-[1400px]:sticky min-[1400px]:top-20 min-[1400px]:max-h-[calc(100dvh-6rem)] min-[1400px]:overflow-y-auto min-[1400px]:overscroll-contain min-[1400px]:rounded-l-2xl min-[1400px]:border min-[1400px]:border-border min-[1400px]:bg-card min-[1400px]:[scrollbar-width:thin] min-[1400px]:[scrollbar-color:var(--muted-foreground)_transparent]' : 'relative z-30 space-y-4 rounded-2xl border border-border bg-card p-4'}>
        <Suspense fallback={<div className="h-10 w-full rounded-lg bg-muted motion-safe:animate-pulse" />}>
          {provider === 'anilist' ? <CatalogFilters mediaType='manga' /> : <MalFilters key={stringParam(params.sort) ?? 'popularity'} mediaType='manga' showSort={false} />}
        </Suspense>
      </div>

      <CatalogResultsArea>
      <div className="catalog-results min-w-0 space-y-8">
      <div className="flex flex-wrap items-center gap-3"><CatalogActiveFilters /><CatalogSort provider={provider} /></div>
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
            className="mt-6 inline-block px-6 py-2 bg-primary/20 text-primary rounded-lg font-bold hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
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
