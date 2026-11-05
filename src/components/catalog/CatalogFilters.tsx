'use client';

import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import YearRangeFilter from '@/components/filters/YearRangeFilter';
import Dropdown from '@/components/dropdown/dropdown';
import { CATALOG_GENRES, updateCatalogFilterParams } from '@/lib/catalog-filter-values';
import { useCatalogLoading } from '@/components/catalog/CatalogInteraction';

type Values = Record<string, string>;
type Option = { value: string; label: string };
const statuses: Option[] = [{ value: 'airing', label: 'En emisión' }, { value: 'completed', label: 'Finalizados' }, { value: 'upcoming', label: 'Próximamente' }, { value: 'hiatus', label: 'En pausa' }, { value: 'cancelled', label: 'Cancelados' }];
const seasons: Option[] = [{ value: 'winter', label: 'Invierno' }, { value: 'spring', label: 'Primavera' }, { value: 'summer', label: 'Verano' }, { value: 'fall', label: 'Otoño' }];
const scores: Option[] = [{ value: 'under6', label: 'Menos de 6' }, { value: '6to7', label: '6–7' }, { value: '7to8', label: '7–8' }, { value: '8to9', label: '8–9' }, { value: '9plus', label: '9 o más' }];
const animeFormats: Option[] = [{ value: 'TV', label: 'Serie de TV' }, { value: 'MOVIE', label: 'Película' }, { value: 'OVA', label: 'OVA' }, { value: 'ONA', label: 'ONA' }, { value: 'SPECIAL', label: 'Especial' }, { value: 'TV_SHORT', label: 'Serie corta' }, { value: 'MUSIC', label: 'Video musical' }];
const mangaFormats: Option[] = [{ value: 'MANGA', label: 'Manga' }, { value: 'NOVEL', label: 'Novela' }, { value: 'ONE_SHOT', label: 'One-shot' }];
const genres = CATALOG_GENRES.map(([value, label]) => ({ value, label }));
const editableKeys = ['q', 'genre', 'status', 'year', 'yearFrom', 'yearTo', 'season', 'format', 'scoreBands', 'minScore'];

function readValues(params: URLSearchParams): Values {
  return Object.fromEntries(editableKeys.flatMap((key) => params.get(key) ? [[key, params.get(key) ?? '']] : []));
}
function draftSource(source: string): string {
  const params = new URLSearchParams(source);
  params.delete('sort');
  params.delete('page');
  return params.toString();
}
function normalizedValues(values: Values): string {
  return JSON.stringify(Object.entries(values).filter(([, value]) => Boolean(value)).sort(([a], [b]) => a.localeCompare(b)));
}
function list(values: Values, key: string) { return (values[key] ?? '').split(',').filter(Boolean); }
function filterCount(values: Values) {
  return ['q', 'genre', 'status', 'year', 'yearFrom', 'yearTo', 'season', 'format', 'scoreBands', 'minScore'].reduce((sum, key) => sum + (values[key] ? 1 : 0), 0);
}

function Group({ label, children, compact, count = 0 }: Readonly<{ label: string; children: ReactNode; compact: boolean; count?: number }>) {
  const [expanded, setExpanded] = useState(false);
  if (!compact) return <section className="border-t border-border py-4"><h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</h3>{children}</section>;
  return <details name="catalog-quick-filters" className="group relative" onToggle={(event) => {
    setExpanded(event.currentTarget.open);
    if (!event.currentTarget.open) return;
    const current = event.currentTarget;
    current.parentElement?.querySelectorAll<HTMLDetailsElement>(':scope > details[open]').forEach((item) => {
      if (item !== current) item.open = false;
    });
    const panel = event.currentTarget.querySelector<HTMLElement>('[data-filter-popup]');
    if (!panel) return;
    panel.style.left = '0';
    panel.style.right = 'auto';
    if (panel.getBoundingClientRect().right > window.innerWidth - 16) { panel.style.left = 'auto'; panel.style.right = '0'; }
  }} onKeyDown={(event) => {
    if (event.key !== 'Escape') return;
    const details = event.currentTarget;
    if (details.querySelector('[data-season-dropdown] button[aria-expanded="true"]')) return;
    if (details.open) { event.stopPropagation(); details.open = false; details.querySelector('summary')?.focus(); }
  }}>
    <summary className={`flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${compact ? 'border border-border bg-card px-3 hover:bg-muted' : 'px-1'}`}>
      {label}{count > 0 && <span className="text-primary">· {count}</span>}<span className="material-symbols-outlined ml-auto text-base" aria-hidden="true">expand_more</span>
    </summary>
    <div data-filter-popup={compact || undefined} className={compact ? 'absolute left-0 top-full z-40 mt-2 max-h-[min(60vh,30rem)] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-border bg-popover p-4 text-foreground shadow-xl' : 'pb-2 pt-1'}>{expanded && children}</div>
  </details>;
}

function Choices({ label, options, values, onToggle, compact }: Readonly<{ label: string; options: Option[]; values: string[]; onToggle: (value: string) => void; compact: boolean }>) {
  return <fieldset><legend className="sr-only">{label}</legend>{compact ? <div className="grid grid-cols-2 gap-1">{options.map((option) => <label key={option.value} className="flex min-h-10 min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm hover:bg-muted"><input type="checkbox" checked={values.includes(option.value)} onChange={() => onToggle(option.value)} className="size-4 shrink-0 accent-primary" /><span className="min-w-0 break-words">{option.label}</span></label>)}</div> : <div className="flex flex-wrap gap-2">{options.map((option) => {
    const selected = values.includes(option.value);
    return <button type="button" key={option.value} aria-pressed={selected} onClick={() => onToggle(option.value)} className={`min-h-10 cursor-pointer rounded-full border bg-transparent px-3 py-1.5 text-xs font-semibold transition-colors ${selected ? 'border-primary! text-primary' : 'border-border text-muted-foreground hover:border-primary! hover:text-primary'}`}>
      {selected && <span aria-hidden="true" className="mr-1">✓</span>}{option.label}
    </button>;
  })}</div>}</fieldset>;
}

function Fields({ values, setValue, mediaType, compact }: Readonly<{ values: Values; setValue: (key: string, value: string) => void; mediaType: 'anime' | 'manga'; compact: boolean }>) {
  const toggle = (key: string, value: string) => { const selected = list(values, key); setValue(key, (selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]).join(',')); };
  return <>
    <Group label="Géneros" compact={compact} count={list(values, 'genre').length}>
      <p className="mb-2 text-xs leading-relaxed text-muted-foreground">Seleccioná uno o más géneros.</p>
      <Choices compact={compact} label="Géneros" options={genres} values={list(values, 'genre')} onToggle={(value) => toggle('genre', value)} />
    </Group>
    <Group label="Estado" compact={compact} count={list(values, 'status').length}>
      <Choices compact={compact} label="Estado de la obra" options={statuses.map((status) => status.value === 'airing' && mediaType === 'manga' ? { ...status, label: 'Publicándose' } : status)} values={list(values, 'status')} onToggle={(value) => toggle('status', value)} />
    </Group>
    <Group label="Año" compact={compact} count={Number(Boolean(values.year || values.yearFrom || values.yearTo))}>
      <YearRangeFilter key={`${values.year ?? ''}:${values.yearFrom ?? ''}:${values.yearTo ?? ''}`} from={values.yearFrom ?? values.year} to={values.yearTo ?? values.year} transparentInputs onApply={(from, to) => { setValue('yearFrom', from ?? ''); setValue('yearTo', to ?? ''); setValue('year', ''); }} />
    </Group>
    {mediaType === 'anime' && <Group label="Temporada" compact={compact} count={Number(Boolean(values.season))}>
      <div data-season-dropdown>
        <p className="mb-2 text-sm">Temporada</p>
        <Dropdown value={values.season ?? ''} onChange={(value) => setValue('season', value)} options={[{ value: '', label: 'Todas' }, ...seasons]} ariaLabel="Temporada" className="w-full!" buttonClassName="min-h-11 w-full! bg-transparent! px-3!" menuClassName="relative! left-auto! top-auto! mt-1! w-full! min-w-0!" />
      </div>
    </Group>}
    <Group label="Formato" compact={compact} count={list(values, 'format').length}>
      <Choices compact={compact} label="Formato" options={mediaType === 'anime' ? animeFormats : mangaFormats} values={list(values, 'format')} onToggle={(value) => toggle('format', value)} />
    </Group>
    <Group label="Puntuación" compact={compact} count={list(values, 'scoreBands').length}>
      <Choices compact={compact} label="Puntuación" options={scores} values={list(values, 'scoreBands')} onToggle={(value) => { toggle('scoreBands', value); setValue('minScore', ''); }} />
    </Group>
  </>;
}

export default function CatalogFilters({ mediaType }: Readonly<{ mediaType: 'anime' | 'manga' }>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const source = searchParams.toString();
  const sourceKey = draftSource(source);
  const [draft, setDraft] = useState<{ source: string; values: Values }>(() => ({ source: sourceKey, values: readValues(new URLSearchParams(source)) }));
  const values = draft.source === sourceKey ? draft.values : readValues(new URLSearchParams(source));
  const setValue = (key: string, value: string) => setDraft((current) => ({ source: sourceKey, values: { ...(current.source === sourceKey ? current.values : readValues(new URLSearchParams(source))), [key]: value } }));
  const [pending, startTransition] = useTransition();
  const setLoading = useCatalogLoading()?.setLoading;
  const toolbar = useRef<HTMLDivElement>(null);
  const mobile = useRef<HTMLDetailsElement>(null);
  const activeCount = filterCount(readValues(new URLSearchParams(source))) + Number(searchParams.has('excludeGenre'));
  useEffect(() => { setLoading?.(pending); return () => setLoading?.(false); }, [pending, setLoading]);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (toolbar.current && !toolbar.current.contains(event.target as Node)) toolbar.current.querySelectorAll('details[open]').forEach((item) => item.removeAttribute('open')); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  const commit = (nextValues: Values, clear = false) => {
    const changes: Record<string, string | null> = {};
    for (const key of editableKeys) changes[key] = nextValues[key] || null;
    if (clear) changes.excludeGenre = null;
    else if (searchParams.has('excludeGenre')) {
      const included = list(nextValues, 'genre');
      changes.excludeGenre = (searchParams.get('excludeGenre') ?? '').split(',').filter((genre) => genre && !included.includes(genre)).join(',') || null;
    }
    const next = updateCatalogFilterParams(new URLSearchParams(source), changes);
    toolbar.current?.querySelectorAll('details[open]').forEach((item) => item.removeAttribute('open'));
    if (mobile.current?.open) {
      mobile.current.open = false;
      mobile.current.querySelector('summary')?.focus();
    }
    startTransition(() => router.push(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false }));
  };
  const apply = (event: FormEvent) => { event.preventDefault(); commit(values); };
  const search = <label className="relative block min-w-0 text-sm"><span className="sr-only">Buscar por título</span><span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground" aria-hidden="true">search</span><input type="search" value={values.q ?? ''} onChange={(event) => setValue('q', event.target.value)} placeholder="Filtrar por título…" className="min-h-11 w-full rounded-lg border border-border bg-transparent py-2 pl-10 pr-3 text-sm" /></label>;
  const actions = <div className="flex flex-wrap items-center gap-2"><button type="submit" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground">Aplicar filtros</button><button type="button" onClick={() => { setDraft({ source: sourceKey, values: {} }); commit({}, true); }} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:text-primary">Limpiar</button></div>;
  const draftChanged = normalizedValues(values) !== normalizedValues(readValues(new URLSearchParams(source)));
  const draftLabels: Record<string, string> = { q: 'Búsqueda', genre: 'Género', status: 'Estado', year: 'Año', yearFrom: 'Desde', yearTo: 'Hasta', season: 'Temporada', format: 'Formato', scoreBands: 'Puntuación', minScore: 'Puntuación mínima' };
  const optionLabels = Object.fromEntries([...genres, ...statuses, ...seasons, ...animeFormats, ...mangaFormats, ...scores].map((option) => [option.value, option.label]));
  const draftItems = editableKeys.flatMap((key) => (key === 'q' ? [values.q].filter(Boolean) : list(values, key)).map((value) => ({ key, value, label: `${draftLabels[key]}: ${optionLabels[value] ?? value}` })));
  return <>
    <form onSubmit={apply} className="hidden min-[1400px]:block min-w-0 rounded-2xl border border-border bg-card p-4 min-[1400px]:rounded-none min-[1400px]:border-0">
      <h2 className="mb-3 text-base font-bold">Filtros {activeCount > 0 && <span className="text-primary">({activeCount})</span>}</h2>
      {search}<div className="mt-3"><Fields values={values} setValue={setValue} mediaType={mediaType} compact={false} /></div><div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-4 border-t border-border bg-card p-4">{actions}</div>
    </form>
    <form onSubmit={apply} className="hidden rounded-2xl border border-border bg-card p-4 md:block min-[1400px]:hidden!">
      <div ref={toolbar} className="flex flex-wrap items-center gap-2"><div className="min-w-48 flex-1">{search}</div><Fields values={values} setValue={setValue} mediaType={mediaType} compact />{actions}</div>
      {draftChanged && <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Selección pendiente">
        <span className="text-xs text-muted-foreground">Por aplicar:</span>
        {draftItems.length ? draftItems.map(({ key, value, label }) => <button type="button" key={`${key}:${value}`} aria-label={`Quitar ${label} de la selección`} onClick={() => setValue(key, key === 'q' ? '' : list(values, key).filter((item) => item !== value).join(','))} className="min-h-9 cursor-pointer rounded-full border border-primary/40 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/20">{label} <span aria-hidden="true">×</span></button>) : <span className="text-xs text-muted-foreground">Sin filtros seleccionados</span>}
      </div>}
    </form>
    <form onSubmit={apply} className="rounded-2xl border border-border bg-card p-4 md:hidden">
      <div className="flex items-center gap-2"><div className="min-w-0 flex-1">{search}</div><button type="submit" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground">Buscar</button></div><details ref={mobile} className="mt-3" onKeyDown={(event) => { if (event.key === 'Escape' && event.currentTarget.open && !event.currentTarget.querySelector('[data-season-dropdown] button[aria-expanded="true"]')) { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); } }}><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg border border-border px-3 text-sm font-bold">Filtros {activeCount > 0 && <span className="text-primary">({activeCount})</span>}<span className="material-symbols-outlined ml-auto" aria-hidden="true">expand_more</span></summary><div className="mt-3"><Fields values={values} setValue={setValue} mediaType={mediaType} compact={false} /><div className="mt-4">{actions}</div></div></details>
    </form>
  </>;
}
