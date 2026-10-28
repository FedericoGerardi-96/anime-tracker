import { libraryYear } from '@/lib/library-filters';
import { CatalogInteraction, CatalogResultsArea } from '@/components/catalog/CatalogInteraction';
import type { FavoritesSearchParams } from "@/interfaces/favorites-service";
import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/services/supabase";
import { getFavoritesPageData } from "@/services/favorites-page";
import Pagination from "@/components/ui/Pagination";
import ExportFavoritesButton from "@/components/favorites/ExportFavoritesButton";
import LibraryFilterBar from "@/components/library/LibraryFilterBar";
import FavoritesGrid from "@/components/favorites/FavoritesGrid";
import LibraryConnectionsCard from "@/components/favorites/LibraryConnectionsCard";
import { getAniListConnectionStatus } from "@/services/anilist-connection";
import { getMalConnectionStatus } from "@/services/myanimelist-connection";

export const metadata: Metadata = {
  title: "Mis favoritos",
  description: "Mirá y administrá tu colección de anime y manga favoritos.",
};

const PAGE_SIZE = 15;



export default async function FavoritesPage({
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

  const [{ favorites, totalCount, totalPages, facets }, malConnection, anilistConnection] = await Promise.all([
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

  const hasResults = favorites.length > 0;
  const hasActiveFilters = query.length > 0 || Boolean(mediaType || status || selectedTags.length || params.genre || params.catalogStatus || params.year || params.season || params.format || params.minScore || params.excludeGenre || params.yearFrom || params.yearTo || params.scoreBands);

  return (
    <div className="flex-1 relative px-4 sm:px-8 lg:px-12 py-8">
      {/* Hero Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <nav className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest mb-4">
            <span>Biblioteca</span>
            <span
              className="material-symbols-outlined text-xs"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              chevron_right
            </span>
            <span className="text-muted-foreground">Favoritos</span>
          </nav>
          <h1 className="text-5xl md:text-7xl font-black text-text-primary leading-none tracking-tighter mb-4">
            Mis favoritos
          </h1>
          <p className="text-text-muted text-lg max-w-2xl font-medium antialiased">
            Tu colección personal de historias y personajes favoritos.{" "}
            {totalCount > 0 && (
              <span className="text-primary font-bold">{totalCount} en total</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <ExportFavoritesButton />
        </div>
      </div>
      <LibraryConnectionsCard mal={malConnection} anilist={anilistConnection} results={params} />

      <CatalogInteraction>
      <div className="grid items-start gap-6 lg:grid-cols-[276px_minmax(0,1fr)]">
      {/* Filter / Search Bar */}
      <Suspense fallback={<div className="mb-12 h-28 animate-pulse rounded-2xl bg-muted" />}>
        <LibraryFilterBar availableTags={facets.tags} availableGenres={facets.genres} availableYears={facets.years} availableFormats={facets.formats} defaultQuery={query} />
      </Suspense>

      <CatalogResultsArea>
      {/* Content Grid */}
      {hasResults ? (
        <>
          <h2 className="sr-only">Títulos favoritos</h2>
          <FavoritesGrid favorites={favorites} />

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
          <h2 className="text-2xl font-bold text-white mb-2">
            {hasActiveFilters ? "No encontramos favoritos con estos filtros" : "Todavía no tenés favoritos"}
          </h2>
          <p className="text-muted-foreground max-w-sm">
            {hasActiveFilters
              ? "Probá cambiando la búsqueda o alguno de los filtros."
              : "Cuando agregues un anime o manga, aparecerá en esta colección."}
          </p>
          {!hasActiveFilters && (
            <Link
              href="/anime"
              className="mt-6 bg-primary hover:bg-primary/80 text-white px-6 py-3 rounded-xl font-bold transition-all"
            >
              Explorar anime
            </Link>
          )}
        </div>

      )}

      </CatalogResultsArea>
      </div>
      </CatalogInteraction>
      {/* Decorative background elements */}
      <div className="fixed top-0 right-0 -z-10 w-150 h-150 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-64 -z-10 w-100 h-100 bg-blue-600/5 blur-[100px] rounded-full pointer-events-none" />
    </div>
  );
}
