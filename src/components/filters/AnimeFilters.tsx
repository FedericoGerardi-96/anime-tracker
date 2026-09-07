
'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

import Dropdown from '@/components/dropdown/dropdown';

interface AnimeFiltersProps {
  yearOptions?: Array<{ label: string; value: string }>;
  hideSeason?: boolean;
  officialMal?: boolean;
  mediaType?: 'anime' | 'manga';
}

export default function AnimeFilters({ yearOptions = [], hideSeason = false, officialMal = false, mediaType = 'anime' }: Readonly<AnimeFiltersProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'all');
  const [selectedSeason, setSelectedSeason] = useState(searchParams.get('season') || 'all');
  const [selectedYear, setSelectedYear] = useState(searchParams.get('year') || 'all');
  const [selectedSort, setSelectedSort] = useState(searchParams.get('sort') || 'popularity');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    if (isPending) {
      document.documentElement.dataset.catalogLoading = 'true';
    } else {
      delete document.documentElement.dataset.catalogLoading;
    }

    return () => {
      delete document.documentElement.dataset.catalogLoading;
    };
  }, [isPending]);

  const navigate = (params: URLSearchParams) => {
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (key === 'status') setSelectedStatus(value);
    if (key === 'sort') setSelectedSort(value);
    
    // Always reset to page 1 when filters change
    params.set('page', '1');

    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    if (officialMal) {
      // Search, rankings and seasonal catalogs are separate MAL endpoints.
      if (key === 'sort') params.delete('status');
      if (key === 'status') {
        params.delete('sort');
        params.delete('year');
        params.delete('season');
      }
      if (key === 'year' || key === 'season') params.delete('status');
      if (key !== 'q') params.delete('q');
    }
    
    navigate(params);
  };

  const applySearch = useDebouncedCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const query = value.trim();
    params.set('page', '1');
    if (query) {
      params.set('q', query);
      // MAL expone la búsqueda por texto como un catálogo independiente.
      params.delete('status');
      params.delete('year');
      params.delete('season');
      params.delete('sort');
      setSelectedStatus('all');
      setSelectedYear('all');
      setSelectedSeason('all');
      setSelectedSort('popularity');
    } else {
      params.delete('q');
    }
    navigate(params);
  }, 450);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    applySearch(value);
  };

  const handleSeasonChange = (key: 'year' | 'season', value: string) => {
    const nextYear = key === 'year' ? value : selectedYear;
    const nextSeason = key === 'season' ? value : selectedSeason;

    setSelectedYear(nextYear);
    setSelectedSeason(nextSeason);

    // Keep an incomplete pair as a visual draft. MAL can only query it once
    // both values are present, so there is no unnecessary server navigation.
    if (nextYear === 'all' || nextSeason === 'all') {
      const hadAppliedSeason = searchParams.has('year') && searchParams.has('season');
      if (!hadAppliedSeason) return;

      const params = new URLSearchParams(searchParams.toString());
      params.delete('year');
      params.delete('season');
      params.set('page', '1');
      navigate(params);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('year', nextYear);
    params.set('season', nextSeason);
    params.set('page', '1');
    params.delete('status');
    params.delete('q');
    setSelectedStatus('all');
    navigate(params);
  };

  const selectedGenre = searchParams.get('genre') || '';
  const seasonPairIncomplete = (selectedYear === 'all') !== (selectedSeason === 'all');

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap w-full md:w-auto">
      {officialMal && (
        <div className="group relative min-w-[240px] flex-1 sm:max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-500 transition-colors group-focus-within:text-primary">search</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder={mediaType === 'manga' ? 'Buscar manga en MyAnimeList…' : 'Buscar anime en MyAnimeList…'}
            aria-label={mediaType === 'manga' ? 'Buscar manga' : 'Buscar anime'}
            className="h-11 w-full rounded-lg border border-primary/10 bg-background/50 py-2 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
          />
        </div>
      )}
      {!officialMal && (
        <Dropdown
          placeholder="Genre"
          value={selectedGenre}
          onChange={(val) => handleFilterChange('genre', val)}
          options={[
            { label: 'All Genres', value: 'all' },
            { label: 'Action', value: 'action' },
            { label: 'Adventure', value: 'adventure' },
            { label: 'Comedy', value: 'comedy' },
            { label: 'Drama', value: 'drama' },
            { label: 'Fantasy', value: 'fantasy' },
            { label: 'Romance', value: 'romance' },
          ]}
        />
      )}
      <Dropdown
        label="Status"
        value={selectedStatus}
        onChange={(val) => handleFilterChange('status', val)}
        options={[
          { label: 'Todos los estados', value: 'all' },
          { label: 'En emisión', value: 'airing' },
          ...(officialMal
            ? [{ label: 'Próximamente', value: 'upcoming' }]
            : [{ label: 'Finalizados', value: 'completed' }]),
        ]}
      />
      
      {/* Season Filter - Only if not hidden */}
      {!hideSeason && officialMal && (
        <div className={`flex w-full flex-col gap-2 rounded-xl border p-2 sm:w-auto sm:flex-row ${seasonPairIncomplete ? 'border-primary/50 bg-primary/5' : 'border-primary/10 bg-background/40'}`}>
          <Dropdown
            label="Año"
            value={selectedYear}
            onChange={(val) => handleSeasonChange('year', val)}
            options={[{ label: 'Todos los años', value: 'all' }, ...yearOptions]}
          />
          <Dropdown
            label="Temporada"
            value={selectedSeason}
            onChange={(val) => handleSeasonChange('season', val)}
            options={[
              { label: 'Todas', value: 'all' },
              { label: 'Invierno (ene–mar)', value: 'winter' },
              { label: 'Primavera (abr–jun)', value: 'spring' },
              { label: 'Verano (jul–sep)', value: 'summer' },
              { label: 'Otoño (oct–dic)', value: 'fall' },
            ]}
          />
          {seasonPairIncomplete && (
            <span className="self-center px-2 text-xs text-primary/90">Completá ambos para filtrar</span>
          )}
        </div>
      )}

      {!hideSeason && !officialMal && yearOptions.length > 0 && (
        <Dropdown
          label="Season"
          value={selectedSeason}
          onChange={(val) => handleFilterChange('season', val)}
          options={[{ label: 'All Seasons', value: 'all' }, ...yearOptions]}
        />
      )}

      {(!officialMal || selectedStatus === 'all') && (
        <Dropdown
          label="Sort"
          value={selectedSort}
          onChange={(val) => handleFilterChange('sort', val)}
          options={[
            { label: 'Popularidad', value: 'popularity' },
            { label: 'Puntuación', value: 'score' },
            ...(!officialMal ? [{ label: 'Recently Added', value: 'recent' }] : []),
          ]}
        />
      )}
      {isPending && (
        <div className="absolute left-0 right-0 top-[calc(100%+2rem)] z-40 flex min-h-[60vh] items-start justify-center rounded-2xl bg-background pt-24 text-foreground">
          <div className="flex items-center gap-3 rounded-full border border-primary/20 bg-primary/5 px-5 py-3 text-sm font-semibold shadow-xl">
            <span className="size-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
            {mediaType === 'manga' ? 'Actualizando mangas…' : 'Actualizando animes…'}
          </div>
        </div>
      )}
    </div>
  );
}
