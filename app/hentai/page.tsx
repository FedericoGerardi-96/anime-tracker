import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHentaiEntries, HentaiEntry } from "@/lib/actions/hentai";
import HentaiSearch from "./_components/HentaiSearch";
import HentaiPaginator from "./_components/HentaiPaginator";
import HentaiActions from "./_components/HentaiActions";
import DeleteHentaiButton from "./_components/DeleteHentaiButton";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Hentai Vault",
  description: "Add items to your hidden vault",
};

const PAGE_SIZE = 12;

interface SearchParams {
  page?: string;
  q?: string;
}

export default async function HentaiPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("show_h_content")
    .eq("id", user.id)
    .single();

  if (!profile?.show_h_content) redirect("/");

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10));
  const query = (params.q ?? "").trim();

  const { data, count, error: _error } = await getHentaiEntries(currentPage, PAGE_SIZE, query);

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hentaiList = (data || []) as HentaiEntry[];
  const hasResults = hentaiList.length > 0;
  const isSearching = query.length > 0;

  return (
    <div className="flex-1 min-h-screen relative px-4 sm:px-8 lg:px-12 pb-20 pt-24 lg:pt-28">
      {/* Background Accent Glow */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-primary/10 blur-[130px] rounded-full -mr-48 -mt-48 pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 blur-[110px] rounded-full -ml-32 -mb-32 pointer-events-none -z-10" />

      {/* Hero Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 max-w-7xl mx-auto">
        <div>
          <nav className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest mb-4">
            <span className="material-symbols-outlined text-xs">security</span>
            <span>Collection</span>
            <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
              chevron_right
            </span>
            <span className="text-slate-500">Vault</span>
          </nav>
          <h1 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tighter mb-4">
            Hentai Vault
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl font-medium antialiased">
            Your private records, stored with privacy. These items are excluded from public stats and global history.
            {totalCount > 0 && (
              <span className="text-primary font-bold ml-2">({totalCount} items)</span>
            )}
          </p>
        </div>
        
        {/* Actions (Add button + Modal) */}
        <HentaiActions />
      </div>

      {/* Filter / Search Bar */}
      <div className="max-w-7xl mx-auto mb-12 flex flex-wrap items-center gap-6">
        <Suspense fallback={<div className="h-16 w-full animate-pulse bg-white/5 rounded-xl" />}>
          <HentaiSearch defaultValue={query} />
        </Suspense>

        {isSearching && (
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
            Showing results for <span className="text-white">&quot;{query}&quot;</span>
          </p>
        )}
      </div>

      {/* Content Grid */}
      <div className="max-w-7xl mx-auto">
        {!hasResults ? (
          <div className="flex flex-col items-center justify-center py-32 text-center glass-panel rounded-3xl border border-dashed border-white/10 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <span className="material-symbols-outlined text-7xl text-slate-700 mb-6" style={{ fontVariationSettings: "'FILL' 0" }}>
              {isSearching ? "search_off" : "lock"}
            </span>
            <h2 className="text-3xl font-black text-white mb-3">
              {isSearching ? `No results for "${query}"` : "The Vault is Empty"}
            </h2>
            <p className="text-slate-400 max-w-sm mx-auto leading-relaxed">
              {isSearching 
                ? "Try a different search term or clear filters to see your collection."
                : "You haven't manually added any entries yet. Use the 'Add New Entry' button to begin your private archive."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-8">
              {hentaiList.map((entry) => (
                <div key={entry.id} className="group relative flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="relative aspect-3/4 rounded-2xl overflow-hidden glass-card transition-all duration-500 hover:-translate-y-2 group-hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-white/10 bg-white/5">
                    <img
                      alt={entry.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      src={entry.image || "https://res.cloudinary.com/do3n04ysn/image/upload/v1692600735/anime-app/gw87wdnbncrslkemdxe4.png"}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-transparent to-transparent opacity-90" />
                    
                    {/* Badges */}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 border border-white/10">
                        <span className="text-white text-[10px] font-bold uppercase tracking-widest">
                          {entry.type === 'doujin' ? 'Doujin' : 'Anime'}
                        </span>
                      </div>
                    </div>

                    <DeleteHentaiButton id={entry.id} />

                    {/* Quick Info (Overlay) */}
                    <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <p className="text-white/80 text-xs line-clamp-3 leading-relaxed border-t border-white/10 pt-3">
                        {entry.description || "No description provided."}
                      </p>
                    </div>
                  </div>

                  <div className="px-1">
                    <h3 className="text-white font-bold text-lg leading-tight group-hover:text-primary transition-colors truncate mb-1">
                      {entry.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                      <span>Vault Entry</span>
                      <span className="w-1 h-1 rounded-full bg-slate-700" />
                      <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Suspense fallback={null}>
              <HentaiPaginator currentPage={currentPage} totalPages={totalPages} />
            </Suspense>
            
            <p className="text-center text-xs text-slate-600 mt-8 font-medium">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} vault entries
            </p>
          </>
        )}
      </div>
    </div>
  );
}
