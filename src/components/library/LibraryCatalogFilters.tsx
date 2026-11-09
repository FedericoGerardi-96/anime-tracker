import CatalogFilterPanel from '@/components/filters/CatalogFilterPanel';

interface Props { embedded?: boolean; genres: string[]; years?: number[]; formats: string[]; tags?: string[]; showPersonalStatus?: boolean }

export default function LibraryCatalogFilters({ embedded = false, genres, formats, tags = [], showPersonalStatus = true }: Readonly<Props>) {
  return <CatalogFilterPanel embedded={embedded} library={{ genres, formats, tags, showPersonalStatus }} />;
}
