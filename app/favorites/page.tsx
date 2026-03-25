import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import FavoritesSearch from "./_components/FavoritesSearch";
import FavoritesPaginator from "./_components/FavoritesPaginator";
import { Suspense } from "react";
import { IFavorites } from "@/types/favorites";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Favorites",
  description: "View and manage your curated collection of favorite anime and manga.",
};

const PAGE_SIZE = 15;

interface SearchParams {
  page?: string;
  q?: string;
}

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10));
  const query = (params.q ?? "").trim();
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Build the Supabase query
  let dbQuery = supabase
    .from("favorites")
    .select(
      `
      id,
      media:media_id!inner (
        id,
        mal_id,
        title,
        type,
        image,
        description,
        season,
        tags
      )
    `,
      { count: "exact" }
    )
    .eq("user_id", user.id);

  // Search: filter on joined media columns (title, description, tags)
  if (query) {
    // Use referencedTable (supabase-js v2 API) to filter on the inner-joined media table.
    // tags is a text[] column — cs("{tag}") checks if the array contains that element.
    dbQuery = dbQuery.or(
      `title.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`,
      { referencedTable: "media" }
    );
  }

  const { data: favoritesData, count, error } = await dbQuery
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching favorites:", error);
  }

  const favorites = favoritesData ?? [] as IFavorites[];
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const hasResults = favorites.length > 0;
  const isSearching = query.length > 0;

  return (
    <div className="flex-1 min-h-screen relative px-4 sm:px-8 lg:px-12 pb-20 pt-24 lg:pt-28">
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
          <button className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 active:scale-95">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              table_chart
            </span>
            <span className="uppercase text-xs tracking-widest">
              Export to Excel
            </span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="glass-card rounded-2xl p-6 mb-12 flex flex-wrap items-end gap-6 border border-white/10 bg-white/5 backdrop-blur-md">
        {/* Search — client component wrapped in Suspense */}
        <div className="flex flex-col gap-2 flex-1 min-w-[220px]">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
            Search
          </label>
          <Suspense fallback={null}>
            <FavoritesSearch defaultValue={query} />
          </Suspense>
        </div>

        <div className="flex flex-col gap-2 min-w-[160px]">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
            Genre
          </label>
          <div className="relative">
            <select className="w-full bg-slate-900/50 border border-white/5 text-white text-sm rounded-lg focus:ring-1 focus:ring-primary py-3 px-4 appearance-none cursor-pointer">
              <option>All Genres</option>
              <option>Action</option>
              <option>Sci-Fi</option>
              <option>Fantasy</option>
              <option>Psychological</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 pointer-events-none">
              expand_more
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 min-w-[160px]">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
            Sort By
          </label>
          <div className="relative">
            <select className="w-full bg-slate-900/50 border border-white/5 text-white text-sm rounded-lg focus:ring-1 focus:ring-primary py-3 px-4 appearance-none cursor-pointer">
              <option>Date Added</option>
              <option>Title</option>
              <option>Type</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 pointer-events-none">
              expand_more
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end py-1">
          <button className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30 transition-all">
            <span className="material-symbols-outlined">grid_view</span>
          </button>
          <button className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
            <span className="material-symbols-outlined">view_list</span>
          </button>
        </div>
      </div>

      {/* Content Grid */}
      {!hasResults ? (
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
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {favorites.map((fav: IFavorites) => {
              const media = Array.isArray(fav.media)
                ? fav.media[0]
                : fav.media;
              if (!media) return null;
              const mediaType = media.type ? media.type.toUpperCase() : "ANIME";

              return (
                <div key={fav.id} className="group relative flex flex-col gap-4">
                  <div className="relative aspect-3/4 rounded-2xl overflow-hidden glass-card transition-all duration-500 hover:-translate-y-2 group-hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-white/10 bg-white/5">
                    <Image
                      alt={media.title || "Media Poster"}
                      className="w-full! h-full! object-cover transition-transform duration-700 group-hover:scale-110"
                      src={
                        media.image ||
                        "https://via.placeholder.com/300x400?text=No+Image"
                      }
                      width={300}
                      height={400}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent opacity-80" />

                    {/* Type badge */}
                    <div className="absolute top-4 left-4">
                      <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 border border-white/10">
                        <span className="text-white text-[10px] font-bold uppercase tracking-widest">
                          {mediaType}
                        </span>
                      </div>
                    </div>

                    {/* Favorite heart */}
                    <div className="absolute top-4 right-4">
                      <button className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg text-white">
                        <span
                          className="material-symbols-outlined text-xl"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          favorite
                        </span>
                      </button>
                    </div>

                    {/* Quick View overlay */}
                    <div className="absolute bottom-4 left-4 right-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <Link
                        href={`/${media.type || "anime"}/${media.mal_id}`}
                        className="block text-center w-full bg-white text-slate-900 font-bold py-3 rounded-xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-slate-200 transition-colors"
                      >
                        Quick View
                      </Link>
                    </div>
                  </div>

                  <div className="px-1">
                    <h3 className="text-white font-bold text-lg leading-tight group-hover:text-primary transition-colors truncate">
                      {media.title}
                    </h3>
                    {media.tags && media.tags.length > 0 && (
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 truncate">
                        {(media.tags as string[]).slice(0, 2).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

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
      )}

      {/* Decorative background elements */}
      <div className="fixed top-0 right-0 -z-10 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-64 -z-10 w-[400px] h-[400px] bg-blue-600/5 blur-[100px] rounded-full pointer-events-none" />
    </div>
  );
}
