import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getHentaiEntries, getHentaiFilterOptions } from '@/lib/actions/hentai';
import { parseHentaiFilters } from '@/lib/hentai';
import HentaiSearch from '@/components/hentai/HentaiSearch';
import HentaiActions from '@/components/hentai/HentaiActions';
import HentaiTable from '@/components/hentai/HentaiTable';
import Pagination from '@/components/ui/Pagination';
import ExportCollectionButton from '@/components/exports/ExportCollectionButton';

export const metadata: Metadata = { title: 'Hentai · Mi colección', description: 'Organizá tu colección privada de anime, doujins y manga.' };
const PAGE_SIZE = 20;

export default async function HentaiPage({ searchParams }: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('show_h_content').eq('id', user.id).single();
  if (!profile?.show_h_content) redirect('/');
  const filters = parseHentaiFilters(await searchParams);
  const [{ data: entries, count, error }, { sources: sourceAnimes, tags, sourceError, tagError }] = await Promise.all([
    getHentaiEntries(filters.page, PAGE_SIZE, filters.q, filters), getHentaiFilterOptions(),
  ]);
  const totalPages = Math.ceil(count / PAGE_SIZE);
  if (!error && count > 0 && filters.page > totalPages) {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.type !== 'all') params.set('type', filters.type);
    if (filters.sort !== 'newest') params.set('sort', filters.sort);
    if (filters.origin !== 'all') params.set('origin', filters.origin);
    for (const tag of filters.tags) params.append('tag', tag);
    if (totalPages > 1) params.set('page', String(totalPages));
    redirect(`/hentai${params.size ? `?${params}` : ''}`);
  }
  const filtered = Boolean(filters.q || filters.type !== 'all' || filters.origin !== 'all' || filters.tags.length);
  return (
    <div className="space-y-7 py-8 sm:py-10">
      <Link href="/lists" className="inline-flex min-h-11 items-center gap-2 rounded text-sm font-semibold text-muted-foreground hover:text-primary">
        <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_back</span>
        Volver a Mis listas
      </Link>
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Mi colección privada</p><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Hentai</h1><p className="mt-3 max-w-2xl text-sm text-muted-foreground">Organizá tus anime, doujins y manga con notas y enlaces personales.</p></div>
        <div className="flex flex-wrap items-center gap-3"><ExportCollectionButton source="hentai" /><HentaiActions sourceAnimes={sourceAnimes} availableTags={tags} /></div>
      </header>
      <Suspense fallback={<div className="h-24 rounded-xl bg-muted motion-safe:animate-pulse" />}>
        <HentaiSearch key={JSON.stringify(filters)} filters={filters} sourceAnimes={sourceAnimes} sourceError={sourceError} tags={tags} tagError={tagError} />
      </Suspense>
      {error ? <div role="alert" className="rounded-(--radius-panel) border border-border bg-card p-6"><p>{error}</p><a href="" className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline">Reintentar</a></div>
        : entries.length ? <>
          <p className="text-sm text-muted-foreground">Mostrando {(filters.page - 1) * PAGE_SIZE + 1}–{Math.min(filters.page * PAGE_SIZE, count)} de {count} títulos</p>
          <HentaiTable entries={entries} sourceAnimes={sourceAnimes} availableTags={tags} />
          <Suspense fallback={null}><Pagination currentPage={filters.page} totalPages={totalPages} /></Suspense>
        </> : <section className="rounded-(--radius-panel) border border-dashed border-border bg-card px-5 py-16 text-center">
          <h2 className="text-lg font-bold">{filtered ? 'No encontramos títulos con esos filtros' : 'Tu colección está vacía'}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">{filtered ? 'Probá otra búsqueda o limpiá los filtros para ver tu colección.' : 'Usá Agregar título para empezar a organizar tu colección.'}</p>
        </section>}
    </div>
  );
}
