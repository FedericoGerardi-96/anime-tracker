import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/services/supabase";
import { getFavorites, getAllFavoritesFull } from "@/services/favorites";
import FavoritesPaginator from "@/components/favorites/FavoritesPaginator";
import ExportFavoritesButton from "@/components/favorites/ExportFavoritesButton";
import LibraryFilterBar from "@/components/library/LibraryFilterBar";
import FavoritesGrid from "@/components/favorites/FavoritesGrid";
import MalSyncButton from "@/components/favorites/MalSyncButton";
import { getMalConnectionStatus } from "@/services/myanimelist-connection";

export const metadata: Metadata = {
  title: "Mis favoritos",
  description: "Mirá y administrá tu colección de anime y manga favoritos.",
};

const PAGE_SIZE = 15;

interface SearchParams {
  page?: string;
  q?: string;
  tags?: string;
  sort?: string;
  status?: string;
  type?: string;
  direction?: string;
  genre?: string;
  catalogStatus?: string;
  year?: string;
  season?: string;
  format?: string;
  minScore?: string;
}

export default async function FavoritesPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<SearchParams>;
}>) {
  const user = await getAuthenticatedUser();

  if (!user) redirect("/");

  const params = await searchParams;
  const currentPage = Math.max(1, Number.parseInt(params.page ?? "1", 10));
  const query = (params.q ?? "").trim();
  const tagsParam = (params.tags ?? "").trim();
  const selectedTags = tagsParam ? tagsParam.split(",") : [];
  const sort = (params.sort ?? "").trim();
  const status = (params.status ?? "").trim();
  const mediaType = params.type === "anime" || params.type === "manga" ? params.type : undefined;
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Retrieve all favorites to extract unique tags for the filter UI
  const [allFavorites, malConnection] = await Promise.all([
    getAllFavoritesFull(user.id),
    getMalConnectionStatus(user.id),
  ]);
  const uniqueTags = Array.from(
    new Set(
      allFavorites.filter((fav) => {
        const media = Array.isArray(fav.media) ? fav.media[0] : fav.media;
        return !mediaType || media?.type === mediaType;
      }).flatMap((fav) => {
        const media = Array.isArray(fav.media) ? fav.media[0] : fav.media;
        return media?.tags || [];
      })
    )
  ).sort();
  const libraryMedia = allFavorites.flatMap((favorite) => {
    const media = Array.isArray(favorite.media) ? favorite.media[0] : favorite.media;
    return media ? [media] : [];
  });
  const uniqueGenres = Array.from(new Set(libraryMedia.flatMap((media) => media.genres ?? []))).sort();
  const uniqueYears = Array.from(new Set(libraryMedia.map((media) => media.year).filter((year): year is number => Number.isInteger(year)))).sort((a, b) => b - a);
  const uniqueFormats = Array.from(new Set(libraryMedia.map((media) => media.format).filter((format): format is string => Boolean(format)))).sort();

  const { favorites, totalCount, totalPages } = await getFavorites(user.id, {
    query,
    page: currentPage,
    pageSize: PAGE_SIZE,
    tags: selectedTags,
    sortBy: sort,
    sortDirection: params.direction === "asc" ? "asc" : "desc",
    status: status,
    mediaType,
    genre: params.genre,
    catalogStatus: params.catalogStatus,
    year: Number(params.year) || undefined,
    season: params.season,
    format: params.format,
    minScore: Number(params.minScore) || undefined,
  });

  const hasResults = favorites.length > 0;
  const hasActiveFilters = query.length > 0 || Boolean(mediaType || status || selectedTags.length || params.genre || params.catalogStatus || params.year || params.season || params.format || params.minScore);

  return (
    <div className="flex-1 relative px-4 sm:px-8 lg:px-12 py-8">
      {/* Hero Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <nav className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest mb-4">
            <span>Biblioteca</span>
            <span
              className="material-symbols-outlined text-xs"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              chevron_right
            </span>
            <span className="text-slate-500">Favoritos</span>
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
        <div className="flex items-center gap-4">
          {malConnection.connected && malConnection.status === "active" && <MalSyncButton />}
          <ExportFavoritesButton />
        </div>
      </div>

      {/* Filter / Search Bar */}
      <Suspense fallback={<div className="mb-12 h-28 animate-pulse rounded-2xl bg-muted" />}>
        <LibraryFilterBar availableTags={uniqueTags} availableGenres={uniqueGenres} availableYears={uniqueYears} availableFormats={uniqueFormats} defaultQuery={query} />
      </Suspense>

      {/* Content Grid */}
      {hasResults ? (
        <>
          <FavoritesGrid favorites={favorites} />

          {/* Real Paginator */}
          <Suspense fallback={null}>
            <FavoritesPaginator
              currentPage={currentPage}
              totalPages={totalPages}
            />
          </Suspense>

          {/* Page info */}
          <p className="text-center text-xs text-slate-600 mt-4">
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
          <p className="text-slate-400 max-w-sm">
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

      {/* Decorative background elements */}
      <div className="fixed top-0 right-0 -z-10 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-64 -z-10 w-[400px] h-[400px] bg-blue-600/5 blur-[100px] rounded-full pointer-events-none" />
    </div>
  );
}
