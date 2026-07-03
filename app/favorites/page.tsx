import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/services/supabase";
import { getFavorites, getAllFavoritesFull } from "@/services/favorites";
import FavoritesSearch from "@/components/favorites/FavoritesSearch";
import FavoritesPaginator from "@/components/favorites/FavoritesPaginator";
import ExportFavoritesButton from "@/components/favorites/ExportFavoritesButton";
import FavoritesFilters from "@/components/favorites/FavoritesFilters";
import FavoritesGrid from "@/components/favorites/FavoritesGrid";

export const metadata: Metadata = {
  title: "My Favorites",
  description: "View and manage your curated collection of favorite anime and manga.",
};

const PAGE_SIZE = 15;

interface SearchParams {
  page?: string;
  q?: string;
  tags?: string;
  sort?: string;
  status?: string;
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
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Retrieve all favorites to extract unique tags for the filter UI
  const allFavorites = await getAllFavoritesFull(user.id);
  const uniqueTags = Array.from(
    new Set(
      allFavorites.flatMap((fav: any) => {
        const media = Array.isArray(fav.media) ? fav.media[0] : fav.media;
        return media?.tags || [];
      })
    )
  ).sort();

  const { favorites, totalCount, totalPages } = await getFavorites(user.id, {
    query,
    page: currentPage,
    pageSize: PAGE_SIZE,
    tags: selectedTags,
    sortBy: sort,
    status: status,
  });

  const hasResults = favorites.length > 0;
  const isSearching = query.length > 0;

  return (
    <div className="flex-1 relative px-4 sm:px-8 lg:px-12 py-8">
      {/* Hero Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <nav className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest mb-4">
            <span>Library</span>
            <span
              className="material-symbols-outlined text-xs"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              chevron_right
            </span>
            <span className="text-slate-500">Favorites</span>
          </nav>
          <h1 className="text-5xl md:text-7xl font-black text-text-primary leading-none tracking-tighter mb-4">
            My Favorites
          </h1>
          <p className="text-text-muted text-lg max-w-2xl font-medium antialiased">
            Your curated collection of top-rated stories and unforgettable
            characters.{" "}
            {totalCount > 0 && (
              <span className="text-primary font-bold">{totalCount} total</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ExportFavoritesButton />
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="glass-card rounded-2xl p-6 mb-12 flex flex-wrap items-end gap-6 border border-white/10 bg-white/5 backdrop-blur-md relative z-30">
        {/* Search — client component wrapped in Suspense */}
        <div className="flex flex-col gap-2 flex-1 min-w-[220px]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
            Search
          </span>
          <Suspense fallback={null}>
            <FavoritesSearch defaultValue={query} />
          </Suspense>
        </div>

        <Suspense fallback={
          <>
            <div className="h-10 w-40 bg-slate-200 dark:bg-slate-800/50 rounded-lg animate-pulse" />
            <div className="h-10 w-40 bg-slate-200 dark:bg-slate-800/50 rounded-lg animate-pulse" />
          </>
        }>
          <FavoritesFilters availableTags={uniqueTags} />
        </Suspense>
      </div>

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
            Showing {from + 1}–{Math.min(to + 1, totalCount)} of {totalCount}
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span
            className="material-symbols-outlined text-6xl text-slate-700 mb-4"
            style={{ fontVariationSettings: "'FILL' 0" }}
          >
            {isSearching ? "search_off" : "heart_broken"}
          </span>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isSearching ? `No results for "${query}"` : "No favorites yet"}
          </h2>
          <p className="text-slate-400 max-w-sm">
            {isSearching
              ? "Try a different title, description keyword, or tag."
              : "You haven't added any series to your favorites collection. Start exploring and bookmarking your top picks!"}
          </p>
          {!isSearching && (
            <Link
              href="/anime"
              className="mt-6 bg-primary hover:bg-primary/80 text-white px-6 py-3 rounded-xl font-bold transition-all"
            >
              Explore Anime
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
