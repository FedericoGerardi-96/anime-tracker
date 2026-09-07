'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import Dropdown from '@/components/dropdown/dropdown';

const GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 'Horror', 'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'];
const YEARS = Array.from({ length: new Date().getFullYear() - 1969 }, (_, index) => String(new Date().getFullYear() - index));

interface Props { mediaType: 'anime' | 'manga' }

export default function AniListFilters({ mediaType }: Readonly<Props>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [advanced, setAdvanced] = useState(['genre', 'excludeGenre', 'format', 'minScore'].some((key) => searchParams.has(key)));
  const [query, setQuery] = useState(searchParams.get('q') ?? '');

  useEffect(() => {
    if (isPending) document.documentElement.dataset.catalogLoading = 'true';
    else delete document.documentElement.dataset.catalogLoading;
    return () => { delete document.documentElement.dataset.catalogLoading; };
  }, [isPending]);

  const navigate = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) => value && value !== 'all' ? params.set(key, value) : params.delete(key));
    params.set('page', '1');
    startTransition(() => router.push(`${pathname}?${params}`, { scroll: false }));
  };

  const search = useDebouncedCallback((value: string) => navigate({ q: value.trim() || null }), 450);
  const option = (key: string, fallback = 'all') => searchParams.get(key) ?? fallback;
  const genreOptions = [{ label: 'Todos', value: 'all' }, ...GENRES.map((genre) => ({ label: genre, value: genre }))];
  const formats = mediaType === 'anime'
    ? [{ label: 'Todos', value: 'all' }, { label: 'Serie de TV', value: 'TV' }, { label: 'Película', value: 'MOVIE' }, { label: 'OVA', value: 'OVA' }, { label: 'ONA', value: 'ONA' }, { label: 'Especial', value: 'SPECIAL' }, { label: 'Corto', value: 'TV_SHORT' }, { label: 'Video musical', value: 'MUSIC' }]
    : [{ label: 'Todos', value: 'all' }, { label: 'Manga', value: 'MANGA' }, { label: 'Novela', value: 'NOVEL' }, { label: 'One-shot', value: 'ONE_SHOT' }];

  return (
    <div className='w-full space-y-3'>
      <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap'>
        <div className='group relative min-w-[240px] flex-1 sm:max-w-sm'>
          <span className='material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-500'>search</span>
          <input type='search' value={query} onChange={(event) => { setQuery(event.target.value); search(event.target.value); }} placeholder={`Buscar ${mediaType} en AniList…`} className='h-11 w-full rounded-lg border border-primary/10 bg-background/50 py-2 pl-10 pr-4 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15' />
        </div>
        <Dropdown label='Estado' value={option('status')} onChange={(value) => navigate({ status: value })} options={[
          { label: 'Todos', value: 'all' }, { label: mediaType === 'manga' ? 'Publicándose' : 'En emisión', value: 'airing' },
          { label: 'Finalizados', value: 'completed' }, { label: 'Próximamente', value: 'upcoming' },
          { label: 'En pausa', value: 'hiatus' }, { label: 'Cancelados', value: 'cancelled' },
        ]} />
        <Dropdown label='Año' value={option('year')} onChange={(value) => navigate({ year: value })} options={[{ label: 'Todos', value: 'all' }, ...YEARS.map((year) => ({ label: year, value: year }))]} />
        {mediaType === 'anime' && <Dropdown label='Temporada' value={option('season')} onChange={(value) => navigate({ season: value })} options={[
          { label: 'Todas', value: 'all' }, { label: 'Invierno', value: 'winter' }, { label: 'Primavera', value: 'spring' }, { label: 'Verano', value: 'summer' }, { label: 'Otoño', value: 'fall' },
        ]} />}
        <Dropdown label='Orden' value={option('sort', 'popularity')} onChange={(value) => navigate({ sort: value })} options={[
          { label: 'Popularidad', value: 'popularity' }, { label: 'Puntuación', value: 'score' }, { label: 'Tendencia', value: 'trending' }, { label: 'Más recientes', value: 'newest' }, { label: 'Título', value: 'title' },
        ]} />
        <button type='button' onClick={() => setAdvanced((value) => !value)} className='flex h-11 items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-4 text-sm font-semibold hover:bg-primary/10'>
          <span className='material-symbols-outlined text-lg'>tune</span> Más filtros
          <span className='material-symbols-outlined text-sm'>{advanced ? 'expand_less' : 'expand_more'}</span>
        </button>
      </div>
      {advanced && <div className='flex flex-col gap-3 rounded-xl border border-primary/10 bg-background/35 p-3 sm:flex-row sm:flex-wrap'>
        <Dropdown label='Género' value={option('genre')} onChange={(value) => navigate({ genre: value })} options={genreOptions} />
        <Dropdown label='Excluir género' value={option('excludeGenre')} onChange={(value) => navigate({ excludeGenre: value })} options={genreOptions} />
        <Dropdown label='Formato' value={option('format')} onChange={(value) => navigate({ format: value })} options={formats} />
        <Dropdown label='Puntuación mínima' value={option('minScore')} onChange={(value) => navigate({ minScore: value })} options={[
          { label: 'Cualquiera', value: 'all' }, { label: '6 o más', value: '60' }, { label: '7 o más', value: '70' }, { label: '8 o más', value: '80' }, { label: '9 o más', value: '90' },
        ]} />
      </div>}
      {isPending && <div className='absolute left-0 right-0 top-[calc(100%+2rem)] z-40 flex min-h-[60vh] items-start justify-center rounded-2xl bg-background pt-24'>
        <div className='flex items-center gap-3 rounded-full border border-primary/20 bg-primary/5 px-5 py-3 text-sm font-semibold shadow-xl'><span className='size-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary' />Actualizando {mediaType === 'manga' ? 'mangas' : 'animes'}…</div>
      </div>}
    </div>
  );
}
