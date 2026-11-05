import AnimeFilters from '@/components/filters/AnimeFilters';

interface MalFiltersProps {
  yearOptions?: Array<{ label: string; value: string }>;
  mediaType?: 'anime' | 'manga';
  showSort?: boolean;
}

export default function MalFilters({ yearOptions = [], mediaType = 'anime', showSort = true }: Readonly<MalFiltersProps>) {
  return <AnimeFilters yearOptions={yearOptions} hideSeason={mediaType === 'manga'} officialMal mediaType={mediaType} showSort={showSort} />;
}
