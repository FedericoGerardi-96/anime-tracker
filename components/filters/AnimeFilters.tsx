'use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Dropdown from '@/components/dropdown/dropdown';

export default function AnimeFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    // searchParams.toString() safely generates a string for URLSearchParams
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // push to the current path with updated query params (scroll: false to avoid jumping)
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const selectedGenre = searchParams.get('genre') || 'action';
  const selectedStatus = searchParams.get('status') || 'all';
  const selectedSeason = searchParams.get('season') || 'winter-2024';
  const selectedSort = searchParams.get('sort') || 'popularity';

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap w-full md:w-auto">
      <Dropdown
        placeholder="Genre"
        value={selectedGenre}
        onChange={(val) => handleFilterChange('genre', val)}
        options={[
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
          { label: 'All', value: 'all' },
          { label: 'Airing', value: 'airing' },
          { label: 'Completed', value: 'completed' },
        ]}
      />
      <Dropdown
        label="Season"
        value={selectedSeason}
        onChange={(val) => handleFilterChange('season', val)}
        options={[
          { label: '2024 Winter', value: 'winter-2024' },
          { label: '2023 Fall', value: 'fall-2023' },
          { label: '2023 Summer', value: 'summer-2023' },
          { label: '2023 Spring', value: 'spring-2023' },
        ]}
      />
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
