'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const SHARED_FILTERS = ['q', 'genre', 'excludeGenre', 'status', 'year', 'yearFrom', 'yearTo', 'scoreBands', 'minScore', 'sort'];

function catalogHref(type: 'anime' | 'manga', params: URLSearchParams, active: boolean) {
  const query = new URLSearchParams();
  for (const [key, value] of params) {
    if (!active && !SHARED_FILTERS.includes(key)) continue;
    query.append(key, value);
  }
  const search = query.toString();
  return `/${type}${search ? `?${search}` : ''}`;
}

export default function CatalogHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const type = pathname === '/manga' ? 'manga' : 'anime';
  const params = new URLSearchParams(searchParams.toString());
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Catálogo</p>
        <h1 className="text-3xl font-black sm:text-4xl">{type === 'anime' ? 'Catálogo de anime' : 'Catálogo de manga'}</h1>
      </div>
      <nav aria-label="Tipo de catálogo" className="inline-flex rounded-xl border border-border bg-card p-1">
        {(['anime', 'manga'] as const).map((option) => (
          <Link
            key={option}
            href={catalogHref(option, params, type === option)}
            aria-current={type === option ? 'page' : undefined}
            className={`flex min-h-11 min-w-20 items-center justify-center rounded-lg px-4 text-sm font-bold transition-colors ${type === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            {option === 'anime' ? 'Anime' : 'Manga'}
          </Link>
        ))}
      </nav>
    </div>
  );
}
