'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import Dropdown from '@/components/dropdown/dropdown';
import { useCatalogLoading } from '@/components/catalog/CatalogInteraction';
import { listTypeOptions, listSortOptions, updateListType } from '@/lib/lists-toolbar';

export default function LibraryToolbar() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const setLoading = useCatalogLoading()?.setLoading;
  const source = params.get('q') ?? '';
  const [draft, setDraft] = useState({ source, value: source });
  const query = draft.source === source ? draft.value : source;
  useEffect(() => { setLoading?.(pending); return () => setLoading?.(false); }, [pending,setLoading]);
  const navigate = (next: URLSearchParams, text: string) => {
    if (text.trim()) next.set('q',text.trim()); else next.delete('q');
    next.delete('page');
    startTransition(() => router.push(pathname + (next.size ? '?' + next.toString() : ''), {scroll:false}));
  };
  const search = useDebouncedCallback((text: string) => navigate(new URLSearchParams(params.toString()),text), 350);
  const type = params.get('format')?.split(',')[0]?.toUpperCase() ?? params.get('type') ?? 'all';
  const sort = (params.get('sort') ?? 'Date Added') + ':' + (params.get('direction') ?? 'desc');
  const types = listTypeOptions.some(option => option.value === type) ? listTypeOptions : [...listTypeOptions,{value:type,label:type}];
  const sorts = listSortOptions.some(option => option.value === sort) ? listSortOptions : [...listSortOptions,{value:sort,label:'Orden actual'}];
  return <div className="relative z-30 flex flex-wrap items-center gap-3">
    <form className="min-w-0 flex-1 basis-64" onSubmit={event => {event.preventDefault();search.cancel();navigate(new URLSearchParams(params.toString()),query);}}>
      <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
        <span aria-hidden="true" className="material-symbols-outlined text-lg text-muted-foreground">search</span>
        <input aria-label="Buscar por título, nota o etiquetas" type="search" value={query} placeholder="Buscar por título, nota o etiquetas…" onChange={event => {setDraft({source,value:event.target.value});search(event.target.value);}} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none!"/>
      </label>
    </form>
    <Dropdown ariaLabel="Tipo de título" value={type} options={types} disabled={pending} buttonClassName="min-h-11 bg-card! px-3!" onChange={value => {search.cancel();navigate(updateListType(new URLSearchParams(params.toString()),value),query);}} />
    <Dropdown ariaLabel="Ordenar lista" value={sort} options={sorts} disabled={pending} buttonClassName="min-h-11 bg-card! px-3!" menuClassName="left-auto! right-0!" onChange={value => {
      search.cancel(); const next = new URLSearchParams(params.toString()); const [sort,direction] = value.split(':');next.set('sort',sort);next.set('direction',direction);navigate(next,query);
    }} />
    <span role="status" className="sr-only">{pending ? 'Actualizando lista…' : ''}</span>
  </div>;
}
