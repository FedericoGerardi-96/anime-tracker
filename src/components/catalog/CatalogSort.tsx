'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { CatalogProvider } from '@/interfaces/anilist-catalog';
import { updateCatalogFilterParams } from '@/lib/catalog-filter-values';
import Dropdown from '@/components/dropdown/dropdown';

export default function CatalogSort({ provider }: Readonly<{ provider: CatalogProvider }>) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (provider === 'myanimelist' && params.get('status') && params.get('status') !== 'all') return null;
  const value = params.get('sort') || 'popularity';
  const options = [
    { value: 'popularity', label: 'Popularidad' },
    { value: 'score', label: 'Puntuación' },
    ...(provider === 'anilist' ? [{ value: 'trending', label: 'Tendencia' }, { value: 'newest', label: 'Más recientes' }, { value: 'title', label: 'Título' }] : []),
  ];
  return <div className="ml-auto flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
    <span>Ordenar por</span>
    <Dropdown ariaLabel="Ordenar catálogo" value={value} disabled={pending} options={options} placeholder="Popularidad" onChange={(selected) => {
      const changes: Record<string, string | null> = { sort: selected === 'popularity' ? null : selected };
      if (provider === 'myanimelist') { changes.q = null; changes.status = null; }
      const next = updateCatalogFilterParams(new URLSearchParams(params.toString()), changes);
      startTransition(() => router.push(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false }));
    }} className="w-auto!" buttonClassName="min-h-11 bg-card! px-3!" menuClassName="left-auto! right-0!" />
  </div>;
}
