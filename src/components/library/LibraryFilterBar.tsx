import LibraryCatalogFilters from '@/components/library/LibraryCatalogFilters';

interface LibraryFilterBarProps {
  availableTags: string[];
  defaultQuery?: string;
  showStatus?: boolean;
  availableGenres?: string[];
  availableYears?: number[];
  availableFormats?: string[];
}

export default function LibraryFilterBar({ availableTags, showStatus = true, availableGenres = [], availableYears = [], availableFormats = [] }: Readonly<LibraryFilterBarProps>) {
  return <aside className="relative z-30 min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-3 lg:[scrollbar-gutter:stable] lg:[scrollbar-width:thin] lg:[scrollbar-color:var(--color-primary)_transparent]">
    <LibraryCatalogFilters genres={availableGenres} years={availableYears} formats={availableFormats} tags={availableTags} showPersonalStatus={showStatus} />
  </aside>;
}
