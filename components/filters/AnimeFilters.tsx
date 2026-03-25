
'use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Dropdown from '@/components/dropdown/dropdown';

interface AnimeFiltersProps {
  seasonOptions?: any[];
  hideSeason?: boolean;
}

export default function AnimeFilters({ seasonOptions = [], hideSeason = false }: AnimeFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Always reset to page 1 when filters change
    params.set('page', '1');

    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const selectedGenre = searchParams.get('genre') || '';
  const selectedStatus = searchParams.get('status') || 'all';
  const selectedSeason = searchParams.get('season') || (seasonOptions.length > 0 ? seasonOptions[seasonOptions.length - 1].value : '');
  const selectedSort = searchParams.get('sort') || 'popularity';

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap w-full md:w-auto">
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
      <Dropdown
        label="Status"
        value={selectedStatus}
        onChange={(val) => handleFilterChange('status', val)}
        options={[
          { label: 'All Status', value: 'all' },
          { label: 'Airing', value: 'airing' },
          { label: 'Completed', value: 'completed' },
        ]}
      />
      
      {/* Season Filter - Only if not hidden */}
      {!hideSeason && seasonOptions.length > 0 && (
        <Dropdown
          label="Season"
          value={selectedSeason}
          onChange={(val) => handleFilterChange('season', val)}
          options={[
            { label: 'All Seasons', value: 'all' },
            ...seasonOptions
          ]}
        />
      )}

      <Dropdown
        label="Sort"
        value={selectedSort}
        onChange={(val) => handleFilterChange('sort', val)}
        options={[
          { label: 'Popularity', value: 'popularity' },
          { label: 'Score', value: 'score' },
          { label: 'Recently Added', value: 'recent' },
        ]}
      />
    </div>
  );
}
