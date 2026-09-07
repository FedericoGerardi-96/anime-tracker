"use client";

import FavoritesSearch from "@/components/favorites/FavoritesSearch";
import LibraryCatalogFilters from '@/components/library/LibraryCatalogFilters';

interface LibraryFilterBarProps {
  availableTags: string[];
  defaultQuery?: string;
  showStatus?: boolean;
  availableGenres?: string[];
  availableYears?: number[];
  availableFormats?: string[];
}

export default function LibraryFilterBar({ availableTags, defaultQuery, showStatus = true, availableGenres = [], availableYears = [], availableFormats = [] }: Readonly<LibraryFilterBarProps>) {
  return (
    <div className="glass-card relative z-30 mb-8 flex flex-wrap items-end gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
      <div className="flex min-w-[220px] flex-1 flex-col gap-2">
        <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Buscar</span>
        <FavoritesSearch defaultValue={defaultQuery} />
      </div>
      <LibraryCatalogFilters genres={availableGenres} years={availableYears} formats={availableFormats} showPersonalStatus={showStatus} />
    </div>
  );
}
