"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition, useState, useEffect, useRef } from "react";

interface FavoritesFiltersProps {
  availableTags: string[];
  showStatus?: boolean;
}

export default function FavoritesFilters({ availableTags, showStatus = true }: Readonly<FavoritesFiltersProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [isOpen, setIsOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Read tags from URL
  const selectedTags = searchParams.get("tags") 
    ? searchParams.get("tags")!.split(",") 
    : [];

  const currentSort = searchParams.get("sort") || "Date Added";
  const currentDirection = searchParams.get("direction") || "desc";
  const currentStatus = searchParams.get("status") || "All Statuses";
  const currentType = searchParams.get("type") || "all";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const current = new URLSearchParams(searchParams.toString());
      for (const [name, value] of Object.entries(params)) {
        if (value === null || value === "" || value === "Date Added" || value === "All Statuses") {
          current.delete(name);
        } else {
          current.set(name, value);
        }
      }
      return current.toString();
    },
    [searchParams]
  );

  const handleTagToggle = (tag: string) => {
    let nextTags = [...selectedTags];
    if (nextTags.includes(tag)) {
      nextTags = nextTags.filter((t) => t !== tag);
    } else {
      nextTags.push(tag);
    }

    startTransition(() => {
      const tagsParam = nextTags.length > 0 ? nextTags.join(",") : null;
      router.push(`${pathname}?${createQueryString({ tags: tagsParam, page: "1" })}`);
    });
  };

  const handleClearTags = () => {
    startTransition(() => {
      router.push(`${pathname}?${createQueryString({ tags: null, page: "1" })}`);
    });
  };

  const handleSortChange = (sort: string) => {
    startTransition(() => {
      router.push(`${pathname}?${createQueryString({ sort, page: "1" })}`);
    });
  };

  const handleStatusChange = (status: string) => {
    startTransition(() => {
      router.push(`${pathname}?${createQueryString({ status, page: "1" })}`);
    });
  };

  const handleDirectionToggle = () => {
    startTransition(() => {
      const direction = currentDirection === "asc" ? "desc" : "asc";
      router.push(`${pathname}?${createQueryString({ direction, page: "1" })}`);
    });
  };

  const handleTypeChange = (type: string) => {
    startTransition(() => {
      router.push(`${pathname}?${createQueryString({ type: type === "all" ? null : type, page: "1" })}`);
    });
  };

  const filteredTags = availableTags.filter((tag) =>
    tag.toLowerCase().includes(tagSearch.toLowerCase())
  );

  return (
    <>
      {/* Dynamic Tags Filter Dropdown */}
      <div className="flex flex-col gap-2 min-w-[200px] relative" ref={dropdownRef}>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
          Etiquetas
        </span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            disabled={isPending}
            className="w-full bg-slate-900/50 border border-white/5 text-white text-sm rounded-lg focus:ring-1 focus:ring-primary py-3 px-4 appearance-none cursor-pointer text-left flex items-center justify-between outline-none disabled:opacity-50 min-h-[46px]"
          >
            <span className="truncate max-w-[150px]">
              {selectedTags.length === 0
                ? "Todas las etiquetas"
                : `${selectedTags.length} seleccionadas`}
            </span>
            <span className="material-symbols-outlined text-slate-500">
              {isOpen ? "expand_less" : "expand_more"}
            </span>
          </button>

          {/* Tags Dropdown Menu */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-950 border border-white/10 rounded-xl shadow-2xl z-50 p-3 max-h-[300px] overflow-hidden flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
              <input
                type="text"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Buscar etiquetas..."
                className="w-full bg-slate-900 border border-white/5 rounded-lg py-2 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />

              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 py-1">
                {filteredTags.length === 0 ? (
                  <span className="text-xs text-slate-500 text-center py-4">No se encontraron etiquetas</span>
                ) : (
                  filteredTags.map((tag) => {
                    const isChecked = selectedTags.includes(tag);
                    return (
                      <label
                        key={tag}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-xs text-slate-300 hover:text-white transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTagToggle(tag)}
                          className="rounded border-white/10 text-primary focus:ring-primary bg-slate-900 size-3.5"
                        />
                        <span className="truncate">{tag}</span>
                      </label>
                    );
                  })
                )}
              </div>

              {selectedTags.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearTags}
                  className="text-[10px] text-primary hover:underline font-bold text-center pt-2 border-t border-white/5 uppercase tracking-wider"
                >
                  Limpiar selección
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 min-w-[150px]">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Tipo</span>
        <div className="relative">
          <select value={currentType} onChange={(e) => handleTypeChange(e.target.value)} disabled={isPending} className="w-full bg-slate-900/50 border border-white/5 text-white text-sm rounded-lg focus:ring-1 focus:ring-primary py-3 px-4 appearance-none cursor-pointer outline-none disabled:opacity-50">
            <option value="all">Anime y manga</option>
            <option value="anime">Anime</option>
            <option value="manga">Manga</option>
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 pointer-events-none">expand_more</span>
        </div>
      </div>

      {/* Filter by Status */}
      {showStatus && <div className="flex flex-col gap-2 min-w-[160px]">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
          Estado
        </span>
        <div className="relative">
          <select
            value={currentStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isPending}
            className="w-full bg-slate-900/50 border border-white/5 text-white text-sm rounded-lg focus:ring-1 focus:ring-primary py-3 px-4 appearance-none cursor-pointer outline-none disabled:opacity-50"
          >
            <option value="All Statuses">Todos los estados</option>
            <option value="watching">Viendo / Leyendo</option>
            <option value="completed">Completado</option>
            <option value="on_hold">En pausa</option>
            <option value="dropped">Abandonado</option>
            <option value="plan_to_watch">Pendiente</option>
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 pointer-events-none">
            expand_more
          </span>
        </div>
      </div>
      }

      {/* Sort By selector */}
      <div className="flex flex-col gap-2 min-w-[210px]">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
          Ordenar por
        </span>
        <div className="flex gap-2">
          <div className="relative flex-1">
          <select
            value={currentSort}
            onChange={(e) => handleSortChange(e.target.value)}
            disabled={isPending}
            className="w-full bg-slate-900/50 border border-white/5 text-white text-sm rounded-lg focus:ring-1 focus:ring-primary py-3 px-4 appearance-none cursor-pointer outline-none disabled:opacity-50"
          >
            <option value="Date Added">Fecha de agregado</option>
            <option value="Title">Título</option>
            <option value="Score">Puntuación</option>
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 pointer-events-none">
            expand_more
          </span>
          </div>
          <button
            type="button"
            onClick={handleDirectionToggle}
            disabled={isPending}
            className="flex size-[46px] shrink-0 items-center justify-center rounded-lg border border-white/5 bg-slate-900/50 text-slate-300 transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
            title={currentDirection === "asc" ? "Orden ascendente" : "Orden descendente"}
            aria-label={currentDirection === "asc" ? "Cambiar a orden descendente" : "Cambiar a orden ascendente"}
          >
            <span className="material-symbols-outlined">{currentDirection === "asc" ? "arrow_upward" : "arrow_downward"}</span>
          </button>
        </div>
      </div>
    </>
  );
}
