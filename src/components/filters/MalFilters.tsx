import AnimeFilters from '@/components/filters/AnimeFilters';

interface MalFiltersProps {
  yearOptions?: Array<{ label: string; value: string }>;
  mediaType?: 'anime' | 'manga';
}

export default function MalFilters({ yearOptions = [], mediaType = 'anime' }: Readonly<MalFiltersProps>) {
  return <AnimeFilters yearOptions={yearOptions} hideSeason={mediaType === 'manga'} officialMal mediaType={mediaType} />;
}
