import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getHentaiEntries } from '@/lib/actions/hentai';
import { parseHentaiFilters } from '@/lib/hentai';
import HentaiSearch from '@/components/hentai/HentaiSearch';
import HentaiActions from '@/components/hentai/HentaiActions';
import HentaiTable from '@/components/hentai/HentaiTable';
import Pagination from '@/components/ui/Pagination';

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
  const { data: entries, count, error } = await getHentaiEntries(filters.page, PAGE_SIZE, filters.q, filters);
  const totalPages = Math.ceil(count / PAGE_SIZE);
  if (!error && count > 0 && filters.page > totalPages) {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.type !== 'all') params.set('type', filters.type);
    if (filters.sort !== 'newest') params.set('sort', filters.sort);
    if (totalPages > 1) params.set('page', String(totalPages));
    redirect(`/hentai${params.size ? `?${params}` : ''}`);
  }
  const filtered = Boolean(filters.q || filters.type !== 'all');
  return (
    <div className="space-y-7 py-8 sm:py-10">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Mi colección privada</p><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Hentai</h1><p className="mt-3 max-w-2xl text-sm text-muted-foreground">Organizá tus anime, doujins y manga con notas y enlaces personales.</p></div>
        <HentaiActions />
      </header>
      <Suspense fallback={<div className="h-24 rounded-xl bg-muted motion-safe:animate-pulse" />}>
        <HentaiSearch key={`${filters.q}-${filters.type}-${filters.sort}`} filters={filters} />
      </Suspense>
      {error ? <div role="alert" className="rounded-(--radius-panel) border border-border bg-card p-6"><p>{error}</p><a href="" className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline">Reintentar</a></div>
        : entries.length ? <>
          <p className="text-sm text-muted-foreground">Mostrando {(filters.page - 1) * PAGE_SIZE + 1}–{Math.min(filters.page * PAGE_SIZE, count)} de {count} títulos</p>
          <HentaiTable entries={entries} />
          <Suspense fallback={null}><Pagination currentPage={filters.page} totalPages={totalPages} /></Suspense>
        </> : <section className="rounded-(--radius-panel) border border-dashed border-border bg-card px-5 py-16 text-center">
          <h2 className="text-lg font-bold">{filtered ? 'No encontramos títulos con esos filtros' : 'Tu colección está vacía'}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">{filtered ? 'Probá otra búsqueda o limpiá los filtros para ver tu colección.' : 'Usá Agregar título para empezar a organizar tu colección.'}</p>
        </section>}
    </div>
  );
}
