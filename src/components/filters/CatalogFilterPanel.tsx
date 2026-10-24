'use client';

import { useEffect, useOptimistic, useRef, useState, useTransition, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import YearRangeFilter from '@/components/filters/YearRangeFilter';
import { useCatalogLoading } from '@/components/catalog/CatalogInteraction';
import { useDebouncedCallback } from 'use-debounce';

const GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 'Horror', 'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'];
const LABELS = ['Acción', 'Aventura', 'Comedia', 'Drama', 'Ecchi', 'Fantasía', 'Terror', 'Chicas mágicas', 'Mecha', 'Música', 'Misterio', 'Psicológico', 'Romance', 'Ciencia ficción', 'Recuentos de la vida', 'Deportes', 'Sobrenatural', 'Suspenso'];
const FORMAT_LABELS: Record<string, string> = { TV: 'Serie de TV', MOVIE: 'Película', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Especial', TV_SHORT: 'Serie corta', MUSIC: 'Video musical', MANGA: 'Manga', NOVEL: 'Novela', ONE_SHOT: 'One-shot', ONE_SHOT_MANGA: 'One-shot' };
const SECTIONS = ['name', 'genre', 'excludeGenre', 'status', 'year', 'season', 'format', 'scoreBands', 'sort'];


interface Props {
  mediaType?: 'anime' | 'manga';
  library?: { genres: string[]; formats: string[]; tags: string[]; showPersonalStatus: boolean };
}

export default function CatalogFilterPanel({ mediaType = 'anime', library }: Readonly<Props>) {
  const sections = library ? ['name', 'type', ...(library.showPersonalStatus ? ['status'] : []), 'genre', 'excludeGenre', 'tags', 'catalogStatus', 'year', 'season', 'format', 'scoreBands', 'sort', 'direction'] : SECTIONS;
  const genreOptions = library?.genres ?? GENRES;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const setLoading = useCatalogLoading()?.setLoading;
  const [open, setOpen] = useState<string[]>(['name', 'genre']);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [optimisticQuery, setOptimisticQuery] = useOptimistic(searchParams.toString());
  const activeParams = new URLSearchParams(optimisticQuery);
  const draft = useRef(new URLSearchParams(searchParams.toString()));
  useEffect(() => { if (!isPending) draft.current = new URLSearchParams(searchParams.toString()); }, [searchParams, isPending]);
  const urlQuery = searchParams.get('q') ?? '';
  const [searchDraft, setSearchDraft] = useState({ source: urlQuery, value: urlQuery });
  const query = searchDraft.source === urlQuery ? searchDraft.value : urlQuery;
  const setQuery = (value: string) => setSearchDraft({ source: urlQuery, value });

  useEffect(() => {
    setLoading?.(isPending);
    return () => setLoading?.(false);
  }, [isPending, setLoading]);

  const navigate = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(draft.current.toString());
    Object.entries(changes).forEach(([key, value]) => value && value !== 'all' ? params.set(key, value) : params.delete(key));
    params.set('page', '1');
    draft.current = params;
    startTransition(() => {
      setOptimisticQuery(params.toString());
      router.push(`${pathname}?${params}`, { scroll: false });
    });
  };
  const search = useDebouncedCallback((value: string) => navigate({ q: value.trim() || null }), 450);
  const option = (key: string, fallback = 'all') => activeParams.get(key) ?? fallback;
  const formats = library ? library.formats.map((format) => ({label: FORMAT_LABELS[format.toUpperCase()] ?? format, value: format})) : [{ label: 'Todos', value: 'all' }, ...(mediaType === 'anime'
    ? [{ label: 'Serie de TV', value: 'TV' }, { label: 'Película', value: 'MOVIE' }, { label: 'OVA', value: 'OVA' }, { label: 'ONA', value: 'ONA' }, { label: 'Especial', value: 'SPECIAL' }, { label: 'Corto', value: 'TV_SHORT' }, { label: 'Video musical', value: 'MUSIC' }]
    : [{ label: 'Manga', value: 'MANGA' }, { label: 'Novela', value: 'NOVEL' }, { label: 'One-shot', value: 'ONE_SHOT' }])];
  const values = (key: string) => (activeParams.get(key) ?? '').split(',').filter(Boolean);
  const count = (key: string) => key === 'year' ? Number(['year', 'yearFrom', 'yearTo'].some((key) => activeParams.has(key))) : key === 'sort' || key === 'direction' ? 0 : key === 'name' ? Number(Boolean(activeParams.get('q'))) : values(key).length;
  const total = sections.reduce((sum, key) => sum + count(key), 0);
  const clear = () => {
    search.cancel();
    setQuery('');
    navigate(Object.fromEntries(sections.filter((key) => key !== 'name').map((key) => [key, null]).concat([['q', null], ['minScore', null], ['yearFrom', null], ['yearTo', null]])));
  };
  const section = (key: string, label: string, content: ReactNode) => {
    const active = key === 'name' ? Number(Boolean(activeParams.get('q'))) : count(key);
    const expanded = open.includes(key);
    return <section key={key} className='border-t border-primary/10 py-3'>
      <div className='flex items-center gap-2'>
        <button type='button' aria-expanded={expanded} aria-controls={`filter-${key}`} onClick={() => setOpen((current) => expanded ? current.filter((item) => item !== key) : [...current, key])} className='flex min-h-10 flex-1 items-center gap-2 text-left text-sm font-bold'>
          {label}{active > 0 && <span className='rounded-full bg-primary px-1.5 text-xs text-white'>{active}</span>}
          <span className='material-symbols-outlined ml-auto text-lg'>{expanded ? 'expand_less' : 'expand_more'}</span>
        </button>
        {active > 0 && <button type='button' aria-label={`Limpiar ${label.toLowerCase()}`} onClick={() => { if (key === 'name') { search.cancel(); setQuery(''); } navigate({ [key === 'name' ? 'q' : key]: null, ...(key === 'year' ? { yearFrom: null, yearTo: null } : {}) }); }} className='rounded p-1 text-text-muted hover:text-primary'><span className='material-symbols-outlined text-base'>close</span></button>}
      </div>
      <div id={`filter-${key}`} hidden={!expanded} className='pt-2'>{content}</div>
    </section>;
  };
  const select = (key: string, label: string, options: { label: string; value: string }[], multiple = false) => section(key, label,
    <div className={`grid grid-cols-2 gap-1.5 ${key === 'year' ? 'max-h-56 overflow-y-auto pr-1' : ''}`}>
      {options.filter((item) => item.value !== 'all').map((item) => {
        const selected = multiple ? values(key).includes(item.value) : option(key, key === 'sort' ? (library ? 'Date Added' : 'popularity') : key === 'direction' ? 'desc' : '') === item.value;
        return <button key={item.value} type='button' aria-pressed={selected} onClick={() => {
          const current = (draft.current.get(key) ?? '').split(',').filter(Boolean);
          const value = multiple ? (current.includes(item.value) ? current.filter((value) => value !== item.value) : [...current, item.value]).join(',') : selected && key !== 'sort' ? '' : item.value;
          navigate({ [key]: value || null, ...(key === 'scoreBands' ? { minScore: null } : {}) });
        }} className={`min-h-8 rounded-lg px-2 py-1.5 text-left text-xs ${selected ? 'bg-primary font-semibold text-white' : 'bg-primary/5 text-text-muted hover:bg-primary/15'}`}>{item.label}</button>;
      })}
    </div>);
  const genres = (key: 'genre' | 'excludeGenre', label: string) => section(key, label, <>
    {key === 'genre' && <p className='mb-3 text-xs text-text-muted'>Las obras deben incluir todos los géneros seleccionados.</p>}
    <div className='grid grid-cols-2 gap-1.5'>{genreOptions.map((genre) => {
      const selected = values(key).includes(genre);
      return <button key={genre} type='button' aria-pressed={selected} onClick={() => {
        const current = (draft.current.get(key) ?? '').split(',').filter(Boolean);
        const next = current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre];
        const opposite = key === 'genre' ? 'excludeGenre' : 'genre';
        navigate({ [key]: next.join(',') || null, [opposite]: (draft.current.get(opposite) ?? '').split(',').filter((item) => item && item !== genre).join(',') || null });
      }} className={`min-h-8 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${selected ? 'bg-primary font-semibold text-white' : 'bg-primary/5 text-text-muted hover:bg-primary/15'}`}>{LABELS[GENRES.indexOf(genre)] ?? genre}</button>;
    })}</div>
  </>);

  return <div className='w-full [&_button]:cursor-pointer [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_button]:focus-visible:outline-primary'>
    <button type='button' aria-expanded={mobileOpen} aria-controls='catalog-filter-panel' onClick={() => setMobileOpen((value) => !value)} className='flex w-full items-center gap-2 rounded-xl border border-primary/20 p-3 font-semibold lg:hidden'>
      <span className='material-symbols-outlined'>tune</span> Filtros {total > 0 && <span className='rounded-full bg-primary px-2 text-xs text-white'>{total}</span>}
      <span className='material-symbols-outlined ml-auto'>{mobileOpen ? 'expand_less' : 'expand_more'}</span>
    </button>
    <div id='catalog-filter-panel' className={`${mobileOpen ? 'block' : 'hidden'} mt-3 rounded-xl border border-primary/10 bg-background/80 p-4 lg:mt-0 lg:block`}>
      <div className='mb-3 flex items-center gap-2'>
        <h2 className='mr-auto font-bold'>Filtros {total > 0 && <span className='text-sm text-primary'>({total})</span>}</h2>
        <button type='button' aria-label='Cerrar todos los filtros' title='Cerrar todos' onClick={() => setOpen([])} className='rounded p-1 hover:bg-primary/10'><span className='material-symbols-outlined text-lg'>unfold_less</span></button>
        <button type='button' aria-label='Abrir todos los filtros' title='Abrir todos' onClick={() => setOpen(sections)} className='rounded p-1 hover:bg-primary/10'><span className='material-symbols-outlined text-lg'>unfold_more</span></button>
        <button type='button' onClick={clear} className='text-xs font-semibold text-primary'>Limpiar</button>
      </div>
      {section('name', 'Nombre', <input aria-label={library ? 'Buscar en mi colección' : `Buscar ${mediaType}`}  type='search' value={query} onChange={(event) => { setQuery(event.target.value); search(event.target.value); }} placeholder={library ? 'Título, descripción o etiquetas…' : 'Buscar por título…'} className='h-10 w-full rounded-lg border border-primary/15 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40' />)}
      {library && select('type', 'Tipo', [{label: 'Anime', value: 'anime'}, {label: 'Manga', value: 'manga'}], true)}
      {library?.showPersonalStatus && select('status', 'Mi estado', [{label: 'Viendo / Leyendo', value: 'watching'}, {label: 'Completado', value: 'completed'}, {label: 'Pendiente', value: 'plan_to_watch'}, {label: 'En pausa', value: 'on_hold'}, {label: 'Abandonado', value: 'dropped'}], true)}
      {genres('genre', 'Géneros')}
      {genres('excludeGenre', 'Excluir géneros')}
      {library && select('tags', 'Mis etiquetas', library.tags.map((tag) => ({label: tag, value: tag})), true)}
      {select(library ? 'catalogStatus' : 'status', 'Estado de la obra', [{ label: 'Todos', value: 'all' }, { label: library ? 'En emisión / publicación' : mediaType === 'manga' ? 'Publicándose' : 'En emisión', value: library ? 'RELEASING' : 'airing' }, { label: 'Finalizados', value: library ? 'FINISHED' : 'completed' }, { label: 'Próximamente', value: library ? 'NOT_YET_RELEASED' : 'upcoming' }, { label: 'En pausa', value: library ? 'HIATUS' : 'hiatus' }, { label: 'Cancelados', value: library ? 'CANCELLED' : 'cancelled' }], true)}
      {section('year', 'Año', <YearRangeFilter key={`${activeParams.get('yearFrom')}:${activeParams.get('yearTo')}:${activeParams.get('year')}`} from={activeParams.get('yearFrom') ?? activeParams.get('year')} to={activeParams.get('yearTo') ?? activeParams.get('year')} onApply={(from, to) => navigate({ year: null, yearFrom: from, yearTo: to })} />)}
      {(library || mediaType === 'anime') && select('season', 'Temporada', [{ label: 'Todas', value: 'all' }, { label: 'Invierno', value: 'winter' }, { label: 'Primavera', value: 'spring' }, { label: 'Verano', value: 'summer' }, { label: 'Otoño', value: 'fall' }], Boolean(library))}
      {select('format', 'Formato', formats, true)}
      {select('scoreBands', 'Puntuación', [{ label: '< 6', value: 'under6' }, { label: '6–7', value: '6to7' }, { label: '7–8', value: '7to8' }, { label: '8–9', value: '8to9' }, { label: '9+', value: '9plus' }], true)}
      {select('sort', 'Orden', library ? [{label: 'Fecha de agregado', value: 'Date Added'}, {label: 'Título', value: 'Title'}, {label: 'Puntuación', value: 'Score'}, {label: 'Año', value: 'Year'}] : [{ label: 'Popularidad', value: 'popularity' }, { label: 'Puntuación', value: 'score' }, { label: 'Tendencia', value: 'trending' }, { label: 'Más recientes', value: 'newest' }, { label: 'Título', value: 'title' }])}
      {library && select('direction', 'Dirección', [{label: 'Descendente', value: 'desc'}, {label: 'Ascendente', value: 'asc'}])}
      <div role='status' aria-live='polite' className='text-xs text-text-muted'>{isPending ? 'Actualizando resultados…' : total > 0 ? `${total} filtros activos` : 'Sin filtros activos'}</div>
      <button type='button' onClick={() => setMobileOpen(false)} className='mt-3 w-full rounded-lg bg-primary p-3 text-sm font-bold text-white lg:hidden'>Ver resultados</button>
    </div>
  </div>;
}
