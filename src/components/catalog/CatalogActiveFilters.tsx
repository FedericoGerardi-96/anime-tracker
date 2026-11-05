'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CATALOG_FILTER_KEYS, CATALOG_GENRES, updateCatalogFilterParams } from '@/lib/catalog-filter-values';

const labels: Record<string, string> = { q: 'Búsqueda', genre: 'Género', excludeGenre: 'Excluido', status: 'Estado', year: 'Año', yearFrom: 'Desde', yearTo: 'Hasta', season: 'Temporada', format: 'Formato', scoreBands: 'Puntuación', minScore: 'Puntuación mínima', sort: 'Orden' };
const translations: Record<string, string> = { ...Object.fromEntries(CATALOG_GENRES), airing: 'En emisión / publicación', completed: 'Finalizado', upcoming: 'Próximamente', hiatus: 'En pausa', cancelled: 'Cancelado', winter: 'Invierno', spring: 'Primavera', summer: 'Verano', fall: 'Otoño', TV: 'Serie de TV', MOVIE: 'Película', SPECIAL: 'Especial', TV_SHORT: 'Serie corta', MUSIC: 'Video musical', NOVEL: 'Novela', ONE_SHOT: 'One-shot', popularity: 'Popularidad', score: 'Puntuación', trending: 'Tendencia', newest: 'Más recientes', title: 'Título' };

export default function CatalogActiveFilters() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const items = CATALOG_FILTER_KEYS.flatMap((key) => {
    const value = params.get(key);
    if (!value || key === 'sort') return [];
    return (key === 'q' ? [value] : value.split(',').filter(Boolean)).map((part) => ({ key, part, label: `${labels[key]}: ${translations[part] ?? part}` }));
  });
  if (!items.length) return null;
  const navigate = (changes: Record<string, string | null>) => {
    const next = updateCatalogFilterParams(new URLSearchParams(params.toString()), changes);
    startTransition(() => router.push(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false }));
  };
  return <div aria-label="Filtros aplicados" className="flex flex-wrap items-center gap-2 text-sm" aria-busy={pending}>
    <span className="text-muted-foreground">Filtros aplicados:</span>
    {items.map(({ key, part, label }) => <button type="button" key={`${key}:${part}`} aria-label={`Quitar ${label}`} onClick={() => {
      const next = key === 'q' ? '' : (params.get(key) ?? '').split(',').filter((value) => value && value !== part).join(',');
      navigate({ [key]: next || null });
    }} className="min-h-9 cursor-pointer rounded-full border border-primary/40 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/20">{label} <span aria-hidden="true">×</span></button>)}
    <button type="button" onClick={() => navigate(Object.fromEntries(CATALOG_FILTER_KEYS.filter((key) => key !== 'sort').map((key) => [key, null])))} className="min-h-9 px-2 text-xs font-semibold text-muted-foreground underline hover:text-primary">Limpiar todo</button>
  </div>;
}
