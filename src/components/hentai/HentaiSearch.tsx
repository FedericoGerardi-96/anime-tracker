'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import type { HentaiFilters } from '@/interfaces/hentai';
import { HENTAI_TAG_LIMIT } from '@/lib/hentai';

export default function HentaiSearch({ filters, sourceAnimes, sourceError, tags, tagError }: {
  filters: HentaiFilters; sourceAnimes: string[]; sourceError?: string; tags: string[]; tagError?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [selectedTags, setSelectedTags] = useState(filters.tags);
  const tagOptions = [...new Set([...tags, ...selectedTags])];
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
    for (const tag of selectedTags) params.append('tag', tag);
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
      <details className="group min-w-0 flex-1 basis-full rounded-(--radius-control) border border-border bg-background"
        onKeyDown={event => {
          if (event.key === 'Escape' && event.currentTarget.open) {
            event.preventDefault();
            event.currentTarget.open = false;
            event.currentTarget.querySelector('summary')?.focus();
          }
        }}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-(--radius-control) px-3 text-sm font-semibold">
          Etiquetas {selectedTags.length > 0 && <span className="text-primary">· {selectedTags.length}</span>}
          <span aria-hidden="true" className="material-symbols-outlined ml-auto text-base group-open:rotate-180">expand_more</span>
        </summary>
        <fieldset className="border-t border-border p-3" disabled={pending}>
          <legend className="sr-only">Filtrar por etiquetas</legend>
          {tagOptions.length > 0 ? <>
            <p className="mb-2 text-xs text-muted-foreground">Marcá las etiquetas y tocá Buscar. Se muestran títulos con todas las elegidas.</p>
            <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {tagOptions.map(tag => {
                const checked = selectedTags.includes(tag);
                return <label key={tag} className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-2 text-sm hover:bg-muted">
                  <input type="checkbox" checked={checked} disabled={!checked && selectedTags.length >= HENTAI_TAG_LIMIT}
                    onChange={event => {
                      const nextChecked = event.currentTarget.checked;
                      setSelectedTags(current => nextChecked ? [...current, tag] : current.filter(value => value !== tag));
                    }}
                    className="size-4 shrink-0 accent-primary" />
                  <span className="min-w-0 wrap-anywhere">{tag}</span>
                </label>;
              })}
            </div>
          </> : !tagError && <p className="text-sm text-muted-foreground">Todavía no guardaste etiquetas en tu colección.</p>}
        </fieldset>
      </details>
      <button type="submit" disabled={pending} className="min-h-11 rounded-(--radius-control) bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-40">{pending ? 'Buscando…' : 'Buscar'}</button>
      {(filters.q || filters.type !== 'all' || filters.sort !== 'newest' || filters.origin !== 'all' || selectedTags.length > 0 || filters.tags.length > 0) && <Link href="/hentai" onClick={() => setSelectedTags([])} className="inline-flex min-h-11 items-center px-2 text-sm text-muted-foreground underline underline-offset-4">Limpiar filtros</Link>}
      {sourceError && <p role="alert" className="w-full text-sm text-muted-foreground">{sourceError} <a href="" className="inline-flex min-h-11 items-center font-semibold text-primary underline">Reintentar</a></p>}
      {tagError && <p role="alert" className="w-full text-sm text-muted-foreground">{tagError} <a href="" className="inline-flex min-h-11 items-center font-semibold text-primary underline">Reintentar</a></p>}
    </form>
  );
}
