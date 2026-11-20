'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import type { HentaiFilters } from '@/interfaces/hentai';

export default function HentaiSearch({ filters, sourceAnimes, sourceError }: { filters: HentaiFilters; sourceAnimes: string[]; sourceError?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const query = String(data.get('q') ?? '').trim();
    const type = String(data.get('type') ?? 'all');
    const sort = String(data.get('sort') ?? 'newest');
    const origin = String(data.get('origin') ?? filters.origin);
    if (query) params.set('q', query);
    if (type !== 'all') params.set('type', type);
    if (sort !== 'newest') params.set('sort', sort);
    if (origin !== 'all') params.set('origin', origin);
    startTransition(() => router.push(pathname + (params.size ? '?' + params : ''), { scroll: false }));
  };
  const control = 'min-h-11 w-full rounded-(--radius-control) border border-border bg-background px-3 text-sm text-foreground';
  return (
    <form onSubmit={apply} className="flex flex-wrap items-end gap-4 rounded-(--radius-panel) border border-border bg-card p-4" aria-label="Filtros de Hentai">
      <label className="grid min-w-0 flex-1 basis-60 gap-2 text-xs font-semibold">Buscar por título o nota
        <input type="search" name="q" defaultValue={filters.q} maxLength={200} placeholder="Buscá en tu colección…" className={control} />
      </label>
      <label className="grid min-w-0 flex-1 basis-52 gap-2 text-xs font-semibold">Anime de origen
        <select name="origin" defaultValue={filters.origin} disabled={Boolean(sourceError)} onChange={event => event.currentTarget.form?.requestSubmit()} className={control}>
          <option value="all">Todos</option><option value="original">Original</option>
          {filters.origin.startsWith('anime:') && !sourceAnimes.includes(filters.origin.slice(6)) && <option value={filters.origin}>{filters.origin.slice(6)}</option>}
          {sourceAnimes.map(source => <option key={source} value={`anime:${source}`}>{source}</option>)}
        </select>
      </label>
      <label className="grid min-w-0 flex-1 basis-40 gap-2 text-xs font-semibold">Tipo
        <select name="type" defaultValue={filters.type} onChange={event => event.currentTarget.form?.requestSubmit()} className={control}>
          <option value="all">Todos los tipos</option><option value="anime">Anime</option><option value="doujin">Doujin/Manga</option>
        </select>
      </label>
      <label className="grid min-w-0 flex-1 basis-52 gap-2 text-xs font-semibold">Ordenar por
        <select name="sort" defaultValue={filters.sort} onChange={event => event.currentTarget.form?.requestSubmit()} className={control}>
          <option value="newest">Agregados recientemente</option><option value="oldest">Agregados más antiguos</option><option value="title-asc">Título de A a Z</option><option value="title-desc">Título de Z a A</option>
        </select>
      </label>
      <button type="submit" disabled={pending} className="min-h-11 rounded-(--radius-control) bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-40">{pending ? 'Buscando…' : 'Buscar'}</button>
      {(filters.q || filters.type !== 'all' || filters.sort !== 'newest' || filters.origin !== 'all') && <Link href="/hentai" className="inline-flex min-h-11 items-center px-2 text-sm text-muted-foreground underline underline-offset-4">Limpiar filtros</Link>}
      {sourceError && <p role="alert" className="w-full text-sm text-muted-foreground">{sourceError} <a href="" className="inline-flex min-h-11 items-center font-semibold text-primary underline">Reintentar</a></p>}
    </form>
  );
}
