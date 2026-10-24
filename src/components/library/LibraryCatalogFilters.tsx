import CatalogFilterPanel from '@/components/filters/CatalogFilterPanel';

interface Props { genres: string[]; years?: number[]; formats: string[]; tags?: string[]; showPersonalStatus?: boolean }

export default function LibraryCatalogFilters({ genres, formats, tags = [], showPersonalStatus = true }: Readonly<Props>) {
  return <CatalogFilterPanel library={{ genres, formats, tags, showPersonalStatus }} />;
}
