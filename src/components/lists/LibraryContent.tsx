import LibraryTableSkeleton from '@/components/fallbacks/LibraryTableSkeleton';
import { hydrateLibraryRows } from '@/services/library-table';
import ListHero from './ListHero';
import { libraryYear } from '@/lib/library-filters';
import { CatalogInteraction, CatalogResultsArea } from '@/components/catalog/CatalogInteraction';
import type { FavoritesSearchParams } from "@/interfaces/favorites-service";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/services/supabase";
import { getFavoritesPageData } from "@/services/favorites-page";
import Pagination from "@/components/ui/Pagination";
import ExportFavoritesButton from "@/components/favorites/ExportFavoritesButton";
import LibraryToolbar from "./LibraryToolbar";
import LibraryTable from "./LibraryTable";
import { favoriteTableRows } from "@/lib/library-table-data";
import LibraryConnectionsCard from "@/components/favorites/LibraryConnectionsCard";
import { getAniListConnectionStatus } from "@/services/anilist-connection";
import { getMalConnectionStatus } from "@/services/myanimelist-connection";

const PAGE_SIZE = 15;



export default async function LibraryContent({
  searchParams,
}: Readonly<{
  searchParams: Promise<FavoritesSearchParams>;
}>) {
  const user = await getAuthenticatedUser();

  if (!user) redirect("/");

  const params = await searchParams;
  const currentPage = Math.min(1000000, Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1));
  const query = (params.q ?? "").trim();
  const tagsParam = (params.tags ?? "").trim();
  const selectedTags = tagsParam ? tagsParam.split(",") : [];
  const sort = (params.sort ?? "").trim();
  const status = (params.status ?? "").trim();
  const mediaType = params.type?.split(",").filter((type) => type === "anime" || type === "manga").join(",") || undefined;
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [{ favorites, totalCount, totalPages }, malConnection, anilistConnection] = await Promise.all([
    getFavoritesPageData(user.id, {
      query,
      page: currentPage,
      pageSize: PAGE_SIZE,
      tags: selectedTags,
      sortBy: sort,
      sortDirection: params.direction === "asc" ? "asc" : "desc",
      status: status,
      mediaType,
      excludeGenre: params.excludeGenre, yearFrom: libraryYear(params.yearFrom), yearTo: libraryYear(params.yearTo), scoreBands: params.scoreBands,
      genre: params.genre,
      catalogStatus: params.catalogStatus,
      year: Number(params.year) || undefined,
      season: params.season,
      format: params.format,
      minScore: Number(params.minScore) || undefined,
    }),
    getMalConnectionStatus(user.id),
    getAniListConnectionStatus(user.id),
  ]);

  const tableRows = await hydrateLibraryRows(favoriteTableRows(favorites));
  const hasResults = favorites.length > 0;
  const hasActiveFilters = query.length > 0 || Boolean(mediaType || status || selectedTags.length || params.genre || params.catalogStatus || params.year || params.season || params.format || params.minScore || params.excludeGenre || params.yearFrom || params.yearTo || params.scoreBands);

  return (
    <div className="min-w-0">
      <div className="mb-6"><ListHero tab="library" title="Toda tu biblioteca" /></div>
      <div className="mb-6 flex justify-end"><ExportFavoritesButton /></div>
      <LibraryConnectionsCard mal={malConnection} anilist={anilistConnection} results={params} />

      <CatalogInteraction>
      <div className="space-y-6">
      <LibraryToolbar />
      <CatalogResultsArea fallback={<LibraryTableSkeleton />}>
      {/* Content Grid */}
      {hasResults ? (
        <>
          <h2 className="sr-only">Títulos de tu biblioteca</h2>
          <LibraryTable rows={tableRows} />

          {/* Real Paginator */}
          <Suspense fallback={null}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
            />
          </Suspense>

          {/* Page info */}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Mostrando {from + 1}–{Math.min(to + 1, totalCount)} de {totalCount}
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span
            className="material-symbols-outlined text-6xl text-slate-700 mb-4"
            style={{ fontVariationSettings: "'FILL' 0" }}
          >
            {hasActiveFilters ? "search_off" : "heart_broken"}
          </span>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {hasActiveFilters ? "No encontramos títulos con estos filtros" : "Tu biblioteca está vacía"}
          </h2>
          <p className="text-muted-foreground max-w-sm">
            {hasActiveFilters
              ? "Probá cambiando la búsqueda o alguno de los filtros."
              : "Cuando agregues un anime o manga, aparecerá en esta colección."}
          </p>
          {!hasActiveFilters && (
            <Link
              href="/anime"
              className="mt-6 bg-primary hover:bg-primary/80 text-primary-foreground px-6 py-3 rounded-xl font-bold transition-all"
            >
              Explorar anime
            </Link>
          )}
        </div>

      )}

      </CatalogResultsArea>
      </div>
      </CatalogInteraction>
    </div>
  );
}
