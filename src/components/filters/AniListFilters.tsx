import CatalogFilterPanel from '@/components/filters/CatalogFilterPanel';

export default function AniListFilters({ mediaType }: { mediaType: 'anime' | 'manga' }) {
  return <CatalogFilterPanel mediaType={mediaType} />;
}
